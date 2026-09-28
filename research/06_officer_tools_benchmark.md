# 06 · Officer-side tools benchmark: what designated officers actually get, and what Praman Sahayak should copy
Research date: 27-09-2026. Scope: back-office / designated-officer (DO) products in India and abroad, caseworker AI assistants, and the research on officer UX and automation bias. Ends with a ranked **Top 20** of changes, each mapped to a Praman Sahayak screen and file.

**Tags**
- **[V]** means confirmed on an official or primary source, or a reputable outlet, that I fetched or extracted.
- **[U]** means unverified: search snippet, guide or aggregator site, or a page that would not load. **Keep [U] off slides.**
- "Not found" means not found in about 45 searches. It does not mean it doesn't exist.

Read with: `critique_1_officer.md` (SDO voice), `05_problem_validation.md §1.4` (Sewa Setu officer ranking report), `02_existing_solutions.md` (precedents already verified there are cited, not repeated).

---

## 0. Bottom line (read this first)

1. **The officer's time budget is about 2 minutes per file.**
   - Sewa Setu's own ranking report puts the busiest login at about 190 applications per working day [U: period not stated] (05 §1.4).
   - The ranking formula `H = 0.5·C − (0.3·E + 0.2·G)` rewards speed only.
   - So every feature must either **save seconds on a clean file** or **buy minutes only on a doubtful one**. Anything that adds a click to a clean file will be ignored (critique 1 §6.1).
2. **Indian officer consoles are workflow shells.** NIC ServicePlus, used by Bihar RTPS and many e-District states, gives the DO:
   - Pull, then Take Action
   - Verify True/False
   - Approve & Issue, Forward, Reject, Return
   - **Callback** (undo with reason)
   - DSC, unsigned or ink-signed issue
   - capped **bulk** actions: at most 25 Verify, at most 5 Approve & Issue at a time [V]

   None of them assembles evidence for the officer. That is Praman's gap, and it is real.
3. **The states that made officers fast did it with data, not UI.** Examples:
   - AP issues a certificate "across the counter" when a prior certificate or an authenticated household record exists.
   - Karnataka's e-Kshana issues same-day certificates when records match.
   - Haryana issues income certificates over the counter from PPP.
   - Minnesota's ex parte renewals fell from **70 to 11 minutes per case** once caseworkers checked data before asking for paper [V].

   **Praman's "records complete" view is the CG version of this pattern.** Pitch it as "proven elsewhere, new for CG caste certificates".
4. **The best quality controls in Indian practice are cheap:**
   - AP bars rejection "on grounds of insufficient documents", has RDOs and JCs **randomly review 25% of rejections**, and tracks cancelled certificates [U: circular reproduced on a secondary site].
   - Haryana raises an **auto appeal** when a service misses its RTS timeline [V: manual title and snippet].
   - Telangana lets a Tehsildar **tick "not competent" and route the file to the RDO** [U].

   Each maps onto a Praman feature in a few hours of work.
5. **Automation-bias research agrees with the SDO critique:**
   - Show evidence before the recommendation.
   - Keep friction for the cases that need it.
   - Expect officers to dislike the most effective forcing designs (Buçinca 2021, N=199) [V].
   - Time pressure makes over-reliance *worse in severity* (pathology RCT: 7% of correct calls flipped by wrong AI advice) [V].

   So: **no verdict colours, suggestion collapsed until the evidence is seen, and a mandatory finding only on reject or override.**
6. **What to avoid copying:**
   - officer-wise leaderboards (Haryana's SARAL score and CG's ranking report exist, but the SDO critique and 03 §7.2 say no)
   - bulk approve
   - per-flag acknowledgement on clean files
   - a separate login

---

## 1. India: officer-side products

### 1.1 NIC ServicePlus (Bihar RTPS officer manual; the same framework underlies many e-District states) [V]
- **Roles:**
  - Executive Assistant (EA): entry and delivery
  - Verifying Officer (VO): verify and forward
  - Designated Officer (DO): approve, issue, reject, return, callback
  - Admin

  One person may hold several roles and then does Verify → Approve → Issue in sequence.
- **Inbox:** filter by service and task, pick "From Date / To Date", then **[Get Data]**. Rows offer **Pull**, which locks the file to you, and then **Take Action**.
- **Actions:**
  - VO: radio buttons "Verify True / Verify False", then Submit.
  - DO: "Approve and Issue", Forward, Reject, Return back.
  - Before issue, the DO gets **View Document** (a certificate PDF preview) and **View Form**.
- **Signing:** "DSC is optional". The choices are Digitally Sign, Unsigned (system generated) or Upload Ink-Signed scan.
- **Bulk:** "Verify" and "Approve & Issue" may be taken in bulk for some services. The manual advises **at most 25 per bulk Verify and at most 5 per bulk Approve & Issue**.
- **Callback:** from Message Box → Sent Application, tick "View only the application available for callback". The warning reads "The last action performed by you will be cancelled…". The officer must enter a **mandatory reason** (optional attachment) and the file returns to the inbox as fresh.
- **Hindi:** automatic English→Devanagari name conversion on [Space] in forms.
- **Outcomes:** none published in the manual.
- **Source:** https://serviceonline.bihar.gov.in/resources/homePage/10/Document/Bihar_Officer_User_Manual.pdf (v1.0, 31-01-2019)
- **Lessons for Praman:**
  1. Officers already know "View Document before Submit", so our side-by-side view fits that habit.
  2. NIC itself caps bulk issue at 5. Our "decide one by one, sign as a batch" idea (Top 20 #9) is *more* conservative than NIC's own practice.
  3. **Callback-with-reason is an established undo pattern.** Copy it.
  4. "Pending with me" wording was **not found** in this manual [U].

### 1.2 Chhattisgarh Sewa Setu officer console (CHiPS)
- **Actions:** Approved / Rejected / **Sendback**. These are the three columns of the "Official User Ranking Report" [V: report page; definitions U] (05 §1.4).
- **Scale:** 2,241 officer logins. The top 10% handle 57% of volume. Median 480 cases. Busiest 71,366 [U: period].
- **Scoring:** `H = 0.5·C − (0.3·E + 0.2·G)` counts approve, reject and sendback equally as "processed" [V: printed on report].
- **QR verification** (Patrika, 28-07-2026) [V]:
  - covers income, caste, residence, marriage and ration card documents
  - a scan shows the certificate's actual data and confirms validity
  - built for recruiters, colleges and banks
  - portal stats quoted: 564 services, 44 lakh+ applications

  This QR/lookup is the backbone of Praman's "certificate authenticity strip".
  https://www.patrika.com/raipur-news/qr-codes-will-now-unlock-details-within-government-documents-curbing-the-use-of-fake-certificates-20784091
- **Public officer manual:** not found. The officer UI, DSC/e-Sign flow and "Sendback" semantics remain [U]. **Ask the CHiPS judge on stage**; it is a good, humble question.
- **CG Revenue Court case system:** exists at https://revenue.cg.nic.in/revcase/ [V: page exists; features not documented publicly]. RCCMS elsewhere lets Tehsildar, SDO and Collector enter proceedings, upload order sheets and pass documents between courts (DoLR RCCMS https://dolr.gov.in/en/rccms/) [V: general]. An appeal against a caste-certificate rejection lands here. That is why the reasoned rejection record matters.
- **Bhuiyan:** land-record workflows show stage labels such as "Pending at Patwari" (field verification and notice) [U]. The Bhuiyan chatbot and auto-diversion are live [V] (03 §3).
- **No CG Patwari field-verification app for certificates was found.** The Patwari prativedan (report) is uploaded as a document [U: CG district service pages]. **This is an open slot for Praman** (Top 20 #10).

### 1.3 Karnataka: Nadakacheri / AJSK + e-Kshana + Samyojane + Kutumba
- **Officer features:**
  - **e-Kshana** instant certificate "on request" when Aadhaar and records match (02 §3) [V]; the same-day Deputy Tahsildar approval details are [U].
  - Otherwise the file goes to the **Village Accountant (VA) / Revenue Inspector (RI) field check** on the **Samyojane** mobile app, introduced **08-05-2019**. It replaced paper verification reports [U: secondary guides].
  - **Kutumba** family registry: about 1.75 crore families and 5.5 crore individuals. The Kutumba ID "fetches caste, income, landholding… without submission of documents" [V about page; 30+ integrated systems U].
- **Outcomes:** 769 hobli centres; national e-Gov award 2019-20 [V, 02]. No officer-time figure found.
- **Sources:** https://kutumba.karnataka.gov.in/en/Index/AboutUs ; https://nadakacheri.karnataka.gov.in/ajsk ; [U] https://g.indiacustomercare.com/karnataka-income-certificate
- **Lesson:** the flow is *two tracks*, instant when data matches and a field app when it doesn't. Praman should show both tracks. "Records complete" goes to the officer. "Standard review" goes to a **pre-filled Patwari field form**, not a blank one.

### 1.4 Andhra Pradesh: GSWS (village and ward secretariats)
- **Category A (across the counter):**
  - An integrated certificate that was **previously issued** is re-issued with the current Tahsildar's DSC and the current date.
  - Issue is also allowed if the person is in the **Household Database authenticated** by a secretariat assistant or RO.
  - If the **father holds a caste certificate, biological children get it on declaration** [U: gsws.info reproducing a 2022 circular].
- **Category B SLA chain:** DA → VRO (3 days) → MRI (2 days) → Deputy Tahsildar (3 days) = **8 days** [U].
- **Quality rules** [U]:
  - "No rejection shall be on grounds of insufficient documents… only on merits."
  - **RDOs and Joint Collectors randomly review 25% of rejections.**
  - Weekly video-conference review goes document by document.
  - Previously cancelled certificates are tracked so they are not re-issued.
- **Policy:** G.O.Ms.469 (29-09-2023) makes caste certificates permanent and bars departments from asking for a fresh one [V, 02]. **28.62 lakh families** were certified after a review of 34.37 lakh (Mar 2025) [V, 02].
- **Source:** [U] https://www.gsws.info/2022/04/guidelines-for-issue-of-integrated.html
- **Lessons:** this is the **strongest Indian precedent for the lineage lane** (father's certificate leads to the child's). Also copy **"random 25% review of rejections"** as a supervisor sample on the dashboard, and **"no rejection for missing documents; send back instead"** as the default in the action panel.

### 1.5 Telangana MeeSeva back office [U]
- In the **Tahsildar login**, a checkbox says "not the competent authority", which routes the request to the **RDO**.
- Another option transfers the file to another mandal when jurisdiction is wrong.
- SLA is 7–30 days.
- **Source:** [U] https://www.telanganainfo.in/meeseva-ts-guide/ (secondary)
- **Lesson:** this matches the CG **Sonkar ruling** (permanent caste certificates go to the SDO, not the Tehsildar). Add a **competence/jurisdiction guard** to Praman: the queue shows only cases the role may decide, with a one-click "route to SDO" and a note explaining why.

### 1.6 Haryana: Antyodaya SARAL + PPP/FIDR
- **Officer features:**
  - The SARAL dashboard gives pendency and RTS compliance by department and district. Districts are ranked by **SARAL score**, e.g., Rewari 9.5 [U: Tribune snippet].
  - Bottleneck reports show which level holds the delay, with weekly SMS [U].
  - The **Auto Appeal System (AAS)**: when an application crosses its notified timeline, an appeal is **raised automatically** and assigned to the First Grievance Redressal Authority. If there is no decision within 30 working days it escalates to the Second Authority, and then to the RTS Commission [V: official manual title and snippet; the PDF fetch failed on TLS].
  - Income certificates issue over the counter from verified FIDR data (since Sep 2022) [V, 02].
- **Outcomes:** Haryana topped the Citizen-Centric Governance ranking in 2021 (Samagra case study; its other metrics did not render) [U].
- **Failure side:** PPP data errors needed 500 correction camps [V, 02].
- **Sources:** https://haryana-rtsc.gov.in/storage/app/guidelines/aas_manual.pdf ; https://samagragovernance.in/amritseries/antyodaya-saral/
- **Lesson:** use **stage-level bottleneck views** (Patwari vs officer vs applicant) at tehsil level. **Do not** copy the officer score. An *auto-escalation* for send-back loops (a file bounced 2 or more times) is the humane CG equivalent.

### 1.7 Madhya Pradesh: Lok Sewa + Samagra
- **Officer features:**
  - A Samagra family ID is mandatory. The portal **auto-fetches family and address** from Samagra [U].
  - The status flow is "Pending at Patwari" → "Pending at Tehsildar" [U].
  - The **Samagra Praman** portal publishes an **SDO-wise verification status of caste certificates** [V: page exists, 02].
- **Lesson:** CG has no Samagra. Praman's archive lookup is the substitute. A **stage label per file** ("waiting for Patwari since 9 days") in the queue is cheap and useful.

### 1.8 Uttar Pradesh: e-District (Lekhpal field verification)
- **Flow:** the application is assigned to the **Lekhpal** (rural) or Revenue Inspector (urban). The Lekhpal visits and checks income, caste or address, and submits an online report. The Tehsildar reviews and applies the DSC [U: guide sites].
- **Common rejection causes** listed by guides: blurry scans, Aadhaar name mismatch, missing self-declaration, wrong rural/urban choice, "Lekhpal couldn't verify at address" [U].
- **An official "Lekhpal verification app" was not found.** The "eLekhpal" Play-store apps are third-party or association wrappers [U].
- **Best Indian field-app analogue:** MEA's **mPassport Police App** (Feb 2023) cut police verification **from 15 to 5 days** [V, 02].
- **Sources:** [U] https://g.indiacustomercare.com/uttar-pradesh-income-certificate ; https://play.google.com/store/apps/details?id=in.rxcod9.android.elekhpal
- **Lesson:** the field report is the slow step (the SDO critique says the vanshavali takes about two weeks of the 22-day SLA). A **mobile, pre-filled Patwari form** is where time really moves.

### 1.9 Rajasthan: e-Mitra + Jan Aadhaar [V]
- "Caste certificates are **automatically updated in Jan Aadhaar** after the certificate is issued through e-Mitra." The same applies to domicile. Issuing is done by the SDM or Tehsildar.
- **Source:** https://janaadhaar.rajasthan.gov.in/content/raj/janaadhaar/en/faqs1.html
- **Lesson:** this is **write-back**. Each issued certificate enriches the family record, the "compounding asset" in our plan. Show "this certificate will be available as family evidence for future applicants" on the sign screen.

### 1.10 Punjab: e-Sewa / Sewa Kendra (05-12-2024) [V: secondary news]
- **Patwaris send applications online** to Sarpanchs, Nambardars or municipal councillors, who **verify through the portal or a WhatsApp chatbot**.
- It covers residence, **caste (SC/BC/OBC)**, income, EWS, old-age pension and Dogra certificates.
- **8.65 lakh applications** were processed online by Patwaris in the six months before the launch.
- **Sources:** https://brightpunjabexpress.com/digital-revolution-in-punjab-sarpanchs-nambardars-mcs-empowered-to-verify-applications-online/ ; https://www.tribuneindia.com/news/ludhiana/e-sewa-councillors-to-verify-citizen-service-applications-online
- **Lesson:** local attestation (Sarpanch or Gram Sabha) can be **captured digitally and time-stamped**, rather than arriving as a scanned letter. In Praman's evidence card, show it as **"oral / local attestation"**, labelled apart from records (critique 1 §3).

### 1.11 Kerala: e-District (village officer) + K-SMART
- **e-District:**
  - Village-officer certificates (23 types) are digitally signed.
  - **Open search and QR verification** by application number [V: https://edistrict.kerala.gov.in/qrVerify.do].
- **K-SMART** (LSGD, IKM):
  - 35 modules, public file tracking [V].
  - Low-risk building permit generated on payment [U].
  - Video-KYC marriage registration [V: Tribune headline].
  - **7.25 lakh files cleared outside office hours and 1.5 lakh on holidays** [U: search snippet of a Deshabhimani article; the page returned 403].
  - The **"auto-approval in 9 seconds" claim was not found**. Do not quote it.
- **Sources:** https://ksmart.lsgkerala.gov.in/ui/web-portal ; https://ikm.gov.in/index.php/en/article/ksmart-launch/1103
- **Lesson:** "work from anywhere, including mobile" is what raises throughput for officers. Praman should be **mobile-legible** (the SDO reviews on a phone at camps or at home). The demo should show one case at 375 px width.

### 1.12 Maharashtra: Aaple Sarkar RTS
- There is an RTS dashboard (https://rtsdashboard.mahaonline.gov.in/, login) [V: exists]. It has a first and second appeal chain.
- A **₹500–5,000 penalty** falls on a DO for unjustified delay [U: secondary].
- **Lesson:** officers fear delay penalties as much as wrong decisions. The **SLA timer** on each case is expected, not optional.

### 1.13 NIC e-Office (eFile): the noting and drafting idiom officers already know [V]
- **Green Note:** the official noting. It **cannot be modified once the file moves**, and it can be digitally signed.
- **Yellow Note:** a draft note that is **editable after the file moves** but cannot be signed. It converts to green; green never converts back.
- **DFA (Draft for Approval):** versioned (v1.0, v1.1…), editable until approval, **locked after approval**, and signable by DSC. A green icon in the inbox marks a receipt with a DFA.
- Other features: **due date** per file, **park file**, and a **hierarchical view of subordinates' inboxes**.
- **Source:** CSIR e-Office FAQ https://www.csir.res.in/sites/default/files/2023-08/FAQ_0.pdf ; eFile manual https://dcmsme.gov.in/eofficeManual.pdf
- **Lesson:** label Praman's draft order as a **"प्रारूप (DFA) v1"** with version history. The **officer's own finding is a "green note"**, locked on signing. The machine draft stays a "yellow note" until the officer edits and signs. This vocabulary makes the "AI drafts, officer decides" split instantly legible to any Indian officer or judge.

### 1.14 Customs RMS / Turant faceless assessment [V, 02]
- Since 15-07-2021, **90% of consignments are facilitated** by RMS.
- Assessments are **anonymised and allocated across stations** by Faceless Assessment Groups (FAGs).
- **Lesson:** the "facilitated lane plus a random-sample audit" design, where the officer sees the *reasons* a consignment was selected, is the model for our lanes plus the r.15(2) audit sample.
- **Source:** https://www.zeebiz.com/india/news-faceless-assessment-at-customs-stations-cbic-says-90-per-cent-of-non-risky-import-consignments-to-be-cleared-within-hours-without-any-physical-interface-160407

---

## 2. Global caseworker tools

| Product | Officer-facing features | Measurable outcomes | Lesson for Praman | Source |
|---|---|---|---|---|
| **Code for America + Minnesota: ex parte Medicaid renewals** | Caseworkers check data sources (SSA, IRS) **before** asking the client for paperwork. Semi-automated case selection plus automated notices. | **70 → 11 minutes per case**; $4.6M a year saved; about $636M in benefits kept (2022–23) [V] | The closest analogue to "records complete": the time saving comes from pre-assembled evidence, not from AI verdicts | https://statescoop.com/code-for-america-minnesota-speed-up-medicaid-renewals/ |
| **Code for America × Anthropic: SNAP Policy Navigator** (May 2026) | Claude-based. The caseworker asks a policy question and gets a plain-language answer **with cited sources and suggested next steps**, grounded via MCP in federal, state and county guidance. Planned: **eligibility document review** and **plain-language client letters**. | No metrics yet [V] | A "rule drawer": r.3(3), r.7/8, the HC rulings, each quoted with a pinpoint citation. The planned doc review and letters match our evidence panel and Hindi send-back. | https://statescoop.com/code-for-america-anthropic-ai-snap-caseworkers/ ; https://codeforamerica.org/news/anthropic-partnership/ |
| **Nava Labs: caseworker chatbot evaluation** | RAG over vetted sources, direct citations, says "I don't know" rather than guessing, multilingual | **+40% caseworker accuracy** (largest on hard questions); **65% of people with access used it**; 14 prompts per user; **usage declined over time**; NPS 11. "Super users" appeared where there was training and peer support. [V] | Adoption needs training and champions. Demo claims must not assume use. Plan a "champion SDO" in the pilot. | https://www.navapbc.com/case-studies/evaluating-ai-assistive-chatbot-caseworkers |
| **Nava + Amplifi: form-filling assistant** (Riverside County, 2026) | Upfront **gap analysis** of missing info; **AI-filled fields are flagged and their data source explained**; technical detail sits in an **accordion, hidden by default**; the caseworker reviews and submits | About a dozen staff; reported time reduction, not quantified [V] | Mark every machine-filled field in the draft order with a source chip ("from certificate No. …"). Keep the waterfall behind an accordion for clean files. | https://www.route-fifty.com/artificial-intelligence/2026/03/open-source-ai-assistant-shows-promise-california-caseworkers-service-delivery/412378/ |
| **UK DWP: Whitemail Vulnerability Scanner** | An LLM reads about **25,000 letters a day** and produces an **actionable shortlist** with document IDs; caseworkers decide; personal data is redacted before analysis | Vulnerable people identified in about a day rather than weeks [V]. Criticised because claimants are not told, and "prioritising some deprioritises others". | Priority sorting is acceptable if it is explained, and the no-match lane must never be deprioritised. Publish an **algorithmic transparency record**; the UK ATRS is a model. | https://www.gov.uk/algorithmic-transparency-records/whitemail-insights-and-vulnerability-scanner ; https://www.publictechnology.net/2025/12/08/society-and-welfare/dwp-taps-ai-to-scan-25000-letters-a-day-and-identify-vulnerable-citizens/ |
| **Estonia: OTT counsellor decision support** (Unemployment Insurance Fund) | A random-forest model shows the probability of employment (e.g., "36%, very low"), the probability of returning to unemployment, and **"main factors affecting the assessment"** on the client profile. **Counsellor feedback is mandatory** (until day 65). "Nothing will be decided solely based on the model output." | Piloted in 5 offices Feb–Sep 2020, national from Oct 2020. After 6 months: "knowledge is patchy… **the user manual alone is not enough**", so seminars followed. [V] ">98% accuracy" is a vendor claim [U]. | A **one-tap "was this match right?"** gives labels, not ranking. Plan training, not just a manual. | https://www.oecd.org/content/dam/oecd/en/events/2021/10/new-digital-tools-for-pes-counsellors/pes-digital-oct2021-estonia.pdf ; [U] https://nortal.com/insights/estonian-unemployment-insurance-fund-prevents-unemployment-with-artificial-intelligence |
| **Singapore GovTech: Pair** | An LLM assistant for officers on government laptops, with data kept in the government boundary; add-ons such as Pair Noms (meeting minutes) | **11,000+ users across 100+ agencies within 2 months; 4,500+ weekly active users** [V] | "Inside the government boundary" is itself an adoption feature. Say "runs in the SDC, nothing leaves" on the officer screen footer. | https://www.tech.gov.sg/products-and-services/for-government-agencies/productivity-and-marketing/pair/ |
| **US VA: Caseflow Reader** (USDS) | An evidence-review tool for Board of Veterans' Appeals judges and attorneys across thousands of pages. Document categories, annotation and keyboard navigation are [U: from memory, not re-verified]. | Rolled out to every BVA attorney and judge by Nov 2017. "Review and annotation… constitutes a **majority of the time** spent issuing an appeals decision." Caseflow overall: **40% fewer claims with mismatched documents**. [V] | Evidence review is the time sink. A **document viewer with tags** ("father's cert", "affidavit", "Patwari report") and jump keys pays off. | https://www.usds.gov/report-to-congress/2017/fall/veterans-disability-claims/ |
| **Allegheny Family Screening Tool** (De-Arteaga et al., CHI 2020) | Screeners saw a risk score while screening calls | When a bug **mis-estimated scores**, screeners were **less likely to follow them**. Humans with independent information can catch machine errors. [V] | Keep the raw evidence visible next to the score, so officers can catch a bad match. | https://arxiv.org/pdf/2002.08035 |
| **HMRC / GOV.UK caseworking patterns** | HMRC has a "caseworker guidance banner" pattern (24-03-2026). The GDS service manual says admin users "repeat and switch between tasks quickly", so one-thing-per-page may not fit. | n/a [V] | Dense, multi-panel case screens are correct for officers. Put a guidance banner above the action ("A missing document is a reason to send back, not to reject"). | https://design.tax.service.gov.uk/hmrc-design-patterns/caseworker-guidance-banner/ ; https://chrisarmstrong.io/Designing-Internal-Services/ |

---

## 3. What the UX and automation-bias research says

| Finding | Evidence | Design rule for Praman |
|---|---|---|
| **Cognitive forcing reduces over-reliance, but users dislike it** | Buçinca, Malaya and Gajos (CSCW 2021, N=199) tested three designs: **on demand** (AI shown only when clicked), **update** (decide first, then see the AI and revise) and **wait** (AI delayed). All cut over-reliance vs plain explainable AI. The most effective got the **worst subjective ratings**, and the benefit was larger for people high in "need for cognition". [V] https://arxiv.org/abs/2102.09692 | Use a *light* forcing function. Evidence is shown first, and the suggested action unlocks once the officer has viewed the evidence panel (a scroll or expand). **Don't** make every officer pre-decide; they will hate it. |
| **Time pressure makes automation bias more severe** | 28 pathologists: 7% of initially correct calls were overturned by wrong AI advice. Time pressure did not change how often this happened but made it worse when it did. AI still improved overall accuracy. [V] https://arxiv.org/abs/2411.00998 | During campaign surges (Sushasan Tihar), the risk rises. Keep the "possible match" state visually distinct from "exact", and never let a *possible* match pre-select Approve. |
| **Advice position and "information vs recommendation" matter** | Goddard, Roudsari and Wyatt, JAMIA 2012 systematic review: mitigators include where advice sits on screen, **giving information rather than a recommendation**, training, and emphasising user accountability. [V: abstract via index] https://academic.oup.com/jamia/article-abstract/19/1/121/732254 | Present facts ("Certificate No. X: permanent, active, SDO-issued 2019, father's name agrees"), not "APPROVE". The suggested action goes in the action panel, below the facts. |
| **Explanations alone can increase over-reliance** | Vered et al. (2023): explaining the recommendation did not reduce automation bias, and sometimes increased it [U: snippet] | The waterfall is for *verifying* a match, not persuading. Show the **disagreeing** fields first ("birth-year gap −1.2") and in plain words. |
| **People catch errors when they can see raw inputs** | Allegheny (above) [V] | Put both certificate images or data side by side, not only the score. |
| **Adoption decays without champions and training** | Nava: usage declined, super users emerged with training. Estonia: "manual alone is not enough". [V] | The demo narrative needs a champion-SDO pilot and a 1-hour training, not just a PDF. |
| **Officers work fast and repeat actions** | GDS: admin users switch tasks quickly [V]. NIC caps bulk issue at 5 [V]. Sewa Setu busiest login: about 190 a day [U]. | Keyboard shortcuts, "save & next", decide-one-by-one-then-batch-sign, and a queue that remembers position. |

---

## 4. TOP 20 officer-facing features, ranked

**How the score works:** **T** is officer time saved, **Q** is decision quality (including legal defensibility and not excluding genuine applicants), and **F** is feasibility in about one day of demo work. Each runs from 1 to 5. **Score = T × Q × F**, out of 125.

**Screens:** **Q** = Queue (`pages/Queue.tsx`), **C** = Case view (`pages/CaseView.tsx`, `components/LineageCard.tsx`, `components/Waterfall.tsx`), **A** = Action panel (`components/ActionPanel.tsx`), **D** = Dashboard (`pages/Collector.tsx`, `pages/Audit.tsx`), **F** = field / Patwari (new mock), **S** = shell (`components/Layout.tsx`, `i18n.tsx`).

**Status:** "Have" means the current app already does part of it (checked on 27-09-2026), so the work is an extension.

| # | Feature / pattern | Precedent | T | Q | F | Score | Screen | Concrete change for Praman Sahayak |
|---|---|---|---|---|---|---|---|---|
| 1 | **Field-by-field side-by-side comparison** (application ↔ relative's certificate) | VA Caseflow Reader; ServicePlus "View Document"; Nava field flags | 5 | 5 | 4 | **100** | C | In `LineageCard`, add a 2-column table with rows for holder, father's name, surname/clan, village (LGD), tehsil/district, caste (**notified-list serial + name**), birth year. Each row gets ✔ agrees / ≈ variant ("Sukhram ↔ Sukharam") / ✖ differs. Sort differing rows **to the top**. The officer reads 7 rows, not a score. |
| 2 | **Certificate authenticity and validity strip** | CG Sewa Setu QR (Jul 2026); Kerala QR verify; AP cancelled-certificate tracking | 4 | 5 | 5 | **100** | C | One line above each match: `No. CG/KDG/SDO/2019/004512 · QR ✔ · Permanent · Active (not cancelled) · Issued by SDO (Revenue) Kondagaon · 14-03-2019`. Any failure turns that chip into text such as "Temporary: not lineage proof" or "Tehsildar-issued permanent (pre-Sonkar): department policy pending". **Have:** validity checks exist; the change is to put them in one strip and **name the issuing designation**. |
| 3 | **Deficiency tick-list → Hindi send-back note, with a saved-reason library** | AP "no rejection for insufficient documents"; Michigan specific-document texts [U]; SDO critique §2d | 5 | 4 | 5 | **100** | A | **Have:** deficiency checkboxes and WhatsApp preview. **Add:** a library of about 12 standard Hindi reasons (e.g., "1950 से पूर्व का राजस्व अभिलेख / पटवारी प्रमाणित वंशावली") with a **"what exactly to bring"** line each. Show the **count of times already sent back** ("2nd send-back") and make "cure without new fee" explicit. |
| 4 | **Friction asymmetry: zero extra clicks on clean files; mandatory own-finding only on reject or override** | SDO critique §6.1; Goddard (accountability); e-Office green note | 4 | 5 | 5 | **100** | A | **Have:** findings are required on reject. **Change:** remove the per-sign acknowledgement checkbox for *records complete + approve*; approval is a single "Sign" action. **Add** a mandatory finding when approving while a conflict flag is open. Label the finding box **"Green note (your finding, locked on signing)"**. |
| 5 | **Queue sorted by evidence completeness, with reason chips instead of colours** | Customs RMS facilitation; DWP shortlist; SDO critique §2f | 5 | 3 | 5 | **75** | Q | **Have:** lane filter and SLA pill. **Change:** default sort is exact verified match → possible → no records → attention, then SLA. Each row shows a text chip: "Sister's cert found (exact, No. …)", "No archive record: standard review", "Category differs in sibling cert". Lane chips use **neutral colours**, and grey ≠ bad. |
| 6 | **"Absence ≠ ineligibility" empty state with the Rule 8 path** | SDO critique §3 (landless tribals); AP merits-only rejection | 3 | 5 | 5 | **75** | C | **Have:** a "No family certificate found" card. **Add:** "This does not count against the applicant. Proceed under Rule 8: Gram Sabha resolution / Patwari enquiry", plus one-click **"Request field enquiry"** (routes to #11) and "Search again by father's name / maiden village" (#8). |
| 7 | **Reasoned-order draft as a versioned DFA; machine text = "yellow", officer text = "green"** | NIC e-Office DFA/green/yellow notes; SC and Gujarat HC on AI citations (02) | 4 | 4 | 4 | **64** | A | The draft order header reads "प्रारूप (DFA) v1: system draft". Every machine-filled sentence carries a source chip (cert no., rule). There is **no case law**. Officer edits create v2, v3. Signing locks it. Show "diff vs system draft" in the audit log. This answers "mechanical order" writs (SDO critique §4). |
| 8 | **Married-women maiden search path** | SDO critique §3 (none of the benchmarks do this; a real gap) | 3 | 5 | 4 | **60** | C | A toggle: **"Search by father's name + maiden village/district"**, pre-shown when gender = F and the marital declaration is "married". Results say which key matched ("matched via father: Sukhram Netam, village Bade Donger"). |
| 9 | **Decide one by one, sign as a batch** (one DSC / e-Sign OTP for N already-decided cases) | ServicePlus bulk Approve & Issue capped at 5 [V]; SDO "I will not bulk approve" | 5 | 3 | 4 | **60** | Q/A | "Save decision & next" puts each *individually opened and decided* case into a **Sign tray** (max 5, matching NIC practice). One e-Sign covers the tray. Cases never opened cannot enter the tray. This removes the per-case OTP wait without bulk *decisions*. |
| 10 | **Patwari field form, pre-filled and mobile** (vanshavali pre-filled from found certificates; oral vs record labels) | Karnataka Samyojane [U]; mPassport Police App 15→5 days [V]; Punjab WhatsApp verification [V] | 5 | 4 | 3 | **60** | F | A 375-px mock screen: "वंशावली सत्यापन". Found certificates are pre-listed as **"record"** and the Patwari confirms or corrects. New names are tagged **"oral: kotwar/Sarpanch statement"**. Add a geotag and photo placeholder, and submit to SDO. In the case view the report shows record and oral rows in different styles. |
| 11 | **Conflict flag with a real acknowledgement, only when there is a conflict** | Goddard; AP cancelled-cert tracking; SDO critique §2c | 2 | 5 | 5 | **50** | C/A | For *needs attention* only: show both records side by side, **category serial numbers only** (no community name in the headline), and a one-line "why". To proceed with approve, the officer must type a finding. Refer is one click, with a suggested destination (field enquiry / scrutiny committee). |
| 12 | **Waterfall reframed: disagreements first, plus a "what to check" line** | Vered 2023 [U]; Nava accordion [V]; Estonia "main factors" [V] | 3 | 4 | 4 | **48** | C | **Have:** `Waterfall.tsx`. **Change:** keep it collapsed by default for exact matches. For possible matches, order the bars so the **negative ones come first**, and add a plain sentence: "Check: father's name spelled Sukhu vs Sukhram; birth year 3 years apart". |
| 13 | **Duplicate-application detector** (same applicant, same service, open or decided) | SDO critique §4 (duplicates inflate rejections); ServicePlus "don't re-apply if valid certificate exists" [V] | 4 | 3 | 4 | **48** | Q/C | A queue chip "Possible duplicate of application No. … (decided 12-08)". In the case view: "Close as duplicate / already holds valid certificate No. …" with a pre-filled Hindi note. This should **not** count as a rejection in the MIS. |
| 14 | **Keyboard-first "next case" flow** | GDS admin-users guidance [V]; Caseflow Reader [U] | 4 | 2 | 5 | **40** | Q/C/A | `J/K` for next/previous case, `E` to expand evidence, `A`/`S`/`R` to choose approve / send back / refer (this only *selects*; signing is separate), `Ctrl+Enter` to save & next. Add a shortcut cheat-sheet (`?`) and keep the queue position. |
| 15 | **Evidence before recommendation (light cognitive forcing)** | Buçinca 2021 [V]; Goddard 2012 [V] | 2 | 5 | 4 | **40** | A | **Currently** `ActionPanel` shows `suggested_action_reason` at the top. **Change:** the panel starts as "Review the evidence →". The suggestion appears after the officer has expanded or scrolled the lineage card, or after 5 s for records-complete files. Show it as "Records suggest: …", not a button pre-selected to Approve. |
| 16 | **Callback / undo with reason** (before dispatch) | NIC ServicePlus Callback [V] | 2 | 4 | 5 | **40** | A | After signing, a 10-minute "वापस लें (callback)" link opens a mandatory reason box and returns the case to pending. It is recorded in the audit log. This lowers fear of a mis-click in a 2-minute workflow. |
| 17 | **Competence and jurisdiction guard** | Telangana Tahsildar→RDO checkbox [U]; CG Sonkar ruling (03) | 2 | 4 | 4 | **32** | Q/C | The Tehsildar role sees **no permanent-caste cases**. If one arrives, show a banner "Permanent caste: SDO is the competent authority (HC, Jul 2026)" and a **Route to SDO** button. Separately, matched certificates signed by a Tehsildar as *permanent* carry the chip from #2. |
| 18 | **SLA and stage timer** ("Day 14 of 30 · waiting for Patwari 9 days") | Haryana AAS [V]; Aaple Sarkar penalties [U]; MP stage labels [U] | 3 | 2 | 5 | **30** | Q/C | **Have:** days-left pill. **Add** a stage segment (Kendra → Patwari → officer → applicant) so the officer sees *where* the time went, and a "due in ≤3 days" filter. No officer ranking. |
| 19 | **Hindi-first bilingual UI with Devanagari name matching** | ServicePlus English→Hindi name conversion [V]; UX4G (NeGD) [V] | 2 | 3 | 5 | **30** | S | **Have:** EN/HI toggle, default hi. **Add:** show names in *both* scripts in the comparison table (matching happens across scripts); use UX4G tokens; follow the officer's toggle in the draft order and send-back language. |
| 20 | **Embedded, fail-open, low-bandwidth shell** | SDO critique §6.1; Pair "inside government boundary" [V] | 2 | 3 | 5 | **30** | S/C | Show the panel as a **collapsible "परिवार प्रमाण / Evidence" pane inside a Sewa Setu-styled page** (no separate login). A kill-switch demo shows "Lookup unavailable: proceed as usual" while Approve, Send back and Reject stay live. The footer reads "Runs in SDC · no data leaves". Use text-first cards and lazy-load images. |

**Next in line (score below 30 but worth a slide line):**
- **21. Supervisor random sample, 24 points** (Q 5, F 4, T 1; D).
  - Precedent: AP RDO/JC review 25% of rejections; the r.15(2) audit sample.
  - Change: the dashboard shows a *sample list* of random rejections plus random records-complete approvals for SDO or Collector review. It is **not a score**.
- **22. One-tap match feedback, 20 points** (C/D).
  - Precedent: Estonia's mandatory counsellor feedback.
  - Change: "Match correct? ✔ / wrong family / unsure" feeds the evaluation panel as labels. It is never shown per officer.
- **23. Send-back loop and cure-rate tiles, tehsil-level, 24 points** (D).
  - Precedent: Haryana bottleneck report.
  - Change: tiles for send-back ≥2 loops, cure rate and appeal reversals, next to the existing speed metric.
- **24. Policy drawer with pinpoint citations, 18 points** (C).
  - Precedent: the SNAP Policy Navigator.
  - Change: r.3(3), r.7, r.8 and the HC paragraphs as static cited text. There is **no generative legal answer** on stage.

---

## 5. The officer screens after the changes (spec for the demo)

**Queue**
- Default sort is evidence completeness, then SLA.
- Each row shows: a text reason chip, the stage timer, and duplicate/competence chips where they apply.
- The Sign tray (max 5) sits at the right, and there is a `?` shortcut sheet.
- There are no red rows and no scores in the list.

**Case view: left to right**
1. The application with its documents tagged (affidavit, Patwari report, uploaded certificate).
2. The field-by-field comparison with the relative's certificate. The **validity strip** sits on top and differing rows come first. The waterfall is collapsed for exact matches.
3. The action panel: "Review evidence →". Then comes the suggestion, and then the action choice.
   - Send back: tick-list, Hindi note, loop count.
   - Reject: green-note finding (required) and DFA v1.
   - Refer: destination.
   - Then Save & next, or Sign.

**Empty or no-match state:** the "does not count against" message, the Rule 8 path, the maiden-village search and the "request Patwari enquiry" action (opens the pre-filled field form).

**Dashboard (Collector/CHiPS)**
- Keep: tehsil and district level only, stage-wise pendency.
- Add: send-back loops and cure rate, appeal reversals, the random review sample, the evaluation panel with match-feedback labels, and the exclusion guard.
- **No officer names.**

---

## 6. Anti-patterns seen in the benchmarks: do not copy

| Pattern | Where it exists | Why not for Praman |
|---|---|---|
| Officer-wise score or leaderboard | Haryana SARAL score, CG ranking report | The SDO and officer associations would resist it. It rewards speed, not correctness. 03 §7.2 already says no. |
| Bulk *decisions* | ServicePlus bulk Approve & Issue (≤5) | Caste certificates are litigated and a fake-certificate history exists. Batch only the *signature* of individually decided files (#9). |
| Unsigned or system-generated certificates | ServicePlus "Unsigned Document" option | Undermines QR trust. Always e-Sign. |
| Silent AI triage the citizen never learns about | DWP Whitemail (DPIA: claimants "do not need to know") | CG DPDP obligations. Show the applicant which records were used (plan §2.3). |
| Verdict colours (green = approve) | Common in risk dashboards | SDO critique §6.2 and automation-bias research both point to evidence text instead. |
| Recommendation shown before evidence | Current `ActionPanel` ordering | Buçinca and Goddard. Fix in #15. |

---

## 7. One-day build order (P2, about 8–10 focused hours)
1. **#1 and #2:** comparison table and validity strip (2.5 h). This is the demo's hero moment.
2. **#4, #15 and #7:** remove the clean-file acknowledgement, add evidence-first gating and the green/yellow DFA labels (1.5 h).
3. **#5 and #13:** queue sort, reason chips and duplicate chip (1 h).
4. **#3:** Hindi reason library and loop count (1 h).
5. **#6 and #8:** no-match empty state and maiden-village toggle (1 h).
6. **#9, #14 and #16:** Sign tray, shortcuts and callback (1.5 h).
7. **#10:** Patwari mobile mock, a static page with fixtures (1 h).
8. **#20:** fail-open toggle for the demo (0.5 h).

Items 17–19 and 21–24 are optional polish.

---

## 8. Sources
Only URLs actually used above are listed. Tags are as given inline.
- NIC ServicePlus Bihar officer manual: https://serviceonline.bihar.gov.in/resources/homePage/10/Document/Bihar_Officer_User_Manual.pdf [V]
- CG Sewa Setu QR verification (Patrika, 28-07-2026): https://www.patrika.com/raipur-news/qr-codes-will-now-unlock-details-within-government-documents-curbing-the-use-of-fake-certificates-20784091 [V]
- CG revenue case portal: https://revenue.cg.nic.in/revcase/ [V: exists]; DoLR RCCMS: https://dolr.gov.in/en/rccms/
- Karnataka Kutumba: https://kutumba.karnataka.gov.in/en/Index/AboutUs [V]; AJSK: https://nadakacheri.karnataka.gov.in/ajsk ; Samyojane and e-Kshana details: [U] https://g.indiacustomercare.com/karnataka-income-certificate
- AP GSWS guidelines (secondary): [U] https://www.gsws.info/2022/04/guidelines-for-issue-of-integrated.html
- Telangana MeeSeva (secondary): [U] https://www.telanganainfo.in/meeseva-ts-guide/
- Haryana AAS manual: https://haryana-rtsc.gov.in/storage/app/guidelines/aas_manual.pdf [V: snippet]; Samagra case study: https://samagragovernance.in/amritseries/antyodaya-saral/
- Rajasthan Jan Aadhaar FAQ: https://janaadhaar.rajasthan.gov.in/content/raj/janaadhaar/en/faqs1.html [V]
- Punjab e-Sewa verification: https://brightpunjabexpress.com/digital-revolution-in-punjab-sarpanchs-nambardars-mcs-empowered-to-verify-applications-online/ ; https://www.tribuneindia.com/news/ludhiana/e-sewa-councillors-to-verify-citizen-service-applications-online
- Kerala e-District QR verify: https://edistrict.kerala.gov.in/qrVerify.do ; K-SMART: https://ksmart.lsgkerala.gov.in/ui/web-portal ; https://ikm.gov.in/index.php/en/article/ksmart-launch/1103
- Maharashtra RTS dashboard: https://rtsdashboard.mahaonline.gov.in/
- NIC e-Office FAQ (CSIR): https://www.csir.res.in/sites/default/files/2023-08/FAQ_0.pdf [V]
- Customs faceless assessment: https://www.zeebiz.com/india/news-faceless-assessment-at-customs-stations-cbic-says-90-per-cent-of-non-risky-import-consignments-to-be-cleared-within-hours-without-any-physical-interface-160407
- UP e-District (secondary): [U] https://g.indiacustomercare.com/uttar-pradesh-income-certificate
- Minnesota ex parte: https://statescoop.com/code-for-america-minnesota-speed-up-medicaid-renewals/ [V]
- CfA × Anthropic: https://statescoop.com/code-for-america-anthropic-ai-snap-caseworkers/ ; https://codeforamerica.org/news/anthropic-partnership/ [V]
- Nava evaluation: https://www.navapbc.com/case-studies/evaluating-ai-assistive-chatbot-caseworkers [V]; Riverside pilot: https://www.route-fifty.com/artificial-intelligence/2026/03/open-source-ai-assistant-shows-promise-california-caseworkers-service-delivery/412378/ [V]
- DWP Whitemail: https://www.gov.uk/algorithmic-transparency-records/whitemail-insights-and-vulnerability-scanner ; https://www.publictechnology.net/2025/12/08/society-and-welfare/dwp-taps-ai-to-scan-25000-letters-a-day-and-identify-vulnerable-citizens/ [V]
- Estonia OTT: https://www.oecd.org/content/dam/oecd/en/events/2021/10/new-digital-tools-for-pes-counsellors/pes-digital-oct2021-estonia.pdf [V]
- Singapore Pair: https://www.tech.gov.sg/products-and-services/for-government-agencies/productivity-and-marketing/pair/ [V]
- USDS Caseflow: https://www.usds.gov/report-to-congress/2017/fall/veterans-disability-claims/ [V]
- HMRC caseworker banner: https://design.tax.service.gov.uk/hmrc-design-patterns/caseworker-guidance-banner/ ; internal services and the GOV.UK Design System: https://chrisarmstrong.io/Designing-Internal-Services/
- UX4G: https://negd.gov.in/our_projects/ux4g/
- Buçinca et al. 2021: https://arxiv.org/abs/2102.09692 [V]; De-Arteaga et al. 2020: https://arxiv.org/pdf/2002.08035 [V]; Goddard et al. 2012: https://academic.oup.com/jamia/article-abstract/19/1/121/732254 [V: abstract index]; pathology time-pressure study: https://arxiv.org/abs/2411.00998 [V]; Vered et al. 2023: [U] https://psychologicalsciences.unimelb.edu.au/__data/assets/pdf_file/0019/5252131/2023Vered.pdf
