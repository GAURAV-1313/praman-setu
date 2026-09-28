# Praman Setu: Limitations, Why We Left Them, and What We Can Still Close Before the Demo
28-09-2026 (hackathon day). **Decision rule:** close a limitation before the demo only if all three hold:
- it answers a question the jury is likely to ask;
- it fits in about 2 hours;
- it cannot break the rehearsed 5-minute demo.

| # | Limitation | Why we did not do it | Close before demo? | Effort / risk | Decision |
|---|---|---|---|---|---|
| 1 | **Lower match recall for women applicants (0.33 vs 0.48 overall)** | Married women's family records sit in their maiden (parents') village. The search is scoped to the applicant's current village and tehsil. We only found this in our own sliced evaluation. | **Yes** | ~1.5–2 h; low risk (optional field, new demo case, existing cases untouched) | **Doing it now:** maiden/native-village search at the Kendra and on the officer screen, plus a new evaluation slice |
| 2 | **No document viewer or OCR for scanned papers** | Real scans are citizens' private data, and fabricating realistic ID scans is risky (fake-ID look). Our thesis is to use evidence that is *already digital* (the certificate archive), not to read paper better. | Partial (viewer + OCR of one synthetic affidavit) | ~2 h; medium risk (new UI in the case view, OCR timing on stage) | **Not before the demo.** Say "OCR inside the SDC is Phase 2 (Tesseract/Bhashini, both already tested on Hindi)". |
| 3 | **First-generation applicants: nothing to find** | By definition there is no earlier certificate. Software can't create evidence. | Already mitigated | — | Show it as designed: no match means normal scrutiny, plus a pre-filled Patwari family-tree request (already built) |
| 4 | **Accuracy on real records unknown (synthetic data we generated)** | We have no access to real certificate data, and shouldn't (DPDP; no data-sharing order). | **No** (impossible without real data) | — | The 6-week study inside the SDC plus the 98% pilot bar. Say it first, before the jury does. |
| 5 | **Land (Bhuiyan) and ration (Khadya) evidence is mocked** | Name-level search needs a Revenue order and NIC approval. API Setu only offers fetch-by-number PDFs. | No | — | Phase 2 after a Revenue order. Phase 1 uses only CHiPS's own archive. |
| 6 | **No live Sewa Setu / API Setu integration** | Onboarding takes weeks and credentials are the government's. The console is recreated from a public walkthrough. | No | — | Mock in real API shapes. The webhook plus panel design means CHiPS changes very little. |
| 7 | **Login, OTP, 5-minute timeout, speed-only ranking** | These are part of Sewa Setu. We add a panel and deliberately don't replace the console. | No (out of scope by design) | — | Mention as suggestions to CHiPS, never as criticism |
| 8 | **Patwari workload may rise with referrals** | A staffing issue, not software | No | — | Referral is optional; track it in the pilot |
| 9 | **Voice / Chhattisgarhi, Gondi, Halbi** | No reliable production speech models for Chhattisgarhi or Halbi, and Gondi is beta only (Adi Vaani). Voice bots are commoditised and not where the rejections are. | No (deliberate) | — | Out of scope; Hindi-first text and a printout at the Kendra |
| 10 | **Plain-language rewrite by an LLM not used (templates only)** | Deliberate: offline, no hallucinated names or numbers. An entity checker verifies every message. | Could add; not worth the risk | — | Keep templates. Say "we chose templates so no message can invent a fact". |
| 11 | **Other ~100 services** | Deliberate focus: caste + domicile = 82% of all rejections | Not needed | — | "A new service = a rule file + message templates; domicile already runs" |

**Summary for the jury:**
- *Deliberate choices:* 7, 9, 10, 11.
- *Blocked by data access or law, which the pilot is designed to unlock:* 4, 5, 6.
- *Found by our own testing, and fixed today:* 1.
- *Planned next phase:* 2, 3, 8.
