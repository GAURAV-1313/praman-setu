# Sewa Setu Innovation Hackathon: FINAL PLAN (v4)
Event **28-09-2026** · PS1 (AI & Automation) · 10 min PPT + 5 min demo + 5 min Q&A · 100 marks
v4, 27-09-2026. Built on the 5 research tracks and the 4 in-character critiques.
**Supersedes v1–v3.** Evidence is in `research/00_VALIDATION_REPORT.md`; the critiques are in `research/critique_*.md`.

---

## 0. The idea in one breath
**"Praman Setu" (प्रमाण सेतु, "evidence bridge")** is AI that finds the proof the state already holds.

- When a citizen applies for a **caste or domicile certificate**, it looks in Sewa Setu's own archive for a **family member's earlier certificate**. The Caste Rules 2013 r.3(3) and the CG High Court (Jul 2026) both accept this as evidence.
- It shows the officer the evidence **side by side**.
- It **sends back fixable gaps in plain Hindi** instead of rejecting.
- It tells the Kendra operator *before submission* which proof to attach.
- **The officer always decides.**

> *"The state already holds your family's proof. You shouldn't have to find it, pay twice, or guess why you were refused."*

**Why caste and domicile:** they are **41.6% of Sewa Setu applications** (caste 22.1% + domicile 19.5%) but **82% of all rejections**.
- SC/ST rejection rate: 19.0%
- OBC rejection rate: 21.2%
- Income rejection rate: only 1.4%

Source: live Sewa Setu MIS, 01-04-2025 to 26-09-2026.

**Renamed:** "Nirnay" means *decision*. Every critic flagged that the name implied the AI decides. "Praman Setu" means evidence bridge: from today's application to the proof already in the archive.

---

## 1. What the critics said, and what changed
| Critic | Verdict on v3 | Top concerns | How v4 answers |
|---|---|---|---|
| **SDO, Kondagaon** (end user) | 4/10 use; 7/10 with fixes | Liability stays with the officer; one fake certificate fast-tracks a whole family; wrong matches on common surnames (Netam, Markam) and spelling variants; married women; extra clicks; being ranked on override rate | Evidence, not colours; exact vs possible match; check issuing authority and cancellation status; caste compared against the official Scheduled list with a synonym table; maiden-name search; embedded in the Sewa Setu officer screen with **zero extra clicks on clean files**; **no officer ranking**; ask for a Revenue circular that makes the evidence card count as due diligence |
| **Citizen (Sunita, Gond, Kondagaon) and Kendra operator** | "Solves the government's problem, not mine" | Nothing reached the citizen; "no records" was treated as risk, which penalises first-generation, migrant and women applicants; one-line rejections in the wrong language; operators unpaid for send-back rework | **Three neutral lanes**, where no records means standard review and is never flagged; **Kendra pre-check before the fee is paid**; plain-language send-back by SMS/WhatsApp and printout, **curable without a new fee**; a "contest this flag" step; consent-based, declared family lookup; cause-tagged reasons so operators aren't blamed |
| **Jury** (CHiPS head, ex-NIC architect, IIIT-NR AI faculty, GovTech expert) | ≈68/100; ≈84 with fixes | "It's just rules, where's the AI?"; citizen absent; opening criticised Sewa Setu; v2 and v3 numbers conflict; 8 features built shallow; API Setu can't search by father's name | **Learned record-linkage model with an evaluation and fairness slice**; citizen layer; opening is story, then credit to Sewa Setu, then data; scope cut to 4 deep features; v3 numbers everywhere; honest integration via a read-only replica |
| **Government** (Revenue Secretary, CHiPS CEO, Tribal Secretary, legal advisor) | Conditional yes to a low-risk first step; no to funding as worded | Blame framing; Revenue is the data owner (not CHiPS alone); archive starts 2015 (2018 on DigiLocker), so fewer father matches and more sibling matches; cancelled-certificate check; exclusion risk; name | Framing is "consistency and cure", never "wrong decisions"; the **ask** is a 6-week retrospective study, then a 90-day shadow pilot, then a review group with go/kill gates; "CHiPS owns the code, Revenue owns the decisions, officers keep the pen" |

**Also corrected:**
- **SC cut-off is 10-08-1950 and ST cut-off is 06-09-1950.** v3 had one date for both.
- **"1 in 5 caste applicants rejected"** may be inflated by duplicate applications. Say "about 1 in 5 caste *applications*".
- **Kondagaon's 11.6%** covers all services, not caste only.
- **The archive holds 3.2 crore *transactions*,** not certificates.

---

## 2. The solution (v4)
### 2.1 Four touchpoints, built deep
| # | Touchpoint | What it does | Who it serves |
|---|---|---|---|
| **A** | **Kendra pre-check** (operator screen, low bandwidth) | Before the fee is paid, the operator enters the father's name, village, and optionally a family member's certificate number. The system shows "✔ Matching family certificate found (No. …), attach as proof", or a checklist of what's missing for this service. It is a declared lookup the citizen consents to, not a dragnet. | Citizen and operator. Prevents bad submissions |
| **B** | **Officer evidence panel** (inside the Sewa Setu officer screen) | Side-by-side evidence: the application vs the relative's certificate (QR-verified, issuing authority, active or cancelled), plus the land and ration-roster rows. Match strength is shown as a **match-weight breakdown** ("village agrees +4.1, father's name +6.3 → 98%"). | SDO (permanent caste) and Tehsildar (domicile, temporary caste). Faster, defensible decisions |
| **C** | **Reasoned action and citizen message** | Suggested action: *records complete* / *standard review* / *specific deficiency, send back*. A **template-bound draft order** cites only records and r.3(3). The officer edits and e-signs. The citizen gets a **plain-Hindi message**: an LLM rewrites the officer's reason, and a checker blocks any name, number or document not in the source. It goes out by SMS/WhatsApp plus a printout at the Kendra, and can be cured without a new fee. | Citizen (clarity, one fix and no extra trip) and officer (natural justice) |
| **D** | **Collector/CHiPS consistency view** | **Real MIS**: district and tehsil rejection range, service mix, lane mix, send-back cure rate, evaluation panel, exclusion guard (no-match applicants, by category and gender). **District and tehsil level only, with no officer ranking.** | Collector and CHiPS. Actionable MIS |

### 2.2 How it decides: "Rules where the law demands reasons, learning where the problem is genuinely hard"
- **Learned (the AI):**
  - A **probabilistic record-linkage model**: Splink (Fellegi–Sunter), learned m/u weights, fitted by EM.
  - It matches applicant ↔ relative across Hindi/English spellings, a consonant skeleton, the father's name (Jaro-Winkler), LGD village code and birth-year band.
  - Output: **exact / possible / none**, with an explainable weight waterfall.
  - Fallback: logistic regression on RapidFuzz and phonetic features.
- **Deterministic (the law):**
  - Service rules as versioned decision tables (GoRules zen-engine).
  - **Caste comparison against the official Scheduled lists and a synonym table** (e.g., Gond sub-groups), never raw string compare.
  - A relative's certificate counts only if it is **permanent, issued by a competent authority, and not cancelled**.
- **Generative (safe role only):** a plain-language rewrite for the citizen, behind an entity checker, with a template fallback. **It never writes the officer's findings.**
- **Three lanes:**
  - **Records complete:** a family certificate is verified and the data agrees.
  - **Standard review:** no records found. **This is neutral**; the officer works exactly as today.
  - **Needs attention:** an internal inconsistency, e.g., a relative's certificate in a different category, or the same document reused.
  - **Never auto-reject. Never bulk-approve.**
- **Anti-laundering:**
  - A lineage match to a certificate that is cancelled, under scrutiny, or issued by an incompetent authority → needs attention.
  - "Records complete" cases feed the **risk-based r.15(2) post-issue audit sample**, which keeps its random component.

### 2.3 Guardrails, as five icons on the slide
1. **The officer decides and signs.** The draft cites records only.
2. **No caste scoring. No free-text caste search.** Caste comes only from certificates.
3. **Missing data never means ineligible.** No-match = standard review.
4. **Every data access is logged and shown to the applicant** (DPDP Rule 5 and the Second Schedule, binding from 13-05-2027; CERT-In 180-day logs).
5. **Runs inside the State Data Centre.** CPU-only, self-hosted models, no external APIs in production.

### 2.4 Integration (honest)
- **Sidecar service in the SDC**, triggered by a Sewa Setu webhook on "application received". The panel embeds in the officer screen. If the service is down, officers work exactly as today.
- **Search:** a read-only, nightly replica of the certificate archive, blocked on LGD district and village. API Setu (`edistrictcg`) only supports **fetch by application number**; it has no name search. That fetch is used to verify the matched certificate and its QR.
- **Phase 2 sources** (Bhuiyan land and the Khadya roster, by name) come via NIC under a **Revenue GO and State Data Governance Committee approval**. The demo mocks these using the real API Setu response shapes.
- **Ownership:** CHiPS owns the code; Revenue owns the data and the decisions; officers keep the pen.

---

## 3. Impact (assumptions visible)
> **Corrected on 27-09-2026:** see `IMPACT_ANALYSIS.md`. Use these figures: caste applications ~7.96 L a year; avoided rejections **~6k–36k a year (mid ~16k)**; officer time ~6k–23k hours a year; citizen money ₹0.24–2.5 cr a year. Pitch on deadlines, fairness and legal compliance, not ROI. Also propose Phase 0 (a certificate-number field plus a Revenue circular) before Phase 1 (learned matching). The numbers below are superseded.

- **Caste rejections:** about 1.47 lakh a year.
- **Assumption A:** 30–50% have a relative's certificate in the archive. The government critic calls this optimistic, because the archive only starts in 2015 (2018 on DigiLocker). **The retrospective study measures it in week 1.**
- **Assumption B:** 50–70% of those are converted to an approval or a cured send-back.
- **Result:** about **22,000–51,000 fewer avoidable caste rejections a year**. At ₹261 in lost wages, plus travel and re-application, that is **₹1–2.5 crore a year** in citizen costs, before counting missed scholarships and job windows. The government critic notes the rupee savings roughly break even with cost, so the real value is fairness, reduced litigation, deadlines met, and fraud signals.
- **Officer time:** about 5.3 lakh caste applications a year. If 40–60% reach *records complete* and scrutiny drops by about 5 minutes each, that saves **about 18,000–26,000 SDO/Tehsildar hours a year** [assumption].
- **Compounding asset:** every certificate issued becomes evidence for the next family member, so the hit-rate grows every year.
- **Cost** [rough estimate, for discussion]:
  - Retrospective study: ₹10–25 lakh.
  - 90-day shadow pilot: ₹0.8–1.5 crore.
  - State-wide over 5 years: ₹10–20 crore, about 2–4% of the ₹500 crore AI Mission.

---

## 4. The ask (last slide, word for word)
> **"We are not asking you to change a single decision. We ask for three things:**
> 1. **A 6-week retrospective study inside the SDC.** It uses de-identified data on about 20,000 already-decided caste and domicile applications from 2 districts. It measures how often a family certificate already existed, and how often it was used.
> 2. **If the study clears the bar, a 90-day shadow pilot.** It covers 2 sub-divisions, compared against 2 matched control sub-divisions, and runs silently inside Sewa Setu. It is CPU-only, stays inside the SDC, and runs under a one-page Revenue GO.
> 3. **A 7-member review group chaired by Revenue**, with CHiPS, the Tribal Department/HPSC, Law, the Tehsildar association and IIIT-NR as independent evaluator. It has the power to stop the pilot.
>
> **CHiPS owns the code. Revenue owns the decisions. Officers keep the pen."**

**Go/no-go after the study:**
- at least 15% of caste applications have a verifiable family certificate
- false-match rate at most 2% on a manually checked sample of 300
- at least 20% of past caste rejections had a family certificate available

**Pilot success targets:**
- match precision at least 98%
- flag precision at least 80%
- officer usefulness at least 60%
- scrutiny time at least 20% lower on complete cases
- send-back cure rate at least 50%
- **exclusion guard:** no-match and category/gender rejection rates no worse than +1 percentage point vs control

**Kill criteria:**
- any match to a cancelled certificate reaching "complete" without a warning
- false-match rate above 2%
- any order citing the tool as its ground
- exclusion rate worse by more than 2 percentage points
- any data egress
- officer use below 30% by week 6

---

## 5. 24-hour build (scope cut to 4 deep features)
| Keep and build deep | Show as "designed" (one architecture box) | Drop from stage |
|---|---|---|
| Lineage match + learned model + evaluation | Bhuiyan/Khadya evidence rows (mock) | Officer anomaly scoring / off-hours flags |
| Reasoned send-back + citizen Hindi message | Role-aware routing (config) | Live Aadhaar QR crypto (backup slide) |
| Kendra pre-check | pHash duplicate flag (one flag in the conflict case) | Voice; any Chhattisgarhi/Gondi claim |
| Real-MIS consistency view + evaluation panel + audit log | Risk-based r.15(2) audit list | Community names beside flags; the word "fraud" on screen |

| Owner | Tonight | Morning |
|---|---|---|
| **P1: Data/ML** | Synthetic population of 20–50k people (`data/synthetic/cg_name_seeds.json`, LGD villages), with families, 2015–2026 certificates, spelling variants and cancelled certificates. Splink model, then P/R overall, on a hard slice (common surname, same village) and by district group. Rules: permanent/competent/not-cancelled plus the synonym table. | Eval numbers onto the slide; reset script |
| **P2: App** | FastAPI + React (shadcn with UX4G colours). Screens: operator pre-check, officer queue and case (side-by-side evidence, weight waterfall, draft order, sign), citizen message preview, Collector view on the **real CSVs + GeoJSON** (`data/`), audit log. Persistent "SYNTHETIC DATA / नमूना" banner. | Offline hardening, record backup video |
| **P3: Story** | 11-slide deck (§6), the chart `data/rejection_by_service_and_district_2026-09-27.png`, architecture diagram, backup slides, Q&A owners | 3 timed rehearsals |

**Stack:**
- Python 3.11 (`uv`), Splink + DuckDB, RapidFuzz, zen-engine, Jinja2 templates.
- LLM message: `gemma` via Ollama locally, or the template. **No cloud LLM in the demo.**
- tesseract.js `['eng','hin']` only on a pre-loaded clean sample.
- React + Cytoscape.js + react-simple-maps. **Not react-leaflet** (licence).

Details are in `research/04_technical_toolkit.md`.

---

## 6. Deck: 11 slides, 10 minutes, ≤25 words per slide
| # | Slide | Time |
|---|---|---|
| 1 | **Sunita's story.** 18, Kondagaon, needs an ST certificate for a scholarship. Her father's certificate is already in Sewa Setu (2019). She's asked for 1950-era papers. | 0:40 |
| 2 | **Sewa Setu solved speed.** 95.7% on time, 900+ services, WhatsApp, QR, DigiLocker. *Next frontier: consistency.* | 0:40 |
| 3 | **Where rejections come from.** The chart: caste is 22% of volume and 62% of rejections. District range 2.3–13.2% on a neutral map. No "worst" labels. | 0:50 |
| 4 | **The insight.** "The proof is already in your archive." One line each: r.3(3) and HC 22-07-2026. | 0:40 |
| 5 | **Praman Setu on one page.** Four touchpoints. "The officer decides. Always." | 0:50 |
| 6 | **How it works.** Rules for reasons, learning for matching, three neutral lanes, never auto-reject. | 0:50 |
| 7 | **Architecture and integration.** SDC sidecar, webhook, read-only replica, API Setu fetch-by-ID, self-hosted models, audit log. | 0:50 |
| 8 | **Evaluation and fairness.** P/R overall, hard slice and by district group; message checker (0 unsupported entities out of N); "real calibration in shadow mode, where every officer confirmation is a label". | 0:50 |
| 9 | **Guardrails.** The five icons. | 0:30 |
| 10 | **Impact.** Ranges with Assumption A stated as the thing the study measures; the compounding-asset line. | 0:50 |
| 11 | **The ask.** §4, word for word. | 0:40 |

**Backup slides:**
- archive hit-rate SQL
- cost estimate
- DPDP/CERT-In detail
- legal precedents (Jadeja, Kranti, Kerala HC, SC/Gujarat HC on AI citations)
- Haryana/Karnataka/AP comparison ("proven patterns, new for CG certificate officers")
- Samagra Vedika / Robodebt lessons
- a rule file with its unit test

## 7. Demo: 5 minutes, fully offline
Final click path (round 5; every step is one click in ⋯ → "Demo mode", or "डेमो ▾" in the console header). Details: `app/iterations/round5_changes.md`.

| Time | Screen |
|---|---|
| 0:00–0:20 | **Landing → Sewa Setu console, pending list.** "सेवा सेतु में खोलें (एसडीओ)" → tick "प्रमाण: तात्कालिकता से क्रम". "This is Sewa Setu's own pending list. We add one column." |
| 0:20–1:05 | **Console 08790 (clean file).** Row → "निर्णय / जांच सूची" → "यह प्रारूप उपयोग करें" (123/200 remark + order PDF) → ◉ अनुमोदित → ✔ सबमिट → Space → ↵ → ✓ declaration → 123456 → Sign PDF → OK. Tick "प्रमाण सेवा उपलब्ध नहीं" for 3 s, untick. "Same Approve, same DSC token. If we are down, nothing changes." |
| 1:05–2:20 | **Sunita 08812.** Point at the spelling-mark row → C → ↵ → Ctrl+↵ → Space → ↵. The page stays on her file with the WhatsApp message (strong link, 98% inside "क्यों?"). "Only the officer decides it is her father. The order cites certificate 004512 and r.3(3)." |
| 2:20–2:55 | **Pooja 08835 send-back** (no caste proof, no father's income certificate): S → Ctrl+↵ → Space → ↵ → plain-Hindi message. "Missing data never becomes a rejection. Same application, no new fee, 30 days." |
| 2:55–3:40 | **Kiran 08841 needs attention** (brother's certificate in another category; category labels only): R → pre-filled vanshavali → Ctrl+↵ → Space → ↵ → "पटवारी के पास 0/7". "The officer decides; we make sure they see it." |
| 3:40–3:55 | (optional) Meena 08856: X only → "सुनवाई सूचना (15 दिन)" → Esc. "Rejection is impossible without a hearing notice." |
| 3:55–4:35 | **Collector, REAL MIS** (dated): tiles → 22%→62% (hypothesis, measured in pilot week 1) → camp 38% vs 19% SC/ST (a difference, not a cause) → pilot stop rules. |
| 4:35–5:00 | **Audit.** 004512 is pre-filled → खोजें → "नागरिक को यह सूची दें". "Every access is logged." |

Kendra pre-check and shadow mode move to Q&A.

**Demo hygiene:**
- one laptop, ONE browser window, ONE tab: open `http://localhost:5173/?demo=reset` 2 minutes before (resets data, policy and every UI mode; language HI)
- no other sessions or agents on :8000 during the demo; no code edits (no hot reload)
- browser zoom 100%; F11 on a 1366×768 screen (the app also fits a 1366×657 window)
- everything cached offline (the app falls back to bundled fixtures if :8000 is down)
- a `reset_demo.sh` script
- a backup video in a second tab
- no live typing of long strings
- no live OCR on degraded scans

## 8. Stage rules
- **Credit Sewa Setu in the first minute.** Never say "wrong decisions", "officers incentivised to reject", or "worst district".
- **Caste sensitivity:**
  - no real community name next to a flag
  - no fake-Baiga news as a hook
  - lead with helping genuine applicants; fraud signals are secondary
- **Every number carries its source or the word "assumption".** Mark real data as REAL and dated, and synthetic data as SYNTHETIC.
- **Legal points get one line on stage; the rest goes to backup slides.** Verify the HC case names and dates before quoting them (sources differ by a day on the Sonkar case).
- **Q&A pattern:** concede what's true, name the mechanism that will measure it, then point to a backup slide.
  - The tech lead takes the architect and IIIT faculty.
  - The story lead takes CHiPS and industry.
  - Invite the CHiPS head's expertise, e.g.: "Does the archive store father's name as a structured field?"
