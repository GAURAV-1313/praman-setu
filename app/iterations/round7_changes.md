# Round 7 changes: native / maiden village search (28-09-2026, demo day)
**Problem.** Recall for women applicants was 0.33, against 0.48 overall. A married woman's family records sit in her parents' (maiden) village. She applies from her husband's village, and blocking and the place comparison use that current village.

**Fix.** Search the native (maiden) village as well. The Kendra operator can add it at pre-check, and the officer can add it on the case. Records found this way still need the officer's "same family / not this family". No safeguard changed.

## Backend
- **`engine.py`:**
  - New functions: `native_place`, `native_query`, `merge_native`, `native_info`.
  - `analyse(…, native_village=None)` runs the same lineage search a second time against the native village (with its tehsil and district). It then merges the two result sets and de-duplicates them by certificate.
  - A record carries `found_via: "native_village"` and a HI/EN `found_via_note` only in two cases: the native search alone surfaced it, or the native search scored it higher.
  - `analysis.native_village` appears only after a native search.
  - The ground "same father & village" is pre-offered when the record is in the stated native village. The order sentence then reads "…प्रमाण पत्र आवेदिका के मायके / मूल गांव (गढ़बेंगाल, एलजीडी 449687, जिला नारायणपुर) का है; वर्तमान निवास मसोरा".
  - Pre-check takes an optional `native_village_lgd`, and its summary names the village.
- **`api.py`:**
  - `PrecheckBody.native_village_lgd` (an unknown code returns 422, and the audit note names the village).
  - New endpoint **`POST /api/applications/{id}/search-native-village {village_lgd|null}`**:
    - It is audited as `native_village_searched` (records accessed = the records found there) or `native_village_search_cleared`.
    - It returns 409 when the file is not pending, or when a record from an earlier native search is already marked (undo it first).
    - It returns 422 for an unknown code or for the applicant's own village.
  - `STATE.native` is persisted and cleared by reset.
  - `/api/villages` items now include `district`.
- **`seed_round7.py` (new):** the demo file and the father's certificate, seeded at load and reset in the same way as round 4's 08915. The generator's output files are untouched, so the eval and every existing file stay the same. It is deterministic.
- **`geo.py`:** Hindi labels for Masora (मसोरा), Garhbengal (गढ़बेंगाल) and Narayanpur (नारायणपुर).
- **`evaluate.py`:**
  - New function `native_village_slice()`. It simulates that every married woman in the held-out set states her native village (her birth village in the synthetic population). Both searches run, with the max score per certificate.
  - The result is written as a 6th slice plus a `native_village_search` block. The existing five slices and the overall figures are byte-identical (checked).

## New demo file: `SS/2026/KDG/08925` (SDO Kondagaon desk, SYNTHETIC)
**Rajni Korram** (F, born 1999, ST Muria, government job application):
- She applies from her husband's village, **Masora** (LGD 448686, Kondagaon).
- Her father, **Jaglu Usendi**, holds a permanent ST certificate, **`CG/NRP/SDO/2017/003186`** (SDO Narayanpur, 12-06-2017). It is registered in her maiden village, **Garhbengal** (LGD 449687, Narayanpur district).

The file then plays out in four steps:
- **Normal search:** no record, because the place comparison for a different district is −10.1. The file is standard review, and the suggestion is send back (caste proof missing).
- **⌂ "मायके के गांव में खोजें":** type "Garh", press ↵, then click खोजें. The father's certificate is found as an **exact** match (98%), labelled "मायके / मूल गांव गढ़बेंगाल (नारायणपुर) से मिला — वर्तमान गांव की खोज में नहीं". The lane is still standard review and it is not ready to sign.
- **C ↵:** the file is records complete, ready to sign, and the order cites the maiden village.
- **Kendra:** "डेमो: विवाहित महिला" fills Rajni, Jaglu Usendi, Masora and Garhbengal, and the result is an exact match with the pill "⌂ मायके / मूल गांव से मिला".

## Frontend
- **`components/VillagePicker.tsx` (new):** an LGD autocomplete that searches the whole state and shows the tehsil and district.
- **`components/NativeVillageAction.tsx` (new):**
  - It is offered on a woman's pending standard-review file when no record is in play, or after a native search.
  - The button reads "⌂ मायके के गांव में खोजें · Search native village". It opens the village picker with a "🔍 खोजें" button, and carries the audit and "you still decide" note.
  - After a search, it shows the result note, with "दूसरा गांव खोजें" when nothing was found.
- **`VerdictCard`:**
  - The no-match notice for women now reads "विवाहित महिला? पैतृक परिवार के अभिलेख प्रायः पति के गांव में नहीं, पिता के (मायके के) गांव में होते हैं — मायके के गांव में खोजें।" with the action beneath it.
  - Native-found evidence gets a "⌂ … से मिला" line.
  - The "village differs" point notes "दूसरा आवेदिका का मायके का गांव है, आपके कहने पर खोजा गया".
- **`LineageCard`:** the source label reads "मायके / मूल गांव की खोज से मिला — गढ़बेंगाल, नारायणपुर".
- **Other pages:**
  - **Case view:** the action is wired in (hidden in shadow mode and on another desk's file).
  - **Sewa Setu console panel:** the action is wired in (compact).
  - **Kendra:** a new optional field "मायके / मूल गांव (विवाहित महिला आवेदक हेतु)", the demo button, and a "found in native village" pill.
  - **Audit:** labels and a Hindi note for the new actions.
  - **Collector:** the eval table shows the new slice with its simulation note.
- **Offline:**
  - `mock.searchNativeVillage` uses the new fixture `native_village_overrides.json` (the 08925 analysis after the search and after confirming). Any other village gives a neutral "nothing found there".
  - Confirm and undo on the native-found record also work offline.
  - The mock pre-check matches native-village records by the father's surname. The villages fixture includes Garhbengal.

## Evaluation (synthetic held-out set, `model/eval.json`)
| Women applicants (2,458 true links) | Precision (exact ≥ 0.95) | Recall (exact) | Recall (possible ≥ 0.60) |
|---|---|---|---|
| Current village only (unchanged slice) | 0.884 | **0.328** | 0.795 |
| + native-village search | 0.902 | **0.711** | 0.903 |

- **Married women only (1,637 true links):** recall at exact goes from 0.095 to 0.670, and precision from 0.842 to 0.906.
- **Honest caveat:** this assumes the native village is known for every married woman. That is an upper bound, because in practice it applies only when she states it. It is synthetic data. It is labelled on the Collector eval table.

## Tests
- **`uv run pytest -q`:** 80 passed.
  - Four new tests:
    - native search finds 08925 (exact, `found_via`, pending, then records complete after C; "not this family" works; a marked record blocks a different search with 409)
    - audit entry and validation (422 for an unknown village or the current village, clear, a neutral "nothing found")
    - absent field means identical results for 08812 and the pre-check, and the maiden certificate is not found without the field
    - the eval slice is added and the first five slices are kept
  - One clock-dependent assertion was fixed. `test_queue_sorted_by_evidence_state_with_reasons` had started failing on 28-09 because more files are now SLA-urgent. It now checks the first **non-urgent** pending file.
- **Regression snapshot:** every GET bundle (36 files), both queues and the two pre-check examples were compared before and after Round 7. All are identical except for the new file itself, and the pilot `lane_mix` (live queue: 0.257/0.257/0.486 → 0.25/0.25/0.50).
- **`npm run build`:** passes (tsc clean).
- **`scripts/export_fixtures.py`:** re-exported.
- **Browser (tab-1, 1366×657, HI):**
  - 08925 case view: native search, then C ↵, gives records complete, and the audit shows "मायके / मूल गांव में खोज".
  - Console panel: native search on 08925.
  - Kendra: the married-woman demo gives an exact match.
  - Offline (backend stopped): 08925 native search and C, and the Kendra pre-check, both work.
- **5-minute path after `?demo=reset`: identical outcomes.**
  - console 08790 → SDO-KON/2026/0001
  - 08812: C ↵ Ctrl+↵ Space ↵ → SDO-KON/2026/0002, staying on the file with the WhatsApp card
  - 08835 → SDO-KON/NTC/2026/0001
  - 08841 → SDO-KON/REF/2026/0001, "पटवारी के पास · 0/7 दिन"
  - Collector "38% बनाम 19%"
  - Audit 004512 → 3 rows
  - 0 console errors
- **End state:** `POST /api/reset` and `/?demo=reset`.

## Changes a presenter should know
- The SDO Kondagaon desk and console list now show **15** pending files, not 14. The new last row is 08925 रजनी कोर्राम, "कमी: जाति प्रमाण".
- Pooja (08835) is a woman with no record, so her verdict card now shows the small "⌂ मायके के गांव में खोजें" button. The S → Ctrl+↵ → Space → ↵ keys are unaffected.
- The Collector eval table has one more row: women + native-village search (71.1% recall).
- The console's "overdue / due in 2 days" counters depend on today's date (28-09), not on this round.
- **Suggested 30-second add-on (Q&A or after Pooja):**
  1. Open 08925.
  2. Show "कोई प्रमाण पत्र नहीं मिला".
  3. Click ⌂ मायके के गांव में खोजें, type "Garh", press ↵, then click खोजें. Her father's certificate from Narayanpur appears.
  4. Press C ↵. The file is now records complete.

  Line: "Women's family records are in their father's village. One field closes most of the gap: 33% → 71% recall on the test set."

## Files touched
- **Backend:**
  - `seed_round7.py` (new)
  - `engine.py`, `api.py`, `geo.py`, `evaluate.py`, `model/eval.json`
  - `tests/test_api.py`
  - `scripts/export_fixtures.py`
- **Frontend:**
  - `components/VillagePicker.tsx` (new), `components/NativeVillageAction.tsx` (new)
  - `components/VerdictCard.tsx`, `LineageCard.tsx`
  - `pages/CaseView.tsx`, `SewaSetuConsole.tsx`, `Kendra.tsx`, `Audit.tsx`, `Collector.tsx`
  - `api/types.ts`, `api/client.ts`, `mock/mockServer.ts`, `mock/fixtures/*` (new file: `native_village_overrides.json`)
  - `styles.css`
- **Docs:** `CONTRACT.md` (Round 7 section).
