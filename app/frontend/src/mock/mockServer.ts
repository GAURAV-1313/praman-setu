/**
 * Offline fallback: serves the JSON fixtures in ./fixtures and simulates POSTs client-side.
 * The backend can overwrite ./fixtures/*.json with real exports; any of the listed file names work.
 */
import type {
  CitizenPrecheckRequest,
  CitizenPrecheckResponse,
  CitizenSubmitRequest,
  CitizenSubmitResponse,
  Analysis,
  ChecklistItem,
  Application,
  AuditEntry,
  CaseBundle,
  Certificate,
  CollectorTiles,
  Desk,
  SlaClock,
  SlaPauseValue,
  PolicyResponse,
  PolicyValue,
  TraySignResponse,
  TrayView,
  TrayItem,
  Stage,
  CitizenMessage,
  DecisionRequest,
  DecisionSnapshot,
  IssuedDocument,
  DecisionResponse,
  DistrictGeo,
  EvalResult,
  Health,
  I18n,
  LineageMatch,
  MisSummary,
  PilotStats,
  PrecheckRequest,
  PrecheckResponse,
  QueueItem,
  Role,
  Village,
  WeightItem,
  RenewalList,
  RenewalRecord,
} from "../api/types";

import { finalise, kindOf } from "../components/orderText";

const files = import.meta.glob("./fixtures/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

function fx<T>(...names: string[]): T | undefined {
  for (const n of names) {
    const v = files[`./fixtures/${n}.json`];
    if (v !== undefined) return v as T;
  }
  return undefined;
}

export class MockHttpError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function isBundle(v: unknown): v is CaseBundle {
  return !!v && typeof v === "object" && "application" in (v as object) && "analysis" in (v as object);
}

/** Tolerant: cases.json / applications.json as map or array, or any fixture file holding {application, analysis}. */
function loadCases(): Record<string, CaseBundle> {
  const out: Record<string, CaseBundle> = {};
  const add = (b: CaseBundle) => (out[b.application.app_id] = b);
  const primary = fx<unknown>("cases", "applications");
  const scan = (v: unknown) => {
    if (isBundle(v)) add(v);
    else if (Array.isArray(v)) v.forEach((x) => isBundle(x) && add(x));
    else if (v && typeof v === "object") Object.values(v as object).forEach((x) => isBundle(x) && add(x));
  };
  if (primary) scan(primary);
  else Object.values(files).forEach(scan);
  return out;
}

type Overrides = Record<string, Analysis>;
interface MockState {
  sig?: string;
  cases: Record<string, CaseBundle>;
  audit: AuditEntry[];
  issued: Record<string, IssuedDocument>;
  seq?: Record<string, number>;
  // Round 4
  policy?: PolicyValue;
  slaPause?: SlaPauseValue;
  tray?: (TrayItem & { decision: DecisionRequest })[];
  stage?: Record<string, Stage & { sent_ts?: string }>;
  feedback?: Record<string, string>;
}
// fingerprint of the bundled fixtures, so stale saved state is dropped when fixtures are re-exported
const SIG = (() => {
  const c = loadCases();
  return `${Object.keys(c).sort().join(",")}:${JSON.stringify(c).length}`;
})();
const STATE_KEY = "ps_mock_state_v4";

function freshState(): MockState {
  return { sig: SIG, cases: clone(loadCases()), audit: clone(fx<AuditEntry[]>("audit") ?? []), issued: {}, seq: {}, policy: "valid_with_note", tray: [], stage: {}, feedback: {} };
}

let state: MockState = (() => {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const st = JSON.parse(raw) as MockState;
      if (st.sig === SIG) return { ...st, issued: st.issued ?? {} };
    }
  } catch {
    /* ignore */
  }
  return freshState();
})();

function save() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function T(en: string, hi: string): I18n {
  return { en, hi };
}

function nowIso() {
  const d = new Date();
  return d.toISOString();
}

function officerFor(c: CaseBundle | Role): string {
  if (typeof c === "object") return c.analysis.office?.en ?? (c.application.routed_to === "tehsildar" ? "Tehsildar" : "SDO (Revenue)");
  switch (c) {
    case "sdo":
      return "SDO (Revenue)";
    case "tehsildar":
      return "Tehsildar";
    case "collector":
      return "Collector, Kondagaon";
    default:
      return "Operator · LSK Kondagaon";
  }
}

function pendingCase(appId: string): CaseBundle {
  const c = state.cases[appId];
  if (!c) throw new MockHttpError(404, `application ${appId} not found`);
  if (c.application.status !== "pending") throw new MockHttpError(409, `application ${appId} is not pending; the record can no longer be changed`);
  return c;
}

function pushAudit(e: AuditEntry) {
  const last = state.audit[0];
  // collapse repeated views (StrictMode double effects, reloads) within a minute
  if (last && (e.action === "view_case" || e.action === "case_opened") && last.action === e.action && last.app_id === e.app_id && Date.parse(e.ts) - Date.parse(last.ts) < 60000) return;
  state.audit.unshift(e);
}

const renewalIds = new Map<string, string>(); // Round 8b: offline pre-filled renewals (session only)

// ---------- GET ----------
const citizenReceipts: Record<string, string> = {};
const citizenSearches: Record<string, number> = {};

export const mock = {
  health(): Health {
    return fx<Health>("health") ?? { ok: true, model_version: "offline", synthetic_population: 0, archive_certificates: 0 };
  },

  queue(role: string, desk?: string): QueueItem[] {
    // same order as the backend: pending first; SLA <= 3 days floats up; then evidence state; then SLA due
    const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
    const dayDiff = (due: string) => Math.round((Date.parse(due.slice(0, 10)) - Date.parse(today)) / 86400000);
    return Object.values(state.cases)
      .filter((c) => c.application.routed_to === role)
      // Round 6: an SDO desk sees only its own sub-division's files
      .filter((c) => role !== "sdo" || !desk || desk === "all" || subdivisionOf(c) === desk)
      .map((c) => {
        const days = dayDiff(c.application.sla_due);
        return {
          application: c.application,
          lane: c.analysis.lane,
          suggested_action: c.analysis.suggested_action,
          top_match_probability: c.analysis.lineage_matches.length ? Math.max(...c.analysis.lineage_matches.map((m) => m.match_probability)) : null,
          evidence_summary: c.analysis.evidence_summary ?? T("", ""),
          evidence_rank: c.analysis.evidence_rank ?? 2,
          next_step: c.analysis.next_step,
          sla_days_left: days,
          sla_urgent: days <= 3,
          stage: stageOf(c.application.app_id),
          in_tray: (state.tray ?? []).some((t) => t.app_id === c.application.app_id),
          competent: c.analysis.competence?.ok ?? true,
          ready_to_sign: c.analysis.ready_to_sign ?? false,
          subdivision: c.analysis.subdivision,
        };
      })
      .sort(
        (a, b) =>
          Number(a.application.status !== "pending") - Number(b.application.status !== "pending") ||
          Number(!a.sla_urgent) - Number(!b.sla_urgent) ||
          a.evidence_rank - b.evidence_rank ||
          a.application.sla_due.localeCompare(b.application.sla_due) ||
          a.application.submitted_at.localeCompare(b.application.submitted_at),
      );
  },

  getCase(appId: string, role: Role = "sdo"): CaseBundle {
    const c = state.cases[appId];
    if (!c) throw new MockHttpError(404, `application ${appId} not found`);
    pushAudit({
      ts: nowIso(),
      actor_role: role,
      actor: officerFor(role),
      action: "case_opened",
      app_id: appId,
      records_accessed: c.analysis.lineage_matches.map((m) => m.certificate.cert_no),
      note: "Records shown to the officer (lineage matches and registry rows) (offline)",
    });
    save();
    return clone(c);
  },

  villages(districtLgd?: number, q?: string): Village[] {
    const all = fx<(Village & { district_lgd?: number })[]>("villages") ?? [];
    const needle = (q ?? "").trim().toLowerCase();
    return all
      .filter((v) => !districtLgd || !v.district_lgd || v.district_lgd === districtLgd)
      .filter((v) => !needle || v.name.en.toLowerCase().includes(needle) || v.name.hi.includes(needle))
      .sort((a, b) => {
        if (!needle) return a.name.en.localeCompare(b.name.en);
        const as = a.name.en.toLowerCase().startsWith(needle) ? 0 : 1;
        const bs = b.name.en.toLowerCase().startsWith(needle) ? 0 : 1;
        return as - bs || a.name.en.localeCompare(b.name.en);
      })
      .slice(0, 20)
      .map(({ village_lgd, name, tehsil, district_lgd, district }) => ({ village_lgd, name, tehsil, district_lgd, district }));
  },

  misSummary(): MisSummary {
    return fx<MisSummary>("mis_summary", "mis")!;
  },
  geo(): DistrictGeo {
    return fx<DistrictGeo>("geo_districts", "geo")!;
  },
  pilot(): PilotStats {
    return fx<PilotStats>("pilot_stats", "pilot")!;
  },
  evalResult(): EvalResult {
    return fx<EvalResult>("eval")!;
  },
  audit(q?: string): AuditEntry[] {
    const ql = (q ?? "").trim().toLowerCase();
    if (!ql) return clone(state.audit);
    return clone(state.audit.filter((e) => [e.app_id ?? "", e.document_no ?? "", ...(e.records_accessed ?? [])].some((h) => h.toLowerCase().includes(ql))));
  },

  // ---------- Round 4 ----------
  policy(): PolicyResponse {
    return {
      policy: { tehsildar_issued_permanent: state.policy ?? "valid_with_note", sla_pause: state.slaPause ?? "running" },
      options: {
        tehsildar_issued_permanent: {
          valid_with_note: T("Valid as family evidence, with a note (pending Revenue Department guidance)", "पारिवारिक साक्ष्य के रूप में मान्य, टिप्पणी सहित (राजस्व विभाग के निर्देश लंबित)"),
          verify: T("Confirmation required before relying on it", "भरोसा करने से पहले पुष्टि आवश्यक"),
        },
        sla_pause: {
          running: T("SLA clock runs during hearing / Patwari referral (current rule)", "सुनवाई / पटवारी संदर्भ के दौरान SLA घड़ी चालू (वर्तमान नियम)"),
          paused_proposed: T("PROPOSED: pause the SLA clock during hearing / Patwari referral (needs a Revenue Department order)", "प्रस्तावित: सुनवाई / पटवारी संदर्भ के दौरान SLA घड़ी रोकें (राजस्व विभाग का आदेश आवश्यक)"),
        },
      },
      defaults: { tehsildar_issued_permanent: "valid_with_note", sla_pause: "running" },
    };
  },
  setPolicy(v: PolicyValue): PolicyResponse {
    const old = state.policy ?? "valid_with_note";
    state.policy = v;
    const alt = fx<Record<string, Analysis>>("policy_verify_cases") ?? {};
    const pristine = loadCases();
    for (const [id, an] of Object.entries(alt)) {
      const c = state.cases[id];
      if (!c || c.application.status !== "pending") continue;
      c.analysis = clone(v === "verify" ? an : pristine[id].analysis);
    }
    pushAudit({ ts: nowIso(), actor_role: "collector", actor: "Collector, Kondagaon", action: "policy_changed", records_accessed: [], note: `Policy 'Tehsildar-issued earlier permanent certificates' changed from ${old} to ${v} (offline)` });
    save();
    return this.policy();
  },
  setSlaPause(v: SlaPauseValue): PolicyResponse {
    const old = state.slaPause ?? "running";
    state.slaPause = v;
    for (const c of Object.values(state.cases)) {
      c.analysis.sla_clock = slaClock();
      if (c.analysis.policy) c.analysis.policy.sla_pause = v;
    }
    pushAudit({ ts: nowIso(), actor_role: "collector", actor: "Collector, Kondagaon", action: "policy_changed", records_accessed: [], note: `PROPOSED policy 'pause the SLA clock during hearing / Patwari referral' (needs a Revenue order; display only) changed from ${old} to ${v} (offline)` });
    save();
    return this.policy();
  },
  desks(): Desk[] {
    const hi: Record<string, string> = { Kondagaon: "कोंडागांव", Keskal: "केशकाल" };
    return ["Kondagaon", "Keskal"].map((d) => ({
      code: d,
      label: T(`SDO (Revenue), ${d}`, `अनुविभागीय अधिकारी (राजस्व), ${hi[d]}`),
      short: T(`SDO ${d}`, `एसडीओ ${hi[d]}`),
      pending: Object.values(state.cases).filter((c) => c.application.routed_to === "sdo" && c.application.status === "pending" && subdivisionOf(c) === d).length,
      default: d === "Kondagaon",
    }));
  },
  routeDesk(appId: string, desk: string): CaseBundle {
    const c = state.cases[appId];
    if (!c) throw new MockHttpError(404, `application ${appId} not found`);
    const sd = c.analysis.subdivision;
    if (c.application.routed_to !== "sdo" || !sd || sd.en === desk) throw new MockHttpError(409, `${appId} belongs to this desk; nothing to forward`);
    state.tray = (state.tray ?? []).filter((t) => t.app_id !== appId);
    pushAudit({ ts: nowIso(), actor_role: "sdo", actor: `SDO (Revenue), ${desk}`, action: "forwarded_other_subdivision", app_id: appId, records_accessed: [], note: `Opened on the SDO ${desk} desk; belongs to ${sd.office.en} (tehsil ${c.application.tehsil.en}) — forwarded to that desk, no decision taken here (offline)` });
    save();
    return clone(c);
  },
  forward(appId: string): CaseBundle {
    const c = pendingCase(appId);
    if (c.analysis.competence?.ok !== false) throw new MockHttpError(409, "this application is within your competence; nothing to forward");
    const from = c.analysis.office?.en ?? "Tehsildar";
    const ov = (fx<Record<string, Analysis>>("forward_overrides") ?? {})[appId];
    c.application.routed_to = (c.analysis.competence.forward_to as Role) ?? "sdo";
    if (ov) c.analysis = clone(ov);
    else c.analysis.competence = { ok: true };
    pushAudit({ ts: nowIso(), actor_role: "tehsildar", actor: from, action: "forwarded_wrong_authority", app_id: appId, records_accessed: [], note: `Forwarded from ${from} to ${c.analysis.office?.en ?? "SDO (Revenue)"}: not the competent authority for a permanent caste certificate (अक्षम प्राधिकारी से अग्रेषित) (offline)` });
    save();
    return clone(c);
  },
  tray(): TrayView {
    return { max: 5, items: (state.tray ?? []).map(({ decision: _d, ...t }) => t) };
  },
  trayAdd(appId: string, d: DecisionRequest, desk?: string): TrayView {
    const c = pendingCase(appId);
    const an = c.analysis;
    wrongDesk409(c, desk ?? d.desk ?? "Kondagaon", "the sign tray refuses it");
    state.tray = state.tray ?? [];
    if (state.tray.some((t) => t.app_id === appId)) throw new MockHttpError(409, "already in the sign tray");
    if (state.tray.length >= 5) throw new MockHttpError(409, "the sign tray holds at most 5 files — sign them first");
    if (d.action !== "approve" || an.ready_to_sign === false || an.lane !== "records_complete" || an.suggested_action !== "approve" || an.flags.some((f) => f.severity === "attention") || an.disposition_required?.length || an.deficiencies.length || an.finding_required?.approve)
      throw new MockHttpError(422, "only records-complete approvals with no open point can go into the sign tray");
    if (!d.read_confirmed) throw new MockHttpError(422, "open the order and tick 'I have read the order' before adding it to the tray");
    if (!state.audit.some((e) => (e.action === "view_case" || e.action === "case_opened") && e.app_id === appId)) throw new MockHttpError(422, "a file that was never opened cannot enter the sign tray");
    if (state.tray.length && state.cases[state.tray[0].app_id]?.application.routed_to !== c.application.routed_to) throw new MockHttpError(409, "the sign tray belongs to one desk");
    if (state.tray.length && state.tray[0].office.en !== an.office.en) throw new MockHttpError(409, `the sign tray holds ${state.tray[0].office.en} files; ${appId} belongs to ${an.office.en}`);
    checkCreamy(an, d);
    state.tray.push({ app_id: appId, name: c.application.applicant_name, service: c.application.service_label, office: an.office, added_ts: nowIso(), decision: d });
    pushAudit({ ts: nowIso(), actor_role: c.application.routed_to, actor: officerFor(c), action: "tray_added", app_id: appId, records_accessed: an.lineage_matches.map((m) => m.certificate.cert_no), note: `Order read and added to the sign tray (${state.tray.length}/5); not yet signed (offline)` });
    save();
    return this.tray();
  },
  trayRemove(appId: string): TrayView {
    state.tray = (state.tray ?? []).filter((t) => t.app_id !== appId);
    save();
    return this.tray();
  },
  traySign(otp: string): TraySignResponse {
    if (!/^\d{6}$/.test(otp)) throw new MockHttpError(422, "enter the 6-digit DSC token passcode");
    const items = [...(state.tray ?? [])];
    if (!items.length) throw new MockHttpError(409, "the sign tray is empty");
    const d = new Date(Date.now() + 5.5 * 3600000);
    const txn = `DSC-${d.toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;
    const signed: TraySignResponse["signed"] = [];
    const errors: TraySignResponse["errors"] = [];
    for (const t of items) {
      try {
        const r = this.decision(t.app_id, t.decision, (state.cases[t.app_id]?.application.routed_to as Role) ?? "sdo", txn);
        signed.push({ app_id: t.app_id, document_no: r.document_no!, status: r.application.status, citizen_message: r.citizen_message, name: t.name });
      } catch (e) {
        errors.push({ app_id: t.app_id, detail: String((e as Error).message) });
      }
    }
    state.tray = [];
    pushAudit({ ts: nowIso(), actor_role: "sdo", actor: "SDO (Revenue)", action: "tray_signed", records_accessed: signed.map((x) => x.app_id), note: `Sign tray: ${signed.length} orders signed with one DSC token passcode (transaction ${txn}): ${signed.map((x) => x.document_no).join(", ")} (offline)`, esign_txn: txn });
    save();
    return { esign_txn: txn, signed, errors };
  },
  toolFeedback(appId: string, useful: "yes" | "no" | "wrong_family", note?: string) {
    const iss = state.issued[appId];
    if (!iss) throw new MockHttpError(409, "feedback is recorded after the decision");
    state.feedback = { ...(state.feedback ?? {}), [appId]: useful };
    if (iss.snapshot) iss.snapshot.tool_feedback = { useful, note: note ?? null, ts: nowIso() };
    pushAudit({ ts: nowIso(), actor_role: state.cases[appId]?.application.routed_to ?? "sdo", actor: officerFor(state.cases[appId]), action: "tool_feedback", app_id: appId, records_accessed: [], note: `Tool feedback (for improving the tool, not an officer metric): ${useful} (offline)` });
    save();
    return { ok: true };
  },
  collectorTiles(): CollectorTiles {
    const pat: CollectorTiles["awaiting_patwari"]["files"] = [];
    const sc: CollectorTiles["show_cause_pending"]["files"] = [];
    for (const c of Object.values(state.cases)) {
      const st = stageOf(c.application.app_id);
      if (st?.kind === "patwari") pat.push({ app_id: c.application.app_id, tehsil: c.application.tehsil, day: st.day ?? 0, of: st.of ?? 7, overdue: !!st.overdue });
      if (st?.kind === "show_cause") sc.push({ app_id: c.application.app_id, tehsil: c.application.tehsil, reply_due: st.reply_due ?? "" });
    }
    const fb = { yes: 0, no: 0, wrong_family: 0 } as CollectorTiles["tool_feedback"];
    for (const v of Object.values(state.feedback ?? {})) fb[v as keyof typeof fb] += 1;
    const disagree = Object.entries(state.issued).filter(([, d]) => d.snapshot && !d.snapshot.agreed_with_suggestion).map(([id]) => id);
    const svc = Object.fromEntries((fx<MisSummary>("mis_summary")?.services ?? []).map((x) => [x.key, x]));
    const camp = ["camp_caste_scst"].map((k) => svc[k]).filter(Boolean); // Round 5: SC/ST vs SC/ST
    const dec = camp.reduce((a, x) => a + x.approved + x.rejected, 0) || 1;
    return {
      awaiting_patwari: { count: pat.length, over_7_days: pat.filter((p) => p.overdue).length, files: pat },
      show_cause_pending: { count: sc.length, files: sc },
      camp: {
        camp_rejection_pct: Math.round((1000 * camp.reduce((a, x) => a + x.rejected, 0)) / dec) / 10,
        regular_rejection_pct: (svc["caste_scst"] as { rejection_pct_decided?: number } | undefined)?.rejection_pct_decided ?? 19,
        camp_applications: camp.reduce((a, x) => a + x.total, 0),
        source: T("Sewa Setu public MIS, 27-09-2026", "सेवा सेतु सार्वजनिक MIS, 27-09-2026"),
        basis: T("SC/ST certificates · rejected ÷ decided", "अ.जा./अ.ज.जा. प्रमाण पत्र · अस्वीकृत ÷ निर्णीत"),
        roadmap: T("Camp mode (pre-check list the day before a camp; cached evidence cards) is on the roadmap, not in this demo.", "कैंप मोड (कैंप से एक दिन पहले पूर्व-जांच सूची; संचित साक्ष्य कार्ड) रोडमैप में है, इस डेमो में नहीं।"),
      },
      tool_disagreements: { count: disagree.length, reviewed: 0, files: disagree },
      tool_feedback: fb,
    };
  },

  // ---------- Round 8b: income-certificate renewal (exported fixtures; SYNTHETIC) ----------
  renewals(districtLgd: number, window: number): RenewalList {
    const all = fx<Record<string, RenewalList>>("renewals") ?? {};
    const l = all[String(districtLgd)] ?? all["643"];
    if (!l) throw new MockHttpError(503, "renewal fixtures missing");
    const out = clone(l);
    out.items = out.items.filter((i) => i.days_left <= window).map((i) => ({ ...i, renewal_id: renewalIds.get(i.certificate.cert_no) ?? null }));
    out.window_days = window;
    return out;
  },
  renewalPrefill(certNo: string): RenewalRecord {
    const rec = (fx<Record<string, RenewalRecord>>("renewal_prefill") ?? {})[certNo];
    if (!rec) throw new MockHttpError(404, `income certificate ${certNo} not found`);
    renewalIds.set(certNo, rec.renewal_id);
    return clone(rec);
  },

  // ---------- POST ----------
  reset() {
    state = freshState();
    save();
    renewalIds.clear();
    return { ok: true };
  },

  /** "Same family ✓": uses the exported confirm override (rendered with the default grounds) where confirming changes the case. */
  confirm(appId: string, certNo: string, role: Role = "sdo", grounds?: string[], note?: string): CaseBundle {
    const c = pendingCase(appId);
    const m = c.analysis.lineage_matches.find((x) => x.certificate.cert_no === certNo);
    if (!m) throw new MockHttpError(400, `certificate ${certNo} is not among this case's lineage matches`);
    const g = grounds ?? m.default_grounds ?? [];
    const ov = (fx<Overrides>("confirm_overrides") ?? {})[appId];
    const nov = nativeOverride(appId, c.analysis.native_village?.village_lgd);
    if (nov && nov.confirmed.lineage_matches.some((x) => x.certificate.cert_no === certNo && x.disposition?.decision === "same")) Object.assign(c.analysis, clone(nov.confirmed));
    else if (ov && ov.lineage_matches?.some((x) => x.certificate.cert_no === certNo && x.disposition?.decision === "same")) Object.assign(c.analysis, clone(ov));
    else {
      c.analysis.confirmed_cert_nos = [...new Set([...(c.analysis.confirmed_cert_nos ?? []), certNo])];
      if (m.usable_as_evidence) c.analysis.accepted_cert_nos = [...new Set([...(c.analysis.accepted_cert_nos ?? []), certNo])];
      c.analysis.disposition_required = (c.analysis.disposition_required ?? []).filter((x) => x !== certNo);
    }
    const mm = c.analysis.lineage_matches.find((x) => x.certificate.cert_no === certNo)!;
    mm.disposition = { decision: "same", grounds: g, note: note ?? "", ts: nowIso() };
    pushAudit({ ts: nowIso(), actor_role: role, actor: officerFor(c), action: "relationship_confirmed", app_id: appId, records_accessed: [certNo], note: `Officer confirmed the family relationship with certificate ${certNo} (offline). Grounds: ${g.join(", ") || "—"}${note ? `. Note: ${note}` : ""}` });
    save();
    return clone(c);
  },

  /** "Not this family ✗": exported override per record, else a local re-evaluation. */
  rejectMatch(appId: string, certNo: string, grounds: string[], note: string | undefined, role: Role = "sdo"): CaseBundle {
    const c = pendingCase(appId);
    const m = c.analysis.lineage_matches.find((x) => x.certificate.cert_no === certNo);
    if (!m) throw new MockHttpError(400, `certificate ${certNo} is not among this case's lineage matches`);
    if (!grounds.length && (note ?? "").trim().length < 10) throw new MockHttpError(422, "'not this family' needs at least one ground or a note of 10+ characters");
    const ov = (fx<Record<string, Record<string, Analysis>>>("reject_match_overrides") ?? {})[appId]?.[certNo];
    if (ov) Object.assign(c.analysis, clone(ov));
    else {
      const an = c.analysis;
      an.flags = an.flags.filter((f) => !(f.cert_nos ?? []).includes(certNo));
      an.accepted_cert_nos = an.accepted_cert_nos.filter((x) => x !== certNo);
      an.disposition_required = (an.disposition_required ?? []).filter((x) => x !== certNo);
      an.dismissed_cert_nos = [...(an.dismissed_cert_nos ?? []), certNo];
      if (!an.flags.some((f) => f.severity === "attention") && an.lane === "needs_attention") {
        an.lane = an.accepted_cert_nos.length ? "records_complete" : "standard_review";
        an.suggested_action = an.deficiencies.length ? "send_back" : "approve";
      }
    }
    const mm = c.analysis.lineage_matches.find((x) => x.certificate.cert_no === certNo)!;
    mm.disposition = { decision: "not", grounds, note: note ?? "", ts: nowIso() };
    pushAudit({ ts: nowIso(), actor_role: role, actor: officerFor(c), action: "match_rejected", app_id: appId, records_accessed: [certNo], note: `Officer found certificate ${certNo} is NOT the applicant's family (offline). Grounds: ${grounds.join(", ") || "—"}` });
    save();
    return clone(c);
  },

  /** Undo a same / not-this-family act before signing: restore the pristine analysis for this case. */
  clearMatch(appId: string, certNo: string, role: Role = "sdo"): CaseBundle {
    const c = pendingCase(appId);
    const prev = c.analysis.lineage_matches.find((x) => x.certificate.cert_no === certNo)?.disposition;
    if (!prev) throw new MockHttpError(400, `no confirmation or dismissal recorded for ${certNo}`);
    const pristine = loadCases()[appId];
    const nov = nativeOverride(appId, c.analysis.native_village?.village_lgd);
    if (nov) c.analysis = clone(nov.analysis);
    else if (pristine) c.analysis = clone(pristine.analysis);
    pushAudit({ ts: nowIso(), actor_role: role, actor: officerFor(c), action: prev.decision === "same" ? "relationship_unconfirmed" : "match_rejection_undone", app_id: appId, records_accessed: [certNo], note: "Officer withdrew the marking before signing (offline)" });
    save();
    return clone(c);
  },

  /** Round 7: native (maiden) village search — the exported result for the demo file, otherwise "nothing found there" */
  searchNativeVillage(appId: string, villageLgd: number | null, role: Role = "sdo"): CaseBundle {
    const c = pendingCase(appId);
    const acted = c.analysis.lineage_matches.filter((m) => m.found_via === "native_village" && m.disposition).map((m) => m.certificate.cert_no);
    if (acted.length && villageLgd !== (c.analysis.native_village?.village_lgd ?? null))
      throw new MockHttpError(409, `you already marked record ${acted.join(", ")} found in the earlier native-village search — undo that first`);
    if (villageLgd !== null && villageLgd === c.application.village_lgd) throw new MockHttpError(422, "the native village is the applicant's current village — it is already searched");
    const pristine = loadCases()[appId];
    if (villageLgd === null) {
      if (pristine) c.analysis = clone(pristine.analysis);
      pushAudit({ ts: nowIso(), actor_role: role, actor: officerFor(c), action: "native_village_search_cleared", app_id: appId, records_accessed: [], note: "Officer removed the native (maiden) village search (offline)" });
      save();
      return clone(c);
    }
    const nov = nativeOverride(appId, villageLgd);
    if (nov) c.analysis = clone(nov.analysis);
    else {
      const v = (fx<(Village & { district_lgd?: number; district?: I18n })[]>("villages") ?? []).find((x) => x.village_lgd === villageLgd);
      if (!v) throw new MockHttpError(422, `unknown village LGD code ${villageLgd}`);
      const base = pristine ? clone(pristine.analysis) : c.analysis;
      const d = v.district ?? T("", "");
      const where = T(`${v.name.en} (LGD ${v.village_lgd}), tehsil ${v.tehsil.en}, district ${d.en}`, `${v.name.hi} (एलजीडी ${v.village_lgd}), तहसील ${v.tehsil.hi}, जिला ${d.hi}`);
      base.native_village = {
        village_lgd: v.village_lgd, village: v.name, tehsil: v.tehsil, district: d, district_lgd: v.district_lgd ?? 0, found_cert_nos: [],
        note: T(`Native (maiden) village searched: ${where.en} — no family record found there either. This is neutral.`, `मायके / मूल गांव में खोजा गया: ${where.hi} — वहां भी पारिवारिक अभिलेख नहीं मिला। यह तटस्थ है।`),
      };
      c.analysis = base;
    }
    const found = c.analysis.native_village?.found_cert_nos ?? [];
    pushAudit({
      ts: nowIso(), actor_role: role, actor: officerFor(c), action: "native_village_searched", app_id: appId, records_accessed: found,
      note: `Officer searched the applicant's native (maiden) village ${c.analysis.native_village?.village.en} (LGD ${villageLgd}): ${found.length} record(s) found${found.length ? ` (${found.join(", ")})` : ""}. Found records still need the officer's confirmation (offline).`,
    });
    save();
    return clone(c);
  },

  decision(appId: string, req: DecisionRequest, role: Role = "sdo", esignTxn?: string): DecisionResponse {
    const c = state.cases[appId];
    if (!c) throw new MockHttpError(404, `application ${appId} not found`);
    if (c.application.status !== "pending") throw new MockHttpError(409, `application ${appId} is already decided`);
    const an = c.analysis;
    if (an.competence && !an.competence.ok) throw new MockHttpError(409, `not your competence: forward to the ${an.competence.forward_label?.en ?? "SDO (Revenue)"}`);
    const native = req.channel === "sewasetu_native";
    if (req.desk) wrongDesk409(c, req.desk, "it cannot be decided here");
    checkCreamy(an, req);
    const findings = (req.findings ?? "").trim();
    if (req.action === "reject" && !findings) throw new MockHttpError(422, "reject requires written findings");
    let why = an.finding_required?.[req.action];
    if (native) {
      why = req.action === "reject" || req.action === "show_cause" ? why : null;
      if (req.action === "approve" && req.tool_visible && an.flags.some((f) => f.severity === "attention")) why = T("An attention point was open in the Praman panel.", "प्रमाण पैनल में एक ध्यान-बिंदु खुला था।");
    }
    if (why && findings.length < 15) throw new MockHttpError(422, `${req.action} requires your written finding (at least 15 characters): ${why.en}`);
    if (req.action === "reject" && !an.show_cause?.reply) throw new MockHttpError(422, "a rejection needs a pre-rejection hearing notice first");
    if (!native && req.action === "approve" && an.disposition_required?.length) throw new MockHttpError(422, "every possible family record shown must be disposed of first");
    if (!native && req.action === "approve" && an.evidence_required && !req.evidence_basis?.residence) throw new MockHttpError(422, "approval on standard review needs the document that shows the claim");
    const ph = /\[\s*(\.{3,}|…)|\[\s*(Officer|अधिकारी|written findings|लिखित|specify|आवश्यक दस्तावेज़)|_{4,}/;
    if (ph.test(req.order_text.en) || ph.test(req.order_text.hi)) throw new MockHttpError(422, "the order text still contains an unfilled placeholder");
    if (req.action === "refer" && an.refer_options && !an.refer_options.some((o) => o.code === (req.refer_to ?? an.refer_to))) throw new MockHttpError(422, "refer_to is not a valid destination");
    if (req.action === "send_back" && !(req.deficiency_codes?.length || req.custom_deficiency?.trim())) throw new MockHttpError(422, "send_back needs at least one deficiency (deficiency_codes)");
    const kind = kindOf(req.action);
    const code = an.office_info?.code ?? "OFF";
    const seqKey = `${code}/${{ order: "", reference: "REF/", notice: "NTC/", show_cause: "HRG/" }[kind]}${new Date().getFullYear()}`;
    state.seq = state.seq ?? {};
    state.seq[seqKey] = (state.seq[seqKey] ?? 0) + 1;
    const number = `${seqKey}/${String(state.seq[seqKey]).padStart(4, "0")}`;
    const issued = finalise(req.order_text, kind, an.office_info, number);
    const edited = !!req.system_text && JSON.stringify(req.system_text) !== JSON.stringify(req.order_text);
    const snapshot: DecisionSnapshot = {
      model_version: an.model_version,
      rules_version: an.rules_version,
      lane: an.lane,
      suggested_action: an.suggested_action,
      agreed_with_suggestion: req.action === an.suggested_action,
      matches_shown: an.lineage_matches.map((m) => ({ cert_no: m.certificate.cert_no, relation: m.relation, level: m.match_level, probability: m.match_probability, usable: m.usable_as_evidence, validity_headline: m.validity_headline?.en ?? null, validity_failed: m.validity.filter((v) => !v.ok).map((v) => v.code), disposition: m.disposition ?? null })),
      flags_open: an.flags.map((f) => ({ code: f.code, severity: f.severity, cert_nos: f.cert_nos ?? [] })),
      checklist: an.checklist.map((i) => ({ code: i.code, present: i.present, required: i.required, state: i.state ?? null })),
      accepted_cert_nos: an.accepted_cert_nos,
      evidence_basis: req.evidence_basis ?? null,
      show_cause: an.show_cause ?? null,
      system_draft_sha: req.system_text ? `offline-${JSON.stringify(req.system_text).length}` : null,
      signed_sha: `offline-${JSON.stringify(issued).length}`,
      edited,
      read_confirmed: !!req.read_confirmed,
      time_on_screen_s: req.time_on_screen_s ?? null,
      authoritative_lang: "hi",
      channel: req.channel ?? "praman",
      shadow_mode: !!req.shadow,
      tool_shown_before_decision: req.tool_visible ?? (!native && !req.shadow),
      hidden_before_decision: req.shadow ? ["lane", "suggestion", "link_probability", "pre_ticked_reasons", ...(native ? ["evidence_panel"] : [])] : [],
      ...(esignTxn ? { esign_txn: esignTxn } : {}),
    };
    const ts = nowIso();
    if (req.action === "show_cause") {
      c.application.status = "show_cause_issued";
      const d = new Date(Date.now() + 5.5 * 3600000);
      const dmy = (x: Date) => `${String(x.getUTCDate()).padStart(2, "0")}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${x.getUTCFullYear()}`;
      const due = new Date(d.getTime() + 15 * 86400000);
      an.show_cause = { no: number, date: dmy(d), issued_ts: ts, reply_due: dmy(due), grounds: findings, adverse_cert_nos: an.adverse_cert_nos ?? [], reply: null, snapshot };
      state.issued[appId] = { document_no: number, document_kind: "show_cause", text: issued, ts, snapshot };
    } else {
      const statusMap = { approve: "approved", send_back: "sent_back", refer: "referred", reject: "rejected" } as const;
      c.application.status = statusMap[req.action];
      if (req.action === "refer" && (req.refer_to ?? an.refer_to) === "patwari") {
        c.application.status = "awaiting_patwari";
        state.stage = { ...(state.stage ?? {}), [appId]: { kind: "patwari", day: 0, of: an.patwari_form?.days ?? 7, halka: an.patwari_form?.halka.label, report_by: an.patwari_form?.report_by, overdue: false, sent_ts: ts } };
      }
      if (req.action === "send_back") c.application.sendback_count = (c.application.sendback_count ?? 0) + 1;
      state.issued[appId] = { document_no: number, document_kind: kind, text: issued, ts, snapshot };
    }
    const msg = citizenMessage(c.application, an, req);
    if (state.issued[appId]) state.issued[appId].citizen_message = msg;
    const audit: AuditEntry = {
      ts,
      actor_role: role,
      actor: req.officer_name || officerFor(c),
      action: req.action === "show_cause" ? "show_cause_issued" : `decision_${req.action}`,
      app_id: appId,
      records_accessed: an.lineage_matches.map((m) => m.certificate.cert_no),
      note: `${req.action === "show_cause" ? `Pre-rejection hearing notice ${number} issued; reply due ${an.show_cause?.reply_due ?? "—"} (offline)` : `${{ order: "Order", notice: "Notice", reference: "Reference", show_cause: "Notice" }[kind]} ${number} issued (offline)`}; system text ${edited ? "EDITED by the officer" : "unedited"}${findings ? `; findings: ${findings}` : ""}${native ? "; decided with Sewa Setu's own buttons" : ""}${req.shadow ? "; shadow mode: the tool's check was shown after the decision" : ""}${esignTxn ? `; DSC token transaction ${esignTxn} (sign tray)` : ""}`,
      snapshot,
      document_no: number,
      ...(esignTxn ? { esign_txn: esignTxn } : {}),
    };
    pushAudit(audit);
    save();
    const pf = an.patwari_form;
    return {
      application: clone(c.application),
      citizen_message: msg,
      audit,
      document_kind: kind,
      document_no: number,
      issued_text: issued,
      patwari: c.application.status === "awaiting_patwari" && pf ? { halka: pf.halka.label, days: pf.days, report_by: pf.report_by, form: pf, sent_ts: ts } : null,
      tool_check: { suggested_action: an.suggested_action, lane: an.lane, agrees: req.action === an.suggested_action, reason: an.suggested_action_reason },
    };
  },

  showCauseReply(appId: string, outcome: "reply_received" | "no_reply", summary: string | undefined, role: Role = "sdo"): CaseBundle {
    const c = state.cases[appId];
    if (!c) throw new MockHttpError(404, `application ${appId} not found`);
    if (c.application.status !== "show_cause_issued" || !c.analysis.show_cause) throw new MockHttpError(409, "no pre-rejection hearing notice is awaiting a reply");
    const sc = c.analysis.show_cause;
    const ov = (fx<Record<string, Record<string, Analysis>>>("show_cause_overrides") ?? {})[appId]?.[outcome];
    const d = new Date(Date.now() + 5.5 * 3600000);
    const today = `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
    const reply = { outcome, date: today, summary: summary?.trim() || null, simulated: true };
    if (ov) {
      Object.assign(c.analysis, clone(ov));
      // carry this session's notice number / date into the exported reject draft
      const exp = ov.show_cause;
      if (exp && c.analysis.drafts?.reject) {
        for (const lang of ["en", "hi"] as const) {
          let txt = c.analysis.drafts.reject[lang].split(exp.no).join(sc.no).split(exp.date).join(sc.date);
          if (exp.reply?.summary) txt = txt.split(exp.reply.summary).join(reply.summary ?? "");
          c.analysis.drafts.reject[lang] = txt;
        }
      }
    }
    c.analysis.show_cause = { ...sc, reply };
    c.application.status = "pending";
    pushAudit({ ts: nowIso(), actor_role: role, actor: officerFor(c), action: outcome === "reply_received" ? "show_cause_reply" : "show_cause_no_reply", app_id: appId, records_accessed: [], note: `${outcome} (simulated, offline)` });
    save();
    return clone(c);
  },

  callback(appId: string, reason: string, role: Role = "sdo") {
    const c = state.cases[appId];
    if (!c) throw new MockHttpError(404, `application ${appId} not found`);
    if (reason.trim().length < 10) throw new MockHttpError(422, "a call-back needs a reason of at least 10 characters");
    const iss = state.issued[appId];
    if (!iss || c.application.status === "pending") throw new MockHttpError(409, "nothing to call back");
    if ((Date.now() - Date.parse(iss.ts)) / 60000 > 10) throw new MockHttpError(409, "the call-back window (10 minutes) has passed");
    if (c.application.status === "sent_back") c.application.sendback_count = Math.max(0, (c.application.sendback_count ?? 1) - 1);
    if (iss.document_kind === "show_cause") c.analysis.show_cause = null;
    c.application.status = "pending";
    if (state.stage) delete state.stage[appId];
    delete state.issued[appId];
    const audit: AuditEntry = { ts: nowIso(), actor_role: role, actor: officerFor(c), action: "decision_called_back", app_id: appId, records_accessed: [], note: `${iss.document_no} called back. Reason: ${reason.trim()}` };
    pushAudit(audit);
    save();
    return { application: clone(c.application), analysis: clone(c.analysis), audit };
  },

  issued(appId: string): IssuedDocument {
    const d = state.issued[appId];
    if (!d) throw new MockHttpError(404, "no issued document");
    return clone(d);
  },

  // citizen portal (offline fallback): the two demo families only; everything else is "not found"
  citizenPrecheck(req: CitizenPrecheckRequest): CitizenPrecheckResponse {
    if (!req.aadhaar_ok) throw new MockHttpError(403, "Aadhaar e-authentication is required before the archive is searched");
    if (!req.consent) throw new MockHttpError(400, "the applicant's consent is required before the archive is searched");
    const n = (citizenSearches[req.session_id] ?? 0) + 1;
    if (n > 3) throw new MockHttpError(429, "search limit reached (3 per application) — continue with documents or the 'no papers' path");
    citizenSearches[req.session_id] = n;
    const f = req.father_name.toLowerCase();
    const left = 3 - n;
    if (/ramlal|ram lal|रामलाल/.test(f))
      return { status: "found_usable", searches_left: left, proof_ref: "mock-4512", masked_no: "••••4512", office: { en: "SDO (Revenue), Kondagaon", hi: "अनुविभागीय अधिकारी (राजस्व), कोंडागांव" }, year: "2019", relation: { en: "Father", hi: "पिता" } };
    if (/jaglu|जगलू/.test(f) && req.native_village_lgd)
      return { status: "found_usable", searches_left: left, proof_ref: "mock-3186", masked_no: "••••3186", office: { en: "SDO (Revenue), Narayanpur", hi: "अनुविभागीय अधिकारी (राजस्व), नारायणपुर" }, year: "2017", relation: { en: "Father", hi: "पिता" }, found_via_native: true };
    return { status: "not_found", searches_left: left };
  },
  citizenSubmit(req: CitizenSubmitRequest): CitizenSubmitResponse {
    const due = new Date(Date.now() + 22 * 864e5).toISOString().slice(0, 10);
    // one sample number per session (a repeat submit returns the same receipt, as the server does)
    const no = (citizenReceipts[req.session_id] ??= `SS/2026/KDG/${String(9001 + Object.keys(citizenReceipts).length).padStart(5, "0")}`);
    return {
      app_id: no,
      submitted_at: new Date().toISOString(),
      sla_due: due,
      office: { en: "SDO (Revenue), Kondagaon", hi: "अनुविभागीय अधिकारी (राजस्व), कोंडागांव" },
      fee: 30,
      inquiry_requested: !!req.no_papers,
      proof: req.proof_ref ? { masked_no: req.proof_ref === "mock-3186" ? "••••3186" : "••••4512" } : null,
      citizen_message: {
        channel: "whatsapp",
        generator: "template",
        checker: { passed: true, unsupported_entities: [], checked_entities: [] },
        text: {
          hi: `नमस्ते ${req.applicant_name_hi} जी। आपका आवेदन क्र. ${no} जमा हो गया है (शुल्क ₹30)। निर्णय की तिथि: ${due.split("-").reverse().join("-")}। स्थिति सेवा सेतु पोर्टल या नज़दीकी लोक सेवा केंद्र पर देखें।`,
          en: `Hello ${req.applicant_name_en}. Your application No. ${no} is submitted (fee ₹30). Decision due by: ${due.split("-").reverse().join("-")}. See the status on the Sewa Setu portal or at your nearest Lok Seva Kendra.`,
        },
      },
    };
  },
  precheck(req: PrecheckRequest): PrecheckResponse {
    if (req.consent === false) throw new MockHttpError(400, "the applicant's consent is required before the archive is searched");
    const certs = new Map<string, { cert: Certificate; source: LineageMatch }>();
    for (const c of Object.values(loadCases()))
      for (const m of c.analysis.lineage_matches) certs.set(m.certificate.cert_no, { cert: m.certificate, source: m });
    // Round 7: records only the native-village search surfaces (exported for the demo file)
    for (const o of Object.values(fx<Record<string, NativeOverride>>("native_village_overrides") ?? {}))
      for (const m of o.analysis.lineage_matches) if (!certs.has(m.certificate.cert_no)) certs.set(m.certificate.cert_no, { cert: m.certificate, source: m });

    const isCaste = req.service !== "domicile";
    const checklist = precheckChecklist(isCaste);
    const matches: LineageMatch[] = [];
    const father = norm(req.father_name);
    const applicantSurname = skeleton(lastToken(req.applicant_name));

    for (const { cert, source } of certs.values()) {
      if (isCaste !== (cert.service !== "domicile")) continue;
      let byNumber = false;
      if (req.relative_cert_no && req.relative_cert_no.trim().toUpperCase() === cert.cert_no.toUpperCase()) byNumber = true;
      const holder = norm(cert.holder_name.en);
      const holderHi = norm(cert.holder_name.hi);
      const fatherScore = Math.max(similarity(father, holder), similarity(father, holderHi));
      const siblingScore = Math.max(similarity(father, norm(cert.father_name.en)), similarity(father, norm(cert.father_name.hi)));
      const surnameOk = applicantSurname && applicantSurname === skeleton(lastToken(cert.holder_name.en));
      const villageOk = !req.village_lgd || req.village_lgd === cert.village_lgd;
      const asFather = fatherScore >= 0.85 && surnameOk && villageOk;
      const asSibling = siblingScore >= 0.85 && surnameOk && villageOk;
      // Round 7: in the native (maiden) village a married woman's surname differs from her father's — compare the father's
      const viaNative =
        !!req.native_village_lgd && req.native_village_lgd === cert.village_lgd && !(asFather || asSibling) &&
        skeleton(lastToken(req.father_name)) === skeleton(lastToken(cert.holder_name.en)) && Math.max(fatherScore, siblingScore) >= 0.85;
      if (!byNumber && !asFather && !asSibling && !viaNative) continue;
      if (!viaNative && source.found_via === "native_village" && !byNumber) continue;
      const weights: WeightItem[] = clone(source.weights);
      const m: LineageMatch = { ...clone(source), weights };
      if (!viaNative) {
        delete m.found_via;
        delete m.found_via_note;
      }
      matches.push(m);
    }
    matches.sort((a, b) => b.match_probability - a.match_probability);
    const usable = matches.find((m) => m.usable_as_evidence);
    if (usable) {
      const item = checklist.find((x) => x.code === (isCaste ? "caste_proof" : "residence_15y"));
      if (item) {
        item.present = true;
        item.satisfied_by = T(`Family certificate ${usable.certificate.cert_no}`, `परिवार का प्रमाण पत्र ${usable.certificate.cert_no}`);
      }
    }
    pushAudit({
      ts: nowIso(),
      actor_role: "kendra_operator",
      actor: "Operator · LSK Kondagaon",
      action: "precheck",
      records_accessed: matches.map((m) => m.certificate.cert_no),
      note: "Declared lookup with citizen consent",
    });
    save();
    return {
      matches,
      checklist,
      summary: usable
        ? T(
            `Matching family certificate found (No. ${usable.certificate.cert_no}). Attach it as proof.${usable.found_via ? ` Found through the native (maiden) village ${usable.certificate.village.en}.` : ""}`,
            `परिवार का मिलता-जुलता प्रमाण पत्र मिला (क्र. ${usable.certificate.cert_no})। इसे प्रमाण के रूप में संलग्न करें।${usable.found_via ? ` मायके / मूल गांव ${usable.certificate.village.hi} की खोज से मिला।` : ""}`,
          )
        : matches.length
          ? T("A family certificate was found but cannot be used as proof. Normal documents apply.", "परिवार का प्रमाण पत्र मिला, परंतु प्रमाण के रूप में उपयोग नहीं हो सकता। सामान्य दस्तावेज़ लागू।")
          : T("No family certificate found. Normal documents apply.", "परिवार का कोई प्रमाण पत्र नहीं मिला। सामान्य दस्तावेज़ लागू होंगे।"),
      suggestion: usable
        ? T("The officer will verify the relationship. The pre-1950 record is not needed if the officer accepts this certificate.", "अधिकारी संबंध का सत्यापन करेंगे। अधिकारी द्वारा यह प्रमाण पत्र स्वीकार करने पर 1950 से पूर्व का अभिलेख आवश्यक नहीं।")
        : T("Please collect the documents in the checklist before paying the fee.", "शुल्क जमा करने से पहले सूची के दस्तावेज़ एकत्र करें।"),
    };
  },
};

// ---------- helpers ----------
interface NativeOverride {
  village_lgd: number;
  analysis: Analysis;
  confirmed: Analysis;
}
/** Round 7: the exported native-village search for a file, when the searched village is the exported one */
function nativeOverride(appId: string, villageLgd: number | null | undefined): NativeOverride | null {
  const o = (fx<Record<string, NativeOverride>>("native_village_overrides") ?? {})[appId];
  return o && villageLgd != null && o.village_lgd === villageLgd ? o : null;
}

function slaClock(): SlaClock {
  const paused = state.slaPause === "paused_proposed";
  return paused
    ? { state: "paused_proposed", paused: true, label: T("SLA paused (proposed policy — pending Revenue order)", "SLA रुकी (प्रस्तावित नीति — राजस्व आदेश लंबित)") }
    : { state: "running", paused: false, label: T("SLA clock: running · pause requires Revenue order", "SLA घड़ी: चालू · रोकने हेतु राजस्व आदेश आवश्यक") };
}

/** Round 6: the SDO sub-division a file belongs to (from the exported analysis) */
function subdivisionOf(c: CaseBundle): string {
  return c.analysis.subdivision?.en ?? "Kondagaon";
}

function wrongDesk409(c: CaseBundle, desk: string, what: string) {
  const sd = c.analysis.subdivision;
  if (c.application.routed_to === "sdo" && sd && desk && sd.en !== desk)
    throw new MockHttpError(409, `${c.application.app_id} belongs to ${sd.office.en} (tehsil ${c.application.tehsil.en}), not the SDO ${desk} desk — forward it; ${what}`);
}

/** Round 6: OBC approvals record the officer's creamy-layer finding (same rule as the backend) */
function checkCreamy(an: Analysis, req: DecisionRequest) {
  const cl = an.creamy_layer;
  if (req.action !== "approve" || !cl) return;
  const marked = (["en", "hi"] as const).map((l) => (req.order_text[l] ?? "").includes(cl.mark[l]));
  if (req.channel === "sewasetu_native" && !req.creamy_layer && !marked.some(Boolean)) return;
  if (!req.creamy_layer?.non_creamy) throw new MockHttpError(422, "an OBC approval needs your creamy-layer finding: tick 'not in the creamy layer (non-creamy layer)' and the documents relied on");
  const opts = new Set(cl.options.map((o) => o.code));
  if (!req.creamy_layer.docs.length || req.creamy_layer.docs.some((d) => !opts.has(d))) throw new MockHttpError(422, "name the documents relied on for the creamy-layer finding");
  if (!marked.every(Boolean)) throw new MockHttpError(422, "the order must record the creamy-layer finding (Hindi and English)");
}

function stageOf(appId: string): Stage | null {
  const st = state.stage?.[appId];
  const c = state.cases[appId];
  if (st && c?.application.status === "awaiting_patwari") {
    const day = Math.max(0, Math.floor((Date.now() - Date.parse(st.sent_ts ?? nowIso())) / 86400000));
    return { kind: "patwari", day, of: st.of ?? 7, halka: st.halka, report_by: st.report_by, overdue: day > (st.of ?? 7), sla_clock: slaClock() };
  }
  if (c?.application.status === "show_cause_issued" && c.analysis.show_cause) return { kind: "show_cause", reply_due: c.analysis.show_cause.reply_due, sla_clock: slaClock() };
  return null;
}

function precheckChecklist(isCaste: boolean): ChecklistItem[] {
  const base = isCaste
    ? [
        ["aadhaar", T("Aadhaar card", "आधार कार्ड")],
        ["photo", T("Photograph", "फोटो")],
        ["affidavit", T("Self-declaration affidavit", "स्व-घोषणा शपथ पत्र")],
        ["residence", T("Residence proof", "निवास प्रमाण")],
        ["caste_proof", T("Caste proof (pre-1950 record / school record / family certificate)", "जाति प्रमाण (1950 से पूर्व अभिलेख / स्कूल रिकॉर्ड / परिवार का प्रमाण पत्र)")],
      ]
    : [
        ["aadhaar", T("Aadhaar card", "आधार कार्ड")],
        ["photo", T("Photograph", "फोटो")],
        ["affidavit", T("Self-declaration affidavit", "स्व-घोषणा शपथ पत्र")],
        ["residence_15y", T("Residence proof (15 years)", "निवास प्रमाण (15 वर्ष)")],
      ];
  return base.map(([code, label]) => ({ code: code as string, label: label as I18n, required: true, present: false }));
}

function lastToken(s: string) {
  const parts = s.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

const DEV2LAT: Record<string, string> = {
  "रामलाल": "ramlal", "मरकाम": "markam", "सुनीता": "sunita", "मोहन": "mohan", "वर्मा": "verma", "लखमू": "lakhmu", "सोरी": "sori",
  "बुधराम": "budhram", "कश्यप": "kashyap", "श्यामलाल": "shyamlal", "साहू": "sahu", "रमेश": "ramesh", "यादव": "yadav",
};

function norm(s: string) {
  let out = s.trim().toLowerCase();
  for (const [d, l] of Object.entries(DEV2LAT)) out = out.split(d).join(l);
  return out.replace(/\s+/g, "").replace(/(.)\1+/g, "$1").replace(/aa/g, "a");
}
function skeleton(s: string) {
  return norm(s).replace(/[aeiouy]/g, "").replace(/h/g, "");
}
function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // normalised Levenshtein
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[a.length][b.length] / Math.max(a.length, b.length);
}

export function citizenMessage(a: Application, an: Analysis, req: DecisionRequest): CitizenMessage {
  const name = a.applicant_name;
  const office = an.office ?? (a.routed_to === "tehsildar" ? T("Tehsildar", "तहसीलदार") : T("SDO (Revenue)", "अनुविभागीय अधिकारी (राजस्व)"));
  const lib = an.sendback_reasons ?? an.deficiencies;
  // Round 5: plain words for the citizen — legal references stay in the notice
  const plain = (x: string) => x.replace(/\s*\((?:[^()]|\([^()]*\))*?(?:Rule|नियम|creamy|क्रीमी)(?:[^()]|\([^()]*\))*\)/g, "");
  const defs: { text: I18n }[] = lib.filter((d) => req.deficiency_codes?.includes(d.code)).map((d) => ({ text: T(plain(d.text.en), plain(d.text.hi)) }));
  if (req.custom_deficiency?.trim()) defs.push({ text: T(req.custom_deficiency.trim(), req.custom_deficiency.trim()) });
  let en = "";
  let hi = "";
  const srcs = an.evidence_rows.map((e) => e.source.en);
  const seenParts = [
    srcs.some((x) => x.startsWith("Bhuiyan")) ? T("land record (Bhuiyan)", "भू-अभिलेख (भुइयां)") : null,
    srcs.some((x) => x.startsWith("Khadya")) ? T("ration roster (Khadya)", "राशन सूची (खाद्य)") : null,
  ].filter(Boolean) as I18n[];
  const seen = T(seenParts.map((x) => x.en).join(", "), seenParts.map((x) => x.hi).join(", "));
  switch (req.action) {
    case "approve":
      en = `Namaste ${name.en}. Your ${a.service_label.en} (application ${a.app_id}) has been approved. Download it on Sewa Setu, find it in DigiLocker, or collect it at your Lok Seva Kendra.\nRecords used in the decision on your application: ${an.accepted_cert_nos.length ? `certificate No. ${an.accepted_cert_nos.join(", ")} (family)` : "the documents you attached"}.${seen.en ? ` Other records seen: ${seen.en} (for corroboration only).` : ""} Correction / objection: CSC or the Sewa Setu grievance. — ${office.en}`;
      hi = `नमस्ते ${name.hi} जी। आपका ${a.service_label.hi} (आवेदन क्र. ${a.app_id}) स्वीकृत हो गया है। सेवा सेतु पर डाउनलोड करें, डिजिलॉकर में भी उपलब्ध, या अपने लोक सेवा केंद्र से लें।\nआपके आवेदन पर निर्णय में उपयोग हुए अभिलेख: ${an.accepted_cert_nos.length ? `प्रमाण पत्र क्र. ${an.accepted_cert_nos.join(", ")} (परिवार)` : "आपके संलग्न दस्तावेज़"}।${seen.hi ? ` देखे गए अन्य अभिलेख: ${seen.hi} (केवल पुष्टि हेतु)।` : ""} सुधार/आपत्ति: सीएससी या सेवा सेतु शिकायत। — ${office.hi}`;
      break;
    case "send_back":
      en = `Namaste ${name.en}. To complete application ${a.app_id} we need: ${defs.map((d) => d.text.en).join("; ") || "one document"}. Please submit it at your Lok Seva Kendra. No new fee. — ${office.en}`;
      hi = `नमस्ते ${name.hi} जी। आवेदन क्र. ${a.app_id} पूरा करने के लिए यह चाहिए: ${defs.map((d) => d.text.hi).join("; ") || "एक दस्तावेज़"}। कृपया इसे अपने लोक सेवा केंद्र पर जमा करें। कोई नया शुल्क नहीं लगेगा। — ${office.hi}`;
      break;
    case "refer":
      en = `Namaste ${name.en}. Application ${a.app_id} has been sent for one more verification step. You do not need to do anything now; we will message you.\nRecords seen so far: ${seen.en || "the documents you attached"}. Correction / objection: CSC or the Sewa Setu grievance. — ${office.en}`;
      hi = `नमस्ते ${name.hi} जी। आवेदन क्र. ${a.app_id} एक अतिरिक्त सत्यापन के लिए भेजा गया है। अभी आपको कुछ नहीं करना है; आगे की जानकारी संदेश से मिलेगी।\nअब तक देखे गए अभिलेख: ${seen.hi || "आपके संलग्न दस्तावेज़"}। सुधार/आपत्ति: सीएससी या सेवा सेतु शिकायत। — ${office.hi}`;
      break;
    case "reject":
      {
        const used = an.lineage_matches.filter((m) => m.disposition?.decision !== "not").map((m) => m.certificate.cert_no);
        en = `Namaste ${name.en}. Your application ${a.app_id} has been rejected. The order with reasons is on Sewa Setu and at ${a.kendra.en}. You may appeal under section 5 within 30 days to the Appellate Authority.\nRecords used in the decision on your application: ${used.length ? `certificate No. ${used.join(", ")}` : "the documents you attached"}.${seen.en ? ` Other records seen: ${seen.en} (for corroboration only).` : ""} Correction / objection: CSC or the Sewa Setu grievance. — ${office.en}`;
        hi = `नमस्ते ${name.hi} जी। आपका आवेदन क्र. ${a.app_id} अस्वीकृत हुआ है। कारण सहित आदेश सेवा सेतु पर और ${a.kendra.hi} पर उपलब्ध है। धारा 5 के अंतर्गत 30 दिन में अपीलीय अधिकारी को अपील कर सकते हैं।\nआपके आवेदन पर निर्णय में उपयोग हुए अभिलेख: ${used.length ? `प्रमाण पत्र क्र. ${used.join(", ")}` : "आपके संलग्न दस्तावेज़"}।${seen.hi ? ` देखे गए अन्य अभिलेख: ${seen.hi} (केवल पुष्टि हेतु)।` : ""} सुधार/आपत्ति: सीएससी या सेवा सेतु शिकायत। — ${office.hi}`;
      }
      break;
    case "show_cause":
      en = `Namaste ${name.en}. For your application ${a.app_id} a notice has been issued asking for your explanation before any decision. Reply within 15 days at ${a.kendra.en} or to the office; you may also ask to be heard. — ${office.en}`;
      hi = `नमस्ते ${name.hi} जी। आपके आवेदन क्र. ${a.app_id} पर निर्णय से पहले आपका पक्ष जानने हेतु सूचना जारी की गई है। 15 दिन में ${a.kendra.hi} पर या कार्यालय में उत्तर दें; आप सुनवाई का अनुरोध भी कर सकते हैं। — ${office.hi}`;
      break;
  }
  return {
    channel: "whatsapp",
    text: { en, hi },
    generator: "template",
    checker: {
      passed: true,
      unsupported_entities: [],
      checked_entities: [name.en, a.app_id, office.en, ...an.lineage_matches.map((m) => m.certificate.cert_no).slice(0, 1)],
    },
  };
}
