# Round 8c: प्रमाण रीडर · Praman Reader, offline document AI for scanned papers (29-09-2026)
**Problem.** The README's first limitation was "no OCR of scans yet". The officer still reads every uploaded affidavit, school paper and earlier certificate by eye, then retypes names and numbers to cross-check them.

**Fix.** A new page, `/reader`, does four things:
- reads a scanned paper in the browser (OCR + QR);
- pulls out the fields an officer checks;
- compares them with the application and with the certificate archive;
- flags the same paper appearing on another file.

It runs fully offline: no CDN, no cloud. It gives neutral prompts only. It never says "fake" and never rejects.

## What the officer sees (`/reader`, `?app=` defaults to `SS/2026/KDG/08812`)
1. **Choose a paper.** Pick one of 4 synthetic samples or upload a PNG/JPG. Reading starts on its own, with a progress bar (engine → language data → reading).
2. **Fields read from the paper.** The page detects the paper type (affidavit / school leaving / caste certificate). It reads six fields: name, father's name, village, category + caste, certificate no. and issue date. Each field has an OCR **confidence** (the mean word confidence of the words it came from).
   - Each field is compared with the **application** and with the **archive**:
     - **✓ मेल** (matches);
     - **≈ वर्तनी भिन्न** (spelling variant, via normalised script + Levenshtein ≥ 0.8);
     - **⚠ भिन्न — मूल देखें** (differs, check original);
     - **? पढ़ाई अस्पष्ट** (unclear read: a difference with confidence < 60, or a Latin word inside a Devanagari name, is never shown as a mismatch).
   - Same person, other script: "Ram Lal Markaam" on the paper vs "Ramlal Markam" on the application shows ✓ plus "≈ अंग्रेज़ी वर्तनी भिन्न".
   - OCR digit/letter slips are fixed and shown, e.g. "पढ़ा गया C6/KDG/SD0/… → OCR सुधार (6→G, 0→O)".
3. **QR and consistency.**
   - The QR is decoded in the browser (jsQR) and checked against the archive record: "✓ QR से सत्यापित — अभिलेखागार से मेल".
   - If the printed number or date differs from the QR, the result is the neutral "QR अभिलेखागार से मेल खाता है, पर कागज़ पर छपी जानकारी QR से भिन्न है — मूल दस्तावेज़ देखें".
   - A missing record is "not a ground for rejection".
   - **Duplicate-paper check:** "यही कागज़ (या इसकी दूसरी स्कैन/फ़ोटो) आवेदन … में भी लगा है — दोनों प्रकरण देखें".
   - The footer on every result: a prompt to look, not a finding; the officer decides after seeing the original.
4. **Honesty strip.** It states:
   - OCR runs in the browser (in the SDC deployment, on SDC servers), and the image never leaves the machine;
   - only the certificate number (archive lookup, audited) and a 64-bit fingerprint go to the server;
   - the samples are synthetic.
5. **Application picker.** It covers 08812, 08835 and 08925, and there is an "open case →" link.

## Offline OCR (no network)
- **Dependencies:** `tesseract.js` 7 and `jsqr`, plus `qrcode` (dev dependency, used only to draw the sample QR).
- **Files served from `public/`:**
  - `tesseract/worker.min.js`;
  - the `tesseract-core-{relaxedsimd-,simd-,}lstm.wasm.js` cores;
  - `tessdata/{eng,hin}.traineddata` (copied from `~/csc`, uncompressed, with `gzip:false`).
- **Language order:** `['eng','hin']`.
- **Verified with all non-localhost traffic blocked** (Playwright route abort, fresh profile): **0 external requests**. The only tesseract loads are `/tesseract/worker.min.js`, `/tesseract/tesseract-core-relaxedsimd-lstm.wasm.js`, `/tessdata/eng.traineddata` and `/tessdata/hin.traineddata`.
- **When the archive API is down:** the table uses a bundled "offline copy" of the one hero record, and says so. The application comes from the existing mock fallback.

## Samples (`app/frontend/public/samples/`, SYNTHETIC)
- **How they were made:** rendered from HTML with headless Chrome (Kohinoor Devanagari). Each has a "नमूना / SAMPLE — Synthetic demo document, not a real record" band and a diagonal watermark. There is no emblem and nothing resembling an Aadhaar or PAN card.
- **The papers:**
  - `affidavit.png`: स्वघोषणा शपथ पत्र (Form 2A) for Sunita Markam d/o Ramlal Markam, Bayanar, Kondagaon, ST (Gond). It cites her father's certificate CG/KDG/SDO/2019/004512 dated 14-03-2019.
  - `school.png`: शाला त्याग प्रमाण पत्र, bilingual rows including caste "गोंड (अनुसूचित जनजाति) / GOND (ST)".
  - `prior_cert.png`: स्थायी जाति प्रमाण पत्र for रामलाल मरकाम (Ram Lal Markaam), CG/KDG/SDO/2019/004512.
  - `prior_cert_altered.png`: the same certificate, with the printed issue date changed to 14-03-2017. It exists for the "check original" cue.
- **QR payload** (matches the archive record): `SEWASETU-CG|CERT=CG/KDG/SDO/2019/004512|HOLDER=Ram Lal Markaam|ISSUED=2019-03-14|CAT=ST`.

## Backend
- **`reader_api.py` (new, an `APIRouter`).** `api.py` gains one line at the end: `import reader_api; app.include_router(reader_api.router)`.
- **`GET /api/archive/certificate/{cert_no}?app_id=&role=`:**
  - It normalises OCR confusions (C6→CG, SD0→SDO, short serials padded).
  - It returns the public certificate and its `qr_payload`.
  - Each lookup is **audited** as `archive_certificate_lookup`, with the records accessed and the app id. `Audit.tsx` gained one label line.
  - Unknown number: **404** `{found:false, detail:{hi,en}}` with "यह अस्वीकृति का आधार नहीं". Not a certificate number: 422.
- **`POST /api/reader/fingerprint {app_id, phash, kind, label}`:**
  - It stores a 64-bit **pHash** (DCT, as in Python imagehash), computed in the browser, and returns near-identical papers (≤ 10 of 64 bits) already read for **other** applications.
  - It is held in memory and cleared by a demo reset (it tracks `STATE.reset_id`).
  - Measured distances: `aff.png` vs its tilted, noisy phone photo `aff_noisy.jpg` = **4 bits**; different papers ≥ **18 bits**; the altered copy vs the original = 0.

## Frontend
- **New files:**
  - `pages/Reader.tsx` and `pages/reader.css`, scoped under `.reader`;
  - `reader/extract.ts`: the regex and keyword field rules, the comparison and the QR parser;
  - `reader/ocr.ts`: the worker singleton (warmed when the page opens), `ocr()`, `decodeQr()` and `phash()`.
- **Minimal shared edits:**
  - `main.tsx`: one import and one `<Route path="/reader">`;
  - `Layout.tsx`: one nav link, "रीडर / Reader";
  - `Audit.tsx`: one action label.

## Measured (headless Chrome, Apple silicon, network blocked)
| | |
|---|---|
| Engine cold start (fresh profile, local files) | ~0.9 s after page load (0.2–0.5 s warm) |
| OCR per page (≈1100 px wide) | affidavit 1.7 s · school 1.5 s · certificate 1.9 s (1.4–3.4 s across runs) |
| Click → full result (OCR + QR + archive + fingerprint) | 1.6–2.1 s |
| Character accuracy vs ground truth | affidavit **99.5%** · school **99.5%** · certificate ~97% on printed text. Raw 81% counts the junk read from the QR's pixels; the misses are "बुधराम"→"germ" and C6/SD0. |
| Fields correct | **20 / 22** across the 4 samples. Both misses are the certificate's grandfather name "बुधराम", read as "germ". They are flagged "? पढ़ाई अस्पष्ट", **never** a mismatch. The cert-no slips are auto-corrected, and the lookup still matches the archive. |
| Legacy `aff.png` / `aff_noisy.jpg` (3-word name, "पिता") | name, father and village all read correctly on both, including the tilted photo |

## Tests
- **`uv run pytest -q`:** **105 passed**, including the other agents' tests. The new file `tests/test_reader.py` has 4 tests:
  - OCR-confusion normalisation;
  - hero lookup via raw, URL-encoded and OCR-garbled numbers, with no `_` internal fields, the exact QR payload, and 3 audit entries;
  - a neutral 404 plus a 422;
  - fingerprint behaviour: another file only, not self, a 1-bit rescan found, an unrelated paper not found, a bad hash gives 422, and a reset clears it.
- **`npm run build`:** passes, tsc clean. The chunk-size warning comes from the existing bundle.
- **Browser (Playwright, Hindi and English):**
  - all 4 samples;
  - the duplicate flow: aff.png on 08835, then aff_noisy.jpg on 08812 → "⚠ … 08835 … (4/64 बिट)";
  - the affidavit on 08835 → name, father, village and caste "⚠ भिन्न — मूल देखें" against Pooja Sahu's file;
  - archive API aborted → "(ऑफ़लाइन प्रति)";
  - 390 px mobile: no horizontal overflow.

## Honest limits
- The samples are clean renders; real Kendra scans are skewed, stamped and handwritten. Handwriting is not supported (Tesseract).
- The field rules cover these three paper types. Other formats show only the fields the rules can find.
- The QR format is our demo format. Real Sewa Setu QR content would need CHiPS' spec.
- The fingerprints only cover papers read in the Reader during this session. A production version would hash every upload at the Kendra.
- For the SDC deployment, the same tesseract data can run server-side, or be swapped for Bhashini OCR.
