import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { CaseBundle, CitizenMessage, DecisionResponse, I18n, QueueItem, Role } from "../api/types";
import { Bi, CATEGORY_LABEL, ErrorBox, fmtDate, Kbd, LaneChip, Loading, maskIds, SERVICE_ICON, slaDaysLeft, STATUS_LABEL, Tick, useAsync } from "../components/common";
import VerdictCard from "../components/VerdictCard";
import NativeVillageAction, { nativeSearchOffered } from "../components/NativeVillageAction";
import LineageCard, { type DisposeTarget } from "../components/LineageCard";
import ActionPanel, { PATWARI_EVENT } from "../components/ActionPanel";
import WhatsAppPreview from "../components/WhatsAppPreview";
import AgentTrace from "../components/AgentTrace";
import { SearchFamilyIllustration } from "../illustrations";
import { DESK_LABEL, setDesk, useDesk } from "../desk";

interface LastDecision {
  app_id: string;
  name: I18n;
  status: string;
  msg: CitizenMessage;
}

const enc = encodeURIComponent;

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT" || el.isContentEditable);
}

export default function CaseView() {
  const { appId: raw = "" } = useParams();
  const appId = decodeURIComponent(raw);
  const { t, tx, lang, role: ctxRole, setRole, presenter, shadow } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const { data, error, loading, setData, reload } = useAsync<CaseBundle>(() => api.getCase(appId, (ctxRole as Role) ?? "sdo"), [appId]);
  const [active, setActive] = useState<DisposeTarget | null>(null);
  const openedAt = useRef(Date.now());
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [order, setOrder] = useState<QueueItem[] | null>(null);
  const [help, setHelp] = useState(false);
  const [last, setLast] = useState<LastDecision | null>(((loc.state as { last?: LastDecision } | null)?.last) ?? null);
  const [showMsg, setShowMsg] = useState(false);
  const [note, setNote] = useState<string | null>(((loc.state as { note?: string } | null)?.note) ?? null);
  // Round 6 (P1): the family record on screen; C / N act on exactly this record
  const [viewIdx, setViewIdx] = useState(0);
  const desk = useDesk();

  const role: Role = data?.application.routed_to === "tehsildar" ? "tehsildar" : "sdo";
  useEffect(() => {
    if (data && ctxRole !== role) setRole(role); // role pill follows the case being decided
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, !!data]);

  useEffect(() => {
    window.scrollTo(0, 0); // every case opens at the top, also on auto-advance with cached data
    openedAt.current = Date.now();
    setActive(null);
    setResult(null);
    setLast(((loc.state as { last?: LastDecision } | null)?.last) ?? null);
    setNote(((loc.state as { note?: string } | null)?.note) ?? null);
    try {
      sessionStorage.setItem("ps_last_case", appId);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  // queue order snapshot (taken when the case opens, so "next" is stable after the decision)
  useEffect(() => {
    if (!data) return;
    let alive = true;
    api
      .queue(role)
      .then((q) => alive && setOrder(q))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, role, !!data]);

  const { nextId, prevId } = useMemo(() => {
    if (!order) return { nextId: null as string | null, prevId: null as string | null };
    const ids = order.map((q) => q.application.app_id);
    const i = ids.indexOf(appId);
    const after = order.slice(i + 1).concat(i < 0 ? [] : order.slice(0, i));
    const next = after.find((q) => q.application.status === "pending" && q.application.app_id !== appId);
    return { nextId: next?.application.app_id ?? null, prevId: i > 0 ? ids[i - 1] : null };
  }, [order, appId]);

  const go = useCallback(
    (id: string | null, state?: unknown) => {
      if (id) nav(`/officer/case/${enc(id)}`, { state });
      else nav(`/officer?role=${role}`, { state });
    },
    [nav, role],
  );

  const an = data?.analysis;
  const app = data?.application;
  const status = result?.application.status ?? app?.status ?? "pending";
  const decided = status !== "pending";
  const confirmed = useMemo(() => new Set(an?.confirmed_cert_nos ?? []), [an]);
  const accepted = useMemo(() => new Set(an?.accepted_cert_nos ?? []), [an]);
  // Round 6 (P2): the backend's list of records awaiting "same family / not this family" (the same gate the queue uses)
  const pendingMatch =
    (an?.pending_cert_nos
      ? an.lineage_matches.find((m) => an.pending_cert_nos!.includes(m.certificate.cert_no) && !m.disposition)
      : an?.lineage_matches.find((m) => m.usable_as_evidence && !accepted.has(m.certificate.cert_no) && !m.disposition)) ?? null;
  // Round 6 (P2): a file of another SDO sub-division opened on this desk: read-only, forward it
  const otherDesk = !!(app && an?.subdivision && app.routed_to === "sdo" && an.subdivision.en !== desk && app.status === "pending");

  const officer = an?.office?.en;
  const dispose = useCallback(
    async (certNo: string, decision: "same" | "not", grounds: string[], note: string) => {
      const upd =
        decision === "same"
          ? await api.confirmRelationship(appId, certNo, role, grounds, note || undefined, officer)
          : await api.rejectMatch(appId, certNo, grounds, note || undefined, role, officer);
      setActive(null);
      setData(upd);
    },
    [appId, role, setData, officer],
  );
  const clearDisp = useCallback(
    async (certNo: string) => {
      const upd = await api.clearMatch(appId, certNo, role, officer);
      setData(upd);
    },
    [appId, role, setData, officer],
  );
  // the record the case opens on: the found usable match, else the first record still needing a disposition
  const undisposedMatch = an?.lineage_matches.find((m) => an.disposition_required?.includes(m.certificate.cert_no)) ?? null;
  const firstTodo = pendingMatch ?? undisposedMatch ?? an?.lineage_matches.find((m) => !m.disposition) ?? null;
  const matchCount = an?.lineage_matches.length ?? 0;
  const firstTodoIdx = firstTodo && an ? Math.max(0, an.lineage_matches.indexOf(firstTodo)) : 0;
  // open each case on its first open record (once per case; later the officer's own choice of tab is kept)
  const openedOn = useRef<string | null>(null);
  useEffect(() => {
    if (!an || openedOn.current === appId) return;
    openedOn.current = appId;
    setViewIdx(firstTodoIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, !!an]);
  const shown = an ? (an.lineage_matches[Math.min(viewIdx, Math.max(0, matchCount - 1))] ?? null) : null;
  // Round 6 (P1): the keyboard acts on the record ON SCREEN — never on another tab
  const keyTarget = an?.competence?.ok === false || otherDesk ? null : shown;
  const keyAllowed = (m: typeof shown, decision: "same" | "not") => {
    if (!m || m.disposition) return false;
    if (decision === "same" && m.declared && !m.kendra_attached && accepted.has(m.certificate.cert_no)) return false; // declared & matched: nothing to confirm
    return true;
  };
  const switchView = useCallback(
    (delta: number) => {
      if (matchCount < 2) return false;
      const next = viewIdx + delta;
      if (next < 0 || next >= matchCount) return false;
      setViewIdx(next);
      setTimeout(() => (document.querySelector(`[data-match-tab="${next}"]`) as HTMLElement | null)?.focus({ preventScroll: true }), 0);
      return true;
    },
    [matchCount, viewIdx],
  );
  const startDispose = useCallback(
    (decision: "same" | "not", certNo?: string) => {
      const no = certNo ?? keyTarget?.certificate.cert_no;
      if (!no) return;
      setActive({ cert_no: no, decision });
      setTimeout(() => document.getElementById("confirm-row")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0);
    },
    [keyTarget],
  );
  const flashRow = () => {
    const el = document.getElementById("confirm-row");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.classList.remove("flash");
    void el?.offsetWidth;
    el?.classList.add("flash");
  };

  function decidedCb(r: DecisionResponse, autoNext: boolean) {
    if (r.document_kind === "show_cause") {
      // the file now waits for the applicant's reply: reload so the panel shows the notice and the reply simulation
      setLast({ app_id: r.application.app_id, name: r.application.applicant_name, status: r.application.status, msg: r.citizen_message });
      reload();
      return;
    }
    if (autoNext && nextId && app) {
      go(nextId, { last: { app_id: app.app_id, name: app.applicant_name, status: r.application.status, msg: r.citizen_message } satisfies LastDecision });
    } else {
      // Round 5 (P0-1): stay on the file — the result and the citizen message are shown at the top
      setResult(r);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  }

  // global keys: J/K next/prev, C confirm, ? help
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === "Escape") {
        setHelp(false);
        setShowMsg(false);
        setActive(null);
        return;
      }
      if (k === "?") {
        e.preventDefault();
        setHelp((h) => !h);
        return;
      }
      if (document.querySelector(".modal-bg") || document.querySelector(".grounds-pop")) return; // a dialog is open: its own keys apply
      // Round 6: switch the record on screen (←/→ anywhere; Tab / Shift+Tab from the page or the record tabs, leaving
      // the tab strip normally at either end so the keyboard is never trapped)
      const onTabs = !document.activeElement || document.activeElement === document.body || !!(document.activeElement as HTMLElement).closest?.(".match-tabs");
      if ((k === "ArrowRight" || k === "ArrowLeft") && !e.shiftKey && matchCount > 1 && !decided && !otherDesk) {
        if (switchView(k === "ArrowRight" ? 1 : -1)) e.preventDefault();
        return;
      }
      if (k === "Tab" && onTabs && matchCount > 1 && !decided && !otherDesk) {
        if (switchView(e.shiftKey ? -1 : 1)) e.preventDefault();
        return;
      }
      if (k === "j" || k === "J") {
        e.preventDefault();
        go(nextId);
      } else if (k === "k" || k === "K") {
        e.preventDefault();
        if (prevId) go(prevId);
      } else if ((k === "c" || k === "C" || k === "n" || k === "N") && keyTarget && !decided) {
        const decision = k === "c" || k === "C" ? "same" : "not";
        e.preventDefault();
        if (keyAllowed(keyTarget, decision)) startDispose(decision);
        else flashRow(); // already recorded (Undo first) or nothing to confirm on this record: show it, change nothing
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, nextId, prevId, keyTarget, decided, startDispose, switchView, matchCount, otherDesk]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data || !app || !an) return null;
  const days = slaDaysLeft(app.sla_due);
  const infoFlags = an.flags.filter((f) => f.severity !== "attention");

  const sideRecords = an.evidence_rows;
  const stripMock = (x: string) => x.replace(/\s*\((mock|नमूना|मॉक)\)/gi, "");

  const canPatwari = !decided && app.status === "pending" && (an.refer_options ?? []).some((o) => o.code === "patwari") && an.competence?.ok !== false && !otherDesk;

  return (
    <div className={`case-page ${shadow ? "is-shadow" : ""}`}>
      {note && !last && (
        <div className="toast" role="status">
          <span>{note}</span>
          <span className="spacer" />
          <Link to={`/officer?role=${role}`} className="btn secondary sm">
            {tx("Open the sign tray", "हस्ताक्षर ट्रे खोलें")}
          </Link>
          <button className="toast-x" aria-label={tx("Dismiss", "बंद करें")} onClick={() => setNote(null)}>
            ×
          </button>
        </div>
      )}
      {last && (
        <div className="toast" role="status">
          <span>
            ✓ {t(STATUS_LABEL[last.status])} · <b>{t(last.name)}</b> <span className="mono small">{last.app_id}</span> · {tx("citizen message sent", "नागरिक को संदेश भेजा")}
          </span>
          <span className="spacer" />
          <button className="btn secondary sm" onClick={() => setShowMsg(true)}>
            {tx("View message", "संदेश देखें")}
          </button>
          <button className="btn secondary sm" onClick={() => go(last.app_id)} title={tx("Open the decided case: view the issued text or call it back within 10 minutes", "निर्णीत प्रकरण खोलें: जारी पाठ देखें या 10 मिनट में वापस लें")}>
            {tx("View order · Call back (10 min)", "आदेश देखें · वापस लें (10 मिनट)")}
          </button>
          <button className="toast-x" aria-label={tx("Dismiss", "बंद करें")} onClick={() => setLast(null)}>
            ×
          </button>
        </div>
      )}

      <section className={`case-band lane-${shadow && !decided ? "shadow" : an.lane}`} aria-label={tx("Case", "प्रकरण")}>
        <div className="band-nav">
          <Link to={`/officer?role=${role}`} className="btn secondary sm" title={tx("Back to the queue", "कतार पर लौटें")}>
            ← {tx("Queue", "कतार")}
          </Link>
          <button className="btn secondary sm icon" disabled={!prevId} onClick={() => go(prevId)} title={tx("Previous (K)", "पिछला (K)")} aria-label={tx("Previous case", "पिछला प्रकरण")}>
            ‹ <Kbd k="K" />
          </button>
          <button className="btn secondary sm icon" onClick={() => go(nextId)} title={tx("Next (J)", "अगला (J)")} aria-label={nextId ? tx("Next case", "अगला प्रकरण") : tx("Queue", "कतार")}>
            <Kbd k="J" /> ›
          </button>
        </div>
        <img className="svc-ico" src={SERVICE_ICON[app.service]} alt="" />
        <div className="band-main">
          <h1>
            <Bi v={app.applicant_name} inline />
          </h1>
          <div className="case-meta">
            <span className="mono">{app.app_id}</span>
            <span>·</span>
            <span>{t(app.service_label)}</span>
            <span>·</span>
            <span>{t(app.purpose)}</span>
          </div>
        </div>
        <span className={`pill sla ${days <= 3 ? "amber" : "outline"}`} title={fmtDate(app.sla_due, lang)}>
          {days <= 3 ? "⏰" : "⏱"} {days < 0 ? tx(`${-days} days overdue`, `${-days} दिन विलंब`) : `${days} ${tx("days left", "दिन शेष")}`}
        </span>
        {decided && <span className="pill">{t(STATUS_LABEL[status])}</span>}
        <Link to={`/sewasetu/case/${enc(app.app_id)}`} className="btn secondary sm embed-link" title={tx("The same file as it would appear inside the Sewa Setu officer console", "यही फ़ाइल सेवा सेतु अधिकारी कंसोल के भीतर")}>
          {tx("View as embedded in Sewa Setu", "सेवा सेतु में एम्बेडेड देखें")}
        </Link>
        {shadow && !decided ? (
          <span className="lane-chip shadow lg" title={tx("Shadow mode: the tool's lane appears after your decision", "शैडो मोड: उपकरण की श्रेणी आपके निर्णय के बाद दिखेगी")}>
            {tx("Shadow · check after decision", "शैडो · निर्णय के बाद जांच")}
          </span>
        ) : (
          <LaneChip lane={an.lane} large title={t(an.lane_reason)} />
        )}
        <button className="btn secondary sm icon" onClick={() => setHelp(true)} title={tx("Keyboard shortcuts", "कीबोर्ड शॉर्टकट")} aria-label={tx("Keyboard shortcuts", "कीबोर्ड शॉर्टकट")}>
          <Kbd k="?" />
        </button>
      </section>
      {presenter && app.persona_note && (
        <div className="persona">
          🎬 {tx("Presenter note", "प्रस्तुतकर्ता टिप्पणी")}: {t(app.persona_note)}
        </div>
      )}

      <div className="case-grid">
        <div className="case-center stack">
          {result && (
            <section className="card decided-msg" id="decided-msg">
              <div className="card-title">
                {tx("Message sent to the citizen", "नागरिक को भेजा गया संदेश")}
                <span className="spacer" />
                <span className="small muted">
                  {tx("Logged in the audit trail with what the screen showed", "स्क्रीन पर दिखी जानकारी सहित ऑडिट में दर्ज")} · {new Date(result.audit.ts).toLocaleTimeString(lang === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              </div>
              <WhatsAppPreview msg={result.citizen_message} />
            </section>
          )}

          {otherDesk && an.subdivision && (
            <section className="card competence-banner" role="alert" id="desk-banner">
              <b>{tx(`Belongs to ${an.subdivision.office.en} — forward`, `${an.subdivision.office.hi} की फ़ाइल — अग्रेषित करें`)}</b> —{" "}
              {tx(
                `Tehsil ${app.tehsil.en} is in the ${an.subdivision.en} sub-division, not your desk (${DESK_LABEL[desk]?.en ?? desk}). Read-only here; it cannot enter your sign tray.`,
                `तहसील ${app.tehsil.hi} ${an.subdivision.hi} अनुविभाग में है, आपके डेस्क (${DESK_LABEL[desk]?.hi ?? desk}) में नहीं। यहाँ केवल पठन; यह आपकी हस्ताक्षर ट्रे में नहीं जा सकती।`,
              )}{" "}
              <button className="linkish" id="switch-desk" onClick={() => setDesk(an.subdivision!.en)}>
                {tx(`Switch to the ${an.subdivision.en} desk (demo)`, `${an.subdivision.hi} डेस्क पर जाएं (डेमो)`)}
              </button>
            </section>
          )}
          {an.competence && !an.competence.ok && !decided && (
            <section className="card competence-banner" role="alert" id="competence-banner">
              {/^(Not your competence|आपकी सक्षमता नहीं)/.test(t(an.competence.message)) ? t(an.competence.message) : <><b>{tx("Not your competence", "आपकी सक्षमता नहीं")}</b> — {t(an.competence.message)}</>}
            </section>
          )}
          <VerdictCard
            app={app}
            analysis={an}
            status={status}
            shadow={shadow && !decided}
            nativeAction={!otherDesk && !shadow && nativeSearchOffered(app, an, status) ? <NativeVillageAction app={app} analysis={an} role={role} onBundle={setData} /> : undefined}
          />

          {an.lineage_matches.length > 0 ? (
            <LineageCard
              key={app.app_id}
              app={app}
              analysis={an}
              matches={an.lineage_matches}
              confirmed={confirmed}
              accepted={accepted}
              decided={decided || status !== "pending" || an.competence?.ok === false || otherDesk}
              evidenceRows={an.evidence_rows}
              active={active}
              setActive={setActive}
              onDispose={dispose}
              onClear={clearDisp}
              idx={Math.min(viewIdx, Math.max(0, matchCount - 1))}
              setIdx={setViewIdx}
              keysLive={!!keyTarget && !decided}
            />
          ) : (
            <section className="card tight no-rec">
              <SearchFamilyIllustration size={56} className="no-shrink" />
              <p className="small">
                {tx(
                  "Many genuine applicants are the first in their family to apply, or moved from another district. Examine the documents exactly as today.",
                  "कई वास्तविक आवेदक परिवार में पहली बार आवेदन करते हैं या दूसरे जिले से आए हैं। दस्तावेज़ों की जांच आज की तरह ही करें।",
                )}
              </p>
            </section>
          )}

          {infoFlags.length > 0 && (
            <details className="card tight info-flags">
              <summary>
                {tx(`Other notes (${infoFlags.length})`, `अन्य टिप्पणियाँ (${infoFlags.length})`)}: {infoFlags.map((f) => t(f.title)).join(" · ")}
              </summary>
              <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                {infoFlags.map((f) => (
                  <div key={f.code + (f.cert_nos?.[0] ?? "")} className="flag info">
                    <span className="ico">i</span>
                    <div>
                      <h4>{t(f.title)}</h4>
                      <p>{t(f.explanation)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <aside className="case-side stack">
          {/* Round 8b: what the system did for this file (collapsed, one line); hidden in shadow mode until decided */}
          {!(shadow && !decided) && <AgentTrace trace={an.trace} decided={decided} />}
          <section className="card tight">
            <div className="card-title">{tx("Application — compare against", "आवेदन — जिससे मिलाना है")}</div>
            <dl className="kv">
              <dt>{tx("Father", "पिता")}</dt>
              <dd>
                {t(app.father_name)}
                <span className="kv-alt">{lang === "hi" ? app.father_name.en : app.father_name.hi}</span>
              </dd>
              <dt>{tx("Mother", "माता")}</dt>
              <dd>{t(app.mother_name)}</dd>
              <dt>{tx("Village", "गांव")}</dt>
              <dd>
                {t(app.village)} · {t(app.tehsil)}
                <span className="kv-alt">LGD {app.village_lgd}</span>
              </dd>
              <dt>{tx("Born", "जन्म")}</dt>
              <dd>
                {app.birth_year} · {app.gender === "F" ? tx("female", "महिला") : tx("male", "पुरुष")}
              </dd>
              {app.claimed_category && (
                <>
                  <dt>{tx("Claim", "दावा")}</dt>
                  <dd>
                    {t(CATEGORY_LABEL[app.claimed_category])}
                    {app.claimed_caste ? ` · ${t(app.claimed_caste)}` : ""}
                  </dd>
                </>
              )}
              <dt>{tx("Kendra", "केंद्र")}</dt>
              <dd>
                {t(app.kendra)} · {fmtDate(app.submitted_at, lang)}
              </dd>
              {(app.sendback_count ?? 0) > 0 && (
                <>
                  <dt>{tx("Sent back", "वापस")}</dt>
                  <dd>{tx(`${app.sendback_count} time(s) before`, `पहले ${app.sendback_count} बार`)}</dd>
                </>
              )}
            </dl>
          </section>
          {canPatwari && (
            <section className="card tight patwari-card">
              <div className="card-title">{tx("Field report", "क्षेत्र प्रतिवेदन")}</div>
              <p className="small muted" style={{ marginBottom: 6 }}>
                {tx(
                  `Pre-fills a vanshavali form for ${an.patwari_form ? t(an.patwari_form.halka.label) : "the Halka Patwari"} from the archive and the ration roster; ${an.patwari_form?.days ?? 7}-day timer.`,
                  `अभिलेखागार व राशन सूची से वंशावली प्रपत्र पूर्व-भरित — ${an.patwari_form ? t(an.patwari_form.halka.label) : "हल्का पटवारी"}; ${an.patwari_form?.days ?? 7} दिन की समय-सीमा।`,
                )}
              </p>
              <button className="btn secondary sm" id="patwari-request" onClick={() => window.dispatchEvent(new CustomEvent(PATWARI_EVENT))}>
                {tx("Request Patwari report (R)", "पटवारी प्रतिवेदन मांगें (R)")}
              </button>
            </section>
          )}
          <section className="card tight">
            <div className="card-title">{tx("Documents checklist", "दस्तावेज़ सूची")}</div>
            <ul className="check-list">
              {an.checklist.map((c) => (
                <li key={c.code}>
                  {c.state ? <span className={`tick ${c.state === "blocked" ? "no" : "neutral"}`}>{c.state === "blocked" ? "!" : "–"}</span> : <Tick ok={c.present} neutral={!c.present && !c.required} />}
                  <span>
                    {t(c.label)}
                    {c.satisfied_by && <span className="sat">✓ {t(c.satisfied_by)}</span>}
                    {c.note && <span className={`sat ${c.state === "blocked" ? "warn" : "muted"}`}>{t(c.note)}</span>}
                    {!c.present && c.required && !c.note && <span className="sat warn">{tx("not uploaded", "अपलोड नहीं")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {sideRecords.length > 0 && (
            <details className="card tight side-records">
              <summary>
                {tx(`Other records (${sideRecords.length})`, `अन्य अभिलेख (${sideRecords.length})`)} <span className="pill slate">{tx("sample source", "नमूना स्रोत")}</span>
              </summary>
              {sideRecords.map((e, i) => (
                <div key={i} className="ev-row">
                  <Tick ok={e.status === "ok"} neutral={e.status !== "ok"} />
                  <div>
                    <div className="ev-src">
                      {stripMock(t(e.source))} · {t(e.field)}
                    </div>
                    <div style={{ fontWeight: 600 }}>{maskIds(t(e.value))}</div>
                    {e.note && <div className="small muted">{t(e.note)}</div>}
                  </div>
                </div>
              ))}
              <p className="small muted" style={{ marginTop: 6 }}>
                {tx("Seen, not relied upon: the order lists them as corroborative only.", "देखे गए, आधार नहीं: आदेश में केवल पुष्टिकारक के रूप में दर्ज।")}
              </p>
            </details>
          )}
          {presenter && (
            <details className="tech small muted card tight">
              <summary>{tx("Technical details", "तकनीकी विवरण")}</summary>
              {tx("Model", "मॉडल")} {an.model_version} · {tx("rules", "नियम")} {an.rules_version} · {tx("office code", "कार्यालय कोड")} {an.office_info?.code}
              <div>{tx("Sub-division mapping and the s.5 appellate authority: [verify with the Revenue Department]", "अनुविभाग मानचित्रण एवं धारा 5 अपीलीय अधिकारी: [राजस्व विभाग से सत्यापित करें]")}</div>
            </details>
          )}
        </aside>
      </div>

      <ActionPanel
        key={app.app_id}
        app={app}
        analysis={an}
        role={role}
        result={result}
        onDecided={decidedCb}
        relationshipOpen={!!(pendingMatch && !decided && !pendingMatch.disposition)}
        otherDesk={otherDesk ? an.subdivision : null}
        onRoutedDesk={() =>
          nav(`/officer?role=sdo`, {
            state: { note: tx(`${app.app_id} forwarded to ${an.subdivision?.office.en ?? "its own desk"} (logged in the audit).`, `${app.app_id} ${an.subdivision?.office.hi ?? "संबंधित डेस्क"} को अग्रेषित (ऑडिट में दर्ज)।`) },
          })
        }
        onShowRelationship={() => {
          // Round 6: show the record that blocks signing (the first one awaiting your decision), then flash its row
          const todo = pendingMatch ?? undisposedMatch;
          if (todo) setViewIdx(Math.max(0, an.lineage_matches.indexOf(todo)));
          setTimeout(flashRow, 0);
        }}
        onNext={() => go(nextId)}
        hasNext={!!nextId}
        onBundle={(b) => {
          setResult(null);
          setData(b);
        }}
        onCalledBack={() => {
          setResult(null);
          reload();
        }}
        secondsOnScreen={() => (Date.now() - openedAt.current) / 1000}
        onTrayAdded={(n) => {
          const msg = tx(`${app.app_id} saved to the sign tray (${n}/5) — sign them together with one DSC token passcode from the queue.`, `${app.app_id} हस्ताक्षर ट्रे में (${n}/5) — कतार से एक DSC टोकन पासकोड से सभी पर हस्ताक्षर करें।`);
          if (nextId && n < 5) nav(`/officer/case/${enc(nextId)}`, { state: { note: msg } });
          else nav(`/officer?role=${role}`, { state: { note: msg, openTray: n >= 5 } });
        }}
        onForwarded={(b) => {
          nav(`/officer?role=tehsildar`, { state: { note: tx(`${b.application.app_id} forwarded to ${b.analysis.office.en} (logged in the audit).`, `${b.application.app_id} ${b.analysis.office.hi} को अग्रेषित (ऑडिट में दर्ज)।`) } });
        }}
      />

      {help && (
        <div className="modal-bg" onClick={() => setHelp(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 id="help-title">{tx("Keyboard shortcuts", "कीबोर्ड शॉर्टकट")}</h2>
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt><Kbd k="J" /> / <Kbd k="K" /></dt>
              <dd>{tx("Next / previous case (queue order)", "अगला / पिछला प्रकरण (कतार क्रम)")}</dd>
              <dt><Kbd k="C" /></dt>
              <dd>{tx("Same family — for the record shown (with your grounds)", "वही परिवार — दिखाए गए अभिलेख हेतु (आपके आधार सहित)")}</dd>
              <dt><Kbd k="N" /></dt>
              <dd>{tx("Not this family — for the record shown (with your grounds)", "यह परिवार नहीं — दिखाए गए अभिलेख हेतु (आपके आधार सहित)")}</dd>
              <dt><Kbd k="←" /> <Kbd k="→" /> / <Kbd k="Tab" /></dt>
              <dd>{tx("Several family records: switch the record shown (C / N follow it)", "कई पारिवारिक अभिलेख: दिखाया गया अभिलेख बदलें (C / N उसी पर)")}</dd>
              <dt><Kbd k="A" /> <Kbd k="S" /> <Kbd k="R" /> <Kbd k="X" /></dt>
              <dd>{tx("Choose Approve / Send back / Refer / Reject", "स्वीकृत / वापस / संदर्भित / अस्वीकृत चुनें")}</dd>
              <dt><Kbd k="Space" /></dt>
              <dd>{tx("In the order sheet: read on (page down), then tick", "आदेश पत्र में: आगे पढ़ें (पृष्ठ नीचे), फिर टिक")}</dd>
              <dt><Kbd k="Ctrl+↵" /></dt>
              <dd>{tx("Sign (opens the confirmation)", "हस्ताक्षर (पुष्टि खोलता है)")}</dd>
              <dt><Kbd k="↵" /></dt>
              <dd>{tx("In the confirmation: sign with the DSC token / send", "पुष्टि में: DSC टोकन से हस्ताक्षर / भेजें")}</dd>
              <dt><Kbd k="Ctrl+S" /></dt>
              <dd>{tx("In the order sheet (records-complete files): save & add to the sign tray (max 5, one token passcode)", "आदेश पत्र में (अभिलेख-पूर्ण फ़ाइलें): सहेजें व हस्ताक्षर ट्रे में (अधिकतम 5, एक टोकन पासकोड)")}</dd>
              <dt><Kbd k="Esc" /></dt>
              <dd>{tx("Close", "बंद करें")}</dd>
              <dt><Kbd k="?" /></dt>
              <dd>{tx("This help", "यह सहायता")}</dd>
            </dl>
            <p className="small muted" style={{ marginTop: 12 }}>
              {tx("Keys are ignored while you type in a text box.", "टेक्स्ट बॉक्स में टाइप करते समय कुंजियाँ निष्क्रिय रहती हैं।")}
            </p>
            <p className="small" style={{ marginTop: 8 }}>
              {tx(
                "In Sewa Setu: Approve = Approve · Send back = Sendback (to the applicant) · Refer = Sendback (to the Patwari / Committee, applicant informed) · Reject = hearing notice → Reject.",
                "सेवा सेतु में: स्वीकृत = Approve · वापस भेजें = Sendback (आवेदक को) · संदर्भित = Sendback (पटवारी/समिति को, आवेदक को सूचना सहित) · अस्वीकृत = सुनवाई सूचना → Reject।",
              )}
            </p>
          </div>
        </div>
      )}
      {showMsg && last && (
        <div className="modal-bg" onClick={() => setShowMsg(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <WhatsAppPreview msg={last.msg} />
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn secondary" onClick={() => setShowMsg(false)} autoFocus>
                {tx("Close", "बंद करें")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
