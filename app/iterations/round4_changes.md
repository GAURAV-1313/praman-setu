# Round 4 changes: inside Sewa Setu, and officer impact at scale (27-09-2026)
Input: `iterations/round4_critique.md` (TOP 8 + the P0s). Lens: the CHiPS product head and an NIC/NeGD architect deciding on a 90-day shadow pilot, and an SDO at 190 files a day.

## Result in one line
- The demo now shows **where the tool lives**: an illustrative Sewa Setu officer console with the Praman panel docked beside it, a fail-open "service unavailable" state and a **shadow-mode** switch.
- A clean file is **3 keys** (Ctrl+↵ → Space → ↵) on every records-complete demo file at 1366×768 and 1280×720, in Hindi and English. Five read files can be **e-signed with one OTP**.

## What changed (TOP 8)
1. **Sewa Setu console view.**
   - **Routes:** `/sewasetu` is the dashboard and pending list; `/sewasetu/case/:id` is the application view. The landing CTA reads "सेवा सेतु में खोलें (एसडीओ)", and every case has a "View as embedded in Sewa Setu" link.
   - **Recreated, simplified,** from the public Aug-2026 walkthrough of the Sewa Setu Government Login (`research/07_sewasetu_officer_side.md`), per the coordinator's update. Labelled on screen in HI and EN: "Recreated from a public walkthrough of the Sewa Setu officer console (Aug 2026) — simplified mock; revenue-officer specifics illustrative".
   - **Shell:**
     - blue sidebar with the real item names (the non-demo items are inert)
     - "Session TimeOut (In Minute) 05:00" countdown
     - "शासकीय लॉगिन · अनुविभागीय अधिकारी (राजस्व), कोंडागांव"
     - no Sewa Setu logo (CG crest only)
     - all styling under `.ss-*` for restyling
   - **Dashboard:** the 9 counters (लंबित … विशेष मामले). The pending list has red/yellow/green SLA dots with the 3-item legend, the 16-character application-number pill, 📎 count, and **both** "अधिकारी की समय सीमा" (application due − 4 days, as in the video) and "आवेदन की समय सीमा".
   - **Praman adds exactly one column** ("परिवार प्रमाण") and an optional "sort by urgency" (the native list is not urgency-sorted).
   - **Application view:** dark header bar with the application number, and five pill tabs (आवेदक का विवरण / आवेदन पत्र / सहायक दस्तावेज / निर्णय / जांच सूची / पूर्व निर्णय), each with a green ✓ once opened.
     - **Aadhaar is masked** ("XXXX XXXX 8790") and the mobile number is masked.
     - The documents tab has a thumbnail grid and a large viewer (demo placeholder).
   - **Praman fills the empty "जांच सूची".** The decision tab shows the checklist "प्रमाण सहायक द्वारा भरी गई" (or "खाली — सामान्य रूप से कार्य करें" when the service is down or in shadow mode) above the **native decision panel**:
     - radios अस्वीकृत / आवेदक को वापस भेजें / अनुमोदित
     - a **टिप्पणी box capped at 200 characters** with a counter
     - a **दस्तावेज़ अपलोड** row (pdf/jpg/png ≤ 256 KB rules)
     - ✔ सबमिट / ✖ बंद
   - **"Use this draft"** puts a ≤200-character remark summary in टिप्पणी (123/200 on 08790) and attaches the full reasoned order as a PDF (`praman_order_08790.pdf · 23 KB`).
   - **Signing:**
     1. The order preview sheet (read tick, full text).
     2. **SIGN WITH TOKEN**: the native declaration plus the Praman line "…तथा संलग्न आदेश में सूचीबद्ध अभिलेखों से मिलान किया गया है"; Token provider PROXKey (demo), Certificate, Passcode; **Sign PDF**.
     3. **"निर्णय की पुष्टि · आवेदन अनुमोदित"**.
   - **Right side:** the collapsible Praman panel (verdict, matched records as words, draft action, ICD footnote in presenter mode), with the shadow-mode and "Praman service unavailable" toggles. When the service is down, the panel greys out and the native tabs, decision panel and Submit keep working.
   - **Native decisions** use `channel: "sewasetu_native"`:
     - the same signing sheet, so the full text, read tick and snapshot all apply
     - Reject goes through the Praman-added **pre-rejection hearing notice** first
     - approving over a visible attention point needs remarks of at least 15 characters
2. **Terminology aligned with the real console.**
   - "कारण बताओ" is Sewa Setu's name for delay notices *to officers*. Our notice to the applicant is renamed **"पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर) / Pre-rejection notice — opportunity of hearing"** (short form "सुनवाई सूचना").
   - Its document number prefix is now `HRG/`.
   - Signing is relabelled from "e-Sign OTP" to **DSC token** ("DSC टोकन से हस्ताक्षर"). The sign tray asks for **one token passcode for up to 5**. The sheet says "हस्ताक्षर: सेवा सेतु का मौजूदा DSC टोकन (eSign खरीद प्रक्रिया में)".
3. **Shadow mode** (⋯ menu, the console strip, a bar pill, `?shadow=1`). Until a decision is recorded:
   - Lane chip, "records suggest", link strength / %, pre-selected action and pre-ticked send-back reasons are hidden. Verified: 08812 DOM has no "सुझाव" and no %.
   - In the console the whole panel stays silent.

   After the decision, "अभिलेख जांच: आपके निर्णय से सहमत / भिन्न — क्यों?" is revealed, with one-tap हाँ / नहीं / गलत परिवार. The snapshot stores `shadow_mode`, `tool_shown_before_decision`, `hidden_before_decision` and `tool_feedback`. The audit logs it as tool feedback, "not an officer metric".
4. **3-key clean path.**
   - In the signing sheet the fixed **legal-basis recital** folds into "विधिक आधार — मानक पाठ (अपरिवर्तित टेम्पलेट v…) · 4 बिंदु". It folds only when every line is unedited system text.
   - **Corroborative registry extracts** fold into "पुष्टिकारक पंजी उद्धरण (n)".
   - On wide screens the sheet uses two balanced columns, with compact chrome and a one-line footer.
   - The read tick unlocks as soon as all variable text is on screen, and Space ticks at once.
   - **Measured** `scrollHeight == clientHeight` for 08790, 08902, 08743, 08863 and 08732: 574/574 (HI) and 561/561 (EN) at 1366×768; 526/526 and 513/513 at 1280×720.
   - Longer texts (08758 after a second confirmation, references, show-cause) still need scrolling.
   - Folding is display-only: the issued text is unchanged.
5. **Sign tray** ("Add to sign tray", Ctrl+S in the sheet; a desk chip "n/5 · एक टोकन पासकोड"; a tray modal with a DSC-token passcode step).
   - Only records-complete approvals with no open point, opened (audit `case_opened`) and read-ticked, from one desk, max 5.
   - Each order is still individually numbered, finalised and snapshotted; all share one `esign_txn`.
   - **Browser run:** 08743, 08863, 08790, 08758 (after C → ↵) and 08732 → one token passcode → SDO-KON/2026/0001–0004 and SDO-KES/2026/0001.
   - A flagged file (08856) is refused with 422, and so is an unopened one.
6. **Tehsildar-issued policy and wrong-authority routing.**
   - **Policy card** on Collector (default "valid with a note, pending Revenue guidance"); the queue footer shows the active policy.
   - **Default:** 08863 leaves "ध्यान दें" and becomes records complete, with a note flag and one fact line in the order.
   - **"Confirmation required":** restores the old behaviour, and the headline says "नीति: पुष्टि आवश्यक (अधिसूचना क्र. —)".
   - 08754 and 08721 stay in attention for their *other* genuine issues (a certificate under scrutiny, a future date).
   - **Seeded 08915** (a permanent ST file on the Tehsildar desk):
     - banner "आपकी सक्षमता नहीं … एसडीओ को अग्रेषित करें"
     - A/S/R/X disabled, the backend answers 409
     - one-click forward to "SDO (Revenue), Keskal", audit "अक्षम प्राधिकारी से अग्रेषित"
     - it then appears in the SDO queue as records complete
7. **Patwari request.**
   - "Request Patwari report (R)" card on the case; R → Patwari shows a **pre-filled vanshavali form** in the drawer:
     - halka and Patwari name (synthetic)
     - rows tagged आवेदन / अभिलेख / राशन सूची / मौखिक (blank)
     - fields caste / land / income / relation
   - The reference is addressed "हल्का क्र. 36, पटवारी: भोला यादव" and notes the enclosure.
   - Signing sets status **awaiting_patwari**. The decided dock, queue row and Collector tile show "पटवारी के पास · 0/7 दिन".
   - **R contradiction fixed:** `finding_required.refer` is always null, so 08841 goes R → Ctrl+↵ with no finding box.
8. **Privacy and correctness.**
   - Ration cards are masked to the last 4 digits and khasra number/area is dropped, in orders, UI and messages; a test asserts no `\d{8,}` in any demo draft.
   - The approval/refer citizen message now says "आपके निर्णय में उपयोग हुए अभिलेख … देखे गए अन्य अभिलेख … सुधार/आपत्ति: सीएससी या सेवा सेतु शिकायत" (plus DigiLocker), and the entity checker passes.
   - The Audit page has "इस प्रमाण पत्र / आवेदन को किसने देखा?" with a print "नागरिक को यह सूची दें (DPDP धारा 11)"; 004512 returns exactly the open / confirm / decision rows.
   - Hindi village labels keep digits: 0 mismatches of 20,587 (was 163). No two villages in a district share a Hindi label (LGD code appended on collision). Demo-queue villages use curated overrides (मोहलई, सिवनीपाल, अड़नार …).
9. **Collector.**
   - "92% अधिकारी सहमत" is removed from the UI and the API.
   - The pilot card is now **"Pilot targets & stop rules"**, measured in the pilot, not results.
   - Per-match % moved inside "क्यों?" (the strength word stays on the card).
   - **New tiles**, files and tehsils only:
     - awaiting Patwari
     - show-cause pending
     - camp caste rejection **41% vs 19%** (real MIS, camp mode flagged as roadmap)
     - tool-disagreement files and feedback
- **Also:**
  - Each dock button's tooltip names the Sewa Setu status it writes, and the "?" help has the mapping.
  - The sign sheet names the two issued artefacts (QR certificate in DigiLocker plus the reasoned order), and says the approval message mentions DigiLocker.
  - Records-complete files show a neutral "– संलग्न नहीं" row instead of "✗ कमी".
  - "differs from suggestion" is not shown for refer / send-back or in shadow mode.
  - Double-Enter signing is guarded.

## Safeguards kept (re-verified)
- Reasoned same / not-family with Undo (08812 C → ↵; 08758 C → ↵).
- No pre-selection on standard review; none at all in shadow mode.
- Required findings on reject / open-flag approve; show-cause before reject (API and console).
- Full order visible at signing with the read tick; decision snapshots; call-back; validity strip; presenter mode; shortcuts; save & next; verdict card; sticky dock; lane colours; 13 px minimum font (console measured 13 px); no horizontal scroll at 1366 or 1280.

## Tests
- `uv run pytest -q`: **64 passed** (56 → 64). New tests:
  - policy default / verify / reset
  - forward to SDO (409 before, queue move, audit)
  - Patwari form, status and stage, plus the Collector tile
  - masking in every demo draft and the citizen message line
  - who-accessed search
  - Hindi village digits and uniqueness
  - sign tray (unopened / unread / flagged refused, 5 files, one txn)
  - shadow / native snapshot and feedback
  - pilot stats with no officer fields
- `npm run build`: passes (tsc clean).
- `scripts/export_fixtures.py`: re-exported, plus `policy_verify_cases.json` (08721, 08754, 08863) and `forward_overrides.json` (08915).
- **Offline** (backend stopped): forward, Patwari refer and stage, tray add (flagged file refused) and one-OTP sign, policy switch, native shadow approve plus feedback, who-accessed, Collector tiles and targets, console render. All passed.
- **Browser, live backend:**
  - console dashboard → 08790: tabs ✓ → draft (123/200 remark + PDF) → अनुमोदित → सबमिट → sheet fits (574/574) → Space ↵ → SIGN WITH TOKEN → declaration + passcode → Sign PDF → "निर्णय की पुष्टि" → SDO-KON/2026/0001
  - console 08856 reject → "सुनवाई सूचना जारी करें" sheet; no horizontal scroll on the dashboard or case at 1366 and 1280, HI and EN
  - console 08812 in shadow mode: no suggestion or % → native approve → reveal "सहमत" → feedback stored
  - console 08835 with the service down: Sendback works
  - case view 08790: 3 keys
  - shadow case view 08812
  - tray of 5
  - 08915 forward
  - 08841 Patwari
  - Collector policy switch
  - Audit 004512
  - HI and EN, at 1366×768 and 1280×720
- **End state:** `POST /api/reset` done; viewport reset to desktop.

## Open issues / verify
- **The console is recreated from one public walkthrough** (a Gram Panchayat secretary's role). The revenue-officer specifics are unverified: Forward / Patwari legs in the native panel, checklist content, and the officer due date (modelled as application due − 4 days). All CSS is under `.ss-*`.
- **Some screenshots were unreliable during testing.** The browser pane was shared with another agent and resized, so screenshots were sometimes tiny or blank and some coordinate clicks did not land. Those flows were verified via DOM / refs and keyboard instead.
- **Halka numbers and Patwari names are synthetic** (derived from LGD). Production needs the Bhuiyan halka master.
- **Village overrides for demo villages are plausible transliterations.** A Hindi reader should check them; LGD's local-language name field is the long-term source.
- **Longer files still need a scroll before the tick:** 08758 after confirming a second sibling (+14 px), references and show-cause notices. This is by design.
- **Not done (P1/P2 deferred):** charge handover, camp list, maiden-village search, SVG icon set, landing 3-frame strip, Kendra fixes, minor chip.
