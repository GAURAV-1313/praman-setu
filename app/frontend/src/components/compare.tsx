/**
 * Round 3: the application ↔ archived-certificate comparison, shared by the lineage card (table) and the
 * evidence verdict card (attention lines). Rows never truncate; spelling variants show both scripts with the
 * differing characters marked, so the one fact the officer must judge is visible.
 */
import type { ReactNode } from "react";
import type { Application, I18n, Lang, LineageMatch } from "../api/types";
import { CATEGORY_LABEL } from "./common";

export type RowState = "differs" | "variant" | "agree";
export interface Row {
  key: string;
  label: string;
  a: string;
  b: string;
  aAlt?: string;
  bAlt?: string;
  state: RowState | "context";
  note?: string;
  /** name rows: both scripts are meaningful and are diffed */
  names?: boolean;
}

type Tr = { t: (v: I18n | null | undefined) => string; tx: (en: string, hi: string) => string; lang: Lang };

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const sameText = (a?: string | null, b?: string | null) => norm(a) === norm(b);

export function buildRows(app: Application, m: LineageMatch, { t, tx, lang }: Tr): Row[] {
  const c = m.certificate;
  const w = (field: string) => m.weights.find((x) => x.field === field);
  const isParent = m.relation !== "sibling";
  const v = Object.fromEntries(m.validity.map((x) => [x.code, x]));
  const catOk = v.category_consistent?.ok ?? true;
  const relLabel = t(m.relation_label);
  const other = (x: I18n | null | undefined) => (x ? (lang === "hi" ? x.en : x.hi) : "");
  const nameState = (appName: string, certName: string, weight: number | undefined): RowState => {
    if (sameText(appName, certName)) return "agree";
    return (weight ?? 0) > 0 ? "variant" : "differs";
  };
  const fatherCert = isParent ? c.holder_name : c.father_name;
  const rows: Row[] = [];
  rows.push({
    key: "father",
    label: isParent ? tx("Father ↔ holder", "पिता ↔ धारक") : tx("Father's name", "पिता का नाम"),
    a: t(app.father_name),
    aAlt: other(app.father_name),
    b: t(fatherCert),
    bAlt: other(fatherCert),
    state: nameState(app.father_name.en, fatherCert.en, w("father_name")?.weight),
    names: true,
  });
  rows.push({
    key: "village",
    label: tx("Village · tehsil", "गांव · तहसील"),
    a: `${t(app.village)} · ${t(app.tehsil)}`,
    aAlt: `LGD ${app.village_lgd}`,
    b: `${t(c.village)} · ${t(c.tehsil)}`,
    bAlt: `LGD ${c.village_lgd}`,
    state: app.village_lgd === c.village_lgd ? "agree" : app.tehsil.en === c.tehsil.en ? "variant" : "differs",
  });
  if (app.service !== "domicile") {
    const sameCat = app.claimed_category === c.category;
    const casteState: RowState = !sameCat || !catOk ? "differs" : sameText(app.claimed_caste?.en, c.caste_name?.en) ? "agree" : "variant";
    rows.push({
      key: "category",
      label: tx("Category · caste", "वर्ग · जाति"),
      a: `${app.claimed_category ? t(CATEGORY_LABEL[app.claimed_category]) : "—"}${app.claimed_caste ? ` · ${t(app.claimed_caste)}` : ""}`,
      b: `${c.category ? t(CATEGORY_LABEL[c.category]) : "—"}${c.caste_name ? ` · ${t(c.caste_name)}` : ""}`,
      state: casteState,
      note: casteState === "variant" ? tx("same list entry", "सूची की वही प्रविष्टि") : undefined,
    });
  }
  const gap = w("birth_year_gap");
  rows.push({
    key: "age",
    label: tx("Born", "जन्म"),
    a: String(app.birth_year),
    b: `${c.birth_year} (${tx("gap", "अंतर")} ${Math.abs(app.birth_year - c.birth_year)})`,
    state: gap && gap.weight < 0 ? "differs" : "agree",
    note: gap && gap.weight < 0 ? tx("implausible", "असंभावित") : tx(isParent ? "fits a parent" : "fits a sibling", isParent ? "माता-पिता हेतु संभव" : "भाई-बहन हेतु संभव"),
  });
  const order: Record<string, number> = { differs: 0, variant: 1, agree: 2 };
  rows.sort((x, y) => order[x.state] - order[y.state]);
  rows.unshift({ key: "who", label: tx(`Applicant ↔ ${relLabel}`, `आवेदक ↔ ${relLabel}`), a: t(app.applicant_name), aAlt: other(app.applicant_name), b: t(c.holder_name), bAlt: other(c.holder_name), state: "context", names: true });
  return rows;
}

/** Split into user-perceived characters, so a Devanagari consonant keeps its matra / halant (never split a cluster). */
function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (x: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return [...new Seg("hi", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  return [...s];
}

/** Graphemes of `s` that are not part of the longest common subsequence with `other` (case-insensitive). */
function lcsMask(s: string, other: string): boolean[] {
  const a = graphemes(s.toLowerCase());
  const b = graphemes(other.toLowerCase());
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Array(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      keep[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return keep.map((k) => !k);
}

/** Render `s` with the characters that differ from `other` wrapped in <mark>. */
export function Diff({ s, other }: { s: string; other: string }): ReactNode {
  if (!other || sameText(s, other)) return <>{s}</>;
  const chars = graphemes(s);
  const mask = lcsMask(s, other);
  const out: ReactNode[] = [];
  let buf = "";
  let cur = false;
  const flush = (k: number) => {
    if (!buf) return;
    out.push(cur ? <mark key={k} className="dmark">{buf === " " ? " " : buf}</mark> : <span key={k}>{buf}</span>);
    buf = "";
  };
  chars.forEach((ch, k) => {
    if (mask[k] !== cur) {
      flush(k);
      cur = mask[k];
    }
    buf += ch;
  });
  flush(chars.length);
  return <>{out}</>;
}

/** The spelling difference of a name row, for the verdict card: the script in which the forms differ. */
export function nameDifference(r: Row, lang: Lang): { a: string; b: string; script: "main" | "alt" } | null {
  if (!r.names || (r.state !== "variant" && r.state !== "differs")) return null;
  if (!sameText(r.a, r.b)) return { a: r.a, b: r.b, script: "main" };
  if (r.aAlt && r.bAlt && !sameText(r.aAlt, r.bAlt)) return { a: r.aAlt, b: r.bAlt, script: "alt" };
  void lang;
  return null;
}
