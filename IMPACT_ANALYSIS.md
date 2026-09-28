# Praman Setu: Impact Analysis and Critique
27-09-2026. Recomputed from the raw Sewa Setu MIS (01-04-2025 to 26-09-2026, 544 days = 1.49 years). Figures are annualised.
**This file supersedes the impact numbers in the plan (v4 §3),** which contained two errors, listed in §6.

---

## 1. Baseline (real data)
| | Per year |
|---|---|
| Caste applications (SC/ST + OBC) | **~7.96 lakh** |
| Caste rejections | **~1.48 lakh** (≈19–21% of decided) |
| Domicile applications / rejections | ~7.06 lakh / ~51,000 |
| Camp caste applications rejected | **41%** (4,530 of 10,977 in 18 months) |
| Applications pending beyond SLA (all services) | 4,264 total. **Delay is not the problem.** |

---

## 2. Impact by stakeholder

### 2.1 Citizens (SC/ST/OBC applicants, mostly students and young job-seekers)
**Mechanism:**
1. The Kendra pre-check finds a family certificate *before* submission.
2. The officer sees it, and approves or sends back a fixable gap instead of rejecting.

**Avoided rejections a year.** Two assumptions drive the result:
- **A** = share of rejected applicants whose relative's certificate is in the digital archive
- **B** = share of those that convert to an approval or a cured send-back

| Scenario | A | B | **Avoided rejections/yr** | Direct cost saved (₹400–700 each) |
|---|---|---|---|---|
| Low | 10% | 40% | **~5,900** | ~₹0.24 cr |
| Mid | 20% | 55% | **~16,300** | ~₹0.90 cr |
| High | 35% | 70% | **~36,300** | ~₹2.5 cr |

Direct cost per avoided rejection:
- 1–2 days of wages at ₹261/day
- ₹50–100 travel
- ₹30 re-application fee
- typical overcharge at the counter

**What the citizen actually gains** (more important than the rupees):
- **Time.** Each avoided rejection saves a full re-application cycle, typically 3+ weeks (the portal lists up to 22 days for caste). For a student, that decides whether a **scholarship, admission or job application deadline** is met.
- **Clarity.** A plain-Hindi reason ("attach your father's certificate No. …") replaces a one-line rejection. No guessing, no tout.
- **Fewer trips.** A cured send-back needs no new application and no new fee.
- **Rights.** The applicant is told which government records were used, as DPDP requires.

**Critique:**
- ❌ **Money is small.** ₹0.24–2.5 cr a year across the state is under ₹20 per caste applicant. Don't lead with rupees. Lead with deadlines and dignity.
- ❌ **The benefit is uneven.** Only families *already in the archive* benefit. The archive has been digital since 2015 (on DigiLocker since 2018).
  - First-generation, migrant, landless and women applicants (caste is often traced through the father's line) get **nothing directly**. They land in "standard review", i.e. exactly today's process.
  - This is a **"rich-get-richer" risk**. It stays neutral only if "standard review" is genuinely not treated as suspicious.
- ⚠️ **Assumption A is unknown and is the weakest link.**
  - Our earlier plan used 30–50%. The government critic judged that optimistic. We now use 10–35%.
  - With a young archive, **sibling** matches are more likely than father matches.
  - The retrospective study exists to measure A before anyone spends pilot money.
- ⚠️ **Not every rejection is wrong.** Some rejections are *correct*: ineligible, out-of-state OBC, or genuinely fraudulent. The goal is **correct decisions, not fewer rejections**.
  - Measure **avoidable** rejections and **appeal reversals**, not the raw rejection rate.
  - Some low-rejection districts may simply be lax.
- ⚠️ **Timing.** Citizens see zero benefit during the 6-week study and the 90-day shadow phase. Real impact starts roughly 6–9 months after approval.

### 2.2 Officers (SDO for permanent caste, Tehsildar for domicile)
| Scenario | Share of caste applications reaching "records complete" | Minutes saved each | **Hours/yr** | Officer-years |
|---|---|---|---|---|
| Low | 15% | 3 | ~6,000 | ~3 |
| Mid | 25% | 4 | ~13,300 | ~7 |
| High | 35% | 5 | ~23,200 | ~12 |

**Other officer gains:**
- Every avoided rejection is **one fewer re-application file**, about 6k–36k files a year.
- **Fewer appeals and writ petitions.** After the CG HC ruling of 22-07-2026, rejections that ignore a family certificate are legally vulnerable.
- **A defensible, reasoned order.** The draft cites Rule 3(3) and the certificate number. This protects the officer, if a Revenue circular recognises it as due diligence.

**Critique:**
- ❌ **Time savings are modest.** 3–12 officer-years spread across the state comes to a few days per SDO per year. The honest pitch is **"better-evidenced decisions"**, not "we save lakhs of hours". Our v2 figure of 1.8–2.5 lakh hours was wrong.
- ❌ **It can *add* work.** A "confirm relationship" click on every match, plus reviewing "needs attention" flags, costs time. Clean files must need **zero extra clicks**, or adoption dies.
- ❌ **Liability can backfire.** If override logs can be used against officers, the rational response is to reject every flagged case, which would push rejections *up*.
  - The tool is only safe with a **Revenue circular**: the evidence card counts as due diligence, and override logs are never used for ranking.
- ⚠️ **Shadow mode saves nothing.** It shows the check *after* the officer decides. It exists to measure, not to help, and the officers carry that cost.

### 2.3 Government (Revenue Department, CHiPS, Collectors, Tribal Department)
**Gains:**
- **Consistency.** It makes the 2.3%–13.2% district gap visible and explainable by reason codes, and the pilot can test whether evidence narrows it.
- **Litigation risk down.** It puts the July 2026 CG HC rulings into practice: family certificates as evidence, and correct authority routing.
- **AI Mission delivery.** A credible, low-risk "AI in governance" use case (the Mission targets 50+ AI services), with the evaluation and guardrails the state's own Mission and the DPDP Rules require.
- **Compounding asset.** Every certificate issued becomes evidence for the next family member, so the hit-rate (A) **rises every year** with no new data collection.
- **Integrity signals.** Inconsistencies between family certificates feed the **risk-based r.15(2) post-issue audit**, instead of a purely random 10% sample.
- **NeSDA 2025:** supports the "Leveraging Emerging Technologies" and "End-service delivery" parameters.

**Critique:**
- ❌ **The rupee return is weak.** A rough cost of ₹10–20 cr over 5 years (unverified estimate) against ₹0.24–2.5 cr a year in citizen savings is at best break-even. **The case must rest on fairness, legal compliance and deadlines, not ROI.** A government audience understands that framing, if it is stated honestly.
- ❌ **Causes are unknown.** We have no public data on *why* caste applications are rejected. If most rejections are for reasons lineage can't fix, the core feature underdelivers.
  - Examples of reasons it can't fix: out-of-state OBC, wrong authority, missing affidavit, genuine ineligibility.
  - The pre-check and send-back still help with document gaps. The study must pull **rejection reasons** as well as lineage availability.
- ❌ **Lineage can launder fraud.** One fake certificate in the archive can "prove" a whole family.
  - Mitigations: check each certificate's cancellation/HPSC status, competent-authority checks, and audits of the "records complete" lane.
  - A residual risk remains. Say so.
- ⚠️ **Data ownership and politics.** Revenue owns the data and the decisions. CHiPS owns the platform.
  - It needs a Revenue GO, and State Data Governance Committee approval for Phase 2 sources.
  - Caste is politically sensitive: "AI decides your caste" is the headline risk. The name, the framing and the guardrails must pre-empt it.

---

## 3. The uncomfortable question: is AI even necessary?
**A cheap non-AI version captures part of the benefit:**
- a **mandatory "family member's certificate number" field** on the caste form, plus exact lookup of that certificate
- a **Revenue circular** telling officers to accept it under Rule 3(3)

**Where AI is genuinely needed:**
- when the citizen **doesn't know or have** the certificate number, which is common for rural and older families
- when names are spelled differently across records (Hindi vs English, "Sukhram" vs "Sukharam", Gond sub-group names)
- **to rank candidate matches** safely among lakhs of certificates with common surnames (Netam, Markam, Sahu), which exact lookup can't do

**Recommendation:** pitch this honestly as **Phase 0 (policy + exact lookup) → Phase 1 (learned matching)**.
- It shows judgment, and it pre-empts the IIIT jury question "where's the AI and why?"
- It gives the government a no-regret first step.
- The AI earns its place on the long tail where exact lookup fails. The study can measure that share (the certificate is in the archive but the citizen didn't cite it).

---

## 4. Net verdict
| Stakeholder | Impact | Confidence | Biggest risk to impact |
|---|---|---|---|
| Citizens already in the archive (families with a post-2015 certificate) | **High per person** (deadline met, one trip, clear reason) | Medium | Assumption A lower than hoped |
| First-generation / migrant / women applicants | **Low direct; neutral at best** | Medium | "Standard review" becoming stigmatised |
| Officers | **Low–medium** (evidence quality and legal cover > time saved) | Medium | Liability fear, extra clicks |
| Government | **Medium** (consistency, litigation, AI Mission credibility, integrity) | Medium–low until the study | Rejection causes unknown; data-sharing approvals |
| State finances | **Negligible to break-even** | Low | — |

**Bottom line:** the impact is **real but narrower than our earlier plan claimed**.
- **What it is:** a targeted fix for the single largest source of rejections, where it helps most is time-critical students from families already in the system, and it builds an asset that improves every year.
- **What it is not:** a statewide cost or time saver.
- **Pitch it** as fairness plus legal compliance plus a measurable, cheap first step: a 6-week study that tells us the true hit-rate before any big spend.

---

## 5. How to present impact on the slide (honest version)
> **For a student like Sunita:** one visit instead of three, a clear reason in Hindi, and the scholarship deadline met.
> **Statewide (estimate):** about **6,000–36,000 fewer avoidable caste rejections a year** (mid ~16,000). The range depends on one number, the family-certificate hit-rate, **which our 6-week study measures first.**
> **For officers:** reasoned, record-cited orders, backed by the July 2026 High Court ruling, with no extra clicks on clean files.
> **For the state:** consistency across 33 districts, fewer appeals, and an evidence base that grows with every certificate issued.

## 6. Corrections to the plan (v4 §3)
- **Caste applications are ~7.96 lakh a year, not 5.3 lakh.** The earlier figure was a miscalculation.
- **Avoided rejections:** the honest range is **~6k–36k a year (mid ~16k)**. v4 said 22k–51k.
- **Officer hours:** **~6k–23k a year (3–12 officer-years)**. v4 said 18k–26k, and v2's 1.8–2.5 lakh was wrong.
- **Citizen money:** **₹0.24–2.5 cr a year.** Don't headline it.
- **New, add to the pitch:** camp caste applications are rejected at **41%**. The Kendra/camp pre-check has its biggest opportunity there.
