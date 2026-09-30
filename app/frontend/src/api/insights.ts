/**
 * Round 8a: family graph + integrity analytics, and human-in-the-loop learning.
 * Calls /api/graph/* and /api/learning/*; if the backend is unreachable it falls back to bundled fixtures
 * (exported by backend/scripts/export_fixtures_round8a.py) and simulates the officer labels locally.
 */
import type { I18n } from "./types";
import familyFx from "../mock/fixtures/graph_family.json";
import integrityFx from "../mock/fixtures/graph_integrity.json";
import statusFx from "../mock/fixtures/learning_status.json";
import recalFx from "../mock/fixtures/learning_recalibrated.json";

export type UseState = "relied" | "candidate" | "dismissed" | null;

export interface GraphNode {
  id: string;
  kind: "person" | "applicant" | "cert" | "application";
  label: I18n;
  rel?: string;
  rel_label?: I18n;
  gen?: number;
  gender?: string | null;
  birth_year?: number | null;
  in_register?: boolean;
  name_only?: boolean;
  cert_no?: string;
  service?: string;
  category?: string | null;
  cert_type?: string;
  status?: string;
  authority_role?: string;
  issue_year?: number;
  district?: I18n;
  use?: UseState;
  app_id?: string;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "parent" | "spouse" | "holds" | "match" | "applied";
  probability?: number;
  match_level?: string;
  relation?: string;
  relation_label?: I18n;
  use?: UseState;
}
export interface FamilySignal { code: string; title: I18n; detail: I18n; node_ids: string[] }
export interface FamilyGraph {
  app_id: string;
  synthetic: boolean;
  applicant: { name: I18n; claimed_category: string | null; service: string; village: I18n; district: I18n; status: string };
  family_id: string;
  lane?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  signals: FamilySignal[];
  records_used: string[];
  records_found: string[];
  note: I18n;
}
export interface IntegritySignal {
  code: string;
  title: I18n;
  explanation: I18n;
  count: number;
  families: number;
  certificates: number;
  examples: { family_id: string; district: I18n; cert_nos: string[]; app_id?: string }[];
  top_districts: { lgd: number; name: I18n; count: number }[];
}
export interface Integrity {
  synthetic: boolean;
  note: I18n;
  graph: { people: number; certificates: number; families: number; nodes: number; edges: number };
  overlay: { note: I18n; planted: Record<string, number>; found: Record<string, number>; extra_flags: Record<string, number> };
  edges_note: I18n;
  signals: IntegritySignal[];
  districts: ({ lgd: number; name: I18n; total: number } & Record<string, number | I18n>)[];
}

export interface Prf { precision: number | null; recall: number | null; tp: number; fp: number; positives: number; mean_claimed: number | null }
export interface UncertainPair {
  pair_id: string;
  probability: number;
  raw_probability: number;
  relation: string;
  relation_label: I18n;
  applicant: { name: string; father: string; birth_year: number; village: I18n };
  record: { cert_no: string; holder: I18n; father: I18n; birth_year: number; village: I18n };
  levels: Record<string, string>;
  synthetic_truth: "same" | "not";
}
export interface Calibration {
  fitted_at: string;
  n_labels: number;
  n_real: number;
  n_simulated: number;
  before: Prf;
  before_possible: Prf;
  models: {
    calibration: { theta: number[]; cut: number; after: Prf; exact_threshold_log2: number | null; bootstrap?: { n: number; precision: number[]; recall: number[]; note: I18n } };
    per_comparison: { theta: number[]; cut: number; after: Prf; note: I18n; scales: { comparison: string; label: I18n; scale: number }[] };
  };
}
export interface LearningStatus {
  synthetic: boolean;
  labels: {
    real: number;
    simulated: number;
    total: number;
    by_source: { officer_case: number; officer_active: number; simulated: number };
    simulated_officer_error_rate: number;
    simulated_disagreeing: number;
    positives: number;
  };
  calibration: Calibration | null;
  history: { fitted_at: string; n_labels: number; n_real: number; n_simulated: number; precision_after: number; recall_after: number }[];
  baseline: { exact: Prf; possible: Prf };
  live: boolean;
  uncertain: UncertainPair[];
  held_out: { queries: number; positives: number };
  method: I18n;
  note: I18n;
  simulated_note: I18n;
}

// ---------- transport (own tiny fallback; does not touch the shared client) ----------
class Unreachable extends Error {}
export class InsightsError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function http<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, signal: ctrl.signal, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new Unreachable();
  } finally {
    clearTimeout(timer);
  }
  if (res.headers.get("x-praman-offline")) throw new Unreachable();
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new Unreachable();
  const body = await res.json();
  if (!res.ok) {
    if (res.status >= 500 && !body?.detail) throw new Unreachable();
    throw new InsightsError(res.status, typeof body?.detail === "string" ? body.detail : JSON.stringify(body));
  }
  return body as T;
}

async function withFallback<T>(path: string, fallback: () => T, init?: RequestInit): Promise<T> {
  try {
    return await http<T>(path, init);
  } catch (e) {
    if (e instanceof Unreachable) return fallback();
    throw e;
  }
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// ---------- offline simulation ----------
const FAMILY = familyFx as unknown as Record<string, FamilyGraph>;
let offlineLabels: { pair_id: string; y: number }[] = [];
let offlineRecal = false;

function offlineStatus(): LearningStatus {
  const base = clone((offlineRecal ? recalFx : statusFx) as unknown as LearningStatus);
  const done = new Set(offlineLabels.map((l) => l.pair_id));
  base.uncertain = base.uncertain.filter((p) => !done.has(p.pair_id));
  base.labels.by_source.officer_active += offlineLabels.length;
  base.labels.real += offlineLabels.length;
  base.labels.total += offlineLabels.length;
  base.labels.positives += offlineLabels.filter((l) => l.y === 1).length;
  return base;
}

export const insights = {
  family: (appId: string) =>
    withFallback<FamilyGraph>(`/graph/family/${encodeURIComponent(appId)}`, () => {
      const g = FAMILY[appId];
      if (!g) throw new InsightsError(404, `${appId}: not in the offline demo bundle`);
      return clone(g);
    }),
  integrity: () => withFallback<Integrity>("/graph/integrity", () => clone(integrityFx as unknown as Integrity)),
  learningStatus: () => withFallback<LearningStatus>("/learning/status", offlineStatus),
  recalibrate: () =>
    withFallback<LearningStatus>(
      "/learning/recalibrate",
      () => {
        offlineRecal = true;
        return offlineStatus();
      },
      { method: "POST", body: JSON.stringify({ actor: "Collector, Kondagaon" }) },
    ),
  label: (pairId: string, decision: "same" | "not") =>
    withFallback<{ ok: boolean; status: LearningStatus }>(
      "/learning/label",
      () => {
        offlineLabels = [...offlineLabels.filter((l) => l.pair_id !== pairId), { pair_id: pairId, y: decision === "same" ? 1 : 0 }];
        return { ok: true, status: offlineStatus() };
      },
      { method: "POST", body: JSON.stringify({ pair_id: pairId, decision }) },
    ),
};

/** Demo applications offered on the /graph page (all SYNTHETIC). */
export const GRAPH_APPS: { id: string; name: I18n; hint: I18n }[] = [
  { id: "SS/2026/KDG/08812", name: { en: "Sunita Markam", hi: "सुनीता मरकाम" }, hint: { en: "father's certificate found", hi: "पिता का प्रमाण पत्र मिला" } },
  { id: "SS/2026/KDG/08841", name: { en: "Kiran Dhruw", hi: "किरण ध्रुव" }, hint: { en: "category differs from brother", hi: "भाई से श्रेणी भिन्न" } },
  { id: "SS/2026/KDG/08856", name: { en: "Meena Kashyap", hi: "मीना कश्यप" }, hint: { en: "father's certificate cancelled", hi: "पिता का प्रमाण पत्र निरस्त" } },
  { id: "SS/2026/KDG/08863", name: { en: "Anil Sori", hi: "अनिल सोरी" }, hint: { en: "Tehsildar-issued", hi: "तहसीलदार द्वारा जारी" } },
  { id: "SS/2026/KDG/08790", name: { en: "Rohit Netam", hi: "रोहित नेताम" }, hint: { en: "sister's certificate", hi: "बहन का प्रमाण पत्र" } },
  { id: "SS/2026/KDG/08925", name: { en: "Rajni Korram", hi: "रजनी कोर्राम" }, hint: { en: "maiden village", hi: "मायके का गांव" } },
  { id: "SS/2026/KDG/08870", name: { en: "Ramesh Yadav", hi: "रमेश यादव" }, hint: { en: "first generation, no record", hi: "पहली पीढ़ी, कोई अभिलेख नहीं" } },
];
