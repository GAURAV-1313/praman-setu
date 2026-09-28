# Round 1 changes: officer workflow (27-09-2026)
Input: `iterations/round1_critique.md`, covering its Top 8 and all P0 items. Lens: the SDO has about 2 minutes per file and carries the legal liability.

## Result in one line
- **A clean file now takes 2 clicks** (Sign → e-Sign), or 2 keystrokes (Ctrl+↵, ↵). There are no scrolls, and the next pending case opens automatically.
- Friction appears only on reject, override, or an approve over an open flag or an unconfirmed match. The backend enforces it too.

## Clicks per file at 1366×768, measured in the browser against the live backend
| Case | Before (critique) | After | How |
|---|---|---|---|
| 08790 Rohit (clean, declared sibling) | 4 clicks + 1–2 scrolls + 2 nav | **2 clicks, 0 scrolls, 0 nav** | Sign → e-Sign; auto-advance to next pending |
| 08812 Sunita (hero, confirm) | 5 clicks + 4–5 scrolls + nav | **3 actions, 0 scrolls** | C (or "Confirm relationship first") → Ctrl+↵ → ↵ |
| 08835 Pooja (send back) | 4 clicks + 1 scroll (e-Sign modal) | **2 clicks** (+2 per extra reason) | "Send notice to applicant" → "Send to applicant" (a notice, no e-sign) |
| 08841 Kiran (category differs) | 4 clicks; flag never seen | **3 actions, 0 scrolls**; flag is the first thing on the page | R → Ctrl+↵ → ↵ (Patwari report pre-selected) |
| 08856 Meena (cancelled) | 4 clicks + 2 scrolls | **3 actions**; "CANCELLED (2024)" is the card title, above the fold | R → Ctrl+↵ → ↵ |
| 08863 Anil (Tehsildar 2017) | 4 clicks + 1–2 scrolls | **3 actions** | R → Ctrl+↵ → ↵ (Scrutiny Committee pre-selected) |
| 08870 Ramesh (no record) | 4 clicks + 1 scroll | **2 actions, no finding** | Ctrl+↵ → ↵ |
| 08902 Lakshmi (Tehsildar, domicile) | n/a | **2 clicks** | Sign → e-Sign |

## What changed
1. **P0 correctness**
   - **Confirmed state now comes from the backend.** `analysis.confirmed_cert_nos` and `accepted_cert_nos` replace the old sessionStorage copy. Reset clears them; verified after a menu reset that 08812 shows Confirm and no "confirmed by you".
   - **Presenter mode is a toggle in the ⋯ menu, off by default.** It controls:
     - the persona note
     - the hackathon strip and the "live model" pill
     - model and rules versions
     - generator and checked tokens
   - The `log₂` formula line was removed.
   - **Collector bug fixed** (the double ×100):
     - the KPI now reads "22.2% → 61.9%"
     - the chart shows caste services plus the top 8 by volume
   - **Placeholders block signing.** Both the UI and the API (422) check for `[ …… ]`, `[Officer…]` and `____`.
   - **Date is filled automatically** (IST).
   - **Approvals carry a finding built from the records**, not a blank slot.
   - The `case_opened` duplicate was a StrictMode race; it is now de-duplicated atomically.
2. **Comparison table**
   - Order is differs → variant → agree.
   - The context row is labelled "Applicant ↔ Father/Sister/Brother" (no "Person MATCH").
   - Spelling variants read "≈ variant (same name)".
   - New caste-name row (only when the category agrees).
   - New birth-year row ("plausible for a parent").
   - Neutral styling; only differences are amber.
3. **Validity strip**
   - One line: QR · permanent · active/CANCELLED · issuer and date · category and caste.
   - Any failure becomes the amber card title, and the link badge turns grey.
   - Tehsildar certificates issued before 22-07-2026 read "competence under review after CG HC Jul 2026; verify" (severity `review`). They are still not usable, and the checklist shows "!" with the reason, never ✓.
   - The pending relative-certificate row now shows "– awaiting your confirmation" instead of ✓.
4. **Evidence before recommendation**
   - Flags sit at the top of the page.
   - The action panel is sticky.
   - The panel order is: evidence summary line → action tiles → "Records suggest: …" muted line.
   - No tile is pre-selected while a flag or an unconfirmed match is open. The primary button is then "Confirm relationship first".
   - The waterfall and graph are collapsed under "Why 98%? How the records were linked"; negative bars come first.
   - The Confirm button sits directly under the comparison table, with the corroborating records line.
   - Declared matches show "Declared at Kendra & matched — no confirmation needed".
5. **Friction only where it matters**
   - The acknowledgement checkbox was removed.
   - A written finding (≥ 15 characters) is required only for:
     - reject
     - override
     - approve with an open flag or unconfirmed match
   - The reason for the requirement is shown, and the backend returns 422 if the finding is missing.
   - The modal lists "Relied on" separately from "Seen, not relied on" ("Records examined" for refer).
6. **Throughput**
   - "Open the next case after this" is on by default and persisted per viewer. It shows a toast with "View message" (the WhatsApp preview) and "Open".
   - Keyboard shortcuts:
     - **J/K**: next/previous
     - **C**: confirm
     - **A/S/R/X**: choose action
     - **Ctrl+↵**: sign
     - **↵**: confirm in the modal
     - **Esc**: cancel
     - **?**: help
   - Keys are ignored while typing. A shortcut hint is shown in the panel.
   - The queue re-focuses the last-opened row, and J/K/↵ work on rows.
7. **Queue**
   - Sort order: pending → SLA ≤ 3 days (⏰) → evidence rank → SLA due.
   - Each row has a plain reason, e.g. "Father's certificate found · 98% · confirm relationship", "No family record — normal scrutiny", "Brother's certificate records OBC, application claims ST — verify".
   - Lane chips are neutral (outline, no green or amber).
   - New "Due ≤ 3 days" filter.
   - The "Purpose" and "Top %" columns were removed.
8. **Send back and refer**
   - Send back:
     - A per-service reason library (11 caste, 7 domicile, in Hindi and English, saying exactly what to bring). The check's findings come pre-ticked, with "+ more / own reason".
     - A "1st send-back" pill, or "⚠ Sent back N times before — consider Patwari report".
     - It produces a **NOTICE**, not an order, with a one-confirm "Send to applicant".
   - Refer:
     - A destination is required: Patwari field report (Rule 8), District Verification (Scrutiny) Committee, or SDO when the officer is a Tehsildar.
     - The server renders a draft for each destination.
   - The Meena contradiction is fixed: the flag, suggestion and draft all say "Patwari field report (Rule 8 enquiry)".
   - Order grounds were tightened:
     - Rule 3(3) only when a relative's certificate is relied on (none for Ramesh)
     - no Rule 15(2) in orders
     - mock registry rows listed as "seen, not relied upon"
   - The duplicate "No family record" flag was removed.
- **Also changed:**
  - The SLA day maths is unified between the queue and the case view.
  - The role pill follows the queue and the case being viewed.
  - Audit actions are humanised, with a footer: "not used to rank officers".
  - The Kendra checklist says "found — the officer will confirm", not "verified".

## Files
- **Backend**
  - `backend/engine.py`: headline, refer, evidence summary, finding rules, drafts
  - `backend/rules.py`: Tehsildar review, reason library, checklist notes
  - `backend/api.py`: queue sort, audit dedupe, decision validation, `sendback_count`
  - `backend/templates/order_{approve,refer,send_back}.{en,hi}.j2`
  - `backend/gen_synthetic.py` and `data/synthetic/applications.json`: `sendback_count` (08842 = 1)
  - `backend/tests/test_api.py`: 13 new tests
- **Frontend**
  - `frontend/src/components/{ActionPanel,LineageCard,Layout,Waterfall,WhatsAppPreview,common}.tsx`
  - `frontend/src/pages/{CaseView,Queue,Collector,Audit}.tsx`
  - `frontend/src/{i18n.tsx,api/types.ts,mock/mockServer.ts,styles.css}`
  - `frontend/src/mock/fixtures/*.json` (re-exported)
- **Docs**
  - `app/CONTRACT.md`: new section "Round 1 changes"

## Tests
- `uv run pytest -q`: **41 passed** (28 → 41). The new tests cover:
  - backend confirmed state and reset
  - no placeholders in any suggested draft
  - placeholder → 422
  - clean approve without a finding, and 409 on a second decision
  - flag or unconfirmed approve → 422 without a finding
  - override refer needs a finding and a valid destination
  - destination consistency (Meena → Patwari)
  - validity headline and Tehsildar "review"
  - checklist pending and blocked states
  - legal basis without 3(3)
  - send-back notice, library, custom reason and count
  - queue order and reasons, including the urgent file first
  - `case_opened` de-duplication
- `npm run build`: passes; `tsc` is clean.
- `scripts/export_fixtures.py`: 34 cases and 6 confirm overrides re-exported.
- **Browser, live backend:**
  - all 7 SDO demo cases plus Tehsildar 08902 decided end to end
  - shortcuts J/K/C/A/R/Ctrl+↵/↵/?/Esc verified
  - auto-advance and Next verified
  - presenter toggle verified
  - reset via the ⋯ menu verified
  - Hindi layout checked on 08856
  - the officer page text contains none of "Hero case", "log₂", "generator:" or "not competent"
- **Browser, offline** (backend stopped): the queue order and reasons, and Sunita C → sign → auto-advance, all worked on fixtures.
- **End state:** `POST /api/reset` done; the audit log is empty.

## Remaining issues (next round)
- **Comparison table height.** Bilingual cells are 2 lines, so the in-card Confirm button is about 1.6 screens down at 768 px. The panel's "Confirm relationship first" button is above the fold, so no scroll is needed, but the table could be compacted (one line per side).
- **Info-level "possible family record" flags sit at the top** even on records-complete files (e.g. 08749). Consider demoting info flags below the card.
- **Kendra P2 items not done:** the hero banner on the working screen, the role badge, and 96% vs 98% (the missing birth year).
- **Mobile at 375 px not tested.**
- **Manual draft edits don't track the finding.** If the officer hand-edits the draft, later changes to the finding box are not merged into the edited text (the ↺ restore works).
- **No urgent file in the SDO queue.** None of the SDO demo files is ≤ 3 days from due; the earliest is 4 days. The ⏰ float is visible in the Tehsildar queue (08857, 4 days late).
- **The Tehsildar policy wording is our reading of the Jul 2026 ruling.** Confirm with CHiPS or the Revenue department before the demo.
- **The mock (offline) Kendra pre-check** still uses the older simplified text and has no validity headlines (Kendra does not render them).
