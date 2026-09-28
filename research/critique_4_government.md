# Critique 4 · The Government's View: Would Chhattisgarh Fund a "Nirnay Sahayak" Pilot?
Role-play critique, 27-09-2026. Four decision-makers review the v3 proposal in `00_VALIDATION_REPORT.md` §7. The inputs are `00`, `01` and `03` only. No web search was done.

**Legend:**
- **[Est.]** is our own rough estimate, to be refined with CHiPS.
- **[U]** is unverified and needs checking before it goes in a submission.
- Legal citations with no tag are standard, well-known law. They still need a lawyer's check before they go into a formal submission.

---

## 0. The room in one paragraph
All four officials like the problem statement. The 60.7% share of rejections, the 5.7× district variance, the Baiga fraud and the r.3(3) hook are all strong. None of them would fund the proposal *as currently worded*.

The words that sink it are:
- **"Nirnay"** (decision)
- **"wrong decisions"**
- **officer "override rate"**
- **"AI" next to "caste"**

The proposal also skips three hard institutional facts:
- Revenue owns the certificate function, whatever CHiPS owns technically.
- The lineage feature can **inherit fake certificates**.
- The digital archive mostly holds **siblings'** certificates, not **fathers'**.

Fix the framing, shrink the first ask to a retrospective back-test plus a shadow pilot, and the room moves to "yes, with conditions".

---

## 1. The four voices

### 1.1 Secretary, Revenue & Disaster Management Department
**Initial stance:** Sceptical, but open. *"You are telling me my SDOs and Tehsildars wrongly reject 2.2 lakh people. Put that on a slide in front of the CM and I will have a strike on Monday."*

**Top concerns:**
1. **Blame framing.**
   - The pitch hook ("Now fix wrong decisions", "Bijapur 2.3% vs GPM 13.2%") reads as an indictment of Revenue officers.
   - The Tehsildar association struck in Jul–Aug 2025 and again in Jun 2026. Their stated grievance was a lack of staff and technical support, not a lack of oversight.
   - A dashboard that shows **officer override rates** will be read as a surveillance and ranking tool.
2. **Who owns this?** The certificate function, the competent authorities and the GO all belong to Revenue.
   - The proposal says CHiPS owns the archive, "so no other department's agreement is needed".
   - That is technically true for storage and false for governance. *"CHiPS keeps the register. The register is mine."*
3. **The HC competence ruling (Shailey Sonkar, Jul 2026)** is contested territory.
   - The department may appeal it [U].
   - Thousands of existing caste certificates were signed by Tehsildars. If the tool routes all permanent caste certificates to SDOs, or treats Tehsildar-issued relatives' certificates as suspect, it takes a legal position the department has not taken.
   - Routing must follow **the department's notification**, not the team's reading of a news report.
4. **Litigation exposure.**
   - Every draft order becomes an exhibit in an appeal (s.5) or a writ.
   - If the draft says "conflict flag" and the officer approves anyway, the officer is exposed under s.12.
   - If the officer rejects on the flag alone, the order is vulnerable under *Jadeja* and *Kranti*.
5. **Sendback abuse.** More sendbacks can look like gaming the Lok Sewa Guarantee clock. The opposition and the media will call it "files returned to avoid penalty".

**Conditions for approval:**
- Rename the tool and reframe it as **staff support**, for example "the computer operator you asked for".
- **No officer-level metrics** leave the tehsil. The dashboard shows district and sub-division aggregates only, it is never used in ACRs, and a GO says so.
- Revenue is the **business owner and chairs the steering group**. CHiPS is the technical agency.
- Routing is configurable and follows departmental notifications.
- The Tehsildar/Naib Tehsildar association (CJASO) is **briefed before the pilot starts**, and one of its members sits on the pilot review group.
- Sendback cycle time is tracked **inclusive of every return**.
- A department Law Officer vets the draft-order templates.

### 1.2 CEO, CHiPS
**Initial stance:** Supportive, with conditions. *"This is exactly the 'AI-based decision support' line in the AI Mission, and I have no AI procurement on the board yet. I also cannot let a hackathon team own a module inside Sewa Setu."*

**Top concerns:**
1. **Maintainability and vendor lock-in.**
   - Who maintains it in year 3? A student team is not a vendor. A startup might not survive.
   - The stack mixes Python, Node, React, GoRules, RapidFuzz, Cytoscape and optional Ollama or Sarvam. CHiPS staff must be able to run it.
2. **Integration, not a new window.**
   - Officers will not open another app with another login.
   - It must sit **inside the Sewa Setu officer screen** (admin-ed), which means working with the Sewa Setu system integrator.
   - The proposal does not mention the SI at all. The SI is the stakeholder most able to slow-walk this, and the most likely to want the credit or a change-request fee.
3. **Cybersecurity.**
   - This is a new query path into a statewide caste and identity archive.
   - M-SOC procurement is live. Before go-live it needs a CERT-In-empanelled security audit ("safe-to-host"), VAPT, role-based access and no outbound calls.
   - **The Sarvam API option is a non-starter** for applicant data: it is an external cloud LLM.
4. **Cost and GPU.**
   - The AI Mission money is real but contested.
   - An SDC GPU purchase for "a plain-language summary" will not survive a Finance Department query.
5. **Credit and metrics.**
   - CHiPS wants this counted among the AI Mission's "50+ AI services" and as a submission for national e-governance awards.
   - NeSDA has not published a CG rank, so do not promise NeSDA gains. CHiPS will not want a pilot that ends in a negative press story about caste.
6. **Sewa Setu's own "AI" claim.** The April 2026 launch already said "AI". This must look like the next phase of Sewa Setu, not a rival product.

**Conditions for approval:**
- **Code, models, rules and data belong to CHiPS.** The code is open source and held in the CHiPS repository.
- A documented **handover to CM IT Fellows (IIIT-NR)** and CHiPS staff by day 180.
- Delivered as a **Sewa Setu module or API** that the SI integrates, with a signed interface control document.
- **Everything runs in SDC. No external APIs. No GPU in the pilot:** drafts come from templates and OCR runs on CPU.
- Bhashini, not a private LLM, for translation.
- A security audit is done before any real data is touched.
- A fixed-price PoC, then a pilot with milestone-linked payments.

### 1.3 Secretary, Tribal & SC Development (High Power Caste Scrutiny Committee member)
**Initial stance:** Sceptical, leaning towards a conditional yes. *"My committee spends its life undoing fake certificates. Your lineage feature could mass-produce them."*

**Top concerns:**
1. **Lineage inherits fraud.**
   - If a relative's certificate was fraudulent, a lineage match turns one fake into many "GREEN" approvals.
   - In the Baiga cases (Bilaspur and GPM), the fake certificates were **already inside the system**.
   - Any lineage match must check whether the relative's certificate is:
     - cancelled or under scrutiny by the HPSC or the District Verification Committee
     - in the GAD fake-certificate list
     - issued by a competent authority
     - itself verified under r.15(2)
   - The proposal has no link to the scrutiny committee's cancellation register.
2. **Caste-name normalisation is a legal act, not a string match.**
   - The proposal treats "Dhimar", "Dheevar" and "Dhemar" as spelling variants to fuzzy-match. That is exactly how an OBC community became "Baiga".
   - The ST and SC lists come from Presidential Orders under Art. 342 and Art. 341. Only Parliament can amend them, and courts and states cannot read synonyms into an entry (*State of Maharashtra v. Milind*, 2001).
   - Any caste synonym or transliteration table must be **approved by the department**. Fuzzy matching on the caste field itself must be **off**; match only on names.
3. **Exclusion of genuine tribals.**
   - The people least likely to have a digitised relative's certificate are those most in need:
     - PVTG families (Baiga, Pahadi Korwa, Abujhmadiya, Kamar, Birhor)
     - remote Bastar and Surguja villages
     - landless and forest-dwelling households whose evidence is a gram sabha resolution
   - If a GREEN lane appears, "no match" quietly becomes a second-class queue.
4. **Women and married applicants.**
   - Caste is by birth and does not change on marriage (*Valsamma Paul*, 1996).
   - A married woman's application lists her husband's village, and sometimes his name. A match on father's name plus village fails for her, or worse, matches her husband's family.
5. **Fifth Schedule areas.**
   - Kondagaon is in Bastar, a Scheduled Area. Choosing it as a pilot district needs sensitivity to PESA gram sabha evidence and to local tribal organisations.
   - A pilot there is politically visible.
6. **Social justice optics.** Any statistic showing the tool approves one caste group more readily than another will end the project.

**Conditions for approval:**
- Lineage checks consult the **cancellation and scrutiny registers**, and the HPSC shares its list.
- The department owns a **caste-name master**: exact entries from the constitutional lists, plus approved local synonyms. There is no fuzzy matching of caste.
- "No lineage match" is **explicitly neutral**. It carries the label "normal enquiry under Rule 8", never AMBER on that ground alone.
- Rejection and approval rates are **monitored by category and gender**, with a stop rule.
- The **10% random sample under r.15(2) stays untouched**. Risk-flagged cases are *added* to it, not substituted.
- Tribal organisations, and the ST and SC Commissions if the department wishes, are briefed before the pilot starts.
- A department nominee sits on the oversight panel.

### 1.4 Legal / data-protection advisor
**Initial stance:** "Not in its current form." Workable with redesign.

**Top concerns:**
1. **Who is the Data Fiduciary?**
   - Under the DPDP Act 2023, it is the department that decides the purpose and means of issuing certificates: Revenue. CHiPS is at most a processor.
   - "CHiPS owns the archive" is not a legal basis. A Revenue GO specifying the purpose is.
2. **Secondary use of third-party data.**
   - A lineage search processes the **relative's** personal data (a caste certificate) for a new purpose: deciding someone else's application.
   - That is arguably within s.7(b) "certificate" legitimate use. It still needs to be:
     - specified in a GO
     - minimised (only fields needed to confirm relationship and caste)
     - disclosed in the Rule 5 notice
   - A **population-wide fuzzy search** of the caste archive by father's name plus village looks like profiling.
   - **Recommendation:** a *declared-lineage* design. The applicant names relatives, optionally with their ARN, and the system verifies those. A bounded search is a fallback only, and only for the officer.
3. **Wrong-person disclosure.**
   - A fuzzy match can surface a **stranger's** caste certificate.
   - Showing it in an order or to the applicant is a personal-data breach and an RTI s.8(1)(j) problem.
   - Relative data must be shown only to the officer until the officer confirms the relationship.
   - Orders cite the certificate number only, with no details of the third party.
4. **RTI exposure.**
   - Flags, lane labels, draft versions and override logs are "information" under s.2(f).
   - An applicant **will** file RTI for "why was I AMBER".
   - Flag text must therefore be neutral and factual: "record inconsistency: relative certificate No. X records caste Y". Never "suspected fraud" or "high risk".
   - Flag rules should be **published proactively under s.4**.
5. **Retention clash.**
   - DPDP says keep data only as long as needed. Caste certificates are permanent.
   - HPSC cancellation under s.7–9 can come years later, and criminal cases under s.10 need evidence then.
   - Split the retention:
     - The **evidence snapshot and flag log stay with the case file for the life of the certificate**.
     - Raw pulls and intermediate data are deleted on a schedule.
     - Access logs are kept at least 1 year (DPDP Rule 6) and at least 180 days (CERT-In).
6. **Evidentiary value.**
   - Records the tool surfaces may be needed in a s.10 prosecution.
   - Electronic records then need a certificate under **Bharatiya Sakshya Adhiniyam 2023, s.63** (the old IEA s.65B).
   - The design needs hash-sealed, time-stamped snapshots.
7. **Minors.**
   - Class 9–12 students get caste certificates through schools, so many applicants are **children** under DPDP s.9.
   - s.9(3) bars tracking and behavioural monitoring of children. A flag for "prior applications" or "document reuse" on a minor must be examined against it [U: needs an interpretive opinion; s.7(b) state processing may be carved out by the Rules].
8. **Aadhaar.**
   - The synthetic Aadhaar QR demo is fine. Production use of Aadhaar as a join key, or storing Aadhaar numbers, needs a legal basis:
     - Aadhaar Act s.7 or s.4(4)(b)(ii), under the Good Governance Rules 2020 as amended in 2025
     - s.8A consent for offline verification
     - s.29 restrictions
     - Aadhaar Data Vault storage
   - No CG notification covering certificates was found. **Leave Aadhaar out of the pilot.**

**Conditions for approval:**
- A Revenue GO that states the legal basis and the assistive-only status.
- A DPIA, done voluntarily since the State is not a notified SDF.
- The declared-lineage design.
- Neutral flag vocabulary.
- A split retention schedule.
- Hash-sealed evidence snapshots.
- No Aadhaar.
- Law Department vetting of the order templates.
- A clause stating **the tool's output is not a ground of decision**; the order must record the officer's own findings.

---

## 2. Political and social risk analysis

### 2.1 Headline risks, and what triggers each

| Headline the opposition or media could run | What in the current proposal triggers it | Likelihood |
|---|---|---|
| **"अब AI तय करेगा आपकी जाति"** ("AI will now decide your caste") | The name "Nirnay (decision) Sahayak", the phrase "lane suggestion" and "AI" in slides | High |
| "Government admits 2.2 lakh were wrongly denied caste certificates" | The pitch hook: "Now fix wrong decisions" | High |
| "Data of Adivasis handed to a private startup" | A hackathon team, the Sarvam API and a startup procurement route | Medium–High |
| "A caste database built by linking Aadhaar and ration cards" | Phase 2 Bhuiyan/Khadya pulls, the Aadhaar QR and "family lineage graph" wording | Medium |
| "Tehsildars to be watched by AI" / "Officers ranked by an algorithm" | Override-rate and consistency dashboards | High within the service; medium in the media |
| "Algorithm flags Adivasi girl's certificate; she misses NEET counselling" | Any AMBER on a minor or a woman at a deadline, or a fuzzy false conflict | Medium (one case is enough) |
| "Fake certificate approved with AI's green signal" | A lineage match to an uncancelled fake relative | Medium, and catastrophic |
| "GPM and Kondagaon chosen because they are tribal" | Choosing high-ST pilot districts without explaining why | Medium |

### 2.2 Exclusion risk: who gets hurt first
- **First-generation applicants.** They have no prior certificate in the family, so they get no lineage benefit. They rely on gram sabha resolutions or pre-1950 records, which the tool cannot read.
- **Applicants whose fathers were certified before digitisation.** This is a large group, and a factual problem for the pitch.
  - Fathers of today's 18-year-olds were mostly certified in the 1990s or 2000s: on paper, and often by undivided Madhya Pradesh authorities before 2000.
  - The e-District archive starts in 2015. DigiLocker pulls start in 2018.
  - Lineage hits will therefore come mostly from **siblings and cousins** certified since 2015, not fathers.
  - The pitch line "the state already holds a certificate for their father" is **mostly untrue today**.
- **Migrants:**
  - inter-district movers (village mismatch)
  - families returning from brick-kiln or seasonal migration
  - people displaced by LWE (left-wing extremism) conflict in Bastar
- **Women.** Their caste is by birth but their address and surname are by marriage. Fuzzy matching on the husband's line produces false conflict flags.
- **Name-variant-heavy communities.** Hindi and English transliteration variants, single names, and names without surnames are common in some tribal communities.
- **PVTGs and forest villages.** Weak land records and CSC-mediated applications mean poor OCR input.

**Required mitigations:**
- "No match" or "insufficient data" leads to **the ordinary Rule 8 enquiry**, never AMBER.
- AMBER must be triggered only by a **positive conflict** between records, never by missing data.
- A **fairness stop rule**: if the rejection rate for "no-match" applicants, or for any category or gender, rises more than 2 percentage points against control, the pilot pauses.
- Deadline protection: provisional or temporary certificate routes are always shown for students near an admission or scholarship deadline.

### 2.3 Officer association backlash
- **The trigger:** officer-level agreement, override rate and "consistency" metrics, plus pitch language that blames local practice.
- **What defuses it:**
  1. Brief the Tehsildar association *before* any announcement.
  2. Put an officer representative on the review group.
  3. Measure at district and sub-division level only, with no individual names above SDO level.
  4. A GO that states pilot data will not be used in ACRs or disciplinary action (except for wilful misuse).
  5. Frame the tool as the **"due-diligence record that protects you under s.12"**, and as the technical support the 2025 strike demanded.
  6. Rename the "override rate" to **"officer-disagreement cases reviewed to improve the rules"**. Every disagreement is an input for fixing the *tool*, not a mark against the officer.

### 2.4 Opposition narratives and counter-framing
- **The narrative:** "BJP government uses AI to deny reservation" or "caste data surveillance".
- **The counter:** the tool's measurable promise is **fewer avoidable rejections of genuine SC/ST/OBC applicants**, alongside fraud prevention that genuine tribal groups have themselves demanded after the Baiga cases.
- **The political fact to use:** tribal organisations *want* fake certificates stopped, and SC/ST/OBC applicants *want* fewer rejections. The tool serves both, so the message must lead with both, in that order.

### 2.5 Recommended framing
- **Rename** the tool to something that signals records, not decisions: *"Pramaan Sahayak"* (evidence assistant) or *"Abhilekh Mitra"* (records companion). Drop "Nirnay".
- **Tagline (Hindi first):** *"सही आवेदक को जल्दी प्रमाण-पत्र, फर्जी पर रोक — निर्णय अधिकारी का"* ("A quick certificate for the genuine applicant, a stop to fakes; the decision stays with the officer").
- **Vocabulary swaps:**

| Avoid | Use instead |
|---|---|
| "AI decides" or "lane" | "record check" |
| GREEN / AMBER | "records complete" / "records need officer attention" |
| "risk" | "inconsistency" |
| "fraud flag" | "record mismatch" |
| "wrong decisions" | "avoidable rejections", or "rejections that could be cured with records the state already has" |
| "override rate" | "officer feedback" |

- **Say "AI" sparingly** in citizen-facing material. Say it freely in AI Mission reporting.
- **District choice:** explain it as "the districts with the most to gain and the officers who asked for support". Pair each treatment unit with a matched control, and never present it as a ranking.

---

## 3. Institutional feasibility

### 3.1 Ownership
| Role | Body | Why |
|---|---|---|
| **Business owner and chair of the steering group** | Revenue & DM Department (Secretary), with its AI nodal officer | It owns the competent authorities, the GO and the certificate policy. Without Revenue ownership, officers will not use the tool. |
| **Technical implementing agency** | CHiPS | Sewa Setu, the SDC and AI Mission funds. It holds the code and the contracts. |
| **Caste-policy stakeholders** | Tribal & SC Development Dept (HPSC) and GAD (caste certificate and reservation circulars; ran the fake-certificate review) [U: exact GAD role] | The caste-name master, the cancellation register and r.15(2) audit design |
| **Data providers (phase 2)** | NIC / Commissioner Land Records (Bhuiyan), the Food Dept (Khadya) | MoUs |
| **Oversight** | A pilot review group (see §5), and the State Data Governance Committee once constituted | Legitimacy |
| **Build and maintenance workforce** | IIIT-NR CM IT Fellows, plus the team as a startup or academic partner | Continuity, and avoiding lock-in |

The proposal currently implies CHiPS as owner. **Say instead: "Revenue's tool, built and hosted by CHiPS."**

### 3.2 Procurement route (realistic)
1. **Hackathon to PoC (0–3 months), with no real data.**
   - Options: a prize grant or a CHiPS–IIIT-NR research MoU, using the CM IT Fellowship channel.
   - Work happens in the CHiPS sandbox (`test-ed.cgstate.gov.in` or an SDC dev VM) on synthetic data, plus a **de-identified retrospective extract** (see §5).
   - Cost is small, so it can be approved within CHiPS delegated powers [U: the exact CHiPS delegation limits].
2. **PoC to pilot (months 3–9).** Four routes are available:
   - **(a) Nomination to IIIT-NR** as a government academic institution, with the team as sub-contracted or fellow developers. This is the fastest and cleanest for a pilot.
   - **(b) A GeM custom bid** for "AI/ML software development services". It is compliant but slow (6–10 weeks) and open to anyone, so the team may lose it.
   - **(c) An AI Mission startup challenge or innovation grant**, if the Mission's society rules allow it [U: mission structure]. Startup relaxations on turnover and experience may apply under DPIIT and CG startup policy [U].
   - **(d) A change request to the existing Sewa Setu SI.** It is fast technically, but the team loses ownership and CHiPS gets lock-in.
   - **Recommend (a) for the pilot and (b) or (c) for the state-wide scale-up**, with (d) used *only* for the integration hook into the officer screen.
3. **Funding source:**
   - the AI Mission "AI in governance" allocation (the budget line is a minimum of ₹100 cr a year)
   - with Revenue's AI nodal officer listing the tool in the department's AI roadmap
   - **Timing hook:** FY 2026-27 AI Mission funds need sanctioned projects before 31 March 2027.

### 3.3 Approvals and orders the pilot needs
**Before the PoC with de-identified real data:**
1. A **CHiPS internal approval** for a de-identified extract of decided caste and domicile applications from 2 districts, processed inside the SDC. The approval covers data-minimisation specifications and a non-disclosure undertaking for the team.
2. **Revenue Department consent** (a letter from the Secretary) for CHiPS to use service data for the study, since Revenue is the Data Fiduciary.

**Before the 90-day shadow pilot on live data:**

3. **A Revenue Department Government Order** that:
   - names the tool as an aid to competent authorities under the Caste Act 2013, Rules 7–8 and the domicile instructions
   - states the tool is assistive only and that officers must record their own findings
   - specifies the purpose and data fields
   - designates pilot sub-divisions and tehsils
   - bars use of pilot data in ACRs or discipline
4. **Law Department vetting** of the GO and the draft-order templates, plus an Advocate General's view on how to handle the July 2026 HC rulings in routing.
5. **Tribal & SC Development Department (HPSC) concurrence:**
   - the caste-name master
   - sharing the cancellation and scrutiny register
   - the r.15(2) "random plus additional flagged" audit design, as an executive instruction. **No Rules amendment is needed if the random 10% is kept intact.**
6. **GAD concurrence** on caste certificate procedure [U: whether GAD must concur].
7. **CHiPS approvals:**
   - read-only replica or view of the Sewa Setu archive in the SDC
   - SDC hosting
   - **a CERT-In-empanelled security audit / safe-to-host certificate**
   - an interface agreement with the Sewa Setu SI
8. **E&IT / AI Mission sanction:** project approval and fund release through the Mission's governing or executive body [U: exact body], plus Finance Department concurrence if the amount is above delegated limits.
9. **District orders** from the Collectors of pilot districts to SDOs and Tehsildars, and to the DeGS and e-District Managers.
10. A **DPIA** signed off by the Revenue nodal officer, and a **Rule 5 notice text** added to the Sewa Setu application form.

**Phase 2 only:**

11. **State Data Governance Committee** approval (Chief Secretary-chaired, per the national framework of 15-05-2026). If the SDGC is not yet constituted, a Chief Secretary-level order.
12. An **MoU with NIC and the Commissioner Land Records** for a Bhuiyan B-1 name-lookup web service.
13. An **MoU with the Food Dept** for the ration roster.
14. **Aadhaar**, if ever used: approval under the Good Governance Rules 2020 (amended 2025) or a s.7 notification.

### 3.4 Timeline realism
| Milestone | Proposal implies | Realistic [Est.] |
|---|---|---|
| Hackathon demo | Oct 2026 | Oct 2026 |
| De-identified back-test (PoC) | — | Nov 2026 – Jan 2027 (approvals 3–6 weeks, analysis 4–6 weeks) |
| GO, security audit, SI integration | — | Jan – Mar 2027 |
| 90-day shadow pilot | "Immediately" | **Apr – Jun 2027.** This overlaps Sushasan Tihar (May–Jun) and the school-admission surge, which is *good* for shadow data but bad for any assisted-mode change. |
| DPDP Rule 5 / Second Schedule in force | — | **13 May 2027, mid-pilot.** The pilot must be compliant from day 1. |
| Assisted mode | After shadow | Aug – Oct 2027, after a review. Avoid the Jun–Aug admission peak for any workflow change. |
| State-wide decision | — | FY 2028-29 budget cycle |

**Risk:** a Tehsildar strike or an election-period freeze on new schemes. Build in a 2-month buffer.

### 3.5 Total cost of ownership [Est. — rough orders of magnitude, for discussion with CHiPS]

**PoC (3 months, synthetic data plus de-identified back-test): ₹10–25 lakh**
- a 4–5 person team (₹8–18 L)
- an SDC development VM (existing capacity)
- independent evaluation support (₹2–5 L)

**Pilot (about 9 months: 3 months of preparation, 90 days of shadow mode, 90 days of assisted mode, 4 sub-divisions): ₹0.8–1.5 cr**

| Item | ₹ |
|---|---|
| Team of 6–8 (developers, data engineer, domain/legal liaison, trainer) | 55–90 L |
| SDC compute. **CPU only.** Template drafting needs no LLM; OCR runs on CPU. | 3–8 L (incremental) |
| Security audit and VAPT | 3–8 L |
| SI integration change request | 5–15 L |
| Training: about 60–100 officers and operators in pilot units | 3–6 L |
| Independent evaluation (e.g., IIIT-NR or IIM Raipur) | 8–15 L |
| Contingency | 10% |

- **Optional GPU:** one 48 GB-class inference server is about ₹25–40 L capex. **Do not ask for it in the pilot.** If an LLM summary is wanted later, share the AI Mission's SDC GPU pool or the Nava Raipur AI Data Center Park capacity.

**State-wide (33 districts, about 5.3 L caste and about 7 L domicile applications a year [Est. from MIS run-rate]):**

| Item | ₹ |
|---|---|
| Hardening, scale-out, rule-editor UI, integration of all queues (one-time) | 2–4 cr |
| Annual O&M: team of 8–12, SDC infra, annual audit, rule maintenance for circulars and the caste master, helpdesk | 1.5–3 cr a year |
| Training of about 1,000–1,500 SDOs, Tehsildars, Naib Tehsildars and operators, via iGOT Karmayogi plus classroom sessions | 0.3–0.6 cr (one-time) |
| Optional GPU (2–4 servers) for summaries and self-hosted OCR at scale | 0.6–1.5 cr (capex) |
| **5-year TCO** | **about ₹10–20 cr**, which is 2–4% of the ₹500 cr AI Mission |

- **Unit cost:** roughly ₹15–25 per caste or domicile application a year, against a ₹30 service fee.

**Honest benefit check:**
- The proposal's own benefit figures are:
  - ₹1–2.5 cr a year in citizen costs
  - 18–26k officer-hours, worth about ₹1.5–2.5 cr a year at a loaded SDO/Tehsildar cost [Est.]
- That is **roughly break-even** against O&M.
- The economic case is therefore **not** the rupee saving. It rests on:
  - averting fraud (one fake-certificate government job costs decades of salary and displaces a genuine candidate)
  - fewer appeals and writs
  - fewer students missing scholarship and admission deadlines
  - a defensible audit trail
- Say this openly. A Finance Department reviewer will do the arithmetic anyway.

### 3.6 Capacity building
- **Revenue AI nodal officer:** trained as the product owner. It owns the rules backlog and the caste master with the Tribal Department.
- **Officers:**
  - a 2-hour classroom session plus in-app guidance
  - an IndiaAI competency module on iGOT Karmayogi
  - a "how to disagree with the tool" drill, since override is an expected behaviour
  - Hindi-first materials
- **Operators and CSC VLEs:** better upload quality through legible scans and a declared-relatives field. This is where many avoidable rejections begin.
- **CHiPS:** 2–3 staff plus CM IT Fellows are trained to run, monitor and change rules. The handover is tested by CHiPS running one release without the team.
- **District Verification Committees:** a briefing on the new "random plus flagged" audit list.

---

## 4. Legal compliance checklist the proposal must show

**Constitutional and administrative law:**
- **Art. 14.** Consistent, non-arbitrary decisions. Use it to support the consistency analytics, but aggregate only.
- **Art. 21 privacy** (*K.S. Puttaswamy*, 2017). The proportionality test covers legality (the GO), a legitimate aim, necessity (minimised fields) and procedural safeguards.
- **Art. 341 and 342.** Presidential Orders define SC and ST entries, and there is no reading-in of synonyms (*Milind*, 2001). The caste master must be department-approved, with no fuzzy caste matching.
- **Natural justice:** reasoned orders (*Kranti Associates*, 2010) and an opportunity to be heard (*Madhuri Patil*, 1994).
- **No dictation or fettering of statutory discretion** (*Jadeja*, 1995). The officer acts on every flag, there is no bulk approval, and the order carries an "officer's own findings" field.
- **Caste is by birth, not marriage** (*Valsamma Paul*, 1996). This affects matching logic for married women.

**CG Social Status Certification Act 2013 and Rules 2013:**
- **s.2 competent authority.** Routing follows the departmental notification; the HC July 2026 ruling is to be handled per the AG's advice.
- **r.3(3):** relatives' certificates and revenue records as evidence. This is the legal basis for lineage.
- **r.7–8:** the inquiry may be delegated, but the decision may not. Missing records lead to a field or oral enquiry.
- **r.9–10:** time limits, and the provisional-certificate route.
- **r.15(2):** keep the 10% random sample, and add flagged cases on top.
- **r.18:** reasons for non-satisfaction are communicated.
- **s.12:** officer liability, and the tool as a due-diligence record.
- **s.15:** the burden of proof is on the applicant. The tool must not shift it by treating missing records as negative.
- **s.5–9:** appeal and scrutiny, and interoperability with the HPSC and DVC cancellation registers.

**Other state law:**
- **CG Lok Sewa Guarantee Adhiniyam 2011:** SLA and appeal. Track sendback cycle time, and do not use sendback to stop the clock.
- **CG Land Revenue Code 1959:** the basis for Bhuiyan records (phase 2).
- **Domicile and income:** GAD and Revenue executive instructions. Cite the exact circular numbers [U: to be obtained].

**DPDP Act 2023 and DPDP Rules 2025:**
- **s.7(b)** legitimate use by the State for a certificate, which is the basis for processing without consent.
- **Rule 5 and the Second Schedule** (from 13-05-2027). The design must show each of:
  - lawful basis (the GO)
  - specified purpose
  - necessary data only
  - accuracy
  - a retention limit
  - security
  - notice with a contact point
  - accountability
- **s.8(3):** accuracy and completeness where data is used to make a decision affecting the data principal.
- **s.8(5) and Rule 6:** security safeguards, and logs kept at least 1 year.
- **s.8(6) and Rule 7:** breach notification to the Board and to data principals.
- **s.11–13:** rights to access, correction and grievance redress. The applicant can see and contest the records used.
- **s.9:** children's data. Examine flags on minor applicants [U: interpretive opinion needed].
- **Third-party data (relatives):** minimise it, show it to the officer only, and exclude it from the order text.

**Aadhaar:**
- **Aadhaar Act 2016, s.7 / s.4(4)(b)(ii):** a legal basis is needed before any use. The Good Governance Rules 2020 (amended 31-01-2025) apply.
- **s.8A:** offline verification needs consent.
- **s.29:** restrictions on sharing and display.
- **Aadhaar (Data Security) Regulations 2016 and the Aadhaar Data Vault requirement.**
- **Pilot position:** no Aadhaar use.

**IT and security:**
- **IT Act 2000, s.3A, 4, 5 and the Second Schedule:** e-sign and electronic records, fitting the e-Sign SP procurement.
- **IT Act s.72A and s.43A, and the Reasonable Security Practices Rules 2011:** best-practice alignment.
- **CERT-In Directions of 28-04-2022 under s.70B:** 6-hour incident reporting, 180-day logs held in India, and NTP sync.
- **A CERT-In-empanelled audit / safe-to-host certificate** before SDC go-live, plus SDC security policy and M-SOC onboarding.
- **GIGW 3.0 and UX4G:** accessibility, and bilingual Hindi-first design.

**Evidence and transparency:**
- **Bharatiya Sakshya Adhiniyam 2023, s.63:** certificates for electronic records. Keep hash-sealed evidence snapshots.
- **RTI Act 2005:**
  - s.4 proactive disclosure of flag rules and the tool's description
  - s.8(1)(j) and s.11 for third-party (relative) information
  - neutral flag wording
- **Record retention:** evidence snapshots and flag logs stay with the case file for the life of the certificate. Raw pulls are purged on a schedule. This follows the department's record-retention schedule [U: the CG Revenue record-weeding rules].

**AI governance (soft law):**
- **India AI Governance Guidelines (MeitY, 5-11-2025):**
  - People First: human final control
  - fairness monitoring
  - accountability
  - understandable by design
  - a grievance route
- **National Framework for Data Sharing (15-05-2026):** SDGC approval for cross-department pulls, and API wrappers.
- **Kerala HC AI policy (Jul 2025) and Gujarat HC / SC Sep 2026 hallucination cases:**
  - persuasive only
  - supports "no AI findings; template drafts cite only records"

---

## 5. What gets a YES: the exact ask, and success and kill criteria

### 5.1 The ask (last slide, word for word)
> **"We are not asking you to change a single decision. We ask for three things:**
> 1. **A 6-week retrospective study inside the SDC.** Revenue and CHiPS authorise a de-identified extract of about 20,000 *already decided* SC/ST, OBC and domicile applications from 2 districts. We will measure how often a relative's certificate already existed, how often it was used, and whether record mismatches were present in later-cancelled cases. The cost is ₹10–25 lakh, and no citizen or officer is affected.
> 2. **If the study clears the bar, a 90-day shadow pilot** in 2 sub-divisions, with 2 matched sub-divisions as control. The tool runs silently beside officers inside Sewa Setu and shows its check only *after* the officer decides, or on request. It runs CPU-only in the SDC with no external APIs, under a one-page Revenue GO. The cost is ₹0.8–1.5 crore from the AI Mission's 'AI in governance' allocation, through CHiPS, with milestone-linked payments.
> 3. **A 7-member pilot review group** chaired by the Revenue Secretary, with CHiPS, a Tribal Department/HPSC nominee, a Law Department officer, a Tehsildar association representative, and IIIT-NR as independent evaluator. It meets at day 45 and day 90 and has the power to stop the pilot.
>
> **CHiPS owns the code. Revenue owns the decisions. Officers keep the pen."**

- The key design choice is the **retrospective study**. It answers the proposal's weakest assumption (Assumption A: 30–50% have a relative's certificate) using real data, at almost no political risk.
- It gives every decision-maker a cheap first "yes".

### 5.2 Go/no-go after the retrospective study (gate to the shadow pilot)
**GO if all of the following hold:**
- **Lineage availability.** At least 15% of caste applications have a digitised relative's certificate that is verifiable on declared or strong-match criteria. If it is below 15%, the core feature is too thin; pivot to domicile or income.
- **Lineage false-match rate** is at most 2% on a manually verified sample of 300 matches.
- **Avoidable-rejection share:** among rejected caste applications, at least 20% had a relative's certificate in the archive at the time of rejection.
- **Cancelled-certificate signal:** where the HPSC or GAD cancellation data is available, report how many later-cancelled certificates showed a detectable record mismatch at issuance. This is descriptive, with no target.

### 5.3 Success criteria for the 90-day shadow pilot
| Metric | Target |
|---|---|
| Lineage match precision (officer-confirmed) | ≥ 98% |
| Record-mismatch flag precision (confirmed as a real inconsistency after officer or DVC review) | ≥ 80% |
| Agreement of "records complete" cases with officer approval | ≥ 90% (disagreements reviewed, to fix rules) |
| Officer-reported usefulness (anonymous survey) | ≥ 60% "useful or very useful" |
| Median officer scrutiny time on "records complete" cases (time-and-motion sample) | ≥ 20% lower (measured in the assisted phase) |
| **Exclusion guard:** rejection rate for no-match applicants, and by category and gender, against control | Not worse than +1 percentage point |
| Cure rate of deficiency-specific sendbacks (assisted phase) | ≥ 50% cured within the SLA |
| Security | Zero incidents; 100% of data access logged and attributable |
| Availability inside the Sewa Setu officer screen | ≥ 99% during working hours |

### 5.4 Kill criteria (immediate pause, review-group decision)
- Any **lineage match to a cancelled or fake certificate** reaching "records complete" without a warning.
- Lineage false-match rate **above 2%**, or any third-party certificate disclosed to an applicant.
- **Any order found citing the tool's output as its ground**, or any rejection with no officer findings.
- Rejection rate for no-match applicants, or for any category or gender, **rises more than 2 percentage points** against control.
- A **security incident** involving caste or identity data, or any external data egress.
- Flag precision **below 50%** at day 45.
- Officer use **below 30%** by week 6. That means the tool is not wanted and will not survive.
- A **formal objection from the officer association** that the review group cannot resolve within 2 weeks.

**Guard against regression to the mean:**
- The pilot deliberately picks *high-rejection* districts, so their rates are likely to fall anyway.
- Success must therefore be measured as **difference-in-differences against matched controls**, never as a before/after comparison in the treated districts.

---

## 6. What in the proposal is wrong, naive or missing

**Factually wrong or overstated:**
1. **"The state already holds a certificate for their father."**
   - The archive starts in 2015, and DigiLocker pulls start in 2018. Most fathers were certified on paper, often by undivided Madhya Pradesh authorities before 2000.
   - Hits will be mainly siblings and cousins. Assumption A (30–50%) is probably optimistic.
   - Soften the hook to *"a certificate for their sibling or family"* and test it in the retrospective study.
2. **"CHiPS owns it, so no other department's agreement is needed."** This is wrong in governance and under DPDP.
   - Revenue is the service owner and Data Fiduciary.
   - The Tribal Department and HPSC must concur on caste logic.
3. **"Now fix wrong decisions" and "1 in 5 wrongly rejected."**
   - A rejection is not proof of a wrong decision. It includes incomplete applications, duplicates, re-applications and genuine non-eligibility.
   - The data supports "*avoidable* or *curable*" rejections at most, and even that is Assumption B.
4. **"Role-aware routing prevents wrong-authority errors."**
   - Routing is a Sewa Setu *configuration* set by departmental notification, not an AI feature.
   - It is also contested law. Present it as "configurable per notification".

**Naive design choices:**

5. **Lineage without a fraud firewall.** Matching to relatives' certificates without checking the cancellation and scrutiny registers **propagates fakes**. This is the single most dangerous gap.
6. **Fuzzy matching near the caste field.** Name fuzziness is fine. Caste-name fuzziness (Dhimar, Dheevar, Dhemar) is legally impermissible under Art. 341 and 342 and *Milind*. A department-owned caste master is mandatory.
7. **Population-wide lineage search** by father's name plus village. It is privacy-heavy, error-prone for married women and migrants, and looks like profiling. Switch to **declared relatives with verification**, and keep search as a restricted officer-only fallback.
8. **pHash duplicate detection.** CSC operators reuse the same affidavit templates, notary stamps and backgrounds, so false positives will be large. Duplicates cluster by CSC operator and become a VLE-surveillance issue. Tune it on real data and route operator-level patterns to the DeGS, not into individual applicants' flags.
9. **The "prior rejection for a different caste" flag.** People legitimately correct sub-caste spellings or errors. The flag must be neutral and must never go into order text.
10. **The Sarvam API option.** An external LLM receiving caste applicant data is unacceptable to CHiPS and the legal advisor. Remove it, and use Bhashini or on-prem only. In the pilot, drop the LLM entirely.
11. **Shadow mode that measures "agreement with officers".** If officers are inconsistent (the core thesis), agreement with them is a poor ground truth. The design needs an **adjudicated gold sample**: DVC or independent re-review of about 300–500 cases.
12. **Showing the suggestion before the officer decides.** In shadow mode this creates anchoring and contaminates the measurement. Show it after the decision, or on request.
13. **Pilot district choice** (GPM and Kondagaon as treatment, 2 as control).
    - Four districts is too few for inference, and the result is exposed to regression to the mean.
    - Kondagaon is a Fifth Schedule area, which is sensitive.
    - Randomise at **sub-division or tehsil level** within districts. Choose units in consultation with the Collectors, and include volunteers.
14. **Officer-level override-rate dashboard.** This is union dynamite. Aggregate it, and rename it "officer feedback".
15. **Sendback preference with no clock accounting.** It invites an "SLA gaming" narrative. Track total cycle time.

**Missing:**

16. **The Sewa Setu system integrator.** The proposal has no integration plan for the officer screen, and no answer to who builds the hook.
17. **The HPSC, DVC and GAD cancellation registers,** and the GAD role in caste certificate policy.
18. **Retention and evidence design:** keep records for the life of the certificate, and seal snapshots for BSA s.63.
19. **RTI posture:** neutral flag vocabulary, and s.4 publication of rules.
20. **Children's data (DPDP s.9)** for school-campaign applicants.
21. **Married women's matching logic,** and caste-by-birth handling.
22. **A deadline-aware path** to provisional or temporary certificates for students.
23. **An honest economics slide.** The rupee savings roughly equal O&M. The value is fraud prevention, litigation avoided and deadlines met.
24. **A maintenance and exit plan:** CHiPS-owned code, a Fellow handover, and a "what if the team disappears" answer.
25. **Change management:** a pre-pilot association briefing, a training plan, and a helpdesk.
26. **The name.** "Nirnay" means decision. For a tool whose legal survival depends on *not* deciding, the name itself is evidence against it. Rename it.
27. **Unverified items still in play:**
    - HC case names and dates (sources differ by a day on Sonkar)
    - the "Sendback" status [U]
    - the speed-only officer ranking [U inference]
    - These must not appear on slides as fact.

---

### Bottom line from the room
- **Revenue:** "Yes to a study, a shadow pilot and a GO, if the tool is mine, officers are protected, and nothing ranks individuals."
- **CHiPS:** "Yes, if it lives inside Sewa Setu and runs in the SDC with no GPU or external API, and the code is ours with a Fellow handover."
- **Tribal Department:** "Yes, only with the cancellation-register check, a department-owned caste master, neutral no-match handling, and fairness stop rules."
- **Legal:** "Yes, with a Revenue GO, a DPIA, the declared-lineage design, neutral flags, split retention, sealed evidence and no Aadhaar."

**Net: a conditional YES to a ₹10–25 L retrospective study now, and a ₹0.8–1.5 cr shadow pilot in Apr–Jun 2027 if the study clears its gates.**
