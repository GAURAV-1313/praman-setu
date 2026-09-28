# 07: The Sewa Setu officer console (what is public)

Research date: 27-09-2026. Scope: what the officer side of CG Sewa Setu (sewasetu.cgstate.gov.in, relaunched 29-04-2026) and its predecessor CG e-District (PACE / Workflow) actually looks like, and how certificates move through it. Only public pages were read. Nothing was logged into, and no forms were submitted.

**Tags.** [V] means seen directly: a page, a PDF, or a video frame that I viewed. [U] means unverified or inferred. Officer and user names seen in videos and reports are deliberately left out.

---

## 0. Headline findings

1. **The officer console is no longer "not public".** A YouTube walkthrough dated 6 Aug 2026 shows the live Sewa Setu **Government Login** end to end. It covers the dashboard, the pending list with traffic-light SLA dots, a tabbed application view, the decision panel, DSC-token signing and the confirmation screen.
   - The user is a Gram Panchayat Secretary approving a marriage registration.
   - It is the same `workflow/welcome.do` engine that revenue officers use [V URL; that the revenue officer screens match is U].
2. **The decision panel has three radio buttons**, labelled exactly: **अस्वीकृत** (Reject), **आवेदक को वापस भेजें** (Send back to applicant) and **अनुमोदित** (Approve).
   - Under them is a **टिप्पणी** (remarks) box, capped at **200 characters**.
   - Beside them is a **दस्तावेज़ अपलोड** (document upload) panel: jpeg/jpg/png/pdf only, **max 256 KB**.
   - Below are **सबमिट / बंद** (Submit / Close) buttons.
3. **Signing uses a USB DSC token, not Aadhaar eSign** (in this video).
   - The flow is "Generated Certificate For Signing" preview, then a declaration, then **SIGN WITH TOKEN**, then Token Provider (e.g. *PROXKey*), Certificate, Passcode and **Sign PDF**.
   - CHiPS is separately procuring an eSign service provider (see 03_cg_policy_legal_admin.md).
4. **There are two SLAs per application.** The pending list shows both **अधिकारी की समय सीमा** (officer's deadline) and **आवेदन की समय सीमा** (application deadline). Each row gets a red, yellow or green dot.
5. **The public ranking report confirms the action set.**
   - It counts "Processed Within Due date (**Approved/Rejected/Sendback**)".
   - It scores every official as H = 0.5·C − (0.3·E + 0.2·G), which is a pure speed metric.
6. **The Patwari report is mostly a citizen upload in CG.** Income and OBC applications list "Certificate From Patwari/Sarpanch/Parshad" as a mandatory upload.
   - I found no public evidence of an online Patwari or RI verification step inside the CG console [U].
   - The national e-District pattern does include such a step: "Send for Physical Verification", followed by the verifier uploading a report.

---

## 1. Sources actually examined

| # | Source | What it gave | Tag |
|---|---|---|---|
| S1 | YouTube **EyVXJlzEHvk**, "ग्राम पंचायत सचिव ID कैसे USE करें? \| सेवा सेतु Portal छत्तीसगढ़ 2026 \| Login से Approval तक" (channel CG Online Guide 2.0 / by Amit; published 06-08-2026; 4:36; about 5.2k views). https://www.youtube.com/watch?v=EyVXJlzEHvk | Full officer flow on the live portal. Frames were captured from the video element at 6-second intervals and read at 1920×1080. | [V] |
| S2 | Official User Ranking Report ("Govt User Report"). https://admin-ed.cgstate.gov.in/RankingOfGovtUser.html, with drill-down `RankingOfGovtUserByUserId.html?userId=…` | Action set, SLA metric formula, per-service breakdown | [V] |
| S3 | Sewa Setu home page HTML. https://sewasetu.cgstate.gov.in/home?lang=en | Login tabs and fields; API hosts | [V] |
| S4 | Admin/Workflow login. https://admin-ed.cgstate.gov.in/LoginWindowWF.do?lang=en (legacy: `edistrict.cgstate.gov.in/Workflow/LoginWindowWF.do`) | Govt/admin login fields | [V] |
| S5 | Service pages `instractionPageNew.do?serviceId=4/5/6/7` (SC-ST / OBC / Income / Domicile) | Time limits, mandatory documents, user-manual PDFs | [V] |
| S6 | "Service SLA Details" PDF: https://sewasetu.cgstate.gov.in/resources/docFormat/citizenCharter.pdf | 2013 Revenue Dept notification: designated officer, competent authority, appellate authority | [V] |
| S7 | MIS page: https://sewasetu.cgstate.gov.in/MisDashboard.do?lang=en | Public widgets: Role-wise stats, "Top Five Approver Ranking", Official User Ranking Report | [V] |
| S8 | e-District MMP **Manipur** User Manual (Nelito Systems, for MSITS): https://eservicesmanipur.gov.in/eda/img/User_manual_e-Services_mnp.pdf | Standard national back-office workflow text | [V] |
| S9 | DeitY, *eDistrict MMP National Rollout Guidelines: Integrated Framework for Delivery of Services*: https://dit.py.gov.in/sites/default/files/Integrated-Framework-for-Services-Delivery-eDistrict-project.pdf | National prescriptions: workflow, PKI, SLA system, Type 1/2/3 services | [V] |
| S10 | ThePrint, 29-04-2026 launch report: https://theprint.in/india/chhattisgarh-cm-launches-upgraded-seva-setu-portal-to-expand-digital-access-to-govt-services/2917917/ | Launch feature list: dashboards/MIS, timeline indicators, automatic penalty calculation, auto-grievance | [V] |
| S11 | Citizen user manuals `resources/edistrict/user-manual/new/{4,5,6,7}.pdf` | Citizen-side only; fonts are garbled on text extraction and no officer content was found | [V] |
| S12 | CHiPS e-District 2.0 RFP Vol I (`chips.gov.in/sites/default/files/e-DistrictRFP_VolumeI_V1.1.pdf`) | **404**. The Wayback Machine was offline, so this could not be read | — |

Other videos were found but not frame-read (all [U] for content):
- ZAMLxwsB-GM: Secretary approving a marriage certificate, 18-05-2026.
- 7s_D4f_G_Bc: "How to Resolve Send Back and Rejected Applications…", 21-09-2026. This is citizen/operator-side and would show how officer remarks surface to the applicant.
- ra27eRM2Hbg and b4u_ftrapa0: Lok Seva Kendra (LSK) operator geo-location verification, which is a 2026 requirement for operators.
- zj_EztYnCLY and j1_XOCB3miM: how *applicants* fill the Patwari prativedan form.

No YouTube video of a **Tehsildar, SDM or Patwari** using the console was found.

---

## 2. What is VERIFIED about the officer console (from S1 frames; timestamps are video time)

### 2.1 Login (about 0:20)
- The home page login card has four tabs: **नागरिक लॉगिन** (Citizen) · **सेवा सेतु लॉगिन** (Kendra/operator) · **शासकीय लॉगिन** (Government) · **एडमिन लॉगिन** (Admin).
- Every tab offers **Username & Password** or **OTP**, a Hindi/English toggle and a numeric captcha [V S1, S3].
- The page HTML contains a stubbed `callParichay()` function (NIC Parichay SSO), so SSO for govt users may be planned [U].
- The home banner counters on 06-08-2026 read: 17,116 सेवा केंद्र · 703 सेवाएं · 37 विभाग · 46,69,896 कुल आवेदन [V S1].

### 2.2 Shell
- The URL is `sewasetu.cgstate.gov.in/workflow/welcome.do` [V].
- On the left is a blue sidebar with the सेवा सेतु logo. Its items are:
  - "e-District 1.0" (a link to the legacy system)
  - "Across the Counter Service"
  - **लॉगिन उपयोग रिपोर्ट** (login usage report)
  - **मेरी सेवाएँ** (my services)
  - **एलएसजी अधिनियम लंबित अधिसूचना** (Lok Sewa Guarantee Act pending notices)
  - **स्वतः शिकायत डैशबोर्ड** (auto-grievance dashboard)
  - **एलएसजी अधिनियम कारण बताओ अधिसूचना** (LSG Act **show-cause** notices, i.e. notices to the *officer* for delay)
  - **शिकायत अधिसूचना** (grievance notices) [V]
- The top bar holds the home icon, a **"Session TimeOut (In Minute) 05:00"** countdown, the logo, and the officer name with login ID [V].

### 2.3 Dashboard (about 0:42)
- A row of counter tiles, each with a coloured icon: **लंबित** (pending) · **अनुमोदित** (approved) · **अस्वीकृत आवेदन** (rejected) · **वापस** (sent back) · **अग्रेषित** (forwarded) · **खारिज** (dismissed/closed) · **समय सीमा के बाद (लंबित)** (pending past time limit) · **आगामी दो दिवस में समय सीमा में आने वाले आवेदन** (due within the next 2 days) · **विशेष मामले** (special cases) [V].
- Below the tiles is a service-wise table with the same columns per service. Every count is a link, e.g. "विवाह पंजीकरण एवं प्रमाण पत्र ग्राम पंचायत के लिए: लंबित 4, अनुमोदित 5" [V].
- The "अग्रेषित" and "खारिज" counters mean the engine supports **Forward** and a disposal state separate from Reject. Neither appeared as a choice in this user's decision panel. For revenue services with two officer levels, Forward is plausible [U].

### 2.4 Pending list (about 0:54)
- The title is the service name plus **लंबित आवेदन की सूची** (list of pending applications).
- The legend has three dots: 🔴 **नियत तिथि समाप्त** (due date passed), 🟡 **नियत तिथि के करीब** (near due date), 🟢 **नियत तिथि के भीतर** (within due date) [V].
- The table columns are:
  - **क्रमांक**
  - **स्थिति** (the dot)
  - **आवेदक संदर्भ क्रमांक**, a pill-shaped link holding the 16-digit application number
  - **संलग्नक**, a 📎 icon with the attachment count, e.g. "(8)", "(11)"
  - **आवेदक** (name)
  - **आवेदन तारीख**
  - **अधिकारी की समय सीमा**
  - **आवेदन की समय सीमा**
- The officer deadline falls about 4 days before the application deadline (e.g. 06-08 vs 13-08) [V].
- It is a DataTables grid: sortable, a Search box, "Showing 1 to 4 of 4 entries", Previous/Next [V].
- The list is not sorted by urgency by default. It appears to be in application-number order [V for this instance].

### 2.5 Application view (0:78 to 2:00)
- A dark blue header bar shows the application number.
- There are five pill tabs:
  1. **आवेदक का विवरण** (applicant details)
  2. **आवेदन पत्र** (application form)
  3. **सहायक दस्तावेज** (supporting documents)
  4. **निर्णय / जांच सूची** (decision / checklist)
  5. **पूर्व निर्णय** (previous decisions / history)
- A **green ✓ appears on each tab once visited**, which suggests the officer must open each tab before deciding [V for the ticks; that it is mandatory is U].
- *आवेदक का विवरण* has sectioned key-value blocks.
  - "आवेदक का डेटा": name, application date, phone, **Aadhaar card number**, address, guardian name.
  - "आवेदक का स्थान": district, zila/janpad panchayat, block, village/GP [V].
- *आवेदन पत्र* is a long scrolling rendering of the submitted form, with sectioned headers and a witnesses table [V].
- *सहायक दस्तावेज* is a thumbnail grid of the uploaded scans with captions and a hover tooltip naming the document type.
  - Clicking a thumbnail opens a **large image viewer/carousel** on the left.
  - Each thumbnail has a ⊕ zoom icon [V].
- At the bottom of the tabs is a checkbox line that reads approximately "मैंने ही नई जानकारी को देख लिया है" ("I have seen the new information") [text only partly legible, U].

### 2.6 Decision panel (tab 4, about 2:12 to 2:30)
- Left card **निर्णय**: radios **अस्वीकृत / आवेदक को वापस भेजें / अनुमोदित**. Below them, **टिप्पणी**: "नई टिप्पणी जोड़ें", with the counter text "…अधिकतम 200 अक्षर" (maximum 200 characters) [V].
- Right card **दस्तावेज़ अपलोड**: a table with **Attachment Name | Browse File | + नया जोड़ें** (add new). The rules read:
  1. Only **.jpeg/.jpg/.png/.pdf** supporting documents.
  2. File size **not more than 256 KB** [V].
- Buttons: a green ✔ submit button and a red ✖ **बंद** (close) button [V].
- I saw **no "Forward to…" option and no "Send for verification" option** in this user's panel. There was also **no checklist content**, despite the tab name "जांच सूची" [V for this service/role; for revenue roles, U].

### 2.7 Certificate generation and signing (3:12 to 4:00)
- The modal **"Generated Certificate For Signing"** previews the certificate, which carries an emblem, the applicants' photo and the office name.
- It includes a **"Regenerate"** link [V].
- It also includes an officer declaration:
  > "मैं घोषणा करता हूँ कि उपरोक्त प्रमाण पत्र आवेदक द्वारा दी गयी जानकारी के अनुसार है…"
  >
  > (I declare that the above certificate is as per the information given by the applicant.) [V]
- The **SIGN WITH TOKEN** button opens a sub-modal with **Token Provider\*** (a dropdown; the example shows a WatchData *PROXKey* token), **Certificate\*** (the officer's DSC), **Passcode\*** and **Sign PDF** [V]. This is a class-3 USB DSC signed in the browser through a local signer utility [inferred].

### 2.8 Confirmation (about 4:12)
- The modal **निर्णय की पुष्टि** shows "आवेदन अनुमोदित" with a check icon [V].
- The pending list then drops from 4 to 3 entries, and the dashboard counters update [V].

---

## 3. Other verified facts about the officer side

### 3.1 Ranking report (S2) [V]
The report is public and needs no login. Its columns are:

| Col | Meaning | Formula |
|---|---|---|
| — | District, User Name (a link to drill-down) | — |
| A | Total Application | — |
| B | Processed Within Due date (Approved/Rejected/Sendback) | — |
| C | Marks | B×100/A |
| D | Pending Beyond Due Date | — |
| E | Marks | D×100/A |
| F | Approved Beyond Due Date | — |
| G | Marks | F×100/A |
| H | Total Marks | C×0.5 − (0.3E + 0.2G) |
| I | Ranking | — |

- The drill-down is per service; the example seen was "अनुसूचित जाति / अनुसूचित जनजाति प्रमाण पत्र" and "अन्य पिछड़ा वर्ग प्रमाण पत्र". There, column B is labelled "Approved Within Due date".
- Aggregates across all 2,114 parseable rows on 27-09-2026:
  - A = 8.39 M
  - B = 0.22 M
  - D = 0.11 M
  - F = 6.06 M
  - Top single users hold 40–71k applications and have negative scores.
- **Caveat:** every count is even, which suggests double counting (e.g. per workflow step), and "Approved Beyond Due Date" likely includes legacy backlog. Treat the ratios as indicative only [U].
- **Implication:** officers are publicly ranked on speed. Any copilot must visibly *save* time, not add clicks.

### 3.2 Designated officers and time limits
The 2013 Revenue Dept notification under the CG Lok Sewa Guarantee Act 2011 (S6) [V]:

| Service | Designated officer | Competent authority | Appellate authority | Time limit (2013) |
|---|---|---|---|---|
| Temporary caste certificate | Tehsildar / Naib Tehsildar | SDO (Revenue) | Collector | 30 working days |
| Permanent caste certificate | SDO (Revenue) | Collector | Commissioner | 30 working days |
| Domicile (निवास) | Tehsildar / Naib Tehsildar | SDO (Revenue) | Collector | 30 working days |
| Income (आय) | Tehsildar / Naib Tehsildar | SDO (Revenue) | Collector | 30 working days |

- The portal's current time limits (S5) are shorter: SC/ST **22 days**, OBC **22 days**, Income **7 days**, Domicile **7 days** [V]. Use the portal values.

### 3.3 Documents (S5) [V]
- Income: an **Affidavit** (mandatory) and **"Certificate From Patwari/Sarpanch/Parshad"** (mandatory).
- OBC: residence proof, affidavit, income proof (Patwari/Sarpanch/Parshad certificate) and OBC proof.
- Domicile: affidavit and proof of 15 years' stay.
- So in CG the Patwari prativedan normally arrives as an **applicant-uploaded scan**, not as an in-system verification step.

### 3.4 Launch features (S10) [V as announced; implementation U]
- Real-time dashboards and MIS
- Digital signatures and cloud storage
- QR verification
- **Automatic penalty calculation and timeline indicators**
- **Auto-grievance registration**
- WhatsApp (25 services), e-KYC, DigiLocker, e-Pramaan, Bhashini

The sidebar items "LSG Act pending/show-cause notices" and "auto-grievance dashboard" (§2.2) are the in-console face of these features.

### 3.5 Legacy system
- CG e-District used `edistrict.cgstate.gov.in/PACE/…` for citizens and `…/Workflow/LoginWindowWF.do` for department users. Both now redirect to Sewa Setu or admin-ed [V].
- The new stack uses `api-ed.cgstate.gov.in/api/application-management/` and `/user-management/` [V from page JS].

---

## 4. What the national e-District MMP prescribes (S8, S9)

**DeitY Integrated Framework (S9) [V]:**
- The business layer must provide "Workflow, for facilitating approvals at various levels", PKI/digital signatures, payments, SMS updates, and "MIS, Dashboards for monitoring".
- There must be an **online SLA management system** that measures turnaround time per service, per office and per official.
- Back-end officials receive a *notification* and act inside an electronic workflow.
- **Type 1 / 2 / 3 services:**
  - Type 1 is issued over the counter from a digitally signed, pre-verified database.
  - Type 2 needs two visits, but "can migrate to Type 1 services with due data digitization, onetime physical verification and digital certification".
  - Type 3 needs physical presence or inspection.
  - → Praman's "lineage evidence" is exactly a Type 2 → Type 1 migration aid.

**Model back-office functions (Manipur e-District manual, S8) [V]:**
- The dashboard notifies officers of new and pending applications.
- Officers can "accept/reject/revert/send back any service request".
- "The System will request the Officer to **compulsorily provide comments** in case of any action taken".
- Officers can download the application and order verification ("as per the Verification component").
- Approval is done with a digital signature. Certificates carry a barcode or QR code, with a public verification module.
- Folders: **INBOX** (pending), **OUTBOX**, **Rejected**, **Approved** and **Signed**.

**Revenue certificate flow in the same manual (domicile / SC / ST):**
1. The SDO opens *My Inbox*.
2. The SDO's actions are Reject · **Send for Physical Verification to SDC circle** · Forward to SDC HQ/BO · Forward to ADC · Forward to DC.
3. The circle officer "take[s] out print of eform and download[s] attached documents for verification", performs "**Uploading of physical verification report**" and forwards back.
4. The SDO then Rejects ("as per the remarks in verification report"), Approves if empowered, or Forwards.
5. The ADC/DC "may send back the application to the concerned SDC / SDO for re-examination or reject".
6. Rejection means the "Reject" button, plus mandatory "Remarks", plus a "Submit and Finish" confirmation.
7. DSC use requires a Java runtime and the dongle driver.
   - → The CG analogue would be Tehsildar → (Patwari/RI verification) → Tehsildar/SDO. **Whether CG enables the verification leg online is unknown.**

**Other states [U, secondary sources only]:** UP e-District routes applications to the Lekhpal (the Patwari analogue) for a field report, then to the Tehsildar for DSC approval.

---

## 5. What remains UNKNOWN [U]

1. The **revenue** console specifically (Tehsildar, Naib Tehsildar, SDO). The following are all unseen:
   - Whether the decision radios include **Forward** (for permanent caste: Tehsildar → SDO) or **"send for Patwari/RI verification"**.
   - Whether a Patwari role or login exists for e-District certificates.
   - What the **"जांच सूची" (checklist)** contains for caste, income and domicile.
2. Whether **Aadhaar eSign** has replaced or joined the DSC token since the eSign service-provider RFP (Aug–Oct 2026), and whether bulk signing exists.
3. What "**खारिज**" means versus "अस्वीकृत", what triggers "**विशेष मामले**", and what "पूर्व निर्णय" shows (appeal history? earlier certificates of the same applicant/family?).
4. Whether remarks longer than 200 characters can be attached as a PDF order through दस्तावेज़ अपलोड, and whether that upload appears on the citizen side.
5. How a send-back surfaces to the citizen or operator: the remark text shown, re-submission limits, and whether the SLA clock resets. Video 7s_D4f_G_Bc likely shows this; it was not frame-read.
6. Whether the LSG-Act show-cause notices to officers are auto-generated at the deadline, and how "automatic penalty calculation" is applied.
7. The CHiPS e-District 2.0 RFP functional requirements (the file returns 404; the Wayback Machine was offline).
8. Whether a mobile officer app exists. The "eDistrict Mobile App" seen so far is for LSK operator geo-location.

---

## 6. Implications for our mock "Sewa Setu console + Praman side-panel"

### SHOW (match the real console so jurors and officers recognise it)

1. **Update the disclaimer.** The current mock says the layout "is not public". Replace this with: "Layout modelled on the public Sewa Setu Government-Login walkthrough (Aug 2026); revenue-officer specifics illustrative."
2. **Shell:**
   - A blue left sidebar with the real item names: मेरी सेवाएँ, एलएसजी अधिनियम लंबित अधिसूचना, स्वतः शिकायत डैशबोर्ड.
   - A **session timeout countdown** in the top bar.
   - The application number in a dark header bar.
3. **Dashboard tiles** with the real labels: लंबित · अनुमोदित · अस्वीकृत · वापस · अग्रेषित · समय सीमा के बाद · आगामी दो दिवस में समय सीमा · विशेष मामले. Show them per service: income, domicile, SC/ST, OBC.
4. **Pending list** with the **🔴🟡🟢 dots and the three-item legend**, the 📎 attachment count, and **both** "अधिकारी की समय सीमा" and "आवेदन की समय सीमा".
   - Praman can add one extra column or chip (e.g. evidence strength) without changing the rest.
   - Offering an urgency sort is a real improvement, since the native list is not urgency-sorted.
5. **Application view** with the five pill tabs, including the **✓ tick after each tab is visited**:
   आवेदक का विवरण / आवेदन पत्र / सहायक दस्तावेज / निर्णय / जांच सूची / पूर्व निर्णय.
   - The document tab should be a thumbnail grid with a large viewer.
6. **Decision panel exactly as native:**
   - Radio buttons अस्वीकृत / आवेदक को वापस भेजें / अनुमोदित.
   - A **टिप्पणी box with a 200-character counter**.
   - A **दस्तावेज़ अपलोड** row (pdf/jpg/png ≤ 256 KB).
   - Submit / बंद buttons.
7. **Signing:**
   - The "Generated Certificate For Signing" preview with the officer declaration and **SIGN WITH TOKEN**.
   - The Token Provider / Certificate / Passcode / Sign PDF form, all simulated.
   - Then **निर्णय की पुष्टि**.
   - Label it "DSC token (current) · eSign (being procured)", not "Sewa Setu eSign".
8. **Praman fits the checklist tab.** "निर्णय / जांच सूची" exists but showed no checklist content. That is the natural slot for Praman's evidence checklist. Pitch it as "fills the empty जांच सूची", not as a new screen.

### ADAPT (conflicts between our mock and the real console)

9. **200-character remarks.** Our reasoned draft orders are far longer.
   - Put a **≤200-character summary** (reason code plus key record references) into टिप्पणी.
   - Generate the full reasoned order as a **PDF under 256 KB for दस्तावेज़ अपलोड**.
   - Show a live character counter in the "Use this draft" action.
10. **"कारण बताओ" naming collision.** In the real console, "कारण बताओ अधिसूचना" means LSG-Act show-cause notices *to officers* for delay. Our pre-rejection notice to the *applicant* should use a different name, e.g. **"सुनवाई/आपत्ति सूचना (Opportunity-to-be-heard notice)"**.
    - Note also that the native console has no such step: Reject is a single radio button. Present ours as a Praman-added safeguard.
11. **Forward and Patwari referral.** These are unverified in the native decision panel. Show them in the **Praman panel** as recommendations, e.g. "Refer to Patwari/RI (national e-District 'Send for Physical Verification' pattern)" or "Forward to SDO for permanent caste". Label them illustrative, or tie them to the "अग्रेषित" counter, which *is* verified.
12. **Speed.** Officers are publicly ranked on speed (H = 0.5C − 0.3E − 0.2G). Show Praman's time saving in the same terms: "processed within due date ↑, pending beyond due date ↓". **Avoid any step that blocks the native Submit.** Keep the panel non-blocking, as the mock already does.
13. **The declaration says the certificate is "per information given by the applicant".** Praman can position itself as upgrading this to "…and cross-checked against records X, Y, Z", as an optional line in the uploaded PDF order. The native declaration should not be altered.

### AVOID

- Do not claim Aadhaar eSign is live. Do not claim a built-in Patwari online report, Forward in the revenue panel, or a checklist with content. All of these are unverified.
- Do not show a **full Aadhaar number**. The real console does, as a field in आवेदक का विवरण, but our mock should mask it (see 03 on DPDP).
- Do not show bulk-approve or auto-decide. Nothing like that exists natively, and it would contradict our design rules.
- Do not show real officer names or IDs from the ranking report or the videos.
