# Round 1 critique: Praman Sahayak through the SDO's daily workflow
27-09-2026. Lens: the SDO (Revenue), Kondagaon, deciding about 150–190 permanent caste files a day with a budget of about 2 minutes per file. The questions are throughput, clicks, scrolls, cognitive load, liability, and whether each element earns its place.

**Method.**
- I used the running app (frontend :5173, live backend :8000) at a **1366×768** viewport, which is the typical district-office laptop.
- The path was Landing → Officer queue (SDO) → seven demo cases → confirm → sign → citizen message. I also tried send back, refer and reject, plus Kendra pre-check, Collector and Audit.
- I reset the backend before starting (`POST /api/reset`) and again at the end. I also cleared the `ps_*` sessionStorage keys. No code was edited.
- Positions are page-Y in CSS px, measured with JS. One screen is about 768 px, so a button at Y=2024 means about 2.6 screens of scrolling.

Grounding documents:
- `research/06_officer_tools_benchmark.md` (Top 20)
- `research/critique_1_officer.md`
- `SEWA_SETU_PLAN.md` v4
- `IMPACT_ANALYSIS.md`
- `app/CONTRACT.md`

---

## 1. Walkthrough log

### 1.0 Getting to work: Landing → queue
- **Path.** On the landing page the role cards sit below the hero banner, so the officer needs 1 scroll and 1 click on "SDO (Revenue)". Clicking "Officer" in the top nav is also 1 click.
- **Screenshot (queue).** The page shows:
  - an orange hackathon strip, the nav, and a "SYNTHETIC DEMO DATA" strip
  - the title "Application queue", then filter chips: All 28 · Records complete 6 · Standard review 15 · Needs attention 7
  - a blue pill: "Nothing is decided here. Everything is suggested."
  - an 8-column table: App ID, Applicant, Service (icon), Purpose, SLA, Lane (**green/grey/amber chips**), Suggested action, Top match %
  - **only about 6 rows above the fold**
- **Sort order.** Rows are sorted pending first, then `submitted_at` (`backend/api.py:154`). That is roughly SLA order, **not evidence state**. The hero case Sunita is **row 22 of 28**, which takes about 3 scrolls to reach.
- **Contradictory row signals** in the queue:
  - Sunita (08812) shows `Standard review` · `✓ Approve` · `98%`. The lane says "normal scrutiny" while the action column says "approve". Tarun Nishad (08778) has the same pattern.
  - An officer cannot tell *why* a row is where it is. There is no reason text, only a colour and a percentage.
- **Verdict colours.** Green means "Records complete" and amber means "Needs attention". This is the traffic light that the SDO critique (§3) and benchmark §6 say not to build.

### 1.1 SS/2026/KDG/08812 Sunita Markam: hero, found father's certificate, confirm then approve
- **Screenshot (first screen of the case).** Header card:
  - name, pills (ST permanent, scholarship, "SLA 26 days left")
  - a big "Standard review" lane chip
  - "Why this lane: …awaits your confirmation."
  - the persona pill **"ℹ Hero case: no pre-1950 record, but her father's ST certificate is in the archive (spelt differently, other script)."**
- **Above the fold** (at 768 px, the first comparison row starts at Y≈640):
  - About 80% of the first screen is chrome and header.
  - The right column already shows **"SUGGESTED ✓ Approve: Likely approvable…"** before any evidence is visible.
- **Comparison table** (Y 614–1048), six rows, all green-tinted with "✓ MATCH":
  - **"Person ✓ MATCH": Sunita Markam ↔ Ram Lal Markaam.** This compares the applicant with her father. The ✓ is driven by the *surname* weight (`LineageCard.tsx` rows[0], `state: w("surname") > 0`). It reads as "same person", which is wrong and invites the question "what exactly matched?".
  - "Father ↔ holder ✓ MATCH": Ramlal Markam ↔ Ram Lal Markaam. This is the row that matters. The variant spelling is shown, but it is not marked as a *variant*.
  - "Category ✓ MATCH": ST ↔ ST. **The caste name (Gond ↔ Gond) is not compared.** The plan requires notified-list comparison.
- **Validity checks** (Y 1062–1350): five large cards in a 2×3 grid, about 290 px.
- **Waterfall** (Y 1368–1700) and **family graph** (to Y 2008):
  - The graph shows two boxes and says nothing the header didn't.
  - The waterfall ends in `log₂ odds 5.9 → 1/(1+2^−5.9) = 98%`.
  - **All seven demo matches have identical weights (+6.8 / +5.3 / +6.3 / +1.3 → 98%)**, so this 640 px block carries no case-specific information in the demo.
- **Confirm relationship** is at **Y≈2024, 2.6 screens down**, below the waterfall and graph.
  - The one piece of *corroborating* evidence for "this is her father" sits **below** the Confirm button, in "Other records": ration roster, head of household Ramlal, applicant listed as member.
- **After confirming:**
  - The lane chip flips to "Records complete" at the bottom of the card.
  - The right column at that scroll position is **empty white space**, because the Action panel is not sticky.
  - The officer scrolls up about 1 screen to "Sign & issue: Approve" (Y≈1342).
- **Sign modal:**
  - Summary, then an **unlabelled checkbox** "I have read the records and the draft. This decision and its reasons are mine.", then "e-Sign (simulated)".
  - The citizen WhatsApp preview appears in the right column, which is again partly off-screen.
  - **There is no "Next case".**
- **Count.** 5 clicks (open, confirm, Sign, tick, e-Sign) and about 4–5 scroll gestures, plus 2 clicks and 2–3 scrolls to get back to the next queue row.
- **Time:** about 90–120 s. Reading takes about 45 s; the rest is scrolling and hunting.
- **Found bugs:**
  - **(a) Stale "confirmed" state (P0).** On first load the card said *"✓ Relationship confirmed by you. Certificate attached as evidence."* while the lane was still "Standard review" and the backend had no confirmation. The cause is `CaseView.tsx` storing `ps_confirmed_*` in sessionStorage, which the backend reset does not clear. The UI told the officer "you confirmed" when the audit log did not.
  - **(b) Sign is enabled before confirming.** "Sign & issue: Approve" is live while the certificate is "subject to the officer's confirmation". An officer can approve on an unconfirmed machine match in 4 clicks.
  - **(c) Unfilled placeholders get signed.** The server draft (`templates/order_approve.*.j2`) contains `Officer's findings: [ ........ ]` and `Date: ____________`, and it can be signed exactly like that. The signed order then reads "on the basis of … **my findings**" with no findings. This is the "mechanical order" writ exposure the SDO warned about.

### 1.2 SS/2026/KDG/08790 Rohit Netam: declared sister's certificate, records complete
- **Screenshot.** Lane chip "Records complete" (green). Persona pill: "ℹ Sibling match: his elder sister's permanent ST certificate (2021)." Suggested: Approve.
- "Person ✓ MATCH": **Rohit Netam ↔ Rekha Netam**. The label is wrong again.
- A **"✓ Confirm relationship (Sister)" button is still shown** even though the lane is already "records complete", because the certificate was declared at the Kendra. The officer can't tell whether it is required. It stays visible **even after approval**.
- The draft again has a `[ …… ]` findings slot. Its legal basis includes "Rule 15(2) … random post-issue sample", which is internal policy, not a ground in an order.
- **Count.** Open 1, scroll 1, Sign 1, tick 1, e-Sign 1 = **4 clicks and 1–2 scrolls**. Add navigation back to the queue (2 clicks and 1–2 scrolls).
- **Time:** about 60–80 s, of which about 25 s is mechanics.
- **Target for a clean file:** 2 actions (Sign, then e-Sign/OTP), no checkbox, and "Next" loads automatically.

### 1.3 SS/2026/KDG/08835 Pooja Sahu: no record, missing caste proof, send back
- **Screenshot.** A "No family certificate found in the archive" card with an illustration and "This is neutral…" text. **The same message repeats** directly below as "Points to look at → No family record found".
- The Action panel shows Send back pre-selected. There is **one** deficiency, pre-ticked: "Attach any ONE caste proof…". Hindi and English draft tabs follow.
- **Missing:**
  - no library of other standard reasons
  - no "what exactly to bring" line
  - no send-back count ("1st / 2nd send-back")
  - no "search again by father's name / maiden village"
  - no "request Patwari / Rule 8 enquiry"
- **Tried Reject.** A mandatory "Your written findings (required)" box appears, with the hint "A missing document is a reason to send back, not to reject." This is good friction.
- **Send back goes through the same "Sign & issue" plus e-Sign modal as an order.** A send-back is a notice, not a DSC-signed order, so the e-Sign step is unnecessary.
- **Count.** 4 clicks and 1 scroll. **Time:** about 40–60 s.
- **Citizen message.** Good, specific, and in plain Hindi. The panel also dumps developer text: `generator: template` and `Checked: Pooja · Sahu · SS/2026/… · Attach · Sarpanch/Parshad · pre-1950 …` (about 40 tokens).

### 1.4 SS/2026/KDG/08841 Kiran Dhruw: sibling's certificate in a different category, refer
- **Screenshot.** "Needs attention" (amber). Persona pill: "A sibling's certificate records a different category… not an accusation." Suggested: Refer.
- **Comparison table order.** Four "✓ MATCH" rows come first: Person (Kiran ↔ Manoj!), Father, Village, Tehsil. The **only row that matters, "Category ≠ DIFFERS" (ST ↔ OBC), is row 5**. The whole table is green-tinted.
- The flag that explains the problem ("Category differs from a brother's certificate…") is at **Y≈2137**. The Sign button is at Y≈1286. **An officer can sign without ever scrolling to the reason.**
- **Tried Approve.**
  - It is enabled immediately, with **no finding required**, even though a conflict flag is open.
  - The client draft (`ActionPanel.tsx templateDraft`) reads *"प्रस्तुत दस्तावेज़ों का परीक्षण किया गया। **[अधिकारी निष्कर्ष दर्ज करें।]** प्रमाण पत्र स्वीकृत किया जाता है।"* ("The submitted documents were examined. [Officer to record findings.] The certificate is approved."). The officer can sign it with the bracketed placeholder still in it.
  - The modal's "Records cited" lists the OBC brother's certificate, as if it supported an ST approval.
- **Refer:**
  - There is **no destination choice**. The draft hard-codes "REFERRED to the District Verification (Scrutiny) Committee".
  - The citizen message is neutral ("sent for routine verification, no action needed, no new fee"). That is good.
  - The applicant is not invited to explain. The plan's "contest this flag" step is missing.
- **Count (refer).** 4 clicks and 1–2 scrolls (without seeing the flag), or 3–4 scrolls to actually read it. **Time:** about 60–90 s.

### 1.5 SS/2026/KDG/08856 Meena Kashyap: father's certificate cancelled (anti-laundering)
- **Screenshot.** The lineage card header reads **"Father · CG/KDG/SDO/2016/002207 · ▣ QR verified · 98% Strong match"**, and all comparison rows are green "✓ MATCH".
- **The single most important fact, "CANCELLED by the Scrutiny Committee 2024", is the 4th of 5 validity cards**, below the fold.
- The flag text says "Decide on the applicant's own evidence (Rule 8 enquiry)". The suggestion and the draft say "Refer … to the District Verification (Scrutiny) Committee". **The two instructions contradict each other.**
- The left checklist shows "✓ Caste proof: School record showing caste". That is useful, but it is not connected to the Rule 8 path.
- **Count.** 4 clicks and 2 scrolls. **Time:** about 60–90 s. The risk is misreading a big green 98% as "good".

### 1.6 SS/2026/KDG/08863 Anil Sori: father's permanent certificate signed by a Tehsildar in 2017
- **Screenshot.** The validity card "! Competent issuing authority" says *"a Tehsildar is not the competent authority. Verify before relying on it."*
- **This overclaims.** The SDO critique (§4) and benchmark #2 say a pre-ruling Tehsildar-issued permanent certificate is a **policy-pending** question, not an established invalidity.
- **The left checklist contradicts the centre.** It shows "✓ Caste proof: Family member's caste certificate" (satisfied) while the lineage card says the same certificate cannot be used.
- Refer again goes only to the Scrutiny Committee.
- **Count.** 4 clicks and 1–2 scrolls. **Time:** about 60–90 s.

### 1.7 SS/2026/KDG/08870 Ramesh Yadav: first-generation, moved within CG, standard review
- **Screenshot.** A "No family certificate found" card, the neutral text, then **the same message again** in "Points to look at". Grouping an absence under "points to look at" subtly frames it as an issue.
- Other records: a ration card issued in Bemetara (info) and "No holding found" (info). These are neutral and fine.
- Suggested: Approve ("complete the normal scrutiny").
- **Draft problems:**
  - It cites **Rule 3(3) (relative's certificate) as the legal basis** even though no relative's certificate is relied upon.
  - It has the `[ …… ]` findings placeholder and a blank date.
  - It lists mock registry rows under "Records relied upon".
- **Count.** 4 clicks and 1 scroll. **Time:** about 60–90 s, because the officer reads the uploaded documents as today. Nothing in the tool speeds that up, which is expected.

### 1.8 Kendra, Collector, Audit (briefly)
- **Kendra.**
  - "Demo: Sunita Markam" fills the form, and "Check family records" returns the father's certificate at **96%**. The same pair shows **98%** in the officer view, because the birth year is missing at the Kendra. The operator sees a different number from the SDO.
  - The checklist says "✓ … verified family record" *before* the officer has confirmed it.
  - The header still shows the "SDO (Revenue)" role badge on the operator screen.
  - The full marketing hero banner repeats on a working screen.
  - Otherwise the flow works: a declared certificate arrives as "records complete", the Rohit pattern.
- **Collector (P0 demo bug).**
  - The KPI reads **"2203% of all applications → 6069% of all rejections"**, and the chart axis runs 0%–6000% with a jumble of unrelated services.
  - The cause: the live backend returns `share_of_volume` as a percentage (22.2), and `pages/Collector.tsx:35–41` multiplies by 100 again.
  - The pilot panel and evaluation panel render fine.
  - Evaluation says **precision 89.4% at the "exact" threshold**. So roughly 1 in 10 "Strong match 98%" links is wrong on the synthetic test set, but the officer screen shows "98% Strong match" with no caveat.
- **Audit.**
  - **Every case open is logged twice** (`case_opened`), because React StrictMode double-fetches. This inflates the access log that DPDP and vigilance read.
  - Action codes are shown raw (`decision_send_back`).
  - Each decision carries "Suggested: X; officer decided: Y". That is the per-officer agreement trail the SDO fears (§4 "Vigilance"). Fine for tool audit, but it should not surface on any officer-level view.

### 1.9 Summary table
| Case | Clicks to decide | Scrolls | Est. time | Main friction |
|---|---|---|---|---|
| 08812 Sunita (confirm + approve) | 5 (+2 nav) | 4–5 (+2–3 nav) | 90–120 s | Confirm button 2.6 screens down; action panel not sticky; persona note; "Person ✓" label; stale confirm; placeholders signed |
| 08790 Rohit (clean) | 4 (+2 nav) | 1–2 (+1–2) | 60–80 s | Ack checkbox on a clean file; stray Confirm button; no Next |
| 08835 Pooja (send back) | 4 (+2 nav) | 1 (+1–2) | 40–60 s | No reason library or loop count; e-Sign modal for a notice; duplicate "no record" |
| 08841 Kiran (refer) | 4 (+2 nav) | 1–2, or 3–4 to read the flag | 60–90 s | Differing row is 5th; flag below Sign; approve needs no finding; no refer destination |
| 08856 Meena (refer) | 4 (+2 nav) | 2 | 60–90 s | "Cancelled" hidden under a green 98% header; Rule 8 vs Scrutiny contradiction |
| 08863 Anil (refer) | 4 (+2 nav) | 1–2 | 60–90 s | Overclaims "not competent"; checklist ✓ vs card ✖ |
| 08870 Ramesh (standard) | 4 (+2 nav) | 1 | 60–90 s | Irrelevant Rule 3(3) citation; placeholders; duplicate "no record" |

**Throughput math.**
- Mechanics (clicks, scrolls, hunting for the next row) come to about **15–25 s per file**. At 150 files that is **40–60 minutes a day of pure navigation**.
- The minimum for a clean file should be **2 actions and about 5 s of mechanics**.
- **Keyboard: none.** Only Enter on a queue row works.

---

## 2. What already works for the officer (keep)
1. **Side-by-side application ↔ archived certificate table** with both scripts (रामलाल मरकाम ↔ Ram Lal Markaam) and the LGD code. It needs reordering, not replacing.
2. **Validity checks exist and are correct in substance:** permanent, competent authority, not cancelled, QR, category. Anti-laundering works: cancelled or Tehsildar certificates are never "usable_as_evidence".
3. **"Confirm relationship" is the officer's act.** The backend lane only moves to records complete after it (`engine.py:182`), and declared plus exact certificates skip it. This is the right split.
4. **Reject needs written findings** (the UI blocks it and the API returns 422), and there is the hint "A missing document is a reason to send back, not to reject."
5. **Neutral no-match wording** ("This is neutral. Many genuine applicants are the first in their family…"), shown for Pooja and Ramesh.
6. **Send-back deficiency is specific and curable,** with "no new fee" in the citizen message.
7. **The citizen WhatsApp preview** is in plain Hindi, has a "✓ checked" entity check, and uses neutral wording on refer.
8. **Draft order cites certificate number, issuing authority, date, status and rule.** It uses no case law and has Hindi and English tabs. It is editable, with a ↺ to restore.
9. **"Differs from suggestion" chip in the sign modal.** It is honest, but see the P2 note on how it is logged.
10. **Collector view has no officer ranking,** only district and tehsil level; there is an exclusion guard and an honest evaluation panel.
11. **"MOCK · Phase 2 sources" labelling** on Bhuiyan and Khadya rows is honest.

---

## 3. Issues ranked by officer impact

### P0: liability, correctness or trust (fix before the demo)

**P0-1. The UI can claim "Relationship confirmed by you" when the backend has no confirmation.**
- **Evidence:** 08812 on first load, after the backend reset: the green "confirmed by you" badge showed while the lane was "Standard review".
- **Cause:** `pages/CaseView.tsx` `loadSet(ps_confirmed_*)` in sessionStorage.
- **Why it matters:** the screen asserts an officer act that the audit log doesn't have. That is a liability and a trust bug, and it also derails the live demo if anyone resets from a terminal.
- **Fix:**
  - Add `confirmed_cert_nos: string[]` to `Analysis`, built from `STATE.confirmed` in `engine.analyse` or `api.py`. Add it to CONTRACT.md.
  - `CaseView` derives `confirmed` from `data.analysis.confirmed_cert_nos` and deletes the sessionStorage code.
- **Accept:** `curl POST /api/reset`, then reload 08812. The Confirm button is shown and no "confirmed by you" badge appears.

**P0-2. Orders can be signed with unfilled placeholders, and approval over an open conflict needs no finding.**
- **Evidence:**
  - 08812, 08790 and 08870 server drafts contain `[ ........ ]` and `Date: ____` (`backend/templates/order_approve.*.j2`).
  - 08841 approve (client template) contains `[अधिकारी निष्कर्ष दर्ज करें।]` ("[Officer to record findings.]") and is signable.
  - `ActionPanel.tsx` `canSign` only checks findings for `reject`.
- **Why it matters:** an order that reads "on the basis of … my findings" with an empty slot is precisely the "mechanical order" writ exposure (SDO critique §4). Approving an ST claim over a sibling's OBC certificate with no recorded reason is the first exhibit in a vigilance inquiry.
- **Fix:**
  - (a) `canSign` is false while the order text still matches `/\[\s*\.{3,}|\[अधिकारी|\[Officer|_{4,}/`, and the button then says "Fill your finding" with a scroll-to.
  - (b) Fill the date automatically at signing, both server-side and in the modal.
  - (c) **Records complete + approve:** the template writes a record-backed finding line instead of a blank, e.g. "Relationship with certificate No. … confirmed by the undersigned on <date>; certificate permanent, SDO-issued, active, QR verified." There is no free-text box, per the SDO: "for an approval, the certificate is the order".
  - (d) Approve when there is any `attention` flag, an unconfirmed found match, or `action ≠ suggested_action`: show a mandatory "Your finding (green note, locked on signing)" textarea, the same component as reject.
- **Accept:**
  - The Sign button is disabled on 08841 → Approve until the finding is typed.
  - On 08790 → Approve it is enabled with no textbox, and the signed text contains no `[`, `…` or `____`.

**P0-3. Sign/Approve is live before "Confirm relationship" on a found (not declared) match.**
- **Evidence:** 08812, where Sign is enabled while the draft says "subject to the officer's confirmation".
- **Why it matters:** the officer can approve on an unconfirmed machine link in 4 clicks, which is automation bias by default.
- **Fix:** in `ActionPanel`, if `action === "approve"` and the lane is `standard_review` with an unconfirmed usable match, the Sign button reads **"Confirm relationship first (C)"** and triggers the confirm call inline. There is no second trip down the page. Alternatively, fall through to the P0-2(d) mandatory finding when the officer approves on other evidence.
- **Accept:** on 08812 the first primary button in the Action panel is "Confirm relationship (Father)". After it, the button becomes "Sign & issue: Approve".

**P0-4. Demo-only text is leaking into the officer UI.**
- **Evidence:**
  - `persona_note` pill in the case header: **"Hero case: …"** on 08812, and story notes on all 7 demo cases (`CaseView.tsx:89–93`)
  - the "Sewa Setu Innovation Hackathon · PS1" strip and "live model" chip (`Layout.tsx:68,81`)
  - `Model lineage-fs-splink-2026-09-27 · rules rules-2026-09-27` under the Sign button
  - `generator: template` and the ~40-token `Checked: …` dump in the decision panel
  - `log₂ odds 5.9 → 1/(1+2^−5.9)` in the waterfall
- **Why it matters:**
  - A judge who sees "Hero case:" on the officer screen reads the demo as staged.
  - Every one of these lines costs reading time and earns nothing for the decision.
- **Fix:**
  - Render `persona_note` only when `?presenter=1` or a presenter toggle in the ⋯ menu is on.
  - Move model/rules version, generator and the checked-entities list into a collapsed "Technical details" `<details>`. Keep the "✓ checked" badge.
  - Replace the log-odds formula line with "Model link strength: strong (98%)".
  - The hackathon strip can stay on the landing page only.
- **Accept:** `get_page_text` on any `/officer/case/*` contains neither "Hero case" nor "log₂" nor "generator:".

**P0-5. The most important validity failure is buried under a green "98% Strong match".**
- **Evidence:** on 08856 the "CANCELLED" status is the 4th validity card (below the fold). On 08863 the "Tehsildar" status is the 2nd card. The header shows QR verified and 98%.
- **Why it matters:** this is where an officer approves a laundered certificate during a surge.
- **Fix:** see top-8 #3, the validity strip whose failure text *is* the card title.
- **Accept:** on 08856 the text "Cancelled by the Scrutiny Committee, 2024: not usable as evidence" appears within the first 200 px of the lineage card, and the "98%" badge is grey or secondary.

**P0-6. Collector KPI shows "2203% → 6069%" and a broken chart.**
- **Evidence:** `/collector` on the live backend.
- **Why it matters:** this is not the officer lens, but it destroys credibility in the "real MIS" minute of the demo.
- **Fix:**
  - In `pages/Collector.tsx:35–41`, treat `share_of_*` as already a percentage (drop `*100`), or better, use `mis.caste_combined.share_of_volume / share_of_rejections` directly.
  - Filter the chart to caste plus the top 8 services by volume.
- **Accept:** the KPI reads "22.2% → 61.9%".

### P1: time and decision quality
| # | Problem | Evidence | Why it matters | Concrete fix and acceptance |
|---|---|---|---|---|
| P1-1 | Action panel not sticky; Sign ↔ evidence ↔ Confirm needs 3–5 scrolls | `styles.css:214–223` has no `position: sticky`; right column blank after scrolling (08812) | About 10 s per file | `.case-right{position:sticky;top:84px;max-height:calc(100vh - 96px);overflow:auto}` above 1020 px. **Accept:** at Y=2000 on 08812 the Sign button is visible. |
| P1-2 | Evidence after the recommendation | "SUGGESTED ✓ Approve / Likely approvable" is the first thing in the right column before any evidence (all cases) | Buçinca/Goddard automation bias, benchmark #15 | Collapse to one line "Records suggest: Approve ▸" placed **below** a 3-line evidence summary; no preselected Approve on `possible` or unconfirmed matches. **Accept:** on 08812 the Approve tile is not pre-selected until Confirm. |
| P1-3 | Comparison rows: wrong "Person ✓ MATCH" label; differing rows last; no caste-name row; no variant marker; full green tint | `LineageCard.tsx` rows[]; 08841 ≠ row is 5th | The officer reads a score, not facts | Top-8 #2 |
| P1-4 | Flags ("Points to look at") are below the 640 px waterfall and graph | 08841 flag Y≈2137 vs Sign Y≈1286 | Reason never seen before signing | Move the flags section to the **top** of `case-center`, above `LineageCard`. **Accept:** 08841 flag top < 700 px. |
| P1-5 | Waterfall and family graph are always expanded (~900 px) and identical across the demo | All matches +6.8/+5.3/+6.3/+1.3 | Scroll cost, zero information | One `<details>` "Why the records were linked" closed for `exact`, open for `possible`; negative bars first (benchmark #12). |
| P1-6 | No "Next case", no keyboard, queue position lost | No `keydown` handlers (grep); after a decision the officer must scroll up, click "← Queue", scroll, find the row | About 8–10 s × 150 files ≈ 20–25 min a day | Top-8 #6 |
| P1-7 | Queue not sorted by evidence; no reason text; verdict colours; "Standard review + Approve + 98%" contradiction | `api.py:154`; `Queue.tsx` | Officer can't batch the clean files first (SDO §2f) | Top-8 #7 |
| P1-8 | Clean-file approve still needs the ack checkbox (4 clicks) | Sign modal checkbox on 08790 | Click-through theatre (SDO §3) | Top-8 #5 |
| P1-9 | Send-back: no reason library, no "what to bring", no loop count; goes through the e-Sign order modal | 08835 | Retyping the same Hindi line is the SDO's #1 time-waster (§2d); loops invisible (§3) | Top-8 #8 |
| P1-10 | Refer has no destination; draft hard-codes the Scrutiny Committee while the flag text says Rule 8 enquiry | 08856, 08841, 08863 | Wrong forum means delay and an appeal ground | Add a destination select in `ActionPanel` (refer): "Patwari / Rule 8 field enquiry" (default for cancelled-parent and category-differs), "District Verification (Scrutiny) Committee", "Seek applicant's explanation". Pass `refer_to` to `/decision`; `order_refer.*.j2` renders it. **Accept:** 08856 default = Rule 8 enquiry, and the draft says so. |
| P1-11 | Tehsildar-issued pre-2026 permanent certificate shown as "not competent ✖" | 08863 validity card | Overclaims a legal question the department hasn't settled (SDO §4) | In `rules.py`/`engine.py`, for `authority_role=="Tehsildar"` and `issue_date < 2026-07-22` set the label "Tehsildar-issued permanent (before HC 22-07-2026): department policy pending, verify"; severity attention, not a fail. **Accept:** 08863 card text contains "policy pending". |
| P1-12 | Left checklist contradicts the centre card (✓ caste proof satisfied by an unusable or unconfirmed certificate) | 08863 "✓ Family member's caste certificate"; 08812 "pending your confirmation … not uploaded" | Two answers on one screen | Checklist `satisfied_by` only when a match is usable **and** accepted; otherwise "– awaiting your confirmation" or "! certificate not usable (see card)". |
| P1-13 | Sign-modal "Records cited" lists every match, including cancelled, OBC-sibling and unconfirmed ones | `ActionPanel.tsx` modal: `lineage_matches.map(cert_no)` | A signed approval "citing" a cancelled certificate | Cite only `usable_as_evidence && accepted` certificates; list others as "Seen, not relied on". |
| P1-14 | Draft cites Rule 3(3) when no relative's certificate is relied on, cites Rule 15(2) internal sampling, and lists mock rows as "Records relied upon" | 08870, 08790 drafts | Weak or irrelevant grounds in a legal order | `engine.py` legal_basis: add r.3(3) only if a certificate is accepted; move r.15(2) to the UI note, not the order; mock rows go under "Other records seen (not relied upon)". |
| P1-15 | Duplicate "No family record found" (card and info flag) on no-match cases | 08835, 08870 | Noise, and it frames absence as a "point to look at" | Drop the `info` flag when `lineage_matches` is empty. Add to the empty card: "Proceed under Rule 8: school record / Gram Sabha / Patwari enquiry" plus the buttons "Search by father's name / maiden village" (benchmark #6/#8, can be a stub). |
| P1-16 | Stray "Confirm relationship" on declared, already-accepted certificates (08790, 08863), still shown after the decision | `LineageCard.tsx` bottom row | "Do I need to click this?" | If `declared_relative_cert_no === cert_no` and usable, show the chip "✓ Declared at Kendra & matched: no confirmation needed"; hide all actions when `decided`. |

### P2: polish
- **Case header is too tall.** About 250 px of header plus a 60 px lane-reason box pushes the evidence to Y≈640. Merge into one 90 px band: name · service · SLA · lane (text).
- **Validity cards take 290 px.** They collapse into the one-line strip in Top-8 #3.
- **Double `case_opened` audit entries** (StrictMode). Fix by deduping in `api.py` get_application (same role + app within 2 s) or by guarding the effect.
- **Audit action codes are raw.** Humanise them: `decision_send_back` becomes "Sent back".
- **Audit and vigilance.** Keep "Suggested vs decided" for tool evaluation only, never on a per-officer view. Add a footer to the Audit page: "Used to audit the tool, not to rank officers" (SDO §6.3).
- **Kendra:** remove the hero banner. The role badge should follow the page (Kendra operator). Replace "verified family record" with "found, officer will confirm". The 96% vs 98% difference comes from the missing birth year; show "strong" rather than the number.
- **"98% Strong match" vs evaluation precision 89.4% at the exact threshold.** Label it "link strength" and add a one-line caveat under the badge: "Model link, confirm from the records".
- **Sign-modal checkbox** is visually on its own line above its text. Align them.
- **SLA in the queue** ("26 d") differs by one day from the case header in some rows. Pick one date maths.
- **Mobile at 375 px was not tested** in this round (benchmark #20 / K-SMART lesson). Test it in round 2.

---

## 4. TOP 8 changes for this round (about 3 h of coding total)
Ordered by officer impact ÷ effort. Each one names the files, the change and the acceptance test.

### #1 Truthful state and no demo leakage (P0-1, P0-4) · ~20 min
- **Backend:**
  - `api.py` `get_application` / `confirm_relationship` return `analysis.confirmed_cert_nos` (from `STATE.confirmed`).
  - Add it to `CONTRACT.md` and `api/types.ts`.
- **Frontend:**
  - `CaseView.tsx` drops the sessionStorage `confirmed` and reads it from the analysis.
  - `persona_note` renders only in presenter mode (`?presenter=1`, persisted in localStorage wrapped in try/catch).
  - `ActionPanel.tsx` and `WhatsAppPreview.tsx` move the model/rules version, `generator` and the `Checked:` token list into `<details>Technical details</details>`.
  - `Waterfall.tsx` removes the `log₂ odds … =` line.
- **Accept:**
  - After `curl /api/reset`, 08812 shows the Confirm button and no "confirmed by you".
  - The officer case page text contains none of "Hero case", "log₂", "generator:".

### #2 Disagreements-first field comparison (benchmark #1, score 100; P1-3) · ~35 min
- **File:** `components/LineageCard.tsx`.
- **Row 1** becomes **"Relative on certificate"**: the holder, relation, birth year, with **no ✓/MATCH tag**. It is context, not a comparison.
- **Compared rows:**
  - Father's name ↔ holder, for a parent (or ↔ the certificate's father, for a sibling)
  - Surname/clan
  - Village LGD
  - Tehsil · District
  - **Category + caste name** (ST · Gond ↔ ST · Gond; for 08841 show *category only*: ST ↔ OBC, per stage rules)
  - Birth-year gap ("32 yrs: plausible for a father")
- **State per row:** `agree` / `variant` / `differs`.
  - Use `variant` when the weight > 0 but the strings differ after trim/case, e.g. "Ramlal Markam ↔ Ram Lal Markaam: spelling variant".
  - Take the text from `weights[].comparison`.
- **Sort:** differs → variant → agree.
- **Styling:** agree rows neutral (no green fill); variant grey "≈"; differs amber "≠".
- **Accept:**
  - On 08841 the first compared row is "Category ≠ ST ↔ OBC".
  - On 08812 the father row shows "≈ spelling variant".
  - No row reads "Person ✓ MATCH".

### #3 One-line validity strip with failure-as-headline (benchmark #2, score 100; P0-5, P1-11, P1-12, P1-16) · ~25 min
- **File:** `LineageCard.tsx`, directly under the card title. It replaces the 5-card grid, which moves into `<details>`.
- The strip is one line: `No. CG/KDG/SDO/2019/004512 · QR ✔ · Permanent · Active · Issued by SDO (Revenue), Kondagaon · 14-03-2019`.
- **If any check fails,** the card **title** becomes the failure, e.g. "⚠ Cancelled by Scrutiny Committee, 2024: cannot be used as evidence". The probability badge turns grey.
- **Tehsildar before 22-07-2026** gets the "department policy pending" text (edit `engine.py`/`rules.py` validity label).
- **Declared + usable** gets the chip "Declared at Kendra & matched: no confirmation needed" instead of the Confirm button.
- **Checklist:** `satisfied_by` only for accepted certificates (`engine.py` checklist builder).
- **Accept:**
  - On 08856 "Cancelled" is visible without scrolling at 1366×768.
  - On 08863 the text reads "policy pending", not "not competent".
  - On 08790 there is no Confirm button.
  - On 08863 the checklist caste-proof row is not ✓.

### #4 Evidence before recommendation, and a layout that fits the flow (benchmark #15; P1-1, P1-2, P1-4, P1-5, P0-3) · ~30 min
- **`styles.css`:** make `.case-right` sticky, as in P1-1.
- **`CaseView.tsx`:** order the centre column as flags → LineageCard → Other records.
- **`LineageCard.tsx`:**
  - Waterfall and family graph go into one `<details>` "Why these records were linked", open only when `match_level==='possible'`.
  - Show the **Confirm relationship** button and the ration-roster "applicant listed as member" line **directly under the comparison table**.
- **`ActionPanel.tsx`:**
  - The suggestion becomes a single muted line "Records suggest: Approve" under the action tiles.
  - No tile is pre-selected when there is an attention flag or an unconfirmed found match.
  - When the lane is standard_review with an unconfirmed usable match, the primary button is "Confirm relationship first".
- **Accept:** on 08812 at 1366×768 the officer can confirm and sign with **≤1 scroll**, and the flags on 08841 appear above the comparison table.

### #5 Friction asymmetry: zero extra clicks on clean files, a finding only on reject or override (benchmark #4, score 100; P0-2, P1-8, P1-13, P1-14) · ~30 min
- **`ActionPanel.tsx` sign modal:**
  - Remove the ack checkbox when `lane==='records_complete' && action===suggested && action==='approve'`, so the modal is a single "e-Sign" button (**Enter** confirms).
  - Show a **mandatory "Your finding (green note, locked on signing)"** textarea (reusing the reject box) when:
    - the action is reject
    - approve with any `attention` flag
    - approve with an unconfirmed or unusable match
    - the action differs from the suggestion
  - Block signing while placeholders remain (regex in P0-2).
  - "Records cited" lists only accepted certificates.
- **Backend `templates/order_approve.*.j2` / `engine.py`:**
  - Replace the blank findings slot with the record-backed finding line for accepted certificates.
  - Fill the date at decision time (`api.py /decision`).
  - Add r.3(3) only when a certificate is relied on.
  - Drop r.15(2) from the order.
  - List mock rows as "seen, not relied upon".
- **Accept:**
  - 08790 goes Sign → e-Sign in **2 clicks**.
  - 08841 Approve is disabled until the finding is typed.
  - The signed order text contains no `[`, `……` or `____`.
  - 08870's order has no Rule 3(3).

### #6 Keyboard-first "Save & next" (benchmark #14 and part of #9) · ~25 min
- **`CaseView.tsx`/`ActionPanel.tsx`:**
  - After a decision, show a big **"Next case → (J)"** button in the decision panel. It navigates to the next *pending* item in queue order (fetch `api.queue(role)` once and keep the order in context or sessionStorage).
  - The WhatsApp preview goes below it, collapsed to 3 lines.
- **Global keydown on the case page:**
  - `J`/`K` next/previous
  - `C` confirm the relationship
  - `A`/`S`/`R`/`X` select approve / send back / refer / reject (select only)
  - `Ctrl+Enter` opens the sign modal; `Enter` confirms
  - `?` shows a cheat-sheet
  - All keys are ignored while focus is in a textarea.
- **`Queue.tsx`:** restore the scroll position and focus the last-opened row.
- **Accept:** decide 08790 then 08743 using only the keyboard, with no mouse and no scroll.

### #7 Queue sorted by evidence state, with text reasons instead of colours (benchmark #5; P1-7) · ~25 min
- **Backend `api.py /queue`:**
  - Add `evidence_summary: I18n` per item, e.g.:
    - "Sister's certificate declared & matched (No. …)"
    - "Father's certificate found: confirm relationship"
    - "No archive record: standard review"
    - "Father's certificate cancelled"
    - "Category differs in sibling's certificate"
  - Add `evidence_rank`.
- **Sort pending items by:**
  - (a) **SLA ≤ 3 days first,** whatever the lane. The no-match lane must never be starved (DWP lesson).
  - (b) Then accepted exact, found-awaiting-confirmation, standard review, needs attention.
  - (c) Then SLA.
- **`Queue.tsx`:**
  - Replace the "Top match %" and "Purpose" columns with the reason text.
  - Lane chips in neutral colours (grey/blue outline, no green/amber fill).
  - Rename "Suggested action" to "Records suggest".
  - Add a "Due ≤ 3 days" filter chip.
- **Accept:**
  - The first rows are Rohit, Radha and similar (declared and complete), and Sunita is in the top 10 with "confirm relationship".
  - No row shows "Standard review" next to a bare "98%".
  - No green or amber row chips.

### #8 Send-back reason library with loop count, sent as a notice not an order (benchmark #3, score 100; P1-9, P1-10) · ~25 min
- **Frontend constant or backend `rules.py`:** about 10 standard reasons. Each has Hindi and English text plus a **"what exactly to bring"** line, for example:
  - pre-1950 revenue record or Patwari-certified vanshavali
  - school admission register extract showing caste
  - Sarpanch/Gram Sabha certificate
  - father's or sibling's certificate number
  - affidavit not in Form 2A
  - illegible scan: re-upload
  - father's name differs across documents
  - address proof for the maiden village
- The engine's suggested deficiencies come pre-ticked.
- **Loop count:**
  - Show the pill "1st send-back" or "⚠ 2nd send-back: consider Rule 8 enquiry instead", from a new `Application.sendback_count` (default 0; set 1 on one fixture so the demo shows it).
  - Always show "No new fee · same application number".
- **Send-back submits with one confirm ("Send to applicant"),** not the e-Sign order modal.
- **Also add the refer destination select** (P1-10). It is the same component area and about 5 minutes more.
- **Accept:**
  - 08835 shows the library with 1 pre-ticked reason plus "1st send-back".
  - Ticking a second reason updates the Hindi draft and the WhatsApp preview.
  - The send-back completes in 2 clicks.
  - 08856 refer defaults to "Rule 8 field enquiry".

**Outside the top 8, but 5-minute must-fixes before stage:**
- the Collector percentage bug (P0-6)
- the duplicate `case_opened` audit entries

**Expected result after the round:**
- A clean file (Rohit type) goes from about **4 clicks and 3–4 scrolls to 2 keystrokes** (Ctrl+Enter, Enter) plus J for next.
- The hero confirm case goes from about **5 clicks and 5 scrolls to 3 actions and ≤1 scroll** (C, Ctrl+Enter, Enter).
- Friction lands only on reject, override and the open-conflict approve.
- At 150 files that saves roughly **30–45 min a day of navigation**, and it removes three ways to sign an order the officer never meant to sign: unconfirmed link, open conflict, blank findings.
