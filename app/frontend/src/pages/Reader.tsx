/**
 * Round 8c — प्रमाण रीडर · Praman Reader: read a scanned paper in the browser (OCR + QR), pull out the fields an
 * officer checks, and compare them with the application and the certificate archive.
 * Fully offline: tesseract.js + language data are served from this app; only the archive lookup goes to our own API.
 * Neutral by design: a difference is a prompt to look at the original, never "fake", never a rejection.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Application, I18n } from "../api/types";
import { useI18n } from "../i18n";
import {
  compareBi, compareText, dmy, extractFields, normaliseCertNo, parseQr,
  type Extracted, type Field, type FieldKey, type QrPayload, type Verdict,
} from "../reader/extract";
import { decodeQr, engineReadyMs, getWorker, ocr, phash, type OcrProgress, type OcrResult } from "../reader/ocr";
import "./reader.css";

const DEFAULT_APP = "SS/2026/KDG/08812";
const DEMO_APPS = ["SS/2026/KDG/08812", "SS/2026/KDG/08835", "SS/2026/KDG/08925"];

type Dup = { app_id: string; kind: string; label: string; distance_bits: number };
/** Duplicate-paper check: only the 64-bit pHash leaves the browser. null = check unavailable (offline). */
async function checkDuplicate(appId: string, hash: string, kind: string, label: string): Promise<Dup[] | null> {
  if (!/^[0-9a-f]{16}$/.test(hash)) return null;
  try {
    const r = await fetch("/api/reader/fingerprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: appId, phash: hash, kind, label: label.slice(0, 80) }) });
    if (r.headers.get("x-praman-offline") || !r.ok) return null;
    return (await r.json()).same_paper_elsewhere as Dup[];
  } catch {
    return null;
  }
}

const SAMPLES: { file: string; hi: string; en: string; note?: I18n }[] = [
  { file: "affidavit.png", hi: "स्वघोषणा शपथ पत्र", en: "Self-declaration affidavit" },
  { file: "school.png", hi: "शाला त्याग प्रमाण पत्र", en: "School leaving certificate" },
  { file: "prior_cert.png", hi: "पिता का पूर्व प्रमाण पत्र (QR)", en: "Father's earlier certificate (QR)" },
  { file: "prior_cert_altered.png", hi: "वही प्रमाण पत्र — बदली हुई प्रति", en: "Same certificate — altered copy",
    note: { hi: "तिथि बदली गई प्रति (डेमो)", en: "copy with a changed date (demo)" } },
];

interface ArchiveCert {
  cert_no: string; category: string | null; caste_name: I18n | null; holder_name: I18n; father_name: I18n;
  village: I18n; tehsil: I18n; district: I18n; issue_date: string; issuing_authority: I18n; status: string;
  cert_type: string; status_note?: I18n;
}
type ArchiveHit = { state: "found"; cert: ArchiveCert; qr_payload: string; offline?: boolean } | { state: "missing"; detail: I18n } | { state: "error" };

// Offline fallback (backend down): the one archive record the demo papers point to — same as the API returns.
const OFFLINE_ARCHIVE: Record<string, { certificate: ArchiveCert; qr_payload: string }> = {
  "CG/KDG/SDO/2019/004512": {
    certificate: {
      cert_no: "CG/KDG/SDO/2019/004512", category: "ST", caste_name: { en: "Gond", hi: "गोंड" }, cert_type: "permanent",
      holder_name: { en: "Ram Lal Markaam", hi: "रामलाल मरकाम" }, father_name: { en: "Budhram Markaam", hi: "बुधराम मरकाम" },
      village: { en: "Bayanar", hi: "बयानार" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" }, district: { en: "Kondagaon", hi: "कोंडागांव" },
      issue_date: "2019-03-14", issuing_authority: { en: "SDO (Revenue), Kondagaon", hi: "अनुविभागीय अधिकारी (राजस्व), कोंडागांव" }, status: "active",
    },
    qr_payload: "SEWASETU-CG|CERT=CG/KDG/SDO/2019/004512|HOLDER=Ram Lal Markaam|ISSUED=2019-03-14|CAT=ST",
  },
};

async function lookupArchive(no: string, appId: string): Promise<ArchiveHit> {
  try {
    const r = await fetch(`/api/archive/certificate/${no}?role=sdo&app_id=${encodeURIComponent(appId)}`);
    if (r.headers.get("x-praman-offline")) throw new Error("offline");
    if (r.status === 404) return { state: "missing", detail: (await r.json()).detail };
    if (!r.ok) return { state: "error" };
    const b = await r.json();
    return { state: "found", cert: b.certificate, qr_payload: b.qr_payload };
  } catch {
    const o = OFFLINE_ARCHIVE[no];
    return o
      ? { state: "found", cert: o.certificate, qr_payload: o.qr_payload, offline: true }
      : { state: "missing", detail: { hi: "ऑफ़लाइन: अभिलेखागार उपलब्ध नहीं — यह अस्वीकृति का आधार नहीं।", en: "Offline: archive not reachable — not a ground for rejection." } };
  }
}

const STAGE: Record<string, I18n> = {
  "loading tesseract core": { hi: "OCR इंजन लोड हो रहा है", en: "Loading OCR engine" },
  "initializing tesseract": { hi: "इंजन आरंभ", en: "Starting engine" },
  "loading language traineddata": { hi: "हिंदी + अंग्रेज़ी भाषा-डेटा (स्थानीय)", en: "Hindi + English language data (local)" },
  "loaded language traineddata": { hi: "भाषा-डेटा तैयार", en: "Language data ready" },
  "initializing api": { hi: "इंजन तैयार हो रहा है", en: "Preparing engine" },
  "initialized api": { hi: "इंजन तैयार", en: "Engine ready" },
  "recognizing text": { hi: "पाठ पढ़ा जा रहा है", en: "Reading text" },
};

const FIELD_LABEL: Record<FieldKey, I18n> = {
  name: { hi: "नाम", en: "Name" },
  father: { hi: "पिता का नाम", en: "Father's name" },
  village: { hi: "ग्राम", en: "Village" },
  category: { hi: "वर्ग / जाति", en: "Category / caste" },
  cert_no: { hi: "प्रमाण पत्र क्रमांक", en: "Certificate no." },
  date: { hi: "जारी दिनांक", en: "Issue date" },
};
const KIND_LABEL: Record<Extracted["kind"], I18n> = {
  affidavit: { hi: "स्वघोषणा शपथ पत्र", en: "Self-declaration affidavit" },
  school: { hi: "शाला त्याग प्रमाण पत्र", en: "School leaving certificate" },
  certificate: { hi: "जाति प्रमाण पत्र", en: "Caste certificate" },
  unknown: { hi: "अन्य दस्तावेज़", en: "Other paper" },
};
const VERDICT: Record<Verdict, { hi: string; en: string; cls: string }> = {
  match: { hi: "✓ मेल", en: "✓ matches", cls: "v-match" },
  variant: { hi: "≈ वर्तनी भिन्न", en: "≈ spelling variant", cls: "v-variant" },
  mismatch: { hi: "⚠ भिन्न — मूल देखें", en: "⚠ differs — check original", cls: "v-mismatch" },
  unclear: { hi: "? पढ़ाई अस्पष्ट", en: "? unclear read", cls: "v-unclear" },
  na: { hi: "—", en: "—", cls: "v-na" },
};
const CAT_HI: Record<string, string> = { ST: "अनुसूचित जनजाति", SC: "अनुसूचित जाति", OBC: "अन्य पिछड़ा वर्ग" };

type Ref = { hi?: string; en?: string; cat?: string | null; iso?: string; label: I18n } | undefined;

function compareField(key: FieldKey, f: Field | undefined, ref: Ref): Verdict {
  if (!f || !ref) return "na";
  if (key === "category") {
    if (!ref.cat && !ref.hi) return "na";
    const catBad = f.cat && ref.cat && f.cat !== ref.cat;
    const casteV = compareBi({ ...f, en: undefined }, { hi: ref.hi });
    if (catBad || casteV === "mismatch") return f.confidence < 60 ? "unclear" : "mismatch";
    return casteV === "variant" ? "variant" : "match";
  }
  if (key === "date" || key === "cert_no") {
    if (!ref.iso) return "na";
    if (f.en === ref.iso) return "match";
    return f.confidence < 60 && key === "date" ? "unclear" : "mismatch";
  }
  return compareBi(f, ref);
}

function fieldText(f: Field | undefined, lang: "hi" | "en"): string {
  if (!f) return "—";
  if (f.key === "category") {
    const cat = f.cat ? (lang === "hi" ? CAT_HI[f.cat] ?? f.cat : f.cat) : "";
    return [f.hi ?? f.en, cat && `(${cat})`].filter(Boolean).join(" ") || "—";
  }
  if (f.key === "date") return dmy(f.en);
  return [f.hi, f.en].filter(Boolean).join(" / ");
}
function refText(key: FieldKey, r: Ref, lang: "hi" | "en"): string {
  if (!r) return "—";
  if (key === "category") return [r.hi, r.cat && `(${lang === "hi" ? CAT_HI[r.cat] ?? r.cat : r.cat})`].filter(Boolean).join(" ") || "—";
  if (key === "date") return dmy(r.iso);
  if (key === "cert_no") return r.iso ?? "—";
  return lang === "hi" ? (r.hi ?? r.en ?? "—") : (r.en ?? r.hi ?? "—");
}

export default function Reader() {
  const { tx, t, lang } = useI18n();
  const [sp] = useSearchParams();
  const appId = sp.get("app") || DEFAULT_APP;
  const [app, setApp] = useState<Application | null>(null);
  const [src, setSrc] = useState<{ url: string; name: string; sample: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<OcrProgress | null>(null);
  const [engineMs, setEngineMs] = useState<number | null>(engineReadyMs);
  const [res, setRes] = useState<{ ocr: OcrResult; ex: Extracted; qrRaw: string | null; qr?: QrPayload; archive: Record<string, ArchiveHit>; dup: Dup[] | null; totalMs: number } | null>(null);
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    api.getCase(appId).then((b) => setApp(b.application)).catch(() => setApp(null));
  }, [appId]);

  // Warm the OCR engine as soon as the page opens (local files; ~1 s)
  useEffect(() => {
    getWorker((p) => setProg(p)).then(() => { setEngineMs(engineReadyMs); setProg(null); }).catch(() => setErr("engine"));
  }, []);

  async function run() {
    const img = imgRef.current;
    if (!img || !img.complete || !img.naturalWidth) return;
    const id = ++runId.current;
    setBusy(true); setErr(null); setRes(null);
    const t0 = performance.now();
    try {
      const qrRaw = decodeQr(img);
      const o = await ocr(img, (p) => id === runId.current && setProg(p));
      setEngineMs(engineReadyMs);
      const ex = extractFields(o.text, o.words, o.confidence);
      const qr = qrRaw ? parseQr(qrRaw) : undefined;
      const nos = [...new Set([ex.fields.cert_no?.en, qr ? normaliseCertNo(qr.cert) ?? qr.cert : undefined].filter(Boolean) as string[])];
      const archive: Record<string, ArchiveHit> = {};
      for (const no of nos) archive[no] = await lookupArchive(no, appId);
      const dup = await checkDuplicate(appId, phash(img), ex.kind, src?.name ?? "");
      if (id !== runId.current) return;
      setRes({ ocr: o, ex, qrRaw, qr, archive, dup, totalMs: Math.round(performance.now() - t0) });
    } catch (e) {
      if (id === runId.current) setErr(String(e));
    } finally {
      if (id === runId.current) { setBusy(false); setProg(null); }
    }
  }

  function pick(file: string) {
    setRes(null);
    setSrc({ url: `/samples/${file}`, name: file, sample: true });
  }
  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setRes(null);
    setSrc({ url: URL.createObjectURL(f), name: f.name, sample: false });
  }

  // ------- comparison rows
  const view = useMemo(() => {
    if (!res) return null;
    const { ex } = res;
    const certNo = ex.fields.cert_no?.en;
    const hit = certNo ? res.archive[certNo] : undefined;
    const arc = hit?.state === "found" ? hit.cert : undefined;
    const aboutApplicant = ex.kind !== "certificate";
    const A = app;
    const appLabel = { hi: "आवेदन", en: "Application" };
    const appRefs: Partial<Record<FieldKey, Ref>> = A ? {
      name: aboutApplicant ? { ...A.applicant_name, label: { hi: "आवेदिका", en: "Applicant" } } : { ...A.father_name, label: { hi: "आवेदिका के पिता", en: "Applicant's father" } },
      father: aboutApplicant ? { ...A.father_name, label: appLabel } : undefined,
      village: { ...A.village, label: appLabel },
      category: { cat: A.claimed_category, hi: A.claimed_caste?.hi, en: A.claimed_caste?.en, label: { hi: "दावा", en: "Claimed" } },
      cert_no: A.declared_relative_cert_no ? { iso: A.declared_relative_cert_no, label: { hi: "घोषित", en: "Declared" } } : undefined,
    } : {};
    const arcLabel = { hi: "अभिलेखागार", en: "Archive" };
    const arcRefs: Partial<Record<FieldKey, Ref>> = arc ? {
      name: aboutApplicant ? undefined : { ...arc.holder_name, label: { hi: "धारक", en: "Holder" } },
      father: aboutApplicant ? { ...arc.holder_name, label: { hi: "प्रमाण पत्र धारक", en: "Certificate holder" } } : { ...arc.father_name, label: arcLabel },
      village: { ...arc.village, label: arcLabel },
      category: { cat: arc.category, hi: arc.caste_name?.hi, en: arc.caste_name?.en, label: arcLabel },
      cert_no: { iso: arc.cert_no, label: arcLabel },
      date: { iso: arc.issue_date, label: arcLabel },
    } : {};
    const keys: FieldKey[] = ["name", "father", "village", "category", "cert_no", "date"];
    const rows = keys.filter((k) => ex.fields[k] || appRefs[k] || arcRefs[k]).map((k) => {
      const f = ex.fields[k];
      return { k, f, app: appRefs[k], arc: arcRefs[k], vApp: compareField(k, f, appRefs[k]), vArc: compareField(k, f, arcRefs[k]) };
    });

    // neutral hints only — never "fake", never a rejection
    const hints: { key: string; tone: "ok" | "look" | "info"; hi: string; en: string }[] = [];
    for (const r of rows) {
      for (const [v, ref, side] of [[r.vApp, r.app, "app"], [r.vArc, r.arc, "arc"]] as const) {
        if (v === "mismatch" && ref) hints.push({ key: `${r.k}:${side}`, tone: "look",
          hi: `${FIELD_LABEL[r.k].hi}: कागज़ पर “${fieldText(r.f, "hi")}”, ${ref.label.hi} में “${refText(r.k, ref, "hi")}” — मूल दस्तावेज़ देखें।`,
          en: `${FIELD_LABEL[r.k].en}: paper reads “${fieldText(r.f, "en")}”, ${ref.label.en.toLowerCase()} has “${refText(r.k, ref, "en")}” — check the original.` });
        if (v === "unclear") hints.push({ key: `${r.k}:unclear`, tone: "info", hi: `${FIELD_LABEL[r.k].hi}: पढ़ाई अस्पष्ट (${r.f?.confidence ?? 0}%) — मूल दस्तावेज़ में देखें।`, en: `${FIELD_LABEL[r.k].en}: unclear read (${r.f?.confidence ?? 0}%) — read it on the original.` });
      }
    }
    const uniq = new Map<string, { tone: "ok" | "look" | "info"; hi: string; en: string }>(hints.map((h) => [h.key, h]));
    if (certNo && hit?.state === "missing") uniq.set("missing", { tone: "info", hi: hit.detail.hi, en: hit.detail.en });
    if (arc && arc.status !== "active") uniq.set("status", { tone: "look", hi: `अभिलेखागार में यह प्रमाण पत्र “${arc.status}” दर्ज है${arc.status_note ? ` (${arc.status_note.hi})` : ""} — मूल अभिलेख देखें।`, en: `The archive lists this certificate as “${arc.status}”${arc.status_note ? ` (${arc.status_note.en})` : ""} — check the original record.` });

    // QR verification
    let qr: { tone: "ok" | "look" | "info"; hi: string; en: string; detail?: string } | null = null;
    if (res.qrRaw && !res.qr) qr = { tone: "info", hi: "QR पढ़ा गया, पर यह सेवा सेतु प्रमाण पत्र का QR नहीं है।", en: "A QR code was read, but it is not a Sewa Setu certificate QR.", detail: res.qrRaw };
    else if (res.qr) {
      const qNo = normaliseCertNo(res.qr.cert) ?? res.qr.cert;
      const qh = res.archive[qNo];
      if (qh?.state === "found" && qh.qr_payload === res.qr.raw) {
        qr = { tone: "ok", hi: "QR से सत्यापित — अभिलेखागार से मेल", en: "Verified by QR — matches the archive", detail: res.qr.raw };
        if (certNo && certNo !== qNo) uniq.set("qrno", { tone: "look", hi: `छपा क्रमांक (${certNo}) QR के क्रमांक (${qNo}) से भिन्न — मूल दस्तावेज़ देखें।`, en: `Printed number (${certNo}) differs from the QR (${qNo}) — check the original.` });
        const pd = ex.fields.date?.en;
        if (pd && res.qr.issued && pd !== res.qr.issued) {
          uniq.delete("date:arc"); // one hint, not two, for the same date
          uniq.set("qrdate", { tone: "look", hi: `छपी जारी तिथि (${dmy(pd)}) QR व अभिलेखागार (${dmy(res.qr.issued)}) से भिन्न — मूल दस्तावेज़ देखें।`, en: `Printed issue date (${dmy(pd)}) differs from the QR and the archive (${dmy(res.qr.issued)}) — check the original.` });
        }
        if (uniq.has("qrno") || uniq.has("qrdate")) qr = { tone: "look", hi: "QR अभिलेखागार से मेल खाता है, पर कागज़ पर छपी जानकारी QR से भिन्न है — मूल दस्तावेज़ देखें।", en: "The QR matches the archive, but what is printed on the paper differs from the QR — check the original.", detail: res.qr.raw };
      } else if (qh?.state === "found") {
        qr = { tone: "look", hi: "QR की जानकारी अभिलेखागार से पूरी तरह मेल नहीं खाती — मूल दस्तावेज़ देखें / जारीकर्ता कार्यालय से पुष्टि करें।", en: "The QR's contents do not fully match the archive — check the original / confirm with the issuing office.", detail: res.qr.raw };
      } else {
        qr = { tone: "info", hi: "QR का क्रमांक अभिलेखागार में नहीं मिला — यह अस्वीकृति का आधार नहीं; मूल दस्तावेज़ देखें।", en: "The QR's number is not in the archive — not a ground for rejection; check the original.", detail: res.qr.raw };
      }
    } else if (ex.kind === "certificate") {
      qr = { tone: "info", hi: "QR नहीं मिला — पुराने प्रमाण पत्रों में सामान्य; क्रमांक से अभिलेखागार में मिलान किया गया।", en: "No QR found — common on older certificates; matched by number instead." };
    }
    return { rows, hints: [...uniq.values()], qr, arc, hit, certNo, aboutApplicant };
  }, [res, app, t]);

  const pctDone = prog ? Math.round((prog.progress || 0) * 100) : 0;
  const stage = prog ? STAGE[prog.status] ?? { hi: prog.status, en: prog.status } : null;

  return (
    <div className="reader">
      <div className="page-head">
        <div>
          <div className="page-title">प्रमाण रीडर <span className="reader-en">· Praman Reader</span></div>
          <div className="page-sub">{tx("Reads a scanned paper, pulls out the fields you check, and compares them with the application and the certificate archive.", "स्कैन किया कागज़ पढ़ता है, जांच के क्षेत्र निकालता है, और उन्हें आवेदन व प्रमाण पत्र अभिलेखागार से मिलाता है।")}</div>
        </div>
      </div>

      <div className="reader-honesty" role="note">
        <span>🔒 {tx("OCR runs in this browser (in the SDC deployment: on SDC servers) — the image never leaves the machine; no CDN, no cloud. Only the certificate number (archive lookup, audited) and a 64-bit fingerprint (duplicate check) go to the SDC server.", "OCR इसी ब्राउज़र में चलता है (SDC तैनाती में: SDC सर्वर पर) — छवि मशीन से बाहर नहीं जाती; कोई CDN / क्लाउड नहीं। SDC सर्वर को केवल प्रमाण पत्र क्रमांक (अभिलेखागार खोज, ऑडिट में दर्ज) व 64-बिट फिंगरप्रिंट (दोहराव जांच) जाता है।")}</span>
        <span>🧪 {tx("Sample papers are SYNTHETIC (watermarked नमूना / SAMPLE).", "नमूना दस्तावेज़ सिंथेटिक हैं (“नमूना / SAMPLE” वॉटरमार्क)।")}</span>
        <span>⚖ {tx("Differences are prompts to check the original — never “fake”, never a rejection. You decide.", "अंतर केवल मूल देखने का संकेत हैं — कभी “नकली” नहीं, कभी अस्वीकृति नहीं। निर्णय आपका।")}</span>
      </div>

      <div className="reader-grid">
        <section className="card reader-left">
          <div className="card-title">{tx("1 · Choose a paper", "1 · दस्तावेज़ चुनें")}<span className="sub">{tx("sample or upload", "नमूना या अपलोड")}</span></div>
          <div className="reader-samples">
            {SAMPLES.map((s) => (
              <button key={s.file} className={`reader-sample ${src?.name === s.file ? "on" : ""}`} onClick={() => pick(s.file)} disabled={busy}>
                <img src={`/samples/${s.file}`} alt="" />
                <span className="rs-hi">{s.hi}</span>
                <span className="rs-en">{s.en}</span>
                {s.note && <span className="rs-note">{t(s.note)}</span>}
              </button>
            ))}
          </div>
          <label className="btn secondary sm reader-upload">
            ⤒ {tx("Upload a scan / photo (PNG, JPG)", "स्कैन / फ़ोटो अपलोड करें (PNG, JPG)")}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
          </label>
          <div className="reader-engine small muted">
            {engineMs != null
              ? tx(`OCR engine ready (local, ${(engineMs / 1000).toFixed(1)} s) · Tesseract eng+hin`, `OCR इंजन तैयार (स्थानीय, ${(engineMs / 1000).toFixed(1)} से.) · Tesseract अंग्रेज़ी+हिंदी`)
              : tx("Loading OCR engine from this app (no internet)…", "OCR इंजन इसी ऐप से लोड हो रहा है (इंटरनेट नहीं)…")}
          </div>
          {src && (
            <div className="reader-preview">
              <img ref={imgRef} src={src.url} alt={src.name} onLoad={run} />
            </div>
          )}
        </section>

        <section className="reader-right">
          <div className="card tight reader-app">
            <div className="small muted reader-app-head">{tx("Compared with application", "आवेदन से मिलान")}
              <select className="reader-app-pick" value={appId} aria-label={tx("Application", "आवेदन")} onChange={(e) => { setRes(null); setSrc(null); navigate(`/reader?app=${encodeURIComponent(e.target.value)}`); }}>
                {[...new Set([appId, ...DEMO_APPS])].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {app ? (
              <div className="reader-app-row">
                <b className="mono">{app.app_id}</b>
                <span>{t(app.applicant_name)} · {tx("father", "पिता")} {t(app.father_name)} · {t(app.village)} · {app.claimed_category} {app.claimed_caste ? `(${t(app.claimed_caste)})` : ""}</span>
                <Link className="linkish small" to={`/officer/case/${encodeURIComponent(app.app_id)}`}>{tx("open case →", "प्रकरण खोलें →")}</Link>
              </div>
            ) : <div className="small muted">{appId}</div>}
          </div>

          {(busy || (prog && !res)) && (
            <div className="card tight reader-progress" aria-live="polite">
              <div className="rp-label">{stage ? t(stage) : tx("Reading…", "पढ़ा जा रहा है…")} <span className="muted">{pctDone}%</span></div>
              <div className="rp-bar"><div style={{ width: `${Math.max(4, pctDone)}%` }} /></div>
            </div>
          )}
          {err && <div className="card tight error-box">{tx("Could not read this image. Try a clearer scan.", "यह छवि पढ़ी नहीं जा सकी। साफ़ स्कैन आज़माएँ।")}</div>}
          {!src && !busy && <div className="card reader-empty muted">{tx("Pick a sample paper on the left, or upload a scan. Reading starts automatically.", "बाईं ओर कोई नमूना चुनें या स्कैन अपलोड करें। पढ़ना अपने-आप शुरू होगा।")}</div>}

          {res && view && (
            <>
              <div className="card tight reader-summary">
                <span className="pill blue">{t(KIND_LABEL[res.ex.kind])}</span>
                {res.ex.sample && <span className="pill amber">{tx("SAMPLE · synthetic", "नमूना · सिंथेटिक")}</span>}
                <span className="pill slate">{tx("OCR confidence", "OCR भरोसा")} {Math.round(res.ocr.confidence)}%</span>
                <span className="pill outline">⏱ {tx(`read in ${(res.ocr.ms / 1000).toFixed(1)} s`, `${(res.ocr.ms / 1000).toFixed(1)} से. में पढ़ा`)}</span>
                {res.ex.docDate && <span className="small muted">{tx("paper dated", "कागज़ का दिनांक")} {dmy(res.ex.docDate)}</span>}
                <button className="btn secondary sm" onClick={run} disabled={busy}>↻ {tx("Read again", "फिर पढ़ें")}</button>
              </div>

              <section className="card tight">
                <div className="card-title">{tx("2 · Fields read from the paper", "2 · कागज़ से निकाले गए क्षेत्र")}
                  <span className="sub">{view.aboutApplicant ? tx("paper about the applicant", "कागज़ आवेदिका के बारे में") : tx("paper about a relative (certificate holder)", "कागज़ परिजन (प्रमाण पत्र धारक) का")}</span></div>
                <div className="reader-table-wrap">
                  <table className="reader-table">
                    <thead><tr>
                      <th>{tx("Field", "क्षेत्र")}</th>
                      <th>{tx("On the paper (OCR)", "कागज़ पर (OCR)")}</th>
                      <th>{tx("Application", "आवेदन")} <span className="mono small">{appId.split("/").pop()}</span></th>
                      <th>{tx("Archive", "अभिलेखागार")}{view.arc && res.archive[view.certNo!]?.state === "found" && (res.archive[view.certNo!] as { offline?: boolean }).offline ? tx(" (offline copy)", " (ऑफ़लाइन प्रति)") : ""}</th>
                    </tr></thead>
                    <tbody>
                      {view.rows.map((r) => (
                        <tr key={r.k}>
                          <td className="rt-field">{t(FIELD_LABEL[r.k])}</td>
                          <td>
                            <div className={r.f ? "" : "muted"}>{r.f ? fieldText(r.f, lang) : tx("not found on paper", "कागज़ पर नहीं मिला")}</div>
                            {r.f && <Conf c={r.f.confidence} />}
                            {r.f?.raw && <div className="small muted">{tx("read as", "पढ़ा गया")} <span className="mono">{r.f.raw}</span> → {tx("OCR fix (6→G, 0→O)", "OCR सुधार (6→G, 0→O)")}</div>}
                          </td>
                          <td>{refCell(r.k, r.app, r.vApp, r.f)}</td>
                          <td>{refCell(r.k, r.arc, r.vArc, r.f)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {view.certNo && view.hit?.state === "found" && view.arc && (
                  <div className="reader-arc small">
                    {tx("Archive record", "अभिलेखागार अभिलेख")}: <b className="mono">{view.arc.cert_no}</b> · {t(view.arc.holder_name)} · {t(view.arc.issuing_authority)} · {dmy(view.arc.issue_date)} · {view.arc.cert_type === "permanent" ? tx("permanent", "स्थायी") : view.arc.cert_type} · {view.arc.status === "active" ? tx("active", "प्रभावी") : view.arc.status}
                    <span className="muted"> · {tx("lookup recorded in the audit log", "यह खोज ऑडिट लॉग में दर्ज")}</span>
                  </div>
                )}
              </section>

              <section className="card tight">
                <div className="card-title">{tx("3 · QR and consistency", "3 · QR व संगति")}</div>
                {view.qr ? (
                  <div className={`reader-qr tone-${view.qr.tone}`}>
                    <div className="rq-head">{view.qr.tone === "ok" ? "✓ " : view.qr.tone === "look" ? "⚠ " : "ⓘ "}{lang === "hi" ? view.qr.hi : view.qr.en}</div>
                    {lang === "hi" && <div className="small muted">{view.qr.en}</div>}
                    {view.qr.detail && <div className="mono small rq-raw">QR: {view.qr.detail}</div>}
                  </div>
                ) : <div className="small muted">{tx("No QR on this paper (not expected on affidavits / school papers).", "इस कागज़ पर QR नहीं (शपथ पत्र / शाला प्रमाण पत्र पर अपेक्षित नहीं)।")}</div>}
                <div className={`reader-dup ${res.dup && res.dup.length ? "tone-look" : ""}`}>
                  {res.dup === null
                    ? <span className="small muted">ⓘ {tx("Duplicate-paper check unavailable offline.", "दोहराव जांच ऑफ़लाइन उपलब्ध नहीं।")}</span>
                    : res.dup.length
                      ? res.dup.map((d) => (
                        <div key={d.app_id}>⚠ {lang === "hi"
                          ? <>यही कागज़ (या इसकी दूसरी स्कैन/फ़ोटो) आवेदन <Link to={`/officer/case/${encodeURIComponent(d.app_id)}`} className="mono">{d.app_id}</Link> में भी लगा है — दोनों प्रकरण देखें। <span className="small muted">(फिंगरप्रिंट अंतर {d.distance_bits}/64 बिट)</span></>
                          : <>The same paper (or a rescan/photo of it) is also on application <Link to={`/officer/case/${encodeURIComponent(d.app_id)}`} className="mono">{d.app_id}</Link> — look at both files. <span className="small muted">(fingerprint distance {d.distance_bits}/64 bits)</span></>}
                        </div>))
                      : <span className="small muted">✓ {tx("Duplicate-paper check: not seen on any other application read here.", "दोहराव जांच: यह कागज़ यहाँ पढ़े गए किसी अन्य आवेदन में नहीं मिला।")}</span>}
                </div>
                <ul className="reader-hints">
                  {view.hints.length === 0 && <li className="tone-ok">✓ {tx("Nothing to look at: what the paper says agrees with the records it was compared with.", "देखने योग्य कुछ नहीं: कागज़ की जानकारी मिलाए गए अभिलेखों से मेल खाती है।")}</li>}
                  {view.hints.map((h, i) => (
                    <li key={i} className={`tone-${h.tone}`}>{h.tone === "look" ? "⚠ " : "ⓘ "}{lang === "hi" ? h.hi : h.en}{lang === "hi" && <span className="small muted"> · {h.en}</span>}</li>
                  ))}
                </ul>
                <div className="small muted reader-foot">{tx("A prompt to look, not a finding: the tool never marks a paper fake and never rejects. The officer decides after seeing the original.", "यह केवल देखने का संकेत है, निष्कर्ष नहीं: उपकरण किसी कागज़ को नकली नहीं कहता, न अस्वीकृत करता है। मूल देखकर निर्णय अधिकारी का।")}</div>
              </section>

              <details className="card tight reader-text">
                <summary>{tx("Full OCR text", "पूरा OCR पाठ")} <span className="small muted">({res.ocr.words.length} {tx("words", "शब्द")} · {tx("total", "कुल")} {(res.totalMs / 1000).toFixed(1)} {tx("s", "से.")})</span></summary>
                <pre>{res.ocr.text}</pre>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );

  function refCell(k: FieldKey, r: Ref, v: Verdict, f?: Field) {
    if (!r) return <span className="muted">—</span>;
    // same person, other script: e.g. "Ram Lal Markaam" (paper) vs "Ramlal Markam" (application)
    const enV = (k === "name" || k === "father") && f?.en && r.en ? compareText(f.en, r.en) : "na";
    const V = VERDICT[v];
    return (
      <div>
        <div>{refText(k, r, lang)} <span className="small muted">· {t(r.label)}</span></div>
        {v !== "na" && <span className={`rd-verdict ${V.cls}`}>{lang === "hi" ? V.hi : V.en}</span>}
        {enV === "variant" && v === "match" && (
          <div><span className="rd-verdict v-variant">≈ {tx("English spelling differs", "अंग्रेज़ी वर्तनी भिन्न")}</span> <span className="small muted">{f?.en} ↔ {r.en}</span></div>
        )}
      </div>
    );
  }
}

function Conf({ c }: { c: number }) {
  const { tx } = useI18n();
  const cls = c >= 85 ? "hi" : c >= 60 ? "mid" : "lo";
  return <span className={`conf conf-${cls}`} title={tx("OCR confidence for this field", "इस क्षेत्र का OCR भरोसा")}>{tx("confidence", "भरोसा")} {c}%</span>;
}

