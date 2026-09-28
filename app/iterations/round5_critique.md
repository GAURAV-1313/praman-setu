# Round 5 critique (final): demo rehearsal, bug bash, consistency
27-09-2026, the evening before judging. **Lens:** the team member driving the 5-minute live demo on a projector (1366×768 / 1536×864), a hostile QA tester, and a CHiPS juror watching.

**Method**
- Ran `POST /api/reset` and used the live app (:5173 → :8000) on tab-1 with HI and EN, the SDO and Tehsildar desks, the console and every route.
- The pane's mouse and keyboard input did not reach the page, and its viewport emulation was repeatedly cleared by pane resizes. So I:
  - drove every flow with real DOM key events and clicks in tab-1
  - measured layout, fit, overflow, console errors and screenshots in a separate headless Chrome (CDP) at 1366×768, 1366×705, 1366×657, 1536×864, 1536×760 and 1280×720
  - tested offline mode there by **blocking `/api/*`** (the backend was never stopped)
- **Concurrency note:** another session was editing and acting on the same backend while I tested:
  - 08790 was approved and opened by someone else at 21:07
  - the rename to "Praman Setu" hot-reloaded mid-run

  On stage there must be **one browser, one tab, and a reset 2 minutes before**.
- No code was edited. The backend was reset at the end (`/api/audit` is `[]`, the policy is back to default). The viewport was reset to desktop, and localStorage was restored (`ps_autonext` removed, shadow 0).

**Clean bill (verified):**
- **Errors and assets:**
  - 0 console errors or exceptions on 10 routes × 2 viewports
  - 0 broken images (crest, banner, service icons)
  - 0 horizontal overflow at 1366 and 1536
  - 0 clipped buttons or chips
  - no text under 12.5 px
- **Language:** no untranslated strings in EN, only bilingual names.
- **Offline fallback:** queue, 08812 confirm+sign, 08835 send-back, console 08790, Collector, Audit and Kendra all work with the "ऑफ़लाइन डेमो" pill.
- **Sign sheet fits with no scroll** (so the tick is 1 Space) for 08743, 08863, 08790, 08812, 08835, 08841, 08856 and 08902 at 1366×768, 1366×705, 1536×864, 1536×760 and 1280×720. The one exception is 08863 at 1366×657, which needs 1 extra Space.
- **Features that work:**
  - tray (2 files → one passcode → SDO-KON/2026/0003–0004)
  - callback with reason
  - N with grounds (blocked with no ground)
  - C with grounds
  - forward of 08915 (Approve and Reject disabled, audit row)
  - Patwari R with the pre-filled vanshavali and "पटवारी के पास 0/7"
  - hearing notice HRG/0001 → "no reply" → reject order 0002
  - shadow mode (no "सुझाव", no %)
  - service-down (the panel greys out; the native decision panel works)
  - who-accessed search 004512
  - Kendra consent gate (Search stays disabled until ticked)
- **MIS figures match `/Users/gaurav/HACKATHON/data` exactly:**
  - 53,85,535 applications
  - 48,63,282 approved
  - 3,64,124 rejected
  - 4,264 pending past the limit
  - 95.7% on time
  - 22.2% → 61.9% caste share
  - district range 2.3–13.2%
  - Kondagaon 11.6%

---

## 1. Timed rehearsal of the planned script (SEWA_SETU_PLAN §7, adapted)
Times are the narration a presenter needs, plus measured UI latency (every action responds in under 1.5 s live or offline).

| # | Segment | Keys / clicks | Est. time | What confused or could look fake |
|---|---|---|---|---|
| 1 | Officer queue | open /officer | 0:20 | Sunita is **row 8, below the fold**, so you need a scroll or the "सामान्य जांच" chip. The counters flash **0** for ~1 s while loading. |
| 2 | Sunita 08812 (hero) | open → C → ↵ → Ctrl+↵ → Space → ↵ | 1:25 | **The app jumps to 08710 (Budhram) right after signing** ("फिर अगला प्रकरण" is on by default), so the WhatsApp hero shot disappears. You must click "संदेश देखें" in the toast (**P0-1**). The plan script says "97%", but the app says 98.3% inside "क्यों?". |
| 3 | Send-back, Pooja 08835 | S → Ctrl+↵ → Space → ↵ | 0:40 | It also auto-jumps (to 08870). The citizen message contains legalese ("नियम 3(3) के अंतर्गत क्रीमी लेयर जांच"). The plan's "roster name differs from affidavit" story no longer matches this case (it is missing caste proof plus the father's income certificate). |
| 4a | Needs attention, Kiran 08841 | R → (vanshavali drawer) → Ctrl+↵ → Space → ↵ | 0:45 | This is good. The letter sheet says "आदेश पढ़ें … आदेश का अंत" for a **reference letter**. |
| 4b | Meena 08856 cancelled | X → **type ≥15 chars** → Ctrl+↵ → Space → ↵ → "नियत तिथि तक उत्तर नहीं" → X → Ctrl+↵ → Space → ↵ | 1:10 | It needs live typing (breaks demo hygiene). The **final reject order is dated 27-09-2026 but says "12-10-2026 तक कोई उत्तर प्राप्त नहीं हुआ"** (P1-3). The card names a real tribe (भतरा) next to "निरस्त … जनजाति स्थापित नहीं हुई" (stage rule: no community name next to a flag). |
| 5 | Kendra pre-check (Sunita) | डेमो: सुनीता → consent tick → search | 0:30 | The result says "वंशवृक्ष … केंद्र पर लाएं", but the officer view treats it as optional ("संलग्न नहीं — आदेश में दर्ज होगा"). |
| 6 | Console 08790 | dashboard → row → tab → "यह प्रारूप…" → अनुमोदित → सबमिट → Space ↵ → declaration ✓ + 6-digit passcode → Sign PDF → OK | 1:00 | The dashboard counter "आगामी दो दिवस में … **0**" sits next to **4 yellow dots** (P1-6). Aadhaar and mobile show "XXXX XXXX **8790**" / "••••••**8790**", the same digits as the application number (P2). **08812 in the console is a dead end:** the panel says "(C)/(N)", but there are no C/N buttons (P1-4). |
| 7 | Collector (real MIS) | scroll | 0:40 | The "**41% बनाम 19%**" tile compares camp **SC/ST+OBC** with regular **SC/ST only** (P1-5). "अधिकांश अस्वीकृतियाँ उस प्रमाण से जुड़ी हैं जो प्रायः … पहले से अभिलेखागार में है" is an **unverified claim** (P1-7). |
| 8 | Audit "who accessed" | type 004512 → खोजें | 0:25 | This works and is strong. |
| | **Total** | | **≈ 7:00** | About 2 minutes over. Cut 4b and 5, and merge the console with the clean file. |

### Recommended 5:00 click path (after the TOP-8 fixes; exact keys)
**Pre-flight (T−2 min):**
1. Run `reset_demo.sh`.
2. Close all other tabs and agents on :8000.
3. Press F11 to go fullscreen at browser zoom 100%. Otherwise, at 1366×657 the C/N buttons sit under the dock and the landing CTA is below the fold.
4. Set ⋯ → shadow **off** and presenter **off**, with HI selected.
5. Untick "फिर अगला प्रकरण" once, or ship fix P0-1.
6. Keep the offline build in tab 2 and the backup video in tab 3.

| Time | Screen | Exact actions | Line |
|---|---|---|---|
| 0:00–0:20 | Landing → console dashboard | Click **"सेवा सेतु में खोलें (एसडीओ)"**, then tick "प्रमाण: तात्कालिकता से क्रम" | "This is Sewa Setu's own pending list. We add **one column**." |
| 0:20–1:05 | Console **08790** (clean file) | Click the row → "निर्णय / जांच सूची" → **"यह प्रारूप…"** (remark 123/200 plus the PDF) → ◉ अनुमोदित → ✔ सबमिट → **Space** → **↵** → ✓ declaration → `123456` → **Sign PDF** → OK. Tick **"प्रमाण सेवा उपलब्ध नहीं"** for 3 s, then untick. | "Same Approve, same DSC token. If we are down, nothing changes." |
| 1:05–2:20 | **Sunita 08812** (full view) | Click "प्रमाण पूर्ण दृश्य ↗", or go to `/officer/case/SS%2F2026%2FKDG%2F08812` → point at the spelling-mark row and QR/active → **C** → **↵** → **Ctrl+↵** → **Space** → **↵** → WhatsApp card (with P0-1 fixed it stays on the page) | "Only the officer decides it is her father. The order cites certificate 004512 and r.3(3)." |
| 2:20–2:55 | **Pooja 08835** | Queue → row → **S** → **Ctrl+↵** → **Space** → **↵** → "संदेश देखें" | "Missing data never becomes a rejection. Same application, no new fee, 30 days." |
| 2:55–3:40 | **Kiran 08841** | Queue "ध्यान दें" chip → row → point at "≠ भिन्न" → **R** (show the pre-filled vanshavali) → **Ctrl+↵** → **Space** → **↵** | "The officer decides; we make sure they see it. The Patwari gets a pre-filled form, and the Collector sees 0/7 days." |
| 3:40–3:55 | (Meena 08856, optional) | Press **X** only → show "⚖ अस्वीकृति से पहले … सुनवाई सूचना (15 दिन)" → **Esc** | "Rejection is impossible without a hearing notice." |
| 3:55–4:35 | **Collector** | Scroll through: real-MIS tiles → 22%→62% → camp tile → pilot **stop rules** → model card (women's recall 32.8%) | "Real, dated. The pilot targets are to be measured, not results." |
| 4:35–5:00 | **Audit** | Type `004512` → खोजें → "नागरिक को यह सूची दें" | "Every access is logged. The citizen can ask who saw her father's certificate." |

**Kendra** moves to the deck (a screenshot) or Q&A. **Shadow mode** is shown in Q&A: ⋯ → शैडो मोड → 08812 has no suggestion.

---

## 2. Bug list

### P0: would break or embarrass on stage
**P0-1: ↵ in the sign sheet ignores the "फिर अगला प्रकरण" untick, and the hero WhatsApp shot vanishes.**
- **Repro:**
  1. 08835 → S → Ctrl+↵.
  2. Untick "फिर अगला प्रकरण" (localStorage `ps_autonext=0`).
  3. Space → ↵. The app still navigates to 08870.
  - Default on: after Sunita's ↵ you land on 08710, and the message is only reachable through the toast.
  - Revisiting 08812 later shows **no** "संदेश देखें" in the decided dock.
- **Cause:** `SignModal`'s keydown effect has `[]` deps (`ActionPanel.tsx` ~l.700–745), so `onSign` is the first-render `sign` closure with a stale `autoNext`. Clicking the button works; ↵ does not.
- **Fix:**
  1. Keep `onSign` in a ref, as `onTrayRef` already is.
  2. **Default autoNext to off** (`readAutoNext` returns `=== "1"`).
  3. Add "संदेश देखें" to the decided dock. It can use `/issued`, or keep the citizen_message in the decision.

**P0-2: Demo reset leaves rehearsal toggles on.**
- **Repro:** ⋯ → शैडो मोड on → ⋯ → डेमो रीसेट. After the reload, localStorage still has `ps_shadow=1` (and `ps_presenter`, `ps_autonext`), so the demo opens in shadow mode with no lanes or suggestions.
- **Cause:** `Layout.reset()` clears only **sessionStorage** `ps_*`.
- **Fix:** also remove `ps_shadow`, `ps_presenter` and `ps_autonext` from localStorage. Keep `ps_lang` and `ps_role`.

**P0-3: Stage hygiene: the browser window height.**
- At 1366×768 minus browser chrome (≈657 px):
  - on 08812 the C/N buttons (bottom 689) sit **under the dock** (top 587)
  - the landing CTA sits at 728, below the fold
- **Fix:** present in F11 fullscreen. Put this in `reset_demo.sh`'s echo and in the plan's demo hygiene list.

**P0-4: Shared backend.** Other sessions changed demo state during testing (08790 was approved by someone else, and audit rows were added).
- **Fix:** freeze code (no HMR edits during the demo), run a single tab, and reset right before going on.

### P1: visible inconsistency or over-claim that a CHiPS or technical juror could catch
**P1-1: Rename leftovers.**
- **Repro:** the landing header still reads **"सेवा सेतु · AI साक्ष्य सहायक (डेमो)" / "Sewa Setu · AI Evidence Assistant (Demo)"** (`Layout.tsx:127`).
- `SEWA_SETU_PLAN.md` l.9 and l.26 gloss "Praman Setu" as "evidence **assistant**" (setu = bridge).
- No other "Praman Sahayak / प्रमाण सहायक" strings remain in frontend, backend, templates or fixtures (grep: 0).
- **Fix the tagline:**
  - HI: **"सेवा सेतु के भीतर · परिवार के मौजूदा प्रमाण पत्र से कड़ी (डेमो)"**
  - EN: **"Inside Sewa Setu · links to the family's existing certificate (demo)"**
- **Why not "Family-proof bridge":**
  - "सेवा सेतु · परिवार-प्रमाण सेतु" stacks three "सेतु"s.
  - "Setu" invites the "is this a new portal?" question. The "inside" wording pre-empts it, and matches the landing's "हम नया पोर्टल नहीं".
- **Stage line:** "प्रमाण सेतु — a bridge from today's application to the proof already in the archive."
- **Plan gloss:** "evidence bridge".

**P1-2: Stale "e-Sign" in legal text, while the UI says DSC token.**
- **Occurrences:**
  - order and notice headers: "आदेश/सूचना/संदर्भ क्र. **(ई-हस्ताक्षर पर आवंटित)**"
  - signature line "(ई-हस्ताक्षर)"
  - issued text "**ई-हस्ताक्षरित (अनुकरण)** दिनांक…"
  - tray "क्रमांक ई-हस्ताक्षर पर"
  - help "↵ पुष्टि में: ई-हस्ताक्षर / भेजें"
  - transaction id "**ESN-**…"
  - audit "e-Sign transaction"
- **Files:**
  - `backend/templates/order_*.j2`
  - `backend/engine.py:1181`
  - `frontend/src/components/orderText.ts:73,76`
  - `Queue.tsx:404`
  - `CaseView.tsx:502`
  - `api.py:584,936`
  - `mockServer.ts:318`
- **Fix:** replace with "(डिजिटल हस्ताक्षर — DSC)", "DSC-हस्ताक्षरित (डेमो)", "क्रमांक हस्ताक्षर पर" and "DSC-…". Keep "क्यूआर / ई-हस्ताक्षर सत्यापित" for *old* certificates.

**P1-3: The reject-after-hearing order is dated before the reply deadline.**
- **Repro:** 08856 → X (grounds) → issue HRG → "⌛ नियत तिथि तक उत्तर नहीं" → X → Ctrl+↵. The order is "दिनांक: 27-09-2026", with the text "दिनांक 12-10-2026 तक कोई उत्तर प्राप्त नहीं हुआ".
- **Fix:** when simulating "no reply", stamp the order date as due+1 with "(अनुकरण)", or phrase it "नियत तिथि तक उत्तर नहीं (अनुकरण — डेमो में समय आगे बढ़ाया गया)". Also:
  - "आपका कार्य: सुनवाई सूचना के उत्तर पर विचार कर…" should read "उत्तर प्राप्त नहीं — …" in the no-reply branch.
  - The reject citizen message lacks the "records used" line that approve and refer have.

**P1-4: The console Praman panel on 08812 (and every C/N or evidence-pick file) is a dead end.**
- **Repro:** `/sewasetu/case/SS%2F2026%2FKDG%2F08812`. "आपका कार्य … वही परिवार (C) / यह परिवार नहीं (N)" is shown, but the panel has no C/N buttons and the keys do nothing. The draft button reads "इस फ़ाइल में पहले एक चरण आवश्यक".
- **Fix:** put the two C/N buttons, with the grounds popover, in the panel (reuse LineageCard's pair), or replace the hint with a button "संबंध तय करें → पूर्ण साक्ष्य दृश्य". Do not show keyboard letters in the console.

**P1-5: The camp tile compares different bases.**
- Camp = **SC/ST + OBC** camp, 4,530/10,977 = 41.3%. Regular = **SC/ST only**, of decided = 19.0%.
- The label says "कैंप में जाति अस्वीकृति बनाम नियमित अ.जा./अ.ज.जा. सेवा" (`api.py:790–797`).
- **Fix (either option):**
  - SC/ST vs SC/ST: **38.1% vs 19.0%** ("38% बनाम 19%" — still 2×).
  - All caste vs all caste: 41.3% vs 20.0% of decided. Relabel to match.
- IMPACT_ANALYSIS says 41%, so align the deck.

**P1-6: The console dashboard counters contradict the dots.**
- "आगामी दो दिवस में समय सीमा में आने वाले आवेदन **0**" and "समय सीमा के बाद **0**" appear, while 08710, 08743, 08778 and 08785 show **yellow** dots (officer due 27–30-09).
- Counters use the application due date (`sla_days_left`). Dots use the officer due date (−4 days). Tomorrow (28-09), 08778 and 08785 will show **red** dots with "0 past limit".
- **Fix:** compute both counters from the same officer due date as the dots, or label them "आवेदन की समय सीमा".

**P1-7: Collector over-claim.**
- **Text:** "अधिकांश अस्वीकृतियाँ उस प्रमाण से जुड़ी हैं जो प्रायः परिवार के नाम पहले से अभिलेखागार में है।" This is the exact claim critique_3 Q1.1 warned the CHiPS head would challenge; it is unmeasured.
- **Fix:** "परिकल्पना: इनमें से कितने आवेदकों के माता-पिता/भाई-बहन के पास पहले से सेवा सेतु प्रमाण पत्र है — शैडो पायलट के पहले सप्ताह में एक क्वेरी से मापा जाएगा।"

**P1-8: Citizen message wording.**
- **Text:** "**आपके निर्णय में** उपयोग हुए अभिलेख" is addressed to the applicant, who did not decide (approve 08812 and 08790).
- **Fix:** "आपके आवेदन पर निर्णय में उपयोग हुए अभिलेख". Also drop "(…नियम 3(3) के अंतर्गत क्रीमी लेयर जांच)" from the send-back **citizen** message; keep it in the notice.

**P1-9: A community name next to a flag breaks stage rule §8.**
- **Occurrences:**
  - queue rows 08749 "…अनुसूचित जनजाति (**कंवर**) दर्शाता है" and 08838 "(**यादव/राउत**)"
  - 08856 "अ.ज.जा. · **भतरा**" beside "निरस्त … जनजाति स्थापित नहीं हुई"
- **Fix:** flag and queue text uses category only; community names appear only in the neutral comparison row. For the demo's cancelled case, consider a generic "अ.ज.जा." display.

**P1-10: Landing, first 5 seconds.**
- The 264-px CSC-style banner ("लोक सेवा केंद्र — प्रदेश के नागरिकों के लिए…") dominates the first screen and says nothing about proof or officers.
- It is **Hindi in EN mode**.
- Its bottom-right card carries an **Aadhaar-like fingerprint logo with AI-gibberish text "FRISNEFR"**, which is visible on a projector and risks looking like an imitation of UIDAI branding.
- Sewa Setu credit ("सेवा सेतु से जुड़ने हेतु निर्मित" plus the 95.7% / 53.9 L card) is below the fold at 1366×768.
- **Fix:**
  - crop the banner to ~140 px, or put the headline over it
  - blur or remove that card
  - move the credit strip "सेवा सेतु ने गति दी (95.7% समय पर) · हम साक्ष्य जोड़ते हैं" directly under the headline

### P2: polish, wording, data realism
- **08915 banner doubled:** "आपकी सक्षमता नहीं — आपकी सक्षमता नहीं — …".
  - The row shows a **green "अभिलेख पूर्ण"** lane on a file the desk cannot sign.
  - "आपका कार्य" still asks the Tehsildar to confirm the brother (C/N).
  - **Fix:** a separate lane or chip "गलत डेस्क", and hide C/N.
- **Domicile order (08902) cites "अपील (धारा 5)"**, which is Section 5 of the *caste* Act. Use the domicile appeal line, or a generic "नियमानुसार अपील".
- **Future-dated relative certificates** (08795 02-11-2026, 08721 28-10-2026, 08886 22-10-2026) are phrased "आवेदन के बाद की तिथि". They are after *today* too, so say "भविष्य की तिथि — संभवतः प्रविष्टि त्रुटि; मूल प्रति देखें".
- **Kendra vs officer:** Kendra says "हल्का पटवारी द्वारा वंशवृक्ष — केंद्र पर लाएं", while the officer path treats it as not required. Make Kendra say "उपलब्ध हो तो लाएं; नहीं तो पटवारी से मंगाया जा सकता है".
- **Masked IDs derived from the application number** (Aadhaar and mobile "…8790" on 08790). Derive from a hash.
- **Name–community realism:**
  - Babita **Kawasi** / Dilip Kawasi as OBC Sahu/Teli (08749)
  - Nisha **Yadav** as ST Khairwar (08915)

  A Bastar juror will notice. Swap the surnames.
- **Same Patwari "भोला यादव"** for halka 5 (Bayanar) and halka 36 (Isalnar). Plausible, but vary it.
- **Refer and send-back sheets reuse order wording:** "हस्ताक्षर से पहले आदेश पढ़ें", "— आदेश का अंत —", "मैंने पूरा आदेश पढ़ लिया है", "हस्ताक्षरकर्ता" on a notice. Use "पत्र/सूचना".
- **Console draft CTA** HI "यह प्रारूप: ≤200 अक्षर टिप्पणी + आदेश PDF में" has no verb (EN: "Use this draft…"). Use "यह प्रारूप उपयोग करें: …".
- **After a decision, the console still shows ✔ सबमिट / ✖ बंद** under the decided state. Hide or disable them.
- **Queue counters:**
  - After 4 decisions: "सभी 28" but "मुझ पर लंबित 24" and lanes 5+12+7=24.
  - "आज हस्ताक्षरित" excludes signed notices and references.
  - Label them "सभी (निर्णीत सहित)" and "आज जारी आदेश".
- **The queue shows 0s for ~1 s** before load. Show "—" instead.
- **Offline vs online audit vocabulary:** "मामला देखा" vs "प्रकरण खोला (अभिलेख दिखाए)". The offline note is in English in HI mode ("notice … issued (offline); system text unedited").
- **Collector:**
  - "कठिन: सामान्य उपनाम, एक ही ग्राम" recall **93.0%** vs overall 48.4% looks inverted. Explain it (blocking on the same village) or rename the slice.
  - "3178 आवेदक, 392604 …" is unformatted next to "3,92,604".
  - Demo lane mix 26+46+29 = 101%.
  - "अवधि → 2026-09-27" has no start, while the landing says "अप्रैल-25 से सित-26". Use one period everywhere.
- **Duplicate GET per case open** (StrictMode or double fetch). Check that `case_opened` is not double-logged; the audit showed 3 opens of 08790 within 18 s.
- **`/api/precheck` accepts `consent:false`** and only logs it. Return 400 without consent; the UI already gates it.
- **Plan and script drift:**
  - §7 says "weight waterfall (97%)", but the app says 98.3% (and % now lives inside "क्यों?").
  - The deck says "61%", but the app says 61.9% (so say "62%").
  - The §7 send-back story ("roster name differs from affidavit") does not match 08835.

---

## 3. Consistency matrix (officer app ↔ console ↔ Collector ↔ data)
| Item | Officer app | Console | Collector / landing | Data | Status |
|---|---|---|---|---|---|
| Pending (SDO) | 28 | 28 लंबित | – | – | ✓ |
| Lanes | 5 / 14 / 9 | "परिवार प्रमाण" labels match the queue "अगला कदम" | 26/46/29% (SDO+Teh 35 files) | – | ✓ (sums to 101) |
| SLA | "n दिन शेष" = application due | dots = officer due (−4); counters = application due | – | – | ✗ P1-6 |
| Signing term | "DSC टोकन से हस्ताक्षर" button | "SIGN WITH TOKEN / Sign PDF" | – | – | ✗ order text says ई-हस्ताक्षर (P1-2) |
| Applicant notice | "सुनवाई सूचना", HRG/ | Reject → same sheet | "सुनवाई सूचना उत्तर प्रतीक्षित" | – | ✓ ("कारण बताओ" is left only on the console's native LSG sidebar item, which is correct) |
| Product name | प्रमाण सेतु | "परिवार प्रमाण · प्रमाण सेतु" | header subline "AI साक्ष्य सहायक" | plan gloss "assistant" | ✗ P1-1 |
| 95.7% / 53.9 L / 22.2→61.9 / 2.3–13.2 | – | – | ✓ | ✓ exact | ✓ |
| Camp 41% vs 19% | – | – | tile | 38.1 (SC/ST camp), 42.6 (OBC camp), 18.98 (SC/ST regular, decided) | ✗ P1-5 |
| Hero match | "प्रबल कड़ी" | "प्रबल कड़ी" | P 89.4 / R 48.4 | API 0.9833 | ✓ (script says 97%: fix the script) |
| Records-used line | approve and refer messages | approve message | – | – | reject message lacks it (P2) |

---

## 4. TOP 8 fixes for the final ~2 hours
Priority is demo reliability first, then officer-impact clarity.

| # | Fix | Where | Effort | Acceptance |
|---|---|---|---|---|
| 1 | **P0-1** stale `onSign` closure. Default "फिर अगला प्रकरण" to off. Add "संदेश देखें" to the decided dock. | `ActionPanel.tsx` (SignModal keydown → `onSignRef`; `readAutoNext`), `CaseView.tsx` decided dock | 20 min | 08812: C ↵ Ctrl+↵ Space ↵ stays on 08812 with the WhatsApp card visible. Unticking and re-ticking is respected on ↵. |
| 2 | **P0-2** reset clears `ps_shadow`, `ps_presenter`, `ps_autonext` (localStorage). Add an F11 / one-tab reminder to `reset_demo.sh` and the plan. | `Layout.tsx reset()`, `backend/reset_demo.sh` | 10 min | Shadow on → reset → 08812 shows the lane chip and suggestion. |
| 3 | **P1-1** tagline for the new name, plus the plan gloss. | `Layout.tsx:127`, `SEWA_SETU_PLAN.md` l.9/26 | 5 min | grep "साक्ष्य सहायक\|Evidence Assistant\|Sahayak" returns 0. |
| 4 | **P1-2** DSC wording everywhere (templates, issued stamp, tray, help, txn prefix, audit). | templates `order_*.j2`, `engine.py:1181`, `orderText.ts`, `Queue.tsx:404`, `CaseView.tsx:502`, `api.py:584/936`, `mockServer.ts` | 20 min | No "ई-हस्ताक्षर पर आवंटित" or "ई-हस्ताक्षरित" in any issued text, live or offline. Re-export the fixtures. |
| 5 | **P1-5 + P1-7** honest Collector: camp tile on the same basis (38% vs 19% SC/ST). Turn "अधिकांश अस्वीकृतियाँ … पहले से अभिलेखागार में" into a hypothesis with the measurement. | `api.py:790–797`, `Collector.tsx` text, deck | 15 min | The tile label and numerator share a basis. No unmeasured causal sentence is left on screen. |
| 6 | **P1-4** C/N (plus the grounds popover) inside the console panel, or a "संबंध तय करें →" button. **P1-6** counters from the officer due date. **P2** masked IDs not equal to the application number. | `SewaSetuConsole.tsx` | 30 min | Console 08812: confirm → draft enabled → approve without leaving the console. 4 yellow dots → "आगामी दो दिवस" = 4. |
| 7 | **P1-8 + P1-3** citizen and legal text: "आपके आवेदन पर निर्णय में…"; drop the legalese from the send-back message; no-reply order date/phrase; no-reply "आपका कार्य"; records-used line in the reject message. | `backend/messages.py`, `order_reject.*.j2`, `engine.py` | 20 min | Entity checker passes. The reject order never asserts a future date as past. |
| 8 | **P1-10 + P1-9** landing banner crop and fixing the Aadhaar-like card; Sewa Setu credit under the headline; category-only flag text; swap the unrealistic surnames (08749, 08915). | `Landing.tsx`, `hero-hi.jpg`, `engine.py` flag strings, `gen_synthetic` overrides / fixtures | 25 min | At 1366×768 the headline, CTA and Sewa Setu credit are visible above the fold. No community name appears in any amber/flag string. |

**Then:**
1. Rerun `uv run pytest -q` and `npm run build`.
2. Run `scripts/export_fixtures.py` so the offline fixtures carry the new wording.
3. Rehearse the §1 5:00 path twice (once with `/api` blocked), in F11 at 1366×768.
4. Reset.

**Q&A crib from this round:**
- "98% on this match but 89% model precision?" Precision is over all pairs at the probable threshold. Strong links are ≥0.95, and real calibration happens in shadow mode.
- "Why does a Tehsildar-issued certificate count?" It follows the policy setting, which is Collector/CHiPS-owned; the default is valid with a note, pending Revenue guidance.
- "What if you're down?" The service-down toggle.
- "Are officers scored?" The shadow feedback is tool feedback, and the Collector card says no officer ranking.
