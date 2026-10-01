# Bug pass: officer workflow (full evidence view)

QA engineer A · 02-10-2026 · private servers (backend :8101 with `PRAMAN_STATE_DIR=/tmp/praman_state_A`, Vite :5101), playwright-core + system Chrome (headless). All citizen data is synthetic. Nothing was committed.

## What I tested

**Queue** (`/officer?role=sdo|tehsildar`)
- Both desks (Kondagaon, Keskal) and the Tehsildar desk, in हिंदी and EN, at 1440, 1280 and 390 px.
- Every desk chip and filter, including an invalid `?filter=`.
- J/K/Enter and focus returning to the last row.
- Shadow and presenter modes, the policy footer.
- Sign tray: empty, mixed desks/offices, Esc, remove, one passcode, "Orders issued today" afterwards.

**Case view** (`/officer/case/…`)
- 14 demo files at 1440 and 1280 in both languages: 08812, 08835, 08841, 08925, 08721, 08758, 08849, 08915, 08743, 08830, 08749, 08856, 08886, 08778. No horizontal overflow, no console errors.
- Record actions: same / not-this-family with grounds and Undo, including double-clicks; C/N/←/→/Tab/?/Esc/J/K.
- Native (maiden) village search: wrong village, the applicant's own village, and Garhbengal (finds the father's certificate).
- Evidence picker and the OBC creamy-layer finding (08870).
- Decisions: Approve, Send back (custom reason), Refer to Patwari or Scrutiny Committee.
- Reject path: X → hearing notice → reply / no reply → final order. Call-back of a hearing notice and of decisions, then deciding again.
- Sign modal (Space / Enter / Ctrl+S, read tick), "then next case", shadow-mode reveal and feedback.
- Wrong-authority forward (08915) and wrong-sub-division forward (08758).
- Two tabs on the same file, page refresh after deciding, decisions on already-decided files.

**API**
- Invalid role, desk and id; repeated decisions, call-backs, forwards and feedback.
- Tray edge cases; audit entries checked after each flow.

## Bugs found

| # | Sev | Where | Repro | Fixed? / how |
|---|---|---|---|---|
| 1 | **High** | ActionPanel | Press X on a records-complete file, type rejection grounds, then press A and sign. The hidden grounds go into the approval order and the audit as the officer's finding. | Fixed. The finding counts only while its box is shown for the chosen action (`liveFinding`). |
| 2 | **High** | api `_decide` / tray | A file waiting in the sign tray is decided from the case view (or gets a hearing notice). It stays in the tray, `in_tray` stays true, and tray signing reports an error. | Fixed. Deciding a file individually removes it from the tray, and the audit note says so. Test added. |
| 3 | **High** | api record acts / tray | After Approve → tray, the officer Undoes "same family" (or the native search changes the records). The tray still holds an order text that no longer matches the file. | Fixed. `_drop_from_tray` runs on dispose, clear and native search, and is audited. Test added. |
| 4 | Med | CaseView | J/K or auto-advance renders the previous file's data under the new URL. The record tab opens on the previous file's index (seen: 08749 → 08778 opened on record 2), and keys could act on stale data. | Fixed. A bundle whose app id differs from the URL is treated as loading. |
| 5 | Med | CaseView | After the hearing notice and the final reject, the "Hearing notice issued" toast stays. Its "View order · Call back" button just reopens the same file. | Fixed. The toast is cleared on the next result, reply or call-back, and that button is hidden for the current file. |
| 6 | Med | ActionPanel | A second tab signs a file already decided elsewhere: dead-end "409 already decided" and the dock stays live. | Fixed. On that 409 the file reloads and shows its decided state. |
| 7 | Med | Queue | "Orders issued today" stays 0 after tray signing (the audit was not reloaded). | Fixed. |
| 8 | Med | Queue / mobile.css | At 390 px the queue table scrolls inside its box and "Next step" and "Lane" are off-screen. | Fixed. Each file is a card at ≤640 px. |
| 9 | Med | Header (shadow mode) | In shadow mode (+ presenter) the top bar overflows the window: 24 px at 1440, 184 px at 1280. | Fixed with scoped CSS in mobile.css. Layout.tsx untouched. |
| 10 | Med | api (coordinator #1) | Console native Approve with the Praman panel visible, after Undo of "same family", is accepted with no reasons. | Fixed. Same rule as the full view: when the panel was visible and `finding_required.approve` or `disposition_required` is open, written reasons (≥15 characters) are needed. Test added. |
| 11 | Low | api | `GET /applications/{id}?role=bogus` logs "bogus" as the actor role in the audit. | Fixed (400). Test added. |
| 12 | Low | api | `route-desk` is accepted on an already-decided file and logs a forward. | Fixed (409). Test added. |
| 13 | Low | api | `tray/remove` is not audited, although `tray_added` is. | Fixed. Logged when something is actually removed. Test added. |
| 14 | Low | api | Tool feedback can be re-posted, which silently flips the Collector's feedback tile. | Fixed: one per decision (409). A called-back and re-taken decision gets its own. Test added. |
| 15 | Low | api | A second hearing notice (after a reply) overwrote the first one's record. | Fixed. The superseded notice is kept in history. Test added. |
| 16 | Low | engine (Hindi order) | OBC approval reads "अन्य पिछड़ा वर्ग (यादव) वर्ग का दावा" (वर्ग twice). | Fixed: "… से संबंधित होने का दावा". |
| 17 | Low | ActionPanel / sign sheet | The officer's own English send-back reason appears inside the authoritative Hindi notice unmarked, and is not highlighted as "your text". | Fixed. Marked "(अधिकारी द्वारा अंग्रेज़ी में लिखित)" like findings, and highlighted. |
| 18 | Low | NativeVillageAction | Picking the applicant's own village gives an English-only backend 422. The 409 error is English. The hint says "एक ही परिवार" (button says "वही परिवार"). | Fixed. Bilingual client check and messages; wording aligned. Also in agent_trace.py. |
| 19 | Low | ActionPanel | Reopening a file already in the tray gives no hint, and "Add to sign tray" leads to a 409. Tray-conflict errors are English-only. | Fixed. A note says the file is in the tray and the button is hidden; bilingual conflict message. |
| 20 | Low | Queue tray modal | Esc does nothing when the tray is empty (no focus inside). No Close in the empty state, no Back at the passcode step. Text says "Save & add" but the button reads "Add". | Fixed. |
| 21 | Low | Queue | An unknown `?filter=` shows "No applications" with no chip selected. | Fixed (falls back to "all"). |
| 22 | Low | CaseView | "1 days left". | Fixed. |
| 23 | Low | LineageCard | A failed Undo (e.g. decided in another tab) is an unhandled promise rejection. | Fixed. The error is shown inline. |
| 24 | Info | api (coordinator #2) | "Tehsildar Forward needs a second forward." | **Backend routes it in one call** to SDO Keskal: competent, in that desk's queue, `route-desk` there returns 409. Test added. The second step is the **console** (`SewaSetuConsole.forward()` → `setData(b)`): it re-renders the forwarded file under the viewer's own SDO Kondagaon desk, which shows "belongs to Keskal — forward". CaseView navigates back to the Tehsildar queue instead. Suggest the console does the same. |
| 25 | Info | api (Reader audit) | The Reader page loads the full case, so each visit adds a `case_opened` audit entry. | Added `GET /applications/{id}?fields=application`: the application only, no records, not audited. Added `api.getApplication()` in client.ts. **Reader.tsx (not mine) must switch** from `getCase` to `getApplication`. |

## Bugs seen in other areas (not fixed by me)

- **SewaSetuConsole.tsx**
  - After Forward, it should leave the file, like CaseView (#24).
  - Native approve now needs remarks when the panel is visible and the file has an open point (#10). The console shows the backend's English 422; a matching client pre-check would be friendlier.
- **Reader.tsx**: use `api.getApplication` (#25).
- **LearningPanel.tsx and renewal.py** use "एक ही परिवार" for the button that is "वही परिवार" everywhere else.
- **Offline fixtures** (`mock/fixtures/cases.json`, `reject_match_overrides.json`) still carry the old Hindi OBC sentence (#16). Regenerate them if offline mode should match.
- **Audit noise (minor)**: every in-page reload after a hearing notice or call-back re-logs `case_opened` (the duplicate guard is 3 s). I left it, because logging each fetch that returns records is defensible under DPDP.
- **Environment**: the shared `scratchpad/shots/node_modules/playwright-core` was broken (no package.json or index.js), so I used my own copy in `qa_A/`. The disk briefly ran out of space mid-run (other processes, about 250 MB free); my screenshots are JPEG and about 9 MB.

## Files changed (mine)

- **Backend**
  - `app/backend/api.py`: #2, #3, #10–15, #25.
  - `app/backend/engine.py`: #16.
  - `app/backend/agent_trace.py`: one Hindi word (unowned file).
  - New tests: `app/backend/tests/test_officer_bugpass.py` (10 tests).
- **Frontend (mine)**
  - `app/frontend/src/pages/CaseView.tsx`
  - `app/frontend/src/pages/Queue.tsx`
  - `app/frontend/src/components/ActionPanel.tsx`
  - `app/frontend/src/components/LineageCard.tsx`
  - `app/frontend/src/components/NativeVillageAction.tsx`
- **Shared, small appends or targeted edits**
  - `app/frontend/src/mobile.css`: queue cards at ≤640 px; shadow-mode header.
  - `app/frontend/src/api/client.ts`: `getApplication`.

## Results

- `cd app/backend && uv run pytest -q` → **139 passed**.
- `cd app/frontend && npx tsc --noEmit -p .` → **clean**.
- All scenario scripts were re-run after the fixes with no page errors and no unexpected HTTP ≥400. The only 409 is the deliberate tray-conflict check. Scripts are in `scratchpad/qa_A/`.
- Private servers on :8101 and :5101 are stopped.

## Remaining risks

- The call-back window expiry (10 min) was not exercised end to end in the browser; the code path was reviewed.
- The native-approve rule (#10) applies only when the console reports `tool_visible: true`. In shadow mode or with the panel collapsed, Sewa Setu's own approve stays "as today", which an existing test requires.
- If the officer edits a draft and then types a finding, the edited text is kept and the new finding is not merged in. The sign sheet shows exactly what is signed, so it is visible. This was not changed.
- The phone layout was checked for the queue only. The case view at 390 px was not in scope.
