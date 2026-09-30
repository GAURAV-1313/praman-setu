/**
 * Round 8c — Praman Reader: rule-based field extraction from OCR text (no model, no network).
 * Regex/keyword rules for the three paper types an officer sees most on caste files: the self-declaration
 * affidavit, the school leaving certificate and an earlier caste certificate. Every field carries the OCR
 * confidence of the words it came from, so a shaky read is shown as "unclear", never as a mismatch.
 */

export type DocKind = "affidavit" | "school" | "certificate" | "unknown";
export type FieldKey = "name" | "father" | "village" | "category" | "cert_no" | "date";

export interface OcrWord { text: string; confidence: number }
export interface Field {
  key: FieldKey;
  hi?: string; // Devanagari value as read
  en?: string; // Latin value as read (when the paper prints both)
  cat?: string; // category code for "category"
  raw?: string; // as printed/read, when the value was normalised (e.g. C6/KDG/SD0 → CG/KDG/SDO)
  confidence: number; // 0–100
}
export interface Extracted {
  kind: DocKind;
  fields: Partial<Record<FieldKey, Field>>;
  docDate?: string; // ISO, the paper's own date (affidavit / school), when different from the certificate date
  sample: boolean; // the paper carries the नमूना / SAMPLE watermark band
}

const ST_CASTES = ["गोंड", "मुरिया", "माड़िया", "माडिया", "हल्बा", "हलबा", "भतरा", "कंवर", "उरांव", "धुरवा", "बैगा", "कमार", "परधान", "अबूझमाड़िया", "दोरला", "सहरिया"];
const EN_CASTES = ["GOND", "MURIA", "MARIA", "HALBA", "BHATRA", "KANWAR", "ORAON", "DHURWA", "BAIGA", "KAMAR"];

const WORD = "[\\u0900-\\u097F]+";
const NAME2 = `(${WORD}(?:\\s+${WORD})?)`; // one or two Devanagari words

export function cleanText(t: string): string {
  return t
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[|]/g, " ")
    .replace(/[ \t]+/g, " ");
}

export function isoDate(dmy: string): string | undefined {
  const m = dmy.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{4})/);
  if (!m) return undefined;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), m[3]];
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return undefined;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function dmy(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

const CERT_RE = /C[G6]\s*\/\s*([A-Z0-9]{3})\s*\/\s*(SD[O0]|TSL|TS1)\s*\/\s*(\d{4})\s*\/\s*(\d{4,6})/i;

export function normaliseCertNo(raw: string): string | undefined {
  const m = raw.match(CERT_RE);
  if (!m) return undefined;
  const role = m[2].toUpperCase().startsWith("SD") ? "SDO" : "TSL";
  return `CG/${m[1].toUpperCase().replace(/0/g, "O")}/${role}/${m[3]}/${m[4].padStart(6, "0")}`;
}

function stripQuotes(s: string) {
  return s.replace(/^['"‘’“”`]+|['"‘’“”`.,:;]+$/g, "").trim();
}

/** OCR confidence of a value: mean confidence of the page words that make up the value. */
export function confidenceOf(value: string | undefined, words: OcrWord[], fallback: number): number {
  if (!value) return 0;
  const toks = value.split(/[\s/]+/).map(stripQuotes).filter(Boolean);
  const confs: number[] = [];
  for (const tk of toks) {
    const w = words.find((x) => stripQuotes(x.text) === tk) ?? words.find((x) => x.text.includes(tk) || (x.text.length > 2 && tk.includes(stripQuotes(x.text))));
    if (w) confs.push(w.confidence);
  }
  if (!confs.length) return Math.round(fallback);
  return Math.round(confs.reduce((a, b) => a + b, 0) / confs.length);
}

export function detectKind(t: string): DocKind {
  if (/शपथ\s*पत्र|AFFIDAVIT/i.test(t)) return "affidavit";
  if (/शाला\s*त्याग|स्थानांतरण\s*प्रमाण|SCHOOL\s+LEAVING|TRANSFER\s+CERTIFICATE/i.test(t)) return "school";
  if (/प्रमाणित\s+किया\s+जाता|जाति\s+प्रमाण\s+पत्र|CASTE\s+CERTIFICATE/i.test(t)) return "certificate";
  return "unknown";
}

export function extractFields(raw: string, words: OcrWord[], pageConf: number): Extracted {
  const t = cleanText(raw);
  const kind = detectKind(t);
  const f: Partial<Record<FieldKey, Field>> = {};
  const put = (key: FieldKey, v: Omit<Field, "key" | "confidence">) => {
    if (f[key]) return;
    const c = [v.hi, v.en].filter(Boolean).map((x) => confidenceOf(x, words, pageConf));
    let conf = c.length ? Math.min(...c) : Math.round(pageConf);
    // a Latin word inside a Devanagari name is a misread (e.g. "बुधराम" read as "germ") — treat as unclear
    if (v.hi && /[A-Za-z]/.test(v.hi)) conf = Math.min(conf, 40);
    f[key] = { key, ...v, confidence: conf };
  };

  // ---- labelled rows (school certificate style): "छात्रा का नाम / Name सुनीता मरकाम / SUNITA MARKAM"
  const row = (label: RegExp) => {
    const m = t.match(new RegExp(label.source + `\\s*[:/]?\\s*(?:[A-Za-z' ]+?)?\\s*[:]?\\s*['‘]?${NAME2}\\s*(?:/\\s*([A-Z][A-Z .]+))?`, "m"));
    return m ? { hi: stripQuotes(m[1]), en: m[2] ? stripQuotes(m[2]).replace(/\s+/g, " ") : undefined } : undefined;
  };
  const nameRow = row(/(?:छात्रा?|विद्यार्थी|आवेदक|आवेदिका)\s+का\s+नाम/);
  if (nameRow) put("name", nameRow);
  const fatherRow = row(/पिता\s+का\s+नाम/);
  if (fatherRow) put("father", fatherRow);

  // ---- prose (affidavit): "मैं सुनीता मरकाम पुत्री श्री रामलाल मरकाम, ..."
  const NAME3 = `(${WORD}(?:\\s+${WORD}){0,2}?)`; // up to three words ("रमेश कुमार साहू")
  const me = t.match(new RegExp(`मैं\\s+${NAME3}\\s+(?:पुत्री|पुत्र|पत्नी|पिता)\\s+(?:श्री\\s+)?${NAME3}\\s*[,।]`));
  if (me) {
    put("name", { hi: me[1] });
    put("father", { hi: me[2] });
  }
  // ---- certificate prose: "... कि श्री रामलाल मरकाम (Ram Lal Markaam) पिता श्री बुधराम मरकाम, ..."
  const cert = t.match(new RegExp(`(?:कि\\s+)?(?:श्री|श्रीमती|कुमारी|सुश्री)\\s+${NAME2}\\s*(?:\\(([A-Za-z .]+)\\))?\\s*(?:पिता|पुत्र|पुत्री)\\s+(?:श्री\\s+)?(\\S+(?:\\s+${WORD})?)`));
  if (cert) {
    put("name", { hi: cert[1], en: cert[2]?.trim() });
    put("father", { hi: stripQuotes(cert[3]) });
  }

  // ---- village
  const vil = t.match(new RegExp(`ग्राम\\s*(?:/\\s*Village)?\\s*[:]?\\s*['‘"]?(${WORD})\\s*(?:/\\s*([A-Z]{3,}))?`));
  if (vil) put("village", { hi: stripQuotes(vil[1]), en: vil[2] });

  // ---- category and caste
  let cat: string | undefined;
  if (/अनुसूचित\s+जनजाति|\(ST\)|SCHEDULED\s+TRIBE/i.test(t)) cat = "ST";
  else if (/अनुसूचित\s+जाति|\(SC\)|SCHEDULED\s+CASTE/i.test(t)) cat = "SC";
  else if (/पिछड़ा\s+वर्ग|\(OBC\)|BACKWARD/i.test(t)) cat = "OBC";
  const caste = ST_CASTES.find((c) => new RegExp(`(^|[\\s(])${c}([\\s)]|$)`).test(t));
  const casteEn = EN_CASTES.find((c) => new RegExp(`\\b${c}\\b`).test(t));
  if (cat || caste) put("category", { cat, hi: caste, en: casteEn });

  // ---- certificate number (printed) + its date
  const cn = t.match(CERT_RE);
  if (cn) {
    const no = normaliseCertNo(cn[0])!;
    const raw = cn[0].replace(/\s+/g, "");
    f.cert_no = { key: "cert_no", en: no, raw: raw !== no ? raw : undefined, confidence: confidenceOf(raw, words, pageConf) };
  }
  const issued = t.match(/जारी\s+(?:करने\s+का\s+)?दिनांक\s*[:]?\s*(\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{4})/);
  const afterNo = cn ? t.slice((cn.index ?? 0) + cn[0].length).match(/^\s*(?:दिनांक|dated)?\s*[:]?\s*(\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{4})/) : null;
  const certDate = issued?.[1] ?? afterNo?.[1];
  if (certDate && isoDate(certDate)) {
    f.date = { key: "date", en: isoDate(certDate), confidence: confidenceOf(certDate.replace(/\s+/g, ""), words, pageConf) };
  }
  // the paper's own date ("दिनांक: 20-09-2026"), shown for information
  const own = [...t.matchAll(/दिनांक\s*:\s*(\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{4})/g)].map((m) => isoDate(m[1])).filter(Boolean) as string[];
  const docDate = own.filter((d) => d !== f.date?.en).pop();
  if (!f.date && docDate && kind === "certificate") {
    f.date = { key: "date", en: docDate, confidence: Math.round(pageConf) };
  }

  return { kind, fields: f, docDate: kind === "certificate" ? undefined : docDate, sample: /नमूना|SAMPLE/.test(t) };
}

// ------------------------------------------------------------------ comparison
export type Verdict = "match" | "variant" | "mismatch" | "unclear" | "na";

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const strict = (s: string) => s.normalize("NFC").toLowerCase().replace(/[\s.'"‘’()\-_/]/g, "");
function loose(s: string) {
  return strict(s)
    .replace(/़/g, "") // nukta
    .replace(/ँ/g, "ं") // chandrabindu → anusvara
    .replace(/ी/g, "ि").replace(/ू/g, "ु").replace(/ई/g, "इ").replace(/ऊ/g, "उ")
    .replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u").replace(/w/g, "v").replace(/ph/g, "f")
    .replace(/(.)\1+/g, "$1");
}

export function compareText(read: string | undefined, ref: string | undefined): Exclude<Verdict, "unclear"> {
  if (!read || !ref) return "na";
  if (strict(read) === strict(ref)) return "match";
  const a = loose(read), b = loose(ref);
  if (a === b) return "variant";
  const r = 1 - lev(a, b) / Math.max(a.length, b.length);
  return r >= 0.8 ? "variant" : "mismatch";
}

/** Best verdict over the scripts the paper printed (Devanagari vs Hindi reference, Latin vs English reference). */
export function compareBi(field: Field | undefined, ref: { hi?: string; en?: string } | undefined): Verdict {
  if (!field || !ref) return "na";
  const vs = [compareText(field.hi, ref.hi), compareText(field.en, ref.en)].filter((v) => v !== "na");
  if (!vs.length) return "na";
  const order: Verdict[] = ["match", "variant", "mismatch"];
  const best = vs.sort((x, y) => order.indexOf(x) - order.indexOf(y))[0];
  if (best === "mismatch" && field.confidence < 60) return "unclear";
  return best;
}

// ------------------------------------------------------------------ QR (demo payload format)
export interface QrPayload { cert: string; holder?: string; issued?: string; cat?: string; raw: string }
export function parseQr(raw: string): QrPayload | undefined {
  if (!raw.startsWith("SEWASETU-CG|")) return undefined;
  const kv = Object.fromEntries(raw.split("|").slice(1).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1)];
  }));
  if (!kv.CERT) return undefined;
  return { cert: kv.CERT, holder: kv.HOLDER, issued: kv.ISSUED, cat: kv.CAT, raw };
}
