/**
 * Round 4 (P0-A1): the same file as it would look INSIDE the Sewa Setu officer console, recreated (simplified) from a
 * public walkthrough of the Sewa Setu Government Login (YouTube, Aug 2026; see research/07_sewasetu_officer_side.md):
 * blue sidebar, session-timeout bar, dashboard counters, pending list with red/yellow/green SLA dots, 📎 count and two
 * due dates; application view with five pill tabs that get a ✓ once opened; the decision panel (radios
 * अस्वीकृत / आवेदक को वापस भेजें / अनुमोदित, a 200-character remark, an upload row pdf/jpg/png ≤ 256 KB, सबमिट / बंद);
 * signing with a DSC token (Token provider / Certificate / Passcode / Sign PDF) and the "निर्णय की पुष्टि" confirmation.
 * Praman Setu docks as a collapsible side panel and fills the (empty in the walkthrough) "निर्णय / जांच सूची" checklist.
 * Revenue-officer specifics are illustrative. No Sewa Setu logo; all styling is under .ss-* for easy restyling.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Monogram from "../components/Monogram";
import { api, ApiError } from "../api/client";
import { useI18n } from "../i18n";
import type { Analysis, Application, CaseBundle, DecisionAction, DecisionResponse, I18n, Lang, OfficeInfo, QueueItem, Role } from "../api/types";
import { CATEGORY_LABEL, ErrorBox, fmtDate, Loading, slaDaysLeft, STATUS_LABEL, todayDMY, useAsync } from "../components/common";
import VerdictCard from "../components/VerdictCard";
import NativeVillageAction, { nativeSearchOffered } from "../components/NativeVillageAction";
import { SignModal, ToolCheckReveal } from "../components/ActionPanel";
import { insertFinding, noticeDraft } from "../components/orderText";
import WhatsAppPreview from "../components/WhatsAppPreview";
import DemoLinks from "../components/DemoLinks";
import { DESK_LABEL, useDesk } from "../desk";
import { GroundsPop } from "../components/LineageCard";

const enc = encodeURIComponent;
type Tab = "applicant" | "form" | "docs" | "decision" | "history";
type Native = "reject" | "send_back" | "approve";
const REMARK_MAX = 200;

// ------------------------------------------------------------------ helpers
/** Synthetic last digits from a hash of the application number (Round 5: never the application number's own digits). */
function synthDigits(appId: string, salt: string, n = 4): string {
  let h = 2166136261;
  for (const ch of salt + appId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return String(h % 10 ** n).padStart(n, "0");
}
/** Aadhaar is never shown in full (DPDP): synthetic last 4 digits. */
function maskedAadhaar(appId: string): string {
  return `XXXX XXXX ${synthDigits(appId, "uid")}`;
}
function minusDays(iso: string, n: number): string {
  const d = new Date(Date.parse(iso.slice(0, 10)) - n * 86400000);
  return d.toISOString().slice(0, 10);
}
/** Round 5 (P1-6): dots and the dashboard counters use the same clock — the officer's due date — and the same
 *  window: red = past it, yellow = due within the next 2 days, green = later. */
const NEAR_DAYS = 2;
function slaDot(days: number): "red" | "yellow" | "green" {
  return days < 0 ? "red" : days <= NEAR_DAYS ? "yellow" : "green";
}
const officerDaysLeft = (a: Application) => slaDaysLeft(minusDays(a.sla_due, 4));

/** The order the console itself would carry from the officer's remark (used when no Praman draft is attached). */
function nativeOrder(app: Application, info: OfficeInfo | undefined, action: "approve" | "show_cause" | "reject", remarks: string): I18n {
  const off = info?.office ?? { en: "SDO (Revenue)", hi: "अनुविभागीय अधिकारी (राजस्व)" };
  const place = info?.place ?? app.tehsil;
  const rel = app.gender === "F" ? ["daughter of", "पुत्री"] : ["son of", "पुत्र"];
  const r = remarks.trim();
  const op: Record<string, [string, string]> = {
    approve: [`ORDER: The application is ALLOWED and ${app.service_label.en} is issued to the applicant.`, `आदेश: आवेदन स्वीकार किया जाता है तथा आवेदक को ${app.service_label.hi} जारी किया जाता है।`],
    show_cause: [`Before any rejection the applicant is given an opportunity of hearing: reply within 15 days on the above grounds.`, `अस्वीकृति से पूर्व आवेदक को सुनवाई का अवसर: उपर्युक्त आधारों पर 15 दिवस के भीतर उत्तर दें।`],
    reject: [`ORDER: For the reasons above the application is REJECTED. An appeal lies under section 5 within 30 days to the Appellate Authority.`, `आदेश: उपर्युक्त कारणों से आवेदन अस्वीकार किया जाता है। धारा 5 के अंतर्गत 30 दिन में अपीलीय अधिकारी के समक्ष अपील की जा सकती है।`],
  };
  const head: Record<string, [string, string]> = {
    approve: ["DRAFT ORDER — remark of the officer", "आदेश का प्रारूप — अधिकारी की टिप्पणी"],
    show_cause: ["PRE-REJECTION NOTICE (OPPORTUNITY OF HEARING) — remark of the officer", "पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर) का प्रारूप — अधिकारी की टिप्पणी"],
    reject: ["DRAFT ORDER — remark of the officer", "आदेश का प्रारूप — अधिकारी की टिप्पणी"],
  };
  return {
    en: `${head[action][0]}\nOffice of the ${off.en}\n\nIn the matter of Application No. ${app.app_id}, received ${fmtDate(app.submitted_at)} via ${app.kendra.en}\nApplicant: ${app.applicant_name.en}, ${rel[0]} ${app.father_name.en}, village ${app.village.en} (LGD ${app.village_lgd}), district ${app.district.en}\nService: ${app.service_label.en}\n\nRemark of the undersigned:\n${r || "On examination of the documents on file."}\n\n${op[action][0]}\n\nPlace: ${place.en}        Date: ${todayDMY()}\n${off.en}\n(digital signature — DSC)`,
    hi: `${head[action][1]}\nकार्यालय ${off.hi}\n\nविषय: आवेदन क्र. ${app.app_id}, प्राप्ति दिनांक ${fmtDate(app.submitted_at)}, ${app.kendra.hi} के माध्यम से\nआवेदक: ${app.applicant_name.hi}, ${rel[1]} ${app.father_name.hi}, ग्राम ${app.village.hi} (एलजीडी ${app.village_lgd}), जिला ${app.district.hi}\nसेवा: ${app.service_label.hi}\n\nअधोहस्ताक्षरी की टिप्पणी:\n${r || "संलग्न दस्तावेज़ों के परीक्षण के आधार पर।"}\n\n${op[action][1]}\n\nस्थान: ${place.hi}        दिनांक: ${todayDMY()}\n${off.hi}\n(डिजिटल हस्ताक्षर — DSC)`,
  };
}

/** ≤ 200-character remark summarising the reasoned order (the full order goes in as the PDF attachment). */
function remarkSummary(an: Analysis, lang: Lang): string {
  const acc = an.lineage_matches.find((m) => an.accepted_cert_nos.includes(m.certificate.cert_no));
  let s: string;
  if (acc) {
    s =
      lang === "hi"
        ? `अभिलेख पूर्ण: ${acc.relation_label.hi} का स्थायी प्रमाण पत्र ${acc.certificate.cert_no} (नियम 3(3)) मान्य; विवरण मेल खाते हैं। तर्कसंगत आदेश संलग्न।`
        : `Records complete: ${acc.relation_label.en.toLowerCase()}'s permanent certificate ${acc.certificate.cert_no} (Rule 3(3)) valid; particulars agree. Reasoned order attached.`;
  } else {
    s = lang === "hi" ? "संलग्न दस्तावेज़ों के परीक्षण पर तर्कसंगत आदेश संलग्न।" : "Reasoned order on the documents on file attached.";
  }
  return s.slice(0, REMARK_MAX);
}

// ------------------------------------------------------------------ shell
function Shell({ children, active }: { children: ReactNode; active: "dash" | "case" }) {
  const { tx, lang, setLang, shadow, setShadow } = useI18n();
  const [sp, setSp] = useSearchParams();
  const down = sp.get("down") === "1";
  const [left, setLeft] = useState(300);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 300)), 1000);
    return () => clearInterval(id);
  }, []);
  const setDown = (v: boolean) => {
    const n = new URLSearchParams(sp);
    if (v) n.set("down", "1");
    else n.delete("down");
    setSp(n, { replace: true });
  };
  const qs = down ? "?down=1" : "";
  const side: [string, string, string | null][] = [
    ["डैशबोर्ड", "Dashboard", `/sewasetu${qs}`],
    ["मेरी सेवाएँ", "My services", null],
    ["लॉगिन उपयोग रिपोर्ट", "Login usage report", null],
    ["एलएसजी अधिनियम लंबित अधिसूचना", "LSG Act pending notices", null],
    ["एलएसजी अधिनियम कारण बताओ अधिसूचना", "LSG Act show-cause notices (to officers, for delay)", null],
    ["स्वतः शिकायत डैशबोर्ड", "Auto-grievance dashboard", null],
    ["शिकायत अधिसूचना", "Grievance notices", null],
  ];
  return (
    <div className="ss-console" lang={lang}>
      <aside className="ss-side" aria-label={tx("Console menu (mock)", "कंसोल मेनू (मॉक)")}>
        <div className="ss-side-brand">
          <Monogram text="SS" size={34} bg="#F5F0E6" fg="#134a9c" />
          <span>{tx("Sewa Setu (mock)", "सेवा सेतु (मॉक)")}</span>
        </div>
        {side.map(([hi, en, to]) =>
          to ? (
            <Link key={en} to={to} className={`ss-side-item ${active === "dash" ? "on" : ""}`}>
              {tx(en, hi)}
            </Link>
          ) : (
            <span key={en} className="ss-side-item muted" title={tx("Not part of this demo", "इस डेमो में नहीं")}>
              {tx(en, hi)}
            </span>
          ),
        )}
      </aside>
      <div className="ss-main">
        <header className="ss-header">
          <span className="ss-home" aria-hidden="true">⌂</span>
          <span className="ss-timeout">
            {tx("Session TimeOut (In Minute)", "सत्र समाप्ति (मिनट)")} {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
          </span>
          <span className="spacer" />
          <span className="ss-user">{tx("Government login · SDO (Revenue), Kondagaon", "शासकीय लॉगिन · अनुविभागीय अधिकारी (राजस्व), कोंडागांव")}</span>
          <div className="lang-toggle ss-lang" role="group" aria-label={tx("Language", "भाषा")}>
            <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")} aria-pressed={lang === "hi"}>
              हिंदी
            </button>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
              EN
            </button>
          </div>
          <details className="ss-demo" id="ss-demo">
            <summary>{tx("Demo ▾", "डेमो ▾")}</summary>
            <DemoLinks onPick={() => document.getElementById("ss-demo")?.removeAttribute("open")} />
          </details>
          <Link to="/officer?role=sdo" className="ss-exit">
            {tx("Praman full view", "प्रमाण पूर्ण दृश्य")} ↗
          </Link>
        </header>
        <div className="ss-mocknote" role="note" id="ss-mocknote">
          {tx(
            "Recreated from a public walkthrough of the Sewa Setu officer console (Aug 2026) — simplified mock; revenue-officer specifics illustrative.",
            "सेवा सेतु अधिकारी कंसोल के सार्वजनिक वॉकथ्रू (अगस्त 2026) से पुनर्निर्मित — सरलीकृत मॉक; राजस्व-अधिकारी विवरण उदाहरणात्मक।",
          )}
        </div>
        <div className="ss-strip" role="note">
          <span>{tx("Proposed integration: Praman docks beside the console · hosted in the State Data Centre · no external API", "प्रस्तावित एकीकरण: प्रमाण कंसोल के बगल में जुड़ता है · राज्य डेटा केंद्र (SDC) में · कोई बाहरी API नहीं")}</span>
          <span className="spacer" />
          <label className="ss-toggle">
            <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} id="ss-shadow" />
            {tx("Pilot phase 1 · shadow mode", "पायलट चरण 1 · शैडो मोड")}
          </label>
          <label className="ss-toggle">
            <input type="checkbox" checked={down} onChange={(e) => setDown(e.target.checked)} id="ss-down" />
            {tx("Simulate: Praman service unavailable", "अनुकरण: प्रमाण सेवा उपलब्ध नहीं")}
          </label>
        </div>
        {children}
        <footer className="ss-footer">
          {tx(
            "Hackathon demo · simplified recreation, not the real Sewa Setu · not an official Government portal · synthetic citizen data",
            "हैकाथॉन डेमो · सरलीकृत पुनर्निर्माण, वास्तविक सेवा सेतु नहीं · आधिकारिक शासकीय पोर्टल नहीं · नागरिक डेटा सिंथेटिक",
          )}
        </footer>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ dashboard + pending list
export function SewaSetuDashboard() {
  const { t, tx, shadow } = useI18n();
  const [sp] = useSearchParams();
  const down = sp.get("down") === "1";
  const nav = useNavigate();
  const desk = useDesk();
  const { data, error, loading } = useAsync<QueueItem[]>(() => api.queue("sdo"), [desk]);
  const [urgent, setUrgent] = useState(false);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const all = data ?? [];
  const pending = all.filter((q) => q.application.status === "pending");
  const count = (s: string) => all.filter((q) => q.application.status === s).length;
  const tiles: [string, string, number][] = [
    ["लंबित", "Pending", pending.length],
    ["अनुमोदित", "Approved", count("approved")],
    ["अस्वीकृत आवेदन", "Rejected", count("rejected")],
    ["वापस", "Sent back", count("sent_back")],
    ["अग्रेषित", "Forwarded", count("referred") + count("awaiting_patwari")],
    ["खारिज", "Dismissed", 0],
    ["समय सीमा के बाद (लंबित)", "Pending past time limit", pending.filter((q) => officerDaysLeft(q.application) < 0).length],
    ["आगामी दो दिवस में समय सीमा में आने वाले आवेदन", "Due in the next 2 days", pending.filter((q) => { const d = officerDaysLeft(q.application); return d >= 0 && d <= NEAR_DAYS; }).length],
    ["विशेष मामले", "Special cases", 0],
  ];
  const praman = !down && !shadow;
  const rows = urgent
    ? [...pending].sort((a, b) => a.sla_days_left - b.sla_days_left || a.evidence_rank - b.evidence_rank)
    : [...pending].sort((a, b) => a.application.app_id.localeCompare(b.application.app_id));
  const qs = down ? "?down=1" : "";
  return (
    <Shell active="dash">
      <div className="ss-dash">
        <div className="ss-tiles">
          {tiles.map(([hi, en, n]) => (
            <div key={en} className="ss-tile">
              <b>{n}</b>
              <span>{tx(en, hi)}</span>
            </div>
          ))}
        </div>
        <section className="ss-card">
          <div className="ss-card-head">
            <b>{tx("SC/ST and OBC caste certificate — list of pending applications", "अनुसूचित जाति / जनजाति व अ.पि.व. प्रमाण पत्र — लंबित आवेदन की सूची")}</b>
            <span className="small muted" id="ss-desk-label">· {t(DESK_LABEL[desk] ?? { en: desk, hi: desk })}</span>
            <span className="spacer" />
            <span className="ss-legend">
              <i className="ss-dot red" /> {tx("Due date passed", "नियत तिथि समाप्त")} <i className="ss-dot yellow" /> {tx("Near due date (≤ 2 days)", "नियत तिथि के करीब (≤ 2 दिन)")} <i className="ss-dot green" /> {tx("Within due date", "नियत तिथि के भीतर")} <span className="small muted">· {tx("officer's due date", "अधिकारी की समय सीमा")}</span>
            </span>
          </div>
          {praman && (
            <label className="ss-toggle ss-sort">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} id="ss-urgent" />
              {tx("Praman: sort by urgency", "प्रमाण: तात्कालिकता से क्रम")}
            </label>
          )}
          <div className="ss-tablewrap">
            <table className="ss-table" id="ss-pending">
              <thead>
                <tr>
                  <th>{tx("No.", "क्रमांक")}</th>
                  <th>{tx("Status", "स्थिति")}</th>
                  <th>{tx("Application ref. no.", "आवेदक संदर्भ क्रमांक")}</th>
                  <th>{tx("Attachments", "संलग्नक")}</th>
                  <th>{tx("Applicant", "आवेदक")}</th>
                  <th>{tx("Applied on", "आवेदन तारीख")}</th>
                  <th>{tx("Officer's due date", "अधिकारी की समय सीमा")}</th>
                  <th>{tx("Application due date", "आवेदन की समय सीमा")}</th>
                  {praman && <th className="ss-praman-col">{tx("Family proof (Praman)", "परिवार प्रमाण (प्रमाण)")}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((q, i) => {
                  const a = q.application;
                  const offDue = minusDays(a.sla_due, 4);
                  return (
                    <tr key={a.app_id} className="click" onClick={() => nav(`/sewasetu/case/${enc(a.app_id)}${qs}`)}>
                      <td>{i + 1}</td>
                      <td>
                        <i className={`ss-dot ${slaDot(slaDaysLeft(offDue))}`} title={tx(`${slaDaysLeft(offDue)} days to the officer's due date`, `अधिकारी की समय सीमा में ${slaDaysLeft(offDue)} दिन`)} />
                      </td>
                      <td>
                        <span className="ss-pill mono">{a.app_id}</span>
                      </td>
                      <td>📎 ({a.documents.filter((d) => d.uploaded).length})</td>
                      <td>{t(a.applicant_name)}</td>
                      <td>{fmtDate(a.submitted_at)}</td>
                      <td>{fmtDate(offDue)}</td>
                      <td>{fmtDate(a.sla_due)}</td>
                      {praman && (
                        <td className="ss-praman-col">
                          <span className={`ss-chip ${q.lane === "records_complete" ? "ok" : q.lane === "needs_attention" ? "warn" : ""}`}>{t(q.next_step ?? q.evidence_summary)}</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="small muted" style={{ padding: "6px 10px" }}>
            {tx(`Showing 1 to ${rows.length} of ${rows.length} entries`, `${rows.length} में से 1 से ${rows.length} प्रविष्टियाँ`)}
            {praman ? tx(" · Praman adds only one column and an optional urgency sort", " · प्रमाण केवल एक कॉलम व वैकल्पिक तात्कालिकता-क्रम जोड़ता है") : ""}
          </div>
        </section>
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------------ application view
export default function SewaSetuConsole() {
  const { appId: raw = "" } = useParams();
  const appId = decodeURIComponent(raw);
  const [sp] = useSearchParams();
  const { t, tx, lang, shadow, presenter, setRole } = useI18n();
  const { data, error, loading, setData, reload } = useAsync<CaseBundle>(() => api.getCase(appId), [appId]);
  const [tab, setTab] = useState<Tab>("applicant");
  const [seen, setSeen] = useState<Set<Tab>>(new Set(["applicant"]));
  const [collapsed, setCollapsed] = useState(false);
  const down = sp.get("down") === "1";
  const [choice, setChoice] = useState<Native | null>(null);
  const [remarks, setRemarks] = useState("");
  const [attached, setAttached] = useState<{ name: string; kb: number; text: I18n } | null>(null);
  const [pending, setPending] = useState<{ action: DecisionAction; text: I18n; system: I18n; native: boolean } | null>(null);
  const [token, setToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const openedAt = useRef(Date.now());
  const inflight = useRef(false);
  const desk = useDesk();
  const navTo = useNavigate();

  useEffect(() => {
    openedAt.current = Date.now();
    setRemarks("");
    setAttached(null);
    setChoice(null);
    setResult(null);
    setErr(null);
    setTab("applicant");
    setSeen(new Set(["applicant"]));
    window.scrollTo(0, 0);
  }, [appId]);

  const app = data?.application;
  const an = data?.analysis;
  useEffect(() => {
    if (app) setRole(app.routed_to === "tehsildar" ? "tehsildar" : "sdo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.routed_to]);

  const status = result?.application.status ?? app?.status ?? "pending";
  const decided = status !== "pending" && status !== "show_cause_issued";
  const panelVisible = !down && !collapsed && !shadow;
  const draftReady = useMemo(() => {
    if (!an) return null;
    if (an.competence && !an.competence.ok) return null;
    if (an.lane !== "records_complete" || an.suggested_action !== "approve" || an.finding_required?.approve || an.disposition_required?.length || an.evidence_required) return null;
    // Round 6: one gate for "ready" (backend); another sub-division's file, or an OBC approval that needs the
    // creamy-layer finding, is decided in the full evidence view, not with the one-click draft
    if (an.ready_to_sign === false || an.creamy_layer?.required) return null;
    if (app?.routed_to === "sdo" && an.subdivision && an.subdivision.en !== desk) return null;
    return an.drafts?.approve ?? an.draft_order;
  }, [an, app?.routed_to, desk]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!app || !an) return null;
  // Round 6 (P2): another SDO sub-division's file opened on this desk — read-only, forward it
  const deskWrong = app.routed_to === "sdo" && !!an.subdivision && an.subdivision.en !== desk && app.status === "pending";
  const misrouted = (!!an.competence && !an.competence.ok) || deskWrong;
  const docs = app.documents.filter((d) => d.uploaded);
  const offDue = minusDays(app.sla_due, 4);

  function open(k: Tab) {
    setTab(k);
    setSeen((s) => new Set([...s, k]));
  }
  function insertDraft() {
    if (!draftReady || !an || !app) return;
    setRemarks(remarkSummary(an, lang));
    const kb = Math.max(18, Math.round(new Blob([draftReady.hi + draftReady.en]).size / 1024) + 14);
    setAttached({ name: `praman_order_${app.app_id.slice(-5)}.pdf`, kb, text: draftReady });
    open("decision");
  }

  function submit() {
    if (!app || !an || !choice) return;
    setErr(null);
    const r = remarks.trim();
    if (choice === "approve") {
      if (attached) setPending({ action: "approve", text: attached.text, system: attached.text, native: false });
      else {
        const text = nativeOrder(app, an.office_info, "approve", r);
        setPending({ action: "approve", text, system: text, native: true });
      }
    } else if (choice === "send_back") {
      if (!r) return setErr(tx("Write in the remark what the applicant must add.", "टिप्पणी में लिखें कि आवेदक को क्या जोड़ना है।"));
      const text = noticeDraft(app, an.office_info, [{ en: r, hi: r }], todayDMY());
      setPending({ action: "send_back", text, system: text, native: true });
    } else {
      if (r.length < 15) return setErr(tx("Reject needs your grounds in the remark (at least 15 characters). The applicant is heard first.", "अस्वीकृति हेतु टिप्पणी में आधार लिखें (न्यूनतम 15 अक्षर)। पहले आवेदक को सुना जाएगा।"));
      const heard = !!an.show_cause?.reply;
      const action: DecisionAction = heard ? "reject" : "show_cause";
      const base = !down ? (heard ? an.drafts?.reject : an.drafts?.show_cause) : null;
      const text = base ? insertFinding(base, r) : nativeOrder(app, an.office_info, heard ? "reject" : "show_cause", r);
      setPending({ action, text, system: base || text, native: true });
    }
  }

  async function sign(passcode?: string) {
    if (!pending || !app || !an || inflight.current) return;
    if (passcode !== undefined && !/^\d{6}$/.test(passcode)) return setErr(tx("Enter the 6-digit token passcode (demo: any 6 digits).", "6 अंकों का टोकन पासकोड दर्ज करें (डेमो: कोई भी 6 अंक)।"));
    inflight.current = true;
    setBusy(true);
    setErr(null);
    try {
      const r = remarks.trim();
      const res = await api.decision(
        app.app_id,
        {
          action: pending.action,
          officer_name: an.office.en,
          order_text: pending.text,
          system_text: pending.system,
          findings: pending.action === "approve" && !pending.native ? undefined : r || undefined,
          deficiency_codes: pending.action === "send_back" ? [] : undefined,
          custom_deficiency: pending.action === "send_back" ? r : undefined,
          time_on_screen_s: Math.round((Date.now() - openedAt.current) / 100) / 10,
          read_confirmed: true,
          channel: "sewasetu_native",
          tool_visible: panelVisible,
          shadow,
        },
        app.routed_to,
      );
      setPending(null);
      setToken(false);
      if (res.document_kind === "show_cause") {
        setResult(null);
        reload();
      } else {
        setResult(res);
      }
      setConfirmOpen(true);
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  // approve and a final reject are signed with the DSC token; notices go out on submit
  const needsToken = (a: DecisionAction) => a === "approve" || a === "reject";

  async function forward() {
    if (!app || !an) return;
    try {
      const b = await api.forward(app.app_id, an.office.en);
      setData(b);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }

  const tabs: [Tab, string][] = [
    ["applicant", tx("Applicant details", "आवेदक का विवरण")],
    ["form", tx("Application form", "आवेदन पत्र")],
    ["docs", tx(`Supporting documents (${docs.length})`, `सहायक दस्तावेज (${docs.length})`)],
    ["decision", tx("Decision / checklist", "निर्णय / जांच सूची")],
    ["history", tx("Previous decisions", "पूर्व निर्णय")],
  ];
  const qs = down ? "?down=1" : "";

  return (
    <Shell active="case">
      <div className={`ss-body ${collapsed ? "collapsed" : ""}`}>
        <main className="ss-native" aria-label={tx("Sewa Setu application screen (mock)", "सेवा सेतु आवेदन स्क्रीन (मॉक)")}>
          <div className="ss-appbar">
            <Link to={`/sewasetu${qs}`} className="ss-back">
              ← {tx("Pending list", "लंबित सूची")}
            </Link>
            <span className="ss-appno mono">{app.app_id}</span>
            <span className="ss-apptitle">
              {t(app.applicant_name)} · {t(app.service_label)}
            </span>
            <span className="spacer" />
            <span className="ss-chip">{t(STATUS_LABEL[status])}</span>
            <span className={`ss-chip ${slaDaysLeft(offDue) <= 3 ? "warn" : ""}`}>
              {tx("Officer's due date", "अधिकारी की समय सीमा")}: {fmtDate(offDue)}
            </span>
          </div>
          <div className="ss-tabs" role="tablist">
            {tabs.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={`${tab === k ? "on" : ""} ${k === "decision" && panelVisible ? "praman" : ""}`} onClick={() => open(k)} id={`ss-tab-${k}`}>
                {seen.has(k) && <span className="ss-tick">✓</span>} {l}
              </button>
            ))}
          </div>
          <div className="ss-tabbody">
            {tab === "applicant" && (
              <>
                <div className="ss-sec">{tx("Applicant's data", "आवेदक का डेटा")}</div>
                <table className="ss-form">
                  <tbody>
                    <tr>
                      <th>{tx("Name", "नाम")}</th>
                      <td>{t(app.applicant_name)}</td>
                      <th>{tx("Application date", "आवेदन तारीख")}</th>
                      <td>{fmtDate(app.submitted_at)}</td>
                    </tr>
                    <tr>
                      <th>{tx("Aadhaar card number", "आधार कार्ड नंबर")}</th>
                      <td className="mono" id="ss-aadhaar">
                        {maskedAadhaar(app.app_id)} <span className="small muted">({tx("masked", "छिपाया गया")})</span>
                      </td>
                      <th>{tx("Mobile", "मोबाइल")}</th>
                      <td className="mono">••••••{synthDigits(app.app_id, "mob")}</td>
                    </tr>
                    <tr>
                      <th>{tx("Guardian", "अभिभावक")}</th>
                      <td>{t(app.father_name)}</td>
                      <th>{tx("Gender / year of birth", "लिंग / जन्म वर्ष")}</th>
                      <td>
                        {app.gender === "F" ? tx("Female", "महिला") : tx("Male", "पुरुष")} / {app.birth_year}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="ss-sec">{tx("Applicant's location", "आवेदक का स्थान")}</div>
                <table className="ss-form">
                  <tbody>
                    <tr>
                      <th>{tx("District", "जिला")}</th>
                      <td>{t(app.district)}</td>
                      <th>{tx("Tehsil", "तहसील")}</th>
                      <td>{t(app.tehsil)}</td>
                    </tr>
                    <tr>
                      <th>{tx("Village (LGD)", "ग्राम (एलजीडी)")}</th>
                      <td>
                        {t(app.village)} ({app.village_lgd})
                      </td>
                      <th>{tx("Kendra", "केंद्र")}</th>
                      <td>{t(app.kendra)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
            {tab === "form" && (
              <table className="ss-form">
                <tbody>
                  <tr>
                    <th>{tx("Father's name", "पिता का नाम")}</th>
                    <td>{t(app.father_name)}</td>
                    <th>{tx("Mother's name", "माता का नाम")}</th>
                    <td>{t(app.mother_name)}</td>
                  </tr>
                  <tr>
                    <th>{tx("Category claimed", "दावा किया वर्ग")}</th>
                    <td>{app.claimed_category ? `${t(CATEGORY_LABEL[app.claimed_category])}${app.claimed_caste ? " · " + t(app.claimed_caste) : ""}` : "—"}</td>
                    <th>{tx("Purpose", "प्रयोजन")}</th>
                    <td>{t(app.purpose)}</td>
                  </tr>
                  <tr>
                    <th>{tx("Family certificate No. (declared)", "पारिवारिक प्रमाण पत्र क्र. (घोषित)")}</th>
                    <td className="mono">{app.declared_relative_cert_no ?? "—"}</td>
                    <th>{tx("Service", "सेवा")}</th>
                    <td>{t(app.service_label)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {tab === "docs" && (
              <div className="ss-docs-wrap">
                {viewer !== null && docs[viewer] && (
                  <div className="ss-viewer" aria-label={tx("Document viewer", "दस्तावेज़ दर्शक")}>
                    <div className="ss-scan">
                      <span>
                        <b>{t(docs[viewer].label)}</b>
                        <br />
                        {tx("Scanned upload — demo placeholder (synthetic applicant; no real scan)", "अपलोड स्कैन — डेमो प्लेसहोल्डर (सिंथेटिक आवेदक; वास्तविक स्कैन नहीं)")}
                      </span>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                      <button className="ss-btn" onClick={() => setViewer((v) => ((v ?? 0) > 0 ? (v ?? 0) - 1 : docs.length - 1))} aria-label={tx("Previous", "पिछला")}>
                        ‹
                      </button>
                      <span className="small">
                        {viewer + 1} / {docs.length}
                      </span>
                      <button className="ss-btn" onClick={() => setViewer((v) => ((v ?? 0) + 1) % docs.length)} aria-label={tx("Next", "अगला")}>
                        ›
                      </button>
                    </div>
                  </div>
                )}
                <div className="ss-docs">
                  {docs.map((d, i) => (
                    <button key={d.code} className={`ss-doc ${viewer === i ? "on" : ""}`} onClick={() => setViewer(i)} title={t(d.label)}>
                      <span className="ss-thumb" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="ss-doc-l">{t(d.label).split(" (")[0]}</span>
                      <span className="small muted">⊕ {tx("view", "देखें")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "history" && (
              <ol className="ss-history">
                <li>
                  {fmtDate(app.submitted_at)} — {tx(`Submitted at ${app.kendra.en}`, `${app.kendra.hi} पर जमा`)}
                </li>
                <li>
                  {fmtDate(app.submitted_at)} — {tx(`Routed to ${an.office.en}`, `${an.office.hi} को प्रेषित`)}
                </li>
                {(app.sendback_count ?? 0) > 0 && <li>{tx(`Sent back ${app.sendback_count} time(s) before`, `पहले ${app.sendback_count} बार वापस`)}</li>}
                {an.show_cause && (
                  <li>
                    {an.show_cause.date} — {tx(`Pre-rejection hearing notice ${an.show_cause.no}`, `पूर्व-अस्वीकृति सुनवाई सूचना ${an.show_cause.no}`)}
                  </li>
                )}
                {result && (
                  <li>
                    {todayDMY()} — {t(STATUS_LABEL[status])} · {result.document_no}
                  </li>
                )}
              </ol>
            )}
            {tab === "decision" && (
              <div className="ss-decision">
                <section className="ss-checklist" aria-label={tx("Checklist", "जांच सूची")}>
                  <div className="ss-sec">
                    {tx("Checklist", "जांच सूची")}{" "}
                    {panelVisible ? <span className="ss-chip ok">{tx("filled by Praman Setu", "प्रमाण सेतु द्वारा भरी गई")}</span> : <span className="ss-chip">{tx("empty — work as usual", "खाली — सामान्य रूप से कार्य करें")}</span>}
                  </div>
                  {panelVisible ? (
                    <ul className="ss-checks" id="ss-checks">
                      {an.checklist.map((c) => (
                        <li key={c.code}>
                          <span className={`ss-ck ${c.present ? "ok" : c.required && !c.state ? "no" : ""}`}>{c.present ? "✓" : c.required && !c.state ? "!" : "–"}</span> {t(c.label).split(" (")[0]}
                          {c.satisfied_by && <span className="small muted"> — {t(c.satisfied_by)}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="small muted">
                      {shadow ? tx("Shadow mode: the records check appears after your decision.", "शैडो मोड: अभिलेख जांच आपके निर्णय के बाद दिखेगी।") : tx("No checklist content (as in the console today).", "जांच सूची में कोई सामग्री नहीं (आज के कंसोल की तरह)।")}
                    </p>
                  )}
                </section>
                {!decided && !misrouted && (
                  <div className="ss-dec-grid">
                    <section className="ss-card">
                      <div className="ss-card-head">
                        <b>{tx("Decision", "निर्णय")}</b>
                      </div>
                      <div className="ss-radios" role="radiogroup">
                        {(
                          [
                            ["reject", tx("Reject", "अस्वीकृत")],
                            ["send_back", tx("Send back to applicant", "आवेदक को वापस भेजें")],
                            ["approve", tx("Approve", "अनुमोदित (स्वीकृत)")],
                          ] as [Native, string][]
                        ).map(([k, l]) => (
                          <label key={k} className={`ss-radio ${choice === k ? "on" : ""}`}>
                            <input type="radio" name="ss-choice" checked={choice === k} disabled={status === "show_cause_issued"} onChange={() => setChoice(k)} id={`ss-r-${k}`} /> {l}
                          </label>
                        ))}
                      </div>
                      {choice === "reject" && !an.show_cause?.reply && (
                        <p className="small ss-note">
                          {tx(
                            "Praman safeguard: before a rejection, a pre-rejection notice (opportunity of hearing, 15 days) goes to the applicant; the final Reject follows the reply.",
                            "प्रमाण सुरक्षा-चरण: अस्वीकृति से पहले आवेदक को पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर, 15 दिन); अंतिम अस्वीकृति उत्तर के बाद।",
                          )}
                        </p>
                      )}
                      <label htmlFor="ss-remarks" className="ss-lbl">
                        {tx("Remark", "टिप्पणी")} <span className="small muted">({tx("add new remark", "नई टिप्पणी जोड़ें")})</span>
                      </label>
                      <textarea id="ss-remarks" className="textarea" maxLength={REMARK_MAX} value={remarks} onChange={(e) => setRemarks(e.target.value.slice(0, REMARK_MAX))} rows={3} placeholder={tx("Remark…", "टिप्पणी…")} />
                      <div className="small muted" id="ss-count">
                        {remarks.length}/{REMARK_MAX} {tx("characters (maximum 200)", "अक्षर (अधिकतम 200 अक्षर)")}
                      </div>
                    </section>
                    <section className="ss-card">
                      <div className="ss-card-head">
                        <b>{tx("Document upload", "दस्तावेज़ अपलोड")}</b>
                      </div>
                      <table className="ss-table small">
                        <thead>
                          <tr>
                            <th>{tx("Attachment name", "संलग्नक का नाम")}</th>
                            <th>{tx("File", "फ़ाइल")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attached ? (
                            <tr id="ss-attached">
                              <td>{tx("Reasoned order (Praman draft)", "तर्कसंगत आदेश (प्रमाण प्रारूप)")}</td>
                              <td className="mono">
                                {attached.name} · {attached.kb} KB{" "}
                                <button className="linkish" onClick={() => setAttached(null)} aria-label={tx("Remove", "हटाएं")}>
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={2} className="muted">
                                {tx("Browse file… (none)", "फ़ाइल चुनें… (कोई नहीं)")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <ol className="small muted ss-rules">
                        <li>{tx("Only .jpeg / .jpg / .png / .pdf supporting documents.", "केवल .jpeg / .jpg / .png / .pdf सहायक दस्तावेज़।")}</li>
                        <li>{tx("File size not more than 256 KB.", "फ़ाइल का आकार 256 KB से अधिक नहीं।")}</li>
                      </ol>
                    </section>
                  </div>
                )}
              </div>
            )}
          </div>

          {err && (
            <div className="error-box small" style={{ margin: "0 12px" }}>
              {err}
            </div>
          )}
          {result && (
            <div className="ss-done" role="status" id="ss-done">
              <b>
                ✓ {t(STATUS_LABEL[status])} · {result.document_no}
              </b>{" "}
              ·{" "}
              {status === "approved"
                ? tx("signed with the DSC token (simulated) · certificate with QR pushed to DigiLocker", "DSC टोकन से हस्ताक्षरित (डेमो) · QR सहित प्रमाण पत्र DigiLocker में")
                : tx("issued (simulated); the applicant is informed", "जारी (डेमो); आवेदक को सूचना")}
              <div style={{ marginTop: 8, maxWidth: 440 }}>
                <WhatsAppPreview msg={result.citizen_message} />
              </div>
            </div>
          )}
          {decided && !result && (
            <div className="ss-done" role="status">
              {tx(`Decision recorded: ${STATUS_LABEL[status]?.en ?? status}. The issued text and call-back are in the full view.`, `निर्णय दर्ज: ${STATUS_LABEL[status]?.hi ?? status}। जारी पाठ व वापस लेना पूर्ण दृश्य में।`)}
            </div>
          )}
          {status === "show_cause_issued" && !result && (
            <div className="ss-done warn" role="status">
              {tx(
                `Pre-rejection hearing notice ${an.show_cause?.no ?? ""} issued · reply due ${an.show_cause?.reply_due ?? ""}. The final Reject comes after the reply.`,
                `पूर्व-अस्वीकृति सुनवाई सूचना ${an.show_cause?.no ?? ""} जारी · उत्तर देय ${an.show_cause?.reply_due ?? ""}। अंतिम अस्वीकृति उत्तर के बाद।`,
              )}
            </div>
          )}

          <div className="ss-actions" aria-label={tx("Console actions", "कंसोल कार्यवाही")}>
            {deskWrong && !decided && an.subdivision ? (
              <>
                <span className="ss-warn" id="ss-desk-warn">
                  {tx(`Belongs to ${an.subdivision.office.en} — forward (tehsil ${app.tehsil.en}); not your sub-division, your sign tray refuses it.`, `${an.subdivision.office.hi} की फ़ाइल — अग्रेषित करें (तहसील ${app.tehsil.hi}); आपका अनुविभाग नहीं, आपकी हस्ताक्षर ट्रे इसे नहीं लेगी।`)}
                </span>
                <button
                  className="ss-btn primary"
                  id="ss-route-desk"
                  onClick={() =>
                    api
                      .routeDesk(app.app_id, an.office.en)
                      .then(() => navTo(`/sewasetu${qs}`))
                      .catch((e) => setErr(String((e as Error).message ?? e)))
                  }
                >
                  {tx("Forward", "अग्रेषित करें")} → {t(an.subdivision.office)}
                </button>
              </>
            ) : misrouted && !decided ? (
              <>
                <span className="ss-warn">{t(an.competence?.message)}</span>
                <button className="ss-btn primary" onClick={forward} id="ss-forward">
                  {tx("Forward", "अग्रेषित करें")} → {t(an.competence?.forward_label)}
                </button>
              </>
            ) : decided ? (
              <Link className="ss-btn primary" to={`/sewasetu${qs}`} id="ss-back-list">
                ← {tx("Back to the pending list", "लंबित सूची पर लौटें")}
              </Link>
            ) : tab !== "decision" ? (
              <button className="ss-btn primary" onClick={() => open("decision")} disabled={decided} id="ss-go-decision">
                {tx("Go to Decision / checklist →", "निर्णय / जांच सूची पर जाएं →")}
              </button>
            ) : (
              <>
                <button className="ss-btn approve" disabled={decided || !choice || status === "show_cause_issued"} onClick={submit} id="ss-submit">
                  ✔ {tx("Submit", "सबमिट")}
                </button>
                <Link className="ss-btn reject" to={`/sewasetu${qs}`}>
                  ✖ {tx("Close", "बंद")}
                </Link>
                <span className="small muted">{tx("Approve / final Reject: order preview → SIGN WITH TOKEN", "अनुमोदित / अंतिम अस्वीकृति: आदेश पूर्वावलोकन → SIGN WITH TOKEN")}</span>
              </>
            )}
          </div>
        </main>

        <aside className={`ss-panel ${down ? "down" : ""}`} aria-label={tx("Praman Setu panel", "प्रमाण सेतु पैनल")}>
          {collapsed ? (
            <button className="ss-panel-tab" onClick={() => setCollapsed(false)} id="ss-expand" title={tx("Open the Praman panel", "प्रमाण पैनल खोलें")}>
              ⟩ {tx("Family proof · Praman", "परिवार प्रमाण · प्रमाण")}
            </button>
          ) : (
            <>
              <div className="ss-panel-head">
                <b>{tx("Family proof · Praman Setu", "परिवार प्रमाण · प्रमाण सेतु")}</b>
                <span className="spacer" />
                <button className="btn secondary sm" onClick={() => setCollapsed(true)} id="ss-collapse" title={tx("Close the panel", "पैनल बंद करें")}>
                  ⟨ {tx("Close panel", "पैनल बंद करें")}
                </button>
              </div>
              {down ? (
                <div className="ss-panel-down" role="status" id="ss-panel-down">
                  <b>{tx("Praman Setu is not available right now — work as usual.", "प्रमाण सेतु अभी उपलब्ध नहीं — सामान्य रूप से कार्य करें।")}</b>
                  <p className="small">{tx("The console's own tabs, documents and decision panel keep working. Nothing waits on the panel.", "कंसोल के अपने टैब, दस्तावेज़ और निर्णय पैनल चलते रहते हैं। कुछ भी पैनल पर निर्भर नहीं।")}</p>
                </div>
              ) : shadow && !decided ? (
                <div className="ss-panel-shadow" role="status" id="ss-panel-shadow">
                  <b>{tx("Shadow mode (pilot phase 1)", "शैडो मोड (पायलट चरण 1)")}</b>
                  <p className="small">{tx("The records check runs silently. It appears here after you submit your decision, for comparison.", "अभिलेख जांच चुपचाप चलती है। निर्णय सबमिट करने के बाद तुलना हेतु यहाँ दिखेगी।")}</p>
                </div>
              ) : (
                <div className="ss-panel-body">
                  {shadow && result?.tool_check && <ToolCheckReveal appId={app.app_id} check={result.tool_check} action={result.audit.action.replace(/^decision_/, "")} />}
                  {misrouted && <div className="competence-banner card small">{deskWrong && an.subdivision ? tx(`Belongs to ${an.subdivision.office.en} — forward`, `${an.subdivision.office.hi} की फ़ाइल — अग्रेषित करें`) : t(an.competence?.message)}</div>}
                  <VerdictCard
                    app={app}
                    analysis={an}
                    status={status}
                    compact
                    jobAction={!decided && status === "pending" && !misrouted ? <PanelDecide an={an} appId={app.app_id} role={app.routed_to} onBundle={setData} /> : undefined}
                    nativeAction={!misrouted && nativeSearchOffered(app, an, status) ? <NativeVillageAction app={app} analysis={an} role={app.routed_to} onBundle={setData} compact /> : undefined}
                  />
                  <PanelMatches an={an} />
                  {!decided && (
                    <div className="ss-draft">
                      <button className="btn blue sm" disabled={!draftReady} onClick={insertDraft} id="ss-insert-draft">
                        {tx("Use this draft: ≤200-char remark + order as PDF", "यह प्रारूप उपयोग करें: ≤200 अक्षर टिप्पणी + आदेश PDF में")}
                      </button>
                      {!draftReady && (
                        <span className="small muted">
                          {an.disposition_required?.length || an.lineage_matches.some((m) => m.usable_as_evidence && !an.accepted_cert_nos.includes(m.certificate.cert_no) && !m.disposition)
                            ? tx("Decide the relationship above first; the draft is then ready.", "पहले ऊपर संबंध तय करें; फिर प्रारूप तैयार होगा।")
                            : tx("This file needs a step first (pick proof / verify a point) — use the full evidence view.", "इस फ़ाइल में पहले एक चरण आवश्यक (प्रमाण चयन / बिंदु सत्यापन) — पूर्ण साक्ष्य दृश्य देखें।")}
                        </span>
                      )}
                      <Link className="small" to={`/officer/case/${enc(app.app_id)}`}>
                        {tx("Open the full evidence view →", "पूर्ण साक्ष्य दृश्य खोलें →")}
                      </Link>
                    </div>
                  )}
                  {presenter && (
                    <p className="small muted ss-icd">
                      ICD: webhook <span className="mono">application.received</span> → <span className="mono">GET /evidence/{"{app_id}"}</span> → {tx("panel + checklist tab", "पैनल + जांच सूची टैब")}; <span className="mono">POST /draft</span> →{" "}
                      {tx(
                        "remark (≤200) + PDF upload (≤256 KB). Read-only on the archive; no write-back except the officer's own action.",
                        "टिप्पणी (≤200) + PDF अपलोड (≤256 KB)। अभिलेखागार केवल-पठन; अधिकारी की अपनी कार्यवाही के अलावा कोई लेखन नहीं।",
                      )}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {pending &&
        !token &&
        createPortal(
          <SignModal
            action={pending.action}
            app={app}
            analysis={an}
            text={pending.text}
            systemBase={pending.system}
            finding={remarks.trim()}
            busy={busy}
            err={err}
            autoNext={false}
            setAutoNext={() => undefined}
            onCancel={() => setPending(null)}
            onSign={() => (needsToken(pending.action) ? setToken(true) : sign())}
            signLabel={needsToken(pending.action) ? "SIGN WITH TOKEN" : pending.action === "send_back" ? tx("Submit: send back to applicant", "सबमिट: आवेदक को वापस") : tx("Submit: issue hearing notice", "सबमिट: सुनवाई सूचना जारी करें")}
          />,
          document.body,
        )}
      {pending && token && <TokenModal busy={busy} err={err} onCancel={() => setToken(false)} onSign={(p) => sign(p)} />}
      {confirmOpen && (result || status === "show_cause_issued") && (
        <div className="modal-bg" onClick={() => setConfirmOpen(false)}>
          <div className="modal ss-confirm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} id="ss-confirm">
            <h2>{tx("Decision confirmed", "निर्णय की पुष्टि")}</h2>
            <p style={{ textAlign: "center", fontSize: 19, marginTop: 8 }}>✓ {status === "approved" ? tx("Application approved", "आवेदन अनुमोदित") : t(STATUS_LABEL[status])}</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
              <button className="ss-btn primary" onClick={() => setConfirmOpen(false)} autoFocus>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/** DSC token signing (as in the console walkthrough): declaration · Token provider · Certificate · Passcode → Sign PDF. */
function TokenModal({ busy, err, onCancel, onSign }: { busy: boolean; err: string | null; onCancel: () => void; onSign: (passcode: string) => void }) {
  const { tx } = useI18n();
  const [pass, setPass] = useState("");
  const [decl, setDecl] = useState(false);
  return (
    <div className="modal-bg" onClick={() => !busy && onCancel()}>
      <div className="modal ss-token" role="dialog" aria-modal="true" aria-labelledby="ss-token-title" onClick={(e) => e.stopPropagation()} id="ss-token">
        <h2 id="ss-token-title">SIGN WITH TOKEN</h2>
        <label className="ss-decl">
          <input type="checkbox" checked={decl} onChange={(e) => setDecl(e.target.checked)} id="ss-decl" />
          <span>
            {tx(
              "I declare that the above certificate is as per the information given by the applicant — and cross-checked against the records listed in the attached order.",
              "मैं घोषणा करता हूँ कि उपरोक्त प्रमाण पत्र आवेदक द्वारा दी गयी जानकारी के अनुसार है — तथा संलग्न आदेश में सूचीबद्ध अभिलेखों से मिलान किया गया है।",
            )}
          </span>
        </label>
        <table className="ss-form" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <th>{tx("Token provider*", "टोकन प्रदाता*")}</th>
              <td>PROXKey ({tx("demo", "डेमो")})</td>
            </tr>
            <tr>
              <th>{tx("Certificate*", "प्रमाणपत्र*")}</th>
              <td>{tx("DSC of SDO (Revenue), Kondagaon (demo)", "अनुविभागीय अधिकारी (राजस्व), कोंडागांव का DSC (डेमो)")}</td>
            </tr>
            <tr>
              <th>{tx("Passcode*", "पासकोड*")}</th>
              <td>
                <input
                  id="ss-passcode"
                  type="password"
                  className="input mono"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={pass}
                  onChange={(e) => setPass(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && decl && pass.length === 6 && onSign(pass)}
                  placeholder="••••••"
                />
                <div className="small muted">{tx("Demo: any 6 digits", "डेमो: कोई भी 6 अंक")}</div>
              </td>
            </tr>
          </tbody>
        </table>
        {err && <div className="error-box small">{err}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button className="ss-btn" onClick={onCancel} disabled={busy}>
            {tx("Cancel", "रद्द करें")}
          </button>
          <button className="ss-btn primary" disabled={busy || !decl || pass.length !== 6} onClick={() => onSign(pass)} id="ss-signpdf">
            {busy ? <span className="spinner" /> : null} Sign PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/** The records the panel found, as words (strength label; the % stays in the full view's "Why?"). */
function PanelMatches({ an }: { an: Analysis }) {
  const { t, tx } = useI18n();
  if (!an.lineage_matches.length) return null;
  return (
    <div className="ss-matches">
      {an.lineage_matches.map((m) => (
        <div key={m.certificate.cert_no} className="ss-match">
          <b>{t(m.relation_label)}</b>: {t(m.certificate.holder_name)} · <span className="mono">{m.certificate.cert_no}</span>
          <span className={`ss-chip ${m.match_level === "exact" ? "ok" : ""}`}>{m.match_level === "exact" ? tx("strong link", "प्रबल कड़ी") : tx("possible link", "संभावित कड़ी")}</span>
          {m.validity_headline && (
            <div className="small" style={{ color: "var(--amber)" }}>
              {t(m.validity_headline)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Round 5 (P1-4): same family / not this family inside the console panel, with the officer's grounds — the console
 *  file is no longer a dead end. Buttons only (no keyboard letters in the console); Undo until signing. */
function PanelDecide({ an, appId, role, onBundle }: { an: Analysis; appId: string; role: Role; onBundle: (b: CaseBundle) => void }) {
  const { tx } = useI18n();
  const [active, setActive] = useState<"same" | "not" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const accepted = new Set(an.accepted_cert_nos ?? []);
  const target =
    an.lineage_matches.find((m) => m.usable_as_evidence && !accepted.has(m.certificate.cert_no) && !m.disposition) ??
    an.lineage_matches.find((m) => an.disposition_required?.includes(m.certificate.cert_no) && !m.disposition) ??
    null;
  const done = an.lineage_matches.filter((m) => m.disposition);
  if (!target && !done.length) return null;
  const officer = an.office?.en;
  async function commit(decision: "same" | "not", grounds: string[], note: string) {
    if (!target) return;
    setErr(null);
    const b =
      decision === "same"
        ? await api.confirmRelationship(appId, target.certificate.cert_no, role, grounds, note || undefined, officer)
        : await api.rejectMatch(appId, target.certificate.cert_no, grounds, note || undefined, role, officer);
    setActive(null);
    onBundle(b);
  }
  async function undo(certNo: string) {
    setBusy(true);
    setErr(null);
    try {
      onBundle(await api.clearMatch(appId, certNo, role, officer));
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ss-decide" id="ss-decide">
      {done.map((m) => (
        <div key={m.certificate.cert_no} className="row small" style={{ width: "100%", gap: 6 }}>
          <span className={`checked-badge ${m.disposition?.decision === "not" ? "neutral" : ""}`}>
            {m.disposition?.decision === "same" ? "✓ " + tx("Same family — recorded by you", "वही परिवार — आपके द्वारा दर्ज") : "✗ " + tx("Not this family — recorded by you", "यह परिवार नहीं — आपके द्वारा दर्ज")} · <span className="mono">{m.certificate.cert_no}</span>
          </span>
          <button className="btn secondary sm" disabled={busy} onClick={() => undo(m.certificate.cert_no)} id="ss-undo">
            ↶ {tx("Undo", "पूर्ववत करें")}
          </button>
        </div>
      ))}
      {target &&
        (active ? (
          <GroundsPop key={active + target.certificate.cert_no} analysis={an} m={target} decision={active} onCancel={() => setActive(null)} onCommit={(g, n) => commit(active, g, n)} />
        ) : (
          <>
            <button className="btn decide-pair sm" onClick={() => setActive("same")} id="ss-same">
              ✓ {tx("Same family", "वही परिवार")}
            </button>
            <button className="btn decide-pair sm" onClick={() => setActive("not")} id="ss-not">
              ✗ {tx("Not this family", "यह परिवार नहीं")}
            </button>
          </>
        ))}
      {err && <div className="error-box small">{err}</div>}
    </div>
  );
}
