# Praman Setu (प्रमाण सेतु): Final Assessment
Sewa Setu Innovation Hackathon (CHiPS), PS1 "Artificial Intelligence and Automation". Judged 28-09-2026.
Written 27-09-2026 (evening). **Part A: sections 1–3** (files only). **Part B: sections 4–6** (the running app, used as the SDO; appended the same night).

**What was read:** the PS1 text and rubric (`Sewa_Setu_Innovation_Hackathon_Proposal.pdf`), `SEWA_SETU_PLAN.md` (v4), `IMPACT_ANALYSIS.md`, `research/00, 05, 06, 07`, `critique_1_officer.md`, `critique_3_jury.md`, `app/ITERATION_LOG.md`, `app/iterations/round1–4_changes.md` and `round5_critique.md`, `app/CONTRACT.md`, `data/sewasetu_mis_service_2026-09-27.csv`, `data/sewasetu_mis_district_2026-09-27.csv`, `data/sewasetu_official_ranking_district_agg_2026-09-27.csv` and `app/backend/model/eval.json`.
**Method (Part A):** files only. The running app was not opened or touched. App behaviour is taken from the round logs, the contract and a read of the source.

**Tags on every number**

| Tag | Meaning |
|---|---|
| **[M]** | **Measured by us**: computed from the real MIS CSVs, from `eval.json`, or measured in the app during rounds 1–5 |
| **[S]** | **Sourced**: a public document, report, video or court report cited in `research/` |
| **[U]** | Sourced but **unverified** (the period or definition is unclear) |
| **[A]** | **Assumption**: our estimate, with its basis stated |

---

## 0. Five things this assessment found that the deck must fix

1. **Plan §0 misstates the volume share.** It says caste and domicile are "32% of Sewa Setu applications but 82% of all rejections". From the MIS, caste (22.2%) plus domicile (19.5%) is **41.6% of applications** [M]. The 82% of rejections is correct: 81.7%, or 83.0% with camp caste included [M]. **Say "42% of applications, 82% of rejections"**, or "caste alone: 22% of applications, 62% of rejections".
2. **The model misses its own pilot bar at the exact threshold.** On synthetic data, precision at the exact threshold is **89.4%** [M]. The plan's pilot target is match precision ≥ 98%, and its kill criterion is a false-match rate above 2%.
   - The design already covers this: every *found* match needs the officer's "same family / not this family" decision with grounds.
   - **Say it on the evaluation slide before the IIIT juror does:** "about 1 in 10 strong links is wrong on synthetic test data, so a human confirms every found link. The pilot gate is measured on a real labelled sample of 300."
3. **Three things the plan describes are not in the app:**
   - an LLM rewrite of citizen messages (the app's generator is `template` plus an entity checker)
   - GoRules zen-engine (the rules are Python in `rules.py`)
   - OCR and the pHash duplicate flag (neither is in the code)

   The architecture slide must describe what was built, and label the rest "designed, Phase 2".
4. **Round-5 bugs had not landed when this was read.** A reading of the source found all of these still present:
   - auto-advance still defaults to on, which makes the hero WhatsApp shot vanish (P0-1)
   - the tagline still says "AI Evidence Assistant" (P1-1)
   - the Collector over-claim "अधिकांश अस्वीकृतियाँ उस प्रमाण से जुड़ी हैं…" is still in `Collector.tsx:123` (P1-7)

   Another agent is finishing these.
5. **No deck and no architecture diagram exist yet in the repo.** Rubric head 1 (20 marks) depends entirely on them.

---

## 1. PS1 coverage map

### 1.1 The six suggested focus areas

**Depth scale:**
- **0**: none
- **1**: roadmap or mock only
- **2**: working demo
- **3**: working and evaluated

"Where in app" gives the route and backend file.

| # | PS1 focus area | What Praman Setu does | Where in app | Depth | Evidence | Honest gap |
|---|---|---|---|---|---|---|
| 1 | **Citizen assistance & intelligent service discovery** | **Kendra pre-check** before the fee is paid: the operator enters the father's name and village; with a consent tick, the system searches the archive and shows "matching family certificate found, attach it; the officer will confirm", plus the service's document checklist. **Plain-Hindi citizen messages** for send-back, approval and hearing notices (WhatsApp/SMS preview), curable without a new fee, carrying a "records used / seen" line and a grievance route. **"Who accessed my record"** list for the citizen (DPDP s.11). | `/kendra` (`engine.py` pre-check); message preview on the case page; `/audit` who-accessed; `messages.py`, `templates/msg_*` | **2** (assistance) / **0** (discovery) | Consent gate, declared-vs-Kendra-attached provenance and entity checker all verified in the browser in rounds 2, 4 and 5 [M]. The camp caste rejection rate is **41.3%** vs **20.0%** for regular caste (of decided) [M], so intake quality matters. | **No service discovery**: nothing helps a citizen find which service or which proof applies beyond the caste/domicile checklist. No chatbot or voice. Citizens are reached only through the operator and a message preview; nothing has been tested with a citizen. First-generation applicants get nothing new beyond "no record ≠ ineligible". |
| 2 | **Application scrutiny, document verification & automated validation** | **Learned record linkage** (Splink Fellegi–Sunter, EM-fitted m/u weights) links the applicant to a father's or sibling's certificate across Devanagari and Latin, spelling variants, consonant skeleton, Jaro-Winkler, LGD village and birth-year gap. Results come as exact / possible / none, with a weight waterfall. **Validity strip**: permanent, competent authority (a Tehsildar-issued policy setting), not cancelled or under scrutiny, QR (simulated), issue date not in the future. **Category consistency** against a caste synonym table. **Rule 3(3) checklist**, filling Sewa Setu's empty "जांच सूची" tab. | `/officer/case/:id` verdict card, comparison table, "क्यों?" waterfall; `/sewasetu/case/:id` checklist tab; `matcher.py`, `train_model.py`, `evaluate.py`, `rules.py`, `normalise.py` | **3** (evaluated, on synthetic data only) | `eval.json` [M]: 3,178 held-out applicants; 392,604 pairs; 4,883 true links. **Exact tier: P 0.894 / R 0.484. Possible tier: P 0.773 / R 0.836.** Blocking recall 0.982. Relation correct at exact = 1.0. The hard slice (common surname, same village) scores exact P 0.901 / R 0.930. 64 pytest tests pass [M]. | **All metrics are synthetic**; there is no real labelled sample yet. **Weak slices:** women's exact recall is 0.328 (the maiden-village search is not built) and Bastar/Surguja is 0.461 vs 0.508 for the plains [M]. **No OCR and no verification of uploaded scans**: the QR check is simulated, and a forged scan of a father's certificate is not detected unless its number is looked up. The synonym table is ours and has not been signed off by the department. |
| 3 | **Workflow automation & decision support** | **Record-cited reasoned orders**: Hindi is authoritative; each order has a number, jurisdiction, correct statute, "relied upon / not relied upon", and the officer's own finding box. Also built: a **send-back reason library** (11 caste reasons, 7 domicile); a **hearing notice before any rejection** (15 days); **role-aware routing** (forward a permanent caste file from a Tehsildar to the SDO); a **pre-filled Patwari vanshavali** request with a 7-day timer; a **3-key clean path**; a **sign tray** (≤ 5 files, one DSC passcode); callback within 10 minutes with a reason; **shadow mode**; fail-open "service unavailable"; and a **Sewa Setu console mock** with the real constraints (200-character remark, PDF ≤ 256 KB, SIGN WITH TOKEN). | `/officer` queue and "मेरा डेस्क" strip; case dock; `/sewasetu` console; `engine.py`, `api.py`, `templates/order_*.j2` | **2** (interaction counts measured; officer time not) | Clean file measured at **3 keystrokes** (Ctrl+↵ → Space → ↵) at 1366×768 and 1280×720, HI and EN; the sign sheet fits with no scroll on 8 demo files at 5 viewports [M, round 4–5]. Backend enforces 422 on a placeholder, a missing finding or an approval over a flag, and 409 on the wrong authority [M]. | Officer time has not been measured with a real officer. Hearing notices and Patwari timers are simulated. Order templates are our reading of the Act and still need legal vetting: the appellate authority, the tehsil → SDO map and the Sonkar WPC number are all marked "verify". |
| 4 | **Grievance & query resolution** | **Preventive, not reactive.** A specific, curable send-back reason (in place of a one-line reject) removes the most common reason to complain. The hearing notice gives an opportunity to object. The citizen message names a correction/objection route (CSC or Sewa Setu grievance), and the who-accessed list answers the DPDP question "who saw my data". | Case dock (S / X paths); citizen message; `/audit` | **1** | Send-back notice, hearing → reply/no-reply → final order all verified end to end [M, rounds 2–5]. | **No grievance intake, classification, routing or query bot.** Nothing reads Sewa Setu's auto-grievance dashboard. The "contest this flag" step from the plan is not built as a citizen action. |
| 5 | **Fraud, anomaly or risk detection** | The **"Needs attention" lane** flags internal inconsistencies: a relative's certificate in a different category; a cancelled or under-scrutiny certificate; a future-dated certificate; a temporary certificate offered as lineage proof; an incompetent issuing authority. **Anti-laundering:** a lineage match to a cancelled certificate can never reach "records complete". "Records complete" files are proposed as a risk-based r.15(2) audit sample. | Queue "ध्यान दें" chip; verdict card; `rules.py`, `engine.py` flags | **2** | Demo cases 08841 (category differs), 08856 (cancelled), 08863/08754/08721 (authority, scrutiny, date) all flag correctly, with tests [M]. | **Flag precision has not been measured** (the plan's pilot target is ≥ 80%). There is no pHash reuse flag, no image forensics and no anomaly model; officer anomaly scoring was dropped on purpose. The risk-based r.15(2) audit list is only a sentence. Flags depend on the archive recording cancellations, which is **unknown for the real archive** (critique 1 calls it "the single most dangerous data gap"). |
| 6 | **Operational analytics & productivity improvement** | **Collector view on the REAL MIS** (dated 27-09-2026): caste is 22.2% of volume but 61.9% of rejections; the district range is 2.3–13.2%; camp vs regular rejection; the Tehsildar-issued policy card; "awaiting Patwari" and "hearing pending" tiles; **pilot targets and stop rules** (targets, not results); a model card with its weak slices. **Audit log** with decision snapshots (what the screen showed). **Productivity:** evidence-sorted queue with a "next step" column, due-≤3-days filter, keyboard path, sign tray. District/tehsil level only, **no officer ranking**. | `/collector`, `/audit`, `/officer`; `mis.py` | **2** | Round 5 found the MIS figures match the data exactly: 53,85,535 / 48,63,282 / 3,64,124 / 95.7% / 2.3–13.2% / Kondagaon 11.6% [M]. Driver analysis (n = 33): no demographic driver, adjusted R² = 0.05, persistence ρ = 0.77 [M]. | There is no district × service split, because the public MIS doesn't expose one. No rejection-reason codes exist yet; Praman's reason-coded orders would create them, but that is a projection. Round-5 inconsistencies: the camp tile compares different bases (P1-5), and the Collector over-claim line (P1-7). No officer-time analytics. |

**AI techniques used, against the PS1 list** (the "where's the AI?" question):

| Technique named in PS1 | Status |
|---|---|
| ML | ✓ Unsupervised probabilistic record linkage (EM), evaluated with fairness slices |
| NLP | ✓ Indic transliteration, schwa deletion, phonetic folding, consonant skeleton; template NLG with an entity checker |
| Intelligent automation | ✓ Drafting, routing, pre-filled Patwari form, sign tray |
| Generative AI | ✗ Not in the app. It is designed as an optional citizen-message rewrite behind the checker. The template path is what runs. |
| OCR | ✗ |
| Computer vision | ✗ |
| Predictive analytics | ✗ Deliberately none: no risk scoring of people |

State this as a choice: "rules where the law demands reasons, learning where the problem is genuinely hard". Don't let it look like an omission.

### 1.2 PS1 "expected output" checklist

| Expected output | Status | Evidence | Gap |
|---|---|---|---|
| **Clearly defined use case** | ✅ Strong | Plan §0: find the family proof the state already holds for caste/domicile, at the Kendra and at the SDO desk. Grounded in real MIS [M], Caste Rules r.3(3) and CG HC 22-07-2026 [S]. | Assumption A, the share of rejected applicants whose relative's certificate is in the archive, is unmeasured. The use case's size rests on it (10–35%) [A]. |
| **Solution architecture** | ⚠️ Described, not drawn | Plan §2.4: an SDC sidecar triggered by a Sewa Setu webhook; a read-only nightly archive replica, blocked on LGD; API Setu `edistrictcg` fetch-by-ID only for verification; self-hosted and CPU-only; append-only audit. `CONTRACT.md` specifies the API. | **No architecture diagram file.** The plan still names zen-engine and an LLM that aren't built. |
| **Implementation approach** | ✅ Strong | Phase 0 (a certificate-number field plus a Revenue circular) → a 6-week retrospective study → a 90-day shadow pilot in 2 sub-divisions with 2 controls → a review group. Go/no-go thresholds, pilot targets, kill criteria and a cost band (₹10–25 L study, ₹0.8–1.5 cr pilot) [A]. Ownership line: "CHiPS owns the code, Revenue owns the decisions, officers keep the pen". | Cost is a rough, unvalidated estimate. Legal cover (a Revenue circular that the evidence card counts as due diligence) is an ask, not a given. |
| **Prototype / POC** | ✅ Strong | FastAPI + React, fully offline with a fixtures fallback. 7 working surfaces: landing, Kendra, officer queue, case, Sewa Setu console, Collector, Audit. 34 demo applications, an 8,754-certificate synthetic archive, a 17.6k-person synthetic population on real LGD villages. **64 tests pass**; build is clean; 4 critique-and-fix rounds plus a final bug bash [M]. | Round-5 P0s are open (auto-advance, reset toggles, fullscreen). The rehearsed demo runs about 7:00 against a 5:00 slot [M, round 5]. |

### 1.3 The seven solution principles

| Principle | Evidence | Gap / risk |
|---|---|---|
| **Citizen-centric** | Pre-check before the fee; a specific, curable send-back in plain Hindi with no new fee; a hearing before any rejection; "no family record is NOT a ground for rejection" shown on screen; a married-women recall note; the citizen can see who accessed their record. | Mediated through the operator; untested with citizens. First-generation, migrant and landless applicants gain only neutrality ("rich-get-richer" risk, `IMPACT_ANALYSIS` §2.1). |
| **Innovative** | Turns CHiPS's own archive into evidence under r.3(3); a learned cross-script matcher with a fairness slice; shadow mode as a labelling pipeline; fills the empty "जांच सूची" tab; the archive compounds (every certificate issued becomes evidence for the next family member). | The pattern exists elsewhere (AP across-the-counter, Karnataka e-Kshana/Kutumba, Haryana PPP) [S]. Claim "new for CG certificate officers", not "first in India". |
| **Practical** | Embedded in a recreation of the real console, keeping its real limits (200-character remark, 256 KB PDF, DSC token, 5 tabs) [S]; fail-open; 3-key clean path [M]; CPU-only; Phase 0 needs no AI. | The revenue-officer console specifics are unverified: Forward and Patwari legs, checklist content [U]. Adoption depends on a Revenue circular and on exclusion from speed-rank penalties during the pilot. |
| **Secure** | SDC-only, no external calls, no cloud LLM; purpose-bound search that runs only from inside an open application ("no free-text caste search"); Aadhaar, mobile and ration numbers masked (a test asserts no `\d{8,}` in drafts) [M]; consent at the Kendra; append-only audit with decision snapshots; DPDP and CERT-In retention stated. | The demo has no authentication (mock role picker). No threat model, STQC or GIGW work. Snapshots and override logs could be misused against officers, so the "not an officer metric" policy must hold in a GO. |
| **Scalable** | LGD blocking cuts crores of records to tens of candidates, keeping 98.2% of true links [M]. Evaluation of 392k pairs takes 3.7 s [M]. Rules and reasons are per-service config. Caste (SDO) and domicile (Tehsildar) both run. | Not load-tested against the real archive (3.2 crore *transactions* [S]). Only 2 service families are built. Name-quality problems in the real legacy data (Kruti Dev text, dropdown errors) are unknown. |
| **Interoperable** | API Setu `edistrictcg` fetch-by-ID for verification; LGD codes throughout; DigiLocker mention; mock Bhuiyan and Khadya rows in real API Setu response shapes; a webhook contract; the console mock maps to Sewa Setu statuses (Reject / Sendback / Approve). | There is no name-search API: a read-only replica needs CHiPS and Revenue approval. Phase 2 registries need a Revenue GO and the State Data Governance Committee. |
| **Measurable** | `eval.json` with slices [M]; go/no-go (≥ 15% hit rate, ≤ 2% false match on 300 cases, ≥ 20% of past rejections with a family certificate); pilot targets and kill criteria; an exclusion guard (no-match and category/gender rejection no worse than control +1 pp); impact ranges with the load-bearing assumption named. | The key number (A) is unmeasured. No baseline officer-time study exists; §3 below supplies a modelled one. Exact-tier precision of 89% fails the pilot's own ≤ 2% false-match bar unless officer confirmation is part of the measured system. |

### 1.4 How much of PS1 is addressed?

**Answer: about 65% (range 60–70%).** PS1 asks teams to *identify high-value areas* and build for them. It does not ask for all six areas, so the score is weighted by where the measurable pain is.

**Step 1: weight each focus area by the pain it can reach.**
- Delay is solved: 95.7% of applications are on time, and only 4,264 are past the SLA [M].
- The measurable pain is rejection. Caste plus domicile carry **81.7% of all rejections** on 41.6% of volume [M]. Caste alone carries 61.9% of rejections at a ~20% rejection rate, against 1.4% for income [M].
- Camp caste applications are rejected at 41% [M], so intake quality matters.

| Focus area | Weight | Why this weight | Depth (0–3) | Contribution |
|---|---|---|---|---|
| Scrutiny / verification / validation | 30% | Where rejections are created | 2.5 (3 on synthetic data, discounted for no OCR and no real labels) | 25.0% |
| Workflow & decision support | 20% | Reasoned orders, send-back vs reject, legal exposure | 2 | 13.3% |
| Citizen assistance & discovery | 15% | Intake quality (camp 41%) | 1.5 (assistance 2, discovery 0) | 7.5% |
| Operational analytics & productivity | 15% | Consistency (2.3–13.2% range), officer throughput | 2 | 10.0% |
| Fraud / anomaly / risk | 10% | Fake certificates are real (267 of 659 probed [S]), but secondary | 2 | 6.7% |
| Grievance & query | 10% | Downstream of rejection | 1 | 3.3% |
| **Total** | 100% | | | **≈ 66%** |

The unweighted breadth score is 11 of 18 depth points, or **61%**.

**Step 2: scope reality check.**
- The product **touches** the services carrying 82% of rejections.
- The lineage feature **directly cures** only the share of caste rejections where a relative's certificate exists: an estimated 10–35% [A], which is ~6k–36k avoidable rejections a year after conversion (`IMPACT_ANALYSIS`) [A].
- Send-back, pre-check and reasoned orders reach **all** caste and domicile files.
- The other ~100 services (58% of volume, 18% of rejections) are untouched, apart from the generic send-back pattern.

So the claim is **"deep on the highest-value slice of PS1"**, not "covers PS1".

---

## 2. Rubric self-assessment (5 heads × 20)

`critique_3_jury.md` predicted **≈68** for the v3 plan and **≈84** with its top-7 fixes. Status of those fixes against the current build:

| # | critique_3 top-7 fix | Status 27-09 evening |
|---|---|---|
| 1 | Learned linkage model + evaluation + fairness slice | ✅ Done (`eval.json`: hard slice, district groups, women, cross-script) |
| 2 | Citizen layer (Kendra pre-check, plain-Hindi send-back with checker) | ✅ Done. The generator is template-only (safer, but align the deck). |
| 3 | Reframe opening (person → credit Sewa Setu → data) | ⏳ Deck not built yet |
| 4 | Cut scope; drop officer anomaly scoring | ✅ Scoring dropped. The app grew *deeper*, not wider (safeguards, console, tray, Patwari), which is fine. |
| 5 | Reconcile numbers, one source, assumptions on each | ⚠️ `IMPACT_ANALYSIS` fixed the impact figures. Still open: plan §0 "32%" (should be 42%), the camp-tile basis, the Collector over-claim, "97%" in the plan vs 98.3% in the app. |
| 6 | Integration honesty (replica, fetch-by-ID, no free-text search, local model) | ✅ Done, and stronger than asked: the console is recreated from the public Aug-2026 walkthrough |
| 7 | Demo hardening (offline, banner, reset, backup video, 3 rehearsals) | ⚠️ Offline and reset are done. Open: the round-5 P0s, the 7:00 → 5:00 cut, the backup video, rehearsals. |

| Head | Sub-criterion | Evidence we have | Predicted | What would lift it |
|---|---|---|---|---|
| **1. PPT / Solution presentation** | Clarity of problem understanding | Real MIS service-wise table (hidden report found); 82% / 20% / 1.4%; district driver analysis; HC rulings; the officer-console research | **14–17** (critique_3: 14 → 17) | **Build the deck** (none in the repo) as the plan's 11 slides at ≤ 25 words each. Draw one architecture diagram of what is built. Use the chart `data/rejection_by_service_and_district_2026-09-27.png`. Fix "32%" → "42%". Tag every number REAL or ASSUMPTION. Add a "today vs with Praman" slide from §3 and part B. |
| | Logical structure and completeness | The 11-slide plan: story → credit → data → insight → product → how → architecture → evaluation → guardrails → impact → ask | | |
| | Architecture / workflow / visuals | Console screenshots, waterfall, verdict card, Collector map | | |
| | Clarity of expected outcomes | Impact ranges (6k–36k), go/no-go, pilot targets, kill criteria | | |
| **2. Physical presentation & communication** | Clarity and confidence | Round 5 produced an exact 5:00 click path with keys | **13–17** (critique_3: 13 → 16) | 3 timed rehearsals against the round-5 path. One tab, reset 2 minutes before, F11. Open with Sunita in Hindi. Two speakers with a clean hand-off. Rehearse the pre-empt: "1 in 10 strong links wrong on test data, so the officer confirms every found link." |
| | Team coordination | Q&A owners assigned in the plan (tech lead: architect and IIIT; story lead: CHiPS and industry) | | |
| | Depth of understanding | Very high: the Act and rules, HC rulings, the real console, MIS artefacts, automation-bias literature | | |
| | Responding to jury questions | A pre-written Q&A (critique_3 §1), backup-slide list, and "concede → mechanism → backup" pattern | | |
| **3. Idea thinking & innovation** | Originality and relevance | The only entry likely to work at the decision point, on the platform's own biggest rejection source | **15–18** (critique_3: 13 → 17) | Say once: "rules where the law demands reasons, learning where it is genuinely hard". Present Phase 0 (no-AI) → Phase 1 (learned) as judgment. Show the compounding-archive line. Credit AP, Karnataka and Haryana as precedents. |
| | Understanding of citizen and governance requirements | Four critiques (officer, citizen/operator, jury, government) folded in; hearing before reject; no officer ranking; Revenue owns the decisions | | |
| | Creative use of technology / process | Cross-script probabilistic linkage; shadow mode as a labelling pipeline; filling the empty "जांच सूची" | | |
| | Value over the existing approach | Today the console has no archive search, an empty checklist, a 200-character reason and no hearing step [S]. Praman adds all four. | | |
| **4. Technical feasibility & implementation** | Technical and operational viability | CPU-only; fail-open; embedded in the console's real constraints; 3-key clean path [M]; 64 tests [M] | **15–18** (critique_3: 15 → 17) | Architecture slide must match the build (no zen-engine, no LLM in the path). Backup slide with a rule and its unit test. One line of cost. Answer "DSC today, eSign being procured". Name the unknowns: revenue console Forward/Patwari legs, cancellation write-back in the archive. |
| | Architecture / stack | Splink + DuckDB, RapidFuzz, FastAPI, Jinja2, React; SDC sidecar; webhook; read-only replica; API Setu fetch-by-ID | | |
| | Integration, security, privacy, performance, maintainability | Masking; purpose-bound search; audit snapshots; DPDP s.11 who-accessed; blocking recall 0.982 and 3.7 s for 392k pairs [M]; versioned templates and rules | | |
| | Realistic implementation and resources | 6-week study → 90-day shadow pilot → review group; cost band [A]; ownership split | | |
| **5. Prototype / POC, impact & scalability** | Quality of prototype | 7 surfaces, offline, bilingual, 4 critique rounds plus a bug bash, real console constraints | **14–18** (critique_3: 13 → 17) | Close the round-5 P0/P1s. Show one **measured before/after**: today ~25–35 interactions and ~4 minutes per clean file (§3, modelled) vs 3 keystrokes (measured). Show the women's-recall weakness *with* its fix (maiden-village search, roadmap). Scale by adding a service as config (domicile already runs). |
| | Expected benefit to citizens and government | One visit instead of three; a deadline met; reasoned orders; consistency; reduced writ exposure | | |
| | Reduction in time, effort, cost, manual intervention | Clicks measured in-app [M]. Hours statewide are small (6k–23k a year [A]), so pitch quality, legal defensibility and fewer re-applications. | | |
| | Scalability across services, departments, districts, users | Per-service rules and reasons; LGD blocking; district-level Collector view; archive compounding | | |
| | **Total** | | **71–87, mid ≈ 80** | **84–88 is reachable** if the deck, rehearsal and round-5 P0s land tonight |

**Reading:** the build has earned most of critique_3's "+16". Heads 3 and 4 are at or above its "after fixes" level. Most of what is left sits in heads 1 and 2, where the deck and the delivery don't exist yet. Scores at state panels compress (most teams land at 55–80, per critique_3), so the rank matters more than the number.

---

## 3. BASELINE: a day in the life of an SDO (Revenue), Kondagaon, on Sewa Setu TODAY (no Praman)

This models **today's** process only. Part B will re-run the same file types and the same day with Praman, so the step IDs (S1–S12) and file types (i)–(iv) are meant to be reused.

### 3.1 Setting

| Item | Value | Tag / basis |
|---|---|---|
| Deciding officer for **permanent** SC/ST/OBC certificates | SDO (Revenue). Appeal goes to the Collector. | [S] 2013 Revenue notification; CG HC 21/22-07-2026 (Sonkar) says the Tehsildar is not competent |
| Portal time limit, caste | 22 days (the officer's own due date is ~4 days earlier) | [S] service page; the 4-day gap seen in the Aug-2026 walkthrough |
| Statewide caste applications | **~8.0 L a year** (11.98 L in 544 days, incl. camp) | [M] MIS |
| Caste rejection rate (of decided) | **SC/ST 19.0%, OBC 21.2%; together 20.2%** incl. camp | [M] MIS |
| Caste send-back rate | ≈ 1.0–1.3% (the unlabelled 4th-status bucket) | [U] 05 §1.3 inference |
| Kondagaon, all services | 1.78 L applications in 544 days (~1.2 L a year); 11.6% rejected of received, 12.3% of decided; 71% ST population | [M] MIS; [S] Census 2011 |
| Kondagaon caste files per SDO desk | **~55–75 a working day** (typical day modelled: **60**). District caste share taken as 22–30% of 1.2 L a year = 26k–36k, split across 2 SDO desks (Kondagaon, Keskal), over ~240 working days. | [A] The caste share is the state figure, adjusted up for a 71% ST district; the SDO count is from the app's mapping, marked "verify" |
| Peak / upper bound | **150–190 files a day**: the busiest logins in the ranking report | [U] period not stated; may be bulk-sign logins (05 §1.4) |
| Time the SDO has for the certificate desk | **2.5–4 h a day** on a typical day. The rest goes to revenue court, magistracy, meetings, field and VIP duty. On a peak day, 6 h. | [A] critique_1 role-play; 05 "6-hour day" |

### 3.2 Session overhead (once per sitting, spread over the day's files)

| Step | What happens in the real console | Time | Tag / basis |
|---|---|---|---|
| S0a Login | Home → **शासकीय लॉगिन** → username and password, **or OTP**, plus a numeric **captcha** | 0.5–2 min (OTP delivery, captcha retry) | Screens [S] 07 §2.1; time [A] |
| S0b Re-login after a timeout | **"Session TimeOut (In Minute) 05:00"** countdown in the top bar. Five idle minutes (a long scan, a phone call, a visitor) means logging in again. | 2–6 re-logins a day × 1–2 min = 2–12 min | Timeout [S] 07 §2.2; frequency [A] |
| S0c DSC token set-up | Plug the USB token (e.g. PROXKey); the local signer utility must run | 1–3 min a day (more if the driver misbehaves) | [S] 07 §2.7; national manual: Java + dongle driver [S]; time [A] |
| S0d Dashboard → service → pending list | 9 counter tiles; a per-service table; click the count | 10–20 s per trip | [S] 07 §2.3; [A] |
| **Session total** | | **~10–30 min a day** | [A] |

### 3.3 Per-file step model (one permanent caste certificate), in seconds unless noted

The file types:
- **(i) Clean**: good papers, including a relative's certificate or a misal the applicant uploaded.
- **(ii) Hero case**: no pre-1950 proof, but the **father holds a Sewa Setu certificate** that the applicant didn't upload.
- **(iii) Hidden conflict**: a sibling's archived certificate records a different category.
- **(iv) First-generation / no record**: landless, no misal, oral vanshavali.

| Step | What the officer does in today's console | (i) Clean | (ii) Hero | (iii) Conflict | (iv) First-gen | Basis |
|---|---|---|---|---|---|---|
| S1 | Pick the next file from the pending list. Rows show 🔴🟡🟢 SLA dots, the 16-digit number and 📎 count. The list is **not urgency-sorted**, and its Search box only filters pending rows. | 5–15 | 5–15 | 5–15 | 5–15 | [S] 07 §2.4; time [A] |
| S2 | Open the application (the page loads; slow in the afternoons) | 3–10 | 3–10 | 3–10 | 3–10 | [A] critique_1 (connectivity) |
| S3 | Tab 1 **आवेदक का विवरण**: name, father, address, Aadhaar (shown unmasked today) | 15–30 | 15–30 | 15–30 | 15–30 | [S] 07 §2.5; [A] |
| S4 | Tab 2 **आवेदन पत्र**: long scrolling form (claimed caste, purpose, witnesses) | 20–45 | 20–45 | 20–45 | 20–45 | [S]; [A] |
| S5 | Tab 3 **सहायक दस्तावेज**: 8–11 scans (affidavit, caste proof, Patwari/Sarpanch report or vanshavali scan, Aadhaar, residence, photo); open each in the viewer and zoom | 60–120 | **120–240**: hunts for pre-1950 proof; reads a blurry vanshavali and a Sarpanch letter | 60–120: **nothing on file reveals the conflict** | **150–300**: weighs oral vanshavali, a Gram Sabha proposal and whether a Rule 8 enquiry is needed | Attachment counts "(8)", "(11)" and the viewer [S] 07 §2.4–2.5; time [A] |
| S6 | Tab 5 **पूर्व निर्णय** (history). A green ✓ appears on each tab once visited. | 5–10 | 5–10 | 5–10 | 5–10 | ✓ ticks [S]; whether they are mandatory [U] |
| S7 | **Look for a relative's certificate in the archive** | 0: not needed | **0**: **the console has no search by name**. Optionally 5–15 *minutes* by phone to the record room or the legacy "e-District 1.0" link, rarely done at volume. | 0: the officer has no reason to look | 0: nothing exists | No search seen [S] 07; API Setu is fetch-by-ID only [S]; behaviour [A] |
| S8 | Decide: tab 4 **निर्णय / जांच सूची**. The checklist is **empty**. Radios: अस्वीकृत / आवेदक को वापस भेजें / अनुमोदित. | 5–15 | 30–90 | 5–15 | 30–90 | Empty checklist [S] 07 §2.6; [A] |
| S9 | **टिप्पणी** (remark), capped at **200 characters**, typed in Hindi | 10–20 ("सत्यापित, स्वीकृत") | 30–90 (reject or send-back reason) | 10–20 | 10–90 | Cap [S]; time [A] |
| S10 | Optional **दस्तावेज़ अपलोड** (jpg/png/pdf ≤ 256 KB), e.g. a typed reasoned order | 0 | 0 (rarely 60–120) | 0 | 0–60 | Limits [S]; use [A] |
| S11 | Approve: submit → "Generated Certificate For Signing" preview → declaration ("…as per the information given by the applicant") → **SIGN WITH TOKEN** → provider, certificate, **passcode** → Sign PDF → **निर्णय की पुष्टि**. Reject/send-back: submit and confirm. | 30–75 | 10–30 | 30–75 | 10–75 | Approve flow [S] 07 §2.7–2.8; reject flow not seen [U]; time [A] |
| S12 | Back to the list | 5–10 | 5–10 | 5–10 | 5–10 | [A] |
| | **Total per file (review time)** | **2.6–5.8 min (mid ≈ 4.2)** | **4.1–9.5 min (mid ≈ 6.8)**; +5–15 min if a manual lookup is attempted | **2.6–5.8 min (mid ≈ 4.2)** | **4.2–12.3 min (mid ≈ 8.2)** | Sum of the rows [A] |
| | **Interactions (clicks + typed fields)** | ~25–35 + 2 typed (remark, passcode) | ~25–40 + 1 typed | ~25–35 + 2 | ~30–45 + 1–2 | Counted from the verified flow: 1 row + 5 tabs + 8–11 thumbnails and zooms + radio + submit + declaration + 5-step token dialog + OK + back [A] |

### 3.4 What happens to each file type today

| Type | Likely outcome today | Why | Consequence for the citizen | Consequence for the officer / state |
|---|---|---|---|---|
| **(i) Clean** | Approve | The papers are on file | Certificate within the SLA | Fine. But the declaration only attests "as per the information given by the applicant". Nothing is cross-checked against records. [S] |
| **(ii) Hero**: father's certificate exists in Sewa Setu | **Reject (most) or send back** with a ≤ 200-character remark such as "1950 से पूर्व अभिलेख संलग्न करें" | The officer **cannot see** the father's certificate. Search by name doesn't exist, and the applicant didn't know to upload it. | Re-applies (new ₹30 fee, new file), or finds the father's certificate and resubmits. **+3 weeks or more**; ₹400–700 in wages, travel and fees; a scholarship or job deadline at risk. [S/A] `IMPACT_ANALYSIS` | **Writ-exposed.** CG HC 22-07-2026 (Bagel): refusal is wrong when the father or sister holds a permanent certificate [S]. **Officer time over the file's life: 7–16 min** (the first review 4–10 min, plus a second full review of the re-application 3–6 min) [A]. |
| **(iii) Hidden conflict**: a sibling holds a different category | **Approve** | The conflict sits in a record the console never shows | Fine for this applicant, until scrutiny | **The conflict is missed.** It surfaces only if the r.15(2) random ~10% post-issue verification or a complaint picks it up [S], possibly years later. Then come cancellation and a vigilance question for the signing SDO. 267 of 659 probed certificates were fake (GAD, Aug 2026) [S]. |
| **(iv) First-generation / no record** | Coin-flip between approve, reject, or send-back for a Patwari/Gram Sabha paper | The only evidence is oral: a Patwari vanshavali, a Gram Sabha proposal, a Sarpanch letter. The outcome depends on the officer's practice. | The most genuine applicants (landless tribals) face the highest rejection risk | The largest scrutiny time (up to 12 min), and the least defensible order either way. District spread under the same rules is 2.3–13.2% [M]. |

### 3.5 A full day (typical 60 files; peak 150 files)

**File mix assumed** (per 100 files at the SDO desk) [A]:

| Type | Share | Basis |
|---|---|---|
| (i) Clean | 63 | |
| (ii) Hero | 5 | Tied to Assumption A: 10–35% (mid 20%) of the ~20% rejected have a relative's certificate in the archive, so ~4% of files are hero-type rejections, plus a few that get approved anyway |
| (iii) Hidden conflict | 1 | Prevalence unknown |
| (iv) First-generation | 15 | critique_1's SDO guesses only 10–20% of files have a relative's certificate at all |
| (v) Other deficient | 16 | Missing affidavit or OBC income proof, duplicate, illegible scan, wrong service |

**Outcomes per 100 files, calibrated to the MIS:**

| Type | Rejected | Sent back | Approved |
|---|---|---|---|
| (ii) Hero | 4 | 0.5 | |
| (iv) First-generation | 7 | 0.5 | |
| (v) Other deficient | 9 | 0.5 | |
| **Total** | **20** | **1.5** | **78.5** |

That gives **20.3% rejected of decided**, against **20.2% in the real MIS** [M].

**Modelled mean review time:**
- 0.63 × 4.2 + 0.05 × 6.8 + 0.01 × 4.2 + 0.15 × 8.2 + 0.16 × 5.0 = **≈ 5.1 min per file** (range 3.0–7.2) [A].
- The type-(v) figure of 5.0 min (range 3–7) is an assumption.

| Output (per SDO per day) | Typical day (60 files) | Peak day (150 files) | Tag |
|---|---|---|---|
| Files decided | 60 | 150 | [A] / [U] |
| Review time needed at the modelled pace, plus session overhead | 60 × 5.1 = **5.1 h** + 10–30 min ≈ **5.3–5.6 h** | 150 × 5.1 = **12.8 h** + overhead | [A] |
| Time actually available | 2.5–4 h | ~6 h | [A] / [U] |
| **Minutes per file actually spent** | **2.5–4.0**, i.e. 20–50% below the modelled need | **≈ 2.4**, over 50% below | Derived [A] |
| Where the cut falls | **S5, the documents tab**: skimmed, or pre-screened by the computer operator. The ✓ tab ticks prove a visit, not scrutiny. | Same, more severe | [A] critique_1 ("the operator drives the screen, the officer signs") |
| Interactions | ~1,500–2,100 clicks + ~120 typed fields | ~3,750–5,250 + ~300 | [A] |
| Approvals / send-backs | 47 / ~1 | 118 / ~2 | [M]-calibrated |
| **Rejections issued** | **12** | **30** | [M]-calibrated (20.2%) |
| …of which a family certificate already sat in the archive (hero-type) | **1.2–4.2 (mid 2.4)** | 3–10.5 (mid 6) | [A] Assumption A |
| …of which first-generation / no-record | ~4 | ~10.5 | [A] |
| **Re-applications generated** (new ₹30 fee, new file) | **5–7**. That is ~8–12% of a future day's queue as rework. | 12–18 | [A] 40–60% of rejected applicants re-apply |
| **Orders without written reasons** | **12 of 12 rejections.** The only reason field is a ≤ 200-character remark, and the console has no reasoned-order template or hearing step. | 30 of 30 | Cap and no template [S] 07; count [A] |
| **Conflicts missed** | **~0.6** (≈ 145 a year per SDO) | ~1.5 (≈ 360 a year) | [A] 1% prevalence; ~90% never caught, since only the ~10% random r.15(2) sample checks after issue [S] |
| **Writ exposure** | **~2.4 rejections a day** contrary to CG HC 22-07-2026 (≈ 575 per SDO-year at 240 days); every rejection lacks a speaking order (Allahabad HC 30-07-2026, persuasive; *Kranti Associates*) | ~6 a day (≈ 1,440 a year) | [A] from Assumption A; rulings [S] |
| Citizen cost of the day's rejections | 12 × ₹400–700 = **₹4.8k–8.4k**, plus ~3 weeks each | ₹12k–21k | [S/A] `IMPACT_ANALYSIS` |

**Statewide sanity check:**
- ~8.0 L caste files a year × 5.1 min ≈ **68k SDO-hours a year (~36 officer-years)** of review [A].
- ~1.5 L caste rejections a year [M]. Of those, 15k–53k had a family certificate in the archive [A].
- At a 40–60% re-application rate, **60k–90k re-application files a year**, or 7.5–11% of caste volume, are rework the system generates for itself [A].

### 3.6 Stress points on the SDO today

| Stress point | Detail | Tag |
|---|---|---|
| **Public speed ranking** | `H = 0.5·C − (0.3·E + 0.2·G)`: Approve, Reject and Sendback all count as "processed". Nothing scores correctness or reversal on appeal. Reviewed at the Collector's meeting. | Formula [S]; meeting [A] |
| **Delay penalties and notices** | LSG Act: ₹100 per late application (Abhanpur steno fined ₹1,700 on 17-09-2026). "LSG show-cause notices" and an "auto-grievance dashboard" sit in the officer's own sidebar. | [S] |
| **SLA squeeze** | 22 days in all, with the officer's due date ~4 days earlier. The Patwari vanshavali can consume ~2 weeks of it. | SLA [S]; Patwari time [A] critique_1 |
| **Volume shock after July 2026** | Sonkar (HC, 21/22-07-2026) moved permanent caste certificates from Tehsildar desks to fewer SDO desks | Ruling [S]; effect [A] |
| **Strikes, backlog and vacancies** | Tehsildar strikes (Jul–Aug 2025, Jun 2026) left 20,000+ files stuck. Dhamtari receives 400+ a day but disposes of ~200. 911 Patwari and 393 RI posts are being filled. | [S] 00 §2 |
| **Fear of vigilance** | The SDO is the named competent authority. A fake certificate found years later lands on the signer. "The system said so" is no defence (*Jadeja*). | Law [S]; fear [A] critique_1 |
| **Fear of courts** | Bagel (relative's certificate), Sonkar (competence), Allahabad (reasoned orders plus a chance to cure): the rules tightened in July 2026, and the console did not change | [S] |
| **Tool friction** | 5-minute session timeout; captcha and OTP; DSC token dialog on every approval; no archive search; an empty "जांच सूची"; a 200-character remark cap; a list not sorted by urgency | [S] 07 |
| **Working conditions** | Afternoon slowness, BharatNet and power outages; the operator often drives the screen | [A] critique_1 |

### 3.7 What the baseline tells part B to measure

**Time goes into:**
- **S5**, the documents tab: 40–60% of file time.
- **S11**, the signing ritual: ~1 min on every approval.
- **Rework**: the second review of each re-application.

**Risk sits in:**
- **(ii)**: rejections that the HC has already called wrong.
- **(iii)**: conflicts that are structurally invisible.
- **(iv)**: unreasoned orders on the most vulnerable applicants.

**Metrics to re-run with Praman, on the same mix:**
- minutes per file, by type
- interactions per clean file (baseline ~25–35, modelled)
- hero-type rejections per day (baseline ~2.4)
- re-applications generated (baseline 5–7)
- orders with record-cited reasons (baseline 0 of 12)
- conflicts surfaced at decision time (baseline ~0 of 0.6)
- writ-exposed rejections (baseline ~2.4 a day)
- time on the certificate desk against the time available (baseline 5.3–5.6 h needed vs 2.5–4 h available)

---

# Part B (27-09-2026, night): the same officer, using the running app

**Method.** I played the SDO (Revenue), Kondagaon, on the live app (`http://localhost:5173`, backend `:8000`), browser tab-1 at 1366×657, Hindi UI. Started from `POST /api/reset` + `/?demo=reset`; reset again at the end (tray empty, 28 pending, 0 staged; viewport back to desktop). I worked the queue like a desk day: 13 applications opened, 11 decided by me, 2 left for the Keskal SDO. Timestamps are `Date.now()` in the page before and after each file. 0 console errors.

**Read these numbers carefully.**
- The files are **synthetic** (34 demo applications on a synthetic archive). The "user" is an expert who helped build the tool and knows every key.
- Agent seconds are **not officer seconds**. I don't physically read, and tool-call latency adds its own time. The *counts* (keys, clicks, screens, typed characters) are real. The *minutes* in §4.3 are converted with a stated model.
- The app shows **no scanned documents**: the "सहायक दस्तावेज" tiles are placeholders. A real officer still opens scans in Sewa Setu, so §4.3 adds that time back.

---

## 4. Same officer, with Praman Setu

### 4.1 What I did, file by file (measured)

Key names: C = वही परिवार, N = यह परिवार नहीं, R = संदर्भित (Patwari), S = वापस भेजें, X = अस्वीकृत…(hearing notice), A = स्वीकृत, J = next, ↵ = Enter.
Screens: Q = queue, K = case page, SS = "read before signing" sheet, M = citizen-message card, T = sign tray, Con = console list → tabs → SIGN WITH TOKEN → निर्णय की पुष्टि.

| # | File (baseline type) | Keys / clicks / typed | Agent s | Screens | What the tool surfaced that the baseline officer would **not** see | Decision (doc no.) | Reasoned, record-cited? | Plain-language reason to citizen? | Rejection avoided / converted? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **08743** Radha: clean, brother's cert declared on Form 2A (i) | 1 click + **3 keys** (Ctrl+↵ Space ↵). The first Ctrl+↵ didn't register because focus was still on the row. | 39 | Q→K→SS→M | The *declared* certificate CG/KDG/SDO/2026/000419 **checked against the archive**: permanent, active, competent SDO, QR (simulated). Name, father, village (LGD) and category compared row by row. Ration list corroborates. | Approve, SDO-KON/2026/0001 | Yes. "आधार अभिलेख", relied / not relied, "अधोहस्ताक्षरी का समाधान" | Yes. WhatsApp names the certificate number, "records used" and the grievance route | n/a |
| 2 | **08863** Anil: clean, but the father's 2017 cert was **Tehsildar-issued** (i) | **3 keys** (Ctrl+↵ Space **Ctrl+S** → tray) | 17 | K→SS | Issuer "तहसीलदार (2017), accepted under the department's policy setting (note)". Spelling Sukhram / Sukh Ram explained. 6/6 validity checks | Approve via tray, 0006 | Yes | Yes | n/a |
| 3 | **08758** Nirmala: clean on paper; a **second brother** was found by the system (i) | J, Ctrl+↵ (**blocked**: "पहले संबंध तय करें"), tab click, C, ↵, Ctrl+↵, Space, Ctrl+S = **8** | 59 | K→SS→T | A second brother's cert 2022/000629 whose father is spelled "Baliram **Kumar Jadav**". The queue said "हस्ताक्षर हेतु तैयार", but the case page demanded a C first. | None by me. It is a **Bade Rajpur → Keskal** file, so I took it out of my tray | (the draft cited both certs) | — | — |
| 4 | **08732** Sohan: clean (i) | **3 keys** → tray | 8 | K→SS | Sister's 2023 cert verified | Approve via tray, 0007 | Yes | Yes | n/a |
| 5 | **08772** Samundri: father's cert **attached by the Kendra after its pre-check search** (ii, cured at intake) | C, ↵, Ctrl+↵, then Esc | 22 | K→SS | Evidence arrived with the file ("केंद्र द्वारा खोज के बाद संलग्न — आपकी पुष्टि आवश्यक"). The order was headed **"SDO, Keskal"** | None: another sub-division | — | — | Prevented upstream |
| 6 | **08812** Sunita: **hero**, father's cert not uploaded (ii) | 1 click ("क्यों?") + **5 keys** (C ↵ Ctrl+↵ Space ↵) | 25 | K→SS→M | Father's cert **2019/004512 found by the system**. Ramlal Markam ↔ Ram Lal Markaam; same LGD village; a 32-year birth gap. Waterfall: +5.3 surname, +6.3 village, +6.8 name. "About 1 in 10 strong links was wrong on synthetic data" | **Approve with family proof**, 0002 | Yes. The order records my grounds and the spelling variant | Yes | **Yes**: today this is a reject or send-back for want of pre-1950 proof |
| 7 | **08841** Kiran: **conflict** (iii) | **4 keys** (R Ctrl+↵ Space ↵) | 17 | K→SS→M | Brother Manoj's 2020 cert records **OBC (Kalar)**; Kiran claims **ST (Gond)**. Invisible today | **Patwari referral**, REF/2026/0001: 7 days, pre-filled vanshavali, 5 specific points | Yes. "यह संदर्भ आवेदक के विरुद्ध कोई निष्कर्ष नहीं" | Yes, neutral: "सामान्य जांच", no new fee | Silent approval → verification |
| 8 | **08870** Ramesh: **first-generation**, OBC (iv) | 2 clicks (which document proves caste; which proves pre-1984 residence) + 3 keys. **Callback** after 2 min (reason, 50 characters), re-approved with one line edited into the draft | 23 + 48 | K→SS→M, then K→SS→M | Only "no family record — **not a ground for rejection**" and a document checklist. **No scans shown** | Approve, 0003 → **called back** → 0004 | Yes. My edit added the **creamy-layer finding the template omits**; the audit shows "system text EDITED" | Yes ("आपके संलग्न दस्तावेज़") | n/a |
| 9 | **08835** Pooja: missing documents (v) | **4 keys** (S Ctrl+↵ Space ↵) | 13 | K→SS→M | Missing caste proof and father's income certificate, both pre-ticked from the checklist | **Send-back** with 2 specific points, notice NTC | Yes | **Yes**: 2 numbered points, 30 days, same application, no new fee | **Converted**: a likely "documents incomplete" rejection |
| 10 | **08856** Meena: father's cert **cancelled** | X, click, **135 characters typed** (grounds), Ctrl+↵ Space ↵ | 26 | K→SS→M | Father's cert 2016/002207 **cancelled by the District Scrutiny Committee** (DVC/KDG/2024/117). Today it could even be uploaded as proof | **Hearing notice**, HRG/2026/0001, reply by 12-10-2026. The final order is blocked until a reply or lapse | Yes: records relied on, my grounds, 15 days, personal hearing | **Partly**: WhatsApp says a notice was issued and how to reply. The ground itself is only in the notice | Reject-without-hearing → hearing |
| 11 | **08778** Tarun: **no caste proof uploaded**, 3 archive candidates, **4 days of SLA left** (ii-type) | About **14 actions + 95 characters typed** (tab clicks, N misfire, Esc, N on father with ground, C on brother, A, written finding, Ctrl+↵, Space ×2, ↵) | 140 | K→SS→M | Brother 2020/000307 valid. Brother 2026/000511 flagged "dated after the application". "Father" is a *temporary* cert from a *different village* (Keskal), which I marked not-family | **Approve over the flag with a written finding**, 0005. The order says "सुझाव से भिन्न" and lists the not-relied records with reasons | Yes | Yes | **Yes**: today, no caste proof means reject or send-back |
| 12 | **08842** Nirmala M.: first-gen, **already sent back once**, married woman (iv) | **4 keys** (R Ctrl+↵ Space ↵) | 23 | K→SS→M | "पहले 1 बार वापस". A women's-recall caveat. Nothing in the archive | **Patwari referral**, REF/2026/0002 (not a 2nd send-back). The Patwari fetches the vanshavali, so no trip for her | Cited, but **thin**: "reasons recorded below", with none specific | Yes: "अभी आपको कुछ नहीं करना है… कोई नया शुल्क नहीं" | Possible 2nd send-back or rejection → enquiry |
| 13 | **Sign tray** (08863 + 08732) | Open tray, remove 08758, sign, 6-digit passcode, ↵ | 36 | Q→T | — | 2 orders, **one DSC transaction** | — | — | — |
| 14 | **08790** Rohit via the **Sewa Setu console + Praman panel** (i) | Row, सहायक दस्तावेज, निर्णय/जांच सूची, **"यह प्रारूप उपयोग करें"** (fills the 123/200 remark and attaches a 23 KB order PDF), ◉ अनुमोदित, ✔ सबमिट, Space, ↵, declaration ✓, passcode, Sign PDF, OK, back = **13 actions + passcode** | 52 | Con (list, 3 tabs, sheet, token, confirm) | The "जांच सूची" tab is **filled** ("प्रमाण सेतु द्वारा भरी गई"). The DSC declaration reads "…and matched with the records listed in the attached order" | Approve, 0008 | Yes (order PDF) | Yes | n/a |

**Session totals [M]**
- 653 s of agent time for 13 files (median about 24 s a file).
- **11 decisions:**
  - 7 approvals: 2 of them on family proof the baseline officer would not have had (08812, 08778; 08772 was solved upstream at the Kendra and left for Keskal); 2 via the tray; 1 via the console
  - 1 send-back
  - 2 Patwari referrals
  - 1 hearing notice
  - **0 rejections**
  - 1 callback
- **11 of 11** decisions produced a signed, numbered, record-cited document with a matching citizen message.

### 4.2 Where the tool slowed me down, or where I wouldn't trust it (honest)

| # | Issue | Seen on | Cost / risk | Severity |
|---|---|---|---|---|
| 1 | **Keyboard C/N acts on the "key target", not on the candidate tab being viewed.** While looking at the flagged father tab I pressed **N**, and the card jumped to the *valid* brother (2020/000307) with "यह परिवार नहीं" open for him. The grounds popover, ↵ and undo guard it, but a hurried officer could reject the good link. Source: `frontend/src/pages/CaseView.tsx:124` (`keyTarget = pendingMatch ?? undisposedMatch ?? …`). | 08778 | About 6 extra actions. Wrong-record risk | **P1** (fix: key acts on the open tab) |
| 2 | The queue says "हस्ताक्षर हेतु तैयार", but the case blocks signing until a second, undeclared relative is confirmed | 08758 | +4 actions on a "ready" file | P2 |
| 3 | The flag "sibling's certificate dated after the application" (`rules.py:227`, `engine.py:246`) fires on a brother's **normal later certificate**. It moved the file to "needs attention" and suggested the **District Scrutiny Committee with 4 days of SLA left** | 08778 | A 95-character override finding. The suggestion would have breached the SLA | P1 (limit the rule to "after today") |
| 4 | The SDO desk lists **Keskal** files (Bade Rajpur, Farasgaon). Orders are correctly headed "SDO, Keskal", but nothing stops the Kondagaon SDO from putting them in the tray | 08758, 08772 | About 80 s wasted. Wrong-signatory risk | P2 (a demo artefact; real routing would filter) |
| 5 | The OBC approval order says the income certificate is attached but records **no creamy-layer finding** | 08870 | Callback + edit, 48 s | P1 (template) |
| 6 | **No scans** are shown, so the checklist ✓ comes from upload metadata, not content | all | Scan reading stays with the officer (added back in §4.3) | By design; roadmap OCR |
| 7 | "98%" model probability sits next to "about 1 in 10 strong links wrong". The confirm ground **"पिता का नाम व गांव समान" is pre-selected**, so C, ↵ is a 2-key rubber stamp | 08812, 08772 | Automation-bias risk | Watch in pilot |
| 8 | The hearing notice's WhatsApp doesn't state the ground | 08856 | The citizen must fetch the notice | P2 |
| 9 | The referral letter says "कारण नीचे दर्ज हैं" with none listed when there is no flag | 08842 | A thin record | P2 |
| 10 | The married-women recall note shows on an unmarried 19-year-old | 08835 | Noise | P3 |
| 11 | Long orders need a Space to scroll to the end before the Space that ticks ("read to end" gate) | 08778 | +1 key; working as designed | — |

What worked well:
- The 3-key clean path.
- Tray signing: one passcode for up to 5 files.
- 10-minute callback with a logged reason.
- A draft that can be edited, marked "EDITED" in the audit.
- Approval over a flag forced a written finding.
- "No record ≠ rejection" shown on screen.
- Rejection impossible without a hearing.
- Cancelled certificates can never reach "records complete".

### 4.3 Converting to realistic officer minutes

**Adjustment model [A]:**
- keystroke 0.3 s, plus 1.2 s of thinking per decision step
- page load 3–10 s
- reading Hindi at about 150 words/min: verdict card ≈ 60 words, 20–30 s; order ≈ 300 words, skimmed in 30–60 s once the template is familiar
- **residual scan look in Sewa Setu:**
  - 30–60 s when the tool has verified evidence
  - the full baseline S5 when it hasn't
- DSC: 30–75 s individually, or 10–20 s a file in the tray
- typing Hindi at about 90–100 characters/min
- **+50% in the first two weeks** (learning, trust calibration)

| Type | Baseline §3.3 (min, mid) | Measured actions with Praman | Realistic Praman (min) | Outcome today → with Praman |
|---|---|---|---|---|
| (i) Clean | 2.6–5.8 (**4.2**); 25–35 clicks + 2 typed | **3 keys** (officer view); 13 actions + passcode (console) | **1.4–3.2 (2.2)** tray; 1.7–3.5 individual | Approve → approve, **with the relative's cert verified** and a reasoned order |
| (ii) Hero | 4.1–9.5 (**6.8**) + a second review of the re-application 3–6 | **5–6 keys**; up to ~14 with several candidates | **2.4–5.5 (3.6)**, no second review | **Reject/send-back → approve with family proof** (if the link is found and confirmed) |
| (iii) Conflict | 2.6–5.8 (**4.2**), conflict missed | **4 keys** | First touch **2.5–5.0 (3.5)**, **+3–6 later** for the Patwari report | Silent approve → **Patwari verification** (costs more, by design) |
| (iv) First-gen | 4.2–12.3 (**8.2**) | 2 clicks + 3 keys (scans not shown) | **4.0–8.3 (6.0)**: scan time is unchanged; deciding and writing is faster | Coin-flip → reasoned approve, referral, or hearing then reject |
| (v) Other deficient | 3–7 (**5.0**) | **4 keys** | **2.0–4.5 (3.0)** | Reject → **send-back with specific reasons** (curable, no fee) |
| Rejection (any type) | Inside the above; one touch | X + 100–150 characters typed | **+2–3 min**: the notice with typed grounds, then the final order after reply or lapse | Unreasoned → heard and reasoned |

**Weighted mean, first touch, same mix (63/5/1/15/16):**
- 0.63×2.2 + 0.05×3.6 + 0.01×3.5 + 0.15×6.0 + 0.16×3.0 = **≈ 3.0 min a file (range 2.0–4.3)**
- baseline: **5.1 (3.0–7.2)**
- Gross saving ≈ 2.0 min a file (0.9–3.2).
- **New burdens** (hearing second touches, Patwari-report second touches, C/N confirmations, reading orders) take back about 0.45 min a file.
- **Net ≈ 1.6 min a file (0.4–2.8)** [A].

---

## 5. A day / a year in the life

### 5.1 Side by side: SDO Kondagaon, typical day of 60 caste files (same mix and assumptions as §3.5)

**Scenarios.** Lineage conversion uses IMPACT's **A × B**: A (relative's certificate in the archive) = 10 / 20 / 35%; B (conversion) = 40 / 55 / 70%. "Procedure conversion" C is the share of (iv) and (v) rejections that become a specific send-back or a referral first: **0 / 30 / 50% [A, no data: the MIS has no rejection-reason codes]**.

| Metric (per SDO per day) | Sewa Setu today (§3) | With Praman: low / **mid** / high | Tag |
|---|---|---|---|
| Files decided | 60 | 60 (queue ~1–2 files lighter in steady state, from fewer re-applications) | [A] |
| Minutes per file needed | 5.1 (3.0–7.2) | **3.0** (2.0–4.3) first touch; ~3.5 including second touches | [M] counts → [A] minutes |
| Desk time needed | 5.3–5.6 h vs **2.5–4 h available** | **≈ 3.7 h** (2.7–5.0), incl. ~27 min of second touches and ~15 min overhead | [A] |
| Hours saved vs need | — | **0.4 / 1.6 / 2.8 h** | [A] |
| Honest reading | The officer skims (2.5–4 min spent vs 5.1 needed) | **About the same time spent, but now enough for real scrutiny.** The saving is skipped work that stops being skipped, not hours returned. | |
| Clicks per clean file | ~25–35 + 2 typed [A] | **3 keys** (officer view), 13 + passcode (console) | [M] |
| DSC dialogs | ~47 (one per approval) | ~10 tray batches + individual hero/first-gen signings, ≈ 20 | [A] |
| **Rejections issued** (final) | **12** | **11.5 / 7.8 / 5.2** | [A] |
| …hero-type rejections | 2.4 (1.2–4.2) | 0.7 / **1.1** / 1.3 left (0.5 / **1.3** / 2.9 converted) | IMPACT A, B |
| **Sent back with a specific, curable reason** | ~1 (≤ 200 characters) | 1.1 / **3.1** / 3.7 | [A] |
| **Approved with family proof** (rejected today) | 0 | 0.4 / **1.1** / 2.4 | [A] |
| Referred to Patwari (pre-filled, 7 days) | ~0 inside the console [U] | 0.6 / **1.6** / 2.3 (conflicts + part of first-gen) | [A] |
| **Orders with written, record-cited reasons** | **0 of 12 rejections; 0 approvals cite records** | **100% of all decisions** (11/11 measured) | [M] |
| Hearing before rejection | 0 | 100% of rejections (the backend returns 422 otherwise) | [M] |
| **Conflicts surfaced at decision time** | ~0 of 0.6 | ~0.5 of 0.6 (possible-tier recall 0.84 × blocking 0.98 on synthetic data; lower for women) | [M] eval × [A] prevalence |
| **HC-ruling-conflicting rejections** (Bagel: relative's cert ignored) | ~2.4 | ~0.4: only hero cases the model misses; any cert shown must be answered in writing | [A] |
| **Re-applications generated** | 5–7 (mid 6) | 5.8 / **4.3** / 3.2 | [A] 50% of rejections re-apply; 70% of send-backs cured |
| Citizen trips saved | — | ~0.5 / **3.4** / 5.6 (≈2 per avoided re-application cycle) | [A] |
| Citizen cost of the day's rejections | ₹4.8k–8.4k | ₹3.1k–5.5k (mid) | [A] |
| Writ exposure | Every rejection unreasoned, and ~2.4 a day contrary to Bagel | Reasoned orders plus hearings. The residual is misses and **SLA breaches caused by hearings** | [A] |
| Vigilance exposure | "As per information given by the applicant" | The declaration now attests the record match. Cancelled certs can't launder. Records-complete files are an r.15(2) sample. **But the signer now vouches for the archive.** | [M] text |

**Stress points that change:**

| Stress point | Change |
|---|---|
| Empty "जांच सूची" | Filled |
| 200-character reason cap | Draft remark plus order PDF |
| No archive search | Evidence shown |
| DSC ritual | Tray-batched, at up to 5 files per passcode |
| List not sorted by urgency | Sorted by due date and evidence |
| Fear of courts | **Lower**: reasons, hearing, family certs considered |

**Stress points unchanged:**
- login, OTP and captcha
- the **5-minute session timeout**: the console mock still counts down from 05:00
- speed ranking (`H`) and LSG penalties
- strikes, vacancies, connectivity

**New burdens:**
- confirm or reject every found relationship: about 20–40 s each, with grounds
- read every order before signing (the read-to-end gate)
- type grounds on each hearing notice (100–150 characters, ~1.5 min)
- write a finding to override a flag
- second touches on hearing replies and Patwari reports
- **the 15-day hearing and 7-day Patwari timers run inside a 22-day SLA whose officer due date is 4 days earlier**. A late rejection risks ₹100 LSG penalties and a lower speed rank, so **a Revenue GO pausing the clock is required**.
- Patwari workload rises (911 vacancies [S])

### 5.2 Scaled: one SDO-year (240 days, ~14,400 files) and statewide (~8.0 L caste files a year)

| Metric | One SDO-year, today | One SDO-year, Praman low / **mid** / high | Statewide, Praman low / **mid** / high | Basis |
|---|---|---|---|---|
| Officer time saved (net) | — | 96 / **384** / 672 h | **5.3k / 21k / 37k SDO-hours** (≈3 / 11 / 19 officer-years) | 0.4 / 1.6 / 2.8 min a file [A]. IMPACT's 6k–23k counts only records-complete files, so **keep IMPACT's range on the slide**. This walk-through suggests drafting savings reach every file. |
| Rejections issued | 2,880 | 2,760 / **1,870** / 1,250 | 1.48 L → about 1.42 / **0.96** / 0.64 L | [A] incl. procedure conversion |
| …of which avoided through the family certificate | — | 120 / **310** / 700 | **5.9k / 16.3k / 36.3k** | IMPACT (A × B) |
| Converted to a curable send-back or referral first | ~240 | ~0 / **~700** / ~940 | 0 / ~35k / ~48k | [A] C = 0 / 30 / 50% of non-hero rejections. The final outcome is unknown. |
| Orders with written reasons | 0% | **100%** | ~8 L orders a year | [M] |
| Conflicts surfaced | ~0 (≈145 missed) | ~120 | ~6.5k (at the 1% prevalence [A]) | eval recall [M] |
| Bagel-exposed rejections | ~575 | ~100 (more for women: exact recall 0.33) | 15k–53k → ~3k–10k | [A] |
| Re-applications avoided | — | 60 / **400** / 680 | **3k / 21k / 35k** (vs 60k–90k generated today) | [A] 50% of rejections re-apply; 70% of send-backs cured |
| Citizen trips saved | — | 120 / **800** / 1,350 | ~6k / **41k** / 70k | [A] ~2 trips per avoided cycle |
| Citizen money saved | — | — | ₹0.1–0.2 / **0.8–1.4** / 1.4–2.5 cr | [A] ₹400–700 per avoided cycle; small, don't lead with it |

### 5.3 Monday of SDO Kondagaon: before vs after

**Before.** The SDO sits down at 10:40 after the revenue court list. Login, OTP, then a captcha that fails once. The token driver needs a replug. The pending list shows 63 files in number order.

The operator drives the mouse. Tab 1, tab 2, the documents tab, zoom on a blurry vanshavali, the 200-character box, "सत्यापित, स्वीकृत", SIGN WITH TOKEN, the passcode, OK. Forty-seven times.

A Tehsildar calls about the strike roster. The 5-minute timer lapses, and it's login again.

Sunita's file has no pre-1950 paper. Her father's certificate, signed in this very office in 2019, sits in the archive, but there is no way to search for it. The remark reads "1950 से पूर्व अभिलेख संलग्न करें", and the file is rejected. She will pay ₹30 again and miss the scholarship window.

Kiran's file looks clean and is approved. Nobody will ever see that his brother holds an OBC certificate, unless vigilance does, in three years.

By 14:00, twelve rejections have gone out, none with a reason longer than a sentence. Fourteen files spill into Tuesday. The SDO knows the ranking meeting counts only speed.

**After.** Same login, same OTP, same token, same 5-minute timer; nothing there changed. The queue is sorted by due date, and a column says what each file needs.

Thirty-eight files are "records complete". For each, the SDO reads the green card ("brother's permanent ST certificate, active, same father, same village") and flicks to the scan of the affidavit in Sewa Setu. Ctrl+↵, a skim of the order, Space, then Ctrl+S into the tray. Eight tray batches, eight passcodes instead of thirty-eight.

Three files show "पिता का प्रमाण पत्र मिला". She reads the spelling row (Ram Lal / Ramlal) and presses C. Sunita is approved at 11:20, and the WhatsApp names her father's certificate.

Kiran's file is amber. She sends it to the Patwari with one key; the letter lists five points.

What's new, and not free:
- She types grounds on three hearing notices.
- She overrides one silly "later certificate" flag in writing.
- She calls back one order because the OBC template forgot the creamy-layer line.
- She removes two Keskal files that should never have reached her desk.
- The hearings start a 15-day clock she now has to watch against the 22-day SLA.

She is done by 14:15: about the same time as before. **The difference is what the three hours contain.** Every order has reasons, no family certificate went unseen, and about two fewer people a day will be back next month to apply again.

---

## 6. Verdict

### 6.1 How much of the PS1 problem this solves

| For | Solved | Evidence |
|---|---|---|
| **Officer** | **Evidence at the decision point.** Relative's certs are verified, found, or flagged. Plus a drafted reasoned order, a filled checklist, tray signing and callback. The time needed per file drops from ~5.1 to ~3.0 min (mid), so the job fits the 2.5–4 h the SDO actually has. Legal defensibility rises: reasons, hearing, and Bagel-compliant consideration of family certs. | [M] 3-key clean path, 11/11 reasoned documents, 0 rejections without a hearing. [A] minutes |
| **Citizen** | Families already in the archive: **approval instead of rejection** (mid ~16k a year statewide). Every citizen: a specific, plain-Hindi reason, curable with no new fee, and a hearing before any rejection. First-generation applicants: **procedural gains only** (no-record ≠ rejection; the Patwari fetches the vanshavali). | IMPACT [A]; walk-through [M] |
| **Government** | 100% reasoned orders (the start of reason-code data), conflicts surfaced at issue rather than years later, anti-laundering on cancelled certs, a risk-based r.15(2) sample, and consistency across districts to test in the pilot. | [M] / [A] |

**Share solved.**
- Of the SDO's **caste-desk problem**: about **60%**.
  - Solved: evidence, drafting, reasons, signing friction (steps S5–S11).
  - Unsolved: session and login friction, scan reading, SLA and ranking incentives, staffing.
- Of **PS1 overall**: about **65%, deep on the slice carrying 82% of rejections** (§1.4, unchanged).
- The lineage feature itself directly cures about **11% (4–25%) of caste rejections**.

### 6.2 What we do NOT solve
- Login, OTP, captcha and the **5-minute timeout**.
- Per-approval DSC outside the tray. Tray signing inside the real console is an integration unknown.
- **Scan reading.** There is no document viewer, no OCR and no forgery check; S5 is unchanged for first-generation and deficient files.
- The first-generation evidence gap itself.
- Patwari capacity: referrals add load.
- The speed-only ranking formula and LSG penalties.
- Strikes and vacancies.
- The ~100 other services.
- Grievance intake.
- Real-data accuracy: every metric is synthetic.
- Recall for married women (exact recall 0.33).

### 6.3 Top 5 risks
1. **False link plus automation bias.**
   - Exact-tier precision is 0.894 on synthetic data.
   - Confirmation is C, ↵ with a pre-selected ground.
   - The keyboard C/N can act on a different candidate from the one on screen (§4.2 #1).
   - *Mitigation:* fix #1, no pre-selected ground, a 300-case labelled pilot gate (≤ 2% false match), confirmation logged with a snapshot.
2. **SLA collision.** A 15-day hearing and a 7-day Patwari referral sit inside a 22-day SLA whose officer due date is 4 days earlier. The result is LSG penalties and rank damage, which pushes officers to approve or reject quickly anyway. The tool even suggests a Scrutiny Committee referral with 4 days left.
   - *Mitigation:* a Revenue GO pausing the clock during hearing and referral, and excluding pilot desks from the speed rank.
3. **Archive data quality and flag noise.**
   - Whether cancellations are written back is unknown.
   - The "later certificate" rule gives false positives (§4.2 #3).
   - Tehsildar-issued certificates after Sonkar are a policy switch, not law.
   - Noisy amber lanes train officers to ignore flags.
   - *Mitigation:* measure flag precision (≥ 80%) in shadow mode.
4. **Liability and legal text.**
   - Order templates are unvetted (appellate authority, statute references, the missing creamy-layer finding).
   - The declaration now vouches for the record match.
   - Override logs could be used against officers.
   - *Mitigation:* legal vetting, a circular recognising the evidence card as due diligence, and "never an officer metric".
5. **Uneven benefit and the size of Assumption A.**
   - If A is about 10%, the lineage impact is about 6k a year.
   - Women and first-generation applicants gain little directly.
   - "Standard review" must not become stigma.
   - *Mitigation:* the 6-week retrospective study first, maiden-village search, and an exclusion guard (no-match rejection no worse than control +1 pp).

### 6.4 The 3 numbers for the impact slide

| # | Number | Source / assumption |
|---|---|---|
| 1 | **~16,000 fewer avoidable caste rejections a year** (range 6k–36k) | `IMPACT_ANALYSIS` §2.1. A = 10–35% of rejected applicants have a relative's certificate in the archive; B = 40–70% convert. **A is measured by the 6-week study before any pilot spend.** [A] |
| 2 | **Reasoned, record-cited orders: 0% → 100%**, with a hearing before every rejection | Today: a ≤ 200-character remark, no template, no hearing step [S] 07. With Praman: 11 of 11 decisions in the walk-through produced a numbered, record-cited document; the backend refuses a rejection without a notice [M] |
| 3 | **3 keystrokes, ~2 min for a records-complete file** (today ~30 clicks, ~4 min); **≈ 5 → 3 min** needed per caste file on the day's mix | 3 keys measured at 1366×657 [M]. Minutes are the §4.3 conversion of measured counts, with synthetic files and an expert user [A]. **Say: "the job now fits the time the officer actually has"**, not "lakhs of hours saved". |

**Caveat to state aloud:** all timings come from synthetic files and an expert user. Real officer timings, and the false-match rate, are what the 90-day shadow pilot measures.
