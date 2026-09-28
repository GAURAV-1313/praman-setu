# Round 3 changes: glanceable case view (27-09-2026)
Input: `iterations/round3_critique.md` (TOP 8 + P0-1…P0-6, wireframe §3.2). Lens: the officer understands the evidence, what is missing and what to do in about 10 seconds, without losing any round-1 or round-2 safeguard.

## Result in one line
- **One compact bar** (57 px) replaces 150 px of chrome.
- **One "Evidence verdict" card** (evidence / your job / look at / on file / missing) sits at Y=142.
- **One sticky decision dock** keeps Sign on screen at every tested viewport.
- **Colour now means lane:** green = records complete, slate = standard review, amber = needs attention. There is no red anywhere.

## Before → after (measured with JS in the live app, backend :8000)
| Metric | Before (critique) | After |
|---|---|---|
| Chrome above the evidence (1366×768) | topbar 40 + nav 77 + synthetic banner 33; grid at Y=331 (Y=362 at 1280) | **one 57 px bar**, synthetic data shown as a pill; verdict card top at **Y=142** at all widths ≥ 1280 |
| Distinct font sizes on a case page | 16 (10.5–20.64); 25 runs of 10.5–11 px | **4** (13 / 14 / 16 / 19); queue 5 (+24); **0 runs < 13 px** (kbd is 13 px); Devanagari line-height 1.6 |
| Minimum text contrast (case pages, HI+EN) | 4.49 (muted #64748B) | **≥ 4.51** on every case and the queue (`--muted` #56657A ≈ 5.7:1 on cream) |
| Focus ring | #FDBA74, ≈ 1.6:1 | **#134A9C outline plus a 5 px white halo** (≈ 8.9:1) |
| Sign button bottom Y, all 8 demo cases, HI and EN | 08870: Y=876 at 768 (off screen) | 1366×768: **759**; 1280×720: **711**; 1536×864: **855**; 375×812: **806**. Always visible, never needs a scroll |
| Focus after X (08841) | textarea at Y=789, off screen | textarea at **Y=602–676**, inside the drawer, in view |
| C/N pair bottom, 08812 at 1366×768 | 675 (with a 3-column grid) | **698** (HI), below the verdict card and above the dock (701) |
| Comparison truncation | 3 cells ellipsised, including the differing name | **0**. Name rows show both scripts. When the Hindi is identical, the Latin row shows the difference, marked with `<mark>` ("Ram Lal Mark**a**am") |
| Signing sheet | 274 of 941 px visible (29 %) at 13.5 px, ~110 characters per line | full-height sheet, **491 px** visible at 1366×768 (419 px at 1280×720), **16 px / 1.7**, **68ch** line length, bold section rules |
| Clean file (08790 / 08902) | Round 2: Ctrl+↵ → Space → ↵ | Mouse: **3 clicks** (Sign → tick → e-Sign), plus scrolling the order to its end. Keyboard: Ctrl+↵ → Space ×3 (page-down while reading) → Space (tick) → ↵, 6 keys. See open issues |
| Hero 08812 | C → ↵ → Ctrl+↵ → Space → ↵ | C → ↵ (grounds) → Ctrl+↵ → Space ×3 (read) → Space → ↵. The WhatsApp preview now shows in the main column |

## What changed
1. **Lane colour semantics (P0-1).**
   - Lane chips: green #DCFCE7/#166534, slate #F1F5F9/#334155, amber #FEF3C7/#92400E. The dot, ring and diamond shapes are kept.
   - The same lane colour is used for:
     - a 5 px stripe on each queue row
     - a 6 px left border on the case band
     - the verdict card border
     - the dock's top edge
   - Flags, the show-cause note and problem titles are amber, not orange-bold.
   - The ALL-CAPS "CANCELLED" is gone (backend headline and validity strip).
   - A scan found no red-hue element on any officer page.
2. **Sticky decision dock (P0-5).**
   - `ActionPanel` now renders a fixed bottom bar, portalled to `<body>`. It holds a status line (blocker, "Ready", and the records' suggestion where round 2 allows it), the A/S/R/X segment and Sign.
   - Anything that needs typing or ticking opens in a drawer above the bar (max 40vh) and is always in view:
     - finding / show-cause grounds
     - evidence picker (with a constant chip order)
     - send-back reasons
     - refer-to
     - draft editor
     - call-back reason
     - issued text
     - show-cause reply simulation
   - The page gets `padding-bottom: var(--dock-h)`. `scroll-padding` keeps focused elements clear of both the sticky band and the dock.
   - The decided and show-cause states use the same dock: status, Call back, View issued text, and Next (J).
3. **Evidence verdict card (P1-3; `components/VerdictCard.tsx`).**
   - Fixed rows:
     - ▣ evidence: what was found or declared, its certificate number and status
     - ? your job: one question for the current state
     - ! look at: attention flags, with the reasoning behind "why?"; name spelling differences with character marks
     - ✓ on file: caste proof, plus sample registry rows marked "corroborative only"
     - ✗ missing
   - Removed as duplicates:
     - the band's lane reason (now the chip tooltip)
     - the panel's evidence summary and "checklist documents on file" line
     - the top flag card
     - the inline and separate "Other records" (now one side `<details>` with a single "sample source" tag)
     - the large no-record card
   - Details below:
     - "Why 98%? How the records were linked" (the model % moved off the badge)
     - all validity checks
     - other notes
4. **Equal-weight Same family / Not this family (P0-3).**
   - Both buttons use `.btn.decide-pair`. The computed background, border, weight, size and height are identical.
   - The green panel CTA is gone. Before the decision the dock reads "Decide the relationship first: same family (C) / not this family (N)" and Sign is disabled.
   - Ctrl+↵ only scrolls to and flashes the pair; it never pre-chooses. The grounds "Record" button is neutral blue for both choices.
5. **Comparison rows (P0-2).**
   - Rows wrap and never truncate.
   - Name rows show both scripts with a grapheme-aware LCS diff (`components/compare.tsx`), so Devanagari clusters are never split.
   - Rows that agree take one line with "="; rows that differ or vary are amber.
6. **Compact chrome and type/contrast tokens (P0-6, P1-1, P1-2).**
   - All working screens use one compact bar: crest, "प्रमाण सहायक", nav, synthetic pill, role, हिंदी/EN, ⋯. The landing page keeps the full header.
   - The case band is sticky under the bar and merges Queue / ‹K / J› / name / ID / service / purpose / SLA / lane / ?.
   - Two columns: evidence, plus a 360 px "Application — compare against" side column with the checklist.
   - All CSS font sizes are mapped to 13/14/16/19/24.
   - At 375 px the band is not sticky and the dock wraps to a single column.
7. **Queue (P0-4, P1-8).**
   - The "Records suggest" column is replaced by **"Next step / अगला कदम"**, from the backend's new `next_step`, with a client fallback. Examples:
     - "Ready to sign"
     - "Confirm relationship"
     - "Mark possible record"
     - "Missing: caste proof"
     - "Normal scrutiny — pick proof"
     - "Check category difference"
     - "Cancelled certificate — verify"
     - "Check certificate date"
     - "Check issuing authority"
   - No standard-review row says "Approve".
   - A **"मेरा डेस्क / My desk"** strip shows five filter chips:
     - pending with me
     - due ≤ 3 days (amber when > 0)
     - awaiting show-cause reply
     - sent back / awaiting citizen
     - signed today (from the audit trail; a called-back order no longer counts)
   - SLA ≤ 3 days is an amber pill and ≤ 7 days is bold. Decided rows are muted, not faded by opacity.
8. **Copy sweep and signing sheet (P1-4, P1-5, P1-6, P1-9 partial).**
   - The married-women recall note shows only for female applicants.
   - The Rule 15(2) Scrutiny-sample note is removed from domicile files (08902) and moved to the verdict footer on caste files.
   - "अनुसूचित जनजाति जाति" → "अनुसूचित जनजाति प्रमाण पत्र".
   - Terms made consistent (frontend, backend and data): अग्रेषित → **संदर्भित करें**; जाँच → **जांच**; मूल निवासी → **मूल निवास**; केंद्र ऑपरेटर → **केंद्र संचालक**.
   - Dates on officer screens are DD-MM-YYYY. Hindi mode shows no English sentences in the sheet, band or dock; the tick is bilingual only in EN mode.
   - Collector: वास्तविक/नमूना badges, Hindi division names, legend contrast.
   - Audit: Hindi actor names, the head of each note and registry chip names (full English note on hover).
   - The signing sheet has a sentinel "— आदेश का अंत —", a read meter, and a tick that stays disabled until the end has been seen or "पूरा पाठ दिखाएँ" is pressed. Space pages down until the end, then ticks. ↵ signs only once ticked. Esc cancels.

## Safeguards kept (re-verified in the browser)
| Safeguard | Checked on |
|---|---|
| Reasoned same / not-family with grounds and Undo | 08812 (C → ↵), 08845 (N → chip → Record → Undo) |
| No pre-selected action on standard review | 08812, 08835, 08870, 08845 |
| No pre-selected action after a show-cause reply | 08841 |
| Records-complete files still pre-select Approve | 08790, 08902, 08812 after confirming |
| Required findings, with the textarea in view | reject / override / open flag |
| Show-cause before reject | 08841: X → grounds → notice → reply → X → final order → signed |
| Full order in the sheet with the read tick, snapshots and time on screen | all signings above |
| Call-back with reason | 08812 → back to pending, with the confirmation retained |
| Validity strip with failures as the amber card title | 08841, 08856, 08863 |
| Presenter-only persona / technical details / live pill | all cases |
| Keyboard | J/K, C/N, A/S/R/X, Ctrl+↵, Space, ↵, Esc, ? |
| Save & next | the sheet's "Open the next case after this" |

## Tests
- `uv run pytest -q`: **56 passed** (54 → 56).
  - New: queue `next_step` names the task, not the outcome.
  - New: copy fixes (no doubled "जनजाति जाति", no ALL-CAPS CANCELLED, no "जाँच" in the queue).
- `npm run build`: passes (tsc clean).
- `scripts/export_fixtures.py`: re-exported (34 cases, 13 confirm, 14 not-this-family, 5 show-cause overrides). The mock queue passes `next_step`.
- **Browser, live backend.** JS audits of 08812, 08790, 08835, 08841, 08856, 08863, 08870, 08902 and the queue, in HI and EN, at:
  - 1366×768
  - 1280×720
  - 1536×864
  - 375×812 (no horizontal scroll on /, /kendra, /officer, cases, /collector, /audit)
- **Flows:**
  - hero 08812: C → grounds → sign → WhatsApp preview in the main column → call back
  - show-cause 08841 end to end
  - not-this-family 08845 plus Undo
  - clean 08790 (keys counted)
  - 08902 Tehsildar: no Rule 15(2), Approve pre-selected
- **End state:** `POST /api/reset` done; browser viewport reset to desktop.

## Open issues
- **Clean-file count.** Mouse clicks stay at 3 (Sign → tick → e-Sign). The tick now unlocks only after the order has been scrolled to its end. On the keyboard that adds about 3 page-down Spaces (6 keys in all) at 1366×768, because the order is 1,378–1,549 px long. If "≤ 3 interactions" must also hold for keystrokes, the options are:
  - shorten the order, or
  - accept "show full text" as the read act.
- The browser pane's `ps_autonext` was already "0" (set in an earlier session), so auto-advance was off during testing. It defaults to on for new viewers.
- The C/N pair is below the fold at 1280×720 (bottom 726) and on files with long attention titles (08856/08863 at 1366). The verdict "your job" line and the dock status still name C/N, and the C / N keys work from anywhere.
- Not done (P1/P2):
  - garbled machine-transliterated Hindi village names (P1-7)
  - landing hero rework (P1-10)
  - Kendra consent label and result scroll (P1-11)
  - Collector "92 % agree" reframing (P1-12)
  - SVG icon set
  - a presenter "large text" toggle
