# 10 · Feasibility of AI/ML additions to Praman Setu (29-09-2026)

This is a quick audit of this machine: Apple M4, 16 GB, macOS, 18 GB of disk free. The project code was not modified. Scratch tests ran in `scratchpad/feas`.

## What is on this machine
| Item | Status |
|---|---|
| tesseract CLI / tessdata | **Not installed.** `brew install tesseract tesseract-lang` would work (5.5.3 bottle), but it is not needed; see Apple Vision below. |
| tesseract.js in frontend | **Not installed.** |
| **Apple Vision OCR** (built into macOS, via `swift`) | **Works, supports `hi-IN` and `mr-IN`.** On `samples/aff.png` and `aff_noisy.jpg` it returned the Hindi affidavit (name, father, village, tehsil, district, income) **character-perfect on both**. The only error was the case of the masked "XXXx". The first `swift` run takes about 60 s (JIT). Compile once with `swiftc` so each call is under a second. Offline. Test script: `scratchpad/feas/ocr.swift`. |
| Local LLM (ollama, llama.cpp, LM Studio, HF cache) | **None.** Nothing is listening on :11434 or :1234. Adding one means about 1 GB of binary plus a 2 to 5 GB model, and disk is at 91%. |
| whisper / whisper.cpp / faster-whisper | **None.** ffmpeg is present. |
| Backend venv | Has rapidfuzz, splink, numpy and pandas. It does **not** have networkx, sklearn, PIL, imagehash, qrcode, cv2 or pyzbar. |
| pip / network | **Works.** `networkx imagehash qrcode opencv-python-headless scikit-learn pillow` installed in about 45 s (278 MB, mostly opencv and scipy). |
| QR decode | `qrcode` generates, and `cv2.QRCodeDetector` decoded the payload exactly. This avoids `pyzbar`, which needs `brew zbar`. |
| Perceptual hash | `imagehash.phash`: clean vs noisy affidavit gave a distance of **4**, so near-duplicate detection works at a threshold of about 8 or less. |
| Frontend | **cytoscape is already a dependency**, and `components/FamilyGraph.tsx` exists (a small applicant↔relative graph). recharts and d3 are also present. |
| Rules | `data/rules/income_certificate.starter.jdm.json` exists as a starter. `rules.py` is caste/domicile-specific (`service_kind`). |
| Archive | 8,754 certificates with holder, father, village LGD, category and caste. This is enough for graph analytics. |

## Feasibility table
Hours are for backend + frontend + tests, plus the offline mock fixture that the frontend's offline mode needs for each feature.

| # | Feature | Hours | Deps present? | Demo risk | "AI" visibility | Recommendation |
|---|---|---|---|---|---|---|
| A | Document AI: Hindi/English OCR of affidavit or school certificate → extract name, father, village, caste → compare with the form and archive (mismatch flags) | **2.5–3** (Vision OCR CLI 0.3, regex/field extraction plus normalise.py and rapidfuzz compare 1, upload UI and mismatch pills 1, tests and a pre-computed offline fixture 0.5) | **Yes.** Apple Vision is built in (hi-IN). No install. | Low. Offline and under 1 s once compiled. Keep a pre-computed JSON fallback for the demo images. Mac-only, so say "production: Bhashini / Tesseract". | **Very high.** A photo becomes fields and a red "father's name mismatch" flag. | **BUILD FIRST** |
| B | QR / e-sign verification: QR on archived certificate PDFs; decode an uploaded image and verify against the archive | 1.5–2 | pip install `qrcode opencv-python-headless` (~200 MB) | Low. Offline. Use a signed-hash payload (HMAC) and show "tampered" when a field is edited. | Medium. It reads as verification rather than AI. | BUILD if time permits (pairs with A: "scan certificate QR") |
| C | Family knowledge graph and analytics across the archive (3 generations): conflicts (same father → different categories), duplicate identities, one father in several villages ("ring" signal) | **2–2.5** (networkx build and 3 detectors 1, Collector "Integrity signals" list plus an extended cytoscape view 1, tests 0.5) | networkx needs pip (small). cytoscape is already in the frontend. | Low. Precompute at load. Synthetic data may need 2–3 seeded conflict cases so the demo shows hits. Frame the output as "for review", never as "fraud". | **High.** A network visual with flagged clusters. | **BUILD SECOND** |
| D | Human-in-the-loop: officer same/not-same → labels → recalibrate → before/after precision on the Collector model card | 2–2.5 (confirmations are already persisted in `state.json` and the audit log; add a logistic recalibration of match score to P(same), plus a card delta) | Present. Can use numpy only, or sklearn via pip. | Medium. With only a few demo labels the metric change is small or noisy. Seed about 50 simulated officer labels from held-out ground truth, and state that they are simulated. | High. "The model learns from officers." | BUILD THIRD, as a small version (recalibration and a card), not full retraining |
| E | Grounded GenAI: plain-Hindi explainer and "ask this file" Q&A with a fact verifier | 2 with templates/intents. 4–5 or more with a local LLM. | **No LLM.** Ollama would need about 3–6 GB of downloads with 18 GB free. | High with an LLM (download, latency 2–10 s, Hindi quality on 3B models). Low with templates. | High if it is an LLM. Moderate if templates. | Do the **template/intent Q&A only** (8–10 canned intents answered from the analysis JSON, each with the citation shown). Skip the LLM. messages.py already checks citizen messages against records. |
| F | Proactive services: income-certificate expiry / renewal nudge; life-event trigger | 1.5–2 | Present (archive dates plus templates) | Low | Low to medium. It is automation more than AI. | Optional. A good 1-slide or 1-screen story. |
| G | Generalisation: +1–2 services (income renewal, legal heir / वारिस, EWS) via rule files and templates | 3–4 (`rules.py` is hard-wired to caste/domicile, and every service needs a checklist, templates and fixtures) | Starter JDM file is present | Medium. Touches core engine paths on demo day, with regression risk. | Low to medium | **Skip.** At most, show the income JDM rule file in the pitch as "same engine". |
| H | Duplicate-document detection via perceptual hash | 1–1.5 (hashes are computed at upload in A's endpoint, then compared with stored hashes) | pip `imagehash pillow` (small). Tested: distance 4 on the noisy copy. | Low. Offline. | Medium. "This affidavit was already used in file X." | **BUILD as an add-on to A** (cheap once uploads exist) |
| I | Hindi voice STT at the Kendra | 2–3 | **No whisper.** faster-whisper plus the small model is about 0.5 GB, and it is weak on Hindi names. The browser Web Speech API needs internet (Google). macOS SFSpeech hi-IN is possible but needs a Swift app with permissions. | High (mic, network, accuracy on names) | High | **Skip** |

## Recommended build order (~6 h)
1. **A. Document AI OCR (3 h).** Compile `ocr.swift` into `app/backend/bin/vision_ocr` and add `POST /api/ocr` (image → text → fields). Extract fields from the "मैं … पिता श्री …, निवासी ग्राम …, तहसील …, जिला …" pattern and an English equivalent. Compare them with the application and the matched archive record using the existing normalise/rapidfuzz code. Show a card with a green/red flag per field, and state that the officer decides. Add a fixture for offline mode.
2. **H. pHash duplicate check (0.5 h),** folded into the same upload endpoint: "Same document seen in SS/2026/…".
3. **C. Archive graph integrity signals (2 h).** Build a networkx graph at startup and add three detectors. Seed 2–3 cases. Show them as a Collector card plus a "view family network" link that extends FamilyGraph to 2–3 generations.
4. **D-lite. Officer-feedback calibration (0.5–1 h, only if time remains):** a "labels collected: N, calibration updated" line on the model card, with honest simulated labels.

Buffer: B (QR) is the next pick if there is time. Skip E-LLM, G and I for demo day. Mention them in the pitch as roadmap items (Bhashini ASR/LLM, more services).

Install needed for the recommended path: `uv add networkx imagehash pillow` (small; avoid opencv unless B is built). Nothing else.
