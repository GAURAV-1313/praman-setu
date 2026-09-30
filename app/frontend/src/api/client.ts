/**
 * API layer: calls /api/* (Vite proxy → :8000). If the backend is unreachable,
 * falls back to bundled fixtures and simulates POSTs client-side ("offline demo mode").
 */
import { useSyncExternalStore } from "react";
import { mock, MockHttpError } from "../mock/mockServer";
import { getDesk } from "../desk";
import type {
  AuditEntry,
  CallbackResponse,
  CaseBundle,
  CollectorTiles,
  Desk,
  SlaPauseValue,
  PolicyResponse,
  PolicyValue,
  TraySignResponse,
  TrayView,
  IssuedDocument,
  DecisionRequest,
  DecisionResponse,
  DistrictGeo,
  EvalResult,
  Health,
  MisSummary,
  PilotStats,
  PrecheckRequest,
  PrecheckResponse,
  QueueItem,
  RenewalList,
  RenewalRecord,
  Role,
  Village,
} from "./types";

// ---------- online / offline store ----------
type Mode = "unknown" | "online" | "offline";
let mode: Mode = "unknown";
const listeners = new Set<() => void>();
function setMode(m: Mode) {
  if (m !== mode) {
    mode = m;
    listeners.forEach((l) => l());
  }
}
export function useApiMode(): Mode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => mode,
  );
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

class Unreachable extends Error {}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Unreachable();
  } finally {
    clearTimeout(timer);
  }
  if (res.headers.get("x-praman-offline")) throw new Unreachable();
  const ct = res.headers.get("content-type") ?? "";
  // Vite proxy answers 500/502/504 with a non-JSON body when :8000 is down.
  if (!ct.includes("application/json")) throw new Unreachable();
  const body = await res.json();
  if (!res.ok) {
    if (res.status >= 500 && !body?.detail) throw new Unreachable();
    throw new ApiError(res.status, typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail ?? body));
  }
  return body as T;
}

async function withFallback<T>(path: string, fallback: () => T, init?: RequestInit): Promise<T> {
  try {
    const v = await http<T>(path, init);
    setMode("online");
    return v;
  } catch (e) {
    if (e instanceof Unreachable) {
      setMode("offline");
      try {
        return fallback();
      } catch (me) {
        if (me instanceof MockHttpError) throw new ApiError(me.status, me.message);
        throw me;
      }
    }
    throw e;
  }
}

const enc = encodeURIComponent;
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => withFallback<Health>("/health", () => mock.health()),
  /** Round 6: the SDO queue is the acting desk's sub-division only (`desk`, default from the desk store) */
  queue: (role: Role, desk?: string) => {
    const d = role === "sdo" ? (desk ?? getDesk()) : undefined;
    return withFallback<QueueItem[]>(`/queue?role=${enc(role)}${d ? `&desk=${enc(d)}` : ""}`, () => mock.queue(role, d));
  },
  desks: () => withFallback<Desk[]>("/desks?role=sdo", () => mock.desks()),
  /** Round 6: a file of another sub-division opened on this desk is forwarded to its own desk (logged) */
  routeDesk: (appId: string, officer?: string) =>
    withFallback<CaseBundle>(`/applications/${enc(appId)}/route-desk`, () => mock.routeDesk(appId, getDesk()), post({ desk: getDesk(), officer_name: officer })),
  getCase: (appId: string, role: Role = "sdo") =>
    withFallback<CaseBundle>(`/applications/${enc(appId)}`, () => mock.getCase(appId, role)),
  /** "Same family ✓" with the officer's grounds (Round 2) */
  confirmRelationship: (appId: string, certNo: string, role: Role = "sdo", grounds?: string[], note?: string, officer?: string) =>
    withFallback<CaseBundle>(
      `/applications/${enc(appId)}/confirm-relationship`,
      () => mock.confirm(appId, certNo, role, grounds, note),
      post({ cert_no: certNo, grounds, note, officer_name: officer }),
    ),
  /** "Not this family ✗" with grounds: removes the record from evidence and re-evaluates the lane */
  rejectMatch: (appId: string, certNo: string, grounds: string[], note?: string, role: Role = "sdo", officer?: string) =>
    withFallback<CaseBundle>(
      `/applications/${enc(appId)}/reject-match`,
      () => mock.rejectMatch(appId, certNo, grounds, note, role),
      post({ cert_no: certNo, grounds, note, officer_name: officer }),
    ),
  /** Undo either act, until signing */
  clearMatch: (appId: string, certNo: string, role: Role = "sdo", officer?: string) =>
    withFallback<CaseBundle>(`/applications/${enc(appId)}/clear-match`, () => mock.clearMatch(appId, certNo, role), post({ cert_no: certNo, officer_name: officer })),
  /** Round 7: search the applicant's native (maiden) village as well (null clears it); audited by the backend */
  searchNativeVillage: (appId: string, villageLgd: number | null, role: Role = "sdo", officer?: string) =>
    withFallback<CaseBundle>(
      `/applications/${enc(appId)}/search-native-village`,
      () => mock.searchNativeVillage(appId, villageLgd, role),
      post({ village_lgd: villageLgd, officer_name: officer }),
    ),
  showCauseReply: (appId: string, outcome: "reply_received" | "no_reply", summary?: string, role: Role = "sdo", officer?: string) =>
    withFallback<CaseBundle>(
      `/applications/${enc(appId)}/show-cause-reply`,
      () => mock.showCauseReply(appId, outcome, summary, role),
      post({ outcome, summary, officer_name: officer }),
    ),
  callback: (appId: string, reason: string, role: Role = "sdo", officer?: string) =>
    withFallback<CallbackResponse>(`/applications/${enc(appId)}/callback`, () => mock.callback(appId, reason, role), post({ reason, officer_name: officer })),
  issued: (appId: string) => withFallback<IssuedDocument>(`/applications/${enc(appId)}/issued`, () => mock.issued(appId)),
  decision: (appId: string, req: DecisionRequest, role: Role = "sdo") => {
    const r: DecisionRequest = role === "sdo" && !req.desk ? { ...req, desk: getDesk() } : req;
    return withFallback<DecisionResponse>(`/applications/${enc(appId)}/decision`, () => mock.decision(appId, r, role), post(r));
  },
  precheck: (req: PrecheckRequest) => withFallback<PrecheckResponse>("/precheck", () => mock.precheck(req), post(req)),
  villages: (districtLgd?: number, q?: string) => {
    const qs = new URLSearchParams();
    if (districtLgd) qs.set("district_lgd", String(districtLgd));
    if (q) qs.set("q", q);
    return withFallback<Village[]>(`/villages?${qs.toString()}`, () => mock.villages(districtLgd, q));
  },
  misSummary: () => withFallback<MisSummary>("/mis/summary", () => mock.misSummary()),
  geo: () => withFallback<DistrictGeo>("/geo/districts", () => mock.geo()),
  pilot: () => withFallback<PilotStats>("/pilot/stats", () => mock.pilot()),
  evalResult: () => withFallback<EvalResult>("/eval", () => mock.evalResult()),
  audit: (q?: string) => withFallback<AuditEntry[]>(q ? `/audit?q=${enc(q)}` : "/audit", () => mock.audit(q)),
  // ---- Round 4
  collectorTiles: () => withFallback<CollectorTiles>("/collector/tiles", () => mock.collectorTiles()),
  policy: () => withFallback<PolicyResponse>("/policy", () => mock.policy()),
  setPolicy: (v: PolicyValue) =>
    withFallback<PolicyResponse>("/policy", () => mock.setPolicy(v), post({ tehsildar_issued_permanent: v, actor: "Collector, Kondagaon" })),
  /** Round 6: PROPOSED policy (needs a Revenue order) — display only */
  setSlaPause: (v: SlaPauseValue) =>
    withFallback<PolicyResponse>("/policy", () => mock.setSlaPause(v), post({ sla_pause: v, actor: "Collector, Kondagaon" })),
  forward: (appId: string, officer?: string) =>
    withFallback<CaseBundle>(`/applications/${enc(appId)}/forward`, () => mock.forward(appId), post({ officer_name: officer })),
  tray: () => withFallback<TrayView>("/tray", () => mock.tray()),
  trayAdd: (appId: string, decision: DecisionRequest) => {
    const desk = getDesk();
    const d = { ...decision, desk: decision.desk ?? desk };
    return withFallback<TrayView>("/tray/add", () => mock.trayAdd(appId, d, desk), post({ app_id: appId, decision: d, desk }));
  },
  trayRemove: (appId: string) => withFallback<TrayView>("/tray/remove", () => mock.trayRemove(appId), post({ app_id: appId })),
  traySign: (otp: string, officer?: string) =>
    withFallback<TraySignResponse>("/tray/sign", () => mock.traySign(otp), post({ otp, officer_name: officer })),
  toolFeedback: (appId: string, useful: "yes" | "no" | "wrong_family", note?: string) =>
    withFallback<{ ok: boolean }>(`/applications/${enc(appId)}/tool-feedback`, () => mock.toolFeedback(appId, useful, note), post({ useful, note })),
  // ---- Round 8b: income-certificate renewal (SYNTHETIC; nothing is issued)
  renewals: (districtLgd = 643, window = 60) =>
    withFallback<RenewalList>(`/renewals?district_lgd=${districtLgd}&window=${window}`, () => mock.renewals(districtLgd, window)),
  /** cert_no keeps its slashes: the backend route is /renewals/{cert_no:path}/prefill */
  renewalPrefill: (certNo: string) =>
    withFallback<RenewalRecord>(`/renewals/${certNo.split("/").map(enc).join("/")}/prefill`, () => mock.renewalPrefill(certNo), { method: "POST" }),
  reset: async () => {
    // Always reset the local simulation too.
    mock.reset();
    return withFallback<{ ok: boolean }>("/reset", () => ({ ok: true }), { method: "POST" });
  },
};
