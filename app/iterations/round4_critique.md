# Round 4 critique: can this go inside the Sewa Setu officer console?
27-09-2026. **Lens:** the CHiPS Sewa Setu product head, plus a senior NIC/NeGD solution architect. They are deciding two things:
- Could Praman Sahayak be embedded in the real Sewa Setu officer console for a **90-day shadow pilot**?
- Does it make an officer's day better **at 190 files a day**, not just across 8 demo cases?

The PM benchmark is other states' officer tools (see `research/06_officer_tools_benchmark.md`). The test for every feature is whether it would make a CG SDO say **"I want this tomorrow"**.

**Method**
- Ran `POST /api/reset` and used the live app (:5173, backend :8000) on tab-1.
- **Viewports:** 1366×768 and 375×812.
- **Walked:**
  - Landing and Kendra (Sunita demo → consent → search)
  - SDO queue and Tehsildar queue
  - SDO cases 08812 (confirmed and signed end to end, order SDO-KON/2026/0001), 08790, 08835, 08841, 08856, 08863 and 08870
  - Tehsildar case 08902
  - Collector and Audit
- **Checked with JS:** key paths, order heights, the network log and the village-name fixture.
- No code was edited. The backend was reset at the end.

---

## 0. Verdict in six lines
1. **The product is good at the file level, but the demo does not show where it lives.** Everything the jury sees is a separate app with its own nav, role pill and "Officer" tab. Nothing on screen says "this is a panel inside Sewa Setu; the Approve/Reject/Sendback buttons are Sewa Setu's own". For a CHiPS judge, this is the #1 question, and the UI does not answer it.
2. **The shadow pilot, which is the actual ask, is invisible.**
   - "अभिलेखों का सुझाव: स्वीकृत करें" and "98%" appear *before* the officer decides, on every case.
   - No toggle shows the phase-1 behaviour ("the tool's check appears only after you decide").
3. **The clean-file path is still 6 keys, and no order fits the view.** For 08790: Ctrl+↵, Space ×3, Space (tick), ↵. Order heights at 1366×768 against a 491 px viewport:
   - 08812: 1,541 px
   - 08841: 1,429 px
   - 08790: 1,378 px
   - 08902: 1,269 px

   So the round-3 rule "tick enabled immediately if the order fits" never fires. There is no batch signing either. At 190 files a day this is the difference between "helper" and "extra work".
4. **One routing rule would swamp the queue at scale.**
   - Every relative's certificate issued by a Tehsildar is put in "ध्यान दें", with a suggested **referral to the District Scrutiny Committee** (08863, 08754, 08721).
   - That is 3 of the 10 attention files in the demo. Across Kondagaon's pre-2026 archive it would be thousands of genuine files.
   - It also takes the legal position on the July 2026 HC ruling that the Revenue Secretary explicitly said the tool must *not* take (critique_4 §1.1 point 3).
5. **Privacy is mostly right, with three visible holes:**
   - Full ration-card numbers and khasra areas go into the **signed order**.
   - The citizen message does not list the records used (the DPDP notice).
   - The Audit page cannot answer "who saw *my* certificate?".

   The good parts: there are **no external calls** (every request in the network log is localhost), the audit shows what was on screen, and there is a callback with reason.
6. **The Collector page is honest on the model** (P 89.4%, R 48.4%, women's recall 32.8% shown). It still shows **"92% अधिकारी सुझाव से सहमत"** and **synthetic pilot outcomes that read like results** (−4.3 pp, 19→8 min). Both invite the "officers are being scored" and "you made up results" objections.

---

## (a) Integration realism: does it look like it lives inside Sewa Setu?

### What I saw
| Check | Status | Evidence |
|---|---|---|
| Separate login or separate app feel | **Fails visually** | Own brand bar "प्रमाण सहायक", own nav (केंद्र / अधिकारी / कलेक्टर / ऑडिट), and a role switcher on the landing page ("मॉक लॉगिन"). No Sewa Setu frame, no Sewa Setu application tabs, no "you are in Sewa Setu" cue. The footer line "सेवा सेतु से जुड़ने हेतु निर्मित" is the only hint. |
| Sewa Setu's real actions (Approved / Rejected / Sendback) | Partial | The dock offers स्वीकृत (A) / वापस भेजें (S) / संदर्भित करें (R) / अस्वीकृत (X). "Refer" has no Sewa Setu equivalent shown. The officer cannot tell which of these writes back to Sewa Setu's status (e.g., does Refer = Sendback-to-Patwari, or an internal Forward?). |
| Order / certificate / e-Sign / DigiLocker compatibility | Partial | The reasoned order is well built: "आदेश क्र. (ई-हस्ताक्षर पर आवंटित)", Hindi text is authoritative, r.3(3) cited, and it ends "(ई-हस्ताक्षर)". It is never said that **the certificate itself is still Sewa Setu's standard QR certificate pushed to DigiLocker**, with this order attached to the file for appeal. The citizen message says "सेवा सेतु पर डाउनलोड करें या सीएससी से लें" and does not mention DigiLocker. The e-Sign button reads "✍ ई-हस्ताक्षर (डेमो)", with no hint that it reuses Sewa Setu's existing eSign/DSC. |
| Shadow-mode toggle | **Missing** | No setting. The suggestion is shown pre-decision on every case (dock: "अभिलेखों का सुझाव: …"; card: "98% क्यों?"). |
| Fail-open ("lookup down → work as today") | Missing in the UI | The plan (§ architecture: "If the service is down, officers work exactly as today") is not demonstrated. The "offline demo" pill is a fixture fallback, not a fail-open state. |
| Uploaded documents viewable | Missing | On 08870 the officer must attest "स्कूल अभिलेख shows caste" but cannot open the scan. Inside Sewa Setu the native document viewer would sit beside the panel. **This is exactly why the embed view matters:** it explains where the documents are. |

### Findings
**P0-A1: Add a "Sewa Setu officer console" view with Praman as a side panel.** Build it as a new route `/sewasetu/:appId`, or as a "Sewa Setu frame" toggle on CaseView.
- **Left, about 60% (Sewa Setu native, styled plainly):**
  - The Sewa Setu header "सेवा सेतु · अधिकारी लॉगिन: अनुविभागीय अधिकारी (राजस्व), कोंडागांव".
  - Application tabs: आवेदन प्रपत्र / संलग्न दस्तावेज़ / भुगतान / इतिहास. Documents show as thumbnails with a click-to-view placeholder.
  - Sewa Setu's **own** buttons at the bottom: **Approve · Reject · Sendback** (plus Forward, if CHiPS confirms it exists).
- **Right, about 40%:** a collapsible panel "परिवार प्रमाण · प्रमाण सहायक", holding the existing VerdictCard, LineageCard and draft order.
- **Wiring:** the panel's "use this draft" fills Sewa Setu's remarks/order field, and the native Approve button signs.
- **Status strip:** "एकल लॉगिन (सेवा सेतु SSO) · कोई नया पासवर्ड नहीं · SDC में · पैनल बंद करें ⟨".
- **Failure state:** a visible state "प्रमाण सहायक अभी उपलब्ध नहीं — सामान्य रूप से कार्य करें", in which the native buttons stay live.
- **Acceptance:**
  1. From the landing page, one click opens 08790 inside the frame, and the jury sees Sewa Setu's three native actions.
  2. Collapsing the panel leaves a fully working Sewa Setu screen.
  3. The failure toggle greys out only the panel.
  4. The draft text appears in the native remarks box.
  5. It works at 1366×768 and 1536×864 without horizontal scroll.

**P0-A2: Add a shadow-mode switch.** Call it "पायलट चरण 1 · शैडो मोड": a menu toggle plus a pill in the bar.
- **When ON:**
  - Hide the lane chip, "अभिलेखों का सुझाव", the "98%" line and pre-ticked send-back reasons until the officer records a decision with the native buttons.
  - After the decision, reveal "अभिलेख जांच: आपके निर्णय से **सहमत / भिन्न** — क्यों?" and a one-tap "यह जांच उपयोगी थी? हाँ / नहीं / गलत परिवार".
  - Log disagreement as **tool feedback**, never as an officer metric.
- **Acceptance:**
  1. With shadow ON, the DOM of 08790 contains no "सुझाव" text before a decision.
  2. After Approve, the comparison appears within 1 s.
  3. The audit row says "शैडो: उपकरण जांच निर्णय के बाद दिखाई गई".

**P1-A3: Make action mapping explicit.** Add a one-line legend under the dock: "स्वीकृत = Approve · वापस भेजें = Sendback (आवेदक को) · संदर्भित = Sendback (पटवारी/समिति को, आवेदक को सूचना सहित) · अस्वीकृत = कारण बताओ → Reject". **Acceptance:** each dock button's tooltip names the Sewa Setu status it writes.

**P1-A4: Name the two issued artefacts.** In the sign dialog, add one line:
> जारी होगा: (1) सेवा सेतु का मानक प्रमाण पत्र — QR सहित, DigiLocker में; (2) यह तर्कसंगत आदेश — फाइल में, अपील (धारा 5) हेतु. ई-हस्ताक्षर: सेवा सेतु का मौजूदा eSign/DSC।

Add "DigiLocker में भी उपलब्ध" to the approval message. **Acceptance:** both lines are visible without scrolling in the sign dialog at 1366×768.

**P2-A5: Show an "ICD" footnote in presenter mode.** The API contract is: webhook `application.received` → `GET /evidence/{app_id}` → panel; `POST /draft` → the remarks field. It is read-only on the archive, with no write-back except the officer's own action. This answers the CHiPS CEO's "SI + interface control document" condition (critique_4 §1.2).

---

## (b) Officer-at-scale features

### Key-count and time budget (measured)
| Path (1366×768) | Keys today | Target |
|---|---|---|
| Records complete (08790, 08902) | Ctrl+↵ → Space ×3 (scroll the 1,378 px order) → Space (tick) → ↵ = **6** | **3** (Ctrl+↵, Space, ↵) |
| System-found match (08812) | C → ↵ (grounds) → Ctrl+↵ → Space ×2–3 → Space → ↵ = **7–8** | **5** |
| Send back on a missing document (08835) | S → Ctrl+↵ → scroll → tick → ↵ | unchanged; acceptable |

### Findings
**P0-B1: Make the read-tick rule actually fire.** The variable part of every order is about 20 lines. Most of the length is the fixed "विधिक आधार" block (4 bullets) and the "विचार किए गए अभिलेख" list.
- **Fold the fixed text:** show it as one line, "विधिक आधार — मानक पाठ (विधि विभाग द्वारा अनुमोदित होगा) ▸ 4 बिंदु". It is still **printed in full** in the issued order; it is fixed text the officer has already approved once.
- **Fold the corroborating list:** show "पुष्टिकारक अभिलेख (2) ▸".
- **Acceptance:**
  1. For 08790, 08902 and 08812 at 1366×768, `.order-preview.scrollHeight ≤ clientHeight`. The tick is enabled on open, and the clean path is Ctrl+↵, Space, ↵ = 3 keys.
  2. The expanded text is byte-identical to today's.
  3. Longer orders (show-cause, reject) still require the scroll.

**P0-B2: Add a sign tray: decide one by one, e-Sign once.** This follows NIC ServicePlus practice (bulk Approve & Issue ≤ 5) and Top-20 #9.
- On records-complete files, add "निर्णय सहेजें व अगला (Ctrl+S)". It records the decision and the read-tick, then adds the file to a **हस्ताक्षर ट्रे** with at most 5 files.
- The tray sits as a chip in the queue header: "ट्रे: 3/5 · एक OTP से हस्ताक्षर करें".
- Tray signing shows the 3–5 order numbers, then **one** e-Sign OTP.
- Files never opened, or files with an open flag, **cannot** enter the tray.
- Each file keeps its own callback window.
- **Acceptance:**
  1. Open 08743, 08790, 08758 and 08732, save each, and sign the tray: 4 orders get consecutive numbers, the audit has 4 rows with one shared e-Sign transaction ID, and 5 minutes of OTP waiting become 1.
  2. The tray button is disabled for any "ध्यान दें" file.
- **Pitch line:** "NIC itself allows 5 at a time. We allow 5 **only after each was opened and read**."

**P0-B3: Stop the tool contradicting itself on R and S.**
- On 08835, "आपका कार्य" says "वापस भेजें (S), **या पटवारी जांच हेतु संदर्भित करें (R)**".
- Pressing R then demands a 15-character finding because "आपकी कार्यवाही अभिलेखों के सुझाव से भिन्न है".
- **Fix:** any action named in "आपका कार्य" counts as *consistent*, and the finding requirement applies only to Approve against a flag, and to Reject.
- **Acceptance:** on 08835, R → Patwari → Ctrl+↵ opens the letter with no finding box.

**P0-B4: Tehsildar-issued certificates must follow policy, not be pre-judged.**
- **Today:** every Tehsildar-issued permanent certificate goes to "ध्यान दें", is marked "सत्यापन तक प्रमाण नहीं" and gets the suggestion "जिला छानबीन समिति" (08863).
- **Fix:**
  - Add a **policy setting** (Collector or CHiPS admin): "तहसीलदार द्वारा जारी पूर्व प्रमाण पत्र: [प्रमाण के रूप में मान्य, टिप्पणी सहित] / [पुष्टि आवश्यक]".
  - Default to the first option, with the chip "जारीकर्ता: तहसीलदार (2017) · विभागीय अधिसूचना अनुसार मान्य".
  - The lane stays "records complete" if everything else matches.
  - Scrutiny-committee referral is only a manual option.
- **Acceptance:**
  1. With the default, 08863, 08754 and 08721 move out of "ध्यान दें".
  2. Flipping the setting restores today's behaviour and shows "नीति: पुष्टि आवश्यक (अधिसूचना क्र. —)".
  3. The queue footer states which policy is active.

**P0-B5: Show wrong-authority routing prevention in the Tehsildar queue.** The CG HC July 2026 point: permanent caste goes to the SDO.
- The Tehsildar queue has **no** misrouted case, so the "competence guard" is only a footer sentence.
- **Fix:** add one seeded permanent-ST file to the Tehsildar desk. It shows a banner:
  > यह स्थायी जाति प्रमाण पत्र है — सक्षम प्राधिकारी: अनुविभागीय अधिकारी (राजस्व) (विभागीय अधिसूचना अनुसार)
- Approve/Reject are disabled and one button remains: "SDO को अग्रेषित करें". The routing rule comes from the same policy config as B4, not from the team's reading of the ruling.
- **Acceptance:** the Tehsildar cannot sign that file, one click moves it to the SDO queue, and the audit logs "अक्षम प्राधिकारी से अग्रेषित".

**P1-B6: Integrate the Patwari field-report request.**
- **Today:** R → Patwari produces a good letter (7-day deadline, (i)–(v) points), but it is addressed to "हल्का पटवारी" with no name or halka, it ends "— आदेश का अंत —", and it goes nowhere.
- **Fix:**
  1. Address it to the halka, e.g., "हल्का क्र. 14, पटवारी: (नाम)".
  2. Attach a **pre-filled वंशावली form**. Found certificates are listed as rows tagged "अभिलेख", and blank rows are tagged "मौखिक: कोटवार/सरपंच कथन".
  3. Show a 375 px "पटवारी ऐप / भुइयां में भेजा गया (डेमो)" preview.
  4. The queue shows the stage "पटवारी के पास · 3/7 दिन".
- **Acceptance:** 08841 → R → the letter plus the vanshavali preview. The queue row shows the Patwari stage timer, and the Collector stage tile counts it.

**P1-B7: Charge handover (leave or transfer).** Add "प्रभार सौंपें" in the menu.
- Pick the in-charge officer and a date range.
- Every pending file, show-cause timer and sign-tray item moves over, and the incoming officer sees a banner: "प्रभार: 28 लंबित, 2 कारण बताओ उत्तर प्रतीक्षित, 1 विलंबित".
- The audit logs it. This protects both officers under s.12.
- **Acceptance:** after a handover, the Tehsildar role sees the SDO's items with a "प्रभार में" chip, and signing uses the in-charge designation.

**P1-B8: Camp mode.** MIS in the app: camp OBC 42.6% and camp SC/ST 38.1% rejection, against 19% on the regular SC/ST service.
- **Kendra "कैंप सूची":** upload or enter the expected applicants for village X. Batch pre-check produces a printable sheet: "परिवार प्रमाण मिला (क्र.) / लाना है: …". It runs the **day before** the camp.
- **Officer camp view:** the queue is filtered to the camp village, with the same sign tray and offline-tolerant loading (cached evidence cards for that list).
- **Acceptance:** a 5-applicant camp list gives 5 pre-check rows in one call and a one-page printable list. Evidence cards are cached for the camp village, and a camp file opens with the network throttled to "Slow 3G" in under 3 s.

**P1-B9: My-desk strip misses overdue files.** The Tehsildar strip shows "3 दिन में देय: 1", while Kartik (08857) is "⏰ 4 दिन विलंब".
- **Fix:** add a "विलंबित" tile first, and make "3 दिन में देय" exclude overdue files.
- **Acceptance:** Tehsildar shows विलंबित 1 and 3 दिन में देय 0.

**P1-B10: The married-women note without an action.**
- 08835 (b. 2007, marital status unknown) shows "विवाहित महिलाओं हेतु मॉडल की पहचान-दर कम है … मायके का गांव देखें", but there is no button to do so.
- **Fix:**
  - Show the note only when the declaration says married.
  - Add "पिता के नाम + मायके के गांव से खोजें" (a village picker), which re-queries and logs the query in the audit.
- **Acceptance:** one click on a married-woman demo file finds the father's certificate in the maiden village.

**P2-B11: Low bandwidth.** The case JSON is fine, but the Vite dev bundle loads Cytoscape, Recharts and react-simple-maps on every page. For SDC hosting, lazy-load the Collector's charts and map and the FamilyGraph. **Acceptance:** the officer-route bundle is under 400 KB gzip.

---

## (c) Collector and CHiPS views: support, not surveillance

### What is right
- "केवल जिला व तहसील स्तर। किसी अधिकारी की रैंकिंग नहीं।"
- There are no officer names anywhere, and the district table is from the real MIS.
- **The evaluation panel is honest:**
  - P 89.4%, R 48.4%, F1 62.8%
  - women's recall 32.8%
  - Bastar/Surguja recall 46.1%
  - "सिंथेटिक + अलग रखा गया सेट; वास्तविक कैलिब्रेशन शैडो मोड में"
  - "परिशुद्धता सबसे महत्वपूर्ण…"
- The Audit footer says the log is not used to rank officers.

### Findings
**P0-C1: Remove "92% अधिकारी सुझाव से सहमत".**
- This is the override rate by another name. The Revenue Secretary called it "union dynamite" (critique_4 §2.3).
- Worse, in a shadow pilot "agreement with officers" is the wrong ground truth, because officer inconsistency is the thesis.
- **Replace with:** "उपकरण-असहमति मामले, नियम सुधार हेतु समीक्षित: n (लक्ष्य: सभी समीक्षित)" and "मिलान सही? अधिकारी प्रतिक्रिया: ✓ x · ✗ y".
- **Acceptance:** `officer_agreement_rate` is not rendered anywhere, and no officer-level field appears in `/api/pilot/stats`.

**P0-C2: Synthetic pilot numbers must not look like results.**
- The "पायलट क्या मापेगा" card shows −4.3 pp exclusion deltas, 71% cure rate and "19 → 8 मिनट". The only label is "नमूना", which in Hindi reads as "sample", not "made-up".
- **Fix:** turn it into a **targets and kill-criteria** card (numbers from critique_4 §5.3–5.4):
  - lineage precision ≥ 98%
  - exclusion Δ ≤ +1 pp, pause at +2 pp
  - cure rate ≥ 50%
  - officer usefulness ≥ 60%
  - and so on
- Show the value column as "पायलट में मापा जाएगा". If a demo value must stay, label it "काल्पनिक उदाहरण (सिंथेटिक)".
- **Acceptance:** no pilot-vs-control numbers render without the word "काल्पनिक/सिंथेटिक" next to each figure.

**P1-C3: The per-match "98%" conflicts with the set-level 89.4%.**
- Every match card says "98% क्यों? … प्रबल कड़ी". A judge who has just seen P = 0.894 at the exact threshold will ask "which one is true?".
- **Fix:** drop the percentage on the officer screen. Say "मॉडल: प्रबल कड़ी — परीक्षण में ऐसी कड़ियाँ ~9/10 सही; संबंध आप तय करते हैं". Keep the probability inside the waterfall accordion.
- **Acceptance:** no "%" appears in the officer case view outside the accordion.

**P1-C4: Collector tiles that help officers.** Add three tiles, all at tehsil level with no names:
1. "पटवारी प्रतिवेदन > 7 दिन लंबित (हल्का-वार)"
2. "कारण बताओ उत्तर प्रतीक्षित"
3. "कैंप जाति अस्वीकृति 41% बनाम नियमित 19% → कैंप पूर्व-जांच सूची बनाएं"

Also add the **random-review sample** (r.15(2) 10% plus flagged). **Acceptance:** each tile links to a filtered list of files, not people.

---

## (d) Items still open from round 3

| Item | Status now | Fix / acceptance |
|---|---|---|
| Read-tick rule and 3–4-key clean path | **Not met**: 6 keys; no order fits (1,269–1,541 px vs 491) | P0-B1 above |
| Garbled Hindi village names | **Still open, and one case is a correctness bug.** In the queue: मोह्लै, सेओनिपल, उपर्बेडी, संड्सा, उंला, बंचपै, मरंग्पुरी, अड्नर. In the fixture, **141 of 2,650 villages lose their number in Hindi**, e.g., "Bade Kilepal -2" → "बडे किलेपल -" and "Bastarnar-2" → "बस्टर्नर-", so two LGD villages get the same Hindi label in an order. 352 have visibly odd halant clusters. | **P0-D1:** (1) never drop digits: carry them over or convert to Devanagari numerals; (2) curated overrides for all demo villages; (3) for any name not hand-checked, show the English name plus LGD in orders ("ग्राम Bade Kilepal-2 (एलजीडी …)") rather than a guessed transliteration; (4) plan: LGD's local-language name field. **Acceptance:** 0 villages where the digits in en ≠ the digits in hi, and the demo-queue names are reviewed by a Hindi reader. |
| Same-looking names flagged as "वर्तनी भिन्न" | New | On 08812, 08863 and 08902 both Devanagari cells read "रामलाल मरकाम"; the difference exists only in Latin ("Ram Lal Markaam"). A Hindi-first officer sees "≈ भिन्न" between two identical strings. **Fix:** in Hindi UI, put the Latin variant first in the cell with an underline marking the differing part, or say "केवल अंग्रेज़ी वर्तनी भिन्न". |
| Landing: the story in 5 seconds | Partly | The hero banner "लोक सेवा केंद्र" is CSC-style and good. It uses about 190 px, the headline is citizen-framed, and the role cards start at about Y 740, below the 768 fold. **Fix:** a 3-frame strip under the headline: ① केंद्र: परिवार का प्रमाण पत्र मिला → ② SDO: साक्ष्य आमने-सामने, 3 कुंजी में हस्ताक्षर → ③ नागरिक: उसी दिन संदेश, DigiLocker. The primary CTA "सेवा सेतु में खोलें (SDO)" goes to the P0-A1 embed view. **Acceptance:** at 1366×768 the CTA and the 3-frame strip are both above the fold. |
| Kendra screen fixes | Open | (1) The certificate number wraps mid-token ("CG/KDG/SDO/2019/0 / 04512"): use `white-space:nowrap`. (2) Model jargon shown to a CSC operator ("प्रबल कड़ी / मॉडल कड़ी"): replace with "परिवार का प्रमाण पत्र मिला — अधिकारी पुष्टि करेंगे". (3) It still lists "पटवारी वंशवृक्ष — केंद्र पर लाएं" when a father's certificate is found; say "यदि उपलब्ध हो तो लाएं; न हो तो आवेदन रुकेगा नहीं" to match the officer view ("आदेश में दर्ज होगा"). (4) Demo prefill puts the Latin "Sunita Markam" in the Hindi UI. (5) The audit logs the pre-check as "संचालक, सीएससी कोंगेरा" although the demo is from Bayanar. |
| SVG icons | Open | Text glyphs and emoji remain: ✍ ⚖ ○ ⛨ on the landing page; ▣ ? ! ✓ ✗ in the verdict card; ✓ ↩ ⇆ ✕ ✍ in the dock; 🔒 🔍 📎 on Kendra. Replace them with one inline SVG set (Lucide-style, 20 px, `currentColor`). **Acceptance:** grep finds no emoji or dingbat in the TSX UI strings. |
| "✗ कमी" on a records-complete file | New | 08790 and 08902 are "अभिलेख पूर्ण" yet show a red-style "✗ कमी: वंशवृक्ष संलग्न नहीं". Use a neutral "– वंशवृक्ष: संलग्न नहीं (आदेश में दर्ज)" row and keep ✗ for real blockers. |

---

## (e) Security and privacy visible in the product

| Check | Status |
|---|---|
| No external calls | **Pass.** Every request in the network log is localhost; fonts come from @fontsource. Say so on screen: "SDC के भीतर · कोई बाहरी API नहीं" in the officer bar's pill tooltip (today it is only on the landing page). |
| Audit: what the officer saw | **Pass.** Each case open lists the records shown; the signed row has "▸ स्क्रीन पर क्या दिखा"; retention is labelled "DPDP नियम 2025 · लॉग ≥ 1 वर्ष". |
| "Who saw my data" | **Missing.** There is no filter by certificate or applicant. Ramlal Markam's certificate CG/KDG/SDO/2019/004512 was viewed 3 times (Kendra, open, confirm), and nobody can pull that list in one step. |
| Masking | **Fails in the signed order.** "राशन कार्ड 2295269691" (08812) and "2257517953" (08841) are printed in full, along with "खसरा 182/8, 1.14 हे.", in a caste order that goes on file and to the applicant. |
| DPDP notice to the applicant | **Missing.** The approval WhatsApp message has no "records used" list and no grievance or correction contact. |
| Third-party data at the Kendra | Borderline. The CSC operator sees the relative's certificate number, issuer, date and romanised name before any officer confirms. Acceptable for a *declared* relative; for system-found relatives show only "परिवार का प्रमाण पत्र मिला" plus the issuing office (critique_4 §1.4 point 3). |
| Minors (DPDP s.9) | No marker. 08856 (b. 2009) and 08812 (b. 2008) are children. P2: add a small "अवयस्क" chip that suppresses any "prior application" or "duplicate" flags. |

**P0-E1: Mask identifiers in orders and letters.**
- Show ration cards as "राशन कार्ड ••••9691".
- Drop khasra area and number from caste orders; "भुइयां: खसरा धारक — रामलाल मरकाम (पुष्टिकारक)" is enough.
- **Acceptance:** a regex `\d{8,}` finds no match in any order preview for the 8 demo cases, apart from certificate and application IDs.

**P0-E2: Add a records-used line to the citizen message.** Append:
> आपके निर्णय में उपयोग हुए अभिलेख: प्रमाण पत्र क्र. CG/KDG/SDO/2019/004512 (परिवार)। देखे गए अन्य अभिलेख: भू-अभिलेख, राशन सूची (केवल पुष्टि हेतु)। सुधार/आपत्ति: सीएससी या सेवा सेतु शिकायत।

It must pass the existing entity checker. **Acceptance:** the 08812 approval message contains the certificate number and a grievance route, and the checker reports 0 unsupported entities.

**P1-E3: "किसने देखा" filter on Audit.**
- Add a search box for a certificate number or application number, returning each access with its date, role, office and purpose.
- Add a "नागरिक को यह सूची दें (DPDP s.11)" print button.
- **Acceptance:** entering 004512 returns the Kendra, open and confirm rows only.

---

## Benchmark: what would make a CG SDO say "I want this tomorrow"
| Other state's tool | What their officers get | Praman today | The one feature to show |
|---|---|---|---|
| NIC ServicePlus (Bihar, e-District) | Bulk Verify ≤ 25, bulk Approve & Issue ≤ 5, Callback with reason | Callback ✔ (10 min); no batch | **Sign tray, max 5, one OTP** (P0-B2) |
| Karnataka e-Kshana + Samyojane | Instant issue when records match; otherwise a VA field-app check | Records-complete lane ✔; Patwari letter, not an app | **Pre-filled vanshavali to the Patwari, with a stage timer** (P1-B6) |
| Telangana MeeSeva | Tehsildar "not competent → RDO" checkbox | Footer sentence only | **Misrouted file → "SDO को अग्रेषित"** (P0-B5) |
| AP GSWS | Father's certificate → child's on declaration; 25% random rejection review | Declared lineage ✔ | **Random-review sample tile** (P1-C4) |
| Haryana SARAL | Bottleneck-by-stage views (copy); officer scores (do not copy) | District table; the 92% agreement tile | **Stage tiles; remove agreement** (P0-C1, P1-C4) |
| NIC e-Office | Green/yellow note, DFA versions | "सिस्टम पाठ / आपका पाठ" split ✔ | Label it "प्रारूप (DFA) v1 → आपका हरा नोट" (P2) |

**The "tomorrow" feature:** *"Open 5 clean files, read each order in one screen, sign all five with one OTP, and the Patwari gets a pre-filled vanshavali for the doubtful ones."* It saves the OTP wait on every clean file and about 2 weeks on the doubtful ones, which is where the 22-day SLA actually goes.

---

## TOP 8 changes for this round (about 2–3 h, officer impact plus a jury-visible integration story)
| # | Change | Why the jury or officer cares | Est. | Acceptance (short) |
|---|---|---|---|---|
| 1 | **Sewa Setu console frame with the Praman side panel**, native Approve/Reject/Sendback, SSO strip, collapse, and a fail-open state (P0-A1). The landing CTA goes here. | Answers CHiPS's #1 question, "is this a new app?", in one glance | 45 min | 08790 opens in the frame; collapse and failure leave native buttons live; the draft fills the remarks field |
| 2 | **Shadow-mode toggle** (P0-A2): suggestion, lane and % hidden until the decision; then "सहमत/भिन्न — क्यों?" plus a one-tap feedback | This *is* the pilot ask; it removes anchoring | 25 min | No "सुझाव" in the DOM pre-decision; reveal after decision; audit notes shadow |
| 3 | **3-key clean path**: fold the fixed legal-basis and corroborating blocks so orders fit and the tick is live on open (P0-B1) | Speed on 4 of 5 files a day | 20 min | 08790, 08902, 08812: scrollHeight ≤ clientHeight; Ctrl+↵, Space, ↵ signs |
| 4 | **Sign tray (≤ 5, one OTP)** for individually opened records-complete files (P0-B2) | The "I want this tomorrow" feature; matches NIC's cap | 35 min | 4 files → 1 OTP → 4 consecutive order numbers; flagged files blocked |
| 5 | **Policy-configurable Tehsildar-issued rule**, default "valid with note", plus a **misrouted-file → SDO** demo in the Tehsildar queue (P0-B4, P0-B5) | Prevents thousands of false "attention" files; follows the notification, not the team's reading of the HC ruling | 25 min | 08863/08754/08721 leave ध्यान दें by default; the Tehsildar cannot sign the seeded permanent-caste file |
| 6 | **Patwari request that goes somewhere**: halka-addressed letter, pre-filled vanshavali preview, queue stage timer; fix the R/S "differs from suggestion" contradiction (P1-B6, P0-B3) | Moves the real bottleneck (Patwari, about 2 weeks) | 30 min | 08835 R needs no finding; 08841 R shows the vanshavali with record/oral rows; the queue shows "पटवारी के पास 0/7" |
| 7 | **Privacy and correctness in what is issued**: mask ration/khasra in orders; "records used plus grievance" line in the citizen message; "किसने देखा" audit filter; **no dropped digits in Hindi village names** (P0-E1, P0-E2, P1-E3, P0-D1) | DPDP visible in the product, and no wrong-village orders | 30 min | No `\d{8,}` in orders; 004512 search gives 3 rows; 0 digit mismatches in 2,650 villages |
| 8 | **Collector honesty and support**: remove "92% सहमत"; turn synthetic pilot numbers into a targets and kill-criteria card; drop the per-match "98%"; add Patwari-pending, show-cause-pending and camp tiles (41% vs 19%) (P0-C1, P0-C2, P1-C3, P1-C4) | Kills the "surveillance" and "made-up results" objections; shows the dashboard helping officers | 25 min | No agreement % anywhere; every pilot figure is labelled target or synthetic; 3 support tiles link to file lists |

**Defer to P1/P2 if time runs out:**
- charge handover (B7)
- camp list (B8)
- maiden-village search (B10)
- SVG icon set
- the landing 3-frame strip
- the Kendra fixes
- the minor chip
- the ICD footnote

**Keep what works:**
- callback with reason
- show-cause before reject
- Hindi-authoritative order
- cancellation-register check (08856)
- the honest eval panel
- no external calls

---

## Demo script delta (for the 5-minute slot)
1. The landing CTA opens **Sewa Setu → 08790** in the embed frame. Say: "Same Sewa Setu screen, same Approve button, one new panel."
2. Toggle **shadow mode**: the panel shows nothing until the officer approves, then shows "सहमत". Say: "That's the 90-day pilot."
3. Turn shadow off and **save 4 clean files into the tray**, then one OTP. Say: "NIC allows 5; we allow 5 only after each is read."
4. On **08841**, R → Patwari, with the pre-filled vanshavali. Say: "The two weeks move here."
5. Close on **Collector**: targets and kill criteria, with no officer scores. Then the **Audit** page with "who saw certificate 004512".
