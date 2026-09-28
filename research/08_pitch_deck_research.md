# 08 — Pitch deck research (Praman Setu, Sewa Setu Innovation Hackathon, 28-09-2026)

Quick research pass (~20 min). Tags: [V] read at source, [S] search-snippet only, [U] vendor/blog claim, not independently verified.
Builds on `critique_3_jury.md` §5.3 (11-slide run order) and `02_existing_solutions.md` / `06_officer_tools_benchmark.md` (state benchmarks). Do not duplicate those; use this as the checklist layer on top.

---

## 1. Structure and timing (10-min slot)

**What winning hackathon / SIH decks share**
- Problem first, stated so the jury *feels* it (who, where, why now). JetBrains judges: "Sounds obvious, but often people skip it." [V]
- Show something working within ~90 s of starting the product section. Live demo beats a polished deck. [V JetBrains; S placementpreparation]
- One thing done well > five half-built features. If the pitch runs long, it is a scope problem, not pacing. [V JetBrains]
- A clear before/after contrast is what judges remember. [V JetBrains]
- Tech (architecture, stack, security) comes *after* the demo and stays short. [S placementpreparation]
- Be honest about what is mocked/synthetic; judges read that as confidence. Say "I don't know, we'd measure it in the pilot" rather than guess. [V JetBrains; S placementpreparation]
- Official SIH idea-PPT template = Title, Idea, Technical approach, Feasibility & viability (risks + mitigations), Impact & benefits, Research & references. Juries trained on SIH expect *feasibility/risks* and *references* to exist somewhere. [V lets-code]
- Rehearse out loud, timed, at least once; freeze the demo path and run it 10 times rather than adding features. [S slidemodel / dev.to checklist]

**Recommended 10-min shape** (maps onto critique_3 §5.3; keep ~11 slides + backups)

| Block | Time | Slides |
|---|---|---|
| Hook: one person's case | 0:00–0:45 | 1 |
| Credit Sewa Setu + where the pain is (govt's own data, one chart) | 0:45–2:15 | 2–3 |
| Insight + product on one page | 2:15–3:45 | 4–5 |
| Demo (or demo video fallback) | 3:45–6:30 | live |
| How it decides + guardrails + integration | 6:30–8:15 | 6–9 |
| Impact (story + number, assumptions visible) | 8:15–9:05 | 10 |
| Ask: pilot, success/kill criteria, partners | 9:05–10:00 | 11 |

Rule of thumb: ≤ 25 words per slide; one idea per slide; no slide spoken for > 60 s.

**Common mistakes** [S slidemodel, hacktribe, Circles.Life; V JetBrains]
- Slides as documentation (reading dense text).
- Demo squeezed into last 30 s.
- Overselling ("100% accurate", "fully automated").
- Building until the last hour; no rehearsal.

---

## 2. Public-sector jury specifics (CHiPS / GoCG officers)

**What civil-servant juries value**
- **Credit the incumbent first.** Sewa Setu / e-District solved speed; you extend it. Never frame as "the system fails". Frame problems as *risks to highlight*, not fault to find (reduces defensiveness). [S GC_Entrepreneur Medium "11 tips"]
- **Co-authorship tone:** "what officers told us they need" beats a prescriptive pitch. Govt as co-author, not skeptical buyer. [S govtechrev; GC_Entrepreneur]
- **Cite the government's own numbers** (Sewa Setu dashboard, Lok Sewa Guarantee SLA data, Gazette rules, HC rulings). Officers trust their own data over third-party stats.
- **Fit into existing rails:** sidecar to Sewa Setu / e-District, SDC hosting, API Setu, DigiLocker, Aadhaar QR offline verify. No new portal, no new login for the citizen.
- **Legal/compliance line:** Caste rules, Lok Sewa Guarantee Adhiniyam 2011 (SLA clock), DPDP Act 2023 + Rules 2025 (Rule 5 binding 13-05-2027 — mid-pilot, see critique_4). One line each on-slide; detail in backup.
- **Cost + procurement path:** a rough, labelled estimate; self-hosted/open models to avoid recurring licence cost and data leaving the state.
- **Define success before anything is signed** — most govt partnerships that fail skip this. Put success *and* kill criteria on the Ask slide. [S govtechrev]
- **Concrete next step:** 90-day shadow pilot, named districts, named partners (CHiPS, Revenue Dept, an academic evaluator), MoU/letter of intent as the ask.

**Presenting AI to government** — anchor on **India AI Governance Guidelines (MeitY, 5 Nov 2025)** [S PIB, azb, regulations.ai; PDF: static.pib.gov.in]
- Seven sutras: Trust is the Foundation; People First; Innovation over Restraint; Fairness & Equity; Accountability; Understandable by Design; Safety, Resilience & Sustainability.
- Guidelines call for human-in-the-loop safeguards at critical decision points and grievance redressal for people affected by AI decisions.
- Map product features to sutras on the guardrails slide (small text, not a new slide):
  - People First / Accountability → officer decides, always; no auto-reject; every action logged to a named officer.
  - Understandable by Design → evidence shown with source record + reason, not a score.
  - Fairness & Equity → no caste scoring; district-wise evaluation of error rates.
  - Safety → read-only replica, no free-text caste search, synthetic data in demo.
  - Grievance → citizen told which records were used + correction route.
- Language: say "assistant", "evidence", "suggests", "officer confirms". Avoid "AI decides", "automates approval", "predicts caste".

---

## 3. Making the deck read as human-made (not AI-generated)

**AI-deck tells to remove** [V 2slides; V llemental; S plusai, presentations.ai]
- Uniform rhythm: every slide has same headline length, 3–4 bullets, each starting with a verb, same length. (Called the single most reliable tell.)
- Generic flat single-colour line icons ("team", "growth", "shield") in a uniform 3- or 4-card row.
- Pastel gradient blobs, isometric illustrations, "person with oversized head" art, stock handshakes/laptops.
- Palette that matches no real brand; cream background + italic serif flourish + coloured bar beside every text box.
- Perfect symmetry, identical image aspect ratios, zero hierarchy.
- Buzzwords: revolutionize, seamless, leverage, empower, unlock, elevate, robust, cutting-edge, game-changer, synergy, "at the intersection of", "plays a crucial role in". Structural tells: "It's not X, it's Y"; "From X to Y" titles; triplets everywhere. [S writehuman, huntingthemuse, WaPo on em-dash]
- Em-dash is a contested tell (WaPo, The Ringer) — don't obsess, but avoid one in every headline.
- (Vendor claim [U]: "71% of viewers spot an AI deck within 3 slides"; unverified — don't cite.)

**Signals of human authorship — add these**
- Real screenshots of *your* running product, annotated (red circle / arrow / handwritten-style note: "officer sees source record here").
- Specific names, places, dates, file numbers: "Kondagaon", "SDO queue, 6 cases", "HC order 22-07-2026", "r.3(3)". Specificity is the strongest anti-AI signal.
- Evidence of fieldwork: a quote from an officer/Kendra operator (paraphrase is fine; attribute by role, e.g. "Tehsil operator, Raipur"), a phone photo of a real form/queue (imperfect is fine; blur PII).
- Vary layouts deliberately: one full-bleed sentence slide, one dense table, one chart-only slide, one screenshot slide. Headlines of different lengths (2 words on one, a full sentence on another). [V 2slides]
- One strong chart (govt data) instead of many icon tiles.
- First-person voice on opening and close: "We sat with an SDO's queue…", "We are asking for…". [V 2slides]
- Hindi/Chhattisgarhi phrase in the story (the citizen's words), matching how the jury actually talks.
- Leave one slide nearly empty (single sentence, big type). [V 2slides]
- Consistent but plain palette tied to CG govt / Sewa Setu colours rather than a generic template.

**Pre-flight scrub (5 min):** search deck text for the buzzword list above; count bullets per slide (vary them); delete every decorative icon that doesn't carry information; replace any stock/AI illustration with a screenshot or nothing.

---

## 4. Storytelling patterns

**Impact slide: one human + one number** [V Duarte "4 techniques"]
- Duarte: identify the hero (the person behind the numbers), talk to the people behind the data, name the conflict, give decision-makers context over time.
- Pattern: *Sunita's case* (hero, 1 line) → *the number* (e.g. avoidable caste rejections/yr, range with assumption shown) → *what it costs her* (scholarship window missed) → *what it costs the state* (officer-hours, re-applications, appeals).
- Show ranges + assumptions ("pilot measures this"); officers distrust single precise forecasts.

**Before / after** [V JetBrains]
- Two columns, same case: *Today* — officer opens 7 PDFs, searches archive manually, sends back for 1950-era papers (N days). *With Praman Setu* — father's 2019 certificate surfaced with source, officer confirms in one screen. Use real screenshots on both sides if possible.

**A day in the life** (alternative opener)
- SDO at 10:00 with a queue of 40 caste files; timeline strip showing where minutes go. Good if you have a real officer quote.

**Comparison / benchmarking slide ("value addition over existing approach")** — facts already in `02_existing_solutions.md` and `06_officer_tools_benchmark.md`
- Frame as *learning from peers*, not ranking CG below them. Columns: Approach · What it needs · Limitation · What Praman Setu adds for CG.
  - **Haryana PPP/FIDR**: caste/income issued fast when pre-verified in family database. Needs a family registry + PPP Act 2021; data errors needed ~500 correction camps. [V hppa.haryana.gov.in; tribuneindia]
  - **Karnataka Kutumba + Nadakacheri/AJSK**: family ID fetches caste/income without documents; ~7–8 of 10 same-day [U]. Needs statewide registry + legal cover. [V kutumba.karnataka.gov.in]
  - **Andhra Pradesh G.O.Ms.469 (29-09-2023)**: caste/nativity certificates permanent; departments must not ask for fresh ones; 28.62 lakh families certified door-to-door. Needs a campaign + field checks (≈17% not issued). [V via 02_existing_solutions]
  - **Praman Setu (CG)**: no new registry, no new law — reuses evidence CG already holds (Sewa Setu archive of issued certificates, Bhuiyan, etc.) *per application*, shows it to the officer, officer decides. Complements a future CG family registry rather than competing with it.
- One-line takeaway on slide: "Others built a registry first. CG can start with the archive it already has."
- Keep the full table in backup; on the main deck, at most 4 rows × 3 columns.

---

## 5. Final checklist (today)
- [ ] Slide 1 is a person, not a statistic; Sewa Setu credited within 60 s.
- [ ] Demo starts by ~3:45; working screen within 90 s of product intro; offline fallback video ready; "synthetic data" banner visible.
- [ ] Every number on a slide is from a govt source or labelled estimate/assumption.
- [ ] Guardrails slide maps to MeitY sutras (People First, Understandable by Design, Accountability, Fairness).
- [ ] Words used: assist, evidence, suggest, officer confirms. Never: auto-approve, AI decides, revolutionize, seamless, leverage, empower.
- [ ] Layout variety: ≥1 full-sentence slide, ≥1 annotated real screenshot, 1 chart, 1 table; no uniform icon-card rows.
- [ ] Ask slide: 90-day shadow pilot, districts, partners, success + kill criteria, requested next step (LoI/MoU, data-access order).
- [ ] Backups ready: cost, DPDP/CERT-In, legal table, state comparison, rule file + test, failure cases (Samagra Vedika / Robodebt).
- [ ] Two timed rehearsals; hand-off between speakers scripted; Q&A answers ≤ 30 s, "we'll measure that in the pilot" when unsure.

---

## Sources
- JetBrains, "How to Win a Hackathon: Notes From the Judging Table" (Jun 2026): https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/ [V]
- Let's Code, SIH 2025 guide + PPT template: https://www.lets-code.co.in/blogs/sih-2025-complete-guide-ppt-template/ [V]
- PlacementPreparation, SIH guide: https://www.placementpreparation.io/blog/smart-india-hackathon-guide/ [S]
- TheNewViews, SIH tips from past winners: https://thenewviews.com/how-to-win-smart-india-hackathon/ (403) [S]
- SlideModel, hackathon presentation: https://slidemodel.com/hackathon-presentation/ [S]
- HackTribe, 5-minute pitch structure: https://hacktribe.co/blog/how-to-build-a-hackathon-pitch-deck-practical-5-minute-structure [S]
- Circles.Life, 5-minute hackathon pitch: https://medium.com/circleslife/creating-a-5-minute-kickass-hackathon-pitch-17cdcb42c3bc [S]
- GC_Entrepreneur, "11 tips for pitching innovation in government": https://medium.com/gc-entrepreneur/11-tips-for-pitching-innovation-in-government-9fceac5a3c9 (403) [S]
- GovTech Review, civic-tech partnerships: https://govtechrev.com/posts/civic-tech-startup-ecosystem-and-government-partnerships [S]
- PIB, India AI Governance Guidelines: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2228315 ; PDF https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc2025115685601.pdf [S]
- AZB Partners summary: https://www.azbpartners.com/bank/meity-releases-guidelines-on-ai-governance-the-way-ahead-and-roadmap-for-ai-use-in-india/ [S]
- Regulations.ai entry: https://regulations.ai/regulations/RAI-IN-NA-IAGGEXX-2025 [S]
- 2Slides, "Why AI slides look fake in 2026": https://2slides.com/blog/why-ai-slides-look-fake-and-how-to-fix [V]
- Llemental, "Why AI presentations look AI-generated": https://llemental.com/posts/why-ai-presentations-look-ai-generated [V]
- Plus AI, "AI slides that don't look like AI slop": https://plusai.com/blog/how-to-make-ai-slides-that-dont-look-like-ai-slop/ [S]
- WriteHuman, "AI tells in 2026": https://writehuman.ai/blog/ai-tells-in-2026 [S]
- Washington Post on em-dash: https://www.washingtonpost.com/technology/2025/04/09/ai-em-dash-writing-punctuation-chatgpt/ [S]
- Duarte, four data-storytelling techniques: https://www.duarte.com/blog/four-storytelling-techniques-to-bring-your-data-to-life/ [V]
- Haryana PPP caste certificate: https://hppa.haryana.gov.in/Caste-Class-certificate.html [S]; NIC post on PPP: https://x.com/NICMeity/status/2006294808483205135 [S]
- Karnataka Nadakacheri same-day rate: https://g.indiacustomercare.com/karnataka-income-certificate [U]; Kutumba: https://kutumba.karnataka.gov.in/en/Index/AboutUs (see 02/06)
- AP benchmarks: see `02_existing_solutions.md` rows 5–7 (G.O.Ms.469, Deccan Chronicle 2-3-2025).
