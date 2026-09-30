# Round 8b: a second service on the same engine, and a visible agent trace (29-09-2026)

## Why
- **Many services, one engine.** Judges may read Praman Setu as a caste-only tool. Income certificates are **49% of Sewa Setu volume** (REAL public MIS, 26.4 lakh of 53.9 lakh) and are valid for one year, so the same families come back every year. Last year's record already holds almost everything a renewal needs.
- **Show what the system did.** The officer (and a jury) should see the steps behind each suggestion, with honest labels. The last step is always the officer.

## 1. Proactive income-certificate renewal (SYNTHETIC)
Isolated by design: `rules.py` / `engine.py` caste and domicile logic are untouched.

**Backend**
- **`renewal.py` (new).** It contains the following:
  - A synthetic income-certificate archive, derived deterministically from the synthetic population: 1 in 100 adults aged 25–65, one per family, in the 5 districts with population. Each certificate expires 1–90 days from today, so the 30/60-day windows always have files in them.
  - The hero family is pinned: **Ramlal Markam (Bayanar), Sunita's father, at 12 days**. The presenter note is that Sunita's scholarship (08812) needs this certificate too.
  - Mock evidence per family: last year's certificate (archive), Khadya ration category and Bhuiyan land holding, each "now vs last year". The rows are data-minimised (no ration card or khasra numbers).
  - Evidence strength:
    - **verify:** the starter rule file `data/rules/income_certificate.starter.jdm.json` fires, e.g. "low income but large land holding". Its thresholds are placeholders, and the page says so.
    - **partial:** a source changed since last year.
    - **strong:** 3 of 3 sources are as they were last year.
  - Pre-fill creates a renewal record, `REN/KDG/2026/0001`:
    - fields from last year's record, each with its source;
    - the evidence reused;
    - **citizen confirmation "income unchanged": required, pending**;
    - **officer step: required, `auto_issue: false`**;
    - a WhatsApp nudge preview (not sent).
- **Templates:** `templates/renewal_nudge.{hi,en}.j2`. The plain-Hindi text reads: "…आपका आय प्रमाण पत्र क्र. … N दिन में (dd-mm-yyyy को) समाप्त होगा। नवीनीकरण के लिए केंद्र (…) पर आकर पुष्टि करें… — पिछले वर्ष का अभिलेख पहले से भरा है। आय बदली हो तो नया शपथ पत्र साथ लाएँ। निर्णय तहसीलदार … करेंगे।"
- **`messages.py`:** `check_entities(..., vocab_pattern=)` (additive). The nudge is checked against its own template's wording. The vocabulary for existing decision messages is unchanged (tested).
- **`api.py` endpoints:**
  - `GET /api/renewals?district_lgd=&window=`
  - `POST /api/renewals/{cert_no}/prefill`: idempotent, 404 if unknown, audited as `renewal_prefilled`.
  - Reset clears pre-filled renewals.

**Frontend**
- **`pages/Renewals.tsx` (new), route `/renewals`, titled "नवीनीकरण · Renewals — आय प्रमाण पत्र":**
  - a district picker and ≤ 30 / ≤ 60 day windows;
  - the list (days left, name, village, income, certificate number, strength pill, "पूर्व-भरित");
  - clicking a certificate opens the pre-filled card: fields and source, evidence reused, rule flag, the two gates (citizen confirms, officer decides) and a WhatsApp nudge preview with the "✓ checked" badge.
- **Engine strip "एक इंजन, कई सेवाएँ: जाति · मूल निवास · आय नवीनीकरण"** with the roadmap "legal heir (वारिस), EWS". It appears on the Renewals page and on the landing page, where it links to `/renewals`. There is also a roadmap card at the bottom of Renewals.
- **Other wiring:**
  - the "नवीनीकरण" nav link (bar and menu);
  - the SYNTHETIC pill on the page;
  - the Audit label for `renewal_prefilled`.
- **Offline:** `mock.renewals` / `mock.renewalPrefill` serve the fixtures `renewals.json` (5 districts) and `renewal_prefill.json` (every listed certificate).

## 2. "प्रमाण एजेंट" trace on the officer case view
- **`engine.analyse(..., timings=None)`:** it only records perf-counter marks in an optional dict, so its return value is unchanged (tested). `matcher.match(..., stats=None)` reports blocking and scoring counts and timings.
- **`agent_trace.py` (new)** builds 6 steps from the real analysis:
  1. **आवेदन पढ़ा:** service, names, documents uploaded.
  2. **खोज सीमित: गांव/तहसील (एलजीडी) → N उम्मीदवार:** village LGD, tehsil, and the same surname in the district. N is the like-for-like candidates of the 8,755 in the archive (+ native village if searched).
  3. **रिश्तेदार मिलान:** relation, score and level, plus the model and its version. It is amber while a record awaits "same family / not this family".
  4. **नियम जांच:** validity checks passed out of the total, required documents, failed checks, attention flags and gaps. It is amber when any of these is open.
  5. **प्रारूप तैयार:** approval order, send-back notice or reference.
  6. **अधिकारी की प्रतीक्षा:** always "waiting". The agent never decides. The UI shows "अधिकारी ने निर्णय लिया" once the file is decided.
- **Timings and storage:** each step has its ms; they are measured when the analysis is computed (cached per file). `api.State.analysis` attaches `analysis.trace`.
- **`components/AgentTrace.tsx` (new):**
  - It sits at the **top of the right sidebar**, collapsed by default to **one line (44 px)**: "प्रमाण एजेंट ✓✓!✓✓⏳ 6 चरण · 2.0 ms · 1 जांच हेतु · अधिकारी की प्रतीक्षा".
  - It expands to a timeline.
  - It is hidden in shadow mode until the officer decides.
- **The centre column is untouched,** so the C/N buttons stay where they were at 1366×657.

## Tests
- **`uv run pytest -q`:** 104 passed. The count includes 8 new tests in `tests/test_round8b.py` and the parallel agent's reader tests.
  - Renewal list: windows, sorting, one-year validity, hero, REAL share, roadmap, determinism, 422.
  - Rule-file flags.
  - Pre-fill: gates, idempotent, audited, listed, 404, cleared by reset.
  - Nudge: plain Hindi, entity checker passes; an invented "₹500" is caught.
  - The decision-message vocabulary is unchanged.
  - Trace:
    - on 08812: 6 steps, LGD 448703, 98% amber and then ok after C, waiting for the officer;
    - on 08835: neutral no-record;
    - on 08841: rules amber, reference;
    - the engine output is identical with or without timings.
- **`npm run build`:** passes.
- **`scripts/export_fixtures.py`:** re-exported (all fixtures now carry `trace`; plus the renewals fixtures).
- **Browser (1366×657, HI):**
  - `/renewals` Kondagaon: 21 files in 60 days, 11 in 30. Ramlal Markam → REN/KDG/2026/0001, with the evidence, the gates and the nudge "✓ जांचा गया".
  - The landing strip is shown.
  - 08812: the trace is one line, and C/N are visible. The 5-minute keys C ↵ Ctrl+↵ Space ↵ give **SDO-KON/2026/0001** with the WhatsApp card. The trace then shows all ✓.
  - Offline mock functions were checked in the page: renewals, prefill, 404, and the trace in the case fixtures.
- **End state:** the backend was restarted, then `POST /api/reset`.

## Presenter line (20 s, after 08812 or in Q&A)
Open **नवीनीकरण** and click **रामलाल मरकाम** (12 days). Say: "Same family, same engine. Half of Sewa Setu is income certificates. Last year's record plus ration and land fill the renewal. The citizen confirms 'income unchanged' at the Kendra, and the Tehsildar still decides. Nothing is auto-issued." For the trace: on any case, click **प्रमाण एजेंट** to show read → LGD search → model → rules → draft → waiting for you.

## Files touched
- **Backend (new):** `renewal.py`, `agent_trace.py`, `templates/renewal_nudge.{hi,en}.j2`, `tests/test_round8b.py`.
- **Backend (edited, additive):** `engine.py` (timings), `matcher.py` (stats), `messages.py` (vocab_pattern), `api.py` (trace hook, 2 endpoints, reset), `scripts/export_fixtures.py`.
- **Frontend (new):** `pages/Renewals.tsx`, `components/AgentTrace.tsx`, `round8b.css`, `mock/fixtures/renewals.json`, `mock/fixtures/renewal_prefill.json`.
- **Frontend (edited):** `pages/CaseView.tsx` (the trace only), `main.tsx`, `components/Layout.tsx`, `pages/Landing.tsx`, `pages/Audit.tsx` (a label), `api/types.ts`, `api/client.ts`, `mock/mockServer.ts`, and re-exported fixtures.
- **Docs:** `CONTRACT.md` (Round 8b section).
