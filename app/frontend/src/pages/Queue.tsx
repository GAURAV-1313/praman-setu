import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useI18n } from "../i18n";
import type { AuditEntry, Desk, I18n, Lane, PolicyResponse, QueueItem, Role, TraySignResponse, TrayView } from "../api/types";
import { DESK_LABEL, setDesk, useDesk } from "../desk";
import WhatsAppPreview from "../components/WhatsAppPreview";
import { Bi, ErrorBox, Kbd, LANE_LABEL, LaneChip, Loading, SERVICE_ICON, SERVICE_SHORT, SlaClockNote, STATUS_LABEL, useAsync } from "../components/common";

const LANES: Lane[] = ["records_complete", "standard_review", "needs_attention"];
type Filter = Lane | "all" | "urgent" | "pending" | "awaiting_reply" | "sent_back" | "signed_today" | "awaiting_patwari";
const SIGNED = new Set(["approved", "referred", "rejected"]);
const FILTERS: Filter[] = ["all", ...LANES, "urgent", "pending", "awaiting_reply", "sent_back", "signed_today", "awaiting_patwari"];

/** Round 3 fallback when the backend did not send `next_step` (older fixtures): the pending task, never an outcome. */
function nextStepOf(q: QueueItem): I18n {
  const ns = q.next_step;
  if (ns) return ns;
  if (q.lane === "records_complete") return { en: "Ready to sign", hi: "हस्ताक्षर हेतु तैयार" };
  if (q.lane === "needs_attention") return { en: "Verify the flagged point", hi: "ध्यान-बिंदु सत्यापित करें" };
  const e = q.evidence_summary.en;
  if (/confirm relationship/i.test(e)) return { en: "Confirm relationship", hi: "संबंध तय करें" };
  if (/possible family record/i.test(e)) return { en: "Mark possible record", hi: "संभावित अभिलेख चिह्नित करें" };
  if (/missing/i.test(e)) return { en: "Missing documents", hi: "दस्तावेज़ की कमी" };
  return { en: "Normal scrutiny", hi: "सामान्य जांच" };
}
function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
}

function lastCase(): string | null {
  try {
    return sessionStorage.getItem("ps_last_case");
  } catch {
    return null;
  }
}

export default function Queue() {
  const [sp, setSp] = useSearchParams();
  const role: Role = sp.get("role") === "tehsildar" ? "tehsildar" : "sdo";
  const { t, tx, setRole, shadow } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  // an unknown ?filter= (typo, old link) falls back to "all" instead of an empty list with no chip selected
  const initialFilter: Filter = FILTERS.includes(sp.get("filter") as Filter) ? (sp.get("filter") as Filter) : "all";
  const [filter, setFilter] = useState<Filter>(initialFilter);
  // Round 6 (P2): the SDO desk shows only its own sub-division's files
  const deskCode = useDesk();
  const { data, error, loading, reload } = useAsync<QueueItem[]>(() => api.queue(role), [role, deskCode]);
  const tray = useAsync<TrayView>(() => api.tray(), [role, deskCode]);
  const desks = useAsync<Desk[]>(() => api.desks(), [deskCode, data]);
  const policy = useAsync<PolicyResponse>(() => api.policy(), []);
  const [trayOpen, setTrayOpen] = useState<boolean>(!!(loc.state as { openTray?: boolean } | null)?.openTray);
  const [note, setNote] = useState<string | null>(((loc.state as { note?: string } | null)?.note) ?? null);
  const { data: audit, reload: reloadAudit } = useAsync<AuditEntry[]>(() => api.audit(), [role]);
  // files this desk signed today (from the audit trail; a called-back order no longer counts)
  const signedToday = useMemo(() => {
    const ids = new Set<string>();
    const today = todayIST();
    for (const e of audit ?? []) {
      if (e.actor_role !== role || !e.app_id || !e.action.startsWith("decision_") || e.action === "decision_called_back") continue;
      if (new Date(Date.parse(e.ts) + 5.5 * 3600000).toISOString().slice(0, 10) !== today) continue;
      ids.add(e.app_id);
    }
    return new Set((data ?? []).filter((q) => ids.has(q.application.app_id) && SIGNED.has(q.application.status)).map((q) => q.application.app_id));
  }, [audit, data, role]);
  const tbody = useRef<HTMLTableSectionElement>(null);
  useEffect(() => setRole(role), [role, setRole]); // role pill follows the queue being viewed

  const counts = useMemo(() => {
    const pending = (data ?? []).filter((q) => q.application.status === "pending");
    const all = data ?? [];
    const c: Record<string, number> = {
      all: all.length,
      pending: pending.length,
      urgent: pending.filter((q) => q.sla_urgent).length,
      awaiting_reply: all.filter((q) => q.application.status === "show_cause_issued").length,
      sent_back: all.filter((q) => q.application.status === "sent_back").length,
      signed_today: signedToday.size,
      awaiting_patwari: all.filter((q) => q.application.status === "awaiting_patwari").length,
    };
    for (const l of LANES) c[l] = pending.filter((q) => q.lane === l).length;
    return c;
  }, [data, signedToday]);
  const rows = (data ?? []).filter((q) => {
    const st = q.application.status;
    if (filter === "all") return true;
    if (filter === "pending") return st === "pending";
    if (filter === "urgent") return q.sla_urgent && st === "pending";
    if (filter === "awaiting_reply") return st === "show_cause_issued";
    if (filter === "sent_back") return st === "sent_back";
    if (filter === "signed_today") return signedToday.has(q.application.app_id);
    if (filter === "awaiting_patwari") return st === "awaiting_patwari";
    return q.lane === filter && st === "pending";
  });
  const desk: { f: Filter; n: number; en: string; hi: string; amber?: boolean }[] = [
    { f: "pending", n: counts.pending, en: "Pending with me", hi: "मुझ पर लंबित" },
    { f: "urgent", n: counts.urgent, en: "Due in ≤ 3 days", hi: "3 दिन में देय", amber: counts.urgent > 0 },
    { f: "awaiting_reply", n: counts.awaiting_reply, en: "Awaiting hearing notice reply", hi: "सुनवाई सूचना उत्तर की प्रतीक्षा" },
    { f: "sent_back", n: counts.sent_back, en: "Sent back · awaiting citizen", hi: "वापस भेजे · नागरिक की प्रतीक्षा" },
    { f: "awaiting_patwari", n: counts.awaiting_patwari, en: "With the Patwari", hi: "पटवारी के पास" },
    { f: "signed_today", n: counts.signed_today, en: "Orders issued today", hi: "आज जारी आदेश" },
  ];
  const open = (id: string) => nav(`/officer/case/${encodeURIComponent(id)}`);

  // come back to where you were: focus the last opened row
  useEffect(() => {
    if (!data || !tbody.current) return;
    const id = lastCase();
    const tr = (id && tbody.current.querySelector<HTMLTableRowElement>(`tr[data-id="${CSS.escape(id)}"]`)) || tbody.current.querySelector<HTMLTableRowElement>("tr[data-pending='1']");
    if (tr) {
      tr.focus({ preventScroll: true });
      tr.scrollIntoView({ block: "nearest" });
    }
  }, [data]);

  function onRowKey(e: React.KeyboardEvent<HTMLTableRowElement>, id: string) {
    const tr = e.currentTarget;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(id);
    } else if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      (tr.nextElementSibling as HTMLElement | null)?.focus();
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      (tr.previousElementSibling as HTMLElement | null)?.focus();
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">{tx("Application queue", "आवेदन कतार")}</div>
          <div className="page-sub">
            {role === "sdo"
              ? tx(`${DESK_LABEL[deskCode]?.en ?? deskCode} desk, Kondagaon district · permanent SC/ST/OBC certificates · only this sub-division's files`, `${DESK_LABEL[deskCode]?.hi ?? deskCode} डेस्क, जिला कोंडागांव · स्थायी अ.जा./अ.ज.जा./अ.पि.व. प्रमाण पत्र · केवल इसी अनुविभाग की फ़ाइलें`)
              : tx("Tehsildar desk, Kondagaon district · domicile and temporary caste certificates · each order is signed for the applicant's tehsil", "तहसीलदार डेस्क, जिला कोंडागांव · मूल निवास व अस्थायी जाति प्रमाण पत्र · प्रत्येक आदेश आवेदक की तहसील हेतु")}
          </div>
        </div>
        <div className="seg" role="group" aria-label={tx("Role", "भूमिका")}>
          {(["sdo", "tehsildar"] as Role[]).map((r) => (
            <button
              key={r}
              className={role === r ? "on" : ""}
              onClick={() => {
                setRole(r);
                setSp({ role: r });
                setFilter("all");
              }}
            >
              {r === "sdo" ? tx("SDO (Revenue)", "एसडीओ (राजस्व)") : tx("Tehsildar", "तहसीलदार")}
            </button>
          ))}
        </div>
      </div>

      <div className="desk" role="group" aria-label={tx("My desk", "मेरा डेस्क")}>
        <div className="desk-head">
          <b>{tx("My desk", "मेरा डेस्क")}</b>
          {role === "sdo" ? (
            <label className="desk-pick" title={tx("Demo: each SDO (Revenue) sees only their own sub-division's files", "डेमो: प्रत्येक एसडीओ (राजस्व) केवल अपने अनुविभाग की फ़ाइलें देखते हैं")}>
              <select id="desk-select" value={deskCode} onChange={(e) => setDesk(e.target.value)} aria-label={tx("SDO desk (sub-division)", "एसडीओ डेस्क (अनुविभाग)")}>
                {(desks.data ?? [{ code: deskCode, short: DESK_LABEL[deskCode], pending: 0 } as Desk]).map((d) => (
                  <option key={d.code} value={d.code}>
                    {t(d.short)}
                    {desks.data ? ` (${d.pending})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span>{tx("Tehsildar", "तहसीलदार")}</span>
          )}
        </div>
        {desk.map((d) => (
          <button key={d.f} className={`desk-chip ${d.amber ? "amber" : ""} ${filter === d.f ? "on" : ""}`} onClick={() => setFilter(filter === d.f ? "all" : d.f)} aria-pressed={filter === d.f}>
            <b>{data ? d.n : "—"}</b>
            <span>{tx(d.en, d.hi)}</span>
          </button>
        ))}
        <button className={`desk-chip tray-chip ${(tray.data?.items.length ?? 0) > 0 ? "has" : ""}`} onClick={() => setTrayOpen(true)} id="tray-chip" title={tx("Records-complete orders you opened and read, waiting for one DSC token passcode", "पढ़े गए अभिलेख-पूर्ण आदेश, एक DSC टोकन पासकोड की प्रतीक्षा में")}>
          <b>
            {tray.data?.items.length ?? 0}/{tray.data?.max ?? 5}
          </b>
          <span>{tx("Sign tray · one token passcode", "हस्ताक्षर ट्रे · एक टोकन पासकोड")}</span>
        </button>
      </div>
      {note && (
        <div className="toast static" role="status">
          <span>{note}</span>
          <span className="spacer" />
          <button className="toast-x" aria-label={tx("Dismiss", "बंद करें")} onClick={() => setNote(null)}>
            ×
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-cool)" }}>
          <div className="filter-chips">
            <button className={`filter-chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>
              {tx("All (incl. decided)", "सभी (निर्णीत सहित)")} <span className="count">{data ? counts.all : "—"}</span>
            </button>
            {LANES.map((l) => (
              <button key={l} className={`filter-chip ${filter === l ? "on" : ""}`} onClick={() => setFilter(l)}>
                {t(LANE_LABEL[l])} <span className="count">{data ? counts[l] : "—"}</span>
              </button>
            ))}
          </div>
          <span className="spacer" />
          <span className="small muted">
            {tx("Order: due soon → records complete → standard review → needs attention", "क्रम: शीघ्र देय → अभिलेख पूर्ण → सामान्य जांच → ध्यान दें")} · <Kbd k="J" />/<Kbd k="K" /> <Kbd k="↵" />
          </span>
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <div style={{ padding: 16 }}>
            <ErrorBox error={error} />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table queue">
              <thead>
                <tr>
                  <th>{tx("Applicant", "आवेदक")}</th>
                  <th>{tx("Service", "सेवा")}</th>
                  <th>{tx("SLA", "समय-सीमा")}</th>
                  <th>{tx("What the records show", "अभिलेख क्या दिखाते हैं")}</th>
                  <th>{tx("Next step", "अगला कदम")}</th>
                  <th>{tx("Lane", "श्रेणी")}</th>
                </tr>
              </thead>
              <tbody ref={tbody}>
                {rows.map((q) => {
                  const a = q.application;
                  const days = q.sla_days_left;
                  const pending = a.status === "pending";
                  return (
                    <tr
                      key={a.app_id}
                      data-id={a.app_id}
                      data-pending={pending ? "1" : "0"}
                      className={`click lane-${q.lane} ${pending ? "" : "done"}`}
                      tabIndex={0}
                      onClick={() => open(a.app_id)}
                      onKeyDown={(e) => onRowKey(e, a.app_id)}
                    >
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          <Bi v={a.applicant_name} inline />
                        </div>
                        <div className="small muted">
                          <span className="mono">{a.app_id}</span> · {t(a.village)}
                        </div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                          <img src={SERVICE_ICON[a.service]} alt="" width={28} height={28} />
                          <span className="small" style={{ fontWeight: 600 }}>
                            {t(SERVICE_SHORT[a.service])}
                          </span>
                        </div>
                      </td>
                      <td>
                        {q.sla_urgent && pending ? (
                          <span className="pill amber">⏰ {days < 0 ? tx(`${-days} d late`, `${-days} दिन विलंब`) : `${days} ${tx("d", "दिन")}`}</span>
                        ) : (
                          <span className={`small ${pending && days <= 7 ? "sla-soon" : ""}`}>
                            {days} {tx("d", "दिन")}
                          </span>
                        )}
                      </td>
                      <td className="reason">{shadow && pending && q.competent !== false ? <span className="muted">{tx("Shadow mode: the records check appears after your decision", "शैडो मोड: अभिलेख जांच आपके निर्णय के बाद")}</span> : t(q.evidence_summary)}</td>
                      <td>
                        {pending ? (
                          <span className={`next-step ${q.competent === false ? "attention" : shadow ? "" : (q.ready_to_sign ?? q.lane === "records_complete") ? "ready" : q.lane === "needs_attention" ? "attention" : ""}`}>
                            {shadow && q.competent !== false ? tx("Examine", "परीक्षण करें") : t(nextStepOf(q))}
                          </span>
                        ) : q.stage?.kind === "patwari" ? (
                          <>
                            <span className={`pill ${q.stage.overdue ? "amber" : "outline"} stage-pill`} title={q.stage.halka ? t(q.stage.halka) : undefined}>
                              {tx(`With the Patwari · ${q.stage.day}/${q.stage.of} days`, `पटवारी के पास · ${q.stage.day}/${q.stage.of} दिन`)}
                            </span>
                            <div>
                              <SlaClockNote clock={q.stage.sla_clock} />
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="pill">{t(STATUS_LABEL[a.status])}</span>
                            {q.stage?.kind === "show_cause" && (
                              <div>
                                <SlaClockNote clock={q.stage.sla_clock} />
                              </div>
                            )}
                          </>
                        )}
                        {q.in_tray && <span className="pill blue small" style={{ marginLeft: 6 }}>{tx("in tray", "ट्रे में")}</span>}
                      </td>
                      <td>
                        {q.competent === false && pending ? (
                          <span className="lane-chip needs_attention" title={tx("Not this desk's competence: forward it", "इस डेस्क की सक्षमता नहीं: अग्रेषित करें")}>
                            <span className="dot" /> {tx("Wrong desk", "गलत डेस्क")}
                          </span>
                        ) : shadow && pending ? (
                          <span className="lane-chip shadow">{tx("after decision", "निर्णय के बाद")}</span>
                        ) : (
                          <LaneChip lane={q.lane} />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 30 }}>
                      {tx("No applications here.", "यहाँ कोई आवेदन नहीं।")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        {tx(
          "Nothing is decided in the queue. Permanent caste certificates go to the SDO (Revenue); domicile and temporary caste to the Tehsildar. No bulk approve: the sign tray takes at most 5 files, each opened and read. No auto-reject.",
          "कतार में कुछ तय नहीं होता। स्थायी जाति प्रमाण पत्र अनुविभागीय अधिकारी (राजस्व) को; मूल निवास व अस्थायी जाति तहसीलदार को। सामूहिक स्वीकृति नहीं: हस्ताक्षर ट्रे में अधिकतम 5 फ़ाइलें, प्रत्येक खोली व पढ़ी गई। स्वतः अस्वीकृति नहीं।",
        )}
      </p>
      {policy.data && (
        <p className="small policy-foot" id="policy-foot">
          <b>{tx("Active policy", "सक्रिय नीति")}:</b> {tx("Tehsildar-issued earlier permanent certificates", "तहसीलदार द्वारा जारी पूर्व स्थायी प्रमाण पत्र")} —{" "}
          {t(policy.data.options.tehsildar_issued_permanent[policy.data.policy.tehsildar_issued_permanent])}
          {policy.data.policy.tehsildar_issued_permanent === "verify" && <> · {tx("policy: confirmation required (notification No. —)", "नीति: पुष्टि आवश्यक (अधिसूचना क्र. —)")}</>}
          <span className="muted"> · {tx("set by the Collector / CHiPS admin", "कलेक्टर / CHiPS प्रशासक द्वारा निर्धारित")}</span>
          {" · "}
          {policy.data.policy.sla_pause === "paused_proposed"
            ? tx("SLA paused during hearing / Patwari referral (proposed policy — pending Revenue order)", "सुनवाई / पटवारी संदर्भ के दौरान SLA रुकी (प्रस्तावित नीति — राजस्व आदेश लंबित)")
            : tx("SLA clock: running during hearing / Patwari referral · pause requires Revenue order", "सुनवाई / पटवारी संदर्भ के दौरान SLA घड़ी: चालू · रोकने हेतु राजस्व आदेश आवश्यक")}
        </p>
      )}
      {trayOpen && (
        <TrayModal
          tray={tray.data}
          onClose={() => setTrayOpen(false)}
          onChanged={() => {
            tray.reload();
            reload();
            reloadAudit(); // "Orders issued today" counts from the audit: tray signatures must show at once
          }}
        />
      )}
    </div>
  );
}

/** Round 4 (P0-B2): the sign tray — up to 5 records-complete orders, each opened and read, signed with one DSC token passcode.
 *  Each order is still generated, numbered and snapshotted on its own. */
function TrayModal({ tray, onClose, onChanged }: { tray: TrayView | null; onClose: () => void; onChanged: () => void }) {
  const { t, tx } = useI18n();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<TraySignResponse | null>(null);
  const items = tray?.items ?? [];
  // Esc closes the tray from anywhere (an empty tray has no focused control inside the dialog)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [busy, onClose]);
  async function sign() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.traySign(otp.trim(), items[0]?.office.en);
      setDone(r);
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    await api.trayRemove(id);
    onChanged();
  }
  return (
    <div className="modal-bg" onClick={() => !busy && onClose()}>
      <div className="modal tray-modal" role="dialog" aria-modal="true" aria-labelledby="tray-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="tray-title">{tx("Sign tray — one DSC token passcode", "हस्ताक्षर ट्रे — एक DSC टोकन पासकोड")}</h2>
        <p className="small muted">
          {tx(
            "Only records-complete files you opened and read are here (max 5). Each gets its own order number, text and audit snapshot; one DSC token passcode signs them all (Sign PDF for each).",
            "यहाँ केवल वे अभिलेख-पूर्ण फ़ाइलें हैं जिन्हें आपने खोला व पढ़ा (अधिकतम 5)। प्रत्येक का अलग आदेश क्रमांक, पाठ व ऑडिट स्नैपशॉट; एक DSC टोकन पासकोड से सभी पर हस्ताक्षर (प्रत्येक PDF पर अलग)।",
          )}
        </p>
        {done ? (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <div className="tray-done" role="status" id="tray-done">
              ✓ {tx(`${done.signed.length} orders signed with one DSC token passcode`, `एक DSC टोकन पासकोड से ${done.signed.length} आदेश हस्ताक्षरित`)} · <span className="mono">{done.esign_txn}</span>
            </div>
            <table className="table">
              <tbody>
                {done.signed.map((r) => (
                  <tr key={r.app_id}>
                    <td className="mono small">{r.app_id}</td>
                    <td>{t(r.name)}</td>
                    <td className="mono">{r.document_no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {done.errors.map((e) => (
              <div key={e.app_id} className="error-box small">
                {e.app_id}: {e.detail}
              </div>
            ))}
            {done.signed[0] && (
              <details>
                <summary className="small">{tx("Citizen message (first file)", "नागरिक संदेश (पहली फ़ाइल)")}</summary>
                <WhatsAppPreview msg={done.signed[0].citizen_message} />
              </details>
            )}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn blue" onClick={onClose} autoFocus>
                {tx("Close", "बंद करें")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>{tx("Application", "आवेदन")}</th>
                  <th>{tx("Applicant", "आवेदक")}</th>
                  <th>{tx("Order", "आदेश")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.app_id}>
                    <td className="mono small">{i.app_id}</td>
                    <td>{t(i.name)}</td>
                    <td className="small muted">{tx("Approve · read ✓ · number on signing", "स्वीकृत · पढ़ा ✓ · क्रमांक हस्ताक्षर पर")}</td>
                    <td>
                      <button className="btn secondary sm" onClick={() => remove(i.app_id)} disabled={busy || otpSent}>
                        {tx("Remove", "हटाएं")}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted small" style={{ textAlign: "center", padding: 16 }}>
                      {tx("The tray is empty. Open a records-complete file, read the order, then “Add to sign tray” (Ctrl+S).", "ट्रे खाली है। अभिलेख-पूर्ण फ़ाइल खोलें, आदेश पढ़ें, फिर “हस्ताक्षर ट्रे में रखें” (Ctrl+S)।")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn secondary" onClick={onClose} autoFocus>
                  {tx("Close", "बंद करें")}
                </button>
              </div>
            )}
            {items.length > 0 && !otpSent && (
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn secondary" onClick={onClose}>
                  {tx("Close", "बंद करें")}
                </button>
                <button className="btn blue" onClick={() => setOtpSent(true)} id="tray-otp-btn" autoFocus>
                  ✍ {tx(`Sign ${items.length} orders with DSC token`, `${items.length} आदेशों पर DSC टोकन से हस्ताक्षर`)}
                </button>
              </div>
            )}
            {otpSent && (
              <div className="otp-box">
                <label htmlFor="tray-otp" className="small">
                  {tx("Token provider: PROXKey (demo) · Certificate: DSC of the office (demo) · Passcode (demo: any 6 digits, e.g. 123456)", "टोकन प्रदाता: PROXKey (डेमो) · प्रमाणपत्र: कार्यालय का DSC (डेमो) · पासकोड (डेमो: कोई भी 6 अंक, जैसे 123456)")}
                </label>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <input id="tray-otp" type="password" className="input mono" inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && sign()} />
                  <button className="btn blue" disabled={busy || otp.length !== 6} onClick={sign} id="tray-sign-btn">
                    {busy ? <span className="spinner" /> : "✍"} {tx("Sign PDFs", "PDF पर हस्ताक्षर")}
                  </button>
                  <button className="btn secondary" disabled={busy} onClick={() => (setOtpSent(false), setOtp(""), setErr(null))}>
                    {tx("Back", "वापस")}
                  </button>
                </div>
              </div>
            )}
            {err && <div className="error-box small">{err}</div>}
          </>
        )}
      </div>
    </div>
  );
}
