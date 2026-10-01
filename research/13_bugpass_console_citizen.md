# 13 — Bug pass: Sewa Setu console mock, citizen portal, Kendra

Date: 02-10-2026 · QA engineer B (one of three parallel passes) · scope `/sewasetu`, `/sewasetu/case/…`, `/nagrik`, `/kendra`, `citizen.py`. All citizen data is synthetic. Nothing was committed.

Method: a private backend (:8102, `PRAMAN_STATE_DIR=/tmp/praman_state_B`) and Vite (:5102). Headless Chrome (playwright-core) scripts drove the real UI, and I reviewed the screenshots. I also called the backend directly with curl and with threaded requests. Scripts are in the session scratchpad (`…/scratchpad/qa_B/`: `scan.mjs`, `paths.mjs`, `stale.mjs`, `attn.mjs`, `cz.mjs`, `misc.mjs`, `kstale.mjs`, `dash.mjs`, plus copies of round 12's persona scripts with `run_all.mjs`). Round 12's 18 fixes were not redone. Its persona suite was re-run as a regression check.

## 1. What was tested

**Console (`/sewasetu`)**
- **Every file, both languages:** all 36 files (15 on the Kondagaon desk, 14 on the Keskal desk, 7 Tehsildar) were opened in EN and HI. On each, every tab was clicked and the document viewer was used (including the last-to-first wraparound). Recorded per file: draft-button state, panel hint, same/not-family controls, horizontal scroll and errors.
- **Result:** no page errors, no HTTP ≥ 400, and no horizontal scroll at 1366 px.

**Every decision path to the success screen**
- Use-draft Approve.
- Native Approve.
- Send back (also with an empty remark, which is refused).
- Reject: remark shorter than 15 characters (refused), then hearing notice, reload, simulated reply, final Reject.
- Same family / not this family, with grounds and Undo.
- Shadow mode, with the tool-check revealed after the decision.
- `?down=1`, where the back link keeps `?down=1`.
- Wrong desk: forward to its own desk.
- Misrouted Tehsildar file: Forward.
- Triple click on "Sign PDF": exactly one decision row.
- Language toggle while the sign sheet is open: blocked by the modal, as expected.
- Refresh after a decision.
- Panel collapse and expand, at 1024 px and 390 px.

**Citizen portal (`/nagrik`)**
- All 3 demo personas and the 6 manual-typing variants from round 12.
- Husband as guardian.
- Phone width (390 px).
- Misuse:
  - no Aadhaar / no consent;
  - the search limit;
  - a forged `proof_ref`;
  - an out-of-district village;
  - certificate-number fishing;
  - double-click on Pay;
  - Back and Forward;
  - refresh at every step;
  - language switch.
- New in this round:
  - Back after the receipt;
  - SC/ST ↔ OBC switch after picking a caste;
  - invalid year of birth;
  - Aadhaar entered as all X;
  - stray upload of an "unavailability proof";
  - editing the family tree after ticking the declaration.

**Citizen-filed files in the console**
- Sunita, approved.
- Rajni, approved via her maiden village.
- Ramesh, sent back, given a hearing notice, and referred (refer is done in the full view, by design).

**Kendra (`/kendra`)**
- Demo cases Sunita, married woman and no match.
- Masking on screen.
- Consent reset when a demo is loaded.
- Editing the form after a result.

**Backend probes**
- 8 concurrent filings.
- 4 concurrent filings in one session.
- Blank, whitespace-only and punctuation-only names.
- Bad LGD codes.
- Oversized lists.
- Proof and "no papers" sent together.
- Year of birth in the future.
- Audit rows linked to the application.

## 2. Bugs found in my area

| # | Sev | Where | Repro | Fixed? How |
|---|---|---|---|---|
| 1 | **High** (data loss) | `citizen.py` submit | Send 8 citizen filings at the same time. Two citizens got the same number (SS/2026/KDG/09007). The second overwrote the first in the store, and the queue listed 09007 twice. A double submit still in flight in one session could also create two applications, because the "one per session" guard only covered requests made one after the other. | Yes. The whole filing runs under one module lock (`_SUBMIT_LOCK`), so the number is allocated and the entry stored together. 2 tests added. |
| 2 | **High** (wrong order signed) | Console, "Use this draft" | 08778: mark Same family on all 3 records, then "Use this draft" (the reasoned order and remark are attached), then Undo. The draft order, which relies on the relationship just withdrawn, **stayed attached** with its remark, and Approve would sign it. | Yes. When the panel's draft no longer matches the attached one, the attachment is removed. The remark it filled in is cleared too, unless the officer edited it. |
| 3 | Medium | Console, native Approve | 08841 (attention point "category differs"), in Hindi: Approve with no remark, read the sign sheet, enter the token. Only then a raw English error appears ("422: approve requires your written finding…"). | Yes. Submit checks this first and shows a Hindi/English message: an open attention point needs at least 15 characters of reasons. Matches the backend rule. |
| 4 | Medium | Portal, Back after the receipt | After paying, the phone's Back reopened an **editable** form. Edit the name, Pay again, and the portal silently showed the **old** receipt with the old data. The citizen believes it was corrected. | Yes. Once a receipt exists, steps 0–5 show "This application is already submitted · SS/… · cannot be changed here" with "Show the receipt" / "New application". The stepper stays on Receipt. |
| 5 | Medium | Portal, service switch | Pick Gond (ST), go back to the service page, choose OBC. The caste box showed "Select", but Gond was kept: the form passed and an OBC application was filed with caste Gond. | Yes. Switching service clears a caste that is not in the new list, so the form asks again. |
| 6 | Medium | Portal, year of birth | "20", "1800" or "2031" passed the form. At the fee step it failed with raw pydantic JSON. The backend also capped the year at 2025, so a child born this year (2026) could not be filed. | Yes. The form needs 4 digits between 1930 and this year. The backend checks "not in the future" and no longer has a fixed 2025 cap. Test added. |
| 7 | Medium | Portal, family tree | After ticking the unavailability declaration, the family tree could be edited. The declaration text changed but stayed "ticked", so the citizen filed a text they had not confirmed. | Yes. The tick is tied to the exact text: editing un-ticks it. |
| 8 | Medium | Portal → console | The declaration the citizen "signs" was never sent. The officer's viewer showed "Scanned upload — demo placeholder" for it, and the family-tree relation showed "पिता" even in English. | Yes. The portal sends `declaration` (≤ 2000 characters). The backend stores it on the `unavailability_declaration` document, and the console's viewer shows the Hindi text as signed. Relations have English labels. Test added. |
| 9 | Low | Portal, Aadhaar | "XXXXXXXXXXXX" authenticated. The console then fell back to made-up last-4 digits. | Yes. 12 characters are needed, and the last 4 must be digits (demo numbers are masked XXXXXXXX1234). |
| 10 | Low | Portal, uploads | Row 3, "Caste proof #: unavailability proof", offered UPLOAD. Uploading it did not satisfy the "#" rule, and the error still said "attach at least one". | Yes. Without the no-papers path, the row says "No papers? Go back and choose 'I have no papers' — the declaration is made there". |
| 11 | Low | `citizen.py` precheck | Father's name "  " or "--" was accepted. It used up one of the 3 searches and wrote a useless audit row. | Yes. At least 2 letters are needed (else 422, before counting). The portal shows a Hindi message. Test added. |
| 12 | Low | `citizen.py` submit | `proof_ref` and `no_papers` together were accepted (an inquiry request with a certificate attached). Family-tree / document lists had no size limit. | Yes. Sending both returns 422. The family tree is limited to 6 rows and `other_docs` to 12 items. Tests added. |
| 13 | Low | Console header | It always said "SDO (Revenue), Kondagaon", even on the Keskal desk or on a Tehsildar file. | Yes. It shows the acting desk ("SDO (Revenue), Keskal"), or the Tehsildar office for Tehsildar files. |
| 14 | Low | Console list | A file with a hearing notice out disappeared from the console list and from every tile until the reply came, although the success screen says "the file stays open". | Yes. It stays in the Pending list and the Pending tile, marked "Hearing notice issued". |
| 15 | Low | Console | The document-viewer index, any open sign sheet or token modal, and the confirmation box were not reset when another file was opened (Demo menu or Back). | Yes. They are reset with the other per-file state. |
| 16 | Low | Kendra | After a result, editing the father's name or village kept the old "found" card and its "Attach as proof" button. | Yes. Any edit clears the result and the attachment. |
| 17 | Low (wording) | `msg_received.hi.j2` | "निर्णय की तिथि: 24-10-2026" reads as "the decision date". It is the deadline (EN: "Decision due by"). | Yes. Now "निर्णय की अंतिम तिथि". The checker still passes. Test added. |

**Checked and not a bug**
- A triple click on Sign PDF creates one decision.
- Rapid double Pay creates one application.
- Refresh at the fee step and at the receipt step restores the right step, and the draft keeps only 4 Aadhaar digits.
- The 4th search is blocked.
- Masking is intact on screen and in the API response.
- `?down=1` and shadow mode hide the Praman column and checklist.
- The wrong-desk and misrouted forwards work.
- The final Reject after a reply works from the console.

**Known open decisions, confirmed still present**
- Kendra `/api/precheck` returns full records, has no limit, and accepts `consent: null`.
- The 3-search limit is per browser session (a new session gets 3 more).
- English-typed names get garbled Hindi (e.g. "रंलल मर्कम").
- The console's decision box has no "Refer to Patwari": the panel hint sends the officer to the full view.

## 3. Bugs in other areas (not edited)

- **`api.py`, `_decide` (officer-workflow).** Native console Approve on a file where "same family" was marked and then undone, with no attention flag, is accepted with an empty remark and no relationship confirmed (08778 → approved, `accepted_cert_nos=[]`). This is by design ("today's console"), but worth a decision: maybe require a remark whenever the panel showed an unconfirmed usable record.
- **`api.py`, Tehsildar "Forward".** On 08915 the message says "Forward it to the SDO (Revenue), Keskal". After Forward, the file lands on the default SDO view and shows "belongs to Keskal — forward" again, so it takes two forwards. Consider routing it straight to its sub-division desk.
- **Shared `playwright-core` in `…/scratchpad/shots/node_modules` is broken** (no `package.json` / `index.js`), so round-12 scripts fail from there. I installed a private copy in `qa_B/`.
- **Environment.** The Mac's disk filled up completely during the run (`/System/Volumes/Data` 100%, about 118 MB free). Bash and Chrome writes failed for a few minutes; it later recovered (6 GB free). The scratchpad is about 1 GB (`feas/` alone is 290 MB).

## 4. Files changed

Backend:
- `app/backend/citizen.py`: submit lock; 422 when proof and "no papers" come together; list limits; year of birth not in the future; father's name needs letters; stores the declaration text; English family-tree relations.
- `app/backend/templates/msg_received.hi.j2`: "निर्णय की अंतिम तिथि".
- `app/backend/tests/test_citizen.py`: +8 tests.

Frontend:
- `app/frontend/src/pages/SewaSetuConsole.tsx`: bugs #2, #3, #13, #14 and #15; the viewer shows a document's own text.
- `app/frontend/src/pages/CitizenPortal.tsx`: bugs #4–#11.
- `app/frontend/src/pages/Kendra.tsx`: bug #16.
- `app/frontend/src/api/types.ts` (small edits): optional `declaration` on the submit request; optional `text` on documents.

Not touched: `citizen.css`, `VillagePicker`, `WhatsAppPreview` (no bugs found), and any file owned by another agent.

## 5. Tests

- `uv run pytest -q`: **135 passed**. That includes 20 in `test_citizen.py`, 8 of them new this round.
- `npx tsc --noEmit -p .`: **clean**. That includes the other agents' in-progress files at the time of the run.
- Browser re-runs after the fixes:
  - all 36 files scanned again (HI);
  - every console decision path;
  - the round-12 persona suite (16 scripts);
  - the new citizen and Kendra scenarios.
- No page errors, and no unexpected HTTP ≥ 400 (the only ones were the deliberate misuse probes).

The private servers on :8102 and :5102 are stopped.

## 6. Remaining risks

- The submit lock serialises filings in one process. A multi-worker deployment needs a database sequence for application numbers.
- The citizen's own name is still not checked against the Aadhaar name (demo).
- On a phone, the console scrolls sideways at 390 px. It is a desktop officer tool, so I left it.
- The declaration text is whatever the browser sends (≤ 2000 characters). A real system should regenerate it on the server from the family-tree rows.
- After switching service, an archive search the citizen already made is shown as stale and must be repeated. That is correct, but it uses one of the 3 searches.
