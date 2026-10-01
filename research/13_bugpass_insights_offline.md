# Bug pass C: landing, navigation, insights pages, Praman Reader, offline mode

Date: 02-10-2026 · QA engineer C of 3 (parallel) · private servers :8103 (backend, `PRAMAN_STATE_DIR=/tmp/praman_state_C`) and :5103 (Vite) · headless Chrome via playwright-core · all citizen data SYNTHETIC. Nothing committed.

## What was tested

- **Routes:** `/`, `/collector`, `/audit`, `/graph`, `/renewals` and `/reader`.
  - Each was opened by deep link and through the nav bar and the ⋯ menu.
  - Each was run in Hindi and English, with presenter mode on and off.
  - Viewports: 1440, 1280 and 390 px (phone).
  - Each run was online and offline (backend stopped, so the Vite proxy returns `x-praman-offline` and the frontend serves fixtures).
  - On every page the scripts captured pageerror, console.error, HTTP ≥ 400, page-level horizontal overflow (per element), stuck spinners and error boxes.
- **Landing:** the 4 role cards set the role and route correctly; the engine strip links to `/renewals`; the CTAs work.
- **Layout:**
  - Language toggle and active nav link.
  - Presenter and shadow toggles (pills appear).
  - The menu's "Reset demo" clears every `ps_*` key, keeps `ps_lang=hi` and returns to `/`.
  - Offline and online pills, and the role pill.
- **Collector:**
  - MIS numbers match `/api/mis/summary`: 53,85,535 applications, 22.2% → 61.9%, on-time 95.7%. The camp tile matches `/api/collector/tiles` (38% vs 19%).
  - District table sorting, map tooltip on phone, policy radio round-trip, "Show source chart".
  - LearningPanel: answered "same", then "not", then pressed Recalibrate twice. Before/after values are stable; counts and fitted time update.
- **Audit:**
  - Searches for `004512`, a blank or whitespace query, a no-hit query, `%`, and a lower-case application number.
  - Snapshot expand, Refresh, and the menu demo link `/audit?q=004512` used while already on `/audit`.
- **Graph:**
  - Tapped nodes, dragged, wheel-zoomed and used Fit.
  - Signal highlight; all 7 demo applications; the integrity example jump; "Open file".
  - Switched language with the graph open; tried an unknown `?app=`.
- **Renewals:** prefill twice; two quick clicks in a row; the 30/60-day toggle; district switch (online `374` and the offline fixtures); phone layout.
- **Reader:**
  - Each of the 4 samples: affidavit, school, prior_cert (QR verified) and prior_cert_altered (QR matches the archive, the printed date differs).
  - Re-picking the same sample, uploading `public/samples/prior_cert.png`, and switching the application to 08835.
  - The duplicate-paper fingerprint check flags 08812 correctly.
  - Offline: the archive's offline copy is used and the line "Duplicate-paper check unavailable offline" is shown.
- **Backend probes:**
  - `/api/graph/family` with an unknown id (404) and a bogus role.
  - `/api/learning/label` with an unknown pair (404), a bad decision (422) and a repeated pair.
  - `/api/learning/recalibrate` called twice and without a body.
  - `/api/renewals` with a bad district or window (422); prefill twice (idempotent, one audit entry); prefill of an unknown certificate (404).
  - `/api/archive/certificate`: OCR-mangled `c6/kdg/sd0/2019/4512` normalises; a missing number gives a bilingual 404; garbage gives 422.
  - `/api/reader/fingerprint` with a bad pHash (422).

## Bugs found

| # | Sev | Where | Repro | Fixed? / how |
|---|---|---|---|---|
| 1 | High | `/renewals` at 390 px | Phone: the page scrolls sideways (517–556 px wide). Long monospace certificate numbers force the grid column wider than the screen. | Fixed. `round8b.css`: `minmax(0, …)` grid tracks and `min-width: 0` on the grid children. |
| 2 | High | Nav on phones | The menu's nav list has no Reader entry, and the top nav is hidden on phones, so `/reader` cannot be reached on a phone. | Fixed. `Layout.tsx`: added "Praman Reader / प्रमाण रीडर" to the menu. |
| 3 | Med | Phone nav, offline, English | 390 px offline on `/audit` and `/renewals`: the "Synthetic data", "offline demo" and language pills push the ⋯ menu off screen (page 434 px wide). | Fixed. Below 420 px the pills drop their second word ("data", "demo"); the full text stays in the tooltips. Files: `mobile.css`, `Layout.tsx`, `common.tsx`. |
| 4 | Med | Reader | Clicking the sample that is already selected clears the results and never reads again: the `<img>` src is unchanged, so `onLoad` does not fire. | Fixed. A counter (`n`) remounts the `<img>`. The upload input is also reset so the same file can be chosen twice, and old object URLs are released. |
| 5 | Low | Reader | If the OCR engine fails to start, the page shows "Could not read this image" before any image was chosen; an image load error showed nothing. | Fixed. Separate bilingual "engine could not start" message; `onError` on the image. |
| 6 | Med | Audit and backend | Every visit to `/graph` wrote 2 `family_graph_viewed` entries (React StrictMode double fetch). This inflates "who saw certificate 004512" for DPDP. | Fixed. `insights_api.py` skips a repeat entry within 3 s (same rule as `case_opened`). Tests in `tests/test_bugpass_c.py`. |
| 7 | Med | Audit page | The actions `family_graph_viewed`, `model_recalibrated`, `learning_label` and `forwarded_other_subdivision` showed as raw codes in both languages. Their notes and the "Model owner (demo)" actor were English only in Hindi mode. | Fixed. Labels added, plus Hindi note patterns (including the Reader archive lookup) and the actor. |
| 8 | Low | Audit page | Using the menu demo link "Audit · 004512" while already on `/audit` did not refill the search box. Refresh kept the old row expanded by index, so it could open the wrong snapshot. | Fixed. The search box syncs to `?q=` on each navigation (`location.key`); Refresh closes the open snapshot. |
| 9 | Med | Offline renewals | Fixture dates were frozen at export (as of 29-09-2026). Offline on 02-10 the page said "expires 04-10-2026 (5 days)", and the WhatsApp nudge said the same. | Fixed. `mockServer.ts` shifts every date in the renewal fixtures by (today − `as_of`). The REAL MIS date in `context` is left alone. Offline now matches online (07-10-2026, 5 days). |
| 10 | Low | Offline Learning panel | After answering pairs and pressing Recalibrate offline, it said "fitted on 300 labels · 16:52" (the export time), ignoring the officer's answers. | Fixed (`api/insights.ts`). It now shows the time Recalibrate was pressed, and the label count includes the offline answers. |
| 11 | Low | Offline graph | After "same family" on 08812 in the offline simulation, the Network page still showed the record as "awaiting officer". The bundle's `#confirmed` variant existed but was never used. | Fixed. New read-only `mock.confirmedCerts()`; `insights.family` uses the confirmed variant. |
| 12 | Low | Renewals | Two quick clicks in a row: the first response cleared the spinner (and could show its error) while the second was still loading. On phones the detail panel opened below a long list, out of view. | Fixed. A request counter keeps only the latest response; on single-column layouts the page scrolls to the detail panel. |
| 13 | Low | Collector policy card | `setPolicy` / `setSlaPause` had no rejection handler, so an API error became an unhandled promise rejection and the radio stayed wrong. | Fixed. On error the policy is reloaded. |
| 14 | Info | Graph | Cytoscape logs a console warning about a custom `wheelSensitivity` (0.25). | Not changed: deliberate, for slower zoom. Warning only. |
| 15 | Info | Reader | tesseract.js core prints `console.error` "Parameter not found: classify_misfit_junk_penalty / merge_fragments_in_matrix" while loading `hin`. | Not changed: harmless, from the WASM core. |

Verified with no bug found:
- MIS and KPI numbers versus the backend.
- The lane mix adds up to 100%.
- Sorting.
- The map tooltip stays on screen.
- Learning: repeated label on the same pair (overwrites), recalibrate twice (stable), state cleared by `/api/reset`.
- Renewal prefill is idempotent.
- Reader QR mismatch wording is neutral ("check the original", never "fake").
- Deep links for all 6 routes.
- No state carries over between pages.
- All pages offline, in both languages, at 1440/1280/390, with presenter on and off: no page errors and no HTTP ≥ 400.

## Notes on other areas (not fixed — not my files)

- Reader calls `api.getCase(app)` just to show the application strip. Each Reader visit therefore writes a `case_opened` entry ("Records shown to the officer"). Arguably correct, but a lighter "application summary" read may be better (api.py / product call).
- Shared Python env: none.
- Environment: the disk briefly ran out of space mid-run (other processes on the machine). Also, `lsof -ti tcp:8103 | xargs kill` kills the Vite dev server too, because Vite holds a proxy connection to 8103. Use `-sTCP:LISTEN`.

## Files changed (mine)

- **Backend:**
  - `app/backend/insights_api.py`: one graph view = one audit entry.
  - `app/backend/tests/test_bugpass_c.py`: new, 3 tests.
- **Frontend:**
  - `app/frontend/src/pages/Reader.tsx`, `Audit.tsx`, `Renewals.tsx`, `Collector.tsx`
  - `app/frontend/src/components/Layout.tsx`, `common.tsx` (SyntheticPill)
  - `app/frontend/src/mock/mockServer.ts`: renewal date shift; `confirmedCerts`.
  - `app/frontend/src/api/insights.ts`: offline recalibrate; confirmed graph variant. Only my pages use this file.
  - `app/frontend/src/round8b.css`, `app/frontend/src/mobile.css`: one appended block.

## Tests

- `cd app/backend && uv run pytest -q`: **134 passed** (includes the other agents' in-progress tests at the time).
- `cd app/frontend && npx tsc --noEmit -p .`: clean.
- Re-ran the crawl and flow scripts after the fixes, online and offline: no overflow, no page errors and no HTTP ≥ 400 on any of my routes. Only the warnings in rows 14 and 15 remain.
- Scripts are in the scratchpad: `qa_C/{crawl,flows,reader,offgraph,hiscan,measure,maptip}.mjs`.

## Remaining risks

- Offline audit is a simulation. Graph views and Reader archive lookups are not logged offline, so "who saw 004512" shows fewer entries offline than online.
- The offline Learning panel is a snapshot. The before/after numbers come from the bundled refit, not from the officer's offline answers. This is labelled SIMULATED.
- The Reader's "unclear read" on the prior certificate's father name (OCR 40%) is expected behaviour, but it is a visible amber hint in the demo.
- Below 420 px, the shortened pills read "Synthetic" / "नमूना" and "offline" / "ऑफ़लाइन". The full text is in the tooltips (not visible on touch).
