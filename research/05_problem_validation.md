# 05: Problem validation (stress test of the PS1 framing)
Date: 27-09-2026. Sources are listed inline. **[U]** marks unverified or inferred items. Keep [U] items off the slides unless they are reworded as hypotheses.

---

## TL;DR
1. **The headline numbers hold.** 53,85,535 received, 3,64,124 rejected (6.76%), and district rates from 2.31% (Bijapur) to 13.24% (GPM).
2. **The "pending" mismatch is explained, not a bug.** Header pending (1,58,129) = district-table pending (1,36,141) + 21,988 applications that are in none of the approved, rejected or pending columns. That gap sits mostly in caste certificates. It is consistent with the **"Sendback"** action, which appears in the portal's own officer ranking report, though the exact status is [U].
3. **The biggest new finding is where rejection sits.** The portal has a hidden **service-wise report**. It shows rejection is concentrated in caste certificates, not income certificates:
   - SC/ST and OBC certificates are **22% of applications but 62% of all rejections**.
   - About **1 in 5 caste applications is rejected**: 19.1% of decided SC/ST, 21.5% of decided OBC.
   - **Income certificates are rejected only 1.35% of the time.**
   - The pitch must pivot from "income certificate" to "caste certificate" as the pain.
4. **No demographic driver explains district variance.** Tested drivers: ST share, SC share, urban share, literacy, applications per capita, officer load. All |rho| < 0.35 with no p < 0.05, and a 3-variable OLS gives R² = 0.15 (adjusted 0.05).
   - District rankings are stable across two time windows (rho = 0.77). That fits persistent local practice, though service mix is not ruled out.
5. **The officer-side reality supports the product.** Four things line up:
   - Rejections for a missing pre-1950 record, even when a family member already holds a certificate, were struck down by the CG High Court on 22-07-2026.
   - A second CG HC ruling on 21-07-2026 said Tehsildars are not competent to issue SC/ST/OBC certificates.
   - The Allahabad HC (30-07-2026) mandated **reasoned, downloadable rejection orders with an opportunity to cure defects**.
   - CG penalises *delay* (₹100 per late application), and the officer ranking counts a rejection as "processed" the same as an approval.

---

## 1. MIS re-check (task 1)

### 1.1 What the public MIS actually exposes
Page: https://sewasetu.cgstate.gov.in/MisDashboard.do?lang=en ("Statistics (Since 01-04-2025)", last updated 26-09-2026).

| Endpoint (all public GET/POST, no login) | What it gives | Saved as |
|---|---|---|
| `/RankingOfDistricts.html?lang=en` (the "District-Wise Report" button) | 33 districts × total / approved / rejected / pending / within / beyond SLA | `data/sewasetu_mis_district_2026-09-27.csv` (re-checked: **identical** to earlier fetch) |
| `/RankingOfServices.html?lang=en`: **"Service-Wise Report" modal. The JS and modal exist, but the link is not shown in the UI** | 112 services × same columns, with department | `data/sewasetu_mis_service_2026-09-27.csv` (new) |
| `https://api-ed.cgstate.gov.in/api/application-management/edistrict2/getServiceWiseApplStatus` | Top-10 services approved / rejected / pending (cumulative) | `data/sewasetu_api_getServiceWiseApplStatus_2026-09-27.json` |
| `.../getDistrictWiseApplStatus` (drives the "Graph Statistics" district chart) | District approved / rejected / pending, apparently **last ~30 days** [U: label is `last30DaysOfSubmission`; sums of 4.01 lakh approved + 20,746 rejected fit a 30-day window of 3.78 lakh submissions] | `data/sewasetu_api_districtwise_status_2026-09-27.csv` + JSON |
| `.../getTop10MostAppliedServices` | Last-30-day service mix (from 28-08-2026): Income **61.4%**, Domicile 15.1%, SC/ST 8.4%, OBC 7.7% | JSON |
| `.../getSLACompilanceRateResolvedWithinDueDate` | **46,54,336 of 48,63,282 resolved within due date = 95.70% SLA compliance** | JSON |
| `.../getLast30DaysOfSubmission`, `.../getPrevmonthDeptWiseSumbmission` | Daily submissions and department-wise last month (Revenue = 4.31 lakh of ~4.51 lakh) | JSON |
| Tile `certificateTypeDistribution` on the dashboard | *Approved* by type: Income 25,60,227; Domicile 9,58,211; Caste 8,85,503; Birth/Death 59,961; Other 3,99,380 (sum = 48,63,282) | noted here |
| `https://admin-ed.cgstate.gov.in/RankingOfGovtUser.html` ("Official User Ranking Report", linked from the dashboard) | 2,241 official logins with total handled, "Processed Within Due date **(Approved/Rejected/Sendback)**", pending beyond due, approved beyond due, a score and a rank | District aggregate only (no names): `data/sewasetu_official_ranking_district_agg_2026-09-27.csv` |

No date filter and no district × service drill-down exist. Passing `districtId` and similar parameters to the API is ignored. **District-level service mix is therefore not observable publicly.**

### 1.2 Service-wise rejection (the key new table)
Cumulative since 01-04-2025. Rejection % is of decided cases (approved + rejected). Camp variants are merged into their parent rows.

| Certificate | Received | Share of all apps | Rejected | Rejection % of decided | Share of all rejections |
|---|---|---|---|---|---|
| Income | 26,51,087 | 49.2% | 35,704 | **1.4%** | 9.8% |
| Domicile (Mool Niwasi) | 10,52,396 | 19.5% | 76,592 | 7.4% | 21.0% |
| **SC/ST caste** | 6,53,598 | 12.1% | **1,17,544** | **19.1%** | **32.3%** |
| **OBC caste** | 5,44,196 | 10.1% | **1,07,948** | **21.5%** | **29.6%** |
| All other ~100 services | 4,84,258 | 9.0% | 26,336 | 5.7% | 7.2% |
| **Total** | 53,85,535 | 100% | 3,64,124 | 6.97% | 100% |

Other notable rows:
- **Camp-mode caste applications are rejected even more often**: SC/ST camp 38.1% and OBC camp 42.6% of decided, against 0.5% for camp income certificates.
- **Gazette name change**: 39.8% rejected and 2,544 pending beyond SLA. It is **60% of all 4,264 beyond-SLA pendencies**.
- **Ration-card services**: 25% to 54% rejected, but volumes are small.
- **Non-digitised land-record nakal**: 0.2% rejected.

### 1.3 Does "rejected" include duplicates, withdrawn or returned cases?
- The MIS defines no statuses. Received − approved − rejected − pending = **21,988**, and that is exactly the header-vs-table pending difference (1,58,129 − 1,36,141).
  - The header "pending" is simply received minus decided.
  - The table "pending" excludes some fourth status.
  - The gap is largest for OBC (7,022, 1.3%) and SC/ST (6,515, 1.0%), against income (2,009, 0.08%).
- The officer ranking report names three officer actions: **Approved / Rejected / Sendback**. A send-back (return to applicant or operator) therefore exists and is **most likely** the 21,988 bucket, not part of "rejected" [U: inferred from the arithmetic plus the column label].
- There is no evidence on whether duplicates or withdrawals are recorded as "rejected" [U]. No "withdraw" option is visible on public pages.
- **Correction to the plan:** do not call the pending mismatch an "MIS integrity bug". Call it an **unlabelled status bucket (≈22k, likely sent back)**.

### 1.4 Officer ranking report (workload proxy, [U] on definitions)
- 2,241 official logins, 2,115 of them active. Handled count **83,92,809**, which is 1.56× the 53.9 lakh applications. That suggests multi-stage touches (for example report and decision) or a different period [U].
- Load is highly concentrated:
  - The **top 10% of officials handle 57%** of the volume.
  - The median active official handled 480.
  - The busiest handled 71,366 (Durg), 63,710 (Raipur) and 60,688 (Durg).
  - If the period is since 01-04-2025 (about 370 working days), the busiest login processes about **190 applications per working day**, roughly 2 minutes each over a 6-hour day [U: period not stated; these may be bulk e-sign logins].
- **Ranking formula** (printed on the report): `H = 0.5·C − (0.3·E + 0.2·G)`. Here C is the % processed within due date, where *approved, rejected or sent back all count*. E is the % pending beyond due. G is the % approved beyond due.
  - **The score rewards speed and is indifferent to whether the outcome is approve or reject.**
  - Nothing measures rejection quality or reversal on appeal.
- The report's own numbers conflict with the dashboard: only 2.6% "processed within due date" statewide and 60.6 lakh "approved beyond due date". The dashboard SLA API says 95.7%. The per-role "due date" is probably a sub-stage deadline. **Do not quote these percentages** [U].

---

## 2. District driver analysis (task 2)
Files:
- `data/cg_district_demographics_census2011.csv`: Census 2011 figures re-cut to the current 33 districts, taken from each district's Wikipedia page, which cites the District Census Handbooks. Populations sum to 2,55,45,198, which matches CG's 2011 total exactly. Literacy is available for only 19 districts after the splits.
- `data/district_joined_analysis_2026-09-27.csv`: the joined table.
- Script logic: scipy `pearsonr` / `spearmanr` and a numpy OLS, n = 33.

Outcome is the district rejection % of received (mean 6.85, median 6.52, SD 2.41, CV 0.35).

| Candidate driver | n | Pearson r (p) | Spearman rho (p) | Reading |
|---|---|---|---|---|
| ST share of population | 33 | +0.14 (0.44) | +0.13 (0.48) | **Not tribal-driven** |
| SC share | 33 | −0.29 (0.10) | −0.25 (0.17) | weak, n.s. |
| SC+ST share | 33 | +0.06 (0.73) | +0.04 (0.85) | none |
| Urban share | 32 | +0.26 (0.15) | +0.31 (0.08) | weak, n.s. (Raipur and Durg high, but so are rural GPM and Kondagaon) |
| Literacy (post-split only) | 19 | +0.16 (0.51) | +0.14 (0.56) | none |
| Applications per 1,000 population | 33 | −0.31 (0.08) | −0.34 (0.053) | borderline: high-uptake districts reject slightly less |
| log population | 33 | −0.04 | +0.04 | none |
| Pending rate | 33 | +0.02 | +0.07 | no reject-to-clear-backlog trade-off |
| Applications per active official | 33 | −0.02 | −0.03 | **officer load does not explain it** |
| Officials per lakh applications | 33 | +0.08 | +0.03 | none |
| Top-3 officials' share of district volume | 33 | +0.11 | 0.00 | none |
| **Same district's rejection in the last ~30 days (API)** | 33 | **+0.74 (<0.001)** | **+0.77 (<0.001)** | **District effect is persistent** |

- **OLS** of rejection on ST% + urban% + applications per 1,000: R² = 0.145, adjusted R² = 0.053, n = 32. Demographics explain almost nothing.
- **Tribal grouping:**

  | ST share | n | Mean rejection |
  |---|---|---|
  | ≥ 50% | 13 | 7.43% |
  | 20–50% | 9 | 6.90% |
  | < 20% | 11 | 6.11% |

  Mann-Whitney, ≥ 50% vs < 20%: p = 0.25. Not significant.
- **Natural experiments inside the same region:**
  - **Bastar division:** Kondagaon 11.6%, Narayanpur 10.2%, Bastar 6.9%, Dantewada 6.3%, Sukma 5.3%, **Bijapur 2.3%**. These are all 60–83% ST districts under the same division, with a 5× spread.
  - **Parent/child districts:** Bilaspur 7.2% vs **GPM 13.2%** (carved from Bilaspur in 2020). Rajnandgaon 8.0% vs its 2022 children KCG 6.2% and MMAC 5.2%. Janjgir-Champa 3.9% vs Sakti 4.8%.
- **Recent vs cumulative:** the rejection share of decisions in the last ~30 days is 4.9%, against 7.0% cumulative. Applying cumulative service-level rates to the recent service mix (61% income) predicts about 5.4%. **Most of the apparent improvement is a mix shift toward income certificates**, not better scrutiny [U: the windows are not strictly comparable].

**Interpretation (honest):**
- Variance is **real and persistent**, and **not** explained by tribal share, urbanisation, literacy, uptake or officer load.
- Two explanations remain and cannot be separated with public data:
  - **(a) district service mix.** A district with more caste applications will mechanically show more rejection, because caste certificates are rejected at 20% and income at 1.4%.
  - **(b) local scrutiny practice.** For example, how strictly SDMs demand pre-1950 records, and camp-mode quality.
- The Bastar-division spread among demographically similar districts and the persistence across windows lean toward (b), but **this cannot be proven without district × service data** [U].

Chart: `data/rejection_by_service_and_district_2026-09-27.png`. The left panel shows rejections by certificate type. The right panel plots district rejection against ST share.

---

## 3. Why certificates get rejected, and the officer workflow (task 3)

### 3.1 What the portal documents say
- **User manuals** (`/resources/edistrict/user-manual/new/{4,5,6,7}.pdf`) are **citizen-side only**. They cover registration, Aadhaar e-KYC, form, upload, ₹30 fee, and acknowledgement. They contain no officer workflow.
- They state SLAs of **22 days** for SC/ST and OBC and **7 days** for income and domicile.
- The FAQ page has no mention of rejection, send-back or resubmission.
- **SC/ST certificate required documents** (https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=4&lang=en):
  - The only mandatory item is **"Caste proof"**, which can be any one of:
    - another state's certificate, or a Sarpanch/Parshad/MLA/MP certificate
    - a transfer certificate countersigned by the DEO, or the father's service ID
    - **a caste certificate issued earlier to the applicant or any family member**
    - **Misal / Adhikar Abhilekh / Jamabandi / 1931 Census register / 1949 citizen register / Dakhil-Kharij panji**
    - a disability/unavailability proof
  - Optional: affidavit, **Vanshavali (genealogy, up to 4 generations)**, **Gram Sabha proposal**, and MP Reorganisation Act cadre proof.
- **OBC** (serviceId=5) adds a mandatory **affidavit** and mandatory **income proof**, because of the creamy-layer test.
- **Income** (serviceId=6):
  - Mandatory **affidavit** plus mandatory **income proof**. The proof can be *any one of* a Patwari/Sarpanch/Parshad certificate, a previous income certificate, employer Form 16, income from land or house, and others.
  - Valid **1 year**. SLA 7 days.
- **Domicile** (serviceId=7): mandatory affidavit, proof of **15 years' stay** (birth certificate, voter ID, land record, etc.) and an educational certificate.
- The "Service SLA Details" link opens `citizenCharter.pdf`. That is a **2013 Revenue Dept notification** under the CG Lok Sewa Guarantee Act 2011 (F-4-124/7-3/2011, 16-05-2013):

  | Certificate | Deciding officer | First appeal | Second appeal |
  |---|---|---|---|
  | Temporary caste | Tehsildar / Naib Tehsildar | SDM | Collector |
  | **Permanent caste** | **SDM (Revenue)** | Collector | Commissioner |
  | Domicile and income | Tehsildar / Naib Tehsildar | SDM | Collector |

  It lists 30 working days, which is out of date against the 22 and 7 days now shown. That is another portal content inconsistency.
- **Portal content bug:** the SC/ST and OBC pages link `/resources/instructionPage/201.pdf`. That file is the *Gazette name-change* instruction sheet (₹430 challan, ₹50 stamp paper), not a caste instruction.

### 3.2 Actual officer workflow (best reconstruction)
Status of each step:
- **[V]** verified from a portal artifact
- **[S]** secondary source
- **[U]** inferred

1. **Citizen or operator submits**, at a Sewa Setu Kendra, CHOiCE/CSC or online, with scanned documents and an e-KYC ARN. [V]
2. **Field report.** The Patwari (sometimes the RI) verifies caste, residence or income and reports. For income certificates the Patwari/Sarpanch certificate is usually obtained *offline by the citizen* and uploaded. [S: district pages and third-party guides; CG ST Commission page says "genealogy from village Patwari". Whether a Patwari or RI login exists inside Sewa Setu is **[U]**; the 1.56 touches per application in the officer report hint at multi-stage processing.]
3. **Decision.** The Tehsildar / Naib Tehsildar decides income and domicile certificates. The **SDM (Revenue)** decides permanent SC/ST/OBC certificates. Actions are **Approve / Reject / Sendback** [V: officer ranking column header]. The certificate is digitally signed and QR-coded. [V]
4. **Appeal** goes to the SDM or Collector under the Lok Sewa Guarantee Act. Penalties apply for **delay**: the CG Collector (Raipur) fined an Abhanpur steno ₹100 per late application, ₹1,700 for 17 late caste applications, on 17-09-2026. [Patrika](https://www.patrika.com/raipur-news/abhanpur-caste-certificate-delay-steno-fine-20914793)
5. **Post-issue:** random verification of about 10% by the High-Power Scrutiny Committee, and mandatory verification only on doubt or complaint. [cgstcommission.org](https://cgstcommission.org/cast_certi.html)

### 3.3 Documented rejection reasons (caste)
- **No pre-1950 (SC/ST) or pre-1984 (OBC) record naming the ancestors' caste.** This is the dominant reason in CG news.
  - The CG High Court (Justice A.K. Prasad, **22-07-2026**, Nishtha and Ajay Bagel) held that applications cannot be refused merely because pre-1950 documents are missing when **the father and sister already hold permanent caste certificates**. It ordered reconsideration within 60 days.
  - Reporting notes that "thousands" of landless families lack such records.
  - Sources: [NPG News](https://npg.news/chhattisgarh/bilaspur-high-court-ne-jati-praman-patra-par-diya-bada-faisla-1950-ke-dastavez-jaruri-nahi-latest-cg-news-hindi-npg-22-07-2026-1315928), [The Sootr](https://thesootr.com/state/chhattisgarh/chhattisgarh-hc-caste-certificate-order-12182534), [Mooknayak, Jul 2026](https://www.mooknayaknews.com/2026/07/%E0%A4%9B%E0%A4%A4%E0%A5%8D%E0%A4%A4%E0%A5%80%E0%A4%B8%E0%A4%97%E0%A4%A2%E0%A4%BC-%E0%A4%AE%E0%A5%87%E0%A4%82-%E0%A4%9C%E0%A4%BE%E0%A4%A4%E0%A4%BF-%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%AE%E0%A4%BE/) (qualitative, no figures).
- **Wrong authority.** The CG High Court (Justice P.P. Sahu, **21-07-2026**, Shaili Sonkar) held that **the Tehsildar is not the competent authority** for SC/ST/OBC certificates; the SDO (Revenue), Collector or Additional Collector are. Applications routed to or decided by the wrong authority are vulnerable. [palpalindia](https://www.palpalindia.com/2026/07/21/Chhattisgarh-High-Court-ruled-that-Tehsildar-no-authority-to-issue-caste-certificates.html)
- **Comparable state:** the Allahabad HC (**30-07-2026**) held that rejecting caste applications **without written reasons is unconstitutional**. It directed:
  - reasons to be given within 7 days
  - **reports and orders downloadable online**
  - **an opportunity to object and cure deficiencies**
  - completion within 2 months
  - statewide guidelines from the Chief Secretary

  [ETV Bharat](https://www.etvbharat.com/hi/state/allahabad-high-court-caste-certificate-rejection-without-reason-unconstitutional-ups26073008555)
- Fraud context: 267 fake caste certificates were found in 659 probes (plan §2). **Scrutiny is not optional, so a pure fast-track pitch will be rejected by officers.**
- **No public source found** gives CG rejection-reason codes, RTI replies with reason breakdowns, or official statements on rejection volumes [U]. The web-search budget was exhausted before exhaustive Hindi forum searches on "आय प्रमाण पत्र निरस्त" (income certificate rejected) and "निवास प्रमाण पत्र रिजेक्ट" (domicile certificate rejected); nothing citable was found on income or domicile rejections.

---

## 4. Scrutiny time, officer workload, official statements (task 4)
- **No published time-per-application study for CG** [U].
  - The only proxy is the officer ranking report: the median active official handled 480 cases, and the busiest login handled 71,366, about 190 per working day if the period is since 01-04-2025 [U].
- **Accountability runs one way, on delay.** Consider together:
  - Lok Sewa Guarantee penalties (₹100 per day or per application, as in the Abhanpur example)
  - automatic grievance on SLA breach (plan §2)
  - a ranking score that counts a rejection as "processed"

  Together they create **a structural incentive to decide fast, and rejection is a safe fast decision** when documents are ambiguous. This is an inference [U], but it is grounded in the printed formula and is a strong framing point.
- The dashboard itself says SLA compliance is 95.7% and only 4,264 applications are pending beyond SLA. **The delay problem is solved; the quality-of-decision problem is not measured anywhere.**
- No CG official statement specifically on rejection rates was found [U].

## 5. Hindi news on high-rejection districts (task 5)
- Searches on GPM, Kondagaon and Mahasamund with "जाति प्रमाण पत्र आवेदन निरस्त" (caste certificate application rejected) returned **no district-specific reporting**. Only generic district service pages turned up (e.g. https://kondagaon.gov.in/en/service/caste-certificate/, which states the **OBC residence cut-off is 1984**).
- Treat the district-level story as **data-only**. Do not claim local news corroboration [U].

---

## 6. Claim-by-claim verdict

| Claim | Verdict | Fix |
|---|---|---|
| (a) 53,85,535 / 48,63,282 / 3,64,124 (6.76%), 4,264 beyond SLA, 2.3%–13.2% range | **Confirmed**; re-fetched identical | Keep. Add "6.97% of decided". |
| (a) "Pending 1,36,141 vs 1,58,129: inconsistent / MIS bug" | **Refuted as a bug.** The difference is exactly the 21,988 cases in a fourth status, likely "Sendback" | Reframe: "≈22k in an unlabelled status (likely sent back); MIS does not show it" |
| (a) "0 Departments" and blank division labels | Transient render glitch (later showed 38 and 907) | Drop from slides |
| (b) Rejection is the main measurable pain | **Confirmed and sharpened**: 95.7% SLA compliance vs 3.64 lakh rejections; caste certificates carry 62% of rejections at about 20% rejection each | Lead with caste |
| (b) District inconsistency implies scrutiny and/or quality variance | **Partly supported.** Variance is persistent (rho 0.77) and not demographic (R² 0.05 adj.), but service mix per district is unobservable | Say "the same rules produce 2%–13% outcomes, not explained by tribal share, literacy, urbanisation or officer load". Do not say "scrutiny is inconsistent" as fact. |
| (c) Income certificate needs affidavit + Patwari/Sarpanch certificate | **Partly wrong.** The affidavit is mandatory. Income *proof* is mandatory, but the Patwari/Sarpanch/Parshad certificate is **one of several alternatives** (previous income certificate, Form 16, land/house income) | Drop the "circular" jibe |
| (c) Valid 1 year | **Confirmed** (serviceId=6 page) | Keep |
| (c) Income certificates are about 43% of volume | **Wrong base.** They are 49.2% of applications, 52.6% of approvals and 61.4% of the last 30 days | Use 49% |
| Hero idea: income-renewal as runner-up / green lane | The data says income has almost no rejection problem (1.4%) | Income auto-renewal is a *throughput* play, not a rejection play |

---

## 7. Verdict on problem framing

**Safe to say (with source on slide):**
- "Since April 2025, Sewa Setu has processed 53.9 lakh applications and resolved **95.7% within SLA**. But **3.64 lakh were rejected**." (MIS)
- "**Caste certificates are 22% of applications but 62% of rejections. One in five SC/ST/OBC applications is rejected**, against about 1 in 75 income certificates." (MIS service-wise report)
- "Under identical rules, district rejection ranges from **2.3% (Bijapur) to 13.2% (GPM)**. Neighbouring tribal districts in Bastar range from 2.3% to 11.6%. The spread is persistent over time and **not explained by tribal share, literacy, urbanisation or officer workload**." (own analysis, n = 33)
- "In July 2026 the CG High Court struck down caste rejections based on missing pre-1950 papers where family members already held certificates. The Allahabad HC required reasoned, downloadable rejection orders with a chance to cure defects."
- "Officers are ranked and penalised on **speed**. A rejection counts as 'processed'. Nothing measures whether a rejection was right." (ranking formula on the portal)

**Soften or drop:**
- "Scrutiny is inconsistent" → "outcomes vary 5.7× and demographics don't explain it".
- "MIS integrity bugs" → "the MIS hides a ~22k 'sent-back' bucket and has no reason codes".
- The "Income certificate is circular" claim.
- Any claim about time per file, officer load causing errors, or district news. None of these is evidenced.
- The officer-ranking percentages (definitions unclear).

**Pitch hook (recommended):**
> "Chhattisgarh fixed delay: 95.7% of services are delivered on time. The next frontier is **getting the decision right the first time**. Every fifth caste-certificate applicant, often an SC/ST youth needing it for a job or college seat, is turned away. That is 2.25 lakh rejections in 18 months, most for missing 1950-era papers the state often already holds for their family. Our copilot links the applicant to the family's existing certificates and land records. It flags what is actually missing, lets the officer send back for correction instead of rejecting, and drafts a reasoned, appeal-proof order. The officer still decides."

**Product implications from this validation:**
1. Target **SC/ST/OBC certificates at the SDM desk** first, not income certificates.
2. **Family-lineage match**, via previous certificates in the 3.2-crore archive, directly operationalises the 22-07-2026 HC ruling.
3. **Send back with specific deficiency** instead of reject. The portal already has a Sendback action, and the Allahabad-style "cure" opportunity supports it.
4. A **reasoned-order draft** with reason codes creates the rejection-reason data that the MIS currently lacks.
5. A **proposed KPI**: rejection rate and reversal-on-appeal alongside SLA. That fixes the speed-only ranking.
6. The demo metric should be "caste rejection rate 20% → X%" and "reason-coded orders 0% → 100%", not "time saved".

---

## Files produced
- `/Users/gaurav/HACKATHON/data/sewasetu_mis_service_2026-09-27.csv`: 112 services, with rejection %
- `/Users/gaurav/HACKATHON/data/sewasetu_api_districtwise_status_2026-09-27.csv` and 6 `sewasetu_api_*_2026-09-27.json`: dashboard API responses
- `/Users/gaurav/HACKATHON/data/sewasetu_official_ranking_district_agg_2026-09-27.csv`: officer load by district (no personal names)
- `/Users/gaurav/HACKATHON/data/cg_district_demographics_census2011.csv`: 33-district Census 2011 figures (population, urban, SC, ST, partial literacy)
- `/Users/gaurav/HACKATHON/data/district_joined_analysis_2026-09-27.csv`: the joined analysis table
- `/Users/gaurav/HACKATHON/data/rejection_by_service_and_district_2026-09-27.png`: chart
