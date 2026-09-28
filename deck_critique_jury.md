# Jury critique of the Praman Setu (प्रमाण सेतु) deck, PS1
Sewa Setu Innovation Hackathon, CHiPS with IIIT Naya Raipur, 28-09-2026. This is pitch 14 of 20 for the jury.

**What was reviewed:** all 16 rendered slides, one by one (cover, sunita, credit, where, desk, insight, panel, evidence, citizen, day, impact, safe, build, ask, limits, model); the slide HTML and speaker notes; `research/critique_3_jury.md`; `FINAL_ASSESSMENT.md`; `IMPACT_ANALYSIS.md`; `research/06` and `research/07`; the PS1 rubric in the proposal PDF; and the two new real MIS screenshots (`shots/extra/mis_top.png`, `mis_table.png`).

**This critique covers the deck only**, not the app.

---

## 0. Jury-room verdict (said at 4:40 pm, after 13 other teams)

> **CHiPS head:** "Finally, someone who read our MIS instead of building another WhatsApp bot. They credited us before they criticised us. I'll remember the father's name spelt two ways."
>
> **ex-NIC architect:** "It is a sensible sidecar. But the architecture slide is five boxes with a bug in it, and search access is buried. I still don't know how they query the archive by name."
>
> **IIIT faculty:** "It's the only team that showed precision *and* recall, sliced, with its own weakness. But 0.89 on data they generated themselves is the question I'll ask."
>
> **GovTech expert:** "The story is strong, but the deck has no comparison with what other states do, no cost on screen and no scale path. And it looks like a very tasteful template: every slide has the same orange label and the same serif title."

**Score as the deck stands: about 72/100.** That is top-5, not a sure winner.
**Score after the top-10 fixes: about 86/100.**

The deck is already better than most. What it loses, it loses on four things:
- **Missing rubric items.** There is no comparison and no real roadmap, cost or scale slide.
- **Internal number inconsistencies** that a tired judge will still notice.
- **A few tone and legal risks** in front of CHiPS.
- **A uniform, template-like look** that blends in at pitch 14.

---

## 1. Per-slide critique

**Legend:** ✔ works · ✖ fails · → the fix · **[KEEP / CUT / MERGE / ADD]**

### 1. Cover: "प्रमाण सेतु / the family's proof, on the officer's desk" [KEEP, REDESIGN]
- ✔ **Works:**
  - The Devanagari wordmark is beautiful and local.
  - "The officer decides" arrives in the first 10 seconds, which the CHiPS head wants to hear.
- ✖ **Fails:**
  - **"[Team name] · [Member 1]…" placeholders are still on the slide.** That is fatal if it ships.
  - The subtitle is a 30-word sentence. At pitch 14, nobody reads it.
  - The eyebrow line (hackathon · PS1 · AI and Automation) is the same one all 20 teams have.
  - There is no hook: nothing on this slide exists only for this team.
- **→ Fix: make the cover the hook.**
  - Put Sunita's father's name, spelt two ways, large on screen, stacked:
    - `रामलाल मरकाम · Ramlal Markam`
    - `Ram Lal Markaam · CG/KDG/SDO/2019/004512`
  - Under it, one line: **"एक ही व्यक्ति। प्रमाण पत्र सेवा सेतु में है। अधिकारी उसे खोज नहीं सकते।"** ("Same man. The certificate is in Sewa Setu. The officer can't find it.")
  - Keep प्रमाण सेतु smaller at top left, and put real team names at the bottom.
  - Delete the long subtitle. The spoken line carries it.

### 2. Sunita: "Sunita needs an ST certificate before her scholarship deadline" [KEEP]
- ✔ **Works:**
  - A person before a statistic, which is exactly what the earlier jury asked for.
  - The timeline card is clear.
  - "Illustrative case on synthetic data" is disclosed.
  - "Likely outcome: rejected, pays again, may miss the deadline" is real human cost.
- ✖ **Fails:**
  - The title is long and generic ("X needs Y before Z").
  - The left column repeats the right column.
  - The footnote leans on "the Chhattisgarh High Court ruled on in July 2026", and your own speaker note says *"Check the HC case name and date before quoting it aloud."* **An unverified court citation in front of a government panel is the single biggest credibility risk in the deck.**
  - The bottom third of the slide is empty.
- **→ Fix:**
  - Retitle: **"Her father's certificate is in Sewa Setu. Hers will probably be rejected."**
  - Cut the left paragraph down to two lines: "Sunita Markam, 18, Bayanar (Kondagaon). No 1950 land paper." Let the timeline carry the rest.
  - Either put the verified case number in the footnote (e.g., "WPC ___/2026, order dt. __-07-2026") or drop the court from this slide and keep it only on slide 6.

### 3. Credit: "Sewa Setu has already solved speed" [KEEP, REBUILD WITH THE REAL MIS SCREENSHOT]
- ✔ **Works:**
  - Crediting the platform in the first minute is the smartest tone decision in the deck. The CHiPS head will relax.
- ✖ **Fails:**
  - It is the same "three big numbers with rules above" layout that appears again on the impact slide and the ask slide. That is an AI-template tell.
  - Numbers typed onto a beige background prove nothing.
  - "What remains open is… whether the reasons would hold up on appeal" quietly says that officers' orders are weak. Soften it.
  - The bottom 40% is empty.
- **→ Fix: use `mis_top.png` here, cropped.**
  - **Crop out the CM photo and the red social bar.** A CM photo in a hackathon deck reads as political.
  - Keep the Sewa Setu logo strip, the stats row (38 departments, 907 services, 16,611 centres, 53,85,535 applications) and the donut legend: **"Approved 48,63,282 · Rejected 3,64,124"**.
  - Hand-circle two things:
    - "53,85,535", captioned "on time: 95.7%"
    - "Rejected 3,64,124", captioned *"where do these come from? →"*
  - The circle then leads straight into slide 4.
  - Retitle: **"Sewa Setu delivers on time. We looked at the 3.6 lakh 'no's."**
  - Stamp: "Screenshot, cgstate.gov.in/sewasetu, 27-09-2026".

### 4. Where rejections come from: "Caste certificates: 22% of applications, 61% of rejections" [KEEP; STRONGEST SLIDE]
- ✔ **Works:**
  - This is the "only this team" slide: an original analysis of the platform's own data, with a title that is a finding.
  - The paired bars (share of applications vs share of rejections) are an honest design.
- ✖ **Fails:**
  - **"Under the same rules, district rejection rates range from 2.3% to 13.2%"** will make the CHiPS head defensive, because Collectors are their partners. It also invites "maybe the low districts are lax".
  - The right-hand "% rejected" column competes with the bars, which gives two encodings of one idea.
  - It looks like a well-made chart library. Nothing shows *you* pulled this.
- **→ Fix:**
  - Keep the four bars and move "% rejected" into the bar labels.
  - Add a small inset of `mis_table.png`: the district table with its **Grand Total row (3,64,124 rejected)** visible and a pen mark. Caption: "We downloaded the service-wise and district-wise tables on 27 Sept and added them up ourselves."
  - Rephrase the district line: **"The same certificate, the same rules: rejection rates vary 6× between districts. That is a sign the evidence isn't reaching the desk, not that officers differ."**
  - Do not name districts on the slide.
  - Optional: a **neutral single-hue Chhattisgarh district map** (no red, no "worst" label) in place of the sentence. It is an authentic, local visual that no other team will have.

### 5. The officer's side: "What the SDO works with today" [KEEP, ADD A REAL IMAGE]
- ✔ **Works:**
  - "A checklist tab that is empty" is a memorable, specific, *found* fact.
  - "Ranked on speed alone" shows you understand officers.
  - The ~5 min vs 2.5–4 min box is honestly labelled "our model".
- ✖ **Fails:**
  - It is six plain bullets in the same weight, so it reads like a list an AI would write.
  - There is no image of the actual console, though you watched the public walkthrough.
  - "Ranked on speed alone" may annoy CHiPS, because they designed the ranking formula.
- **→ Fix:**
  - Use a frame grab from the public officer-console walkthrough, cropped to the tabs row, with a hand-drawn circle on **"जांच सूची" (the empty checklist tab)** and the note *"empty. This is where we sit."*
    - If you can't use the frame (licence or quality), keep your recreation but label it "our redraw".
  - Cut the bullets to 4, and make "Checklist tab: empty" the visual hero.
  - Rephrase the ranking bullet: **"The ranking counts every decision the same, approve or reject"**. That is factual, not accusatory.
  - The dark box line "So documents get skimmed" is good. Keep it.

### 6. Insight: "The proof is often already in Sewa Setu" [KEEP; THIS IS YOUR TAGLINE]
- ✔ **Works:**
  - It is the thesis of the whole deck.
  - The law allows it and the court expects it: governance grounding that no chatbot team will have.
  - The last line, "Every certificate Sewa Setu issues makes the next family member's application easier to decide", is the most memorable sentence in the deck: a compounding archive.
- ✖ **Fails:**
  - **The legal citations are unverified** (see slide 2). The official Act title is not quoted exactly either. Check that the rule is in the Chhattisgarh Social Status Certification (Regulation) Act/Rules 2013 and that "Rule 3(3)" is the right number.
  - The slide has no page number (the numbering skips).
  - The two-column "THE LAW ALLOWS IT / THE COURT EXPECTS IT" block is a symmetrical AI-style pair.
  - The best line is small and grey at the bottom.
- **→ Fix:**
  - Promote the compounding line to the title position.
  - Retitle: **"प्रमाण पहले से सेवा सेतु में है।" / "The proof is already in Sewa Setu."** Say it here and on the last slide.
  - Put the rule and the court order in one line each, with a *pinpoint* citation.
  - If the HC order is not verified by 9:30 am, replace the right column with the rule text only, and say "a recent High Court order" aloud, with no date.

### 7. What we built: "Praman Setu fills the empty checklist tab" [KEEP, FIX CONSISTENCY]
- ✔ **Works:**
  - The title pays off slide 5. Good narrative craft.
  - A real prototype screenshot, with "Our prototype… Citizen data synthetic" disclosed.
  - "The officer confirms and signs. The tool decides nothing."
- ✖ **Fails:**
  - **The screenshot is Rohit Netam (08790) with a sister's certificate. Every other slide is about Sunita.** The judge thinks "wait, who?"
  - At projector distance the screenshot is unreadable. The green panel is 12 px Hindi.
  - The top-left **emblem-like logo on a mock "सेवा सेतु" console** is a risk (see §3).
  - "QR verified" is an overclaim, because the QR check is simulated.
  - "The tool decides nothing" slightly contradicts "drafts the order". Say instead "drafts, the officer edits and signs".
- **→ Fix:**
  - Re-shoot on **Sunita's file**, SS/2026/KDG/08812.
  - Zoom into the right half, with the console chrome visible but dimmed.
  - Add three numbered callouts drawn *on* the screenshot (①② ③) that match the three bullets.
  - Change the text to "QR check (simulated in prototype)".
  - Replace the logo with a neutral monogram.

### 8. Sunita's file: "The officer sees the evidence before any suggestion" [KEEP; THE AI SLIDE]
- ✔ **Works:**
  - The best visual in the deck. The yellow highlight on "Ram|Lal Marka|a|m" shows the AI problem without a single jargon word.
  - "Its limit is shown" builds trust.
  - The Fellegi–Sunter/Splink footnote satisfies the IIIT juror.
- ✖ **Fails:**
  - "Recall is lower for **married women** (0.33)" does not match the backup slide, which says "**Women applicants** 0.33". IIIT will catch it.
  - "Precision 0.89" is given without its consequence. Say it before they do: **1 in 10 strong links is wrong on test data**.
  - It doesn't say the data is *self-generated* synthetic, which is the circularity question.
  - The screenshot is still dense. Four columns of Hindi text.
- **→ Fix:**
  - Rewrite the right column as three bold-led lines, but vary the rhythm:
    - **"Same man, two spellings, two scripts."** The matcher links them; the officer confirms with a reason.
    - **"About 1 in 10 'strong' links was wrong in our test"** (0.89 precision, synthetic families we generated). So a human confirms every link. Pilot gate: 98% on 300 real, officer-labelled files.
    - **"Weakest for women (recall 0.33)"**, because married women's records sit in another village. So "no match" never counts against anyone. The maiden-village search is next.
  - Add one line of performance: "LGD blocking keeps 98.2% of true links; 3.9 lakh pairs scored in 3.7 s on a CPU."

### 9. The citizen's side: "What Sunita receives" [KEEP, SHORTEN, ADD KENDRA PRE-CHECK]
- ✔ **Works:**
  - Plain-Hindi message, the record used named, "no new fee", "सुनवाई का अवसर".
  - This is where the rubric's "citizen" marks come from.
- ✖ **Fails:**
  - **A WhatsApp phone mockup is exactly what 10 of the other 19 teams will show.** It makes you blend in.
  - The mock header says **"Sewa Setu · आधिकारिक खाता (डेमो)" with an emblem**. It impersonates an official account (see §3).
  - The **Kendra pre-check**, your genuinely citizen-side feature, is missing. It finds the father's certificate *before the fee is paid*, where camp caste rejections run at **41%**.
  - The eyebrow and title are on the right while the image is on the left. That is fine, but it is the only such layout, so it feels like a variant of the template rather than a choice.
- **→ Fix:**
  - Retitle: **"Sunita finds out at the Kendra, not after a rejection."**
  - Left: a small operator-screen crop, "परिवार प्रमाण पत्र मिला: संलग्न करें" ("family certificate found: attach it").
  - Right: a *smaller* message card with no phone frame and no emblem, headed "नमूना संदेश" (sample message).
  - Keep the three promises, in this order:
    1. The pre-check before the fee.
    2. A send-back that names exactly what to bring, with no new fee.
    3. A hearing before any rejection.

### 10. One officer, one day: "An SDO in Kondagaon, 60 caste files" [MERGE WITH 11]
- ✔ **Works:**
  - A concrete before/after for one real role.
  - The honest footer ("modelled… measured on our prototype… the pilot measures real values").
  - "The same hours at the desk, now enough for real scrutiny" is a mature claim that avoids "lakhs of hours saved".
- ✖ **Fails:**
  - **~3 min here vs "about 2 minutes" on the next slide.** You mean different things (the day's mix vs a clean file), but a judge sees a contradiction.
  - **12 → ~8 rejections, but family-certificate rejections fall only 2.4 → 0.4.** Where do the other 2 come from? It is unexplained. (They are hearings and send-backs replacing rejections; say so.)
  - **"Orders with written, record-cited reasons: 0%"** tells CHiPS and Revenue that none of their officers' orders are reasoned. That is the most offensive cell in the deck.
  - "almost none → most" is vague next to numbers.
  - "3 keys" appears on both 10 and 11.
- **→ Fix:** merge slides 10 and 11 into one **"What changes"** slide (see slide 11).

### 11. Impact: "What changes in a year, statewide" [MERGE WITH 10]
- ✔ **Works:**
  - Every number has a range and an assumption.
  - "measured first in six weeks" is exactly right.
  - "For Sunita: one visit instead of three" closes the loop.
- ✖ **Fails:**
  - It is the third instance of the three-big-numbers row.
  - "0 → 100%" repeats the offensive "0%".
  - **Cost is absent**, though the rubric names "time, effort, cost". You have it: ₹0.9 cr/yr mid (₹0.24–2.5 cr) in direct citizen cost avoided, plus officer-hours.
  - "IMPACT_ANALYSIS" in the footer is a filename. That is a dev/AI tell.
- **→ Fix: one merged slide, three rows × two columns.**
  - Headline: **"~16,000 families a year who shouldn't be turned away"** (range 6k–36k; measured in the 6-week study).
  - Rows (Before | After):
    1. **Officer, per caste file:** about 5 min needed, 2.5–4 min given | about 3 min needed, so it fits. A clean file is 3 keystrokes (measured).
    2. **Order quality:** a 200-character remark | a numbered order citing the record relied on, and a 15-day hearing before any rejection.
    3. **Citizen:** a 3-week re-application, ₹400–700, a missed deadline | one visit. ≈ ₹0.9 crore a year in citizen costs avoided (mid case).
  - Footer: "Base: 1.48 lakh caste rejections a year (Sewa Setu MIS, annualised). Ranges and assumptions: backup slide B3."
  - Keep "For Sunita: one visit, deadline met" as the last line.

### 12. Safeguards: "The officer stays in charge" [MERGE INTO A NEW COMPARISON + SAFEGUARDS SLIDE]
- ✔ **Works:**
  - The content is exactly right:
    - never rejects;
    - no record is not a reason;
    - hearing first;
    - data stays in the SDC;
    - caste is never inferred from surnames.
- ✖ **Fails:**
  - It is a generic "Rule | In practice" table. Every responsible-AI deck has one, and the jury will skim it.
  - **The best material is hidden in the speaker notes.** You learned from Telangana's Samagra Vedika and Haryana's PPP pension halts. That is the comparison the rubric asks for, and it is not on screen.
  - It is missing the phrase the NIC architect wants: **"No free-text search. A family search runs only from inside an open application."**
- **→ Fix:** turn it into slide 11 of the new order, **"What we copied, what we refused to copy"** (see §3 for the content).

### 13. How it fits: "A small service beside Sewa Setu" [KEEP, REDRAW]
- ✔ **Works:**
  - The sidecar is correct:
    - the console is unchanged;
    - it is SDC-hosted and CHiPS-owned;
    - it fails open;
    - Phase 2 depends on a Revenue order;
    - it runs on a CPU.
- ✖ **Fails:**
  - **A render bug.** The paragraph "When an application arrives, a webhook…" overlaps the bottom border of the console box. It looks broken on a projector.
  - It is boxes, not a flow. There are no numbered steps and no data direction.
  - **"Certificate archive: read-only copy" doesn't say how you get it.** API Setu is fetch-by-number, so name search needs a replica approved by CHiPS and Revenue.
  - The stack is in 12-point grey in the footer.
  - Blocking, audit and DPDP are invisible.
  - There is no scale story (other services, 33 districts).
- **→ Fix: redraw as a numbered left-to-right flow.**
  1. Application received (webhook).
  2. Block on LGD village and tehsil → about 40 candidates out of crores.
  3. Matcher (Splink, EM-fitted) → strong / possible / none.
  4. Rule checks (2013 Act/Rules as config).
  5. Panel in the "जांच सूची" tab.
  6. The officer confirms → DSC.
  7. Audit log: who viewed which record.

  Also:
  - Put the stack under each box (Python/FastAPI, Splink/DuckDB, React, Postgres audit), not in the footer.
  - Add a strip: **"Adding a service = a rule file + message templates. Domicile already runs."**
  - A strong authenticity move: show this as **a phone photo of your whiteboard sketch**, with the clean version as backup.

### 14. What we ask for: "Measure first, then a silent pilot" [KEEP, EXPAND INTO ROADMAP AND ASK]
- ✔ **Works:**
  - The cheap first "yes" (the study touches no live decision).
  - Kill criteria (false matches > 2%, or rejections rise for any group).
  - The review group includes the Tehsildars' association and Tribal Department.
  - "CHiPS owns the code. Revenue owns the decisions. Officers keep the pen." is a strong closer.
- ✖ **Fails:**
  - **It is not a roadmap.** It stops at 90 days, with no path to 33 districts or to other services.
  - **Cost is only in the notes** (₹10–25 L study, under ₹1.5 cr pilot).
  - "One order needed: pause the time limit while a hearing or a Patwari report is pending" asks CHiPS to change its own headline KPI, which is a risky way to phrase it.
  - This is the third three-column row.
  - It doesn't tell the jury what the demo will show.
- **→ Fix: a horizontal timeline** with four stages:
  - **Phase 0**, now: the certificate-number field and a Revenue circular.
  - **6 weeks**: a study on 20,000 past files. Cost ₹10–25 L. Output: the real share of rejected applicants with a relative's certificate.
  - **90 days**: a shadow pilot in 2 sub-divisions plus 2 controls. Under ₹1.5 cr.
  - **Year 1**: all 33 districts for caste and domicile. Then relation-based services (e.g., family/heir certificates), then Bhuiyan and Khadya evidence after a Revenue GO.

  Also:
  - Rephrase the order: **"A 'waiting for hearing / Patwari report' status that stops the clock, like Sendback does."**
  - End on the tagline, then: **"Now Sunita's file, live."**

### B1. Backup, limits: "What Praman Setu does not solve" [KEEP AS BACKUP]
- ✔ Being specific here earns trust.
- ✖ It is mostly empty. "Lower recall for married women" conflicts with the model slide again.
- → Add one line per limit on *what we'd do next* (e.g., "OCR: roadmap, Bhashini/Tesseract in the SDC").

### B2. Backup, model: "How well the family matcher works" [KEEP AS BACKUP, FIX TABLE]
- ✔ Sliced evaluation (Bastar/Surguja, women, Hindi↔English, common-surname-same-village). No other team will have this.
- ✖ **The column headers and numbers are misaligned** (headers right-aligned, values left-aligned and offset). It looks sloppy exactly where rigour is claimed.
- → Right-align the numbers under their headers, and bold the two weak cells (women 0.33, Bastar 0.46).
- **Add backups:**
  - B3: impact assumptions (A × B table).
  - B4: cost breakdown.
  - B5: the study's SQL query.
  - B6: one rule file plus its unit test.
  - B7: data flow and DPDP (purpose, retention, who-accessed-my-record).
  - B8: the verified HC citation.

---

## 2. Rubric scoring

| Head | Now | Why | After fixes | What moves it |
|---|---|---|---|---|
| **1. PPT / Solution presentation** | **15** | Problem understanding is excellent, from the MIS and the empty checklist tab. The logical arc (person → data → desk → insight → build → impact → ask) is clean, and the expected outcomes are stated with ranges. It loses marks on missing deliverables: there is **no comparison, no real roadmap, no cost on screen, no scale slide**. The architecture is a weak box diagram with a render bug, there are placeholder team names, and the numbers are inconsistent (2 vs 3 min; "women" vs "married women"). | **18** | Comparison + safeguards slide; numbered architecture flow; roadmap with cost; merged impact slide; consistency pass |
| **2. Physical presentation & communication** | **13–14** (deck-driven) | 16 slides in 10 minutes is tight, at about 37 s each. The deck is English-heavy, which is odd for a Chhattisgarh panel pitching a Hindi-first tool. There is no planned speaker hand-off. The legal slide invites a citation question the team can't yet answer. | **16–17** | Hindi opening line; 13 slides; two speakers (story/impact and tech/model); the HC citation verified or dropped; the "1 in 10 wrong" pre-empt rehearsed |
| **3. Idea & innovation** | **15** | Original: it works at the point of decision, on the platform's biggest rejection source, and the compounding-archive idea is strong. But it **doesn't credit precedents** (AP across-the-counter issuance, Karnataka Kutumba, Haryana PPP). A GovTech judge who knows them will think "they don't know these exist". The citizen side (pre-check) is under-shown. | **17–18** | "What we copied / refused to copy"; the Kendra pre-check on slide 9; the compounding line promoted |
| **4. Technical feasibility & implementation** | **14** | The sidecar, SDC hosting, fail-open design and CPU-only stack are plausible. But **archive search access** (the hard part) is one grey line. Blocking, performance, the audit trail and the "no free-text caste search" rule are not on screen, and the stack is in the footer. Security and privacy exist only as a table row. | **17** | Numbered flow with blocking, audit and replica; performance numbers; purpose-bound search; stack per component |
| **5. Prototype/POC, impact & scalability** | **15** | Real prototype screenshots and a measured, sliced model: better than most. Impact is honest. But **scalability across services and districts is absent** from the main deck, cost reduction is missing, and the panel screenshot is a different applicant from the story. | **17–18** | Sunita-consistent screenshots; cost row; "add a service = a rule file"; the path to 33 districts on the roadmap |
| **Total** | **≈72** | | **≈86–88** | |

---

## 3. Missing content, over-claims and risks

### 3.1 Missing vs the rubric and deliverables

| Deliverable | Status in the deck | Fix |
|---|---|---|
| Problem understanding & gap analysis | ✔ Strong (slides 2–5) | Add the real MIS screenshot as proof |
| **Comparison with the existing approach and other states** | ✖ **Absent.** Only in the speaker notes (Telangana, Haryana) and in research/06 (AP, Karnataka, MP, Rajasthan) | **New slide, "What we copied, what we refused to copy"** (content below) |
| Solution | ✔ Slides 7–8 | Make the screenshots consistent with Sunita |
| Architecture / workflow | ◐ Boxes, no flow, render bug | A numbered 7-step flow |
| Tech stack & integration | ◐ In the footer only | Stack per component; the replica-vs-API Setu distinction |
| **Implementation roadmap** | ◐ 6 weeks + 90 days only | Phase 0 → study → shadow pilot → statewide → more services |
| Expected impact | ✔ Honest ranges | Add the cost row; merge the two slides |
| **Scalability & future enhancement** | ✖ Absent (only "Phase 2" registries) | 33 districts; domicile already runs; family/heir certificates; maiden-village search; OCR; Kendra pre-check statewide |
| **Cost** | ✖ Notes only | ₹10–25 L study, ₹0.8–1.5 cr pilot, labelled "estimate" |
| **What the demo will show** | ✖ Absent | One line on the ask slide: "Demo: Sunita's file → evidence → order → her message; then a conflict case and a no-record case." |

**Proposed comparison slide, "What we copied, what we refused to copy":**

| State / system | What it does | What we took |
|---|---|---|
| Andhra Pradesh GSWS | Issues across the counter when a family record exists | **Copied:** the family record as evidence |
| Karnataka Kutumba / e-Kshana | Family database feeding certificates | **Copied:** the family link, with officer confirmation |
| Haryana PPP / Family ID | Auto-halted pensions on data mismatches | **Refused:** a mismatch never stops a benefit on its own |
| Telangana Samagra Vedika | An algorithm flagged people as ineligible | **Refused:** "no record" is never a reason; the tool never rejects |

Below the table, a single guard strip:

> Officer signs every order · Hearing before rejection · Data stays in SDC · No free-text caste search · Caste never guessed from surnames

Claim **"new for Chhattisgarh certificate officers"**, not "first in India".

### 3.2 Over-claims and inconsistencies to fix before 10 am

1. **The HC July 2026 citation** (slides 2 and 6) is unverified by the team's own note. Verify the case number, or say "a recent High Court order" and keep the citation off the slides.
2. **"Rule 3(3)"**: confirm the rule number and the exact title of the 2013 Act/Rules.
3. **"0% orders with written, record-cited reasons"** (slides 10–11) insults the host department. Replace with "a 200-character remark → a numbered order citing the record relied on".
4. **~3 min (slide 10) vs ~2 min (slide 11).** Label them "per caste file, day's mix" and "per clean file".
5. **12 → ~8 rejections vs 2.4 → 0.4 family-certificate rejections.** Add "the rest become hearings or send-backs".
6. **"Married women" (slide 8, limits) vs "women applicants" (model backup)** for 0.33. Pick one. The evaluation slice is *women applicants*, so the explanation is about married women's records.
7. **"QR verified"** (slide 7) is simulated. Say "QR check (simulated in prototype)".
8. **"The matching is learned"**: it is EM-fitted with no labels. Say "learned from the records themselves, without labels", which is accurate and pre-empts the IIIT juror.
9. **"The tool decides nothing"** vs "drafts the order". Say "drafts; the officer edits and signs".
10. **"Sewa Setu has already solved speed"** is fine, but "whether the reasons would hold up on appeal" implies weak orders. Use: "What's left is the hardest part: the decision itself."

### 3.3 Risky in front of CHiPS

- **State emblem and "official account" in the mocks.** The WhatsApp mock says "सेवा सेतु · आधिकारिक खाता (डेमो)" beside an emblem-like roundel, and the console mock carries one too. Use of the State Emblem is restricted by law (the State Emblem of India (Prohibition of Improper Use) Act 2005), and "official account" on a mock reads as impersonation. Replace both with a neutral "SS" monogram, and head the message "नमूना संदेश (डेमो)".
- **CM photo in `mis_top.png`.** Crop it out.
- **District rejection spread.** Show it as variation; never name the highest district, and never use red.
- **Caste sensitivity:**
  - Showing "अ.ज.जा. · गोंड" on a certificate comparison is acceptable because it comes from a certificate.
  - Never frame tribal applicants as fraud risks.
  - Say out loud: **"caste comes only from certificates; surnames are never used to guess caste"**, which is already on slide 12.
- **Synthetic data.** It is disclosed on slides 2, 7, 8 and 10. Good. Add "synthetic" to the evidence-slide screenshot caption too.
- **The ask to "pause the time limit".** Phrase it as a stop-the-clock *status*, not a KPI change.
- **The 0.89 precision.** It must be framed *by you*, first: "1 in 10 strong links wrong in test, so the officer confirms every link; the pilot stops at 2% false matches."

---

## 4. "Looks AI-made?" audit

**Verdict: yes, moderately.** It is tasteful and restrained, which already helps. But it has the fingerprints of a generated deck: every slide comes from one layout grammar, and the copy is too evenly polished.

### Specific tells

1. **Eyebrow + serif title on 13 of 16 slides:** ONE APPLICATION, WHERE SEWA SETU STANDS, WHERE REJECTIONS COME FROM, THE OFFICER'S SIDE, WHAT WE BUILT, SUNITA'S FILE…, THE CITIZEN'S SIDE, ONE OFFICER, ONE DAY, IMPACT, SAFEGUARDS, HOW IT FITS, WHAT WE ASK FOR, BACKUP · …. It is the single strongest tell.
2. **"What…" titles six times:** "What the SDO works with today", "What we built", "What Sunita receives", "What changes in a year", "What we ask for", "What Praman Setu does not solve".
3. **Three-column number rows with a rule above them, three times** (credit, impact, ask), plus a symmetrical two-column pair (insight).
4. **Two "Rule | In practice"-style tables** (day, safe), plus a third table (model).
5. **The bold-lead-in paragraph pattern three slides in a row** (panel, evidence, citizen): "**Finds the family certificate**, …", "**Same man, spelt differently.** …", "**An approval that names…**: …".
6. **Negation aphorisms ("X, not Y" / "never" / "nothing"):**
   - "The tool decides nothing."
   - "No record is not a reason."
   - "fair procedure, not new evidence"
   - "Caste is never scored"
   - "The tool never rejects"
7. **Rhythmic triplets:** "CHiPS owns the code. Revenue owns the decisions. Officers keep the pen." Keep this one, because it is your closer, but only one triplet per deck.
8. **Closing "moral" lines in accent colour** at the bottom of slides: "The same hours at the desk, now enough for real scrutiny." / "So documents get skimmed…" / "Every certificate Sewa Setu issues…".
9. **Identical footer grammar**, "Source … · N", on every light slide, while dark slides have no number. Also a filename (`IMPACT_ANALYSIS`) in a footer.
10. **Too-tidy symmetry and empty lower thirds** (credit, desk, insight, ask, limits). Machine layouts leave space evenly; people fill space with evidence.
11. **Tilde-numbers everywhere:** ~5 min, ~3 min, ~8, ~2.4, ~0.4, ~16,000.
12. **No human traces:**
    - no team photo;
    - no real screenshot of anything you didn't build;
    - no handwriting;
    - no map;
    - no "we" sentences about what you *did* (downloaded, watched, counted).
    - Placeholder names on the cover.

### Concrete fixes (authentic signals, never fabricated)

- **Real MIS screenshots** (`mis_top.png` on slide 3; the `mis_table.png` Grand Total row as an inset on slide 4), with **hand-drawn circles and arrows**. Draw them with a stylus or a marker-style stroke, not a perfect SVG ellipse.
- **A frame from the public console walkthrough** on slide 5, with the empty "जांच सूची" tab circled.
- **A phone photo of your whiteboard architecture sketch** on slide 12. It is the most "student team did this" image possible.
- **A neutral district map of Chhattisgarh** (one hue) on slide 4, from LGD/Census shapefiles.
- **First-person fieldwork captions:**
  - "We added up 907 services from the MIS on 27 Sept."
  - "We watched the 38-minute console walkthrough twice."
  - "We tried 14 files as an SDO would."
- **A real quote only if one exists.** If a team member spoke to a CSC operator, a Patwari or a student applicant, use one line with first name, role and district. **Do not invent a quote or a photo.** If none exists, use the MIS and console screenshots as your "field" evidence and say "public data only" honestly.
- **Drop the eyebrow on at least 9 slides.** Keep it only on the backups.
- **Vary the layouts:**
  - one full-bleed screenshot slide (evidence);
  - one slide that is just two names (cover);
  - one map;
  - one whiteboard photo;
  - one dense "working" slide (the backup SQL).
- **Titles as spoken sentences, some in Hindi:**
  - "प्रमाण पहले से सेवा सेतु में है।"
  - "Her father's certificate is in Sewa Setu."
  - "We looked at the 3.6 lakh 'no's."
- **Use exact numbers where you have them** (16,300 mid; 1,48,000), and keep "~" only for modelled minutes.
- **A team slot:** a 1-line strip on the ask slide with three first names, roles and a small real photo.

---

## 5. Memorability (pitch 14 of 20)

**What the jury will remember at 6 pm, as the deck stands:** "the caste certificate team, the girl called Sunita, the tidy beige slides."

That is good, but "Sunita" will blur with other teams' personas: Ramesh the farmer, Sita at the CSC.

**What it should remember:** **"the Ramlal Markam team: the father's certificate was already in Sewa Setu."**

### The one "only this team did X"
Lead with **the analysis of CHiPS's own MIS**:
- caste certificates are **22% of applications but 61% of rejections**;
- plus **the empty checklist tab** in the real console.

Every other team starts from "citizens face problems". You start from their own numbers and their own screen. Mention the measured, sliced model once, as proof you can build it.

### The first 30 seconds (hook script; two lines of Hindi, then English)
> **[Cover: the two spellings of the father's name]**
>
> "नमस्ते। ये दो नाम एक ही व्यक्ति के हैं: सुनीता के पिता। सेवा सेतु ने 2019 में इन्हें अनुसूचित जनजाति का प्रमाण पत्र दिया था।
> (These two names belong to the same man, Sunita's father. Sewa Setu issued him an ST certificate in 2019.)
>
> This week Sunita applied for hers, and the officer has no way to find her father's certificate. That's not rare. On your own MIS, caste certificates are a fifth of the applications and three-fifths of the rejections. We're [team], and we built the missing search."

### Cut anything that blends in
- The phone-frame WhatsApp mock (shrink it, no frame).
- The generic safeguards table (turn it into the comparison slide).
- The three repeated number rows.
- The eyebrow labels.
- "AI and Automation" on the cover (every team says it).

### Repeat one line three times
Say it on the cover, the insight slide and the closer.

**Tagline:**
> **"प्रमाण पहले से सेवा सेतु में है।" / "The proof is already in Sewa Setu."**

Longer closer: *"Sewa Setu already has the proof. Praman Setu puts it on the officer's desk, and the officer still decides."*

---

## 6. Flow and timing (10 minutes)

The recommended deck is **13 main slides and 8 backups**. It opens with the father's-name hook, and the demo starts from Sunita's file.

| # | Slide (new) | Source | Seconds | Speaker |
|---|---|---|---|---|
| 1 | Hook cover: two spellings, one man | cover (redesign) | 25 | A (Hindi opening) |
| 2 | Sunita | sunita | 45 | A |
| 3 | Credit, with the real MIS screenshot | credit + mis_top | 30 | A |
| 4 | Caste = 22% of applications, 61% of rejections (with inset) | where + mis_table | 50 | A |
| 5 | The officer's desk; empty checklist tab circled | desk | 45 | A |
| 6 | The proof is already in Sewa Setu (law, compounding) | insight | 35 | A → hand-off |
| 7 | Praman fills the checklist tab (Sunita's file) | panel | 35 | B |
| 8 | Evidence + honest model numbers | evidence | 55 | B |
| 9 | Sunita finds out at the Kendra; the message | citizen | 30 | A |
| 10 | What changes: officer, orders, citizen, cost | day + impact merged | 60 | A |
| 11 | What we copied / refused to copy, plus guards | NEW (safe + comparison) | 50 | B |
| 12 | Architecture flow + stack + scale | build (redraw) | 50 | B |
| 13 | Roadmap, cost, ask, tagline → "now Sunita's file, live" | ask (expanded) | 45 | A |
| | **Total** | | **555 s (9:15)**, a 45 s buffer | |

**Demo hand-off:**
- Hand off from **slide 13**. The format puts the demo after the 10 minutes.
- The last spoken line: "प्रमाण पहले से सेवा सेतु में है। अब सुनीता की फ़ाइल, लाइव।" ("The proof is already in Sewa Setu. Now Sunita's file, live.")
- The demo must **open on the same file** (SS/2026/KDG/08812) seen on slides 7–8. Then:
  - the conflict case;
  - the no-record case ("not a ground for rejection").
- If the panel allows, a live demo could instead cut in after slide 8. Do not risk that: keep the format.

### The five hardest questions this deck invites

1. **CHiPS head:** "Our archive is digital only from about 2015–18. Most fathers of today's 18-year-olds got paper certificates. What share of rejected applicants actually have a relative in the digital archive? Your 16,000 rests on that."
   - *Answer:* "We don't know. We assume 10–35%, and siblings are likelier than fathers. That is exactly what the 6-week study measures, with one query, before any pilot money is spent." (Backups B3 and B5.)
2. **ex-NIC architect:** "API Setu edistrictcg is fetch-by-number. How do you search crores of records by father's name, who approves that replica, and who can query caste data?"
   - *Answer:* "A read-only replica inside the SDC, approved by CHiPS and Revenue. LGD blocking cuts crores to about 40 candidates and keeps 98.2% of true links. The search is purpose-bound: it runs only from inside an open application, there is no free-text search, and every view is logged."
3. **IIIT faculty:** "0.89 precision on synthetic families that *you* generated is circular. One in ten wrong links on a *caste certificate* is dangerous. And recall of 0.33 for women: isn't the tool discriminatory?"
   - *Answer:* "Yes, partly circular, which is why the pilot gate is 98% on 300 real officer-labelled files. A human confirms every link, and there is a kill switch at 2% false matches. Low recall only means 'no match → normal scrutiny', never rejection. The maiden-village search is next."
4. **GovTech expert:** "SDOs are ranked on speed. Why will they use this? And if it drafts the order, won't they rubber-stamp it? Who is liable when a wrong link gives a non-ST person an ST certificate?"
   - *Answer:* "A clean file is 3 keys, so it is faster, not slower. The evidence is shown before any suggestion. Approving over a flag needs a written finding. The officer signs and remains the authority. The link shows both records, and the r.15(2) scrutiny sample still applies."
5. **CHiPS / legal:** "You cite a July 2026 HC order and Rule 3(3). Case number? And you say 0% of orders are reasoned today, and districts vary 2.3–13.2%. Are you saying our officers act illegally?"
   - *Answer:* the verified citation (or a candid "we'll send the order number") and the softened wording from §3.2. "Variation shows the evidence isn't reaching the desk, not that officers are at fault."

---

## 7. Top 10 changes, ranked by marks gained

| Rank | Change | Heads | Est. gain |
|---|---|---|---|
| 1 | **Add "What we copied / refused to copy"**: AP GSWS, Karnataka Kutumba, Haryana PPP, Telangana Samagra Vedika → guards (incl. "no free-text caste search"). Replaces the safe table. | PPT, Innovation, Tech | +3 |
| 2 | **Turn the ask slide into a roadmap and cost slide**: Phase 0 → 6-wk study (₹10–25 L) → 90-day shadow (< ₹1.5 cr) → 33 districts → more services; stop-the-clock status; the demo preview line | PPT, Tech, Scale | +3 |
| 3 | **Redraw the architecture as a numbered 7-step flow**: webhook, LGD blocking, matcher, rules, panel, DSC, audit; replica vs API Setu; stack per box; "add a service = a rule file"; fix the overlap bug | Tech, Scale | +2–3 |
| 4 | **Consistency and over-claim pass**: 2 vs 3 min; 12→8 explained; women vs married women; QR simulated; drop "0%"; soften "hold up on appeal"; verify or drop the HC citation and Rule 3(3) | Communication, Tech, PPT | +2–3 (mostly avoided losses) |
| 5 | **Hook cover**: the two spellings of the father's name, a Hindi opening, the tagline "प्रमाण पहले से सेवा सेतु में है।", real team names | Communication, PPT, memorability | +2 |
| 6 | **Real MIS screenshots** on slides 3–4 (CM photo cropped, hand-circled 3,64,124 and the Grand Total row), plus the console frame with the empty tab circled | PPT, Innovation (authenticity) | +2 |
| 7 | **Evidence slide pre-empts the IIIT juror**: "1 in 10 strong links wrong on our synthetic test → officer confirms every link; pilot gate 98% on 300 real files"; 98.2% blocking recall; 3.7 s CPU | Tech, POC | +1–2 |
| 8 | **Merge day + impact** into one before/after slide with a **cost row** (₹0.9 cr/yr citizen cost avoided, mid) and Sunita's outcome | POC/Impact, PPT | +1–2 |
| 9 | **Citizen slide**: add the Kendra pre-check (camp caste rejections 41%); drop the phone frame, the emblem and "आधिकारिक खाता"; make the panel screenshot Sunita's file | Innovation (citizen), risk | +1–2 |
| 10 | **De-template**: drop eyebrows on 9+ slides, vary the layouts (map, whiteboard photo, full-bleed screenshot), first-person fieldwork captions, fix the model-table alignment and page numbers, remove the filename footer | PPT, Communication | +1–2 |

**Projected result: ≈72 → ≈86–88.**
