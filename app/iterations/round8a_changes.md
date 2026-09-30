# Round 8a changes: family knowledge graph + human-in-the-loop learning (29-09-2026)
All additive. No existing response changed; the 5-minute demo path (08790, 08812, 08835, 08841, 08925, Collector, Audit) is untouched. CaseView and Kendra were not edited. All person data is SYNTHETIC.

## 1. Family knowledge graph + integrity analytics (`backend/graph.py`, networkx 3.6)
- **Graph:** 17,569 synthetic people (nodes), father/mother→child and spouse edges from the population register, 8,775 certificates hanging off their holders (26k nodes, 39k edges).
  - In production the family edges would come only from officer-confirmed links (every "same family" adds an edge). The page says so.
- **Four signals.** Wording is neutral ("needs a look", never "fraud") and uses CATEGORY labels only (a test checks that no community name appears).
  - (a) `category_conflict`: a father and his children hold certificates or pending claims in different categories.
  - (b) `cancelled_relative`: a cancelled or under-scrutiny certificate, where relatives hold active ones that may have relied on it.
  - (c) `duplicate_identity`: same normalised name + father's name + district, birth year within 5, but details differ. This does not use ground truth, so namesakes can trigger it.
  - (d) `tehsildar_permanent`: a permanent caste certificate issued by a Tehsildar (policy check).
- **Honest overlay.** The generated archive has no (a) or (c) cases. For the statewide view only, a deterministic overlay plants 30 category conflicts and 20 re-issued duplicates. It never touches demo families or the matcher's archive.
  - The page reports planted → found: 30 → 30 and 20 → 20, plus 3 namesakes flagged. This is why these are "look" signals.
  - Statewide counts: 31 / 49 / 23 / 386. The 31 includes the live 08841 claim.
- **`GET /api/graph/family/{app_id}`:** 3 generations (a grandfather with no record shows as a name-only node), siblings, the father's siblings, the certificates, the model's match edges, and `records_used` (accepted) vs `records_found`. It also returns the family-level signals.
  - Each view is audited as `family_graph_viewed`, with the records accessed.
  - 08812 shows the father's certificate: "candidate", then "relied" after C. 08841 shows the category conflict (OBC certificate vs ST claim). 08856 shows the cancelled certificate. 08863 shows the Tehsildar-issued certificate.
- **`GET /api/graph/integrity`:** signal counts, families, certificates, example family IDs (08841 is clickable), top districts and a district table.

## 2. Human-in-the-loop learning (`backend/learning.py`)
- **Labels:**
  - Every officer "same family" / "not this family" act on a file (`STATE.dispositions`) becomes an `officer_case` label.
  - "Ask the officer" answers become `officer_active` labels.
  - 300 SIMULATED confirmations are drawn from ground truth with a 3% officer error rate, only from pairs an officer would see (P ≥ 0.60) and only from the label pool. Approve/reject decisions are never labels (tested).
- **Method:** logistic (Platt) calibration of the Fellegi–Sunter score, ridge-shrunk to the EM model. The operating cut is chosen on the labels by F0.5. There is also an optional per-comparison reweighting, shown as experimental in the API only.
- **Held out:** half of the synthetic test families, split by lineage (1,051 applicants, 1,662 true links). These families never supply a label. The response includes 20 bootstrap refits for an uncertainty range.
- **Result (honest):**
  - Before: precision 91.6%, recall 46.0%, and the screen shows 97.9% on average (over-confident).
  - After (300 simulated labels): precision 90.35%, recall 47.9%, shown 76.6%. The model now errs cautious because the simulated labels carry 3% officer error. The bootstrap precision range is 80.7–91.5%.
  - The UI states all of this. The features cannot separate same-village namesakes, so recalibration mainly fixes the shown confidence (automation bias). It does not lift precision.
- **Active learning:** 5 unlabelled pool pairs closest to the current decision cut, one per applicant. The officer answers ✓/✗ and Recalibrate moves the card. Presenter mode shows the synthetic truth.
- **A recalibration is a PROPOSAL (`live: false`).** Live matching is unchanged (tested), and it is audited as `model_recalibrated`.
- **Endpoints:**
  - `GET /api/learning/status`
  - `POST /api/learning/recalibrate`
  - `POST /api/learning/label {pair_id, decision: same|not}` (404 for an unknown pair)
  - State lives in `state/learning.json`; `POST /api/reset` clears it.

## Wiring
- New router module `backend/insights_api.py`, mounted by one line at the end of `api.py`. `reset()` also calls `insights_api.learning.reset()`.
- A background thread warms the ~3 s pair-scoring cache at startup.
- `uv add networkx`.

## Frontend
- **New route `/graph`** (`pages/GraphPage.tsx` + `components/FamilyNetwork.tsx`):
  - an interactive Cytoscape network (pan, zoom, tap for details, fit), laid out in generation rows
  - demo-file pills (default 08812; 08841 shows the conflict)
  - the family signals highlight their nodes
  - legend, "record relied on", and the integrity panel (tiles, district table, detector-test note)
  - nav link "नेटवर्क"
- **Collector:** after the eval panel, a link card "परिवार नेटवर्क विश्लेषण" and `components/LearningPanel.tsx`:
  - label counts (real vs simulated)
  - the Recalibrate button
  - a before/after table (precision, recall, shown confidence)
  - the ask-the-officer list
  - notes: labels come only from confirmations, never from approve/reject; the recalibration is a proposal; the UK Consult precedent (83%)
- **Offline:** `api/insights.ts` has its own fallback to the fixtures `graph_family.json`, `graph_integrity.json`, `learning_status.json` and `learning_recalibrated.json` (`backend/scripts/export_fixtures_round8a.py`). Officer answers are simulated locally. Verified with the backend stopped.

## Tests
- **`tests/test_round8a.py`:** 13 tests.
  - hero graph: 3 generations, candidate → relied after confirm, audit
  - the three family signals
  - neutral wording, with no community names
  - statewide planted = found
  - the overlay never touches the live archive or demo families
  - a small detector case
  - labels come from the pool only, with ~3% error
  - before/after on the held-out set
  - labels come from confirmations and never from decisions; reset clears them
  - recalibration is not live
  - the IRLS fit recovers a known calibration
- **Full suite:** `uv run pytest -q`, 105 passed (with the parallel rounds' tests). `npm run build` passes.
- **Browser (HI):** checked /graph (08812, 08841, 08856), Collector (answer ✓ → Recalibrate moves the card), and offline mode. There were 0 console errors, and "38% बनाम 19%" is unchanged.

## Presenter notes
- Opening /graph for a file adds a `family_graph_viewed` audit row. After viewing 08812's graph, the Audit search "004512" shows one more row.
- The Collector page is longer. The new cards sit below the eval panel.
