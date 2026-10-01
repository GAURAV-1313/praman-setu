# 11: A citizen-side panel before the document upload ("can't even apply" problem)

Research date: 01-10-2026. Scope: the jury's point that a citizen without 1950 (SC/ST) or 1984 (OBC) papers often cannot even submit, so the case never reaches the SDO and an officer-side panel never sees it.

**Tags**
- **[V]**: seen directly today: a page, a PDF screenshot or an official text. The URL is given.
- **[V-sec]**: verified only through a secondary source (news, blog or aggregator) that reproduces an official document.
- **[V-local]**: verified earlier in our own research files (01, 03, 05, 07); the original source is cited there.
- **[U]**: unverified, inferred, or my assumption.

Nothing was logged into and no form was submitted. Screenshots come from the official CHiPS citizen user manuals that the Sewa Setu service pages link to.

---

## 0. Headline findings (read this first)

1. **The jury is only partly right. The Sewa Setu form does not demand a pre-1950 document as such.**
   - For SC/ST, the one mandatory document group is **"जाति का प्रमाण / Caste Proof"**. Any one of about 15 alternatives satisfies it. They include:
     - "Caste Certificate Issued Earlier To The Applicant Or Any Member Of His Family"
     - a school TC
     - the father's service ID
     - a Sarpanch/Parshad certificate
     - **"Disability / Unavailability Proof"** (असमर्थता / अनुपलब्धता का प्रमाण)
   - Vanshavali, the Gram Sabha proposal and the affidavit are all **optional** on the portal.
   - Source [V]: https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=4&lang=en (page "Last Updated 26 September 2026").
2. **The block is real, but it sits elsewhere. There are four verified friction points:**
   - **(a) An upload is still compulsory.** The upload screen says "समान संलग्नक प्रकार का कम से कम एक दस्तावेज़ आवश्यक है (#)" (at least one document of each # group is required) and "मूल दस्तावेज को स्कैन कर फाइल अपलोड करना है" (scan the original and upload it). A family certificate only counts if the citizen **holds a scan of it** [V, user manual screenshots].
   - **(b) The OBC form makes the "26 दिसंबर 1984 को या इससे पहले का पता" block mandatory.** Village, **Patwari halka number**, tehsil, district and "name of the head of family at that time" are all starred (*). A citizen who does not know the 1984 halka number cannot get past the form, before any upload [V, OBC manual screenshot]. In the SC/ST form the 1950 address block is *not* starred, but the residence history "since 1950 till now" (year from / year to / address) is [V].
   - **(c) The OBC caste-proof list is narrower than the Rule.** It accepts "OBC Certificate **Of Father**" only. Rule 3(3)(e)(X) accepts a certificate "issued earlier to Father, Ancestor **or a relative**" [V both].
   - **(d) The citizen-facing guidance says pre-1950 papers are required.**
     - District pages say so, e.g. Surajpur: "Verified copy of the P-6 Jamabandi / Misal (pre-1950s)…" [V].
     - Rule 3(3) itself lists the Halka Patwari family tree and pre-notification residence proof as things the applicant "shall submit" [V].
     - Operators and officers therefore treat the 1950 paper as de facto mandatory [V-sec: news below; U: how widespread].
3. **Real cases exist of people blocked before or at intake:**
   - **Nat community, Mungeli (22-09-2026).** Children cannot get caste certificates because officials demand *mishal bandobast* records that a historically landless community never had. An earlier "Gram Panchayat proposal" route was "पुनः बंद कर दिया गया है" (closed again) [V-sec: Lalluram].
   - **CG High Court, Nishtha and Abhay/Ajay Baghel (Bilaspur, decided about 20–23 Jul 2026; sources differ on the date).** Applications refused for lack of pre-1950 papers, although the father and sister held permanent certificates. The court ordered reconsideration within 60 days [V-sec: The Sootr, NPG, INH].
   - **No public number exists for "could not apply".** The MIS counts only submitted applications. The best measurable proxies:
     - caste is 22% of applications but 61–62% of rejections
     - camp-mode SC/ST and OBC rejection is 38% and 43% [V-local, 05]
     - CHiPS should measure **drafts abandoned at the upload step** (open question Q1).
4. **Other states already let a relative's certificate replace old papers at the citizen side.** No state we found shows a citizen a search of the archive (§3, §4).
   - **Madhya Pradesh** (our parent state) has a separate Lok Sewa service for a certificate based on a father/brother/sister's certificate: 15 days, GAD order F 7-42/2012/आ.प्र./एक, 13-08-2018 [V-sec].
   - **Andhra Pradesh** issues "across the counter by taking a declaration" if the father holds a certificate, and says "No rejection shall be on grounds of insufficient documents" (CCLA circular, 18-04-2022) [V-sec].
   - **Maharashtra** (2017 rule amendment) lets blood relatives submit only the father's validity certificate [V-sec].
   - **Haryana** issues caste certificates over the counter from verified Family-ID data (GAD instruction, 22-03-2022) [V].
5. **Recommendation:** build a **"परिवार प्रमाण सहायक / Family Proof Helper"** on the citizen side. It combines options **e + a + b + c**:
   - a public, no-login **"कौन से कागज़ चलेंगे?" wizard**
   - after Aadhaar e-auth, a **declared, masked family-certificate search** whose hit becomes an *archive-verified attachment* (no scan needed)
   - a **"कागज़ नहीं? फिर भी आवेदन करें" path** that fills the *existing* "Unavailability Proof" slot with a generated declaration and auto-raises the Rule 7/8 Patwari inquiry
   - DigiLocker or OTP consent from the relative (option d) only as an optional **"fast lane"**, never as a gate.
   - **The applicant never sees the relative's details beyond a masked number, the office and the year.**
6. **The demo fits in 1–2 days.** It reuses `POST /api/precheck` behind a citizen-safe, redacting wrapper and adds a 4-step `/nagrik` page. The officer console then receives the application with the attachment or the inquiry already raised (§6).

---

## 1. How the citizen application works today

### 1.1 Channels, login, fee and time limit
| Item | Fact | Tag / source |
|---|---|---|
| Where to apply | "Sewa Setu Kendra" or online; ₹30 at both | [V] serviceId=4/5/7 pages |
| Time limit | SC/ST and OBC **22 days**; domicile **7 days** | [V] same pages |
| Citizen login | "नागरिक लॉगिन": **Username & Password** with an OTP sent to the registered mobile, or OTP login; numeric captcha. New users register (name, username, district, security question, mobile, e-mail, address) | [V] SC/ST user manual, figs. 2–4: https://sewasetu.cgstate.gov.in/resources/edistrict/user-manual/new/4.pdf ; home page tabs [V-local 07] |
| e-Pramaan / DigiLocker / UMANG | Announced as integrated at the 29-04-2026 relaunch | [V-local 01/07: ThePrint] ; which logins use them for certificate services [U] |
| Aadhaar | The form's first step is **"Aadhaar e-Authentication"**, a pop-up with Aadhaar number, Aadhaar name and a consent checkbox. The applicant is authenticated **before** the caste details are entered | [V] manual fig. 11–12 |
| Kendra vs self-apply share | Not public | [U]: ask CHiPS (Q2) |
| Legal channel | Rule 3(2): application "in person, by post, through Choice Centre, or Common Service Centre" | [V] https://indiankanoon.org/doc/156162861/ |

### 1.2 SC/ST permanent certificate: the form, step by step
From the CHiPS user manual "अनुसूचित जाति/अनुसूचित जनजाति प्रमाण पत्र हेतु छत्तीसगढ़ ई-डिस्ट्रिक्ट पोर्टल पर ऑनलाइन आवेदन". It is linked as the "User Manual" on the live Sewa Setu page; screenshots dated Jan 2026 [V].

1. **Registration and login** (steps 1–3), then service search.
2. **Aadhaar e-authentication** (step 4).
3. **Application form** (step 5):
   - *सामान्य विवरण* (general details), all starred: guardian type (पिता…), guardian name in Hindi and English, gender, marital status, DOB, **caste** (pick-list; category and serial number auto-fill), applicant name in English.
   - *Current and permanent address*, starred.
   - **"10 अगस्त 1950 से पहले का स्थाई पता"** (permanent address before 10 Aug 1950):
     - fields: ग्राम या नगर, पटवारी हल्का नंबर, तहसील, जिला, इस समय परिवार के मुखिया का नाम, आवेदक का परिवार के मुखिया से सम्बन्ध
     - **not starred in this screenshot** [V].
   - **"आवेदक या उसके पिता या माता या पालक का 10 अगस्त 1950 अ.जा. या 06 सितम्बर 1950 अ.ज.जा. से अब तक का पता का विवरण"** (address history of the applicant or parent since the cut-off):
     - the question "क्या … सन 1950 से अब तक छत्तीसगढ़ में रहते हैं" ("have they lived in Chhattisgarh since 1950?")
     - a repeating row of **वर्ष से\*, वर्ष तक\*, रहने के पता का विवरण\*** (year from, year to, address), all **mandatory** [V].
   - *अन्य विवरण* (other details): "क्या आवेदक को इससे पहले एस सी एस टी प्रमाण पत्र जारी किया गया है" (has the applicant been issued an SC/ST certificate before?) and "certificate details". This field concerns **the applicant's own** earlier certificate, not a relative's [V].
4. **Upload** (step 6, "अनुलग्नक का विवरण"):
   - The rules on screen are: "चिन्हित दस्तावेज लगाना अनिवार्य है (\*)" (marked documents are mandatory), "समान संलग्नक प्रकार का कम से कम एक दस्तावेज़ आवश्यक है (#)" (at least one per # group), and "केवल अधिकतम 750kb की फ़ाइल (jpeg/jpg/png/pdf)".
   - Columns: दस्तावेज़ का नाम · दस्तावेज़ · **दस्तावेज़ संख्या** (document number) · **संलग्न प्रकार** (dropdown, shows "अपलोड") · फ़ाइल अपलोड करें · **डिजिटल लॉकर** · हटाएं.
   - Rows 1–31 are "जाति का प्रमाण #" alternatives. Row 6 is **"आवेदक को या उसके किसी परिवारजन को जारी हुआ जाति प्रमाण पत्र"**. Rows 32–35 are Vanshavali 1–4, row 36 the Gram Sabha proposal, row 37 the MP Reorganisation Act cadre proof [V].
   - **Implication:** the existing data model already has a *document number* field, an *attachment type* dropdown and a *DigiLocker* column. A new attachment type, "archive-verified", fits this screen without a redesign [U on what the dropdown's other values are].
5. **Preview, declaration, fee, receipt** (steps 7–9). The preview lists "अनुलग्न दस्तावेज सूची" (attached documents) [V].

**Current required-documents table** (live page, English) [V] https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=4&lang=en:

| # | Group | Mandatory | Alternatives (verbatim, abridged) |
|---|---|---|---|
| 1 | Residential Proof | No | Domicile certificate, electricity bill, ration card, birth certificate, voter ID, land/house document, ward member/MLA/MP certificate, father's service certificate, order of involuntary migration… |
| 2 | **Caste Proof** | **Yes** | SC/ST certificate of other state · SC/ST certificate from Sarpanch/Parshad/MLA/MP · school TC countersigned by DEO · father/guardian's service certificate/ID · educational certificate · **caste certificate issued earlier to the applicant or any member of his family** · primary school certificate · birth information form · Misal · Adhikar Abhilekh · Jamabandi · Census Register 1931 · Citizen Register 1949 · Dakhil/Kharij Panji · **Disability / Unavailability Proof** |
| 3 | Affidavit | No | — |
| 4 | Vanshavali | No | Vanshavali 1–4 |
| 5 | Gram Sabha Proposal (rural) | No | — |
| 6 | MP Reorganisation Act 2000 s.67 proof | No | — |

### 1.3 OBC (serviceId=5) [V]
- **Mandatory groups:**
  - **Affidavit**
  - **Income proof** (Patwari/Sarpanch/Parshad certificate, employer certificate/Form 16, ration card, income from land/house…)
  - **OBC proof**: educational certificate, primary school TC, **OBC certificate of father**, OBC certificate from Sarpanch/Parshad, father's service ID, Misal, Adhikar Abhilekh, Jamabandi, Census 1931, Citizen Register 1949, Dakhil/Kharij, **Disability/Unavailability Proof**.
- Vanshavali and the Gram Sabha proposal are optional.
- **The form's "२६ दिसंबर १९८४ को या इससे पहले का पता" block is mandatory** (village\*, Patwari halka number\*, tehsil\*, district\*, head of family at that time\*) [V, OBC manual screenshot: https://sewasetu.cgstate.gov.in/resources/edistrict/user-manual/new/5.pdf].

### 1.4 Domicile (serviceId=7) [V]
- **Mandatory:** affidavit; proof of 15 years' stay (birth certificate or alternatives: father's service certificate, voter ID, land/house document, ward member/MLA/MP certificate, ration card, electricity bill…); and an **educational certificate** (class 8, or 5th/10th/12th/higher, or a school certificate of 3 years' study).
- The upload screen warns "मूल दस्तावेज को स्कैन कर फाइल अपलोड करना है" (scan the original) [V, manual 7.pdf].
- **No alternative exists for an adult who never attended school.** That is the domicile equivalent of the "can't even apply" problem [U on how often this happens].
- A parent's domicile certificate is **not** listed as a 15-year proof.

### 1.5 What the law requires vs what the form asks
Rules: CG Scheduled Castes, Scheduled Tribes and OBC (Regulation of Social Status Certification) Rules 2013, notification F13-23/2012/R.C./1-3 [V] https://indiankanoon.org/doc/156162861/

| Rule (verbatim where quoted) | Form today | Gap |
|---|---|---|
| **3(3)(a)** "An Affidavit in FORM-2A, in original" | SC/ST: affidavit **optional**; OBC: mandatory | The portal is looser than the Rule for SC/ST |
| **3(3)(b)** "Family tree … last three generations, duly issued by the Halka Patwari" | Vanshavali **optional** | The citizen has to visit the Patwari offline; no online request exists [U on any online Patwari role, 07 §5] |
| **3(3)(c)** proof "that his ancestors were residing … on or before the Date of Presidential Notification" | SC/ST 1950 address block not starred; OBC 1984 block starred | OBC is stricter on the form than SC/ST |
| **3(3)(e)(X)** "Caste Certificate, issued earlier to Father, Ancestor or a relative" | SC/ST: "any member of his family" ✓; OBC: "**father**" only | The OBC list is narrower than the Rule |
| **3(3)(e)(XI)** "Resolution passed by the Gram-Sabha regarding caste of the applicant **where no documentary evidence in proof of caste is available**" | Gram Sabha proposal optional, rural only | **This is the statutory "no papers" route.** It already exists but is not presented as a path |
| **7** "Competent Officer, within fifteen days … shall either proceed to inquire himself or shall direct a subordinate Revenue Officer for Inquiry" | No visible online referral step [V-local 07] | The inquiry exists in law but not in the citizen's view |
| **8(3)** oral statements of "village Kotwar, Village Sarpanch, Halka Patwari … other local members of that caste already having Certificate" | — | A legal basis for an inquiry when there are no papers |
| **10** provisional certificate (FORM-4B) on the FORM-2A affidavit within 15 days, for admissions up to class 10 and scholarships; valid 6 months | Not surfaced to citizens | A deadline fallback the wizard should show |

The CG SC Commission page also states a no-document route [V] https://cgsccommission.com/caste_certificate.php:
> "दस्तावेज नहीं होने पर समाज प्रमुखों द्वारा लिखित में शपथ पत्र …"

(Where there are no documents, written affidavits from community leaders may be relied on.) The CG ST Commission page says the same about the Gram Sabha [V] https://cgstcommission.org/cast_certi.html.

---

## 2. Evidence that the "can't even apply" problem is real

| # | Evidence | What it shows | Tag |
|---|---|---|---|
| E1 | **CG HC, Nishtha and Abhay (or Ajay) Baghel**, village Mudhipar, Bodri tehsil, Bilaspur. Single bench, Justice A.K. Prasad; dated 20, 22 or 23 Jul 2026 by different outlets | Revenue officers refused because "उनके पास 1950 से पहले के ऐसे दस्तावेज नहीं हैं" (they had no such pre-1950 documents), though the father and sister held permanent certificates. The court held pre-1950 papers are not required in every case and ordered reconsideration in **60 days**. One report says certificates may be issued on a family member's certificate plus Gram Sabha or village-level verification of the relationship | [V-sec] https://thesootr.com/state/chhattisgarh/chhattisgarh-hc-caste-certificate-order-12182534 ; https://npg.news/chhattisgarh/bilaspur-high-court-ne-jati-praman-patra-par-diya-bada-faisla-1950-ke-dastavez-jaruri-nahi-latest-cg-news-hindi-npg-22-07-2026-1315928 ; https://www.inhnews.in/news/caste-certificate-to-be-issued-even-without-1950-documents |
| E2 | **Nat community, Mungeli**, memorandum to the Deputy CM, 22-09-2026 | Hundreds of children without certificates because officials demand *mishal bandobast* and the community was landless. A Raman Singh-era order had allowed certificates on "ग्राम पंचायत के प्रस्ताव" (a Gram Panchayat proposal); "अब इस व्यवस्था को पुनः बंद कर दिया गया है" (now closed again). **Blocked before a decision, not rejected after one** | [V-sec] https://lalluram.com/the-nat-community-submitted-a-memorandum-addressed-to-deputy-chief-minister-arun-sao-after-failing-to-obtain-caste-certificates/ |
| E3 | Mooknayak, Jul 2026: "छत्तीसगढ़ में जाति प्रमाण पत्र का संकट" (CG's caste certificate crisis) | Genuine applicants "दफ्तरों के चक्कर काटने को मजबूर" (forced into repeated office visits) because of 1950 records. **No numbers** | [V-sec] (URL in 05) |
| E4 | **GAD order on Rohidas/Chamar/Mochi**, reported 17-09-2026 | Families whose old revenue records say "Chamar" or "Mochi" faced obstacles getting a "Rohidas" certificate. GAD clarified the certificate issues after inquiry. This shows the **old-record mismatch** problem is recognised by the state | [V-sec] https://www.haribhoomi.com/state-local/chhattishgarh/news/cg-government-rohidas-caste-certificate-issued-revenue-records-list-chamar-mochi-113405 |
| E5 | District citizen pages state pre-1950 records as required | Surajpur: "Verified copy of the P-6 Jamabandi / Misal (pre-1950s) or a Pre-1950 government document with caste mentioned on it" (Gram Sabha proposal for the landless). **This is what citizens and operators read** | [V] https://surajpur.nic.in/en/service/caste-certificate/ |
| E6 | Sewa Setu MIS, 01-04-2025 to 26-09-2026 | SC/ST 19.1% and OBC 21.5% of decided cases rejected (income 1.4%). Caste is 22% of volume and 62% of rejections. **Camp mode: SC/ST 38.1%, OBC 42.6%** | [V-local 05] |
| E7 | Comparable state, J&K (24-09-2023) | Guidelines because **landless applicants were being denied** caste certificates. Allowed: electoral roll extract, Chullha-Bandi, ration card, Sarpanch/BDC/DDC certificates | [V-sec] https://www.newsonair.gov.in/govt-issues-guidelines-for-issuance-of-caste-certificates-to-landless-applicants-in-jk |
| E8 | Comparable state, Maharashtra (Kunbi records) | The state **published digitised old records on district websites** so families could find ancestors' caste entries themselves. Shows the "find your family's record" need at scale | [V-sec] https://theprint.in/politics/reading-modi-script-mapping-family-trees-how-maharashtras-scouring-old-records-to-identify-kunbis/1840541/ ; e.g. https://nanded.gov.in/en/talukawise-kunbi-records/ |

**What we could NOT find [U]:**
- an assembly question with numbers on caste applications not filed or refused at intake
- Sushasan Tihar 2026 caste-specific figures (the camp ran 1 May–10 Jun 2026: https://www.patrika.com/raipur-news/resolution-camps-to-be-held-in-chhattisgarh-20505392)
- any count of drafts abandoned at upload

**Do not quote a number for "people who could not apply".** Say instead that it is invisible in the MIS by construction, and that our pilot would measure it.

---

## 3. How other states and national systems handle this at the citizen side

| State / system | Can a citizen cite a relative's certificate instead of old papers? | Pre-fill from family data? | Search of the archive shown to the citizen? | Source |
|---|---|---|---|---|
| **Madhya Pradesh** (parent state) | **Yes, as a separate notified Lok Sewa service.** GAD order F 7-42/2012/आ.प्र./एक, 13-08-2018: service 6.5 digitises one's own handwritten certificate in **3 days**; service 6.6 issues a certificate where the **father/brother/sister** already holds one, in **15 days**. Needs the relative's certificate copy, a ration card or eligibility slip showing the relationship, and an affidavit. Live OBC page: caste proof can be "1996 के बाद जारी राजस्व अधिकारी द्वारा प्रदत्त जाति प्रमाण पत्र" of a family member, plus property records in a grandfather's or father's name | Samagra ID is mandatory and auto-fills [V-sec] | No; the citizen supplies a copy | [V-sec] https://septadeep.blogspot.com/2018/07/digital-caste-certificate-in-03-days.html ; [V] https://mpedistrict.gov.in/MPL/ShowServiceDetail.aspx?param=iCoFEcVNnpk1iYzmNZ1haAeeyrqCKMoBMpJYxI6S+WMEm2WDPLy5xaKpf2vzl0WFzj6HDSEc1Fc%3D |
| **Andhra Pradesh** | **Yes, across the counter.** "If the Father of the applicant was issued an integrated Certificate or Caste Certificate, Caste Certificate to his biological children may be given across the counter by taking a declaration from the applicant." Also: "**No rejection shall be on grounds of insufficient documents**" (CCLA Ref LR-II(1)/REV02-13/15/2022, 18-04-2022) | Household Database (HH DB) authentication lets it be issued as a Category-A (instant) service | No (village secretariat staff do it) | [V-sec] https://www.gsws.info/2022/04/guidelines-for-issue-of-integrated.html |
| **Haryana** | Verified once in the family database, then not needed again. GAD instruction 22-03-2022: "The verified information linked with PPN available in [FIDR] has now made it feasible to issue Caste Certificates over the counter through the SARAL portal". A child born outside Haryana is eligible if the father holds a Haryana certificate | **Yes**, PPP/FIDR | No (the citizen sees their own family record) | [V] https://csharyana.gov.in/WriteReadData/Instructions/General-Services-III/Intructions%2022-132-2013-1GS-III%20dated%2022-03-2022.pdf . **Caution:** PPP-based pension halts (70% later found eligible) [V-local STATE_COMPARISON] |
| **Maharashtra** | **Yes for validity.** The 3-Oct-2017 cabinet decision amended Rules 4 and 6 of the Caste Validity Rules 2012: children and blood relations submit only the father's or relative's validity certificate, with a "Digital Locker concept" announced. Bombay HC (Monali Deore, 30-06-2023): relatives' validity certificates "constitute conclusive proof", absent fraud | No | Kunbi records were *published* for self-search (E8) | [V-sec] https://www.india.com/news/agencies/getting-caste-validity-certificate-made-easier-for-relatives-2512662/ ; https://www.verdictum.in/court-updates/high-courts/issuance-of-caste-certificate-to-blood-relatives-1482881 |
| **Rajasthan** | Father's or relative's certificate is the usual proof [V-sec, aggregator] | Jan Aadhaar: "Domicile certificate and Caste certificate are automatically updated in Jan Aadhaar after the certificate is issued through e-Mitra" | No | [V] https://janaadhaar.rajasthan.gov.in/content/raj/janaadhaar/en/faqs1.html |
| **Karnataka** | e-Kshana same-day issue where Aadhaar and village records match [V-sec]; Kutumba family registry feeds 30+ systems [V-local STATE_COMPARISON] | Yes (Kutumba) | No | [V-sec] https://www.egovtschemes.com/e-kshana/ |
| **Telangana MeeSeva** | The father's or ancestor's caste certificate is listed as lineage evidence; the Tahsildar may do a home visit | No | No | [U, aggregator only] |
| **Odisha e-District** | An RI enquiry report form is part of the SC/ST flow, so a field enquiry is built in | No | No | [U, aggregator] https://forms.odiaportal.in/2020/06/odisha-edistrict-ri-enquiry-form-scst.html |
| **DigiLocker** | Sewa Setu CG is an issuer; SC/ST, OBC and domicile certificates since **Jan 2018** can be pulled into **the holder's own** locker | Requester apps use an OAuth consent flow scoped to the **holder** | Only by the holder | [V-local 01] https://www.digilocker.gov.in/web/dashboard/issuers/000094 |
| **API Setu `edistrictcg`** | Fetch a certificate by **ARN + mobile**; the mobile must match the holder; a consent artefact is required | — | No name search | [V-local 01] https://directory.apisetu.gov.in/api-collection/edistrictcg |

**What this means:**
- A citizen citing a relative's certificate in place of old papers is **normal Indian practice**: MP, AP, Maharashtra and Haryana in different forms.
- The new part for CG is that **the state searches its own archive for the citizen**, instead of the citizen hunting for a paper copy, **and shows only a masked result**.
- No state we found does this. That is our novelty claim, and it is worded "to our knowledge".

---

## 4. Design options for a citizen-side panel before upload

Common legal basis for all options:
- **Rule 3(3)(e)(X)** (relative's certificate), **3(3)(e)(XI)** (Gram Sabha where no papers), **Rule 7/8** (inquiry, including oral evidence) and **Rule 10** (provisional certificate).
- The **CG HC Baghel order**.
- **DPDP Act 2023 s.7(b)**: State issue of a "certificate" to the Data Principal, i.e. the applicant's own data.
- **DPDP Act 2023 s.7(c)**: "performance by the State … of any function under any law", which covers the competent authority looking up the **relative's** record for a statutory inquiry.
- **DPDP Rules 2025, Rule 5 and Second Schedule** (purpose limitation, minimisation, notice, accountability). Binding from **13-05-2027**; Rule 4 consent managers from 13-11-2026 [V-local 03; s.7 text V-sec https://www.dpdpa.com/dpdpa2023/chapter-2/section7.html].
- **Privacy point:** s.7(c) lets the *State* process the relative's data. It does **not** make it lawful to *show* that data to another person. The applicant is a third party to the relative's record, so disclosure must be the minimum the purpose needs [my reading, U: confirm with the legal advisor].

### Option a: "Find my family's certificate" (declared, masked archive search)
**Flow:**
1. After Aadhaar e-auth, the applicant declares the relation (पिता/दादा/भाई/बहन/चाचा/बुआ…; mother's side allowed but marked for officer review).
2. The applicant enters the relative's name and village (LGD picker; plus a maiden or native village for married women).
3. Splink searches the archive, blocked by LGD.
4. **Citizen sees:** found / found-but-officer-will-check / not found. If found, only **"क्रमांक ••••4512 · अनुविभागीय अधिकारी (राजस्व), कोंडागांव · 2019"**, plus a confirm button.
5. **Citizen never sees:**
   - the relative's address, DOB, mobile, Aadhaar, photo, other family members or the full number
   - **the relative's caste or sub-caste**. The system only says whether it is *usable for the category you chose*. If not, it says "officer will check", so a caste mismatch is never revealed.
   - The name is not echoed back beyond what the applicant typed.
6. **Officer sees:** the full certificate, side by side, with match evidence, validity checks, and whether the relative was notified or confirmed.

| Pros | Cons / risks |
|---|---|
| Solves the real gap: the family has the right but not the paper or scan. No upload is needed | Archive only goes back to **2015** (DigiLocker since 2018) [V-local], so more sibling and cousin hits than father hits |
| Directly operationalises Rule 3(3)(e)(X) and the HC order | **Enumeration / caste profiling:** someone types names to learn who holds SC/ST certificates. Mitigated by Aadhaar e-auth first, per-person rate limits, a masked "category-usable" answer only, logging, and notifying the relative |
| Reuses our engine and `/api/precheck` | **Stranger claims** ("Netam, Kondagaon" matches many). A hit is never proof of the relationship: the officer confirms it via vanshavali, ration card or the father's name on the certificate; the relative is notified; anomaly flag if one certificate is cited by many applicants |
| A hit leaves the citizen with a short wait, not a long hunt | A false "not found" may discourage. The copy must say it is common and not a negative signal (already in the Kendra screen) |

**Feasibility for CHiPS:** high. It is CHiPS's own data and needs no MoU [V-local 01]. It needs a read replica and a search service.

### Option b: Relative's certificate number field, verified instead of uploaded
- The applicant types the number (from an old photocopy, an SMS or the relative's DigiLocker). The system verifies it against the archive or QR record and attaches it as "archive-verified".
- **Pros:** the simplest change; matches the existing "दस्तावेज़ संख्या" column on the upload screen [V]; no fuzzy search, so no enumeration beyond guessing numbers; mirrors the MP 6.6 model.
- **Cons:** many families do not have the number. Sequential numbers can be brute-forced: rate-limit them and require the name to match as well. API Setu `edistrictcg` needs ARN **and the holder's mobile** [V-local 01], so the internal DB lookup is better than API Setu.
- **Show the citizen:** "✔ क्रमांक मान्य है · SDO कोंडागांव · 2019 · आपके द्वारा बताए नाम से मेल खाता है" (number valid · SDO Kondagaon · 2019 · matches the name you gave). Nothing else.

### Option c: "मेरे पास 1950/1984 के कागज़ नहीं हैं" (submit anyway, auto-raise the inquiry)
**What the form does:**
- The form fills the **existing "Disability / Unavailability Proof" slot** [V] with a **system-generated declaration**, a Form 2A annexure in plain Hindi that the applicant e-signs by Aadhaar OTP or thumb at the Kendra. That satisfies the "#" group.
- A short guided **vanshavali** questionnaire (father, grandfather, great-grandfather, their villages, "पता नहीं" allowed) produces a **pre-filled vanshavali request** to the Halka Patwari.
- On submission the workflow auto-creates a **Rule 7 inquiry referral** (Patwari/RI) with a 15-day clock (Rule 7 and 8(4)).
- It offers the **Gram Sabha resolution format** (Rule 3(3)(e)(XI)) to upload later, and **Rule 8(3) oral evidence** (Kotwar, Sarpanch, existing certificate holders) at the inquiry.
- For OBC, the 1984 address block accepts **"पता नहीं / not known"**.

| Pros | Cons |
|---|---|
| **This is the only option that helps people with no family certificate at all**: the Nat case, landless first-generation applicants, migrants | Officers may still reject. It needs a **circular** making an inquiry, not a rejection, the default for this lane, plus a "no rejection on insufficient documents" line (AP precedent) |
| Uses a slot and rules that already exist, so the legal change is small | More Patwari workload. The volume is unknown; pilot it in 2 tehsils |
| Converts invisible drop-outs into visible, trackable applications. The state can then *measure* the problem | Risk of a low-quality application flood. The declaration carries the s.10 false-statement warning; Patwari evidence is still required |

### Option d: DigiLocker pull or relative OTP consent
- The relative, present at the Kendra or on a phone, logs into DigiLocker and shares their SC/ST certificate, or approves an OTP sent to their registered mobile.
- **Pros:** strong consent artefact; the strongest anti-stranger signal ("relative confirmed"); uses the existing DigiLocker column [V].
- **Cons:** fails for deceased, migrated, estranged or phone-less relatives and for women whose natal family is far away; the relative's mobile is often a shared or old number.
- **As a gate it would recreate the exclusion we are fixing.** Use it only as an **optional fast lane** that raises the evidence strength shown to the officer.

### Option e: "कौन से कागज़ चलेंगे?" eligibility and document wizard (public, no login)
- 4–5 icon questions in Hindi with audio, ending in a printable or WhatsApp checklist and the right path (family certificate / document / no papers).
- It surfaces the **Rule 10 provisional certificate** for students with deadlines.
- It links to the public **Missal Record Room name search** (https://revenue.cg.nic.in/missal/RecordSearchByName.aspx, [V-local 01]) so families can look for ancestors' entries themselves, as Maharashtra's Kunbi pages allow.
- **Pros:** zero personal data; zero legal change; tackles the misinformation in E5; cheapest to ship.
- **Cons:** guidance alone doesn't unblock anyone. It must sit next to a or c.

### Option f: other ideas found
1. **Align the OBC list with the Rule.** Change "OBC certificate of father" to "any paternal relative". This is a content fix, with no AI needed [V gap].
2. **Fix citizen-facing pages.** District pages (e.g. Surajpur) still say pre-1950 records are required. A one-time content fix from the state is needed [V].
3. **Proactive family notice at issue time.** When a certificate is issued, SMS the holder: "आपके बच्चे/भाई-बहन इस प्रमाण पत्र के आधार पर आवेदन कर सकते हैं" (your children or siblings can apply using this certificate). This is a light version of AP and Haryana's "once per family" model, with no family registry needed.
4. **School-campaign link.** Certificates are already issued to classes 9–12 through schools [V cgstcommission]. The school can run the same family search for students.
5. **Bhashini / Adi Vaani voice.** Gondi is supported by MoTA's Adi Vaani (launched 1 Sep 2025; with IIIT Nava Raipur and CG TRI) [V-sec] https://www.pib.gov.in/PressReleasePage.aspx?PRID=2162846 . Halbi and Chhattisgarhi are not confirmed on Bhashini [U]. Use pre-recorded audio for fixed prompts and human-checked translations; don't machine-translate legal text live.

### Comparison
| | a Find family cert | b Cert number | c No-papers path | d Relative consent | e Wizard |
|---|---|---|---|---|---|
| Helps "has family certificate, no copy" | ✅✅ | ✅ (if number known) | ➖ | ✅ (if relative present) | ➖ |
| Helps "no family certificate, no papers" | ❌ | ❌ | ✅✅ | ❌ | ✅ (guidance) |
| Legal change needed | Circular (archive hit = attachment) | Circular | Circular + workflow (Rule 7 referral) | None | None |
| Privacy risk | Medium (mask, rate limit) | Low–medium | Low | Low | None |
| Fraud risk | Medium (stranger claim) → officer confirms the relationship | Low–medium | Medium (false declarations) → Patwari inquiry | Low | None |
| Low-literacy fit | Good at Kendra; OK online with voice | Poor (numbers) | Good if read aloud | Poor | Good |
| CHiPS effort | Medium | Low | Medium | Medium | Low |

---

## 5. Recommendation

### 5.1 What to build: "परिवार प्रमाण सहायक / Family Proof Helper"
Build **e (always) + a and b (one screen) + c (fallback)**, with **d as an optional fast lane**.

It is used the same way **by the citizen online and by the Kendra operator**. The Kendra screen we already have becomes the operator view of the same component, and **the operator view should be masked too**, unless the applicant typed the number. Kendra operators are private CSC VLEs, not government officers. Today `Kendra.tsx` shows the relative's full name, certificate number and village; that needs changing before any pilot.

### 5.2 Citizen screen flow (Hindi first, English below)

**S0. Public, before login: "कौन से कागज़ चलेंगे? / Which papers will work for me?"**
- Q1 सेवा चुनें / Choose service: अनुसूचित जाति · अनुसूचित जनजाति · अन्य पिछड़ा वर्ग · मूल निवास.
- Q2 "क्या परिवार में किसी का जाति प्रमाण पत्र पहले बना है? (पिता, दादा, भाई, बहन, चाचा)" / Has anyone in your family got a caste certificate before? हाँ / नहीं / पता नहीं.
- Q3 "क्या इनमें से कोई कागज़ आपके पास है?" / Do you have any of these? A picture grid: school TC with caste, father's service ID, Misal/Jamabandi, Sarpanch certificate, "कोई नहीं".
- Q4 "क्या जल्दी चाहिए — छात्रवृत्ति/प्रवेश?" / Need it urgently for a scholarship or admission? If yes, show the provisional certificate (Rule 10) info.
- **Result card, "आपका रास्ता / Your path":**
  - **A: परिवार का प्रमाण पत्र** (family certificate)
  - **B: कोई एक कागज़** (any one document)
  - **C: कागज़ नहीं — फिर भी आवेदन करें** (no papers — apply anyway)
- Footer: 🔊 सुनें / Listen · 🖨 छापें / Print · WhatsApp पर भेजें / Send on WhatsApp. "यह अस्वीकृति नहीं है — केवल मार्गदर्शन" (This is not a rejection — guidance only).
- No data stored.

**S1. Login + Aadhaar e-authentication** (existing; unchanged).

**S2. New, placed right after "सामान्य विवरण" and before the 1950/1984 address block: "परिवार का प्रमाण पत्र खोजें / Find your family's certificate"**
- संबंध / Relation: chips पिता · दादा · भाई · बहन · चाचा · बुआ · अन्य (माता पक्ष — अधिकारी जांचेंगे / mother's side — officer will check).
- परिवारजन का नाम / Relative's name: हिंदी या English.
- उनका गांव / Their village: LGD autocomplete. "विवाहित महिलाएं: मायके का गांव भी चुनें / Married women: also choose your maiden village".
- प्रमाण पत्र क्रमांक (यदि पता हो) / Certificate number (if known): optional.
- उनका मोबाइल (वैकल्पिक) / Their mobile (optional): "उन्हें सूचना भेजी जाएगी / they will be informed".
- Notice + consent:
  > "हम केवल आपके बताए परिवारजन का प्रमाण पत्र, केवल इस आवेदन के लिए, सेवा सेतु अभिलेखागार में खोजेंगे। हर खोज दर्ज होती है। गलत जानकारी देना अपराध है।"
  >
  > (We search the Sewa Setu archive only for the relative you name, only for this application. Every search is logged. Giving false information is an offence.)

  Checkbox ☐ "मैं सहमत हूँ / I agree", then the button **खोजें / Search**.
- Limits: 3 searches per application, and 5 per Aadhaar-authenticated person per day [assumption; tune in pilot].

**S3. Result (one of three)**
- **✔ "मिल गया / Found":**
  > "आपके बताए परिवारजन से मेल खाता स्थायी जाति प्रमाण पत्र मिला: क्रमांक ••••4512 · अनुविभागीय अधिकारी (राजस्व), कोंडागांव · 2019"
  >
  > (A matching permanent caste certificate was found: No. ••••4512 · SDO (Revenue), Kondagaon · 2019)

  Buttons: [हाँ, यही है — प्रमाण के रूप में जोड़ें / Yes, attach as proof] [नहीं, यह नहीं है / Not this one].
  Then: "✓ जाति प्रमाण जुड़ गया। 1950 के कागज़ अपलोड करना अब ज़रूरी नहीं। अधिकारी संबंध की पुष्टि करेंगे; पटवारी वंशावली या राशन कार्ड हो तो लगाएं।" (Caste proof attached; 1950 papers no longer needed; the officer will confirm the relationship; add the Patwari vanshavali or ration card if you have one.)
- **◐ "मिला, पर अधिकारी देखेंगे / Found, officer will check":** no reason that reveals caste. "आप आगे बढ़ सकते हैं; यह अस्वीकृति नहीं है।" (You can continue; this is not a rejection.)
- **○ "नहीं मिला / Not found":**
  > "यह सामान्य है — 2015 से पहले के प्रमाण पत्र ऑनलाइन नहीं हैं। इससे आपका आवेदन अस्वीकार नहीं होगा।"
  >
  > (This is common — certificates from before 2015 are not online. Your application will not be rejected because of this.)

  Choices: [प्रमाण पत्र की कॉपी है — अपलोड करें / I have a copy — upload] [कोई दूसरा कागज़ है / I have another document] [**मेरे पास कोई कागज़ नहीं / I have no papers**].

**S4. If no papers: "कागज़ नहीं? फिर भी आवेदन करें / No papers? Apply anyway"**
1. "वंशावली की जानकारी / Family tree details": पिता, दादा, परदादा — नाम, गांव, "1950/1984 में कहाँ रहते थे?" (Where did they live in 1950/1984?) — every field allows "पता नहीं / don't know".
2. "अनुपलब्धता घोषणा / Unavailability declaration": auto-generated from the answers; 🔊 read aloud; e-sign by Aadhaar OTP, or thumb impression at the Kendra.
3. "आगे क्या होगा / What happens next":
   > "आपका आवेदन जमा होगा। SDO कार्यालय पटवारी से जांच करवाएगा (नियम 7)। पटवारी आपके गांव में कोटवार/सरपंच/समाज के लोगों से पूछ सकते हैं। ग्राम सभा प्रस्ताव मिल जाए तो बाद में जोड़ सकते हैं।"
   >
   > (Your application will be submitted. The SDO office will have the Patwari make an inquiry (Rule 7). The Patwari may ask the Kotwar, Sarpanch or community members in your village. You can add a Gram Sabha resolution later if you get one.)

   Link: "ग्राम सभा प्रस्ताव का प्रारूप / Gram Sabha resolution format" ⬇.

**S5. Remaining uploads** (identity, residence): DigiLocker pull of *own* documents (column exists [V]), and a browser scan-quality check.

**S6. Preview, "इस आवेदन में उपयोग हुए अभिलेख / Records used for this application", fee ₹30, receipt.**
- The records box lists the archive search, the masked hit, or "inquiry requested". This meets DPDP notice now, not only in 2027.
- After payment: SMS/WhatsApp in Hindi (voice note optional): what happens next and by when.

**Relative-side notification** (when a hit is attached and a mobile is on record):
> "आपके जाति प्रमाण पत्र ••••4512 को एक परिवारजन ने अपने आवेदन में प्रमाण के रूप में बताया है। यदि आप उन्हें नहीं जानते तो 1800-… पर बताएं।"
>
> (A family member has cited your caste certificate ••••4512 as proof in their application. If you do not know them, report it on 1800-….)

Notification only; **it is not a consent gate.**

### 5.3 What changes in Sewa Setu
| # | Change | Where | Needs |
|---|---|---|---|
| 1 | New "संलग्न प्रकार" value **"अभिलेखागार से सत्यापित / Archive-verified"** that satisfies the "जाति का प्रमाण #" and "OBC proof #" groups without a file | Upload screen (step 6) | CHiPS build |
| 2 | When an archive-verified family certificate or an unavailability declaration is attached, make the **1950 / 1984 address block optional**, with "पता नहीं" allowed. The OBC block is currently mandatory | Form (step 5) | CHiPS build plus GAD/Revenue nod |
| 3 | OBC proof list: "father's" becomes "**father's or any paternal relative's**" OBC certificate, matching Rule 3(3)(e)(X) | Service master | Content change |
| 4 | Define **"Disability / Unavailability Proof"** as a system-generated declaration (Form 2A annexure), not an undefined upload | Service master + PDF template | GAD/Revenue approval of the text |
| 5 | On submission with an unavailability declaration, **auto-create the Rule 7 inquiry referral** (Patwari/RI) and a pre-filled vanshavali request | Officer workflow | CHiPS build; whether a Patwari role exists is unknown (Q6) |
| 6 | Officer reject-reason list: **no "family certificate not found"**; "pre-1950 record not submitted" is not allowed as a sole reason where a family certificate is attached or an inquiry is pending | Officer console | Circular |
| 7 | Correct district NIC pages and the portal instruction PDF (the SC/ST page links the wrong instruction PDF, 201.pdf [V-local 05]) | Content | District e-gov / CHiPS |

**Circular needed** (GAD as caste-certificate policy owner, jointly with Revenue as service owner; who signs is open, Q4). Five points:
1. A relative's certificate found in the Sewa Setu archive and attached by the system is acceptable under Rule 3(3)(e)(X) without a separate scan.
2. **No application may be refused at intake (Kendra or portal) for lack of pre-notification records.** Applications with an unavailability declaration go to a Rule 7/8 inquiry.
3. "Not found in archive" is never a ground of rejection.
4. Rejection only on merits, with reasons (Rule 18 spirit; the AP CCLA wording "No rejection shall be on grounds of insufficient documents" is a model).
5. Cite the CG HC Baghel order.

### 5.4 What the officer then sees (Praman panel, existing console)
- **Family-certificate lane:**
  - a chip "परिवार प्रमाण — नागरिक द्वारा बताया, अभिलेखागार से सत्यापित" (family proof — named by the citizen, verified from the archive)
  - the full relative certificate side by side (holder, father's name, village, category, issuing SDO, date, validity checks)
  - the relation as declared by the applicant
  - match evidence (Splink weights)
  - "relative notified ••••21 on 03-10; no objection received" or "relative confirmed via OTP/DigiLocker" (fast lane)
  - an anomaly note if this certificate was cited by more than N unrelated applicants
  - **The officer must still tick "relationship confirmed (vanshavali / ration card / statement)"** before approving.
- **No-papers lane:**
  - "दस्तावेज़ अनुपलब्ध — नियम 7 जांच" (documents unavailable — Rule 7 inquiry)
  - Patwari task status (0/15 days), the generated declaration, the vanshavali answers, and a slot for the Gram Sabha resolution and oral statements
  - the draft order cites Rule 3(3)(e)(XI) / 8(3).
- **Both lanes:** zero extra clicks on clean files; send-back instead of reject; the hearing notice before any rejection (already in our console).

### 5.5 Safeguards
1. **Identity before search.** Searches run only after Aadhaar e-auth (online) or operator login plus applicant e-KYC (Kendra).
2. **Declared, not trawled.** One named relative per search; no browsing of villages; results are masked.
3. **Rate limits.** 3 per application and 5 per person per day (assumption), plus a per-operator daily cap and alerts on bursts.
4. **No caste disclosure.** The citizen never sees another person's caste or sub-caste, only whether the record is "usable for the category you chose".
5. **Relative notified** (SMS, where a mobile exists) with a report-misuse line. Notification only, not consent.
6. **Audit log.** Who searched, when, what was typed, what was returned and what was attached. Immutable, kept at least 1 year (DPDP Rule 6, CERT-In) [V-local 03]. The relative can ask what was accessed (DPDP s.11).
7. **"No match is never a rejection."** Enforced in the officer UI (no such reason code) and stated on every citizen screen.
8. **Human decides.** A hit is evidence, not a decision; the relationship must be confirmed by the officer.
9. **Fraud analytics.** One certificate cited by many unrelated applicants, or many searches with common surnames, goes to the existing ~10% verification sample (Rule 15(2)), not to automatic rejection.
10. **Purpose limitation.** Archive search data is used only for this application, and is not reused for profiling.

### 5.6 What we can demo in 1–2 days
Code is not changed by this report; this is the build plan.

**Day 1 (backend + page)**
- **Endpoint `POST /api/citizen/precheck`.** A thin wrapper over the existing `engine.precheck`:
  - requires `consent: true` and a simulated `aadhaar_ok: true`
  - returns only `{status: found_usable | found_review | not_found, masked_no: "••••4512", office, year, proof_ref}` plus the checklist
  - **strips** `holder_name`, full `cert_no`, village, category and validity detail
  - keeps a per-session counter (3 searches) and writes an audit row "citizen self-search".
- **Page `/nagrik`** (React; reuse `VillagePicker`, `Bi`, the illustrations):
  - S0 wizard, S2 search form, S3 result card, S4 no-papers path (generated declaration as HTML/PDF plus a vanshavali questionnaire), S6 preview box.
  - Hindi default, with an English toggle.
  - 🔊 via browser `speechSynthesis` (hi-IN), labelled "prototype voice".

**Day 2 (hand-off + polish)**
- On "submit", create an application in the demo store so it appears in the **SDO pending list**:
  - Sunita with the attachment "Archive-verified family certificate (citizen-cited) · relative notified".
  - Ramesh (OBC, no match, no papers) with "नियम 7 जांच — पटवारी 0/15".
- Mask the existing Kendra result in the same way (holder name hidden unless the number was typed).
- A simulated SMS toast for relative notification.

**Demo script (about 90 s):**
1. Sunita on her phone: S0, path A, then S2 (father Ramlal Markam, Bayanar), result "••••4512 · SDO कोंडागांव · 2019", attach; the upload step shows "जाति का प्रमाण ✓ (अभिलेखागार)" and the 1950 block optional.
2. Ramesh (OBC): not found, then "कागज़ नहीं", declaration read aloud, submitted. The receipt says "यह अस्वीकृति नहीं है" (this is not a rejection).
3. "Stranger" try: a random name gives "not found"; the 4th search gives a rate-limit message. Show the audit row.
4. Switch to the SDO console: both cases are there, already in the right lane.

### 5.7 Open questions for CHiPS / Revenue / GAD
1. Can CHiPS share counts of **caste and domicile drafts abandoned at the upload step**, and of "saved but unpaid" applications? This is the only way to size the "can't apply" problem.
2. What share of caste applications are filed online by citizens vs at a Kendra or camp?
3. What document do Kendras actually upload under **"Disability / Unavailability Proof"** today, and do SDOs accept it?
4. Who signs a circular on caste-evidence practice: **GAD** (it issued the Rohidas and fake-certificate orders) or **Revenue** (service owner on the portal), or both?
5. Is the OBC list ("father's certificate" only) a deliberate policy or a data-entry choice?
6. Does a Patwari or RI role exist in the Sewa Setu workflow for caste inquiries (Rule 7), or is the vanshavali always obtained offline?
7. Does the archive store the **father's name and village LGD** as structured fields for certificates since 2015? How many pre-2015 (CHOiCE-era) records were migrated?
8. What values does the upload "संलग्न प्रकार" dropdown take besides "अपलोड", and how does the "डिजिटल लॉकर" column work today?
9. Is the holder's mobile stored with each certificate (needed for relative notification)?
10. Has the post-Apr-2026 Sewa Setu form changed the 1950/1984 blocks from the Jan-2026 e-District manual we read?
11. Is the Raman Singh-era "Gram Panchayat proposal" order cited by the Nat community still in force, and has the state issued anything after the Baghel order?
12. Would Revenue accept an **archive-verified attachment** as equal to a scanned copy for evidentiary purposes (for s.12 officer protection)?
13. Is Aadhaar e-auth on the caste form covered by a s.7 or Good Governance notification? Can the e-auth result gate the search?
14. Which languages and voices are approved (Bhashini, Adi Vaani Gondi, Halbi, Chhattisgarhi) for citizen-facing legal text?

---

## 6. Biggest risks (be ready for these in Q&A)
1. **"Your premise is wrong; the form already accepts a family certificate."**
   - Concede it, with the screenshot. Then show the four real blocks: compulsory scan; OBC 1984 block mandatory; OBC father-only; district pages and practice demanding pre-1950 records.
   - Our point: "The option exists on paper; we make it usable without a scan, and we add a path for families with nothing."
2. **Exclusion persists if officers still reject.** The citizen panel only moves the problem forward unless the circular (§5.3) and the officer lane exist. That's why the officer panel stays.
3. **Privacy and caste exposure.** Any leak of who holds which caste certificate is serious. Mitigations: mask, rate limit, log, notify, and never show caste.
4. **Stranger claims and common surnames.** A hit is evidence, not proof. The relationship check stays with the officer; anomaly sampling feeds Rule 15(2).
5. **Archive depth.** The archive starts in 2015, so many fathers are missing. Option c, not a, carries the poorest families.
6. **Patwari load.** The no-papers path adds inquiries. Pilot it in 2 tehsils with a load cap, and measure it.
7. **Unverified details.** The Jan-2026 e-District manual may differ from the live post-Apr-2026 Sewa Setu form (Q10). The HC order date differs across outlets (20, 22 or 23 Jul 2026); quote it as "July 2026".

---

## 7. Sources (primary first)
**Sewa Setu and CHiPS**
- Service pages:
  - SC/ST: https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=4&lang=en (Hindi: &lang=hi)
  - OBC: serviceId=5
  - Domicile: serviceId=7
- User manuals:
  - SC/ST: https://sewasetu.cgstate.gov.in/resources/edistrict/user-manual/new/4.pdf
  - OBC: /new/5.pdf
  - Domicile: /new/7.pdf

**Law**
- CG Social Status Certification Rules 2013: https://indiankanoon.org/doc/156162861/
- DPDP Act s.7: https://www.dpdpa.com/dpdpa2023/chapter-2/section7.html ; DPDP Rules 2025 (see 03)

**CG commissions and district pages**
- https://cgsccommission.com/caste_certificate.php
- https://cgstcommission.org/cast_certi.html
- https://surajpur.nic.in/en/service/caste-certificate/

**News**
- The Sootr: https://thesootr.com/state/chhattisgarh/chhattisgarh-hc-caste-certificate-order-12182534
- NPG: https://npg.news/chhattisgarh/bilaspur-high-court-ne-jati-praman-patra-par-diya-bada-faisla-1950-ke-dastavez-jaruri-nahi-latest-cg-news-hindi-npg-22-07-2026-1315928
- INH News: https://www.inhnews.in/news/caste-certificate-to-be-issued-even-without-1950-documents
- Lalluram (Nat community): https://lalluram.com/the-nat-community-submitted-a-memorandum-addressed-to-deputy-chief-minister-arun-sao-after-failing-to-obtain-caste-certificates/
- Haribhoomi (Rohidas): https://www.haribhoomi.com/state-local/chhattishgarh/news/cg-government-rohidas-caste-certificate-issued-revenue-records-list-chamar-mochi-113405
- NPG (fake-certificate order, 14-08-2026): https://npg.news/chhattisgarh/chhattisgarh-farzi-caste-certificate-walon-ki-naukri-hogi-khatam-latest-cg-news-hindi-npg-14-08-2026-1317636

**Other states**
- MP:
  - https://mpedistrict.gov.in/MPL/ShowServiceDetail.aspx?param=iCoFEcVNnpk1iYzmNZ1haAeeyrqCKMoBMpJYxI6S+WMEm2WDPLy5xaKpf2vzl0WFzj6HDSEc1Fc%3D
  - https://septadeep.blogspot.com/2018/07/digital-caste-certificate-in-03-days.html
- AP: https://www.gsws.info/2022/04/guidelines-for-issue-of-integrated.html
- Haryana: https://csharyana.gov.in/WriteReadData/Instructions/General-Services-III/Intructions%2022-132-2013-1GS-III%20dated%2022-03-2022.pdf
- Maharashtra:
  - https://www.india.com/news/agencies/getting-caste-validity-certificate-made-easier-for-relatives-2512662/
  - https://www.verdictum.in/court-updates/high-courts/issuance-of-caste-certificate-to-blood-relatives-1482881
  - https://theprint.in/politics/reading-modi-script-mapping-family-trees-how-maharashtras-scouring-old-records-to-identify-kunbis/1840541/
- Rajasthan: https://janaadhaar.rajasthan.gov.in/content/raj/janaadhaar/en/faqs1.html
- J&K: https://www.newsonair.gov.in/govt-issues-guidelines-for-issuance-of-caste-certificates-to-landless-applicants-in-jk

**Languages**
- Adi Vaani: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2162846

**Our own files**
- 01_cg_data_sources.md (archive, API Setu, DigiLocker, Missal)
- 03_cg_policy_legal_admin.md (DPDP, Act s.10/s.12)
- 05_problem_validation.md (MIS rejection data)
- 07_sewasetu_officer_side.md (console)
- critique_2_citizen_operator.md (persona needs)
- STATE_COMPARISON.md
