# Critique 3: Simulated Jury Panel for "Nirnay Sahayak" (PS1)
Sewa Setu Innovation Hackathon, Government of Chhattisgarh / CHiPS with IIIT Naya Raipur, 28-09-2026.
Format: 10 min PPT + 5 min demo + 5 min Q&A. Rubric: 5 heads × 20 = 100.

**What was reviewed:** `00_VALIDATION_REPORT.md` (in full), `02_existing_solutions.md`, `04_technical_toolkit.md` and the deck, demo and Q&A sections of `SEWA_SETU_PLAN.md` (v2). No web search was used.

**What "the plan as it stands" means here:** v3 scope (caste and domicile), eight features, a rules-first pipeline, mock registries, a dashboard on the real MIS, and the v2 deck and demo outline.

---

## 0. Headline verdict (jury-room summary)

> "Best-researched team in the room, and the only one working at the point of decision rather than the front door. But right now it reads as a very good **rules-plus-fuzzy-match workflow tool presented by lawyers**. The citizen barely appears. The 'AI' can't survive the IIIT question. And the opening slide tells the platform owners that their system rejects one in five caste applicants. Fix those three and it wins."

**Predicted score as the plan stands: about 68/100** (a likely top-5 finish, not a certain winner).
**Predicted score with the top fixes: about 84/100.**

---

## 1. The panel

### Panelist 1: Sewa Setu / CHiPS Project Head
*Built the platform. Knows the archive schema, the Sendback status, the WhatsApp channel and which departments won't share data. Proud of 95.7% on-time delivery. Will defend officers in front of outsiders.*

**First impression (to the other judges, quietly):**
"They've actually read our MIS, which almost nobody does. But the hook is 'your system rejects 2.2 lakh caste applicants.' That's not a Sewa Setu problem; that's scrutiny at the Revenue end. And half those rejections are duplicates and incomplete uploads. Also, we already have the archive. If they're saying 'just look up the father's certificate,' why haven't our officers been doing that? Either they're right and it's a search problem, or they don't know how officers actually work."

**Hardest questions:**

**Q1.1: "You say 1 in 5 caste applicants is rejected wrongly. How many of those are duplicate applications, incomplete uploads or the same person applying three times? What fraction are actually *avoidable*?"**
- *Weak answer:* "Many of them are wrongful. The district variance proves it." This over-claims and invites a public correction from the owner of the data.
- *Strong answer:* "We don't claim they're wrong. The public MIS can't separate duplicates from genuine refusals. What we can say is that caste is 22% of volume but 61% of rejections, and camp applications are rejected at 38–43%. That points to an evidence-at-intake gap. Our impact case rests on one testable number: the share of rejected applicants whose father or sibling already holds a Sewa Setu certificate. With archive access it's **one query in week one of shadow mode**, and we've written that query." (Have the SQL on a backup slide.)

**Q1.2: "The archive goes back to 2018. Most fathers of today's 18-year-olds got their certificates on paper, or through old e-District with inconsistent fields. What's your real hit rate?"**
- *Weak answer:* "The archive has 3.2 crore certificates, so coverage will be high." That confuses transactions with unique people, and the validation report itself warns against this.
- *Strong answer:* "Coverage is our biggest unknown, and we priced it in: Assumption A is a 30–50% band, not a point estimate. Coverage also *grows every year*: every certificate you issue today becomes lineage evidence for the next sibling. That's a compounding asset only CHiPS owns. Where there's no hit, the case is exactly what it is today. Missing data never counts against the applicant."

**Q1.3: "You're showing district rejection rates with GPM at 13.2%. The Collectors are our partners. Are you saying their SDOs are doing it wrong? And the Tehsildar/SDO competence issue: we may have already changed the workflow after the July judgment."**
- *Weak answer:* "The data shows local practice is the cause." This is exactly what §8 of the validation report says not to claim, and it offends.
- *Strong answer:* "We don't know the cause, and a pilot is the only honest way to find out. It could be application quality, local practice or document availability. On routing: the copilot doesn't encode our reading of the law. It reads **your** authority matrix as a config file. If CHiPS has already updated it, the tool inherits that on day one."

**What wins this panelist:** credit Sewa Setu for solving speed; frame the archive as *CHiPS's strategic asset*; position the tool as protecting officers (every decision gets a defensible evidence trail in court); ask for nothing outside CHiPS's own data in phase 1.

---

### Panelist 2: Senior Technical Expert (ex-NIC / NeGD architect)
*Has integrated with ServicePlus, e-District and API Setu. Has sat through STQC audits. Distrusts demo-ware, and asks "who pays for the GPU?"*

**First impression:**
"Architecture slide is decent: sidecar, SDC-hosted, open-source, JDM rules in Git. But they're hand-waving the hardest part. API Setu's `edistrictcg` lets you pull a document **by application number and mobile**. It doesn't let you *search by father's name and village* across 3.2 crore records. That needs direct read access to the archive DB, and that's a different conversation entirely. And is caste data going to a Sarvam API in their demo?"

**Hardest questions:**

**Q2.1: "Walk me through the integration. What event triggers you? What exactly do you read, from where, and with what latency? Fuzzy name search across crores of records isn't a REST call."**
- *Weak answer:* "We call the DigiLocker / API Setu APIs." Those are pull-by-ID APIs, not search APIs.
- *Strong answer:*
  - "It's a sidecar with a read-only replica or CDC feed of the certificate archive inside the SDC. Sewa Setu calls us with a webhook on *application received*, and we write back only a recommendation object.
  - Search uses **blocking**: LGD village code plus a phonetic key of the father's name reduces the candidate set to tens of records. Only those tens get scored, so latency is under a second.
  - API Setu or DigiLocker is used only to *fetch and verify* a specific certificate once we've found its number.
  - If Sewa Setu is down or we're down, the officer's workflow is unchanged, because we're advisory."

**Q2.2: "Security and privacy. Caste data is sensitive personal data by any standard. Where does it live, who can query it, what's logged, and does anything leave the state?"**
- *Weak answer:* "We're DPDP compliant." That's a slogan.
- *Strong answer:*
  - "Nothing leaves the SDC in production. The LLM is self-hosted (Sarvam-30B on vLLM), and the template path works with no LLM at all.
  - The demo uses only synthetic records. Sarvam's API only ever sees synthetic text, and we'll show the badge.
  - Queries are purpose-bound: lineage search only runs from inside an open caste application, never as a free-text search, so there's no 'look up anyone's caste' screen.
  - We keep an append-only access log (who, which record, which application), retained for 1 year for DPDP and 180 days for CERT-In. Aadhaar is masked, and QR-verified offline.
  - A DPDP notice tells the applicant which records were used."

  The phrase "no free-text caste search" is what this panelist wants to hear.

**Q2.3: "What does this cost to run for the state, and who maintains the rules when the Revenue Department changes a circular?"**
- *Weak answer:* "It's open source, so it's free."
- *Strong answer:*
  - "Everything except the LLM is CPU on existing SDC VMs. The LLM is optional: one GPU node (L40S-class) if CHiPS wants Hindi polish, and zero if it doesn't.
  - Rules are JDM JSON files owned by the Revenue Department, edited through a visual editor, versioned in Git with a test case per rule, and exportable to DMN for Java stacks.
  - A rule change is a reviewed config change, not a code release."

  Show the rule file and its test on screen for 5 seconds.

**Also expect:** "Are you STQC-ready / GIGW 3.0?" Answer: UX4G tokens, WCAG 2.1 AA target, audit in phase 2. Do not claim compliance. And: "Why not build this inside ServicePlus?" Answer: the sidecar API means any workflow engine can call it, and NIC can host it.

---

### Panelist 3: IIIT Naya Raipur AI Faculty
*Teaches ML. Has seen fifty "AI-powered" hackathon projects that are if-statements. Reads confusion matrices, not adjectives. Cares about bias and about evaluation leakage.*

**First impression:**
"Let me list the components: OCR is off-the-shelf Tesseract. The rules engine is rules. RapidFuzz is string distance with hand-set thresholds. The graph is a BFS. The LLM is optional and 'template first.' So where is the learning? I respect that they chose rules for legal reasons (EPFO does too), but under 'creative use of technology' they need to *show me a model, a dataset, and a metric*. Otherwise this is a very good workflow tool."

**Hardest questions:**

**Q3.1: "Is this AI or rules? What in your system is learned from data, and how did you evaluate it?"**
- *Weak answer:* "We use AI for OCR, fuzzy matching and LLM drafting." That lists libraries, not learning. Also fatal: "It's 97% accurate" with no dataset described.
- *Strong answer:* "We deliberately keep the *decision logic* deterministic, because the law requires the officer to decide on reasons. The *learned* part is the hard problem underneath: **deciding whether two records written in two scripts with different spellings are the same person.**
  - We use a probabilistic record-linkage model (Fellegi-Sunter, fitted with EM, via Splink). Each field gets a learned match weight: father's name, village, surname, birth year.
  - Here's its precision/recall on a held-out set of N labelled pairs. We set the threshold for high precision on *conflict* flags (a false conflict harms a citizen) and high recall on *lineage suggestions* (the officer confirms each one).
  - In shadow mode, every officer confirm or reject becomes a training label, so the model is calibrated on real CG names within 90 days."

**Q3.2: "Your evaluation set is synthetic, generated by your own noise model. Isn't that circular?"**
- *Weak answer:* "The synthetic data is very realistic." Or pretending it's real.
- *Strong answer:* "Yes, partly, and we say so on the slide.
  - We reduced the circularity in two ways. First, the test pairs use spelling variants we **collected by hand** (for example Dhruw/Dhruv/ध्रुव, Netam/Netaam), not variants our generator produced. Second, we report results on a hard slice: same surname, same village, different person.
  - The honest claim is 'the method works on realistic variants.' Real accuracy gets measured in shadow mode, against officer decisions, before anything goes live."

**Q3.3: "Bias. Surnames like Netam, Markam, Dhruw and Sori are extremely common in Bastar. Won't your matcher produce more false lineage matches and false conflicts for tribal applicants? And why not just train a model on past approve/reject decisions?"**
- *Weak answer:* "We don't use caste as a feature, so there's no bias." That ignores disparate error rates. Also fatal: "Yes, we could train on historical decisions."
- *Strong answer:* "Two separate issues.
  - **Error-rate disparity is real.** Common surnames raise false-match risk. So we report precision and recall *by district group* (Bastar/Surguja tribal districts vs others) and by 'surname frequency' bucket. We require village plus father's-name agreement, never surname alone, and every match is shown side by side for the officer to confirm.
  - **We will not train on past decisions.** Those labels contain the 2.3%-to-13.2% inconsistency we're trying to fix. A model trained on them would automate it. That's the Dutch childcare and DWP lesson."

  This answer alone can move the Innovation score by 3–4 points.

---

### Panelist 4: Industry / GovTech Expert
*Has shipped products into state governments. Knows pilots die in procurement and adoption, not in code. Thinks in users, incentives and one-line value propositions.*

**First impression:**
"Great problem selection: they found the real pain in the data rather than building another chatbot. But who is the user? The slides say 'officer copilot,' the rubric says 'citizen-centric,' and the demo never shows a citizen. And officers are ranked on speed. Why would a Tehsildar with 400 files a day open another screen? Eight features for a 24-hour build is also a scope smell."

**Hardest questions:**

**Q4.1: "Why will an SDO actually use this? What's in it for them, given they're measured on speed and a rejection counts the same as an approval?"**
- *Weak answer:* "It makes better decisions." Officers don't adopt tools for the state's benefit.
- *Strong answer:* "Three things for the officer.
  - **Fewer clicks on the easy cases.** GREEN cases arrive with evidence pre-assembled.
  - **Legal cover.** Every order carries a record-cited reason, which is what the High Court is now demanding. Reversal on appeal is the officer's real risk.
  - **Nothing new to learn.** It's a panel inside the screen they already use, not a separate app.

  We measure adoption by time per case and override rate, not logins."

**Q4.2: "Where's the citizen in this? Show me what changes for Sunita in Kondagaon."**
- *Weak answer:* "The citizen benefits indirectly from better decisions."
- *Strong answer:* Show two citizen touchpoints:
  1. **At the Kendra, before submission:** the operator enters the father's name and village, and the tool says "a matching certificate exists, number XXXX; attach it." The rejection never happens. This is the highest-leverage change, and camp rejection rates of 38–43% say intake quality matters.
  2. **On a send-back:** instead of a bare "rejected," the citizen gets a plain-Hindi WhatsApp message on Sewa Setu's *existing* channel: what's missing, why, and exactly what to bring.

**Q4.3: "What's your ask, and what does success look like at day 90? What would make CHiPS kill it?"**
- *Weak answer:* "We want to scale statewide" or "funding."
- *Strong answer:*
  - "The ask is read-only archive access in 2 pilot districts plus 2 control districts, in shadow mode, for 90 days. It costs nothing to citizens and changes nothing in the workflow.
  - **Success:**
    - a measured lineage hit-rate
    - officer agreement with GREEN at or above X%
    - a conflict-flag precision above 80%
    - a drop in caste rejection or re-application rate vs control
  - **Kill criteria:**
    - hit-rate below 10%
    - false-conflict rate above 2%
    - officers not using it
  - We publish these criteria up front."

  Pre-registered kill criteria signal maturity and are rare at hackathons.

---

## 2. Predicted scores

| Rubric head (20 each) | As the plan stands | Why | After top fixes | What moves it |
|---|---|---|---|---|
| **PPT / Solution presentation** | **14** | Strong problem evidence from the real MIS, and an architecture exists. But the v2 deck is dense with statistics, law and precedent, and risks the "wall of numbers". v2 and v3 impact figures conflict (v2: 1.8–2.5 L officer-hours, 30–60k rejections; v3: 18–26k hours, 22–51k). A sharp judge will catch that. | **17** | One number per slide, one hero story, one architecture picture. Reconcile to v3 numbers everywhere. Legal content goes to backup slides. |
| **Physical presentation & communication** | **13** | Unknown delivery. The material is complex (Caste Rules r.3(3), HC cases, DPDP rules), and the likely failure mode is reading dense slides at speed. Opening with "your system rejects 1 in 5" sets a defensive tone with the CHiPS head. | **16** | Open with a person, not a statistic. Credit Sewa Setu in the first 60 s. Two speakers with a clean hand-off. Some Hindi in the story. Calm, pre-rehearsed Q&A with backup slides. |
| **Idea thinking & innovation** | **13** | Genuine understanding of governance: legal grounding, the failure lessons, officer-side positioning. But "rules + fuzzy match + optional LLM" invites "where's the AI?", and the citizen is almost absent. Credit for novel problem selection; docked on "creative use of tech" and "citizen-centric". | **17** | A learned, explainable record-linkage model with an evaluation and fairness slice. A citizen-facing Kendra pre-check and a plain-language send-back message. Framing: "the archive becomes a compounding asset." |
| **Technical feasibility & implementation** | **15** | Unusually well-researched stack: tested OCR language order, licence hygiene, SDC hosting, JDM rules, DPDP and CERT-In logging. Docked because archive *search* access is glossed over (API Setu is pull-by-ID), there's no cost figure, and the Sarvam API in the demo creates a data-leaving-the-state perception. | **17** | Show read-only replica + blocking + "no free-text caste search". Give a rough cost, labelled as an estimate. Run the demo LLM locally or label it synthetic-only. Include a rule file with its unit test. |
| **Prototype / POC, impact & scalability** | **13** | Mock registries are fine if honest. The dashboard on the real MIS is a strong asset. But eight features in 24 h means a shallow demo. The impact model rests on the unmeasured Assumption A. Officer anomaly scoring (IsolationForest) is thin and politically risky. | **17** | Build three features deeply: lineage match, reasoned send-back, real-MIS dashboard. Show an evaluation panel. Scale via JSON rules per service and district. Present the impact band with its load-bearing assumption stated. |
| **Total** | **≈68** | Likely top 5 | **≈84** | Likely winner against chatbot and dashboard competition |

**Scoring caveat:** state hackathon panels compress scores (most teams land between 55 and 80). Relative rank matters more than the absolute number.

---

## 3. Red flags that would sink the team

Ordered by damage.

1. **"It's just rules. Where's the AI?"** This is an IIIT faculty member at an AI-Mission-era hackathon.
   - The plan's own honest language ("template first", "LLM optional", "rules only") becomes self-incrimination unless it's paired with a learned component and a metric.
   - **Fix:** say "deterministic decisions, learned matching" and show the model.
2. **Criticising Sewa Setu in front of its owners.** Lines to cut or reframe:
   - "1 in 5 rejected" as the opening line
   - "officers are ranked on speed only, so the incentive favours quick rejection" (an [U] inference that insults both CHiPS and officers)
   - "local practice" as the cause of variance
   - "no AI at the point of decision" said as a gap

   **Reframe:** "Sewa Setu solved speed (95.7% on time). It built an archive nobody else in India has. We use it for the next frontier: consistency."
3. **Naming districts as "worst".** Collectors may be in the room or on the call.
   - Show the map as a *range* ("2.3% to 13.2% under the same rules").
   - Call the pilot districts "highest-opportunity districts", not "high-rejection".
4. **Caste sensitivity on stage.**
   - Don't show a real community name (Baiga, Gond, Satnami and so on) next to a red "CONFLICT" badge.
   - Don't use the fake-Baiga-certificate news as a hook. It frames tribal applicants as suspects.
   - On screen, use category labels (ST vs OBC) with synthetic names, and use amber, not red.
   - Never imply caste can be inferred from surname. Say explicitly: "caste comes only from certificates."
   - The copilot's primary story must be **helping genuine applicants get approved**, not catching fraud. Fraud is a secondary benefit.
5. **Mock-data honesty.**
   - If a judge thinks the lineage matches came from real data and later learns they're synthetic, credibility collapses.
   - Put a persistent "SYNTHETIC DATA / नमूना" banner on case screens, and a "REAL: Sewa Setu public MIS, 27-09-2026" label on the dashboard.
   - Say "API-ready, mocked" once, clearly.
6. **Over-claiming numbers.**
   - Any point estimate ("saves 26,000 hours") without its assumption.
   - Mixing v2 and v3 numbers.
   - "3.2 crore certificates" (it's transactions).
   - Extrapolating the 267-of-659 fake-certificate figure.
   - "Nobody in India does this" (Haryana, Karnataka and AP exist, and a judge may know).
   - "Tehsildar not competent" quoted with a wrong date or case name.
   - **Rule:** every number on a slide carries its source or the word "assumption".
7. **Legal lecture.** Citing Jadeja 1995, Kranti Associates, the Kerala HC, the Gujarat HC, the SC, Allahabad and Brazil STJ in 10 minutes signals "we're afraid of our own tool."
   - One line on stage: "The AI never decides. The officer signs every order, and the draft cites only government records."
   - Everything else goes to backup slides.
8. **Too much text.** The v2 deck has 10 slides with dense bullets. More than about 25 words on a slide, and the jury reads instead of listening.
9. **Demo fragility.**
   - Live Sarvam API calls, tesseract.js fetching traineddata from a CDN, venue Wi-Fi, live camera OCR, more than one laptop.
   - **Fix:** everything offline and pre-seeded, local model or template, a recorded backup video queued in a second tab, and a reset script.
10. **Officer surveillance.** IsolationForest "officer outliers" and "off-hours approvals" come after Tehsildar strikes in 2025 and 2026, in front of a government panel.
    - This reads as a tool to discipline officers.
    - Drop it from the demo. At most, show *district-level* consistency.
11. **Scope sprawl.** Eight features plus OCR plus Aadhaar QR plus e-sign plus a map, in 24 hours, means everything is 40% done. Judges forgive missing features. They don't forgive a broken click.

---

## 4. Winning against the likely field

**What most other teams will pitch:**
- WhatsApp or chat bots for application status and FAQs
- voice assistants (often claiming Chhattisgarhi or Gondi support that doesn't exist)
- document-checklist helpers
- grievance classifiers
- MIS dashboards

The CHiPS head has seen all of these. Sewa Setu already has WhatsApp for 25 services and a Bhashini integration.

**Why this entry can win:**

| Dimension | Typical competitor | This team (if fixed) |
|---|---|---|
| Problem evidence | "Citizens face difficulties" | The platform's *own MIS*: 61% of rejections come from caste, a 2.3–13.2% spread, and 95.7% on-time delivery acknowledged |
| Where it acts | The front door (a new channel) | **The decision point and the intake point**: where rejections are actually created |
| Uses the state's assets | Rebuilds what exists | Turns CHiPS's own certificate archive into evidence, and **each issued certificate makes the next one easier** |
| Legal fit | Ignored | Built on Caste Rules r.3(3) and the July 2026 HC ruling on relatives' certificates |
| AI credibility | "LLM-powered" | A learned matcher with an evaluation, a fairness slice, and a no-auto-reject design |
| Ask | "Scale statewide" | A 90-day shadow pilot, 2+2 districts, pre-registered success and kill criteria |

**The winning narrative in one sentence:**
> "Sewa Setu already holds the proof. When Sunita's father got his caste certificate in 2019, your system recorded it. Today she's being asked for 1950-era papers. Nirnay Sahayak finds that evidence, shows it to the officer and to the Kendra, and tells her in plain Hindi exactly what to bring. The officer still decides."

**Tie-in hooks the jury will reward (use each in one line only):**
- CG AI Mission's "AI-based decision support" action (₹500 cr)
- AI training for 1.5 lakh employees, as the adoption channel
- the IIIT-NR Process Mining specialisation, as the evaluation partner for the pilot (flatters the faculty panelist and is genuinely sensible)

---

## 5. Concrete recommendations

### 5.1 Cut scope to three deep features, plus the real dashboard

| Keep and build deep | Show as "designed, not built" (one architecture box) | Drop from stage |
|---|---|---|
| 1. **Lineage match** with a learned match model and side-by-side evidence | Bhuiyan / Khadya evidence card (mock, one row) | Officer IsolationForest / off-hours flags |
| 2. **Reasoned send-back**: officer draft plus a citizen plain-Hindi message | Role-aware routing (a config line) | Live Aadhaar QR crypto (backup slide only) |
| 3. **Kendra pre-check**: "matching certificate found; attach it" before submission | pHash duplicate detection (one flag in the conflict case) | Risk-based r.15(2) audit list (one sentence in the roadmap) |
| 4. **Collector consistency dashboard** on the REAL MIS, plus an evaluation panel | ELA / image forensics | Voice, and any Chhattisgarhi or Gondi claim |

### 5.2 How much "AI" to show, and which

**Principle to state on stage:**
> "We use rules where the law demands reasons, and learning where the problem is genuinely hard."

Say it once. It pre-empts the IIIT question and shows judgment.

| Component | Genuine ML? | Build in 24 h? | How to present | Evaluation to show |
|---|---|---|---|---|
| **Learned record linkage** (Splink Fellegi-Sunter via EM on DuckDB, with comparisons for the Indic-normalised name, the consonant skeleton, Jaro-Winkler on the father's name, LGD village and birth-year band) | **Yes.** Unsupervised probabilistic model with learned m/u weights. Used across UK government. | Yes, about 4–6 h: 20–50k synthetic people, plus a hand-collected variant list | **Hero AI feature.** A waterfall of match weights per field ("village agrees +4.1, father's name 0.93 JW +6.3, birth year ±2 +1.2 → 97% match"). That's explainable ML, which the IIIT faculty will respect. | Precision and recall at the chosen thresholds; a PR curve; results on a **hard slice** (common surname, same village); results by district group. Label clearly as "held-out synthetic + hand-collected variants; real calibration in shadow mode". |
| **Fallback if Splink fights you:** logistic regression or gradient boosting on RapidFuzz and phonetic features, trained on labelled synthetic pairs | Yes (supervised) | Yes, about 2 h | Same waterfall using SHAP or coefficients | Same metrics |
| **OCR field extraction** (tesseract.js eng+hin + validators) | Pretrained model, not novel | Yes (already tested) | Brief: "reads the affidavit, validates every number, shows its confidence" | Field-level accuracy on clean vs degraded scans (you already have both samples). The honest finding "digits drift on degraded scans, so we validate" *helps* credibility. |
| **LLM plain-language citizen explanation** (the send-back reason turned into simple Hindi, 2–3 sentences, for the WhatsApp preview) | Yes (generative), in a safe role | Yes, about 2 h, with template fallback | "The officer's order stays template-bound and record-cited. The LLM only rewrites *for the citizen*, and a checker blocks any name, number or document not in the source." Show the badge `template | gemma-local`. | On N generated messages: 0 unsupported entities (automated check), plus a small readability rating (for example, 3 volunteers × 20 messages). Report it honestly. |
| Isolation-forest anomaly model | Yes, but thin data and political risk | — | **Don't show.** | — |
| A model trained on past approve/reject decisions | — | — | **Never build.** Use it as the Q3.3 answer: it would automate the inconsistency. | — |

**The evaluation slide (one slide, about 45 seconds)** is what most teams won't have:
- **Left:** the match model's P/R table, overall and by hard slice and district group, with test-set size stated.
- **Middle:** OCR field accuracy, clean vs degraded.
- **Right:** LLM message checks (unsupported entities = 0 of N).
- **Footer:** "Synthetic and hand-collected test data. Real accuracy measured in 90-day shadow mode, where every officer confirmation is a label."

The shadow-mode-as-labelling-pipeline point is the strongest ML-maturity signal available to you.

### 5.3 Deck structure (10 min, about 11 slides, at most about 25 words each)

| # | Slide | Time | Content |
|---|---|---|---|
| 1 | **Sunita's story** | 0:40 | Photo-free illustration. "18, Kondagaon. Needs an ST certificate for a scholarship. Her father got his in 2019, through Sewa Setu. She's asked for 1950-era papers." |
| 2 | **Sewa Setu solved speed** | 0:40 | 95.7% on time, 900+ services, WhatsApp, QR, DigiLocker. "Next frontier: consistency." (Credit first.) |
| 3 | **Where rejections come from** | 0:50 | One chart: caste is 22% of volume and 61% of rejections. District range 2.3–13.2% on a neutral map, no "worst" label. |
| 4 | **The insight** | 0:40 | "The proof is already in your archive." Rule r.3(3) and the HC ruling (22-07-2026), each in one line. Every certificate issued becomes evidence for the next family member. |
| 5 | **Nirnay Sahayak on one page** | 0:50 | Four touchpoints: Kendra pre-check, officer copilot, citizen message, Collector view. "The officer decides. Always." |
| 6 | **How it decides** | 0:50 | Deterministic rules (reasons) plus learned matching (evidence). Lanes: GREEN / AMBER / send-back. Never auto-reject. |
| 7 | **Architecture and integration** | 0:50 | Sidecar in the SDC, webhook, read-only replica, blocking, API Setu for fetch-by-ID, self-hosted models, audit log. |
| 8 | **Evaluation and fairness** | 0:50 | The §5.2 evaluation slide. |
| 9 | **Guardrails** | 0:30 | Five icons: no auto-reject, no caste scoring, no free-text search, records-only citations, DPDP log. Legal citations go to the backup slides. |
| 10 | **Impact, with assumptions visible** | 0:50 | 22k–51k fewer avoidable caste rejections a year; 18k–26k officer-hours; Assumption A stated as the thing the pilot measures. Human cost: a scholarship or job window missed. |
| 11 | **Ask** | 0:40 | 90-day shadow pilot, 2+2 districts. Success and kill criteria. Partners: CHiPS, the Revenue Department and IIIT-NR (evaluation). |

**Backup slides (for Q&A only):**
- the archive hit-rate SQL
- cost estimate
- DPDP / CERT-In detail
- legal precedent table
- the Samagra Vedika / Robodebt lessons
- rule file with its unit test
- Aadhaar QR verification
- precedent comparison (Haryana, Karnataka, AP)

### 5.4 Demo flow (5 min, fully offline, synthetic banner visible)

| Time | Screen | What to say / show |
|---|---|---|
| 0:00–0:25 | **Officer queue** (SDO login, routing already correct) | 6 cases, lane chips. "Nothing here is decided. Everything is suggested." |
| 0:25–1:50 | **Hero case: Sunita.** AMBER because of missing pre-1950 papers → **lineage match found** | Side by side: her application vs her father's 2019 certificate (QR verified). Match-weight waterfall at 97%. The officer clicks *Confirm relationship*, the lane turns GREEN, and the draft order cites the certificate number and r.3(3). Officer edits one word and signs. "About 40 seconds for a case that used to be a rejection." |
| 1:50–2:50 | **Send-back case** (the name on the ration roster differs from the affidavit; no lineage hit) | The draft shows the "send back with specific deficiency" option. Then switch to the **citizen WhatsApp preview** in plain Hindi, with its "template + checked" badge. "Missing data never becomes a rejection." |
| 2:50–3:35 | **Conflict case** (a sibling holds a certificate in a different category) | AMBER, "Refer", with explanation and both records. **No red, no fraud word**, category labels only. "The officer decides. We just make sure they see it." |
| 3:35–4:05 | **Kendra pre-check** (operator view) | The operator types the father's name and village: "Matching certificate found, attach it." "The best rejection is the one that never happens." |
| 4:05–4:45 | **Collector dashboard, REAL MIS** | The district range map (labelled real, dated), lane mix, and the evaluation panel with P/R. |
| 4:45–5:00 | **Audit log** | Who viewed which record for which application. Close: "Every decision explainable. Every access logged." |

**Demo hygiene:**
- One laptop, with the browser pre-loaded and zoomed to 125%.
- tesseract traineddata and the Ollama model cached locally.
- No network calls in the critical path.
- A `reset_demo.sh` script.
- A recorded 5-minute backup video open in a second tab.
- Rehearse with a stopwatch at least three times.
- Don't type long strings live: use pre-filled fields and one click.
- **Don't show live OCR** unless it's on a pre-loaded clean sample. The degraded-scan result belongs on the evaluation slide, not in the live demo.

### 5.5 Q&A playbook: whoever answers, use this structure

1. Concede what's true ("we don't know the cause of the variance").
2. Name the mechanism that measures it ("shadow mode, week 1").
3. Point to a backup slide.

**Assign owners:** the tech lead takes Panelists 2 and 3, the product/story lead takes Panelists 1 and 4. Never argue with the CHiPS head about their own platform. Ask them instead: *"You'd know better than us: does the archive store the father's name as a structured field?"* Inviting the owner's expertise earns points.

---

## 6. Top 7 fixes, in priority order (for the 24 h build)

1. Add a **learned record-linkage model** (Splink, or a small supervised model) with an **evaluation and fairness slice**, and build the evaluation slide.
2. Add the **citizen layer**: a Kendra pre-check and a plain-Hindi send-back message behind an entity checker.
3. **Reframe the opening:** a person, then credit to Sewa Setu, then the data. Cut the "officers incentivised to reject" line and all "worst district" language.
4. **Cut scope** to lineage, send-back, pre-check and the real-MIS dashboard. Drop officer anomaly scoring from the demo.
5. **Reconcile the numbers** to v3 everywhere, attach an assumption to each, and prepare the archive hit-rate SQL as the week-1 pilot measurement.
6. **Integration honesty:** read-only replica plus blocking for search, API Setu for fetch-by-ID, "no free-text caste search", a rough cost, and a local or labelled LLM in the demo.
7. **Demo hardening:** offline, synthetic banner, reset script, backup video, three timed rehearsals. Move legal content to backup slides.
