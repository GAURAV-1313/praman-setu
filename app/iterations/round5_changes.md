# Round 5 changes (final): stage reliability and consistency (27-09-2026)
Input: `iterations/round5_critique.md` (all P0s, the TOP 8, most P1s and P2s). Lens: the presenter on a 1366×768 laptop, a hostile QA tester, and a CHiPS juror. All round 1–4 safeguards are kept.

## Result in one line
- The 5-minute script now runs the same way every time, from one URL (`/?demo=reset`), with one-click jumps for every step.
- The hero file stays on screen after signing, with the WhatsApp message.
- Everything fits a real 1366×657 browser window and a 1536×730 window, in Hindi and English.
- It also works offline.

## P0 fixes
1. **After signing, the page stays on the file (P0-1).**
   - **Stale closure fixed:** `SignModal`'s one-time keydown listener now calls `onSignRef.current`. So ↵ always uses the current "फिर अगला प्रकरण" tick. Verified both ways:
     - ticking it on 08835 → ↵ moves to 08870
     - unticking it on 08790 → ↵ stays
   - **"फिर अगला प्रकरण" is OFF by default** (`ps_autonext === "1"` only).
   - **After the decision:**
     - the page scrolls to the top, and the "नागरिक को भेजा गया संदेश" WhatsApp card is at y≈120
     - the dock shows "✓ निर्णय दर्ज … जारी क्रमांक", **"संदेश देखें"**, "जारी पाठ देखें", "वापस लें" and **"अगला प्रकरण → (J)"**
   - **The citizen message is stored with the decision** (backend `decisions[..].citizen_message` and `show_cause[..].citizen_message`, plus the offline mock). `/issued` returns it, so a decided file you revisit can still show "संदेश देखें".
2. **Reset restores every UI mode (P0-2).** The new `src/demo.ts` does this.
   - **`clearUiState()` clears:**
     - every `ps_*` key in localStorage and sessionStorage: shadow, presenter, autonext, role, last case and the offline simulation state
     - the language, which is set back to Hindi
     - the service-down switch: it lives in `?down=1` and reset goes to `/`
     - the policy, which the backend reset restores to its default
   - **⋯ → "डेमो रीसेट करें"** now runs `resetDemo()`: mock reset, `POST /api/reset`, clear the UI state, then load `/`.
   - **`?demo=reset` on any URL** runs this before the first render and then removes the parameter. The path is kept, so `/sewasetu?demo=reset` stays on the console.
   - **`POST /api/reset` done elsewhere** (for example `reset_demo.sh`) now changes the backend `reset_id`, which `/api/health` returns and the state file persists. On the next page load the browser sees the new id and clears its UI modes.
   - **Verified:**
     - shadow + presenter + EN + autonext → menu reset → only `ps_lang=hi` and `ps_reset_id` are left, with no shadow pill
     - the same result via `curl /api/reset` and a reload
3. **Layout at 1366×657 and 1536×730 (P0-3).**
   - **C/N pair moved above the comparison rows.** "वही परिवार / यह परिवार नहीं" sits right under the validity strip, with the spelling-mark row still in view. Measured positions on 08812 (the dock's top edge is 590 at 1366×657 and 663 at 1536×730):

     | Viewport | Language | Buttons (top–bottom) | Dock top |
     |---|---|---|---|
     | 1366×657 | HI | 416–458 | 590 |
     | 1366×657 | EN | 476–518 | 590 |
     | 1536×730 | HI | 430–472 | 663 |
     | 1536×730 | EN | 451–493 | 663 |

   - **Console Praman panel has C/N buttons (P1-4).** They sit inside the "आपका कार्य" line (no keyboard letters in the console), with the same grounds popover and Undo.
     - After ✓, the lane becomes records complete and "यह प्रारूप उपयोग करें" is enabled. So 08812 can be approved without leaving the console.
     - Button positions: 364–454 (HI) and 413–499 (EN) at 657; 364–444 at 730.
   - **Sign sheet at short heights** (`@media (max-height: 700px)`):
     - tighter line height and chrome
     - the issue note is hidden
     - the "read to the end" hint floats above the tick, so it no longer adds a line
     - the EN footer stays on one line, and the EN tick label is shorter
   - **Every clean file now fits with no scroll, so the tick is 1 Space,** at 1366×657 in HI and EN: 08790, 08812 (after C), 08835, 08841, 08743, 08863 (the round-4 exception), 08902 and 08732.
   - No horizontal scroll on the landing, console, case, Collector or Audit pages at either size.
4. **Shared backend (P0-4).**
   - `reset_demo.sh` prints the stage hygiene (one window, one tab on `/?demo=reset`, zoom 100%, F11 on a 1366 screen, no other sessions).
   - The same list is in `SEWA_SETU_PLAN.md` §7.

## TOP 8 / P1 fixes
- **Tagline (P1-1):**
  - HI: "सेवा सेतु के भीतर · परिवार के मौजूदा प्रमाण पत्र से कड़ी (डेमो)"
  - EN: "Inside Sewa Setu · links to the family's existing certificate (demo)"
  - The plan's gloss is now "evidence bridge".
  - A grep for `Sahayak | साक्ष्य सहायक | Evidence Assistant` finds 0 product-name strings. The only "सहायक" left is the console's native tab "सहायक दस्तावेज" (supporting documents).
- **DSC wording everywhere (P1-2):**
  - **Templates:**
    - header "…एवं डिजिटल हस्ताक्षर (DSC) हेतु"
    - signature line "(डिजिटल हस्ताक्षर — DSC)"
    - issued stamp "DSC-हस्ताक्षरित (डेमो) दिनांक …" / "DSC-signed (demo) on …"
  - **Preview number:** "(हस्ताक्षर पर आवंटित)".
  - **Tray:** "क्रमांक हस्ताक्षर पर".
  - **Help:** "पुष्टि में: DSC टोकन से हस्ताक्षर / भेजें".
  - **Transaction id** is `DSC-…`, and the audit reads "DSC token transaction".
  - **Console native order** uses the same signature line.
  - **Kept:** "क्यूआर / ई-हस्ताक्षर सत्यापित", which describes the *old* certificates.
- **Reject after "no reply" (P1-3):**
  - The order no longer says "{due date} तक कोई उत्तर प्राप्त नहीं हुआ" on a date before that due date. It now says "सुनवाई की अवधि समाप्त होने पर कोई उत्तर प्राप्त नहीं हुआ (डेमो अनुकरण: समय अवधि के अंत तक आगे बढ़ाया गया)" (EN: "…demo simulation…").
  - "आपका कार्य" in the no-reply branch reads "सुनवाई की अवधि में उत्तर प्राप्त नहीं (डेमो: समय आगे बढ़ाया गया) — …".
  - The reject citizen message now carries the "records used" line.
- **Camp tile (P1-5):**
  - It compares like with like, from `data/sewasetu_mis_service_2026-09-27.csv`: **SC/ST camp 38.1% (1,256 / 3,296 decided) vs SC/ST regular 18.98%**, both rejected ÷ decided. The screen shows "38% बनाम 19%".
  - Label: "अ.जा./अ.ज.जा. प्रमाण पत्र अस्वीकृति: कैंप बनाम नियमित अ.जा./अ.ज.जा. सेवा", with the basis line and "यह अंतर है, कारण नहीं: कैंप में अधिक अस्वीकृति क्यों है, यह MIS से ज्ञात नहीं।"
  - Backend and offline mock match.
- **Console counters and dots (P1-6):** they use one clock, the officer's due date (application due − 4), and one window. Red means past it; yellow means due in ≤ 2 days (legend: "नियत तिथि के करीब (≤ 2 दिन)"). Today: 3 yellow dots, "आगामी दो दिवस … 3", "समय सीमा के बाद 0".
- **Collector over-claim (P1-7):** it now reads "परिकल्पना, निष्कर्ष नहीं: इनमें से कितने आवेदकों के माता-पिता/भाई-बहन के पास पहले से सेवा सेतु प्रमाण पत्र है — शैडो पायलट के पहले सप्ताह में एक क्वेरी से मापा जाएगा।"
- **Citizen wording (P1-8):**
  - "आपके आवेदन पर निर्णय में उपयोग हुए अभिलेख" appears in the approve and reject messages, live and offline.
  - Send-back messages drop legal parentheticals (`(… नियम 3(3) … क्रीमी लेयर …)`) through `messages.plain_words`. The notice itself keeps them.
- **Community names (P1-9):**
  - Flag titles and validity headlines use the category only. 08749 no longer shows "(कंवर)" and 08838 no longer shows "(यादव/राउत)".
  - The verdict card's evidence line shows the category only. For 08856 it no longer puts "भतरा" next to "निरस्त".
  - Community names now appear only in the neutral comparison row and in the application's own claim.
- **Landing (P1-10):**
  - The banner is `hero-banner.jpg`, cropped at x=1680 of 1920, so the Aadhaar-like "FRISNEFR" card is gone. It is shown as a strip (`clamp(130px, 13vw, 196px)`) with its text intact.
  - A credit line sits under the headline: "सेवा सेतु ने गति दी (95.7% समय पर, वास्तविक MIS) · हम साक्ष्य जोड़ते हैं, नया पोर्टल नहीं".
  - The CTA opens the console pending list.
  - At 1366×657, the CTA ends at 581 px and the credit line at 461 px.
- **Demo mode (item 7):**
  - ⋯ → "डेमो मोड · 5-मिनट स्क्रिप्ट" sits at the top of the menu, and the menu now draws above the dock.
  - The console header has the same list under "डेमो ▾".
  - The seven steps are: 0:00 console list · 0:20 console 08790 · 1:05 08812 · 2:20 08835 · 2:55 08841 · 3:55 Collector · 4:35 Audit (`/audit?q=004512`, which pre-fills 004512).

## P2 done
- **08915 (wrong desk):**
  - the banner is no longer doubled
  - the queue shows a "गलत डेस्क" chip, not a green lane
  - "आपका कार्य" says forward, and the C/N buttons and keys are hidden
- **Domicile (08902):** the issue note and the reject template say "नियमानुसार अपील", not "धारा 5".
- **Future-dated certificates** read "भविष्य की तिथि, संभवतः प्रविष्टि त्रुटि; मूल प्रति देखें".
- **Kendra family tree:** "उपलब्ध हो तो लाएं; नहीं तो पटवारी से मंगाया जा सकता है".
- **Masked Aadhaar and mobile** now use digits from a hash (08790 shows "…0966" and "…7694"), not the application number.
- **Refer and notice sheets** say "संदर्भ पत्र / पत्र का अंत / मैंने पूरा संदर्भ पत्र पढ़ लिया है". The notice strip says "जारीकर्ता".
- **Console:**
  - the draft CTA now has a verb: "यह प्रारूप उपयोग करें: …"
  - after a decision, ✔ सबमिट / ✖ बंद are replaced by "← लंबित सूची पर लौटें"
- **Queue:**
  - labels read "सभी (निर्णीत सहित)" and "आज जारी आदेश"
  - counters show "—" while loading, not 0
- **Offline audit vocabulary** now matches online ("प्रकरण खोला (अभिलेख दिखाए)", Hindi notes).
- **Collector:**
  - the "hard" slice is renamed to explain its high recall
  - numbers use Indian grouping (3,178 / 3,92,604 / 4,883)
  - the lane mix adds up to 100%
  - one period label everywhere ("पोर्टल आरंभ से संचयी, 27-09-2026"; the landing matches)
- **`/api/precheck` with `consent:false`** now returns 400 (the offline mock does the same).
- **Plan §7:** 97% → 98%, 61% → 62%, and the send-back story now matches 08835. The final click path replaces the old one.
- **Not done (low value or risky the night before):** swapping community-unrealistic surnames (08749, 08915; this changes archive matching) and varying the Patwari name. The duplicate GET per case open under StrictMode was already de-duplicated in the backend audit (3 s window).

## Tests
- **`uv run pytest -q`:** 71 passed (was 64). New tests:
  - `reset_id` changes on reset
  - `/issued` carries the citizen message, with the new wording and DSC wording
  - the no-reply reject order never states a future date as past
  - send-back messages have no legalese
  - flags name categories, not communities
  - the camp tile compares SC/ST with SC/ST
  - precheck refuses without consent
- **`npm run build`:** passes (tsc clean).
- **`scripts/export_fixtures.py`:** re-exported. The fixtures carry the DSC wording, the new messages, the no-reply wording, the category-only flags and the eval text.
- **Browser rehearsal of the full script:** a scripted DOM run with real key events on tab-1 (C, ↵, Ctrl+↵, Space, S, R), plus manual pane key presses for the first run.

  | Run | Viewport | Language | Backend | Result |
  |---|---|---|---|---|
  | 1 | 1366×657 | HI | live | pass |
  | 2 | 1366×657 | HI | live | pass, after `?demo=reset` |
  | 3 | 1366×657 | EN | live | pass |
  | 4 | 1536×730 | HI | live | pass |
  | 5 | 1536×730 | EN | live | pass |
  | 6 | 1366×657 | HI | stopped (offline fixtures, "ऑफ़लाइन डेमो" pill) | pass |

  - **Every run gave identical outcomes:**
    - console 08790 → SDO-KON/2026/0001
    - 08812 → SDO-KON/2026/0002, staying on the file with the message
    - 08835 → SDO-KON/NTC/2026/0001, with no legalese
    - 08841 → SDO-KON/REF/2026/0001, "पटवारी के पास · 0/7 दिन"
    - Collector camp "38% बनाम 19%"
    - Audit 004512 → 3 rows (open, confirm, order)
  - **Every sign sheet** fitted with 1 Space.
  - **Service-down toggle:** the panel showed "उपलब्ध नहीं" and the native flow was unaffected.
  - **0 console errors.**
- **End state:** `POST /api/reset` done, and the viewport reset to desktop.

## Final 5-minute click path
**Pre-flight (T−2 min):**
1. Run `backend/reset_demo.sh`, or simply open **`http://localhost:5173/?demo=reset`** in the ONLY tab (zoom 100%, F11 on a 1366 screen).
2. No other agents or sessions on :8000.
3. Put the offline build in tab 2 and the backup video in tab 3.

| Time | Screen | Exact actions (⋯ → Demo mode, or "डेमो ▾" in the console, jumps to any step) | Line |
|---|---|---|---|
| 0:00–0:20 | Landing → console pending list | "सेवा सेतु में खोलें (एसडीओ) →" → tick "प्रमाण: तात्कालिकता से क्रम" | "Sewa Setu's own pending list. We add one column." |
| 0:20–1:05 | Console **08790** | Row 08790 → "निर्णय / जांच सूची" → panel "यह प्रारूप उपयोग करें" (123/200 plus the PDF) → ◉ अनुमोदित → ✔ सबमिट → **Space** → **↵** → ✓ declaration → `123456` → Sign PDF → OK. Tick "अनुकरण: प्रमाण सेवा उपलब्ध नहीं" for 3 s, then untick. | "Same Approve, same DSC token. If we are down, nothing changes." |
| 1:05–2:20 | **Sunita 08812** (डेमो ▾ → 1:05) | Point at the ≈ spelling row → **C** → **↵** → **Ctrl+↵** → **Space** → **↵** → the page stays, with the WhatsApp card at the top | "Only the officer decides it is her father. The order cites certificate 004512 and r.3(3)." |
| 2:20–2:55 | **Pooja 08835** (⋯ → 2:20) | **S** → **Ctrl+↵** → **Space** → **↵** → message (plain Hindi) | "Missing data never becomes a rejection. Same application, no new fee, 30 days." |
| 2:55–3:40 | **Kiran 08841** (⋯ → 2:55) | Point at "भाई के प्रमाण पत्र से वर्ग भिन्न" → **R** (pre-filled vanshavali) → **Ctrl+↵** → **Space** → **↵** → "पटवारी के पास · 0/7" | "The officer decides; we make sure they see it." |
| 3:40–3:55 | (optional) Meena 08856 | **X** → show "सुनवाई सूचना (15 दिन)" → **Esc** | "Rejection is impossible without a hearing notice." |
| 3:55–4:35 | **Collector** (⋯ → 3:55) | Scroll: tiles (camp 38% vs 19%, SC/ST vs SC/ST) → real MIS → 22%→62% (hypothesis) → pilot stop rules → model card | "Real, dated. Pilot targets, not results." |
| 4:35–5:00 | **Audit** (⋯ → 4:35) | 004512 is pre-filled → **खोजें** → "नागरिक को यह सूची दें" | "Every access is logged." |

**Q&A:** Kendra pre-check; shadow mode (⋯ → शैडो मोड; 08812 shows no suggestion); console 08812 C/N inside the panel.

## Files touched
- **Frontend:**
  - `src/demo.ts` (new)
  - `src/components/DemoLinks.tsx` (new)
  - `src/assets/hero-banner.jpg` (new, cropped)
  - `main.tsx`, `Layout.tsx`, `ActionPanel.tsx`, `LineageCard.tsx`, `VerdictCard.tsx`, `orderText.ts`
  - `pages/CaseView.tsx`, `Queue.tsx`, `SewaSetuConsole.tsx`, `Landing.tsx`, `Collector.tsx`, `Audit.tsx`, `Kendra.tsx`
  - `api/types.ts`, `mock/mockServer.ts`, `mock/fixtures/*`, `styles.css`
- **Backend:**
  - `api.py`, `engine.py`, `messages.py`, `evaluate.py`, `model/eval.json`
  - `templates/order_*.j2`, `templates/msg_approve.*`, `templates/msg_reject.*`
  - `tests/test_api.py`, `reset_demo.sh`
- **Plan:** `SEWA_SETU_PLAN.md` (§ gloss, §3 62%, §7 click path and hygiene).
