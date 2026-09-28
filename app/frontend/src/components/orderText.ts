/**
 * Order-text helpers shared by the action panel, the signing dialog and the offline mock.
 * The server renders every draft; the client only (a) inserts the officer's own finding,
 * (b) previews what the issued document will look like, and (c) marks which lines are
 * system text and which are the officer's own words or choices.
 */
import type { Application, I18n, Lang, OfficeInfo } from "../api/types";

export const PH_EN = "[Officer: write your finding in the box above]";
export const PH_HI = "[अधिकारी: ऊपर के बॉक्स में अपना निष्कर्ष लिखें]";

const isLatin = (s: string) => /[A-Za-z]/.test(s) && !/[ऀ-ॿ]/.test(s);

/** Put the officer's finding into a server draft: fill the placeholder if the template has one,
 *  otherwise add it as a paragraph before the operative line. An empty finding leaves the placeholder
 *  (which blocks signing) in templates that require one. */
export function insertFinding(d: I18n, finding: string, heading: I18n = { en: "Further finding of the undersigned", hi: "अधोहस्ताक्षरी का अतिरिक्त निष्कर्ष" }): I18n {
  const f = finding.trim();
  const out: I18n = { en: d.en, hi: d.hi };
  for (const lang of ["en", "hi"] as Lang[]) {
    const ph = lang === "en" ? PH_EN : PH_HI;
    let txt = d[lang];
    const val = lang === "hi" && isLatin(f) ? `${f} (अधिकारी द्वारा अंग्रेज़ी में लिखित)` : f;
    if (txt.includes(ph)) {
      if (f) txt = txt.replace(ph, val);
    } else if (f) {
      const marker = lang === "en" ? /^(ORDER:|This reference is not|Place:)/m : /^(आदेश:|यह संदर्भ|स्थान:)/m;
      const para = `${heading[lang]}:\n${val}\n\n`;
      txt = marker.test(txt) ? txt.replace(marker, `${para}$1`) : `${txt}\n\n${para}`;
    }
    out[lang] = txt;
  }
  return out;
}

export type DocKind = "order" | "reference" | "notice" | "show_cause";
const DRAFT_HEAD = /^(DRAFT|REFERENCE —|PRE-REJECTION NOTICE \(OPPORTUNITY OF HEARING\) —|NOTICE TO THE APPLICANT|आदेश का प्रारूप|संदर्भ —|पूर्व-अस्वीकृति सूचना \(सुनवाई का अवसर\) का प्रारूप|आवेदक को सूचना)/;
const TITLE: Record<DocKind, I18n> = {
  order: { en: "ORDER (English translation, for reference; the Hindi text is authoritative)", hi: "आदेश" },
  reference: { en: "REFERENCE (English translation, for reference; the Hindi text is authoritative)", hi: "संदर्भ पत्र" },
  notice: { en: "NOTICE TO THE APPLICANT (English translation; the Hindi text is authoritative)", hi: "आवेदक को सूचना" },
  show_cause: { en: "PRE-REJECTION NOTICE — OPPORTUNITY OF HEARING (English translation; the Hindi text is authoritative)", hi: "पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर)" },
};
const NO_LABEL: Record<DocKind, [string, string]> = {
  order: ["Order No.", "आदेश क्र."],
  reference: ["Reference No.", "संदर्भ क्र."],
  notice: ["Notice No.", "सूचना क्र."],
  show_cause: ["Notice No.", "सूचना क्र."],
};

export function kindOf(action: string): DocKind {
  return action === "refer" ? "reference" : action === "send_back" ? "notice" : action === "show_cause" ? "show_cause" : "order";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function istNow() {
  return new Date(Date.now() + 5.5 * 3600000);
}

/** The document as it will be issued (same rules as the server's engine.finalise). `number` null = preview. */
export function finalise(text: I18n, kind: DocKind, info: OfficeInfo | null | undefined, number: string | null): I18n {
  const d = istNow();
  const date = `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const out: I18n = { en: "", hi: "" };
  for (const lang of ["en", "hi"] as Lang[]) {
    let lines = (text[lang] ?? "").replace(/^\n+|\n+$/g, "").split("\n");
    if (lines.length && DRAFT_HEAD.test(lines[0].trim())) lines = lines.slice(1);
    let body = lines.join("\n").replace(/^\n+/, "");
    if (number) {
      const enSig = `DSC-signed (demo) on ${date} at ${time} IST`;
      const hiSig = `DSC-हस्ताक्षरित (डेमो) दिनांक ${date}, ${time} बजे`;
      body = body.replace("(digital signature — DSC)", enSig).replace("(e-signature)", enSig).replace("(डिजिटल हस्ताक्षर — DSC)", hiSig).replace("(ई-हस्ताक्षर)", hiSig);
    }
    const lbl = NO_LABEL[kind][lang === "en" ? 0 : 1];
    const no = number ?? (lang === "en" ? "(assigned on signing)" : "(हस्ताक्षर पर आवंटित)");
    const place = info?.place?.[lang] ?? "";
    let head = `${TITLE[kind][lang]}\n${lbl} ${no}    ${lang === "en" ? "Date" : "दिनांक"}: ${date}    ${lang === "en" ? "Place" : "स्थान"}: ${place}`;
    if (lang === "hi" && kind !== "notice") head += "\n(प्रामाणिक पाठ: हिंदी)";
    out[lang] = `${head}\n\n${body}`;
  }
  return out;
}

export type LineKind = "head" | "system" | "officer" | "blank" | "section";

/** Classify each line of a document for the signing dialog: system text (from records / templates) vs the
 *  officer's own words and choices (typed finding, recorded grounds, picked evidence, manual edits). */
export function classifyLines(text: string, systemBase: string, officerFragments: string[]): { line: string; kind: LineKind }[] {
  const sys = new Set(systemBase.split("\n").map((l) => l.trim()));
  const frags = officerFragments.map((f) => f.trim()).filter((f) => f.length >= 12).map((f) => f.slice(0, 60));
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const t = line.trim();
    if (!t) return { line, kind: "blank" };
    if (i < 3 && !sys.has(t)) return { line, kind: "head" };
    if (/:$/.test(t) && t.length < 60) return { line, kind: "section" };
    if (frags.some((f) => t.includes(f))) return { line, kind: "officer" };
    if (!sys.has(t)) return { line, kind: "officer" };
    return { line, kind: "system" };
  });
}

/** Deficiency notice (send back) drafted client-side from the ticked reasons; mirrors order_send_back.*.j2. */
export function noticeDraft(a: Application, info: OfficeInfo | null | undefined, reasons: I18n[], todayDMY: string): I18n {
  const off = info?.office ?? { en: "SDO (Revenue)", hi: "अनुविभागीय अधिकारी (राजस्व)" };
  const place = info?.place ?? a.tehsil;
  const d = istNow();
  d.setUTCDate(d.getUTCDate() + 30);
  const by = `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
  const rec = `${a.submitted_at.slice(8, 10)}-${a.submitted_at.slice(5, 7)}-${a.submitted_at.slice(0, 4)}`;
  const rel = a.gender === "F" ? ["daughter of", "पुत्री"] : ["son of", "पुत्र"];
  return {
    en: `NOTICE TO THE APPLICANT — deficiency (this is not an order)\nOffice of the ${off.en}\n\nApplication No.: ${a.app_id}, received ${rec} via ${a.kendra.en}\nApplicant: ${a.applicant_name.en}, ${rel[0]} ${a.father_name.en}, village ${a.village.en}, district ${a.district.en}\nService: ${a.service_label.en}\n\nThe application needs the following before it can be decided:\n${reasons.map((r, i) => `${i + 1}. ${r.en}`).join("\n") || "[specify the document needed]"}\n\nPlease add these to the SAME application at ${a.kendra.en} within 30 days, i.e. by ${by}. The application number stays the same. No new fee is payable. If they are not received by that date, the application will be decided on the record as it stands.\n\nPlace: ${place.en}        Date: ${todayDMY}\n${off.en}`,
    hi: `आवेदक को सूचना — कमी की पूर्ति हेतु (यह आदेश नहीं है)\nकार्यालय ${off.hi}\n\nआवेदन क्र.: ${a.app_id}, प्राप्ति दिनांक ${rec}, ${a.kendra.hi} के माध्यम से\nआवेदक: ${a.applicant_name.hi}, ${rel[1]} ${a.father_name.hi}, ग्राम ${a.village.hi}, जिला ${a.district.hi}\nसेवा: ${a.service_label.hi}\n\nनिर्णय से पहले आवेदन में निम्नलिखित आवश्यक है:\n${reasons.map((r, i) => `${i + 1}. ${r.hi}`).join("\n") || "[आवश्यक दस्तावेज़ लिखें]"}\n\nकृपया 30 दिवस के भीतर, अर्थात दिनांक ${by} तक, ${a.kendra.hi} पर इसी आवेदन में जोड़ें। आवेदन क्रमांक वही रहेगा। कोई नया शुल्क देय नहीं है। उस तिथि तक प्राप्त न होने पर आवेदन का निर्णय उपलब्ध अभिलेख के आधार पर किया जाएगा।\n\nस्थान: ${place.hi}        दिनांक: ${todayDMY}\n${off.hi}`,
  };
}


// ---------------------------------------------------------------- Round 4: fold the fixed boilerplate at signing
export type SheetBlock =
  | { type: "line"; line: string; kind: LineKind }
  | { type: "fold"; key: string; title: string; lines: { line: string; kind: LineKind }[]; standard: boolean };

const STANDARD_HEADS = /^(विधिक आधार:|Legal basis:)$/;
const CONSIDERED_HEADS = /^(विचार किए गए अभिलेख, जिन पर आधार नहीं लिया गया:|Records considered and not relied upon:|परीक्षित अभिलेख:|Records examined:)$/;
const CORRO = /(केवल पुष्टिकारक|corroborative only)/;

/** Group the classified lines of a document into what the officer must read (variable content) and folded blocks:
 *  (a) the legal-basis recital — fixed, versioned template text that is only folded when every line is unedited system
 *  text; (b) registry extracts that are corroborative only. The issued document is unchanged: folding is display-only. */
export function foldBlocks(lines: { line: string; kind: LineKind }[], lang: Lang, version: string): SheetBlock[] {
  const out: SheetBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    const t = l.line.trim();
    if (l.kind === "section" && (STANDARD_HEADS.test(t) || CONSIDERED_HEADS.test(t))) {
      const body: { line: string; kind: LineKind }[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].kind !== "blank" && lines[j].kind !== "section") body.push(lines[j++]);
      if (STANDARD_HEADS.test(t) && body.length && body.every((b) => b.kind === "system")) {
        out.push({
          type: "fold",
          key: `std-${i}`,
          standard: true,
          title: lang === "hi" ? `${t.replace(/:$/, "")} — मानक पाठ (अपरिवर्तित टेम्पलेट ${version}) · ${body.length} बिंदु` : `${t.replace(/:$/, "")} — standard text (unchanged template ${version}) · ${body.length} points`,
          lines: body,
        });
        i = j;
        continue;
      }
      if (CONSIDERED_HEADS.test(t)) {
        const corro = body.filter((b) => b.kind === "system" && CORRO.test(b.line));
        if (corro.length) {
          out.push({ type: "line", ...l });
          body.filter((b) => !corro.includes(b)).forEach((b) => out.push({ type: "line", ...b }));
          out.push({
            type: "fold",
            key: `cor-${i}`,
            standard: false,
            title: lang === "hi" ? `पुष्टिकारक पंजी उद्धरण (${corro.length}) — केवल पुष्टि हेतु, आधार नहीं` : `Corroborative registry extracts (${corro.length}) — not relied upon`,
            lines: corro,
          });
          i = j;
          continue;
        }
      }
    }
    out.push({ type: "line", ...l });
    i++;
  }
  return out;
}
