# Round 6 changes: officer-day bug fixes (27-09-2026, night)
Input: `FINAL_ASSESSMENT.md` §4.2 (problems list from the live "officer day" test) and §6.3 (risk 2, SLA collision). All round 1–5 safeguards are kept: backend-owned confirmation, grounds popover + Undo, read-before-sign, hearing before reject, findings on override, sign-tray limits, competence guard, reset, 1366×657 layout.

## P1 fixes
1. **C / N act on the record on screen (§4.2 #1).**
   - The record shown is now owned by the case page (`viewIdx`). C and N act on exactly that record, never on another tab. Before, `keyTarget` was "the first undecided record", so N on the father's tab opened "not this family" for the valid brother (08778).
   - Each case still opens on its first open record. After that, the officer's choice of tab is kept, including after Undo.
   - **Several records:** the targeted tab has a blue focus ring. A hint in the same row reads "C/N → भाई · 2020/000307 · ←→ बदलें", so it adds no height at 1366×657. The confirm row carries a blue left bar.
   - **Switching:** ←/→ switch records anywhere on the page. Tab / Shift+Tab switch from the page or the record tabs, and leave the strip normally at either end, so the keyboard is never trapped. The tabs are a proper ARIA tablist.
   - **C on a record already decided, or on one declared by the applicant:** it changes nothing and only flashes the row. Undo is still required first.
   - **Grounds popover:** when "Record" is still disabled (N with no ground yet), focus goes to the first ground chip. So N, Space, ↵ records on the viewed record.
   - **Blocked sign:** the dock link "पहले संबंध तय करें" now switches to the record that blocks signing, then flashes it.
   - **Verified on 08778:** Tab Tab → father; N Space ↵ → father "not this family". ←← → brother 000307; C ↵. The dock link → brother 000511; C ↵. Ctrl+↵ opens the order.
2. **"Certificate dated after the application" rule (§4.2 #3).** In `rules.validity`, the issue date now fails only in two cases:
   - it is **in the future** (after today), or
   - the certificate was **declared on the application** (by the applicant or the Kendra) yet issued after it. That is logically impossible.

   A relative's normal later certificate passes, with the note "…इस आवेदन के बाद — संबंधी के बाद में जारी प्रमाण पत्र हेतु सामान्य". Flag titles now say "future date" or "declared … dated after the application".
   - **08778:** the file is no longer "needs attention". There is no Scrutiny Committee suggestion and no 95-character override finding. Both brothers are confirmable and the order relies on both.
   - **Still caught:** 08795 and 08886 (future dates) and 08721 (a declared certificate with a future date).
3. **OBC creamy-layer finding (§4.2 #5).**
   - **The draft:** every OBC approval draft now carries a slot, "क्रीमी लेयर निष्कर्ष (अ.पि.व.): [अधिकारी: …]". The placeholder guard blocks signing until it is filled.
   - **The dock:** it shows a required tick, never pre-ticked: "आवेदक क्रीमी लेयर में नहीं आते (गैर-क्रीमी लेयर)". Beside it are chips for the documents relied on; the father's income certificate is pre-selected when it is on file. The note says whether that certificate is on file, and "क्रीमी लेयर में? स्वीकृत न करें — वापस भेजें या सुनवाई सूचना दें".
   - **The order:** the tick fills the slot in HI and EN, for example "…पिता का आय प्रमाण पत्र के परीक्षण पर अधोहस्ताक्षरी पाते हैं कि आवेदक क्रीमी लेयर में नहीं आते तथा गैर-क्रीमी लेयर अन्य पिछड़ा वर्ग आवेदक के रूप में प्रमाण पत्र के पात्र हैं।" It counts as the officer's act, so the audit does not mark the order as "EDITED".
   - **Keys:** Ctrl+↵ on a blocked OBC file focuses the tick, so Space ticks it.
   - **Backend (`check_creamy`):** for decisions and the tray, it requires `creamy_layer.non_creamy`, documents from `analysis.creamy_layer.options`, and the finding text in both languages.
   - **What is stored:** the audit note, the decision snapshot and the decision record all keep the finding.
   - **Sewa Setu's native order** (Praman not used) is unchanged. The console's one-click draft is not offered for OBC files, which need the tick.

## P2 fixes
4. **Queue "Next step" = the case page's gate (§4.2 #2).**
   - **One definition:** the backend defines `pending_cert_nos` (usable records awaiting C/N) and `ready_to_sign`.
   - **The queue:** "Ready to sign" now appears only when `ready_to_sign` is true.
   - **08758:** it reads "संबंध तय करें (एक और पारिवारिक अभिलेख)", and its summary says "· एक और पारिवारिक अभिलेख तय करना है".
   - **Other users of the gate:** the case page's "decide the relationship first", the tray check (backend and offline mock) and the console's draft button all use the same fields.
   - **Test:** "Ready to sign" ⇔ `ready_to_sign` for every file on every desk.
5. **Routing by sub-division (§4.2 #4).**
   - **The SDO desk (default Kondagaon) lists only its own sub-division's files.** The desk is in `ps_desk` and cleared by the reset. It applies to `/api/queue?role=sdo&desk=…`, the Praman queue and the console pending list.
     - Kondagaon: 14 pending. Keskal: 14. `desk=all` gives the district view.
     - A demo desk picker, "एसडीओ कोंडागांव (14) ▾", sits in "मेरा डेस्क".
   - **A Keskal file opened on the Kondagaon desk** (by URL or the console) shows the banner "अनुविभागीय अधिकारी (राजस्व), केशकाल की फ़ाइल — अग्रेषित करें".
     - The file is read-only: C/N are off, and the verdict card's "your job" says forward.
     - The dock offers "→ … केशकाल को अग्रेषित करें". It logs `forwarded_other_subdivision` and takes the file out of the tray.
     - There is also a "switch desk (demo)" link.
   - **The backend refuses:**
     - a decision with `desk` set to another sub-division (409)
     - the tray, for another desk's file, by default (409: "belongs to SDO (Revenue), Keskal … forward it; the sign tray refuses it")
     - mixing offices in one tray

## New-risk mitigation
6. **SLA clock during hearing and Patwari referral (§6.3 risk 2).**
   - **Default everywhere a timer shows:** "⏱ SLA घड़ी: चालू · रोकने हेतु राजस्व आदेश आवश्यक". The timers appear on the queue stage pill, the Patwari stage in the dock, the hearing-notice dock and the queue policy footer.
   - **Proposed toggle:** Collector → policy card has "प्रस्तावित नीति — राजस्व विभाग का आदेश आवश्यक". Turning it on shows "⏸ SLA रुकी (प्रस्तावित नीति — राजस्व आदेश लंबित)".
   - **It is display only:** no due date and no Lok Sewa Guarantee clock changes, and the page says so. The change is audited as "PROPOSED" and reset restores "running".

## Tests
- **`uv run pytest -q`:** 76 passed (was 71). New tests:
  - `test_round6_later_sibling_certificate_is_not_flagged`: the rule unit cases, 08778 with no flag, no referral and no Scrutiny suggestion, and 08795/08721 still caught
  - `test_round6_obc_approval_records_creamy_layer_finding`: 422 without the finding, with `non_creamy:false`, with no documents or unknown documents, or with the placeholder left; 200 puts the HI+EN text in the order, the audit and the snapshot
  - `test_round6_queue_next_step_matches_the_case_gate`: 08758 before and after C, and "Ready" ⇔ `ready_to_sign` across all desks
  - `test_round6_sdo_desk_shows_only_its_subdivision_and_tray_refuses_other`
  - `test_round6_sla_pause_is_a_labelled_proposed_policy_display_only`
- **Updated tests:**
  - desk-aware queue assertions
  - the future-date wording
  - the tray test now uses five Kondagaon files (08812 after C, in place of 08758 from Keskal)
  - the placeholder test allows only the OBC creamy slot
- **`npm run build`:** passes (tsc clean).
- **`scripts/export_fixtures.py`:** re-exported for all desks (`desk=all`). 08778 and 08758 were added to the focus cases.
- **Browser (tab-1, 1366×657, HI, live backend):**
  - fixes 1–6 each verified as above
  - console: 08772 opened on the Kondagaon desk shows the forward banner, with the draft and the panel C/N disabled
  - offline (backend stopped): the Kondagaon queue has 14 rows and 08870 is approved with the creamy finding
- **5-minute script from `round5_changes.md`, run once at 1366×657 after `?demo=reset`: identical outcomes.**
  - console 08790 → SDO-KON/2026/0001 (plus the service-down toggle)
  - 08812: C ↵ Ctrl+↵ Space ↵ → SDO-KON/2026/0002, staying on the file with the message
  - 08835 → SDO-KON/NTC/2026/0001
  - 08841 → SDO-KON/REF/2026/0001, "पटवारी के पास · 0/7 दिन", now with the SLA clock line
  - 08856: X → hearing notice, then Esc
  - Collector "38% बनाम 19%"
  - Audit 004512 → 3 rows
  - every sign sheet ticked with 1 Space
  - 0 new console errors; the only errors were from a mid-edit hot reload
- **End state:** `POST /api/reset` and `/?demo=reset` done (tray 0, 28 pending across both desks, audit 0, only `ps_lang` and `ps_reset_id` left), and the viewport reset to desktop.

## Changes a presenter should know
- The console list and the Praman queue now show **14** SDO Kondagaon files, not 28. The console's "due in 2 days" counter drops from 3 to 2. The Keskal files are one click away in the desk picker.
- 08778 is no longer an "approve over a flag" example. It is now a clean two-brother confirmation.

## Files touched
- **Backend:**
  - `rules.py` (validity rule, `sla_pause` policy)
  - `engine.py` (flag text, `next_step`, `ready_to_sign`, `pending_cert_nos`, `subdivision`, `creamy_layer`, `sla_clock`)
  - `api.py` (desks, desk filter and guards, `route-desk`, `check_creamy`, policy)
  - `templates/order_approve.{hi,en}.j2`
  - `tests/test_api.py`
  - `scripts/export_fixtures.py`
- **Frontend:**
  - `src/desk.ts` (new)
  - `api/types.ts`, `api/client.ts`, `mock/mockServer.ts`, `mock/fixtures/*`
  - `pages/CaseView.tsx`, `Queue.tsx`, `Collector.tsx`, `SewaSetuConsole.tsx`
  - `components/LineageCard.tsx`, `ActionPanel.tsx`, `VerdictCard.tsx`, `common.tsx`
  - `styles.css`
