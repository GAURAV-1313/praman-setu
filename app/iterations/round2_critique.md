# Round 2 critique: liability, legal defensibility and automation bias
27-09-2026. Two reviewers, both composite (not real people):
- **(a) An SDO (Revenue), 9 years' service.** Has faced High Court writs on caste certificate rejections and fears vigilance if a fake certificate slips through.
- **(b) A Naib Tehsildar/Tehsildar** who handles domicile certificates.

Question for every screen and every order: *"If I sign this and it is challenged before the HC, the Scrutiny Committee or vigilance, does the screen and the order protect me? Does it nudge me to rubber-stamp?"*

**Method**
- Used the live app (:5173, backend :8000) at 1366×768 and at 375 px, after `POST /api/reset`.
- **SDO cases:** 08812, 08790, 08835, 08841, 08856, 08863, 08870, plus background cases 08749, 08845, 08710, 08721, 08754, 08766, 08785, 08838, 08816.
- **Tehsildar cases:** 08902 and 08857.
- Signed 08812 (confirm + approve) and 08841 (reject) end to end. Read the stored `state.json` and `/api/audit`.
- All server drafts were dumped via the API, and the client drafts were read in `ActionPanel.tsx clientDraft()`.
- No code was edited. Backend reset and `ps_*` session keys cleared at the end (audit empty).

**Legal grounding**
- `research/03` §4.2 and §4.8: Jadeja 1995, Kranti Associates 2010, Madhuri Patil 1994, Kerala HC AI policy of Jul 2025, CG HC 22-07-2026, DPDP Rule 5.
- The Act and Rules were re-checked today against indiankanoon (doc 156162861) and casemine:
  - The **exact title** is *"Chhattisgarh Scheduled Castes, Scheduled Tribes and Other Backward Classes (Regulation of Social Status Certification) Act / Rules, 2013"*.
  - **r.3(3)** requires:
    - an affidavit in Form-2A
    - a **Patwari family tree covering three generations**
    - residence proof before the notification date (SC 10-08-1950, ST 06-09-1950, OBC 26-12-1984), which can be revenue records, census entries, a relative's certificate or a Gram Sabha resolution
    - **for OBC, the father's income certificate for the preceding year**
  - **r.7:** the inquiry officer is assigned within 15 days.
  - **r.8:** sets the scope of the inquiry.
  - **Act s.4:** the Competent Authority issues after inquiry, **or rejects with written reasons**.
  - **s.5:** appeal **within 30 days**.
  - **s.12:** prosecution needs Government sanction.
  - **s.15:** the burden of proof is on the applicant.
  - **r.18:** reasons plus a hearing at the verification stage.
  - The name of the appellate authority was **not** found in the text. **[verify before stage]**

---

## 0. Verdict in five lines
1. **The screens are now honest about evidence. The signed orders are not yet defensible.** Every signed order still begins "DRAFT ORDER — for the competent officer's review…". It cites a statute by the **wrong name**, calls the tool's own summary the "Findings of the undersigned", and says "All required documents are on file" when r.3(3) documents (Patwari vanshavali, OBC income certificate) are not even on the checklist.
2. **The rubber-stamp path is 2–3 keystrokes, and the officer never sees the order.** On 08812, pressing C, then Ctrl+↵, then ↵ signs an order whose text sits below the fold (the draft textarea starts at Y=791 in a 768 px viewport). The sign modal then attests *"you have read the records and the draft"* without showing the draft.
3. **"Confirm relationship" is a one-keystroke legal act with no reason, no "not this family" alternative and no undo.** It becomes the sentence "relationship … confirmed by the undersigned on 27-09-2026" in the order. That is conclusory, and it is exactly what a writ calls non-speaking.
4. **Reject has no due process.** An officer can reject on adverse archive material (08841: a brother's OBC certificate) with no show-cause or hearing. The order then lists that certificate as "**not relied upon**" while the finding relies on it. The appeal clause names no authority and no time limit. The reference drafts promise *"The applicant will be heard before any adverse decision"*, and the reject path breaks that promise.
5. **The audit trail proves agreement, not diligence.** It records "Suggested: approve; officer decided: approve" but not:
   - what the screen showed (model and rules version, flags, validity, link strength)
   - whether the order was the unedited system text
   - the basis for the confirmation

   To vigilance this reads as "the officer agreed with the machine", which is the worst possible exhibit.

---

## 1. Walkthrough findings (as the SDO / Tehsildar)

### 1.1 08812 Sunita: found father's certificate, confirm → approve
- **Before confirming**, the right panel shows:
  - "Evidence: Father's certificate found · **98%** · confirm relationship"
  - the tiles
  - "**Records suggest: Approve** — Likely approvable once you confirm…"
  - one big green button, "✓ **Confirm relationship first (Father)**"
- The only primary action is to *agree with the model's link*. There is no equal-weight "Not the applicant's father" option.
- **The recommendation and a 98% figure are both visible before any comparison row.** This is the Goddard/Buçinca anchoring pattern.
- **Pressing `C`** (a global key, with no dialog) confirmed at once:
  - Approve became pre-selected and the lane flipped to "Records complete".
  - **No undo exists** (no button, no API).
  - Audit: `relationship_confirmed`, with actor "SDO (Revenue), Kondagaon **(demo)**" and no basis recorded.
- **Draft finding after confirm (Hindi, what gets signed):**
  > "प्रमाण पत्र क्र. CG/KDG/SDO/2019/004512 के धारक (पिता) से आवेदक का संबंध अधोहस्ताक्षरी द्वारा 27-09-2026 को पुष्ट है।"
  >
  > ("The applicant's relationship with the holder of certificate No. CG/KDG/SDO/2019/004512 (father) is confirmed by the undersigned on 27-09-2026.")
  - It gives **no reason for the confirmation.**
  - It never mentions the name discrepancy "Ramlal Markam ↔ Ram Lal Markaam", the one fact a lawyer will attack.
  - The only corroboration (ration roster: applicant listed in Ramlal's household) is filed under "Other records seen (**not relied upon**)". So the order disowns the very evidence that justifies the confirmation.
- **Ctrl+↵ opens a modal showing:**
  - Action, Application, "Relied on: CG/KDG/SDO/2019/004512", Signed by
  - *"By e-signing you confirm you have read the records and the draft"*
  - **no order text**
- **↵ signs the order and auto-advances to 08710.**
  - The toast offers "View message" and "Open", but **no callback/undo**.
  - The officer never saw what was signed.
- **Stored signed text (`state.json`)** begins `"DRAFT ORDER — for the competent officer's review, edit and e-signature"` and `"आदेश का प्रारूप — …"`. **A signed "draft".**
- **"All required documents are on file"** appears although neither the Patwari vanshavali (r.3(3)) nor the pre-1950 record is on file; the checklist shows `record_1950` as not uploaded.

### 1.2 08790 Rohit: declared sister's certificate
- "Declared at Kendra & matched — no confirmation needed." Approve is pre-selected: **2 keystrokes** to a signed ST order.
- **The finding is machine-written:**
  > "relationship … was declared by the applicant at the Kendra and **matched with the archive**."
  - This makes the machine match the basis for the relationship.
  - Legally, the protected basis is the applicant's **Form-2A affidavit** (s.12 shields due diligence on affidavits; s.15 puts the burden on the applicant). "Matched with the archive" makes the tool the witness.
- **No Patwari family tree is on file** (documents: affidavit, ID, family certificate), yet the order says "All required documents are on file".
- **Lane text** reads *"a **verified** family certificate supports this application"*. It was declared and matched, not verified.

### 1.3 08835 Pooja: send back (notice)
- The notice is plain, specific, carries "no new fee", and is correctly **not** an order. Good.
- **Legal gaps:**
  - It does not say what happens after 30 days: decided on the record, closed, or treated as withdrawn.
  - It does not say whether the Lok Sewa Guarantee clock pauses.
  - "30 days" is not tied to any rule or instruction.
- **Female, no match.** The no-match card says "This is neutral… first in their family… moved from another district".
  - It says **nothing about married women or surname change**, although the model's own evaluation shows **women recall 0.33 at "exact"** (vs 0.48 overall).
  - For a woman, "no family record" is two-thirds likely to be a model miss, and the screen does not say so.

### 1.4 08841 Kiran: brother's certificate records OBC (Kalar), claim ST
- The flag is on top and correct. Refer → Patwari is pre-selected.
- **I chose Reject instead (X)** and wrote a 63-character finding.
  - **Nothing required a show-cause or hearing.** The adverse fact comes from a third party's record in the archive, and the applicant never had a chance to explain it (half-siblings, a wrong dropdown in 2020, and so on). Madhuri Patil and natural justice require that chance. DPDP's accuracy standard requires the adverse data point to be disclosed and contestable **before** it is used against the applicant.
- **Reject draft (client template), quoted:**
  > "Records examined: … Brother's certificate No. CG/KDG/SDO/2020/003318 (status: active) — **not relied upon**"
  >
  > "Findings of the undersigned: Brother's certificate records OBC (Kalar)…"
  >
  > "The applicant may appeal to **the competent appellate authority**."
  - The order is self-contradictory: it relies on a record it says it does not rely on.
  - It has **no legal basis section**: no s.4 (reject with written reasons), no s.15 (burden), no s.5 (30-day appeal).
  - The Hindi order carries the **English** finding verbatim, so the two language versions differ.
- **Sign modal bug:** it showed "✕ Reject **→ Patwari field report (Rule 8 enquiry)**", because `referLabel` is passed whenever `referTo` is set.
- **Citizen WhatsApp message:**
  > "अधिकारी का कारण: Brother's certificate records OBC (Kalar). ST claim not proved.। आप अपील कर सकते हैं…"
  >
  > ("Officer's reason: Brother's certificate records OBC (Kalar). ST claim not proved.. You may appeal…")
  - An English reason inside a Hindi message, with doubled punctuation.
  - No appellate authority, no 30-day limit, no link to the order.
  - It discloses a relative's caste on WhatsApp.
  - It still carries the badge "✓ जांचा गया: हर संख्या और नाम अभिलेखों से सत्यापित" ("✓ Checked: every number and name verified from records") over the officer's free text.

### 1.5 08856 Meena: father's certificate cancelled (2024)
- The headline is right ("CANCELLED (2024) — cannot be used as proof"). The applicant has a **school record showing caste** on file.
- **Reference to the Patwari:** it pastes tool advice into a legal document:
  > "1. The father's certificate is cancelled — … A cancelled certificate cannot be used as evidence. **Decide on the applicant's own evidence — a Patwari field report (Rule 8 enquiry) is suggested.**"
  - The addressee is the Patwari, who cannot "decide".
  - There are **no terms of reference**: what to report (three-generation vanshavali, the family's caste in revenue records, residence before 06-09-1950, statements under r.8).
  - There is **no report-by date**, although the SLA runs 22 days.
- **Missing: the cancellation order itself** (committee order No./date and grounds). A parent's certificate cancelled by the Scrutiny Committee is the strongest adverse fact in the whole demo. The officer must read *why* (fraud versus a technical defect) before deciding. `status_note` holds only "Cancelled by the District Verification (Scrutiny) Committee, 2024".
- **"(mock)"** appears inside the order text ("Bhuiyan land record (mock)…"). Keep that in the UI chip, not in a legal document.

### 1.6 08863 Anil: father's permanent certificate issued by a Tehsildar, 2017
- The wording "competence under review after CG HC Jul 2026; department policy pending" is good. It does not overclaim.
- **The legal basis cites "CG High Court, 22-07-2026 — …"** with no case title or number. An order citing an HC ruling needs the cause title (e.g. *Shailey Sonkar v. State of CG*, WPC No. … [verify]).
- **The Patwari refer option is allowed with no warning.** A Patwari cannot answer a question about the competence of the issuing authority. Only the Scrutiny Committee or the department can.
- The reference again pastes "Do not rely on it as proof until it is verified — the District Verification (Scrutiny) Committee can verify it." (tool voice).

### 1.7 08870 Ramesh: OBC, no family record, approve
- **An OBC approval with no creamy-layer or income evidence.** r.3(3) requires the father's income certificate for the preceding year for OBC. The checklist never asks for it, and the order says "All required documents are on file".
- **Machine-written finding:**
  > "The documents on file were examined by the undersigned. No family certificate was found in the archive; the claim rests on the documents: School record (scholar register / TC) showing caste."
  - This is a pre-written attestation that the officer examined documents, identical across every no-record approval.
  - It is the **cyclostyled-order** pattern that the SDO critique (§4) says the HC strikes down.
  - It never identifies *which* school record, whose caste it records, its date, or whether it proves residence before 26-12-1984.
- **Legal basis:** "Rules, 2013 — the claim is examined on the documents on file." This is not a rule, just a sentence dressed as one.

### 1.8 Background cases that expose the riskiest paths
- **08749 Babita Kawasi (OBC, "Records complete", Approve pre-selected, 2 keystrokes):**
  - A **second record, a temporary ST (Kanwar) certificate in the father's exact name "Dilip Kawasi"** (Tehsildar Dhanora, 2025, 62% "possible"), appears only as an info flag: "Possible family record — check before using".
  - The flag title hides the conflict (ST vs the OBC claim).
  - **The order does not mention it at all.** It is not even under "seen, not relied upon", because `seen` only lists exact matches.
  - Vigilance scenario: *"The system showed you the father may hold an ST certificate; you issued OBC in two keystrokes and your order is silent."*
- **08845 Jagdish Thakur (ST, Sarpanch certificate only, possible father's certificate at 70%):**
  - Approve is pre-selected, no finding is required, and it takes 2 keystrokes.
  - **The order states a falsehood:** "No family certificate was found in the archive". The screen shows a 70% possible father's certificate.
  - An ST permanent certificate on a Sarpanch letter alone is exactly the fake-Baiga pattern (research 03 §6).
- **08710 Budhram Markam:** the same no-record 2-keystroke path, with the same boilerplate finding.
- **08766 Laxmi Kawasi:**
  - The brother's certificate is **temporary**, yet the attention flag says "the brother's **permanent** certificate was issued by a Tehsildar — competence under review" and routes to the Scrutiny Committee.
  - Tehsildars *are* competent for temporary certificates.
  - The real reason (a temporary certificate is never lineage proof) is only an "info" flag.
  - The queue summary ("TEMPORARY") and the flag ("permanent") contradict each other.
- **08721 Samundri Manjhi:**
  - A matched sibling certificate CG/KDG/SDO/2026/002290 has issue date **2026-10-28, a month in the future**, and passes validity.
  - The rule engine has no "issue date ≤ today and ≤ application date" check.
- **08785 / 08754:** a cancelled or under-scrutiny sibling alongside an active father's certificate, handled by referral. That is reasonable, but the reference should name *both* the usable and unusable certificates as points for the committee.

### 1.9 Tehsildar, domicile
- **08902 Lakshmi:** 2 keystrokes to approve.
  - The legal basis is "Domicile (Mool Niwasi) certificate — State Government instructions", with no circular number or date and no residence criterion stated (e.g. 15 years).
  - **The affidavit is labelled "Self-declaration affidavit (Form 2A)"**, which is the *caste* rules form, in a domicile order.
- **08857 Kartik (tehsil Makdi):**
  - The server draft says "Office of the **Tehsildar, Makdi**".
  - The client notice actually sent says "Office of the **Tehsildar, Kondagaon**", because `officerName()` is hard-coded in `ActionPanel.tsx`. The modal's "Signed by" says Kondagaon too.
  - **Territorial jurisdiction mismatch**, the very "wrong authority" defect the July HC ruling was about.
  - The same risk exists for the SDO: tehsils Keskal and Mardapal (08845, 08749) are signed "SDO (Revenue), Kondagaon" (`office_for` uses the district). [verify the sub-division mapping]

### 1.10 Kendra
- **Provenance laundering.**
  - The Kendra says "📎 Attach as proof … **The officer will … confirm the relationship**".
  - On the officer side, a certificate whose number is in `declared_relative_cert_no` is **auto-accepted** ("Declared at Kendra & matched — no confirmation needed").
  - A *machine-found* certificate attached by an operator becomes an *applicant declaration* and skips the officer's confirmation. The Kendra promise and the officer screen contradict each other.
- **Consent** is a static "🔒" line. No consent is captured, yet the audit writes "Declared lookup **with the applicant's consent**".
- **Round 1 carry-overs are still open:**
  - The hero banner is still on the working screen, and its text is clipped.
  - The role pill shows "तहसीलदार" (Tehsildar) on the Kendra page.
  - Sunita shows **96%** at the Kendra and **98%** at the officer desk.

### 1.11 Audit page
- The header claims *"हर पहुंच दर्ज, और आवेदक को दिखाई जाती है"* ("every access logged **and shown to the applicant**"). No applicant view exists.
- It says "CERT-In 180-day logs", but DPDP Rule 6 needs **1 year**.
- **Rows record:**
  - actor as a designation string sent by the client (anyone can type it)
  - "Suggested: X; officer decided: Y"
  - free-text findings
- **Rows do not record:**
  - model and rules version
  - lane and open flags at decision time
  - the link strength and validity shown
  - the system-draft hash versus the signed-text hash (edited or not)
  - the confirmation basis
  - which language version is authoritative
- `confirm` actors carry "(demo)" and `decision` actors do not: two identities for one officer in one trail.
- State is a mutable JSON file. That is fine for a demo, but say so ("append-only, hash-chained in production").

### 1.12 Phone width (375 px)
- **The layout viewport is 612 px, so there is horizontal scroll.**
- The cause is `.nav-links` + `.role-pill` + `.menu` not wrapping; the right edge sits at 612.
- **The ⋯ menu (Reset demo, presenter toggle) is off-screen.** Case cards are 396 px wide, overflowing 375 px.
- The Sign button is at Y=2433, three screens down.

### 1.13 Scroll-position carry-over
- **Not reproduced this round.**
  - J/K and queue-row clicks opened cases at Y=0.
  - "← Queue" re-opened the queue at Y=308, which is the row-refocus behaviour.
- Keep the defensive fix (below). Its acceptance test covers the path where data is already cached (auto-advance after signing).

---

## 2. Legal review of each template (quote → problem → fix)

| Template / source | Problematic line (quoted) | Problem | Fix |
|---|---|---|---|
| `order_approve.*.j2`, `order_refer`, and every `rules.RULE_3_3 / RULES_2013` | "CG Social Status Certificate (Issue and Verification) Rules, 2013" / "छ.ग. सामाजिक प्रास्थिति प्रमाण पत्र (जारी करना एवं सत्यापन) नियम, 2013" | **Wrong statute title** in every order. The real title is the *…(Regulation of Social Status Certification) Rules, 2013*. A counsel will open with this. | Replace with "छत्तीसगढ़ अनुसूचित जाति, अनुसूचित जनजाति और अन्य पिछड़ा वर्ग (सामाजिक प्रास्थिति के प्रमाणीकरण का विनियमन) अधिनियम/नियम, 2013" and the matching English. Add a test asserting the title string. |
| All order templates | "DRAFT ORDER — for the competent officer's review, edit and e-signature" / "आदेश का प्रारूप — …" | Survives into the **signed** text (`state.json`) | Keep it only as a UI label (DFA v1). On `/decision`, the server replaces it with "आदेश / ORDER", an order number (`{app_id}/{yyyy}/{seq}`), the version, and "Authoritative text: Hindi". |
| `order_approve` finding (`engine.approve_finding`) | "Findings of the undersigned: The applicant's relationship … was declared by the applicant at the Kendra and **matched with the archive**." | The machine writes the *findings* (the Kerala HC AI policy: AI must not "arrive at findings"), and the archive match becomes the basis for the relationship | Split into **"Facts from records" (system, yellow)**, each with a source, and **"Satisfaction of the undersigned" (green)**. A declared relationship rests on "the applicant's affidavit in Form-2A dated …". Use the statutory satisfaction line: "अधोहस्ताक्षरी का समाधान है कि…" ("The undersigned is satisfied that…"). |
| `approve_finding` (confirmed) | "…confirmed by the undersigned on 27-09-2026." | Conclusory; no reason; the name variant is not addressed | Compose from the confirm-basis ticks (Top-8 #3): "Father's name in the application 'Ramlal Markam' and holder 'Ram Lal Markaam' are spelling variants of one name; same village (LGD 448703); the applicant is listed in his household in the ration roster No. …" |
| `approve_finding` (no record) | "The documents on file were examined by the undersigned. No family certificate was found in the archive…" | Boilerplate attestation (cyclostyled order). **False on 08845** (a possible match was found). Identifies no document. | Have the officer pick the proving document (Top-8 #6). Say "No family certificate *relied upon*; possible record No. X seen and not relied upon because …" whenever `lineage_matches` is non-empty. |
| `approve_finding` (all) | "All required documents are on file." | Untrue against r.3(3): no Patwari three-generation family tree on 08790/08812/08749, and no OBC father's income certificate on 08870/08749 | Add `family_tree` (all caste) and `father_income` (OBC) to `rules.checklist`. Until they are present the sentence reads "Documents on the Sewa Setu checklist are on file; Patwari family tree: [on file / to be obtained under r.7]". Decide with CHiPS whether records-complete may waive the Patwari tree. **The order must not claim what the statute says is missing.** |
| Legal basis (approve) | "— the claim is examined on the documents on file." | Not a rule citation | Cite what the order does: **s.4** (issue after inquiry), **r.3(3)** (the specific limb used: relative's certificate / revenue record / Gram Sabha), the **cut-off date** for the category, and **r.3(3) OBC income** for OBC. |
| Legal basis (HC) | "CG High Court, 22-07-2026 — competent authority … is the SDO (Revenue) or above." | No cause title or number | "*Shailey Sonkar v. State of Chhattisgarh*, WPC No. ___/2026, decided 22-07-2026" [verify the number]. |
| `order_refer` points | "{{ f.title }} — {{ f.explanation }}" pastes: "There may be a simple explanation. Verify before deciding — a Patwari field report … is suggested." / "Decide on the applicant's own evidence…" | Tool advice addressed to the officer ends up in a legal document addressed to a Patwari or the Committee | Add `flag.order_point` (neutral, factual: "Certificate No. … of the applicant's brother records OBC (Kalar); the application claims ST (Gond)") and render only that. |
| `order_refer` (Patwari) | "…for a field report (Rule 8 enquiry)" | No terms of reference; no due date; wrong rule for the assignment | "Under **Rule 7**, the Halka Patwari is directed to enquire under **Rule 8** and report by **{date + 7 days}**: (i) three-generation family tree, (ii) the family's caste/tribe in revenue records (misal/jamabandi), (iii) residence before {cut-off}, (iv) statements of the Kotwar/Sarpanch, (v) [point-specific item]." |
| `order_refer` (cancelled parent) | "Cancelled by the District Verification (Scrutiny) Committee, 2024" | The cancellation order is not identified | Add `status_order: {no, date}` to cancelled or under-scrutiny certificates and cite it. Add "A copy of the Committee's order No. … is to be placed on file." |
| `clientDraft('reject')` | "Records examined: … — **not relied upon**" + finding relying on it | Self-contradiction | Reject lists "Records relied upon (adverse)" from the flag's `cert_nos`, plus "Applicant's documents considered". |
| `clientDraft('reject')` | "The applicant may appeal to the competent appellate authority." | No authority, no time limit (s.5: 30 days) | "An appeal lies under section 5 of the Act to {Appellate Authority} within 30 days of receipt of this order." [confirm the authority with Revenue] |
| `clientDraft('reject')` | (no legal-basis section; no hearing recital) | s.4 requires written reasons; there is no recital that a show-cause was issued or the applicant heard; s.15 is not invoked | Add "Legal basis: s.4, s.15 (burden on applicant)" and "Show-cause No. … dated … issued; reply received/not received by …" (Top-8 #4). |
| `clientDraft('approve')` (override/finding path) | no "Legal basis" section at all | Inconsistent with the server draft | Reuse the server basis list. |
| `clientDraft` / `ActionPanel.officerName()` | "Office of the Tehsildar, Kondagaon" for a Makdi applicant | Jurisdiction mismatch | Always use the server's `office_for(app)` (add `analysis.office`). The sign modal "Signed by" uses it too. |
| Domicile basis | "State Government instructions; residence evidence from records on file." | No circular or date; criterion not stated | "GAD/Revenue circular No. ___ dated ___ [verify]; the applicant/parent resided in CG for ___ years, as evidenced by …" |
| Domicile docs | "Self-declaration affidavit (Form 2A)" | Form 2A belongs to the caste rules | Label per service: "स्वघोषणा शपथ पत्र (मूल निवास)" ("self-declaration affidavit (domicile)"). |
| `order_send_back` | "within 30 days … No new fee is payable." | Consequence and legal basis unstated | Add: "If not received by {date}, the application will be decided on the record as it stands." Add "(time taken for this correction is recorded separately under the Lok Sewa Guarantee Act)" only if CHiPS confirms. |
| All orders | "received 2026-09-18" vs "Date: 27-09-2026"; "on 2021-07-09"; Hindi "स्थायी **ST** जाति प्रमाण पत्र" ("permanent **ST** caste certificate", with the category left in Latin) | Mixed date formats; Latin category inside Hindi | Use DD-MM-YYYY throughout; "अनुसूचित जनजाति" (Scheduled Tribe) in the Hindi text. |
| All orders | "Bhuiyan land record (mock)" | Demo artefact inside a legal document | Keep "(mock)" in the UI chip only. |
| Signature block | "SDO (Revenue), Kondagaon / (digital signature)" | No officer name; the DSC identity is not shown | "{Officer name}, SDO (Revenue), {Sub-division} · DSC/e-Sign serial …" (simulated). |
| `msg_reject.*` | "अधिकारी का कारण: {{ findings }}। आप अपील कर सकते हैं…" ("Officer's reason: {{ findings }}. You may appeal…") | English reason in a Hindi message; no s.5 details; a relative's caste on WhatsApp; the "every name verified" badge over free text | Send "आपका आवेदन अस्वीकृत… कारण सहित आदेश: {link}। धारा 5 के अंतर्गत 30 दिन में {Appellate Authority} को अपील।" ("Your application has been rejected… Order with reasons: {link}. Appeal to {Appellate Authority} within 30 days under section 5."). Put the reason in the order, not in WhatsApp. Suppress the "✓ checked" badge when free text is included. |
| Bilingual signing | Two texts signed, one seen; the officer's English finding is pasted into the Hindi order | Divergent authoritative texts | Sign **one authoritative text** (Hindi, the CG official language) with "English translation for reference". Mark the finding's language, or require it in the order's language. |

---

## 3. Automation-bias review

| Element | What the officer sees | Bias risk | Fix |
|---|---|---|---|
| Evidence line + "Records suggest: Approve" + reason | Above the fold, before any comparison row, with "98%" | Anchoring (Goddard 2012; Buçinca 2021) | Evidence line without the number ("Father's certificate found — strong model link"). Collapse "Records suggest" into a one-line chip that appears **after the comparison table has been scrolled into view or after Confirm/Dismiss** (a light forcing function). |
| "Confirm relationship first" as the sole primary button | Agreeing with the model is the only path forward | Commission bias; no way to record disagreement | Two equal buttons: "✓ Same family (C)" and "✗ Not this family (N)". Both open a 1-click basis popover. N records a reason and moves the match to "seen, not relied upon: officer found not related". |
| `C` global key | One keystroke creates a legal finding | Accidental or rubber-stamp confirmation | `C` opens the basis popover and ↵ commits. Add "Undo confirmation" until signed (`DELETE /confirm-relationship`), logged. |
| Clean approve: Ctrl+↵, ↵ | Modal without the order text | "Read the draft" attestation is false | Show the Hindi order in the modal (scrollable, 12 lines visible). Machine sentences on a yellow background, officer text green (e-Office idiom). Clean files still need 2 keystrokes. |
| Standard review with no record, Approve pre-selected (08710/08845/08870) | 2 keystrokes; boilerplate finding | Rubber-stamping where the officer's mind *is* the whole decision; the fake-Sarpanch-letter pattern | No pre-selection when `lineage_matches` is empty or possible-only. A **2-click evidence picker** composes the finding: "Caste shown by: [school record ▾]"; "Residence before {cut-off} shown by: [ … ▾]". |
| "Possible" matches as `info` (08749, 08845) | "Possible family record — check before using" | A conflicting category is hidden behind "info"; the order is silent | If a possible match's category differs from the claim → severity `attention`, titled "Possible record in the father's name shows ST (Kanwar); application claims OBC". Every shown match must be disposed of ("not related" / "related, not relied upon") and named in the order. |
| "Records complete" lane text | "verified family certificate supports this application" | Overclaims verification | "Family certificate declared by applicant and matched to archive; relationship per affidavit". |
| Link strength "98%" | Big badge; hover says "confirm from the records" | Precision at "exact" is **89.4%** on synthetic tests (so roughly 1 in 10 strong links is wrong), and the badge does not say so | Badge text: "strong link · model". Tooltip and footnote: "On test data about 1 in 10 strong links were wrong; the link is not proof of relationship." |
| No-match card | "neutral… first in family… moved from another district" | Hides the model's weakest slice | For female applicants add: "Women's family records are often missed (surname or village changed after marriage). Search by father's name and maiden village ▸" (a stub is fine). For all: "No record ≠ ineligible; do not reject for this." |
| Audit "Suggested vs decided" | Agreement rate per officer | Makes agreement the safe behaviour; per the SDO it gets read as "disobeys the system" | Record *what was shown* and *why the officer decided*, not agreement. Keep the agreement metric aggregate-only (tool evaluation), never per-officer. |
| Auto-advance after signing | Next case opens; the signed order is never displayed | No moment of review; mis-click fear | Keep auto-advance, but the toast shows "Signed: {action} · View order · **Call back (10 min)**" (NIC callback-with-reason). |

**The design principle for this round:**
- Keep **zero added friction on truly clean files**, with one change: the order is shown at signing, still 2 keystrokes.
- Put **friction exactly where the law puts it:**
  - on the officer's own satisfaction (confirm basis, standard-review evidence picker)
  - on adverse use of third-party records (show-cause before reject)
- Make every friction produce **a sentence in the order**, not a tick in a log.

---

## 4. Issues ranked

### P0: an order that would not survive a writ or a vigilance inquiry
| # | Issue | Evidence | Fix (file) | Acceptance test |
|---|---|---|---|---|
| P0-1 | Signed order text begins "DRAFT ORDER / आदेश का प्रारूप" | `state.json` after signing 08812 | `api.py decision()`: `finalise_order(text)` strips the draft header and stamps "आदेश / ORDER No. …, version, authoritative: Hindi" | After signing 08790, `decisions[...].order_text.hi` starts with "आदेश" and contains no "प्रारूप" (draft) / "DRAFT"; pytest |
| P0-2 | Wrong statute title in every order | `rules.py RULE_3_3, RULES_2013` | Correct title (§2); add `ACT_S4, ACT_S5, ACT_S15, RULE_7, RULE_8` constants | `grep -r "Issue and Verification" backend/` returns nothing; test on the draft string |
| P0-3 | The officer signs without seeing the order; the modal attests "read the draft" | 08812: textarea top at Y=791 > 768; modal without text | `ActionPanel.tsx SignModal`: render the authoritative Hindi order (`pre`, max-height 40vh), machine sentences yellow and officer finding green | 08790: the modal contains "आदेश" and the certificate number; still 2 keystrokes |
| P0-4 | Relationship confirmation is 1 keystroke, reasonless, one-sided, irreversible | 08812 `C` | `LineageCard.tsx` + `CaseView.tsx`: basis popover (father's-name variant / same village LGD / ration roster member / affidavit names holder / other text), with Same family / Not this family; `api.py` `ConfirmBody.basis: list[str]`, `DELETE` endpoint; `engine.approve_finding` composes from the basis | 08812: C → popover → ↵ with 2 default ticks; the finding contains "spelling variant" and "LGD 448703"; undo restores the Confirm button; audit has `relationship_unconfirmed` |
| P0-5 | Reject without a hearing; adverse record "not relied upon"; no s.4/s.5/s.15 | 08841 reject draft and message | `ActionPanel.tsx`: when the action is reject and any `attention` flag or adverse certificate exists, the primary action becomes "Issue show-cause (7 days)", a notice (new `order_show_cause.*.j2`) and a new status `show_cause`. Reject stays available with a mandatory "reason no hearing needed" (e.g. applicant already heard on …). Reject template: adverse records under "relied upon", basis s.4/s.15, s.5 appeal line | 08841 → X: the button reads "Issue show-cause"; the reject draft (after override) contains "section 5" and "30 days" and lists 2020/003318 under relied upon |
| P0-6 | Orders assert "All required documents are on file" against r.3(3) (Patwari tree; OBC father's income) | 08790, 08812, 08870, 08749 | `rules.checklist`: add `family_tree` (caste) and `father_income` (OBC, required); `approve_finding` wording tied to the checklist | 08870 shows "Father's income certificate — not uploaded" and suggests send-back; no draft contains "All required documents" unless both are present |
| P0-7 | Order states a falsehood when possible matches exist (08845 "No family certificate was found") and is silent on a conflicting possible record (08749) | Dumps §1.8 | `engine.py`: `seen` includes possible matches with the officer's disposition; a possible match whose category differs from the claim → `attention` flag `possible_conflicting_record`; `approve_finding` never says "not found" when `matches` is non-empty | 08749 lane ≠ records_complete, approve needs a finding; 08845 draft contains "CG/KDG/SDO/2022/001482 … not relied upon" |
| P0-8 | A Kendra-attached (machine-found) certificate becomes "declared" and skips officer confirmation | Kendra "officer will confirm" vs officer "no confirmation needed" | Add `declared_source: "applicant" \| "kendra_search"` on `Application`; only `applicant`-typed numbers plus an affidavit statement auto-accept; `kendra_search` → pending (Confirm required) | A Kendra-attached Sunita case arrives as "found — confirm", not "declared" |

### P1: defensibility and correctness
| # | Issue | Fix | Accept |
|---|---|---|---|
| P1-1 | Audit lacks a decision snapshot | `decisions[app]` + audit add: `model_version, rules_version, lane, flags_open[], matches_shown[{cert_no, level, p, validity_headline}], confirm_basis, system_draft_sha, signed_sha, edited: bool, authoritative_lang`; Audit page shows "system text unedited / edited (view diff)" | `/api/audit` decision row has `snapshot.model_version` and `edited` |
| P1-2 | No callback | Toast "Call back (10 min)" → reason → status pending, `decision_called_back` in the audit (NIC ServicePlus) | Sign 08790, call back with a reason, the case is pending again, and 2 audit rows exist |
| P1-3 | Tool voice in reference orders; no terms of reference or due date | `flag.order_point`; Patwari ToR list + `report_by` | 08856 Patwari draft contains "Rule 7", "Rule 8", "report by", and no "suggested"/"Decide" |
| P1-4 | Cancellation or scrutiny order not identified | Archive `status_order {no, date, grounds_summary}`; show it in the headline and order | 08856 headline shows the order number and date |
| P1-5 | Refer to Patwari allowed on a competence question | Refer options per flag: `authority_under_review` hides Patwari (or warns "a Patwari cannot answer competence") | 08863 refer options = Scrutiny Committee (+ department reference) |
| P1-6 | Tehsildar temporary certificate flagged as "permanent … competence under review" (08766) | `rules.validity`: competence check only for `cert_type=="permanent"`; temporary → headline and `attention` "temporary: never lineage proof" with no committee referral | 08766 flag text contains "temporary", not "permanent" |
| P1-7 | Future-dated certificate passes validity (08721, 2026-10-28) | Validity check `issue_date <= today and <= app.submitted_at` | 08721 match shows "issue date after the application — check" |
| P1-8 | Office/jurisdiction mismatch (Makdi vs Kondagaon); SDO sub-division | `analysis.office` from `office_for`; the client uses it; map tehsil → sub-division | 08857 notice and modal both say "Tehsildar, Makdi" |
| P1-9 | Bilingual divergence (English finding in the Hindi order; two texts signed) | One authoritative text; finding language tag; the English tab shows "translation" | Signed record has `authoritative_lang:"hi"`; the finding box warns when a Latin-script finding goes into a Hindi order |
| P1-10 | "Reject → Patwari" in the sign modal | Pass `referLabel` only when `action==="refer"` | 08841 X → modal has no "→" |
| P1-11 | Model-limit honesty (women recall 0.33; exact precision 89%) is not on the officer screen | No-match card note for F applicants and a "search by maiden village" stub; badge footnote | 08835 (F) card mentions marriage and surname change |
| P1-12 | Reject citizen message: no s.5, English text, relative's caste, "every name verified" badge | `msg_reject.*`: link to the order + s.5; badge suppressed when free text is included | 08841 message contains "30 दिन" (30 days) and no Latin sentence |
| P1-13 | Standard-review approvals need an officer-identified proving document | Evidence picker (2 clicks) → finding sentence; no pre-selected Approve when there is no usable record | 08710: Sign disabled until "Caste shown by: School record" is picked; the order names it |

### P2
- **Dates:** DD-MM-YYYY everywhere in orders. Use "अनुसूचित जनजाति" (Scheduled Tribe) in the Hindi order.
- **Order text hygiene:** remove "(mock)" from order text. Add the HC cause title [verify].
- **Domicile:** the affidavit label, and a domicile circular citation [verify].
- **Send-back notice:** add the consequence after 30 days.
- **Audit page:** remove the "shown to the applicant" claim, or build the applicant view. Change 180-day to 1-year (DPDP Rule 6). Unify the actor identity (drop "(demo)" on one side, or add a demo officer name).
- **Kendra consent:** capture it with a checkbox ("applicant consents to archive lookup"), and log it only when ticked.
- **Waterfall text:** it shows transliteration artefacts, e.g. "Deeelip Kavasi" (08749). Show both raw strings instead of the internal skeleton.
- **Signature block:** officer name plus DSC serial (simulated).

### Round 1 carry-overs still open
- **Scroll reset on navigation.** Not reproduced on J/K or row clicks this round. Add `useEffect(() => window.scrollTo(0,0), [appId])` in `CaseView.tsx` anyway. **Accept:** scroll to Y=900, sign with auto-advance, and the next case opens at Y=0.
- **Comparison table height.** The in-card Confirm is about 1.6 screens down (Y=1194 on 08812).
  - Make it one line per side (Devanagari primary, Latin as a `title`/small suffix) and cap it at 5 rows.
  - The Confirm/Not-this-family pair sits directly under the table.
  - **Accept:** on 08812 the Confirm pair has top < 768 at 1366×768.
- **Kendra:**
  - Drop the hero banner on `/kendra`. It is also clipped.
  - The role pill says "Kendra operator".
  - Show "strong" rather than 96%/98%, or pass the birth year so the numbers agree.
  - The offline mock precheck gets the validity headlines.
  - **Accept:** the Kendra page has no `.hero`, the pill reads "केंद्र संचालक" (Kendra operator), and Sunita shows the same strength word as the officer desk.
- **Phone width.**
  - Wrap or collapse `.nav-links` into the ⋯ menu below 640 px.
  - Set `.case-grid > *` to `min-width:0; max-width:100%`.
  - The sticky action panel becomes a bottom sheet ("Decide ▴") below 768 px.
  - **Accept:** at 375×812, `document.documentElement.scrollWidth <= 375`, the ⋯ menu is visible, and the Sign button can be reached within 1 screen via the bottom sheet.
- **Info flags on records-complete files** (08749). This is superseded by P0-7: a conflicting possible record becomes attention, and others are demoted below the card.

---

## 5. TOP 8 changes for this round (about 2.5–3 h)
Ordered by liability removed per minute. Each item names its files and its acceptance test.

### #1 Make the signed order a real order · ~35 min (P0-1, P0-2, P1-9, P2 dates/mock)
- **`rules.py`:** correct Act/Rules title constants; add s.4, s.5, s.15, r.7, r.8, and cut-off dates by category.
- **`api.py decision()`:** `finalise_order()` strips the "DRAFT/प्रारूप" header and adds "आदेश क्र. {app_id}/{seq} · संस्करण v{n} · प्रामाणिक पाठ: हिंदी" ("Order No. {app_id}/{seq} · version v{n} · authoritative text: Hindi"). Store `authoritative_lang`.
- **Templates:** DD-MM-YYYY dates, "अनुसूचित जनजाति" (Scheduled Tribe) in Hindi, no "(mock)".
- **Accept:**
  - The signed 08790 text starts with "आदेश" (order).
  - `grep "Issue and Verification"` returns nothing.
  - Pytest: no "DRAFT"/"प्रारूप" in stored `order_text`.

### #2 Show what is being signed · ~20 min (P0-3)
- **`SignModal`:** the authoritative order text in a scrollable box; system sentences yellow, the officer's finding green.
- **Label:** "प्रारूप (DFA) v1 — system text" ("Draft for approval (DFA) v1 — system text") until signed.
- Clean files remain Ctrl+↵, ↵.
- **Accept:** the 08790 modal `innerText` contains "CG/KDG/SDO/2021/007731" and "आदेश:" (Order:).

### #3 Confirmation is a reasoned, two-sided, reversible act · ~35 min (P0-4, automation bias)
- **`LineageCard.tsx`:** a "Same family (C)" / "Not this family (N)" pair directly under the table. `C` opens a basis popover with defaults pre-ticked from `weights`/`evidence_rows`; ↵ commits.
- **API:** `ConfirmBody.basis`; `POST …/dismiss-match {reason}`; `DELETE …/confirm-relationship`.
- **`engine.approve_finding`:** composes the reasoned sentence, including the name-variant clause, and puts corroborating rows under "relied upon" when ticked.
- **Accept:**
  - The 08812 finding contains "spelling variant" and "ration".
  - Undo works before signing.
  - N on 08845 moves the match into the order as "officer found not related: …".

### #4 Due process before reject · ~30 min (P0-5, P1-10, P1-12)
- New action **"Show-cause"** (notice, 7 days), with `order_show_cause.{hi,en}.j2`. It lists the adverse record verbatim and invites an explanation or documents. New status `show_cause`.
- **Reject** with an open attention flag or an adverse certificate:
  - the default route is show-cause
  - a direct reject needs "Applicant heard on / no hearing needed because …"
- **Reject template:** adverse records under "relied upon", s.4/s.15 basis, and the line "Appeal under s.5 within 30 days to {Appellate Authority [verify]}".
- **Fix `referLabel`.** `msg_reject` links to the order and gives the s.5 line in Hindi.
- **Accept:**
  - 08841 X shows "Issue show-cause" as primary.
  - The forced reject draft contains "धारा 5" (section 5) and "30 दिन" (30 days).
  - The modal has no "→ Patwari".

### #5 Nothing true is missing, nothing false is said · ~30 min (P0-6, P0-7, P1-6, P1-7)
- **`rules.checklist`:** add `family_tree` (r.3(3), all caste) and `father_income` (OBC).
- **`approve_finding`:** never "not found" when matches exist; never "all required" unless the r.3(3) items are present.
- **Possible matches:** they go into the order's seen list with their disposition. A possible match with a category conflict becomes `attention`.
- **`rules.validity`:**
  - the competence check applies only to permanent certificates
  - a temporary certificate gets its own headline
  - a future issue date fails
- **Accept:**
  - 08749 is not records-complete.
  - The 08845 draft cites 2022/001482 as not relied upon.
  - 08766 says "temporary".
  - 08721 flags the date.
  - 08870 asks for the father's income certificate.

### #6 Defensible trail: snapshot plus callback · ~30 min (P1-1, P1-2)
- **`api.py`:** each decision stores the snapshot (model and rules version, lane, open flags, matches shown with level/p/headline, confirm basis, `system_draft_sha`, `signed_sha`, `edited`).
- **Audit row:**
  - "System text: unedited / edited (diff)" and "Relied on: …"
  - drop "Suggested vs decided" from the officer-facing note (keep it in the snapshot for tool evaluation only)
- **Callback:** a 10-minute toast button with a mandatory reason.
- **Audit page:** fix the "shown to applicant" / 180-day claims.
- **Accept:**
  - The `/api/audit` decision row has `snapshot.edited === false` for an untouched clean approve.
  - Callback returns the case to pending, with a `decision_called_back` row.

### #7 Standard review and Kendra provenance: the officer's own mind, in 2 clicks · ~25 min (P0-8, P1-13, P1-11)
- **No-record / possible-only cases:**
  - no pre-selected tile
  - an evidence picker ("Caste shown by ▾", "Residence before {cut-off} shown by ▾") composes the finding
- **No-match card:** for female applicants, the marriage/surname note plus a "Search by father's name & maiden village" stub. The badge footnote reads "model link; ~1 in 10 strong links wrong on test data".
- **Lane text:** "declared & matched" instead of "verified".
- **Provenance:** `declared_source` separates applicant-typed from Kendra-search-attached certificates.
- **Accept:**
  - 08710 Sign stays disabled until a document is picked, and the order names "School record".
  - 08835 shows the women note.
  - Lane text has no "verified/सत्यापित".

### #8 Carry-overs and jurisdiction · ~30 min
- **Jurisdiction:** `analysis.office` is used by the client drafts and the modal (08857 → "Tehsildar, Makdi"). Tehsil → sub-division map for the SDO [verify].
- **Reference quality:** a Patwari reference gets r.7/r.8 terms of reference plus a report-by date, and flags supply `order_point` (no tool voice).
- **UI carry-overs:**
  - one-line comparison rows (Confirm pair < 768 px on 08812)
  - scroll-to-top on `appId` change
  - Kendra banner, role pill and strength word
  - phone width: header collapse and bottom-sheet action panel
- **Accept:**
  - The 08857 notice and modal say Makdi.
  - The 08856 Patwari draft has "report by" and no "suggested".
  - At 375 px, `scrollWidth ≤ 375`.
  - On 08812 the Confirm pair is above the fold at 1366×768.

**Verify with CHiPS / Revenue before stage (do not guess on screen):**
- the s.5 appellate authority
- whether a records-complete approval may proceed without the Patwari three-generation tree (r.3(3))
- the domicile circular number and residence criterion
- the Sonkar WPC number
- the tehsil → SDO sub-division mapping in Kondagaon district

**Expected outcome**
- Clean files still take 2 keystrokes, and the officer now sees the order.
- A found-match file takes C → ↵ → Ctrl+↵ → ↵, and the confirmation is reasoned.
- Every adverse use of an archive record passes through a hearing.
- Every signed order names:
  - the correct statute
  - the specific rule limb
  - the documents relied on
  - the officer's own satisfaction
  - the s.5 appeal route
- The audit shows what the screen showed and whether the text was edited, which is the record an SDO can hand to vigilance.
