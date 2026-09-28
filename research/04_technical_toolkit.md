# 04 · Technical Resource Kit: "Nirnay Sahayak" (Sewa Setu Hackathon, PS1)
Compiled 27-09-2026 for the 24-hour build on 28-09-2026.

**Evidence tags**
- **[V]** = verified today by running it, doing a HEAD/GET check, or querying the registry (npm, PyPI, GitHub, or HF API).
- **[D]** = taken from the vendor or docs page.
- **[U]** = unverified. Recalled from memory or seen in a single secondary source. Check it before it goes on a slide.

---

## 0. TL;DR: the 24h stack (one pick per component)

| # | Component | **24h pick** | Why | Fallback if it breaks |
|---|---|---|---|---|
| — | Runtime | **Python 3.11 via `uv`** (backend) + **Node 24 / Vite + React 19 + TS** (UI) | The system `python3` is 3.9.6 [V], and scikit-learn 1.9, surya, splink, doctr and networkx 3.7 all need ≥3.10/3.11 [V]. `uv` and `/opt/homebrew/bin/python3.11` are already installed [V]. | Docker is installed [V] |
| 1 | OCR (Hindi + English) | **tesseract.js 7.0.0** with language order **`['eng','hin']`** | Tested today on a synthetic Hindi affidavit: **100% of characters correct on the clean scan**, 2.2 s, confidence 91 [V]. Needs no native install and can run in the browser: *"documents never leave the officer's PC"*. | `pytesseract` + `brew install tesseract tesseract-lang`. Stretch goal: PaddleOCR PP-OCRv5 `devanagari_PP-OCRv5_mobile_rec` |
| 2a | QR read | **OpenCV `QRCodeDetector`** (`opencv-python-headless`, no system dependencies). The browser uses `@zxing/browser` or `jsqr`. | pyzbar needs the `zbar` dylib from brew | jsQR in the browser |
| 2b | Aadhaar Secure QR | **`aadhaar-py` 2.0.2 (MIT)** to parse + **our own RSA-SHA256 check with `cryptography`** against the UIDAI public certificate. **Demo on synthetic QR codes signed with a demo key.** | Neither pyaadhaar nor aadhaar-py documents signature verification [D], so ~40 lines of our own code are needed (§2.2) | Show the "parse + Verhoeff + mask" path only |
| 2c | e-signed PDF (prior certificates) | **pyHanko 0.37 (MIT)**: validates PAdES signatures | Standard, pure Python | Show the signature fields with pypdf |
| 3 | Rules-as-code | **GoRules Zen: `zen-engine` 2.0.2 (Python, MIT)** + JDM JSON files. Show `@gorules/jdm-editor` 1.52 (React) for the "edit rules visually" moment. | Smoke-tested today: decision table evaluated in 0.85 ms [V]. The same JSON runs in Node, Go, Java, Rust and C#, which gives a direct production path. | `json-rules-engine` 7.3.1 (npm, ISC) or a hand-rolled evaluator |
| 4 | Name matching | **Custom Indic normaliser (`anyascii` + rules) + RapidFuzz 3.14** (token_sort + Jaro-Winkler) | Tested today: "Shyamlal Dhruw" vs "श्यामलाल ध्रुव" → 100. "Ramesh Kumar Sahu" vs "रमेश कुमार साहू" → 97 [V] | `indic-transliteration` (sanscript) for canonical romanisation |
| 5 | Lineage graph | **Cytoscape.js 3.34 + `react-cytoscapejs` 2.0** (MIT) with **networkx** in the backend for conflict detection | Real graph semantics (BFS, paths, classes for conflict edges). Good layouts (cose, breadthfirst). | React Flow (`@xyflow/react` 12.12) or vis-network 10.1 |
| 6 | Anomaly | **`imagehash` 4.3.2 (pHash) + scikit-learn IsolationForest + plain SQL rules** (reused mobile, off-hours approvals) + a 15-line ELA | Everything is CPU-only and explainable | Rules only |
| 7 | LLM drafting | **Jinja2 bilingual template first (always works)**, with an **LLM "polish/reasoning" layer from the Sarvam API model `sarvam-30b`** (same Apache-2.0 weights you would self-host) | ₹100 free credits, 60 req/min [D]. The self-host story needs no rewrite. | Local **Ollama `gemma4:e4b`** (fits 16 GB M4) or template only |
| 8 | UI | **shadcn/ui + Tailwind 4 + Recharts 3.10**, styled with **UX4G colours/typography**, plus the **UX4G accessibility widget** script | Fastest to build, and it looks gov-grade | UX4G CSS (Bootstrap-based) directly |
| 8b | District map | **`react-simple-maps` 5.0.5 (MIT) or `d3-geo`** + our **33-district LGD GeoJSON** (saved, §5) | No tile server, so it **works offline**, and it is MIT. Avoids react-leaflet's **Hippocratic licence** [V]. | Leaflet 1.9.4 (BSD) used without the react wrapper |
| — | DB | **SQLite (or DuckDB)** + JSON files for synthetic registries | Zero ops | — |

**Machine facts (this laptop):** Apple M4, 16 GB [V]; Node v24.11.0; Docker; Chrome; brew.
Not installed: `tesseract`, `ollama`, `exiftool`, `7z` [V].

---

## 1. Bootstrap commands (copy-paste)

```bash
# Backend (never use system python 3.9)
cd ~/HACKATHON && uv init backend --python 3.11 && cd backend
uv add fastapi uvicorn[standard] pydantic jinja2 \
      opencv-python-headless pillow pypdf pyhanko cryptography aadhaar-py \
      rapidfuzz jellyfish anyascii indic-transliteration \
      zen-engine networkx imagehash scikit-learn pandas duckdb \
      faker openai sarvamai python-multipart
# optional heavy extras (only if time):
uv add pytesseract            # needs: brew install tesseract tesseract-lang
uv add paddleocr paddlepaddle # ~1 GB+, CPU works on macOS arm64
uv add splink                 # production-style ER demo (DuckDB backend)

# Frontend
npm create vite@latest ui -- --template react-ts && cd ui
npm i tesseract.js@7 @zxing/browser cytoscape react-cytoscapejs recharts \
      react-simple-maps d3-geo @gorules/jdm-editor i18next react-i18next
npx shadcn@latest init        # Tailwind 4 + shadcn (shadcn CLI 4.21)

# Optional local LLM (user must install; ~3-8 GB download: do it BEFORE the venue)
brew install ollama && ollama pull gemma4:e4b      # or gemma4:12b (tight on 16 GB)
# Tesseract CLI (optional)
brew install tesseract tesseract-lang exiftool
```

**Pre-cache before the venue:** tesseract.js downloads `eng`/`hin` traineddata from a CDN on its first run. Run it once at home, or set `langPath` to a local folder. Also pull the Ollama models and `npm i` / `uv sync` at home. Venue Wi-Fi is the #1 demo killer.

---

## 2. Component evaluations

### 2.1 OCR: Hindi + English documents

**Our own test (27-09-2026) [V]**

The test image was a synthetic affidavit rendered via headless Chrome. Saved in `data/synthetic/samples/`.

| Setting | Result |
|---|---|
| tesseract.js 7, `['hin','eng']`, clean PNG | All Hindi correct. **Latin/digit line garbled**: "Mobile: १89>00000070". The `hin` model reads digits as Devanagari. |
| tesseract.js 7, **`['eng','hin']`**, clean PNG | **100% correct**, including `₹ 72,000`, `4821` and `98XXXXXX10`. conf 91, ~2.2 s total incl. model load. |
| tesseract.js 7, `['hin','eng']`, **degraded JPEG** (2.5° rotated, blurred, q=35, 67% scale) | Hindi lines are still perfect. **Digits drift** (`4821→4820`, mobile garbled). **Always validate numeric fields** (Verhoeff for Aadhaar, 10-digit regex for mobile, a sane range for income) and show OCR confidence to the officer. |

**External benchmark**

*Can OCR-VLMs Read Devanagari?* (arXiv 2606.29213, Jun-2026; repo `Aditya-PS-05/devanagari-ocr-benchmark`, MIT) scored 300 **real printed** Devanagari scans [D]:

| System | Mean CER | chrF++ |
|---|---|---|
| Gemini 2.5 Flash | 4.4 | 86.3 |
| Claude Opus | 5.1 | 82.2 |
| Qwen3-VL-8B (open) | 9.3 | 75.2 |
| GPT-5.5 | 18.4 | 58.5 |
| EasyOCR | 34.3 | 58.3 |

- **Lesson:** synthetic clean text flatters everything (every system scored chrF++ 91–98). Real scans separate the systems.
- Tesseract `hin` scored CER 2.25% / WER 5.83% on printed Hindi in the RoundTripOCR study (arXiv 2412.15248) [D].
- For handwritten Devanagari, Tesseract and PaddleOCR fail [D].

**Tool evaluations**

| Tool | Link | Licence | Maturity | Hindi | 24h use | Production path |
|---|---|---|---|---|---|---|
| **Tesseract 5** (`hin`, `script/Devanagari`) | github.com/tesseract-ocr/tesseract (76.7k★, active) | Apache-2.0 | Very mature | Yes. `tessdata_best/hin.traineddata` and `script/Devanagari.traineddata` both download (HTTP 200) [V]. | `brew install tesseract tesseract-lang`; `pytesseract.image_to_string(img, lang="eng+hin")` | CPU-cheap baseline; fine-tune on CG forms with `tesstrain` |
| **tesseract.js 7.0.0** | github.com/naptha/tesseract.js (38.7k★) | Apache-2.0 | Mature | Yes (tested) | **Pick.** Runs in the browser or Node. | Client-side OCR = privacy by design |
| **PaddleOCR 3.7 / PP-OCRv5** | github.com/PaddlePaddle/PaddleOCR (90k★) · HF `PaddlePaddle/devanagari_PP-OCRv5_mobile_rec` | Apache-2.0 | Very active | Dedicated Devanagari rec model (v5 claims +30% multilingual accuracy over v3) [D] | `uv add paddleocr paddlepaddle`; `PaddleOCR(lang="hi")` or the devanagari model name. Install is heavy and some Linux builds segfault [D]. | **Best open production candidate**: GPU server, PP-StructureV3 for layout/tables |
| **Surya 0.22** (datalab) | github.com/datalab-to/surya (21k★) | Code Apache-2.0; **weights are a modified OpenRAIL-M: free only for research/personal/startups under $5M** [D] | Very active | Hindi 82.2% on their internal bench [D] | Needs Python ≥3.10. On Mac it runs via llama.cpp at **~0.1 page/s** [D], too slow for a live demo. | Good accuracy, but **the licence needs a commercial agreement for government use**, so flag it |
| **docTR 1.1** (mindee) | github.com/mindee/doctr | Apache-2.0 | Active | **No Devanagari recogniser out of the box** (detection is script-agnostic) [D] | Skip | Would need training |
| **EasyOCR 1.7.2** | github.com/JaidedAI/EasyOCR | Apache-2.0 | Stale (last release 2024) | `hi` supported, but **enabling `hi` together with `en` misreads Latin text** [D]. Real-scan CER 34% [D]. | Skip | Not recommended |
| **IndicPhotoOCR** (Bhashini-IITJ) | github.com/Bhashini-IITJ/IndicPhotoOCR (55★, active Aug-2026) | MIT | Research toolkit | 11 languages incl. Hindi | Built for **scene text** (signboards), not scanned forms | Useful for photos of house signs and shopfronts |
| **AI4Bharat Indic-OCR** | github.com/AI4Bharat/Indic-OCR · ocr.ai4bharat.org | No licence file | **Dormant since 2022** [V] | — | Skip | — |
| **Bhashini / ULCA OCR** | bhashini.gov.in/ulca · IITB-LEAP-OCR/bhashini-ocr-api | Gov API | ULCA lists OCR models for 12+ languages, but the pipeline docs cover ASR, NMT and TTS [D] | Hindi | Don't depend on it in 24h | **Sovereign production story:** "Bhashini OCR where available, PaddleOCR on SDC GPUs otherwise" |
| Google Vision / Azure Read / Gemini | — | Commercial | — | Excellent | **Demo-only.** Sends PII abroad, so say so explicitly if you use it. | Not for production (DPDP, data residency) |

**OCR pitfalls**
- Put **`eng` first**.
- OCR each field region separately with a whitelist (`tessedit_char_whitelist=0123456789` for numbers).
- Deskew and binarise with OpenCV first (`cv2.adaptiveThreshold`).
- Normalise Unicode to **NFC** before matching. Nukta variants such as ड़ vs ड + ़ break string equality.
- `₹` is sometimes read as `र`.

### 2.2 Verification: Aadhaar Secure QR, Verhoeff, masking, e-signed PDFs, DigiLocker, MeriPehchaan

**Aadhaar Secure QR (offline)**
- **Spec:** UIDAI "Secure QR Code Specification" (PDF `uidai.gov.in/images/resource/User_manulal_QR_Code_15032019.pdf`). It returned 404 to curl today; uidai.gov.in blocks bots, so open it in a browser.
- **Certificates:** UIDAI "Certificate Details" page in the developer section. Download the offline e-KYC / Secure QR signing certificate from there.
- **Algorithm** (confirmed by the `StarkAg/aadhaar-secure-qr-verifier` MIT reference) [D]:
  1. Parse the QR text as a big decimal integer.
  2. Convert to bytes.
  3. **gzip/zlib-decompress** the bytes.
  4. Fields are **0xFF-delimited** (a version marker like `V2` appears first in newer QRs).
  5. The **last 256 bytes are the RSA signature**, computed as `RSA-SHA256(payload[:-256])` against the UIDAI public key.
  6. The embedded photo is JPEG2000.
  7. Only the **last 4 digits** of the Aadhaar number are present (inside the reference ID).
- **Parse libraries:**
  - `aadhaar-py` 2.0.2 (MIT, `from aadhaar.secure_qr import extract_data`)
  - `pyaadhaar` 2.0.2 (MIT, `AadhaarSecureQr(data).decodeddata()`, last release Jul-2023)
  - **Neither verifies the signature** [D].
  - There is **no maintained npm "aadhaar-qr" package**: `aadhaar-qr` and `aadhaar-secure-qr` both return 404 on npm [V].
- **Signature check sketch:**
  ```python
  import zlib
  from cryptography import x509
  from cryptography.hazmat.primitives import hashes
  from cryptography.hazmat.primitives.asymmetric import padding
  raw = int(qr_text).to_bytes((int(qr_text).bit_length()+7)//8, "big")
  data = zlib.decompress(raw, 16 + zlib.MAX_WBITS)          # gzip
  payload, sig = data[:-256], data[-256:]
  pub = x509.load_pem_x509_certificate(open("uidai_cert.pem","rb").read()).public_key()
  pub.verify(sig, payload, padding.PKCS1v15(), hashes.SHA256())   # raises if tampered
  ```
- **Demo rule:** never use a real person's Aadhaar QR. Generate **synthetic Secure-QR-like payloads signed with a demo RSA key**, use the same code path with `DEMO_CERT`, and label it on screen.
- **New Aadhaar App (Nov-2025) / OVSE framework:**
  - It uses a UIDAI QR "verifiable presentation" (OpenID4VP-style) that only the Aadhaar App and UIDAI scanner can read [D].
  - Entities doing offline verification register as an **OVSE** at uidai.gov.in/en/ovse.
  - **Production story:** Sewa Setu registers as an OVSE and verifies via the Aadhaar App flow. Don't promise that in 24h.
- **Verhoeff checksum** (tested today [V]; `999900001231` passes, a one-digit change fails). Faker's `en_IN.aadhaar_id()` is **not** Verhoeff-valid (19/200 passed by chance) [V], so generate IDs yourself:
  ```python
  D=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
     [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]]
  P=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
     [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]
  INV=[0,4,3,2,1,5,6,7,8,9]
  def verhoeff_ok(n):  c=0; [c:=D[c][P[i%8][int(x)]] for i,x in enumerate(reversed(n))]; return c==0
  def verhoeff_digit(n): c=0; [c:=D[c][P[(i+1)%8][int(x)]] for i,x in enumerate(reversed(n))]; return str(INV[c])
  def aadhaar_ok(a): a=''.join(ch for ch in a if ch.isdigit()); return len(a)==12 and a[0] not in "01" and verhoeff_ok(a)
  ```
- **Masking and compliance:**
  - Display only `XXXX XXXX 1234`. Store a salted hash or a reference token, **never the full number**.
  - Under the Aadhaar Act 2016 §29 and UIDAI circulars, any stored Aadhaar numbers must sit in an **Aadhaar Data Vault**.
  - Also mask Aadhaar in uploaded images (black box over the first 8 digits) before OCR text is persisted. The DPDP Act 2023 applies to all PII.

**e-signed certificates (prior caste/income certificates)**
- **pyHanko 0.37** (MIT) validates PAdES/CMS signatures. Load the **CCA India root certificates** as trust roots (cca.gov.in), otherwise every signature shows as "untrusted".
- CG certificates carry a QR code. In the demo, treat that QR as a **verification URL plus certificate number**, resolved against our mock "Sewa Setu archive" endpoint. [U] Check the real payload of a CG certificate QR by scanning one if a team member has one.
- **SignValid** (signvalid.in) is an existing web validator for Indian government PDF signatures. Useful as a reference in Q&A.

**DigiLocker (API Setu)**
- Portal: apisetu.gov.in/digilocker [V 200].
- Specs (all return 200 [V]):
  - Authorized Partner API v2.2: `cf-media.api-setu.in/resources/DigitalLocker-AuthorizedPartnerAPI-Specificationv2.2.pdf`
  - Issuer API v1.13: `cf-media.api-setu.in/resources/DigiLocker-Issuer-APISpecification-v1-13.pdf`
  - Requester/Entity Locker spec (Nov-2024): `entity.digilocker.gov.in/assets/img/Requester%20-%20Entity%20Locker%20API%20Specification_28_11_24.pdf`
- **Flow:** OAuth 2.0 authorization code **+ PKCE** → issued-documents list → pull the file or its XML [D].
- **Onboarding:** apply as a partner on the API Setu partner portal. It takes weeks, so it cannot be done in 24h. **Mock it.**
- **Certificate XML formats:** docs.apisetu.gov.in/document-central/dl-xml-format/. The caste certificate doctype is **`CTCER`**, with `<Caste name category="SC|ST|OBC|GC" subCategory description/>` inside `CertificateData`, plus `IssuedBy`/`IssuedTo` [D]. The income certificate is usually `INCER` and residence/domicile `RSCER`/`DMCER` [U]. **Use CTCER-shaped XML for the synthetic prior certificates:** it looks exactly like the real archive.
- **Reality check:** income, caste and domicile availability in DigiLocker depends on each state's e-District integration [D]. Confirm CG's issuer list at digilocker.gov.in/web/dashboard/issuers?searchKey=Caste+Certificate.

**MeriPehchaan / e-Pramaan (officer and citizen SSO)**
- meripehchaan.gov.in, epramaan.meripehchaan.gov.in and dlpartners.meripehchaan.gov.in all return 200 [V].
- e-Pramaan supports **OIDC and SAML 2.0** [D]. Service-provider onboarding goes through department.epramaan.gov.in.
- **24h:** fake login with role switching (Officer / Collector). **Pitch:** "SSO via MeriPehchaan (OIDC); Sewa Setu already uses e-Pramaan."

### 2.3 Entity resolution and fuzzy matching of Hindi and English names

**Our test [V]** (normaliser = `anyascii` → lowercase → rules `aa→a, ee→i, oo→u, w→v, sh→s, ph→f, z→j, ksh→x, doubled→single, final a/y→drop/i`):

| Pair | Raw token_sort | After normalising: token_sort / JW (spaces removed) |
|---|---|---|
| Ramesh Kumar Sahu ↔ रमेश कुमार साहू | 12 | **97 / 0.86** |
| Shyamlal Dhruw ↔ श्यामलाल ध्रुव | 7 | **100 / 1.00** |
| Shyam Lal Dhruv ↔ Shyamlal Dhruw | 69 | 74 / **1.00** (so compare with spaces removed too) |
| Laxmi Markam ↔ लक्ष्मी मरकाम | 8 | 78 / 0.82 |
| Sitaram Netam ↔ Seetaram Netaam | 86 | **100 / 1.00** |

**Key facts**
- **The schwa problem.** `anyascii` drops inherent vowels (रमेश→"rmes", मरकाम→"mrkam"). `indic-transliteration` ITRANS keeps them all ("ramesha kumAra sAhU", "marakAma").
- **Best recipe:** compare a **consonant skeleton** as well as the full string, and take the max of `token_sort_ratio`, `token_set_ratio` and Jaro-Winkler on the space-stripped string.
- Strip honorifics (श्री/श्रीमती/कु./Smt/Late) and relation markers (S/O, W/O, D/O, पिता, पति, वल्द) before scoring. Lists are in `data/synthetic/cg_name_seeds.json`.

| Tool | Link | Licence | Maturity | Hindi | 24h use | Production |
|---|---|---|---|---|---|---|
| **RapidFuzz 3.14.6** | github.com/rapidfuzz/RapidFuzz | MIT | Very mature, fast (C++) | Works on any Unicode | **Pick** | Keep |
| **jellyfish 1.2.1** | github.com/jamesturk/jellyfish | MIT | Mature | English phonetics only (Soundex, Metaphone, MRA, NYSIIS) | Run on the normalised roman form | — |
| **indic-transliteration 2.3.82** (sanscript) | github.com/indic-transliteration/indic_transliteration_py | MIT | Active (Sep-2026) | Devanagari ↔ ITRANS/IAST/HK | **Pick** for canonical romanisation. JS version: `@indic-transliteration/sanscript` 1.3.3 (MIT). | Keep |
| **IndicXlit** (`ai4bharat-transliteration` 1.1.3) | github.com/AI4Bharat/IndicXlit | MIT | Model is good. **Package stale since 2022, and the fairseq build fails** on modern Python [D]. | Roman → Devanagari with top-k candidates (great for "Dhruw"→ध्रुव) | Only if it installs cleanly in 10 minutes. Otherwise skip. | Serve it as a microservice (Docker, py3.8) to generate k variants for blocking |
| **anyascii 0.3.3** | pypi | ISC | Stable | Crude Devanagari → ASCII | Quick normaliser | — |
| **libindic-soundex** | github.com/libindic/soundex | **LGPL-3.0** | Dormant (2019) | IndicSoundex across Indic scripts and English (Santhosh Thottingal) | Reference or inspiration | Write our own "CG-Soundex" |
| Hindi/Indian Soundex papers | Springer 10.1007/978-981-15-0372-6_22 ("Soundex Algorithm for Hindi Language Names"); airccse ijcsea 4314ijcsea03 | — | Academic | — | Cite in the pitch: "standard Soundex fails on Indian names" [D] | — |
| **Splink 4.0.17** | github.com/moj-analytical-services/splink (2.4k★) | MIT | Very active, used across the UK government | Custom comparisons | Optional: fit Fellegi-Sunter on DuckDB for 50k synthetic records | **Production ER**: Spark/DuckDB backend, blocking on LGD village code + birth year |
| dedupe 3.0.3 | github.com/dedupeio/dedupe | MIT | Maintained | Active learning | Skip (needs labelling) | Alternative |
| Zingg 0.7 | github.com/zinggAI/zingg | **AGPL-3.0** | Active | Spark-based | Skip | Licence friction for government |
| recordlinkage 0.16 | pypi | BSD-3 | Stable | — | Alternative | — |
| aksharamukha 2.3 | pypi | **AGPL-3.0** | Active | Best script converter | Avoid in shipped code (licence) | — |
| indicfuzz (rasinmuhammed) | github.com/rasinmuhammed/indicfuzz | MIT | 0★, Aug-2026 | Indic phonetic, honorifics, initials | Read for ideas | — |

### 2.4 Rules engine (JSON rules-as-code)

| Tool | Link | Licence | Maturity | 24h use | Production |
|---|---|---|---|---|---|
| **GoRules Zen** (`zen-engine` PyPI 2.0.2 / `@gorules/zen-engine` npm 2.0.2) + **`@gorules/jdm-editor` 1.52** | github.com/gorules/zen (2k★, pushed today) | MIT | Rust core with bindings for Python, Node, Go, Java, Kotlin, C# and Swift | **Pick.** Decision tables + expression nodes in JDM JSON. Starter file: `data/rules/income_certificate.starter.jdm.json`, verified today [V]. | Rules live in Git with versions and unit tests. The same file runs in a Java NIC stack. |
| json-rules-engine 7.3.1 | github.com/CacheControl/json-rules-engine (3.1k★) | ISC | Mature | Node-only alternative. `all`/`any` conditions, events, custom operators. | Fine |
| OpenFisca core 45.0.4 | github.com/openfisca/openfisca-core | **AGPL-3.0** | Mature (France, NZ, and PolicyEngine forks) | Too heavy for 24h (country package, periods, entities) | Cite as the "rules-as-code" lineage in the pitch |
| Drools / Apache KIE (DMN) | github.com/apache/incubator-kie-drools | Apache-2.0 | Enterprise standard | No | **Pitch slide:** "rules export to DMN / Drools for Java-based state systems" |

- **Pattern:** each service (income, domicile, caste) gets a rule file. Each rule returns `{flag, severity, reason_hi, reason_en, evidence_refs}`, and those strings feed directly into the drafted order. Rules = transparency.
- Pitfall: JDM decision-table cells are **expressions** (strings like `"> 250000"`, and outputs must be quoted `"\"FLAG\""`).

### 2.5 Family-lineage graph

| Tool | Licence | Notes | Verdict |
|---|---|---|---|
| **Cytoscape.js 3.34.3** + react-cytoscapejs 2.0.0 | MIT | Graph algorithms built in, stylesheet classes (`.conflict {line-color:red}`), `cose`/`breadthfirst` layouts, 11k★ | **Pick** |
| React Flow (`@xyflow/react` 12.12.0; the old `reactflow` 11 package is frozen) | MIT | Beautiful, but it is a node-editor. Needs `@dagrejs/dagre` 3.1.1 for layout. **Avoid elkjs (EPL/GPL).** | Alternative |
| vis-network 10.1.2 | Apache-2.0 / MIT | Physics layout, quick | Alternative |
| networkx 3.7 (backend; needs Python ≥3.12, so **pin 3.4.x on 3.11**) | BSD-3 | Conflict detection: BFS over parent/sibling edges, then compare `caste_category` on the connected certificates | **Pick** (pin version) |
| Neo4j (`neo4j-driver` 6.2) | Community GPLv3 / Enterprise commercial | Production story. **Alternative: PostgreSQL + Apache AGE (Apache-2.0)** keeps everything in one DB [U: check the AGE version] | Pitch only |

**Conflict rules to demo**
- Father's prior certificate says ST (Gond) but the applicant claims OBC.
- Siblings hold certificates in two different categories.
- The father's name on the applicant's affidavit fuzzy-matches the father-name on a sibling's certificate at <70.
- Village on a relative's certificate ≠ applicant's village (flag, not reject: migration is legitimate).

### 2.6 Anomaly and fraud signals

| Signal | Tool | Notes |
|---|---|---|
| Duplicate or near-duplicate images (same affidavit reused, same photo) | **imagehash 4.3.2** (BSD-2, 3.9k★): `phash`, `dhash`, `colorhash` | Hamming distance ≤ 8 on 64-bit pHash = near-duplicate. Index in a BK-tree or brute force (fine for ≤100k). **Production:** FAISS (MIT) on CNN embeddings + pHash. |
| Reused mobile numbers across unrelated applicants | SQL `GROUP BY mobile HAVING count(DISTINCT family_id) > 3` | Explainable. Show it on the collector dashboard. |
| Off-hours or bulk approvals | SQL on timestamps (e.g., approvals 22:00–06:00, >N approvals in 5 min by one login) | Uses the MIS-style data you already have |
| Multivariate outliers per officer/centre | **scikit-learn IsolationForest** (BSD-3; 1.9.1 needs Py ≥3.11 [V]) | Features: approval rate, median time-to-decide, % off-hours, % duplicate-hash, rejection-rate z-score vs district. Present it as "look here", not "fraud". |
| Image tampering | **ELA** (error level analysis): 15 lines of Pillow (re-save at q=90, `ImageChops.difference`, amplify) | Weak signal. Use it only as a heat-map for the officer. |
| Tampering localisation (production) | **TruFor** (github.com/grip-unina/TruFor, CVPR'23) | **Research/non-commercial licence.** Cite, don't ship. |
| Metadata forensics | Pillow `getexif()`, pypdf metadata (Producer/Creator, ModDate ≠ CreationDate); `exiftool` CLI (GPL; `brew install exiftool`) | e.g., "affidavit PDF produced by Photoshop" |
| AI-generated image detection | lynote-ai/ai-image-detector (MIT, 327★, 2026); curated list ant-research/Awesome-AIGC-Image-Video-Detection; AIDE (ICLR'25, MIT) | Detectors don't generalise well, so present results as a probability plus a human check. **Production:** C2PA content credentials on state-issued documents, plus QR/e-sign verification (the real fix). |

### 2.7 LLMs and language services

**Hardware reality**

| Model | Size / needs | Fits where |
|---|---|---|
| Sarvam-30B Q4_K_M GGUF (official `sarvamai/sarvam-30b-gguf`) | **≈19.6 GB** (6 shards) [V] | **Does not fit this 16 GB M4.** Needs ≥32 GB unified memory or a 24 GB GPU. |
| Sarvam-30B, bf16 | 32B total, 2.4B active, 64k ctx [D] | ~64 GB, so 1×A100/H100 80 GB |
| Sarvam-30B FP8 (`sarvamai/sarvam-30b-fp8`) | — | ~32 GB, so 1×L40S 48 GB |

Sarvam-30B's model card recommends vLLM 0.15 (hot-patch) or SGLang [D]. Current vLLM is 0.30.0 [V].

| Model | Link | Licence | Hindi | 24h use | Production |
|---|---|---|---|---|---|
| **Sarvam-30B** (MoE, 32B / 2.4B active) | huggingface.co/sarvamai/sarvam-30b (305k downloads) [V] | **Apache-2.0** [V] | Built for 22 Indian languages | **Via Sarvam API** (`sarvamai` SDK: py 0.1.34, npm 1.1.10); chat models sarvam-m, sarvam-30b, sarvam-105b [D] | **Self-host on vLLM in the State Data Centre.** Sovereign and Apache-2.0: the strongest pitch line. |
| Sarvam-105B (MoE, 10.3B active) | huggingface.co/sarvamai/sarvam-105b | Apache-2.0 | Yes | API only | Multi-GPU |
| Sarvam-M (24B, Mistral-Small base) | huggingface.co/sarvamai/sarvam-m | Apache-2.0 [V] | 10 Indic languages | API / community Ollama (`mashriram/sarvam-m`) | Superseded by 30B |
| **BharatGen Param2-17B-A2.4B-Thinking** | huggingface.co/bharatgenai/Param2-17B-A2.4B-Thinking (updated 17-Sep-2026) | **BharatGen non-commercial licence** [D] | 22 scheduled languages | Mention only | Government may get a licence; cite as "MeitY/IITB sovereign model" |
| BharatGen Param-1 (2.9B, bilingual) | huggingface.co/bharatgenai/Param-1-2.9B-Instruct | [U] check the licence | Hi + En | Tiny: could run locally | — |
| Airavata (AI4Bharat, 7B Hindi) / OpenHathi (Sarvam, 7B) | HF ai4bharat/Airavata, sarvamai/OpenHathi-7B-Hi-v0.1-Base | Llama-2 licence | Hindi | **Legacy (2023–24).** Don't use. | — |
| Krutrim-2 instruct (12B) | HF krutrim-ai-labs/Krutrim-2-instruct | Krutrim community licence ("other") | Indic | Skip | — |
| **Gemma 4** (e2b / e4b / 12b / 26b / 31b) | ollama.com/library/gemma4 [V] | Apache-2.0 [D] | 140+ languages | **Local offline fallback:** `ollama pull gemma4:e4b` (12b ≈ 8 GB Q4 is tight on 16 GB) | Could self-host, but Sarvam is the better sovereignty story |
| Qwen3 / 3.5 / 3.6, Llama 3.1, gpt-oss | ollama.com/library/* [V] | Apache / Llama / Apache | Decent Hindi | Alternatives | — |
| **IndicTrans2** (en↔22 Indic, distilled 200M) | github.com/AI4Bharat/IndicTrans2 · HF ai4bharat/indictrans2-en-indic-dist-200M (gated: auto) | MIT | Best open MT | Optional: translate the English template into Hindi (`IndicTransToolkit` 1.1.1, Py ≥3.10) | Self-host MT |
| sarvam-translate | HF sarvamai/sarvam-translate | **GPL-3.0** [V] | — | Skip | Licence caution |
| **Bhashini** (NMT, ASR, TTS, transliteration) | Register at bhashini.gov.in/ulca/user/register [V 200], then My Profile → generate **userID + ulcaApiKey** → the pipeline-config call returns the **inference API key** | Free for dev; contact Bhashini for production | 22 languages | Optional: voice note from the officer → text (ASR), or read the order aloud (TTS) | **Sewa Setu already integrates Bhashini**, so reuse it |

**Bhashini call shape** [U: endpoints from memory + community clients; verify in their GitBook]
- **Config call:** `POST https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline`
  - headers `userID`, `ulcaApiKey`
  - body `{"pipelineTasks":[{"taskType":"translation","config":{"language":{"sourceLanguage":"en","targetLanguage":"hi"}}}],"pipelineRequestConfig":{"pipelineId":"64392f96daac500b55c543cd"}}`
- **Compute call:** the config response gives `pipelineInferenceAPIEndPoint` (`https://dhruva-api.bhashini.gov.in/services/inference/pipeline` [V 200]) plus an `Authorization` key. POST `{"pipelineTasks":[...serviceId...],"inputData":{"input":[{"source":"..."}]}}` to it.

**LLM drafting design (important for judges)**
1. **The template is the source of truth.** The Jinja2 bilingual order is filled from the rule outputs and evidence refs, so it is deterministic.
2. The LLM only (a) writes the "reasoning" paragraph from structured facts and (b) polishes the Hindi. The prompt forbids new facts. Validate that every number and name in the output appears in the input (a regex diff); otherwise fall back to the template.
3. The officer edits and signs. We never auto-approve.
4. Show a "Generated by: template | sarvam-30b | gemma4-local" badge.

### 2.8 Synthetic data

- **Faker 40.39 `hi_IN` is poor for this** [V]. It produced "संमानित लोचन खत्री" (an honorific glued into the name) and "करना" as a city. `en_IN.aadhaar_id()` fails Verhoeff. **Use our curated seeds** (`data/synthetic/cg_name_seeds.json`: 57 CG surnames, 32 male and 25 female first names, each with Devanagari and 2–4 real-world romanised spellings, plus honorifics and relation markers). Use Faker only for dates and addresses in English.
- **Geography:** LGD hierarchy saved today (district → tehsil → block → **20,753 CG villages** with gram panchayat codes). Use real village and tehsil names for realism. They are public LGD data, not PII.
- **Documents:** render them via **HTML → headless Chrome screenshot/PDF**. **Pillow on this machine has no `raqm`** [V], so Devanagari matras and conjuncts render broken. Chrome shapes them correctly (sample `data/synthetic/samples/aff.png`).
  - Command: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=out.png --window-size=1100,360 file://$PWD/aff.html`
  - For PDFs use `--print-to-pdf`, or Playwright.
- **Templates to build:** affidavit (शपथ पत्र), Patwari/Sarpanch income certificate, ration card (Khadya family roster), prior caste certificate (CTCER-style XML + PDF with QR), and an Aadhaar-like card with the **"SPECIMEN / नमूना" watermark and 9999-prefixed numbers**. Never mimic the real UIDAI layout 1:1.
- **Degradations for realism:** rotation ±3°, blur, JPEG q=30–50, shadows (OpenCV). Budget 10 minutes for this.

### 2.9 Public open data for calibration

- **Already in `data/`:**
  - `cg_district_demographics_census2011.csv` (another agent): pop, urban %, SC %, ST % per district
  - Sewa Setu MIS files (rejection rates)
  - `data/geo/cg_districts_lgd.csv` (this kit): joins LGD code, Hindi name, division, HQ, population and MIS rejection rate
- **data.gov.in:**
  - "State and district-wise Scheduled Tribes population for each caste separately, 2011, Chhattisgarh": data.gov.in/resource/state-and-district-wise-scheduled-tribes-population-each-caste-seperately-2011 [V 200, JS-rendered]
  - The API needs a free key from data.gov.in. The public sample key sometimes works, and api.data.gov.in timed out today [V].
- **Census 2011** A-11 (district ST): censusindia.gov.in/nada/index.php/catalog/43021 [V 200]. A-10 (district SC): catalog/42901.
- **NFSA** district-wise ration cards (AAY/PHH): nfsa.gov.in/portal/Dist_wise_RC_Reports [V 200; form-driven, so export manually].
- **Agriculture Census** (land-holding size classes by district): agcensus.da.gov.in [U]. Use it to calibrate "income vs landholding" rules.
- **LGD:** lgdirectory.gov.in [V 200]. Mirror CSVs from India Data Portal: ckandev.indiadataportal.com/dataset/lgd-codes [V].

### 2.10 UI, design system, accessibility

- **UX4G (NeGD/MeitY), Design System 3.0:** doc.ux4g.gov.in [V 200]
  - CDN [V 200]: `https://cdn.ux4g.gov.in/UX4G@2.0.8/css/ux4g-min.css`, `.../js/ux4g.min.js`
  - **Accessibility widget:** `https://cdn.ux4g.gov.in/tools/accessibility-widget.js` [V 200]. Drop it in for instant font-size, contrast and TTS controls.
  - **Official npm `ux4g-web-components` 2.1.0** (maintainer `support.ux4g@digitalindia.gov.in`, Sep-2026) [V]. `@hopline/ux4g-*` is community-made.
  - Figma kit available. Bootstrap-based, so it **conflicts with Tailwind preflight**. Use UX4G tokens (colours, type) in the Tailwind theme and load the widget script. Don't import both CSS frameworks globally.
  - **Pitch line:** "UX4G-aligned, GIGW 3.0-ready."
- **GIGW 3.0** (guidelines.india.gov.in [V 200]) maps to **WCAG 2.1 AA** plus India-specific items; compliance is certified via an STQC audit [D]. **Demo-level checklist:**
  - `lang="hi"`/`lang="en"` on the right elements (Sewa Setu itself lacks `lang`)
  - alt text on every image
  - contrast ≥4.5:1
  - full keyboard navigation and visible focus
  - a skip-to-content link
  - a bilingual toggle
  - font resize
  - no information conveyed by colour alone (add icons to the red/amber/green lanes)
  - an accessibility statement page
  - session timeout warnings
- **shadcn/ui** (CLI 4.21, MIT; Radix-based and accessible), **Recharts 3.10.1** (MIT).
- **Maps:**
  - `react-simple-maps` 5.0.5 (React 19 OK) or `d3-geo` 3.1.1 for a choropleth of rejection rates.
  - **react-leaflet 5.0.0 is licensed "Hippocratic-2.1"** [V], an ethical-use licence that government legal teams may reject. Use plain Leaflet 1.9.4 (BSD-2) or MapLibre GL 6.11 (BSD-3) instead.
  - **Show CG only** (LGD/SoI-sourced polygons) to avoid disputes over international-border depiction.

### 2.11 Similar repos and patterns to borrow

| Repo | Licence | What to borrow |
|---|---|---|
| navapbc/labs-decision-support-tool | none stated | Caseworker/navigator AI for benefits (Nava PBC): citations-first answers, human-in-loop |
| PolicyEngine/policyengine-us | AGPL-3.0 | Rules-as-code structure, test-per-rule YAML |
| openfisca/openfisca-core | AGPL-3.0 | Variables and periods model for eligibility |
| codeforamerica/vita-min | MIT | Gov-grade Rails intake UX, document upload, bilingual |
| Sunbird-RC/sunbird-rc-core | MIT | **Registries + verifiable credentials** (Indian DPG): production path for issuing new certificates as VCs with QR |
| OpenG2P/openg2p-registry | LGPL-3.0 | Beneficiary registry + dedup (Indian DPG) |
| mosip/inji-verify (moved; see github.com/mosip) | MPL-2.0 [U] | Offline QR/VC verification UX |
| egovernments/DIGIT-OSS | MIT | Indian urban e-services platform: workflow and service-config JSON |
| OpenFn/lightning, OpenFn/adaptors | LGPL-3.0 / GPL-3.0 | Integration workflows (DigiLocker, Bhuiyan and Khadya connectors as "adaptors" in the pitch) |
| Aditya-PS-05/devanagari-ocr-benchmark | MIT | Devanagari OCR evaluation harness (CER/chrF++) |
| StarkAg/aadhaar-secure-qr-verifier | MIT (0★) | Reference for Secure QR signature verification |
| grip-unina/TruFor | research-only | Forgery localisation (cite only) |
| klmn800/policy-navigator | none stated | SNAP-policy RAG with citations (pattern for "cite the rule clause") |
| sarvamai/sarvam-ai-cookbook | Apache-2.0 | Sarvam API recipes (chat, translate, STT/TTS) |
| Mifos X (openMF) | MPL-2.0 | Not very relevant (core banking). Skip. |

---

## 3. Production-grade architecture (for the pitch slide)

```
Citizen/CSC ──▶ Sewa Setu (existing) ──▶ Nirnay Sahayak API (FastAPI, stateless, K8s in CG SDC / NIC MeghRaj)
                         │                     │
   MeriPehchaan / e-Pramaan (OIDC SSO) ◀───────┤
                                               ├─ Doc AI: PaddleOCR PP-OCRv5 (GPU) → Bhashini OCR where available; Tesseract fallback
                                               ├─ Verify: UIDAI Secure QR + Aadhaar App OVSE flow; pyHanko PAdES + CCA roots; Sewa Setu QR archive lookup
                                               ├─ Pull: DigiLocker Authorized-Partner/Requester API (CTCER/INCER XML), Bhuiyan (land), Khadya (ration roster), AgriStack
                                               ├─ Rules: GoRules Zen JDM in Git (versioned, unit-tested; DMN/Drools export for Java stacks)
                                               ├─ ER: Splink (Fellegi-Sunter) on Spark/DuckDB + Indic phonetic comparators + IndicXlit variants; blocking on LGD village code
                                               ├─ Graph: PostgreSQL + Apache AGE (or Neo4j) family/lineage graph
                                               ├─ Risk: pHash/FAISS near-dup index, IsolationForest per district, SQL rules; audit log (append-only)
                                               ├─ LLM: Sarvam-30B (Apache-2.0) on vLLM, FP8 on 1×L40S or bf16 on 1×A100-80GB; IndicTrans2; template guard-rails
                                               └─ Storage: PostgreSQL+PostGIS, MinIO (docs, encrypted), Aadhaar Data Vault (tokenised)
Officer UI (React + UX4G, GIGW 3.0/WCAG 2.1 AA, STQC-audited)   Collector dashboard (district choropleth, officer outliers, SLA)
Governance: DPDP Act 2023 notice/consent, human-in-the-loop (officer decides), model cards, bias audit by district/category, CERT-In safe-to-host
```

| Layer | 24h demo | Production |
|---|---|---|
| OCR | tesseract.js (eng+hin) | PaddleOCR PP-OCRv5 on GPU; Bhashini OCR; fine-tuned on CG forms |
| Identity/SSO | Fake role switcher | MeriPehchaan / e-Pramaan OIDC |
| Doc pull | Mock JSON/XML shaped like DigiLocker CTCER | DigiLocker API Setu partner integration |
| Aadhaar | Synthetic Secure-QR + demo key + Verhoeff | UIDAI OVSE + Aadhaar App verification; ADV |
| Rules | zen-engine JDM files | Same JDM in Git + CI tests; DMN export |
| ER | RapidFuzz + normaliser | Splink + IndicXlit + labelled CG pairs |
| Graph | networkx + Cytoscape.js | Postgres + AGE / Neo4j + Cytoscape.js |
| Anomaly | imagehash + IsolationForest + SQL | FAISS index, streaming rules, SOC integration |
| LLM | Template + Sarvam API / gemma4 local | Sarvam-30B self-hosted on vLLM in SDC |
| Data | SQLite + synthetic | Sewa Setu archive (3.2 cr certs), Bhuiyan, Khadya |

---

## 4. Known pitfalls (consolidated)

1. **System Python 3.9** breaks half the stack. Use `uv` with 3.11. **networkx 3.7 needs 3.12**, so pin `networkx<3.5` on 3.11, or use 3.12.
2. **OCR language order:** `hin` first garbles digits and Latin, `eng+hin` doesn't [V]. Validate every numeric field (Verhoeff, regex, range).
3. **tesseract.js and Ollama download models on first run.** Pre-cache them at home.
4. **Unicode normalisation (NFC) and nukta/chandrabindu variants** break string equality. Normalise before hashing or matching.
5. **Schwa deletion:** ITRANS keeps every inherent "a" and anyascii drops all of them. Compare both forms, and also the consonant skeleton.
6. **Faker hi_IN produces nonsense names, and Faker Aadhaar IDs fail Verhoeff** [V]. Use the curated seeds and your own Verhoeff generator.
7. **Pillow without raqm mangles Devanagari** [V]. Render documents with Chrome/Playwright.
8. **Aadhaar libraries do not verify signatures.** Implement RSA-SHA256 yourself. Never use a real Aadhaar QR in the demo. Mask the first 8 digits everywhere.
9. **DigiLocker, MeriPehchaan and Bhashini production access need onboarding** (weeks). Mock them and say "API-ready (spec v2.2 / CTCER)".
10. **Licences to avoid shipping:**
    - react-leaflet (Hippocratic-2.1)
    - OpenFisca, Zingg, PolicyEngine, aksharamukha (AGPL)
    - Surya weights (revenue-capped OpenRAIL-M)
    - Param2 (non-commercial)
    - TruFor (research)
    - sarvam-translate (GPL-3)
    - elkjs (EPL/GPL)
    - libindic-soundex (LGPL)

    The exiftool CLI (GPL) is fine as an external tool.
11. **Sarvam-30B GGUF (~19.6 GB) won't run on a 16 GB Mac.** Use the API or gemma4:e4b locally.
12. **LLM hallucination in legal orders.** Template-first, with a numbers/names diff check. The officer signs. Label the source model.
13. **UX4G (Bootstrap) + Tailwind preflight clash.** Pick one global CSS and use UX4G only as tokens + the widget.
14. **Map boundaries:** use LGD/SoI-sourced CG districts. The popular `udit-001/india-maps-data` CG file has **only 27 (2011) districts** [V], and geoBoundaries IND ADM2 is also census-era.
15. **District name mismatch** across sources ("Gaurella Pendra Marwahi" vs "Gaurela-Pendra-Marwahi", "Khairgarh…" vs "Khairagarh…", "Baloda Bazar" vs "Balodabazar-Bhatapara", "Korea" vs "Koriya"). **Always join on LGD code.** The mapping is in `cg_districts_lgd.csv`.
16. **Caste inference from surnames is a bias trap.** Caste must come only from certificates. Say so explicitly in Q&A.
17. uidai.gov.in returns 404 to scripted fetches [V]. Download the certificate and spec manually in a browser.

---

## 5. Files saved by this kit

| Path | What |
|---|---|
| `/Users/gaurav/HACKATHON/data/geo/cg_districts_lgd.geojson` | **All 33 CG districts** (incl. the 2020/2022 districts), WGS84, simplified (155 KB). Properties: `district`, `lgd_code`, `district_mis_name`, `name_hi`, `division`, `pop_2011_approx`, `mis_total`, `mis_rejected`, `mis_rejection_rate_pct`. Source: ramSeraph LGD_Districts (SoI/LGD). Ready for a choropleth. |
| `/Users/gaurav/HACKATHON/data/geo/cg_districts_lgd.csv` | 33 rows: MIS name ↔ LGD name ↔ **LGD code** (state 22), census 2011 code, Hindi name, division, HQ, pop, MIS totals and rejection %, creation year for new districts |
| `/Users/gaurav/HACKATHON/data/geo/cg_tehsils_lgd.csv` | 234 CG sub-districts (tehsils) with LGD codes |
| `/Users/gaurav/HACKATHON/data/geo/cg_blocks_lgd.csv` | 145 CG blocks with LGD codes |
| `/Users/gaurav/HACKATHON/data/geo/cg_villages_lgd.csv` | **20,753 CG villages**: village, GP, block, tehsil and district codes (2.3 MB) |
| `/Users/gaurav/HACKATHON/data/synthetic/cg_name_seeds.json` | Curated CG surnames and first names (Devanagari + spelling variants), honorifics, relation markers, illustrative ST/SC/OBC names |
| `/Users/gaurav/HACKATHON/data/synthetic/samples/aff.html`, `aff.png`, `aff_noisy.jpg` | Synthetic Hindi affidavit template + clean and degraded renders (the OCR test set used above) |
| `/Users/gaurav/HACKATHON/data/rules/income_certificate.starter.jdm.json` | Verified GoRules JDM starter (placeholder thresholds) |

**GeoJSON sources (checked by HEAD/GET today)**
- ✅ `https://github.com/ramSeraph/indian_admin_boundaries/releases/download/districts/LGD_Districts.parquet` (34 MB, 200 OK, **33 CG districts with `dist_lgd`**). The `.geojsonl.7z` (22 MB) also returns 200 but needs 7z.
- ⚠️ `https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/chhattisgarh.geojson`: 200 OK but **only 27 districts**.
- ⚠️ geoBoundaries IND ADM2 (`github.com/wmgeolab/geoBoundaries/.../geoBoundaries-IND-ADM2_simplified.geojson`): 200 but census-era.
- Regenerate the CG file: `uv run --python 3.11 --with geopandas --with pyarrow python -c "import geopandas as g; d=g.read_parquet('LGD_Districts.parquet'); d[d.state_lgd==22].to_crs(4326).to_file('cg.geojson')"`

**LGD CSV sources:** `ckandev.indiadataportal.com/dataset/lgd-codes`: district, sub-district, block, gram panchayat (20 MB) and villages (98 MB) CSVs [V].

---

## 6. Link index

**OCR:** github.com/tesseract-ocr/tesseract · github.com/tesseract-ocr/tessdata_best · github.com/naptha/tesseract.js · github.com/PaddlePaddle/PaddleOCR · huggingface.co/PaddlePaddle/devanagari_PP-OCRv5_mobile_rec · paddleocr.ai (PP-OCRv5 multilingual docs) · github.com/datalab-to/surya · github.com/mindee/doctr · github.com/JaidedAI/EasyOCR · github.com/Bhashini-IITJ/IndicPhotoOCR · bhashini-iitj.github.io/IndicPhotoOCR · github.com/AI4Bharat/Indic-OCR · ocr.ai4bharat.org · github.com/IITB-LEAP-OCR/bhashini-ocr-api · arxiv.org/pdf/2606.29213 · github.com/Aditya-PS-05/devanagari-ocr-benchmark · arxiv.org/pdf/2412.15248

**Aadhaar / verification / DPI:** uidai.gov.in/en/ovse · uidai.gov.in/en/aadhaar-app-faq · uidai.gov.in (Developer section → Certificate Details; Secure QR spec PDF) · github.com/tanmoysrt/pyaadhaar · github.com/vishaltanwar96/aadhaar-py · github.com/StarkAg/aadhaar-secure-qr-verifier · pypi.org/project/pyhanko · signvalid.in · apisetu.gov.in/digilocker · docs.apisetu.gov.in/document-central/dl-xml-format/ · cf-media.api-setu.in/resources/DigitalLocker-AuthorizedPartnerAPI-Specificationv2.2.pdf · cf-media.api-setu.in/resources/DigiLocker-Issuer-APISpecification-v1-13.pdf · entity.digilocker.gov.in (Requester spec PDF) · meripehchaan.gov.in · epramaan.meripehchaan.gov.in · department.epramaan.gov.in · dlpartners.meripehchaan.gov.in

**Names / ER:** github.com/rapidfuzz/RapidFuzz · github.com/jamesturk/jellyfish · github.com/indic-transliteration/indic_transliteration_py · npm @indic-transliteration/sanscript · github.com/AI4Bharat/IndicXlit · github.com/libindic/soundex · thottingal.in/blog/2009/07/26/indicsoundex/ · github.com/moj-analytical-services/splink · github.com/dedupeio/dedupe · github.com/zinggAI/zingg · github.com/rasinmuhammed/indicfuzz

**Rules:** github.com/gorules/zen · npm @gorules/jdm-editor · github.com/CacheControl/json-rules-engine · github.com/openfisca/openfisca-core · github.com/apache/incubator-kie-drools

**Graph:** js.cytoscape.org · github.com/plotly/react-cytoscapejs · reactflow.dev (@xyflow/react) · github.com/visjs/vis-network · neo4j.com · age.apache.org

**Anomaly / forensics:** github.com/JohannesBuchner/imagehash · scikit-learn.org (IsolationForest) · github.com/grip-unina/TruFor · github.com/lynote-ai/ai-image-detector · github.com/ant-research/Awesome-AIGC-Image-Video-Detection · exiftool.org · c2pa.org · github.com/facebookresearch/faiss

**LLM / language:** huggingface.co/sarvamai/sarvam-30b · huggingface.co/sarvamai/sarvam-30b-gguf · huggingface.co/sarvamai/sarvam-105b · huggingface.co/sarvamai/sarvam-m · sarvam.ai/blogs/sarvam-30b-105b · docs.sarvam.ai · github.com/sarvamai/sarvam-ai-cookbook · huggingface.co/bharatgenai/Param2-17B-A2.4B-Thinking · huggingface.co/bharatgenai/Param-1-2.9B-Instruct · huggingface.co/ai4bharat/Airavata · huggingface.co/krutrim-ai-labs/Krutrim-2-instruct · ollama.com/library/gemma4 · github.com/vllm-project/vllm · github.com/AI4Bharat/IndicTrans2 · bhashini.gov.in/ulca/user/register · bhashini.gitbook.io/bhashini-apis · aikosh.indiaai.gov.in

**Data / geo:** github.com/ramSeraph/indian_admin_boundaries/releases · ckandev.indiadataportal.com/dataset/lgd-codes · lgdirectory.gov.in · github.com/datameet/maps · github.com/udit-001/india-maps-data · data.gov.in · censusindia.gov.in/nada/index.php/catalog/43021 · nfsa.gov.in/portal/Dist_wise_RC_Reports · en.wikipedia.org/wiki/List_of_districts_of_Chhattisgarh

**UI / standards:** doc.ux4g.gov.in · cdn.ux4g.gov.in/UX4G@2.0.8/css/ux4g-min.css · npm ux4g-web-components · figma.com/community/file/1248163113918127452 (UX4G kit) · guidelines.india.gov.in (GIGW 3.0) · ui.shadcn.com · recharts.org · github.com/zcreativelabs/react-simple-maps · leafletjs.com · maplibre.org

**Patterns:** github.com/navapbc/labs-decision-support-tool · github.com/PolicyEngine/policyengine-us · github.com/codeforamerica/vita-min · github.com/Sunbird-RC/sunbird-rc-core · github.com/OpenG2P/openg2p-registry · github.com/egovernments/DIGIT-OSS · github.com/OpenFn/lightning · github.com/mosip
