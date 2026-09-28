# 01 — Chhattisgarh Data Sources for "Nirnay Sahayak" (feasibility validation)

Research date: 27 Sep 2026. Method: live inspection of public portals (API Setu directory, DigiLocker issuer directory, Sewa Setu, Bhuiyan, Khadya/SMART-PDS, Markfed, PIB), plus web search. Nothing was logged into or submitted. `[U]` = uncertain / not verified from a primary source. `[V]` = verified by direct inspection today.

---

## 0. Headline findings (read this first)

1. **Sewa Setu is already a DigiLocker issuer, and its certificates can be pulled through API Setu.** The API Setu collection `edistrictcg` ("Sewa Setu, Chhattisgarh", provided by DigiLocker) exposes 29–32 document endpoints. They include Income (`/incer`), Domicile (`/dmcer`), SC/ST (`/shcer`), OBC (`/obcer`), EWS (`/ewcer`), Income & Asset (`/iacer`), Ration Card (`/ratcr`), Birth, Death and Mutation. Certificates issued **on or after Jan 2018** can be pulled. The lookup key is **ARN + mobile number**, and the mobile must match the DigiLocker account. [V] https://directory.apisetu.gov.in/api-collection/edistrictcg ; DigiLocker issuer page https://www.digilocker.gov.in/web/dashboard/issuers/000094
2. **Land records (Bhuiyan) are also on API Setu/DigiLocker, but only as a single document type.** The "Commissioner Land Records, Chhattisgarh" collection `cgrevenue` has one endpoint, `/prcer` (Property Certificate). It is keyed by `KhasraNo` plus three location levels (district/tehsil/village). It returns the document as PDF, not structured data. [V] https://directory.apisetu.gov.in/api-collection/cgrevenue ; https://www.digilocker.gov.in/web/dashboard/issuers/035849
3. **The Food department's ration card is also on API Setu.** Collection `khadya` has `/ratcr` Ration Card, keyed by `RCnumber` + `FullName`, and returns a PDF. [V] https://directory.apisetu.gov.in/api-collection/khadya
4. **The Patwari prativedan is exactly the data the copilot needs to reproduce.** The standard CG "आय/जाति प्रमाण-पत्र — पटवारी प्रतिवेदन" form certifies these items: name, father's name, **caste**, residence (Patwari halka, tehsil), **land held in village X (acres/hectares)**, income from that land, other income (rent/business), total annual income, and **"son/brother/nephew/daughter of ___"**, which is a lineage link. [V] Form published by Balod district: https://cdn.s3waas.gov.in/s3c45147dee729311ef5b5c3003946c48f/uploads/2023/08/2023082263.pdf (page https://balod.gov.in/en/form/income-cast-patwari-prativedan-labour-registration/). Every field on it maps to Bhuiyan (land), the ration card (family, category) and past Sewa Setu certificates (caste, lineage).
5. **Historic caste evidence (Missal / Chakbandi) is digitised and searchable by name.** The "Missal Record Room" is run by the Commissioner Land Records and built by NIC. It allows village-wise or **name-wise (Hindi)** search across 21 legacy districts, with record type Missal or Chakbandi. It is **CAPTCHA-protected and has no API**. [V] https://revenue.cg.nic.in/missal/RecordSearchByName.aspx
6. **No public API was found for the core structured data** (Bhuiyan B-1/P-II as JSON, the ration card family roster, the UFP/Markfed farmer ledger or AgriStack). Every integration that exists runs government-to-government (G2G) through NIC: NGDRS↔Bhuiyan auto-mutation, Bhuiyan↔AgriStack↔UFP. A pilot therefore needs a CHiPS/NIC data-sharing MoU or a DB view. A hackathon demo should **mock** these sources.
7. **Sewa Setu is not built on NIC ServicePlus.** CHiPS states it is responsible for "platform development". CG's ServicePlus instance (serviceonline.gov.in/chhattisgarh) hosts only minor services. The practical consequence is that **Sewa Setu's own certificate archive is the most accessible data source of all**: CHiPS owns it, so no cross-department MoU is needed.

---

## 1. Source-by-source table

Feasibility scale (for a real CHiPS pilot, not the demo): **5** = API exists and CHiPS can call it or already owns the data; **4** = G2G integration exists and needs only an MoU; **3** = digitised and online but no API (DB view or scrape needs permission); **2** = partial or patchy digitisation; **1** = not digitised, or legally unusable.

| # | Source | Owner | URL | Data held (relevant fields) | Digitised / online | API / integration evidence | Feasibility |
|---|---|---|---|---|---|---|---|
| A | **Sewa Setu certificate archive** (income, domicile, SC/ST, OBC, EWS, since 2015 e-District) | CHiPS (Electronics & IT Dept), with Revenue Dept as the service owner | https://sewasetu.cgstate.gov.in | ARN, applicant, father/husband name, caste, sub-caste, address, income, issuing officer, date, digitally signed PDF | Yes. About 3.2 crore transactions historically [ThePrint, 29 Apr 2026] | DigiLocker issuer (29 doc types); API Setu `edistrictcg`, pull by ARN+mobile, docs since Jan 2018 [V]. Internally CHiPS owns the DB | **5** (internal DB) / **4** (via DigiLocker pull) |
| B | **Bhuiyan land records** (B-1 Khatauni, P-II Khasra, Bhu-Naksha, mutation, Rin Pustika, girdawari) | Revenue & Disaster Mgmt Dept / Commissioner Land Records; built by NIC | https://bhuiyan.cg.nic.in | Holder name, father's name, khasra, area, land type, irrigation, crop (girdawari), mortgages, mutation history. Caste column in B-1 is **[U]** | Yes. Free, digitally signed B-1/P-II; OTP + DSC entry by officials [V home page] | API Setu `cgrevenue` `/prcer` Property Certificate (PDF by KhasraNo) [V]. G2G: NGDRS auto-mutation (launched 3 May 2025), AgriStack, Unified Farmer Portal, "Aadhaar-mobile link" [NIC] | **4** (structured B-1 by holder name needs a NIC web service / MoU; the PDF pull already exists) |
| C | **Missal / Chakbandi record room** (pre-1950 land settlement records) | Commissioner Land Records; NIC | https://revenue.cg.nic.in/missal/ | Scanned historic records searchable by district→tehsil→village→name (Hindi) | Yes for 21 legacy districts [V dropdown] | None. CAPTCHA-protected web form | **2–3** (valuable for the caste check, but only as an officer-assist deep link; no automation) |
| D | **Ration card DB / SMART-PDS (AePDS)** | Food, Civil Supplies & Consumer Protection Dept; NIC | https://fcs.cg.gov.in ; https://khadya.cg.nic.in/pdsonline/ ; https://epos.cg.gov.in | Card no., category (Antyodaya/Priority/APL etc.), HoF, member roster with relationships, FPS, **caste category of card** (a caste/category-wise report exists), e-KYC status, monthly offtake | Yes. About 80.6 lakh cards / 2.5+ crore beneficiaries [U, secondary]. **2,32,12,736 beneficiaries e-KYC-verified** (SMART-PDS "Beneficiary Verification Abstract", 27 Sep 2026) [V] | API Setu `khadya` `/ratcr` (PDF by RC no.+name) [V]; DigiLocker issuer [V]; national IM-PDS/ONORC. Structured member API not public | **4** |
| E | **AgriStack CG Farmer Registry** | Agriculture Dept (state) on the MoA&FW AgriStack DPI | https://cgfr.agristack.gov.in/farmer-registry-cg/ | Farmer ID ↔ Aadhaar ↔ Bhuiyan land parcels, crop survey | Yes. **32,86,170 Farmer IDs as of 19.03.2026** (PIB Annexure) [V] | Land auto-linked from Bhuiyan; used for MSP procurement. Consent-based registry APIs exist nationally for govt users **[U]** | **3–4** |
| F | **Unified Farmer Portal (UFP / Ekikrit Kisan Portal) + Markfed paddy procurement** | Agriculture / Food / Markfed | https://rgkny.cg.nic.in/ ; https://markfed.cg.gov.in ; public lookup https://cgpaddyonline.co.in/markfedhq21/RptViewFarmerDetail.aspx | Registered area, crop, paddy sold (quintals) per kharif year 22-23 to 26-27, payments. The Krishak Unnati top-up (₹3,100/qtl total) makes paddy income quantifiable | Yes. 27.40 lakh farmers / 34.39 lakh ha registered for KMS 2025-26 [secondary: ricenewstoday/newkerala] | Public lookup by Farmer code / UFP ID / AgriStack ID [V]. No published API | **3** (strong income signal for farm households) |
| G | **PM-KISAN** | MoA&FW (GoI) | https://pmkisan.gov.in | Beneficiary status (implies landholding; excludes income-tax payers) | Yes | No state-usable public API **[U]** | **2** (weak signal; skip) |
| H | **Birth & Death (CRS)** | RGI / CG Directorate of Economics & Statistics / local registrars | https://crsorgi.gov.in ; DigiLocker issuer "Registrar General of India, Chhattisgarh" https://www.digilocker.gov.in/web/dashboard/issuers/045706 | Birth/death certificates (place of birth → domicile condition 1; parents' names → lineage) | Yes, from Aug 2015 onward on DigiLocker [V] | DigiLocker pull [V] | **4** (post-2015 births only, so mostly useful for minors) |
| I | **e-Panjiyan / NGDRS (registration)** | Registration Dept (Mahanirikshak Panjeeyan) | https://epanjeeyan.cg.gov.in ; https://ngdrs.cg.gov.in | Registered deeds, party names, khasra, consideration value | Yes. Online document search by party name or khasra [NIC, May 2025] | DigiLocker issuer ("Copy of Registered Deed") [V]; G2G auto-mutation to Bhuiyan [V] | **3** (useful for domicile "property ≥5 yrs" and for income anomalies) |
| J | **Treasury / pension** | Directorate Treasury, Accounts & Pension CG | DigiLocker issuer https://www.digilocker.gov.in/web/dashboard/issuers/003917 | ePPO, GPF statement, gratuity/commutation orders, ID card for state govt employees (retirees from 2018) | Yes [V] | DigiLocker pull [V] | **3** (income evidence for govt employees/pensioners only) |
| K | **CGBSE marksheets** | CG Board of Secondary Education | DigiLocker issuer (listed under "Chhattisgarh") | Name, DOB, school → proof of schooling in CG (domicile) | Yes [V listed] | DigiLocker pull | **3** |
| L | **Mahtari Vandan Yojana beneficiary DB** | Women & Child Development | https://mahtarivandan.cgstate.gov.in | Married women; Aadhaar, bank, DBT | Yes | None public | **1–2** (no income/caste value; privacy risk; drop) |
| M | **State family/household registry** (Samagra/Parivar-Pehchan style) | none found | none | none | **Not found.** No CG equivalent of MP Samagra, Haryana PPP or Rajasthan Jan Aadhaar was located [U, search budget exhausted] | none | **1** (do not claim it) |
| N | **Aadhaar** | UIDAI | https://uidai.gov.in | Identity; offline e-KYC XML / Secure QR | Yes | Sewa Setu already uses Aadhaar e-KYC for registration [ThePrint]. Use is governed by Aadhaar Act s.7 notifications per scheme. CG issued such a notification for a grant scheme (Jun 2026) [U, headline only: https://www.legalitysimplified.com/chhattisgarh-notifies-aadhaar-authentication-and-alternative-identification-mechanism-for-government-scheme-benefits/] | **3** (use as a join key only where the notification covers it; never as a reason to reject) |
| O | **e-Pramaan / DigiLocker SSO** | MeitY / NeGD | https://epramaan.meripehchaan.gov.in | Officer/citizen SSO | Yes | Sewa Setu is integrated with DigiLocker, e-Pramaan and UMANG [ThePrint] | **5** (auth for the copilot UI) |

---

## 2. Detail by topic

### 2.1 Bhuiyan / land (item 1 of brief)
- The portal has B-1/P-II retrieval, retrieval by document ID, **digitally signed B-1/P-II**, khasra details, govt land, mortgaged khasra, mutation status, registered-mutation reports, revenue court cases, crop-wise area (girdawari), crop-cutting experiments, a bank login and an Android app. [V] https://bhuiyan.cg.nic.in
- NIC describes Bhuiyan features as "auto-mutation, Digital Rin Pustika, Girdawari, Aadhaar-mobile link, and integration with NGDRS, Agristack and the Unified Farmer Portal". https://x.com/NICMeity/status/1998363683647606997 (also on Threads).
- **Aadhaar seeding** is a citizen-initiated "Bhumiswami Aadhaar e-KYC" with Patwari approval [secondary: https://patwarig.com/bhumiswami-aadhar-e-kyc/]. The coverage % is **[U]**.
- **NGDRS / e-Panjiyan**: 10 services were launched on 3 May 2025, including Auto-Mutation (NGDRS→Bhuiyan), online document search by party name/khasra, and certified copy download. https://informatics.nic.in/news/1531 [V]
- **ULPIN / Bhu-Aadhaar**: rolled out in CG. The "60–90% coverage" figure comes from secondary sources only **[U]**. DoLR programme page: https://dolr.gov.in/en/ulpin/
- **API**: only the DigiLocker "Property Certificate" (`/prcer`, keyed by KhasraNo + 3 location levels, PDF response) [V]. A lookup of all holdings of a named person/family (which the copilot needs) is **not** public. It would need a NIC web service. The G2G links to AgriStack/UFP/NGDRS prove NIC can provide one.

### 2.2 Ration card / PDS (item 2)
- The **CG Food and Nutritional Security Act 2012** groups households as Antyodaya, Priority, General and Excluded. The exclusion criteria are an income-tax payer in the household, >4 ha irrigated / >8 ha unirrigated land (non-scheduled areas), or liability for urban property tax. https://en.wikipedia.org/wiki/Chhattisgarh_Food_Security_Act,_2012 ; India Code https://www.indiacode.nic.in/handle/123456789/12572 ; Ration Card Rules 2016 and the PDS Control Order are linked from https://fcs.cg.gov.in
- The **category is an income proxy**: Antyodaya is described as <₹15,000/yr (secondary, cleartax). An **APL/General card, or exclusion** conflicts with a low declared income. This makes it a good AMBER flag, but it cannot prove anything on its own.
- Public report menus [V] https://khadya.cg.nic.in/pdsonline/RationCardRPT.aspx: beneficiary detail by district, **village/ward-wise card-wise listing**, FPS-wise card-wise listing, and **caste/category-wise ration card report** (JilewarCasteReport.aspx). The reports returned "Service Unavailable" today.
- **SMART-PDS / AePDS** (https://epos.cg.gov.in) [V] has Beneficiary Details, Beneficiary Verification, ONORC e-KYC, and monthly transactions. Beneficiary Verification Abstract total: **2,32,12,736** e-KYC "key register" records across 33 districts (27 Sep 2026). A headline reports "85% ration card members complete e-KYC" with 2.73 crore people under PDS **[U, headline only]**.
- **API**: API Setu `khadya` `/ratcr` (RCnumber + FullName → PDF) [V]. A structured member roster API is **[U]**. It exists G2G via IM-PDS but has not been published.

### 2.3 AgriStack / UFP / Markfed / PM-KISAN (item 3)
- PIB, 24 Mar 2026: **CG 32,86,170 Farmer IDs** (as of 19.03.2026). "Chhattisgarh has institutionalized Farmer ID and Digital Crop Survey for MSP-based paddy procurement, covering over 32 lakh farmers in a single season." https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244626 [V]
- KMS 2025-26: registration ran through AgriStack + the Integrated Farmer Portal. 27.40 lakh farmers were registered over 34.39 lakh ha and ₹7,771 cr was paid by 11 Dec 2025 [secondary: https://ricenewstoday.com/chhattisgarh-records-87-lakh-tonnes-paddy-procurement-under-msp-%E2%82%B97771-crore-paid-to-farmers/].
- Krishak Unnati Yojana gives ₹3,100/qtl effective (MSP + state top-up); Markfed implements it and UFP registration is mandatory [secondary: govtschemesindia]. **Paddy sold × ₹3,100 gives a hard floor on agricultural receipts**, which is a strong check for income certificates of farm families.
- The Markfed public lookup (Farmer code / UFP ID / AgriStack Farmer ID, kharif 22-23 to 26-27) is [V] at https://cgpaddyonline.co.in/markfedhq21/RptViewFarmerDetail.aspx. No API.

### 2.4 Sewa Setu / DigiLocker / QR (item 4)
- Upgraded Sewa Setu launched 29 Apr 2026. It offers 441 services and integrates Aadhaar e-KYC, DigiLocker, e-Pramaan, UMANG, WhatsApp, Bhashini and AI, with QR-based certificate verification. ThePrint reports "3.2 crore transactions" historically. https://theprint.in/india/chhattisgarh-cm-launches-upgraded-seva-setu-portal-to-expand-digital-access-to-govt-services/2917917/
- About Us [V] https://sewasetu.cgstate.gov.in/redirectPage1.do?pageName=about-us&lang=en gives the timeline: CHOiCE (2003) → e-District (2015) → Sewa Setu (2026). It lists "digitally-signed certificates with QR-based verification". CHiPS is the "nodal agency responsible for project implementation, **platform development**…", with DeGS and e-District Managers at district level.
- **Public verify URL: not found.** The home page, FAQ and Track page (ARN or name + district + service + dates + CAPTCHA) show no "verify certificate" link, and edistrict.cgstate.gov.in redirects to Sewa Setu. Third-party sites claim a "Certificate Verification" section exists **[U]**. The QR probably resolves to a verify endpoint that is reachable only by scanning.
- DigiLocker issuer list for "Chhattisgarh" (53 issuers) [V]. Govt-document issuers relevant here:
  - Sewa Setu, Chhattisgarh (29 docs)
  - Commissioner Land Records (Property Certificate)
  - Food Civil Supplies & Consumer Protection (Ration Card)
  - Registrar General of India, Chhattisgarh (Birth, Death)
  - Mahanirikshak Panjeeyan (Copy of Registered Deed)
  - Transport Dept (DL, RC)
  - Directorate Treasury Accounts & Pension (6 docs)
  - CGBSE
  - Dept of Commerce & Industry (15 docs)
  - CSPDCL (electricity bill → residence proof)

### 2.5 Caste certificate system (item 5)
- **Act**: Chhattisgarh SC, ST and OBC (Regulation of Social Status Certification) Act, 2013. India Code https://www.indiacode.nic.in/handle/123456789/12777 (reported in force from 23 Apr 2013). **Rules**: Social Status Certificate Rules 2013, Rule 3(3) lists the evidence. https://cgstcommission.org/cast_certi.html
- **Cut-off dates**: SC 10.08.1950, ST 06.09.1950, OBC 26.12.1984. Ancestors must have been original residents of CG territory on those dates. https://cgsccommission.com/caste_certificate.php
- **Accepted evidence** (CG SC Commission; Sewa Setu SC/ST service page): Missal records, revenue jamabandi/girdawari (pre-1950), P-6 Jamabandi, Adhikar Abhilekh / Record of Rights, Dakhil-Kharij register, pre-cutoff school admission registers, birth/death registers, **Census Register 1931**, **Citizen Register 1949**, Patwari vanshavali (genealogy), a **Gram Sabha resolution** for landless applicants, and a **father's/family member's caste certificate**. https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=4&lang=en
- **Authorities**: permanent certificates are issued by SDO (Revenue)/Deputy Collector. Tahsildar/Naib Tahsildar issue **temporary** certificates (6 months; elections, scholarships, admissions). SLA is 22 days on Sewa Setu and validity is "permanent unless otherwise directed". About 10% of certificates are randomly verified. https://cgstcommission.org/cast_certi.html
- **Scrutiny**: a 7-member **High Power (उच्च स्तरीय) Certification Scrutiny Committee** chaired by the Principal Secretary, with regional units (Jagdalpur, Ambikapur, Bilaspur) per the CG SC Commission. https://npg.news/bureaucrats/cg-pramukh-sachiv-sonmani-bora-ki-adhykshata-me-chhanbin-samiti-ki-baithak-17-prakarnon-me-ki-gai-sunwai-aadesh-jari-karane-ke-nirdesh-1305444 . A Mar 2026 HC ruling held that the district-level verification committee cannot cancel a certificate [U, news: mooknayaknews.com].
- **School campaign**: class 9–12 students are issued caste certificates through schools with random-sample verification (cgstcommission page). No specific 2024-26 campaign figures were found **[U]**.
- **Implication**: the "family-lineage consistency check" rests on firm legal ground, because a father's or sibling's certificate is accepted evidence. The strongest digital form of that check is a **match against Sewa Setu's own archive** (same father name + village + caste). The **Missal name search** can serve as an officer-assist link.

### 2.6 Family / household registry (item 6)
- **No CG state family registry was found** (no Samagra, PPP or Jan Aadhaar equivalent) **[U]**. The de-facto family roster is the **ration card** (Food Act 2012 households), with near-universal coverage.
- Mahtari Vandan (WCD) holds married-women beneficiaries with Aadhaar and bank details. It has no income or caste fields useful here. https://mahtarivandan.cgstate.gov.in
- SECC-2011 is dated and unsuitable. NFHS is survey data, not a registry.

### 2.7 Birth/death and Aadhaar (item 7)
- CRS certificates since Aug 2015 are on DigiLocker via "Registrar General of India, Chhattisgarh" [V].
- Aadhaar s.7 notifications are scheme-specific. National NFSA PDS is under a DFPD s.7 notification (https://dfpd.gov.in/distribution-of-food-grains/en). A CG June 2026 notification for a grant scheme appears in legal-news headlines **[U]**. Certificate issuance itself is not a s.7 "benefit", so using Aadhaar as a verification join key needs a legal basis via the Aadhaar Authentication for Good Governance Rules 2020 **[U; flag to legal track]**.

### 2.8 Income certificate process (item 8)
- On Sewa Setu the **affidavit is mandatory**. Income proof is a mandatory "Certificate from Patwari/Sarpanch/Parshad", or an employer certificate, Form 16, or land/house income papers, plus family members' income details. SLA is **7 days**, fee ₹30, **validity one year**. https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=6&lang=en [V]
- District pages list: Patwari report, class 5/8 certificate, **self-declaration**, current-year **B-1 (for agricultural income)**, ID and pay slip. https://surajpur.nic.in/en/service/income-certificate/
- The Patwari prativedan fields are listed in §0 point 4 [V].
- **Affidavit abolition / self-certification**: no CG order abolishing affidavits for income, caste or domicile was found. Sewa Setu still lists the affidavit as mandatory for income, OBC, SC/ST and domicile **[U; the GoI 2013 self-certification advisory exists: https://darpg.gov.in/sites/default/files/Adoption_of_self_certification.pdf]**.
- **Domicile**: the conditions are born in CG, or 15 yrs continuous residence (self/parent/guardian), or parent a state/central govt employee in CG, or property/business in CG for 5 years. https://mahasamund.gov.in/en/service/residence-certificate/ . The Sewa Setu domicile service needs an affidavit + class-8 certificate + 15-year residence proof; SLA 7 days. https://sewasetu.cgstate.gov.in/instractionPageNew.do?serviceId=7&lang=en . The GAD order number is **[U]**.

### 2.9 National platforms (item 9)
- **API Setu certificate API v3** (base `https://apisetu.gov.in/certificate/v3/{org}`). It is a POST with `txnId`, `format` (pdf/xml/json per spec, though CG entries show a PDF example), `certificateParameters` and a signed **consentArtifact** (consentId, dataConsumer, dataProvider, purpose, user idType/idNumber/mobile, permission dateRange). The consuming government department subscribes as a Requester. [V] endpoints: `edistrictcg/*`, `cgrevenue/prcer`, `khadya/ratcr`.
- Caveats: responses for CG are shown as **PDF**, so the copilot would need to parse XML (if the issuer supports it) or run OCR on the PDF **[U whether XML is enabled for CG issuers]**. Consent is citizen-scoped. Pulls **by ARN+mobile** only work if the applicant supplies the relative's ARN and the relative's registered mobile.
- **e-Pramaan**: already integrated with Sewa Setu and suitable for officer SSO.
- **Aadhaar offline e-KYC / Secure QR**: usable for identity confirmation without an AUA licence **[U specific URL]**.

### 2.10 Platform (item 10)
- Sewa Setu / e-District CG is a **custom CHiPS platform** (Java-style `.do` / `workflow/*.html` endpoints). It has a separate admin host (`admin-ed.cgstate.gov.in`), a public **test instance** (`test-ed.cgstate.gov.in`), and a legacy alias `cgedistrict.cgstate.gov.in` [V URLs]. About Us attributes "platform development" to CHiPS [V]. The original e-District system integrator is **[U]**.
- NIC **ServicePlus** has a CG instance (https://serviceonline.gov.in/chhattisgarh/). It hosts only minor services (forest safari, colony approval, CM relief fund) and is **not** the certificate platform [V].
- No published integration/API docs for Sewa Setu exist beyond the API Setu/DigiLocker issuer spec [V].

---

## 3. Implications for the proposal

**Realistic for a CHiPS pilot, in priority order:**
1. **Sewa Setu's own archive (Source A).** This is the strongest and cheapest source. It supports a lineage match (father's or sibling's prior caste certificate: same father name + village + caste), a prior income certificate for the same household, duplicate/repeat-application detection, and district rejection-reason mining. CHiPS owns the data, so no MoU is needed.
2. **Bhuiyan B-1 by holder name + village (Source B).** This replicates the land half of the Patwari prativedan. It needs a NIC web service; the auto-mutation/AgriStack/UFP integrations prove the pattern exists. Meanwhile, the DigiLocker `/prcer` pull by khasra is available if the applicant supplies a khasra number.
3. **Ration card (Source D)**, via API Setu `/ratcr` now or a Food-dept G2G feed later. It provides the family roster (relationship check), category (income-plausibility flag) and caste category.
4. **Markfed/UFP paddy sales (Source F)**, for farm-income plausibility. Quintals × ₹3,100 gives the floor.

**Downgrade or drop:**
- **Drop** Mahtari Vandan, PM-KISAN, SECC and any "CG family registry". None exists or adds value, and claiming one would hurt credibility.
- **Downgrade** Missal/1950s records to an "officer-assist deep link" (CAPTCHA, scanned, no API). Do not claim automated pre-1950 verification.
- **Downgrade** Aadhaar to identity confirmation only. Aadhaar-based cross-DB joins need an s.7 / Good-Governance-Rules basis for certificate services **[U]**. Prefer joins on ARN, ration card no., khasra, name + father name + village.
- Treat the ration card category as a soft signal only. Categories are sticky and stale; AMBER only, never a rejection reason.

**What the demo should mock (and say so on screen):**
- A synthetic Sewa Setu application queue (income/domicile/caste) with realistic ARNs, a Patwari prativedan, and uploaded affidavit/B-1 PDFs.
- Mock "Bhuiyan B-1 service" JSON: holder, father, caste [U], khasra list, area, irrigation, girdawari crop.
- Mock ration card JSON: card no., category, members + relation, HoF caste category, e-KYC flags.
- Mock Markfed/UFP ledger: kharif year, quintals sold, amount.
- Mock "prior certificates" table from the Sewa Setu archive, for the lineage match.
- A **real** API Setu call shape for `edistrictcg/incer`, `cgrevenue/prcer` and `khadya/ratcr` (request schema copied from the directory). This shows a production path without live credentials.

**Talking point for judges:** "Every check Nirnay Sahayak runs is one a Patwari or Tehsildar already does by hand from the prativedan form. The land, family and prior-certificate data already sits in CHiPS/NIC systems, and three of those systems are already on API Setu. The pilot needs one NIC B-1 web service and read access to Sewa Setu's own archive, not new data collection."

---

## 4. Open items `[U]` to confirm with CHiPS/NIC
- Whether B-1 carries a caste column in CG; whether Bhuiyan has an internal name-search web service.
- Whether API Setu CG issuers return XML/JSON (not just PDF).
- The public QR verify endpoint for Sewa Setu certificates.
- Whether any CG order (2019–2026) dropped the affidavit for income, caste or domicile.
- The Aadhaar s.7 / Good-Governance-Rules notification covering Revenue certificate services.
- Aadhaar-seeding % for Bhuiyan landholders; current ration card totals by category.
