# Validation Report: "Nirnay Sahayak" for Sewa Setu (PS1, Chhattisgarh)
> **Note:** the final plan (v4, after the stakeholder critiques) is in `../SEWA_SETU_PLAN.md`. Where they differ, v4 wins. That includes the rename to "Praman Setu", three neutral lanes, the citizen layer, the learned matching model and the ask. It also corrects the SC/ST cut-off dates to SC 10-08-1950 and ST 06-09-1950.
Compiled 27-09-2026 from 5 independent research tracks, plus first-hand pulls of the Sewa Setu public MIS.
Detailed sourced files are in this folder (01–05). Every number below traces to them.
**[U]** = unverified. Keep these out of slides.

---

## 1. Verdict
**The approach is validated, but its focus changes.**

The officer-side copilot is supported on every dimension:
- **Problem:** the live MIS confirms it.
- **Data:** CHiPS owns the core source.
- **Law:** the CG Caste Rules 2013 and July 2026 High Court rulings support it.
- **Policy:** the ₹500 cr AI Mission includes an "AI-based decision support" action.
- **Precedent:** customs RMS, EPFO, Haryana PPP and AP use similar patterns.
- **Tech:** everything is buildable with open-source tools in 24h.

**What changed:**
1. **Target caste and domicile certificates, not income.** Caste (SC/ST + OBC) is 22% of volume but **60.7% of all rejections**. Domicile adds **21%**. Income is rejected only 1.4% of the time.
2. **The family-lineage check becomes the core feature.** The law (Caste Rules r.3(3)) and the CG High Court (22-07-2026) both say a relative's certificate is valid evidence. The Sewa Setu archive already holds those certificates.
3. **Add role-aware routing.** The CG High Court (Jul 2026) held that Tehsildars are not competent for caste certificates; the SDO (Revenue) is.
4. **Prefer "send back with specific deficiency" over reject.** Sewa Setu already has a Sendback action, and courts are demanding reasoned orders with a chance to cure defects.
5. **Soften the novelty claim.** Say: *"Brings proven Indian risk-lane and data-verified patterns to CG certificate officers as an assistive copilot. To our knowledge this is not yet deployed for certificate approval."*
6. **Drop:** the income-certificate "circular Patwari" line (inaccurate), delay/SLA framing (95.7% are already on time), voice bots, and automated pre-1950 record verification.

---

## 2. Problem: validated, and sharper (see 05_problem_validation.md)
Source: Sewa Setu public MIS (RankingOfServices, district-wise report), period 01-04-2025 to 26-09-2026. Files are in `data/`.

| Certificate | Applications | % of volume | Rejected | **% of all rejections** | Rejection rate (of decided) |
|---|---|---|---|---|---|
| SC/ST caste | 6,50,302 | 12.1% | 1,16,288 | **31.9%** | **19.0%** |
| OBC caste | 5,36,515 | 10.0% | 1,04,674 | **28.7%** | **21.2%** |
| Domicile (Mool Niwasi) | 10,52,396 | 19.5% | 76,592 | 21.0% | 7.4% |
| Income | 26,37,878 | 49.0% | 35,633 | 9.8% | 1.4% |
| Camp: SC/ST / OBC | 3,296 / 7,681 | — | 1,256 / 3,274 | — | **38% / 43%** |
| **All services** | **53,85,535** | | **3,64,124** | | **6.97%** |

**Key facts:**
- **About 1 in 5 caste applicants is rejected.** That is 2.2 lakh in 18 months, roughly 1.47 lakh a year.
- **Delay is solved:** 95.7% of applications are resolved within the due date, and only 4,264 are pending beyond the SLA. The pitch is therefore about *wrong or avoidable rejections, not slow ones*.
- **District rejection rates range from 2.3% to 13.2% (5.7×) under the same rules.**
  - Not explained by ST share (ρ = +0.13, p = 0.48), urban share, literacy, or load per official. Adjusted R² is 0.05.
  - Stable over time: rank correlation between the two windows is ρ = 0.77.
  - Within Bastar division, similar tribal districts range from 2.3% (Bijapur) to 11.6% (Kondagaon).
  - This points toward **local practice**, but public data has no district × service breakdown to prove it. Present it as a hypothesis the pilot will test.
- **The pending gap is a status bucket, not a data bug.** The 21,988 difference between the header and the table is a fourth status, most likely "Sendback" [U].
- **Officers are ranked on speed only.** A rejection counts the same as an approval, so the incentive favours quick rejection [U inference].
- **Fraud is real, and conflicts are visible in existing records:**
  - GAD (Aug 2026): 267 of 659 investigated caste certificates were fake.
  - Fake Baiga (PVTG) certificates in Bilaspur and GPM (2026): revenue and school records already showed a different caste.
- **Officer capacity is strained:**
  - Tehsildar strikes (Jul–Aug 2025; Jun 2026) left 20,000+ files stuck.
  - Dhamtari tehsil receives 400+ applications a day but disposes of about 200.
  - 911 Patwari and 393 RI posts are being filled.

**Pitch hook (validated):**
> "Chhattisgarh fixed delay: 95.7% of applications are decided on time. Now fix wrong decisions. One in five caste applicants is rejected: 2.2 lakh people in 18 months, often for 1950-era papers when the state already holds a certificate for their father. Same rules, yet Bijapur rejects 2.3% and Gaurela-Pendra-Marwahi 13.2%."

## 3. Data sources: feasible via CHiPS' own archive (see 01_cg_data_sources.md)
| Source | Exists and digitised | Integration reality | Use in pilot | Rating |
|---|---|---|---|---|
| **Sewa Setu / e-District certificate archive** (since 2018) | ✅ | **On DigiLocker and API Setu** (`edistrictcg`, 29–32 doc types, pull by application number + mobile). Owned by CHiPS, so no other department's agreement is needed. | **Core: family-lineage evidence** | 5 |
| Bhuiyan land records | ✅ | API Setu `cgrevenue` returns a property-certificate PDF by khasra number. Name lookup exists only government-to-government (NIC). | Land/residence evidence, via an NIC service | 3 |
| Khadya ration card (SMART-PDS, 2.32 cr e-KYC'd beneficiaries) | ✅ | API Setu `khadya`, by card number + name (PDF). Structured roster needs the Food Department. | Family roster / residence | 3 |
| AgriStack (32.86 L Farmer IDs) + Markfed paddy procurement | ✅ | Public paddy lookup by farmer ID (kharif 2022-27). No API. | Farm-income floor, for domicile/income | 2–3 |
| Missal / Chakbandi (1950s settlement records) | ✅ name-searchable, 21 legacy districts | CAPTCHA, no API | Manual link for the officer only. **Not automated.** | 1 |
| Family registry (Samagra/PPP-style) | ❌ none in CG | — | Drop | — |

**The Patwari report form asks for** caste, land held, land income, other income, total income, and "son/brother/nephew/daughter of…". **Every field maps to Bhuiyan, Khadya and prior certificates.** The copilot automates checks officers already do.

**Demo:** mock Bhuiyan, ration roster, paddy ledger and prior certificates using the real API Setu request/response shapes. This shows a credible production path.

## 4. Law and policy: supportive, with firm guardrails (see 03_cg_policy_legal_admin.md)
**What supports the idea:**
- **CG AI Mission.** Announced 1–3 Jul 2026, with the Cabinet approving ₹500 cr over 5 years on 5 Aug 2026.
  - "AI in governance" pillar, with the action "AI-based decision support systems".
  - AI nodal officers in every department.
  - 50+ AI-based services.
  - AI training for 1.5 lakh employees.
  - Led by Electronics & IT and CHiPS.
- **CG Social Status Certificate Act & Rules 2013:**
  - **r.3(3)** accepts a caste certificate issued earlier to a father or relative, plus revenue records and jamabandi.
  - **r.8** requires the officer to check revenue records and property.
  - **r.15(2)** has district committees verify about 10% of certificates at random, which we propose to make **risk-based**.
  - Cut-off dates: 10-08-1950 for SC/ST, 26-12-1984 for OBC.
- **CG High Court, Jul 2026:**
  - **22-07-2026 (Nishtha & Ajay Bagel):** refusal for missing pre-1950 papers is wrong when the father or sister already holds a permanent caste certificate. The court ordered reconsideration.
  - **~21/22-07-2026 (Shailey Sonkar):** the Tehsildar is not competent for SC/ST/OBC certificates. The SDO (Revenue), Collector or Additional Collector is.
  - (Exact dates and case names should be cross-checked on the HC site before quoting.)
- **Allahabad HC (30-07-2026):** rejections must carry written, downloadable reasons and an opportunity to cure. This is persuasive, not binding in CG.
- **IIIT-NR and CHiPS already collaborate:** the CM IT Fellowship, a Process Mining specialisation (Oct 2025), and the Adi Vaani consortium.

**Hard guardrails (non-negotiable):**
- **The AI never decides.**
  - An order decided in substance by someone other than the competent authority is void (*Jadeja*, 1995).
  - Orders must be reasoned (*Kranti Associates*).
  - The Kerala HC AI policy (Jul 2025) bars AI from arriving at findings.
  - The Gujarat HC (Aug 2026) and Supreme Court (Sep 2026) struck down orders that relied on AI-hallucinated citations.
  - Therefore: **template-bound drafts that cite only records**, the officer acts on each flag, **no bulk approve**, and the officer's e-sign.
- **DPDP Act 2023 and Rules 2025.**
  - Rule 5 and the Second Schedule bind from **13-05-2027**.
  - Requirements: purpose limitation, data accuracy, telling the applicant which records were used, and access logs kept at least 1 year.
  - CERT-In additionally requires 180-day logs.
- **No CG data-sharing policy is published.**
  - The national framework (15-05-2026) expects a **State Data Governance Committee chaired by the Chief Secretary** to approve cross-department pulls.
  - The pilot therefore starts with CHiPS-owned archive data only.
- **No caste-based risk scoring.**
  - Only rule-based *inconsistency* flags, for example "father's certificate says X, application says Y".
  - Missing data never means ineligibility.

## 5. Precedents: novelty is real but narrower (see 02_existing_solutions.md)
**Already done in India (don't claim as new):**
- **Haryana:** over-the-counter income certificates from PPP-verified data since Sep 2022, and caste certificates where caste is PPP-verified.
- **Karnataka:** e-Kshana instant certificates, with Kutumba fetching caste, income and land data.
- **Andhra Pradesh:** since 2023, no department may demand a fresh caste certificate. In 2025 it reviewed data for 34.37 L families and certified 28.62 L.

**Strong lane-triage precedents:**
- **Customs RMS:** about 90% of consignments cleared without assessment or examination, with random checks on the green lane.
- **GST:** risk-based biometric and physical verification.
- **EPFO:** 71% of advance claims auto-settled (FY26).
- **Passport:** issued before police verification since 2016.

**Genuinely new (to our knowledge):**
- an **officer-side** copilot at the certificate approval stage
- **automated lineage lookup with conflict flags**
- a **multi-department evidence card** per application
- **reason-coded draft orders citing records only**
- **inter-district consistency analytics**
- **risk-based selection** for the r.15(2) post-issue audit

**Lessons from failures that shape the design:**
- Robodebt, MiDAS, SyRI, the Dutch childcare-benefits scandal, Telangana's Samagra Vedika (about 19 L ration cards wiped), UK DWP bias findings.
- What they teach:
  - no automated denial
  - missing data ≠ ineligible
  - no protected attributes as risk factors
  - random audits of the green lane
  - fairness monitoring and tracking officer override rates
  - a Government Order as the legal basis for data linkage
- **Brazil STJ (Sep 2026):** automated grants were allowed, but not automated denials.

## 6. Technology: buildable in 24h (see 04_technical_toolkit.md)
| Component | 24h pick | Production story |
|---|---|---|
| Runtime | Python 3.11 via `uv` (system Python is 3.9) + Node for the UI | — |
| OCR | tesseract.js 7, `['eng','hin']` (English first; Hindi-first garbles digits). Validate every number field. | Tesseract/Surya on SDC |
| Rules | GoRules `zen-engine` decision tables (tested) | Same, with versioned JSON rules and a department-admin editor |
| Name matching | RapidFuzz + Indic normaliser ("Shyamlal Dhruw" ↔ "श्यामलाल ध्रुव" = 100) | + IndicXlit, Splink |
| Lineage graph | Cytoscape.js | Graph DB optional |
| Anomalies | imagehash (pHash duplicates) + rule flags; IsolationForest optional | Same |
| Order drafting | **Jinja2 template first**; LLM only for a plain-language summary. Sarvam API; `gemma4:e4b` via Ollama as offline fallback. | Self-hosted Indic LLM on SDC GPU. Sarvam-30B needs about 20 GB. |
| UI | React + shadcn with **UX4G** (NeGD) colours, react-simple-maps. **Avoid react-leaflet** (Hippocratic licence). | UX4G / GIGW 3.0 |
| Aadhaar QR | About 40 lines of UIDAI signature verification. **Synthetic QR codes signed with our own key only.** | UIDAI public key |
| DigiLocker / MeriPehchaan | **Mock.** Onboarding takes weeks. | API Setu onboarding |

**Assets already saved:**
- `data/geo/`: all 33 districts GeoJSON with LGD codes and rejection rates; 234 tehsils; 145 blocks; 20,753 villages.
- `data/synthetic/cg_name_seeds.json`: curated CG names. Faker hi_IN is unusable.
- A sample affidavit (clean and noisy).
- A starter rule.

---

## 7. Revised solution (v3): "Nirnay Sahayak"
**Scope for the pilot:** SC/ST, OBC and domicile certificates, which account for **81.6% of all rejections**.

1. **Role-aware intake routing.** Permanent caste goes to the SDO (Revenue); domicile and temporary certificates go to the Tehsildar. This prevents the wrong-authority errors the HC flagged.
2. **Family-lineage evidence (core feature).**
   - Match the applicant to prior Sewa Setu certificates held by the father, siblings or other relatives. Match on name, father's name and village with RapidFuzz plus the normaliser.
   - Show the match with its certificate number and QR, citing r.3(3) and the HC 22-07-2026 ruling.
3. **Evidence card.** Maps the Patwari-report fields to Bhuiyan land, the ration roster and prior certificates. Each item is ✅ or ⚠️ and names its source.
4. **Conflict flags (rule-based only).**
   - A relative's certificate shows a different caste.
   - The same document or photo is reused across applications (pHash).
   - The applicant's own earlier application was rejected for a different caste.
   - Each flag carries an explanation. There is no caste risk score.
5. **Lane suggestion.**
   - **GREEN:** lineage and records corroborate.
   - **AMBER:** gaps or conflicts.
   - Suggested actions are "approve", "send back with specific deficiency (cure opportunity)", or "refer". **There is never an auto-reject and never bulk approval.**
6. **Draft reasoned order.** A Hindi/English template that cites records only. The officer edits and e-signs.
7. **Risk-based r.15(2) audit list.** Instead of a purely random 10%, a mix of random and flagged cases goes to the district scrutiny committee. This also audits the GREEN lane.
8. **Consistency dashboard** for the Collector and CHiPS, built on the **real MIS**:
   - district and service rejection variance
   - reason codes
   - lane mix
   - officer override rate
   - fairness checks

**Rollout:**
1. **Shadow mode, 90 days.** The copilot recommends while officers work as usual; we measure agreement.
2. **Assisted mode.**
3. **Pilot districts:** 2 high-rejection districts (Gaurela-Pendra-Marwahi, Kondagaon) against 2 control districts.

**Phase 2:** Bhuiyan/Khadya structured pulls under a State Data Governance Committee approval, followed by zero-touch income renewal.

**Impact model (assumptions labelled):**
- Caste rejections run at about 1.47 L a year.
- **Assumption A:** 30–50% of rejected applicants have a relative holding a prior Sewa Setu or e-District certificate. **The pilot will measure this.**
- **Assumption B:** 50–70% of those convert to approval or a cured send-back.
- Result: **about 22,000–51,000 fewer avoidable caste rejections a year**. At ₹261 in wages, plus travel and a re-application per case, that is about **₹1–2.5 cr a year** in citizen costs, before counting lost scholarships and jobs.
- Officer time: about 5.3 L caste applications a year. If 40–60% reach GREEN with scrutiny cut by about 5 minutes each, that saves **about 18,000–26,000 SDO/Tehsildar hours a year** [assumption].
- Fraud: count conflict flags per 1,000 applications and flag precision after review (target above 80%).
- **Never extrapolate 267/659.**

## 8. Claims to avoid or soften on stage
- ❌ "Nobody in India does this" → ✅ "Not yet deployed for certificate approval, to our knowledge."
- ❌ "3.2 crore certificates" → ✅ "3.2 crore transactions".
- ❌ "The income certificate is circular" → drop it.
- ❌ Any cause for the district variance → ✅ "The pilot will reveal whether it's practice or application quality."
- ❌ API availability for Bhuiyan/Khadya name lookup → ✅ "Via NIC/State Data Governance Committee approval. The demo uses mocks."
- ❌ Specific Lok Sewa Guarantee penalty amounts. These are unverified.
- ❌ NeSDA 2023/2025 rank for CG. None has been published.
- ⚠️ Verify HC case names and dates before quoting; our sources differ by a day on the Sonkar case.

## 9. Resource index
| File | Contents |
|---|---|
| `research/01_cg_data_sources.md` | Every CG data source, API Setu collections, Patwari report fields, feasibility ratings |
| `research/02_existing_solutions.md` | About 45 precedents (India and global), novelty assessment, 15 design lessons |
| `research/03_cg_policy_legal_admin.md` | AI Mission, CHiPS, Caste Rules 2013, HC rulings, DPDP/Aadhaar/CERT-In, officer workload, fraud cases |
| `research/04_technical_toolkit.md` | 24h stack, production stack, install commands, 17 pitfalls, links |
| `research/05_problem_validation.md` | MIS deep-dive, district-driver statistics, officer workflow, rejection reasons |
| `data/sewasetu_mis_service_2026-09-27.csv` | Service-wise received/approved/rejected/pending (112 services) |
| `data/sewasetu_mis_district_2026-09-27.csv` | District-wise, 33 districts |
| `data/district_joined_analysis_2026-09-27.csv` | District MIS joined with Census 2011 demographics |
| `data/rejection_by_service_and_district_2026-09-27.png` | **Slide-ready chart** |
| `data/sewasetu_api_*.json` | Raw dashboard API responses |
| `data/geo/*` | 33-district GeoJSON with LGD codes; tehsils, blocks, villages |
| `data/synthetic/*`, `data/rules/*` | Name seeds, sample affidavit, starter rule |
| `SEWA_SETU_PLAN.md` | v2 plan. **Superseded on focus by §7 here**; build and deck sections still apply with a caste/domicile focus. |
