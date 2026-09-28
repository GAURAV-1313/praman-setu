import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import { api, ApiError } from "../api/client";
import type { Analysis, Application, CaseBundle, CitizenMessage, DecisionAction, DecisionRequest, DecisionResponse, I18n, Lang, PatwariForm, ReferTo, Role, Subdivision } from "../api/types";
import { ACTION_ICON, ACTION_LABEL, Kbd, PLACEHOLDER_RE, SEWASETU_STATUS, SlaClockNote, STATUS_LABEL, todayDMY } from "./common";
import { ShieldIllustration } from "../illustrations";
import WhatsAppPreview from "./WhatsAppPreview";
import { classifyLines, finalise, foldBlocks, insertFinding, kindOf, noticeDraft } from "./orderText";

const ACTIONS: DecisionAction[] = ["approve", "send_back", "refer", "reject"];
const ACTION_KEY: Record<string, string> = { approve: "A", send_back: "S", refer: "R", reject: "X" };
export const MIN_FINDING = 15;
const MIN_CALLBACK = 10;
const CALLBACK_MIN = 10;
const CUTOFF: Record<string, string> = { SC: "10-08-1950", ST: "06-09-1950", OBC: "26-12-1984" };

/** Round 5 (P0-1): "then open the next case" is OFF by default — after signing, the officer stays on the file and
 *  sees the result and the citizen message; "Next case →" (J) moves on. */
function readAutoNext(): boolean {
  try {
    return localStorage.getItem("ps_autonext") === "1";
  } catch {
    return false;
  }
}
function writeAutoNext(v: boolean) {
  try {
    localStorage.setItem("ps_autonext", v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT" || el.isContentEditable);
}

interface Props {
  app: Application;
  analysis: Analysis;
  role: Role;
  result: DecisionResponse | null;
  onDecided: (r: DecisionResponse, autoNext: boolean) => void;
  /** a found usable match is not yet decided (same family / not this family) */
  relationshipOpen: boolean;
  /** scroll to the same family / not this family pair (never pre-chooses either) */
  onShowRelationship: () => void;
  onNext: () => void;
  hasNext: boolean;
  /** replace the case bundle (after a hearing notice reply or a call-back) */
  onBundle: (b: CaseBundle) => void;
  onCalledBack: () => void;
  secondsOnScreen: () => number;
  /** Round 4: the file went into the sign tray (auto-advance to the next file) */
  onTrayAdded?: (count: number) => void;
  /** Round 4: a wrong-authority file was forwarded to the competent officer */
  onForwarded?: (b: CaseBundle) => void;
  /** Round 6: the file belongs to another SDO sub-division's desk (read-only here; forward it) */
  otherDesk?: Subdivision | null;
  onRoutedDesk?: () => void;
}

/** Round 4: "Request Patwari report" anywhere on the case page selects Refer → Patwari in the dock. */
export const PATWARI_EVENT = "praman:patwari";

/** Round 3: the decision dock — a sticky bottom bar (status · A/S/R/X · Sign) that is always in view, with a drawer
 *  above it for whatever the chosen action needs typed or ticked. Focused inputs therefore never land off-screen. */
function Dock({ bar, drawer, tone }: { bar: ReactNode; drawer?: ReactNode; tone?: string }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--dock-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--dock-h", "0px");
    };
  }, []);
  // portalled to <body>: a transformed ancestor (the page's fade-in) must never re-anchor the fixed dock
  return createPortal(
    <section className={`dock ${tone ?? ""}`} id="action-panel" ref={ref} aria-label="निर्णय / Decision">
      {drawer && (
        <div className="dock-drawer">
          <div className="shell">
            <div className="dock-drawer-in">{drawer}</div>
          </div>
        </div>
      )}
      <div className="dock-bar">
        <div className="shell dock-bar-in">{bar}</div>
      </div>
    </section>,
    document.body,
  );
}

export default function ActionPanel({ app, analysis, role, result, onDecided, relationshipOpen, onShowRelationship, onNext, hasNext, onBundle, onCalledBack, secondsOnScreen, onTrayAdded, onForwarded, otherDesk, onRoutedDesk }: Props) {
  const { t, tx, lang, shadow } = useI18n();
  const attention = analysis.flags.some((f) => f.severity === "attention");
  const unconfirmed = relationshipOpen;
  const scDone = !!analysis.show_cause?.reply;
  // Anti-anchoring: no tile is pre-selected while an attention point or an unconfirmed match is open, or on
  // standard review (the officer's own mind is the decision there). After a hearing notice reply nothing is pre-selected.
  // Round 4: in shadow mode nothing is pre-selected or pre-ticked — the officer decides unaided, as today.
  const initialAction = (): DecisionAction | null =>
    shadow || attention || unconfirmed || analysis.lane === "standard_review" || analysis.evidence_required || scDone ? null : analysis.suggested_action;
  const [action, setAction] = useState<DecisionAction | null>(initialAction);
  const [defCodes, setDefCodes] = useState<string[]>(shadow ? [] : analysis.deficiencies.map((d) => d.code));
  const [custom, setCustom] = useState("");
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [referTo, setReferTo] = useState<ReferTo | null>(analysis.suggested_action === "refer" && !shadow ? analysis.refer_to : null);
  const [finding, setFinding] = useState("");
  const [evCaste, setEvCaste] = useState<string | null>(null);
  const [evRes, setEvRes] = useState<string | null>(null);
  const [draftLang, setDraftLang] = useState<Lang>("hi");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [modal, setModal] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [autoNext, setAutoNext] = useState(readAutoNext);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Round 6 (P1): OBC — the officer's creamy-layer finding (never pre-ticked) and the documents relied on
  const creamy = analysis.creamy_layer ?? null;
  const [creamyOk, setCreamyOk] = useState(false);
  const [creamyDocs, setCreamyDocs] = useState<string[]>(shadow ? [] : (creamy?.default_docs ?? []));
  const findingRef = useRef<HTMLTextAreaElement>(null);
  const signBtnRef = useRef<HTMLButtonElement>(null);

  // follow the analysis when it changes (e.g. after a confirmation or a hearing notice reply)
  useEffect(() => {
    setAction(initialAction());
    setDefCodes(shadow ? [] : analysis.deficiencies.map((d) => d.code));
    setReferTo(analysis.suggested_action === "refer" && !shadow ? analysis.refer_to : null);
    setEdits({});
    setErr(null);
    setEvCaste(null);
    setEvRes(null);
    setCreamyOk(false);
    setCreamyDocs(shadow ? [] : (analysis.creamy_layer?.default_docs ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.app_id, analysis.suggested_action, analysis.lane, analysis.accepted_cert_nos.join(","), scDone, shadow]);

  // "Request Patwari report" (verdict card / side column) selects Refer → Patwari
  useEffect(() => {
    const h = () => {
      setAction("refer");
      if (analysis.refer_options?.some((o) => o.code === "patwari")) setReferTo("patwari");
    };
    window.addEventListener(PATWARI_EVENT, h);
    return () => window.removeEventListener(PATWARI_EVENT, h);
  }, [analysis.refer_options]);

  const needsPicker = analysis.evidence_required && (action === null || action === "approve");
  const isDomicile = app.service === "domicile";
  const pickedAll = !analysis.evidence_required || ((isDomicile || !analysis.evidence_options.caste.length || !!evCaste) && !!evRes);
  const evKey = `${evCaste ?? ""}|${evRes ?? ""}`;

  function pick(kind: "caste" | "res", code: string) {
    const c = kind === "caste" ? code : evCaste;
    const r = kind === "res" ? code : evRes;
    if (kind === "caste") setEvCaste(code);
    else setEvRes(code);
    const done = (isDomicile || !analysis.evidence_options.caste.length || !!c) && !!r;
    if (done && action === null) setAction("approve");
  }

  // Reject is always preceded by a pre-rejection hearing notice (15 days); after the reply the final order is drafted.
  const eff: DecisionAction | null = action === "reject" && !scDone ? "show_cause" : action;
  const findingWhy: I18n | null = eff ? (analysis.finding_required?.[eff] ?? null) : null;
  const needFinding = !!findingWhy;
  const findingOk = finding.trim().length >= MIN_FINDING;
  const reasons: I18n[] = useMemo(() => {
    const lib = analysis.sendback_reasons ?? analysis.deficiencies.map((d) => ({ ...d, suggested: true }));
    const r = lib.filter((d) => defCodes.includes(d.code)).map((d) => d.text);
    if (custom.trim()) r.push({ en: custom.trim(), hi: custom.trim() });
    return r;
  }, [analysis, defCodes, custom]);

  // the system draft for the chosen action (before the officer's own finding)
  const rawDraft = useMemo<I18n>(() => {
    const empty = { en: "", hi: "" };
    if (!eff) return empty;
    if (eff === "send_back") return noticeDraft(app, analysis.office_info, reasons, todayDMY());
    if (eff === "show_cause") return analysis.drafts?.show_cause ?? empty;
    if (eff === "reject") return analysis.drafts?.reject ?? empty;
    if (eff === "refer") return (referTo && analysis.refer_drafts?.[referTo]) || empty;
    // approve
    if (analysis.evidence_required) return pickedAll ? (analysis.approve_drafts?.[evKey] ?? empty) : empty;
    return analysis.drafts?.approve ?? analysis.draft_order;
  }, [eff, analysis, app, reasons, referTo, pickedAll, evKey]);

  const baseDraft = useMemo<I18n>(() => {
    if (!eff || eff === "send_back") return rawDraft;
    if (eff === "show_cause" || eff === "reject") return insertFinding(rawDraft, finding);
    return finding.trim() ? insertFinding(rawDraft, finding) : rawDraft;
  }, [eff, rawDraft, finding]);

  const key = `${eff}:${referTo}:${evKey}:${draftLang}`;
  const keyOf = (l: Lang) => `${eff}:${referTo}:${evKey}:${l}`;
  // Round 6: the OBC creamy-layer slot is filled from the officer's tick + documents (same sentence as the backend)
  const creamyNeeded = eff === "approve" && !!creamy?.required;
  const creamyDone = creamyNeeded && creamyOk && creamyDocs.length > 0;
  const fillCreamy = (text: string, l: Lang) => {
    if (!creamy || !creamyDone) return text;
    const labels = creamy.options.filter((o) => creamyDocs.includes(o.code)).map((o) => o.label[l].split(" (")[0]);
    return text.replace(creamy.placeholder[l], creamy.sentence[l].replace("{docs}", labels.join(", ")));
  };
  const draftText = fillCreamy(edits[key] ?? baseDraft[draftLang], draftLang);
  const orderText: I18n = { en: fillCreamy(edits[keyOf("en")] ?? baseDraft.en, "en"), hi: fillCreamy(edits[keyOf("hi")] ?? baseDraft.hi, "hi") };
  const hasPlaceholder = PLACEHOLDER_RE.test(orderText.en) || PLACEHOLDER_RE.test(orderText.hi);
  const undisposed = analysis.disposition_required ?? [];

  // what stands between the officer and signing (first blocker wins)
  let blocker: string | null = null;
  if (!action) blocker = analysis.evidence_required ? tx("Pick the document that shows the claim — or choose an action", "दावा दर्शाने वाला दस्तावेज़ चुनें — या कार्यवाही चुनें") : tx("Choose an action (A / S / R / X)", "कार्यवाही चुनें (A / S / R / X)");
  else if (action === "approve" && undisposed.length) blocker = tx("Mark the possible family record first: same family (C) / not this family (N)", "पहले संभावित पारिवारिक अभिलेख चिह्नित करें: वही परिवार (C) / यह परिवार नहीं (N)");
  else if (action === "approve" && !pickedAll) blocker = tx("Pick the document(s) that show the claim", "दावा दर्शाने वाले दस्तावेज़ चुनें");
  else if (needFinding && !findingOk) blocker = tx(`Write your finding (min ${MIN_FINDING} characters)`, `अपना निष्कर्ष लिखें (न्यूनतम ${MIN_FINDING} अक्षर)`);
  else if (action === "send_back" && reasons.length === 0) blocker = tx("Tick at least one reason", "कम से कम एक कारण चुनें");
  else if (action === "refer" && !referTo) blocker = tx("Choose where to refer", "संदर्भ का गंतव्य चुनें");
  else if (creamyNeeded && !creamyDone) blocker = tx("OBC: record your creamy-layer finding and the documents relied on", "अ.पि.व.: क्रीमी लेयर निष्कर्ष व आधार दस्तावेज़ दर्ज करें");
  else if (hasPlaceholder) blocker = tx("Fill the placeholder in the draft", "प्रारूप में रिक्त स्थान भरें");
  const pending = !result && app.status === "pending";
  // Primary: while a found match is unconfirmed and the officer has not written a finding, the first step is Confirm.
  const confirmFirst = unconfirmed && (!action || (action === "approve" && !findingOk));
  const canSign = pending && !blocker && !confirmFirst;

  function request(readConfirmed: boolean): DecisionRequest {
    return {
      action: eff!,
      officer_name: analysis.office.en,
      order_text: orderText,
      // the officer's creamy-layer tick fills its slot in the system text too (an act, not an edit of the draft)
      system_text: { en: fillCreamy(baseDraft.en, "en"), hi: fillCreamy(baseDraft.hi, "hi") },
      deficiency_codes: eff === "send_back" ? defCodes : undefined,
      custom_deficiency: eff === "send_back" && custom.trim() ? custom.trim() : undefined,
      refer_to: eff === "refer" && referTo ? referTo : undefined,
      findings: finding.trim() ? finding.trim() : undefined,
      evidence_basis: eff === "approve" && analysis.evidence_required ? { caste: evCaste, residence: evRes } : undefined,
      creamy_layer: creamyNeeded ? { non_creamy: creamyOk, docs: creamyDocs } : undefined,
      time_on_screen_s: Math.round(secondsOnScreen() * 10) / 10,
      read_confirmed: readConfirmed,
      channel: "praman",
      tool_visible: !shadow,
      shadow,
    };
  }

  const inflight = useRef(false);
  async function sign(readConfirmed: boolean) {
    if (!eff || busy || inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.decision(app.app_id, request(readConfirmed), role);
      setModal(false);
      // shadow mode: stay on the file so the tool's check can be revealed and compared
      onDecided(r, autoNext && eff !== "show_cause" && !shadow);
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  // Round 4: sign tray — records-complete approvals, opened and read one by one, signed together with one DSC token passcode
  const trayEligible =
    eff === "approve" && analysis.ready_to_sign !== false && analysis.lane === "records_complete" && analysis.suggested_action === "approve" && !attention && !unconfirmed && !undisposed.length && !analysis.deficiencies.length && !analysis.finding_required?.approve;
  async function addToTray(readConfirmed: boolean) {
    if (!eff || busy || inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setErr(null);
    try {
      const v = await api.trayAdd(app.app_id, request(readConfirmed));
      setModal(false);
      window.dispatchEvent(new CustomEvent("praman:tray"));
      onTrayAdded?.(v.items.length);
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  function openSign() {
    if (confirmFirst) return void onShowRelationship();
    if (action === "approve" && undisposed.length) return void onShowRelationship();
    if (canSign) setModal(true);
    else if (creamyNeeded && !creamyDone && action === "approve") {
      const el = document.getElementById("creamy-ok");
      el?.scrollIntoView({ block: "nearest" });
      el?.focus({ preventScroll: true });
    } else if (needFinding && !findingOk) findingRef.current?.focus({ preventScroll: true });
  }

  // keyboard: A/S/R/X choose, Ctrl/Cmd+Enter sign (or confirm first)
  useEffect(() => {
    if (!pending) return;
    const h = (e: KeyboardEvent) => {
      if (modal || document.querySelector(".modal-bg") || document.querySelector(".grounds-pop")) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        openSign();
        return;
      }
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map: Record<string, DecisionAction> = { a: "approve", s: "send_back", r: "refer", x: "reject" };
      if (map[k]) {
        e.preventDefault();
        setAction(map[k]);
        if (map[k] === "refer" && !referTo) setReferTo(analysis.refer_to);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // Round 6: once the proof is picked, bring the OBC creamy-layer tick into view (the drawer scrolls at 1366×657)
  useEffect(() => {
    if (creamyNeeded && pickedAll && !creamyOk) setTimeout(() => document.getElementById("creamy-box")?.scrollIntoView({ block: "nearest" }), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creamyNeeded, pickedAll]);

  // move focus to the finding box when it appears, so typing can start at once
  useEffect(() => {
    if (needFinding && !findingOk) findingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eff, needFinding]);

  // ---------------- Round 6: a file of another SDO sub-division — read-only; forward it to its own desk ----------------
  if (!result && app.status === "pending" && otherDesk) {
    return <OtherDeskDock app={app} analysis={analysis} sd={otherDesk} onRouted={onRoutedDesk} />;
  }

  // ---------------- Round 4: wrong-authority file — the only action is to forward it ----------------
  if (!result && app.status === "pending" && analysis.competence && !analysis.competence.ok) {
    return <ForwardDock app={app} analysis={analysis} onForwarded={onForwarded} />;
  }

  // ---------------- awaiting the applicant's reply to a pre-rejection hearing notice ----------------
  if (!result && app.status === "show_cause_issued") {
    return <ShowCausePending app={app} analysis={analysis} role={role} onBundle={onBundle} onCalledBack={onCalledBack} onNext={onNext} hasNext={hasNext} />;
  }

  // ---------------- decided ----------------
  if (result || app.status !== "pending") {
    return <Decided app={app} analysis={analysis} role={role} result={result} onNext={onNext} hasNext={hasNext} onCalledBack={onCalledBack} />;
  }

  const count = app.sendback_count ?? 0;
  const draftTitle =
    eff === "send_back"
      ? tx("Notice to applicant (not an order)", "आवेदक को सूचना (आदेश नहीं)")
      : eff === "show_cause"
        ? tx("Pre-rejection hearing notice (15 days to reply)", "सुनवाई सूचना (उत्तर हेतु 15 दिन)")
        : eff === "refer"
          ? tx("Reference note", "संदर्भ टीप")
          : tx("Draft order", "प्रारूप आदेश");
  const cutoff = CUTOFF[app.claimed_category ?? ""] ?? "";
  // Round-2 rule: the records' suggestion is shown only where it cannot anchor (not on standard review before the officer acts)
  const showSuggest = !shadow && !needsPicker && !(analysis.lane === "standard_review" && !action) && !scDone;
  const suggestText = (
    <>
      {tx("Records suggest", "अभिलेखों का सुझाव")}: <b>{t(ACTION_LABEL[analysis.suggested_action])}</b>
      {analysis.suggested_action === "refer" && analysis.refer_options && <> — {t(analysis.refer_options.find((o) => o.code === analysis.refer_to)?.label)}</>}
    </>
  );

  const drawerParts: ReactNode[] = [];
  if (analysis.show_cause?.reply)
    drawerParts.push(
      <div key="scdone" className="sc-done small">
        ⚖ {tx("Hearing notice", "सुनवाई सूचना")} <span className="mono">{analysis.show_cause.no}</span> ·{" "}
        {analysis.show_cause.reply.outcome === "reply_received"
          ? tx(`reply received ${analysis.show_cause.reply.date}`, `उत्तर प्राप्त ${analysis.show_cause.reply.date}`) + (analysis.show_cause.reply.summary ? `: “${analysis.show_cause.reply.summary}”` : "")
          : tx(`no reply by ${analysis.show_cause.reply_due}`, `${analysis.show_cause.reply_due} तक उत्तर नहीं`)}
      </div>,
    );
  if (needsPicker)
    drawerParts.push(
      <div key="picker" className="ev-picker" role="group" aria-label={tx("Evidence picker", "साक्ष्य चयन")}>
        <div className="section-label" style={{ marginBottom: 4 }}>
          {tx("Your finding — which document shows the claim?", "आपका निष्कर्ष — कौन-सा दस्तावेज़ दावा दर्शाता है?")}
        </div>
        {!isDomicile && analysis.evidence_options.caste.length > 0 && (
          <div className="ev-row2">
            <span className="ev-q">{tx("Caste / tribe shown by", "जाति / जनजाति दर्शाता है")}</span>
            {analysis.evidence_options.caste.map((o) => (
              <button key={o.code} className={`chip ${evCaste === o.code ? "on" : ""}`} onClick={() => pick("caste", o.code)} aria-pressed={evCaste === o.code}>
                {t(o.label).split(" (")[0]}
              </button>
            ))}
          </div>
        )}
        <div className="ev-row2">
          <span className="ev-q">{isDomicile ? tx("Residence in CG shown by", "छ.ग. में निवास दर्शाता है") : tx(`Residence before ${cutoff} shown by`, `${cutoff} से पूर्व निवास दर्शाता है`)}</span>
          {[...analysis.evidence_options.residence]
            .sort((x, y) => (x.code === "school_record" ? -1 : y.code === "school_record" ? 1 : 0))
            .map((o) => (
              <button key={o.code} className={`chip ${evRes === o.code ? "on" : ""}`} onClick={() => pick("res", o.code)} aria-pressed={evRes === o.code}>
                {t(o.label).split(" (")[0]}
              </button>
            ))}
        </div>
        <div className="small muted">{tx("Your choice becomes the order's finding, in your name. Not satisfied? Send back or refer instead.", "आपका चयन आदेश में आपके निष्कर्ष के रूप में दर्ज होगा। संतुष्ट नहीं? वापस भेजें या संदर्भित करें।")}</div>
      </div>,
    );
  if (creamyNeeded && creamy)
    drawerParts.push(
      <div key="creamy" className="creamy-box" role="group" aria-label={tx("Creamy-layer finding (OBC)", "क्रीमी लेयर निष्कर्ष (अ.पि.व.)")} id="creamy-box">
        <label className={`def-item creamy-tick ${creamyOk ? "on" : ""}`}>
          <input type="checkbox" checked={creamyOk} onChange={(e) => setCreamyOk(e.target.checked)} id="creamy-ok" />
          <span>
            <b>{tx("Creamy-layer finding (OBC, required):", "क्रीमी लेयर निष्कर्ष (अ.पि.व., आवश्यक):")}</b>{" "}
            {tx("the applicant is NOT in the creamy layer (non-creamy layer) — your finding, written into the order", "आवेदक क्रीमी लेयर में नहीं आते (गैर-क्रीमी लेयर) — आपका निष्कर्ष, आदेश में दर्ज होगा")}
          </span>
        </label>
        <div className="ev-row2">
          <span className="ev-q">{tx("Relied on", "आधार दस्तावेज़")}</span>
          {creamy.options.map((o) => (
            <button
              key={o.code}
              className={`chip ${creamyDocs.includes(o.code) ? "on" : ""}`}
              aria-pressed={creamyDocs.includes(o.code)}
              onClick={() => setCreamyDocs((cur) => (cur.includes(o.code) ? cur.filter((x) => x !== o.code) : [...cur, o.code]))}
            >
              {creamyDocs.includes(o.code) ? "✓ " : ""}
              {t(o.label).split(" (")[0]}
            </button>
          ))}
        </div>
        <div className={`small ${creamy.father_income_on_file ? "muted" : ""}`} style={creamy.father_income_on_file ? undefined : { color: "var(--amber)" }}>
          {t(creamy.note)} {tx("In the creamy layer? Do not approve — send back or issue a hearing notice.", "क्रीमी लेयर में? स्वीकृत न करें — वापस भेजें या सुनवाई सूचना दें।")}
        </div>
      </div>,
    );
  if (action === "reject" && !scDone)
    drawerParts.push(
      <div key="scnote" className="sc-note small">
        ⚖{" "}
        {tx(
          "Before rejecting, the applicant must be heard. This issues a PRE-REJECTION HEARING NOTICE (15 days to reply). The final order comes after the reply or its absence.",
          "अस्वीकृति से पहले आवेदक को सुना जाना आवश्यक है। इससे सुनवाई सूचना जारी होगी (उत्तर हेतु 15 दिन)। अंतिम आदेश उत्तर प्राप्त होने या न होने के बाद।",
        )}
      </div>,
    );
  if (needFinding)
    drawerParts.push(
      <div key="finding" className="field finding">
        <label htmlFor="finding-box">
          {eff === "show_cause" ? tx("Grounds for the proposed rejection (required)", "प्रस्तावित अस्वीकृति के आधार (आवश्यक)") : tx("Your written finding (required)", "आपका लिखित निष्कर्ष (आवश्यक)")}
          <span className={`small ${findingOk ? "ok" : "muted"}`} style={{ marginLeft: 8 }}>
            {finding.trim().length}/{MIN_FINDING}+
          </span>
          <span className="small muted" style={{ marginLeft: 8, fontWeight: 400 }}>
            {t(findingWhy)}
          </span>
        </label>
        <textarea
          id="finding-box"
          ref={findingRef}
          className="textarea"
          style={{ minHeight: 64 }}
          value={finding}
          onChange={(e) => setFinding(e.target.value)}
          placeholder={tx("State the specific reason from the records…", "अभिलेखों से विशिष्ट कारण लिखें…")}
        />
        {lang === "hi" && /[A-Za-z]/.test(finding) && !/[ऀ-ॿ]/.test(finding) && (
          <span className="small" style={{ color: "var(--amber)" }}>
            आपका निष्कर्ष अंग्रेज़ी में है; हिंदी आदेश प्रामाणिक है — उसमें “अंग्रेज़ी में लिखित” अंकित होगा।
          </span>
        )}
      </div>,
    );
  if (action === "send_back")
    drawerParts.push(
      <div key="sb" className="sb-lib">
        <div className="row" style={{ gap: 6, marginBottom: 6 }}>
          <span className="section-label" style={{ margin: 0 }}>
            {tx("Reasons (tick all that apply)", "कारण (सभी लागू चुनें)")}
          </span>
          {count === 0 ? (
            <span className="pill outline small">{tx("1st send-back", "पहली वापसी")}</span>
          ) : (
            <span className="pill amber small">⚠ {tx(`Sent back ${count} time${count > 1 ? "s" : ""} before`, `पहले ${count} बार वापस भेजा गया`)}</span>
          )}
          <span className="small muted">{tx("No new fee · same application number · 30 days to add it", "कोई नया शुल्क नहीं · वही आवेदन क्रमांक · जोड़ने हेतु 30 दिन")}</span>
        </div>
        {count > 0 && (
          <p className="small" style={{ color: "var(--amber)", marginBottom: 6 }}>
            {tx("Consider a Patwari field report (Refer) instead of another send-back.", "एक और वापसी के बजाय पटवारी क्षेत्र प्रतिवेदन (संदर्भ) पर विचार करें।")}
          </p>
        )}
        <div className="sb-list">
          {(analysis.sendback_reasons ?? [])
            .filter((d) => showAllReasons || defCodes.includes(d.code))
            .map((d) => (
              <label key={d.code} className={`def-item ${d.suggested ? "sugg" : ""}`}>
                <input type="checkbox" checked={defCodes.includes(d.code)} onChange={(e) => setDefCodes((cur) => (e.target.checked ? [...cur, d.code] : cur.filter((c) => c !== d.code)))} />
                <span>
                  {t(d.text)}
                  {d.suggested && !shadow && (
                    <span className="pill blue small" style={{ marginLeft: 6 }}>
                      {tx("found by check", "जांच में मिला")}
                    </span>
                  )}
                </span>
              </label>
            ))}
        </div>
        {showAllReasons || custom ? (
          <input className="input" style={{ marginTop: 6 }} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={tx("Other reason (optional, in plain words)…", "अन्य कारण (वैकल्पिक, सरल शब्दों में)…")} />
        ) : null}
        <button className="btn secondary sm" style={{ marginTop: 6 }} onClick={() => setShowAllReasons((v) => !v)}>
          {showAllReasons
            ? tx("Show ticked only", "केवल चुने हुए दिखाएं")
            : tx(
                `+ More standard reasons (${(analysis.sendback_reasons ?? []).filter((d) => !defCodes.includes(d.code)).length}) / own reason`,
                `+ अन्य मानक कारण (${(analysis.sendback_reasons ?? []).filter((d) => !defCodes.includes(d.code)).length}) / अपना कारण`,
              )}
        </button>
      </div>,
    );
  if (action === "refer")
    drawerParts.push(
      <div key="refer" className="refer-to">
        <div className="section-label">{tx("Refer to (required)", "संदर्भित करें (आवश्यक)")}</div>
        <div className="refer-opts">
          {(analysis.refer_options ?? []).map((o) => (
            <label key={o.code} className={`def-item ${referTo === o.code ? "on" : ""}`}>
              <input type="radio" name="refer_to" checked={referTo === o.code} onChange={() => setReferTo(o.code)} />
              <span>
                {t(o.label)}
                {o.code === analysis.refer_to && analysis.suggested_action === "refer" && !shadow && (
                  <span className="pill blue small" style={{ marginLeft: 6 }}>
                    {tx("suggested", "सुझाव")}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        {referTo === "patwari" && analysis.patwari_form && <PatwariPreview form={analysis.patwari_form} />}
      </div>,
    );
  if (showDraft && eff && rawDraft.en)
    drawerParts.push(
      <div key="draft" className="draft-box">
        <div className="tabs">
          <span className="section-label" style={{ margin: "8px 8px 0 0" }}>
            {draftTitle}
          </span>
          <button className={draftLang === "hi" ? "on" : ""} onClick={() => setDraftLang("hi")}>
            हिंदी
          </button>
          <button className={draftLang === "en" ? "on" : ""} onClick={() => setDraftLang("en")}>
            English
          </button>
          <span className="spacer" />
          {edits[key] !== undefined && (
            <button onClick={() => setEdits(({ [key]: _drop, ...rest }) => rest)} title={tx("Discard your edits", "संपादन हटाएं")}>
              ↺
            </button>
          )}
        </div>
        <textarea className={`textarea draft ${hasPlaceholder ? "has-ph" : ""}`} value={draftText} onChange={(e) => setEdits((cur) => ({ ...cur, [key]: e.target.value }))} aria-label={draftTitle} />
        {draftLang === "en" && <div className="small muted">{tx("English is a translation for reference; the Hindi text is authoritative.", "अंग्रेज़ी केवल संदर्भ हेतु अनुवाद है; हिंदी पाठ प्रामाणिक है।")}</div>}
      </div>,
    );

  // the one line to the left of the actions: what stands between the officer and signing
  let statusMain: ReactNode;
  let statusTone = "";
  if (confirmFirst) {
    statusTone = "todo";
    statusMain = (
      <button className="linkish" onClick={onShowRelationship}>
        {tx("Decide the relationship first: same family (C) / not this family (N)", "पहले संबंध तय करें: वही परिवार (C) / यह परिवार नहीं (N)")}
      </button>
    );
  } else if (action === "approve" && undisposed.length) {
    statusTone = "todo";
    statusMain = (
      <button className="linkish" onClick={onShowRelationship}>
        {blocker}
      </button>
    );
  } else if (blocker) {
    statusTone = action ? "todo" : "";
    statusMain = <>{blocker}</>;
  } else {
    statusTone = "ready";
    statusMain = <>{tx("Ready — the full text is shown before you sign", "तैयार — हस्ताक्षर से पहले पूरा पाठ दिखेगा")}</>;
  }
  const signLabel =
    eff === "send_back"
      ? tx("Send notice to applicant", "आवेदक को सूचना भेजें")
      : eff === "show_cause"
        ? tx("Issue pre-rejection hearing notice", "सुनवाई सूचना जारी करें")
        : tx("Sign & issue", "हस्ताक्षर कर जारी करें");

  const bar = (
    <>
      <div className={`dock-status ${statusTone}`} aria-live="polite">
        <div className="ds-main">{statusMain}</div>
        {(showSuggest || (eff && rawDraft.en)) && (
          <div className="ds-sub">
            {showSuggest && <span title={t(analysis.suggested_action_reason)}>{suggestText}</span>}
            {eff && rawDraft.en && (
              <button className="linkish" onClick={() => setShowDraft((v) => !v)} aria-expanded={showDraft}>
                {showDraft ? tx("Hide draft", "प्रारूप छिपाएं") : tx("View / edit draft", "प्रारूप देखें / बदलें")}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="act-seg" role="radiogroup" aria-label={tx("Your action", "आपकी कार्यवाही")}>
        {ACTIONS.map((a) => (
          <button
            key={a}
            role="radio"
            aria-checked={action === a}
            className={`${a} ${action === a ? "on" : ""}`}
            title={t(SEWASETU_STATUS[a])}
            onClick={() => {
              setAction(a);
              if (a === "refer" && !referTo && analysis.suggested_action === "refer") setReferTo(analysis.refer_to);
            }}
          >
            <span className="i">{ACTION_ICON[a]}</span>
            <span className="t">{a === "reject" && !scDone ? tx("Reject…", "अस्वीकृत…") : t(ACTION_LABEL[a])}</span>
            <Kbd k={ACTION_KEY[a]} />
          </button>
        ))}
      </div>
      <button ref={signBtnRef} className="btn blue sign-btn" disabled={!canSign} onClick={openSign} id="sign-btn" title={blocker ?? undefined}>
        ✍ {signLabel} <Kbd k="Ctrl+↵" />
      </button>
    </>
  );

  return (
    <>
      <Dock bar={bar} drawer={drawerParts.length ? <>{drawerParts}</> : undefined} tone={statusTone} />
      {modal &&
        eff &&
        createPortal(
          <SignModal
            action={eff}
            app={app}
            analysis={analysis}
            text={orderText}
            systemBase={rawDraft}
            finding={finding.trim()}
            referLabel={eff === "refer" && referTo ? analysis.refer_options?.find((o) => o.code === referTo)?.label : undefined}
            busy={busy}
            err={err}
            autoNext={autoNext}
            setAutoNext={(v) => {
              setAutoNext(v);
              writeAutoNext(v);
            }}
            onCancel={() => {
              setModal(false);
              setTimeout(() => signBtnRef.current?.focus(), 0);
            }}
            onSign={sign}
            onTray={trayEligible ? addToTray : undefined}
          />,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------- signing sheet (round 3: full-height, readable)
/** Round 4: exported for the Sewa Setu console (the native DSC signing opens the same sheet). */
export function SignModal(props: {
  action: DecisionAction;
  app: Application;
  analysis: Analysis;
  text: I18n;
  systemBase: I18n;
  finding: string;
  referLabel?: I18n;
  busy: boolean;
  err: string | null;
  autoNext: boolean;
  setAutoNext: (v: boolean) => void;
  onCancel: () => void;
  onSign: (readConfirmed: boolean) => void;
  /** Round 4: "Add to sign tray" (records-complete approvals only) */
  onTray?: (readConfirmed: boolean) => void;
  /** Round 4: the console signs with Sewa Setu's own DSC token label */
  signLabel?: string;
}) {
  const { action, app, analysis, text, systemBase, finding, referLabel, busy, err, autoNext, setAutoNext, onCancel, onSign, onTray, signLabel } = props;
  const { t, tx, lang: uiLang, presenter, shadow } = useI18n();
  const [lang, setLang] = useState<Lang>("hi");
  const [read, setRead] = useState(false);
  const [seenEnd, setSeenEnd] = useState(false);
  const [full, setFull] = useState(false);
  const [progress, setProgress] = useState(0);
  const readRef = useRef(false);
  readRef.current = read;
  const seenRef = useRef(false);
  seenRef.current = seenEnd;
  const isNotice = action === "send_back";
  const kind = kindOf(action);
  const preview = useMemo(() => finalise(text, kind, analysis.office_info, null), [text, kind, analysis.office_info]);
  const officerFrags = useMemo(
    () =>
      [
        finding,
        ...(analysis.officer_segments ?? []).flatMap((s) => [s.en, s.hi]),
        ...(analysis.show_cause?.reply?.summary ? [analysis.show_cause.reply.summary] : []),
        // the evidence picker's choice is the officer's own finding
        ...(analysis.evidence_required && action === "approve" ? ["The undersigned has examined the documents on file", "अधोहस्ताक्षरी ने संलग्न दस्तावेज़ों का परीक्षण किया है"] : []),
      ].filter(Boolean),
    [finding, analysis],
  );
  const lines = useMemo(() => classifyLines(preview[lang], systemBase[lang], officerFrags), [preview, lang, systemBase, officerFrags]);
  const nOfficer = lines.filter((l) => l.kind === "officer").length;
  // Round 4: fixed legal boilerplate and corroborative-only extracts are folded (display only; the issued text is unchanged)
  const tplVersion = "v" + (analysis.rules_version ?? "").replace(/^rules-/, "");
  const blocks = useMemo(() => foldBlocks(lines, lang, tplVersion), [lines, lang, tplVersion]);
  const [openFolds, setOpenFolds] = useState<Record<string, boolean>>({});
  const onTrayRef = useRef(onTray);
  onTrayRef.current = onTray;
  // Round 5 (P0-1): the keydown effect below is registered once; read the latest onSign (and so the current
  // "then next case" tick) through a ref, never the first-render closure.
  const onSignRef = useRef(onSign);
  onSignRef.current = onSign;
  const checkRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);

  // the read tick unlocks only once the end of the text has been on screen (or "show full" was pressed)
  useEffect(() => {
    const box = boxRef.current;
    const end = endRef.current;
    if (!box || !end) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeenEnd(true), { root: full ? null : box, threshold: 0.9 });
    io.observe(end);
    const onScroll = () => {
      setProgress(Math.min(1, (box.scrollTop + box.clientHeight) / Math.max(1, box.scrollHeight)));
      // Round 4: the whole variable text is on screen (it fits, or has been scrolled to the end) -> the tick unlocks
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) setSeenEnd(true);
    };
    onScroll();
    const raf = requestAnimationFrame(onScroll);
    const tm = setTimeout(onScroll, 60);
    box.addEventListener("scroll", onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(tm);
      box.removeEventListener("scroll", onScroll);
    };
  }, [lang, full, openFolds]);

  useEffect(() => {
    boxRef.current?.focus({ preventScroll: true });
    const h = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === " " && tgt?.tagName !== "BUTTON" && !(tgt instanceof HTMLInputElement)) {
        // Space reads on (page down) until the end has been seen, then ticks "I have read"
        e.preventDefault();
        const box = boxRef.current;
        if (!seenRef.current && box && box.scrollTop + box.clientHeight >= box.scrollHeight - 4) {
          // the whole text is already on screen: this Space is the read tick
          seenRef.current = true;
          setSeenEnd(true);
          setRead(true);
          setTimeout(() => checkRef.current?.focus(), 0);
        } else if (!seenRef.current && box) {
          // page from the last target, so quick presses add up even while a smooth scroll is running
          const from = Math.max(box.scrollTop, targetRef.current);
          targetRef.current = Math.min(box.scrollHeight - box.clientHeight, from + box.clientHeight * 0.85);
          box.scrollTo({ top: targetRef.current });
        }
        else if (seenRef.current) {
          setRead(true);
          checkRef.current?.focus();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S") && onTrayRef.current) {
        e.preventDefault();
        if (readRef.current) onTrayRef.current(true);
        else checkRef.current?.classList.add("nudge");
      } else if (e.key === "Enter" && !(tgt instanceof HTMLTextAreaElement) && !(tgt instanceof HTMLButtonElement && !tgt.classList.contains("esign"))) {
        e.preventDefault();
        if (readRef.current) onSignRef.current(true);
        else checkRef.current?.classList.add("nudge");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRef = action === "refer";
  const title = isNotice
    ? tx("Send a deficiency notice to the applicant — not an order", "आवेदक को सूचना भेजें")
    : action === "show_cause"
      ? tx("Issue a pre-rejection hearing notice — the applicant is heard before any rejection", "सुनवाई सूचना जारी करें")
      : isRef
        ? tx("Read the reference letter before signing — not a decision on the application", "हस्ताक्षर से पहले संदर्भ पत्र पढ़ें — यह आवेदन पर निर्णय नहीं")
        : tx("Read the order before signing — you are making this decision", "हस्ताक्षर से पहले आदेश पढ़ें — यह निर्णय आप ले रहे हैं");
  // Round 5: a notice or a reference letter is never called an "order" on this sheet
  const docWord = isNotice || action === "show_cause" ? tx("notice", "सूचना") : isRef ? tx("letter", "पत्र") : tx("order", "आदेश");
  return (
    <div className="modal-bg sheet-bg" onClick={() => !busy && onCancel()}>
      <div className={`modal sign-modal ${full ? "full" : ""}`} role="dialog" aria-modal="true" aria-labelledby="sign-title" onClick={(e) => e.stopPropagation()}>
        <div className="sign-head">
          {!isNotice && <ShieldIllustration size={32} />}
          <h2 id="sign-title">{title}</h2>
          <span className="spacer" />
          <div className="tabs sheet-tabs" style={{ margin: 0, border: 0 }}>
            <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")}>
              हिंदी · {tx("authoritative", "प्रामाणिक")}
            </button>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
              English · {tx("translation", "अनुवाद")}
            </button>
          </div>
          <span className="legend small">
            <span className="lg-sys">{tx("system text", "सिस्टम पाठ")}</span> <span className="lg-off">{tx(`your text / choices (${nOfficer})`, `आपका पाठ / चयन (${nOfficer})`)}</span>
          </span>
          <button className="btn secondary sm" onClick={onCancel} disabled={busy} aria-label={tx("Cancel", "रद्द करें")}>
            <Kbd k="Esc" />
          </button>
        </div>
        <div className="sign-strip">
          <b>
            {ACTION_ICON[action === "show_cause" ? "reject" : action]} {action === "show_cause" ? tx("Pre-rejection hearing notice", "सुनवाई सूचना") : t(ACTION_LABEL[action])}
            {referLabel && <> → {t(referLabel)}</>}
          </b>
          <span>·</span>
          <span className="mono">{app.app_id}</span>
          <span>·</span>
          <span>{t(app.applicant_name)}</span>
          <span>·</span>
          <span>
            {isNotice ? tx("Issued by", "जारीकर्ता") : tx("Signed by", "हस्ताक्षरकर्ता")}: {t(analysis.office)} · {todayDMY()}
          </span>
          {action !== analysis.suggested_action && action !== "show_cause" && action !== "refer" && action !== "send_back" && !shadow && <span className="pill outline">{tx("differs from records' suggestion", "सुझाव से भिन्न")}</span>}
          {action === "approve" && (
          <span className="issue-note">
            {app.service === "domicile"
              ? tx(
                  "Issued: (1) Sewa Setu's standard certificate — with QR, in DigiLocker; (2) this reasoned order — on file, for any appeal as per the rules. Signing: Sewa Setu's existing DSC token.",
                  "जारी होगा: (1) सेवा सेतु का मानक प्रमाण पत्र — QR सहित, DigiLocker में; (2) यह तर्कसंगत आदेश — फाइल में, नियमानुसार अपील हेतु। हस्ताक्षर: सेवा सेतु का मौजूदा DSC टोकन।",
                )
              : tx(
                  "Issued: (1) Sewa Setu's standard certificate — with QR, in DigiLocker; (2) this reasoned order — on file, for appeal (s.5). Signing: Sewa Setu's existing DSC token.",
                  "जारी होगा: (1) सेवा सेतु का मानक प्रमाण पत्र — QR सहित, DigiLocker में; (2) यह तर्कसंगत आदेश — फाइल में, अपील (धारा 5) हेतु। हस्ताक्षर: सेवा सेतु का मौजूदा DSC टोकन।",
                )}
          </span>
          )}
        </div>
        <div className="order-preview sheet" ref={boxRef} tabIndex={0} aria-label={tx("Full text to be issued", "जारी होने वाला पूरा पाठ")} lang={lang}>
          <div className="sheet-in">
            {blocks.map((b, i) =>
              b.type === "line" ? (
                <div key={i} className={`ol ${b.kind}`}>
                  {b.line || " "}
                </div>
              ) : (
                <div key={b.key} className={`fold ${b.standard ? "std" : "cor"} ${openFolds[b.key] || full ? "open" : ""}`}>
                  <button type="button" className="fold-head" aria-expanded={!!(openFolds[b.key] || full)} onClick={() => setOpenFolds((o) => ({ ...o, [b.key]: !o[b.key] }))}>
                    <span className="fold-caret" aria-hidden="true">{openFolds[b.key] || full ? "▾" : "▸"}</span> {b.title}
                  </button>
                  {(openFolds[b.key] || full) &&
                    b.lines.map((l, k) => (
                      <div key={k} className={`ol ${l.kind}`}>
                        {l.line}
                      </div>
                    ))}
                </div>
              ),
            )}
            <div className="sheet-end" ref={endRef}>
              — {tx(`end of the ${docWord}`, `${docWord} का अंत`)} —
            </div>
          </div>
        </div>
        <div className="read-meter" aria-hidden="true">
          <span style={{ width: `${Math.round((seenEnd ? 1 : progress) * 100)}%` }} />
        </div>
        {presenter && action === "reject" && <div className="small presenter-note">🎬 [appellate authority as notified — confirm with Revenue Dept]</div>}
        <div className="sign-foot">
          <label className={`read-check ${read ? "on" : ""} ${seenEnd ? "" : "locked"}`}>
            <input ref={checkRef} type="checkbox" checked={read} disabled={!seenEnd} onChange={(e) => setRead(e.target.checked)} id="read-check" />
            <span>
              {isNotice || action === "show_cause" ? tx("I have read the notice", "मैंने पूरी सूचना पढ़ ली है") : isRef ? tx("I have read the reference letter", "मैंने पूरा संदर्भ पत्र पढ़ लिया है") : tx("I have read the order; decision and reasons are mine", "मैंने पूरा आदेश पढ़ लिया है; निर्णय और उसके कारण मेरे हैं")}
              {uiLang === "en" && <span className="muted"> · {isNotice || action === "show_cause" ? "मैंने पूरी सूचना पढ़ ली है" : isRef ? "मैंने पूरा संदर्भ पत्र पढ़ लिया है" : "मैंने पूरा आदेश पढ़ लिया है; निर्णय और उसके कारण मेरे हैं"}</span>}
              {!seenEnd && (
                <span className="read-hint">
                  {tx("Scroll to the end to enable (Space reads on)", "सक्षम करने हेतु अंत तक पढ़ें (Space से आगे)")} ·{" "}
                  <button
                    type="button"
                    className="linkish"
                    onClick={(e) => {
                      e.preventDefault();
                      setFull(true);
                      setSeenEnd(true);
                    }}
                    id="show-full"
                  >
                    {tx("show full text", "पूरा पाठ दिखाएँ")}
                  </button>
                </span>
              )}
            </span>
            <Kbd k="Space" />
          </label>
          <label className="row small autonext">
            <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
            {tx("Then open the next case", "फिर अगला प्रकरण")}
          </label>
          <span className="spacer" />
          <button className="btn secondary" onClick={onCancel} disabled={busy}>
            {tx("Cancel", "रद्द करें")}
          </button>
          {onTray && (
            <button className="btn secondary tray-add" disabled={busy || !read} onClick={() => onTray(true)} id="tray-add-btn" title={tx("Save the decision; sign up to 5 read files with one DSC token passcode", "निर्णय सहेजें; पढ़ी गई अधिकतम 5 फ़ाइलों पर एक DSC टोकन पासकोड")}>
              {tx("Add to sign tray", "हस्ताक्षर ट्रे में रखें")} <Kbd k="Ctrl+S" />
            </button>
          )}
          <button className="btn blue esign" disabled={busy || !read} onClick={() => onSign(true)} id="esign-btn">
            {busy ? <span className="spinner" /> : isNotice ? "↩" : "✍"} {signLabel ?? (isNotice ? tx("Send to applicant", "आवेदक को भेजें") : action === "show_cause" ? tx("Sign & issue notice (DSC)", "हस्ताक्षर कर सूचना जारी करें (DSC)") : tx("Sign with DSC token (demo)", "DSC टोकन से हस्ताक्षर (डेमो)"))} <Kbd k="↵" />
          </button>
        </div>
        {err && (
          <div className="error-box" style={{ marginTop: 8 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- after the decision
function minutesSince(ts?: string | null) {
  if (!ts) return Infinity;
  return (Date.now() - Date.parse(ts)) / 60000;
}

function CallbackBox({ app, analysis, role, ts, onCalledBack, open, setOpen }: { app: Application; analysis: Analysis; role: Role; ts?: string | null; onCalledBack: () => void; open: boolean; setOpen: (v: boolean) => void }) {
  const { tx } = useI18n();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const left = CALLBACK_MIN - minutesSince(ts);
  if (!open || !(left > 0)) return null;
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      await api.callback(app.app_id, reason.trim(), role, analysis.office.en);
      onCalledBack();
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="callback stack" style={{ gap: 6 }}>
      <label className="small" htmlFor="cb-reason" style={{ fontWeight: 600 }}>
        {tx("Reason for calling back (required, logged)", "वापस लेने का कारण (आवश्यक, ऑडिट में दर्ज)")}
      </label>
      <input id="cb-reason" className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tx("e.g. signed the wrong file", "जैसे गलत प्रकरण पर हस्ताक्षर")} onKeyDown={(e) => e.key === "Enter" && reason.trim().length >= MIN_CALLBACK && go()} />
      <div className="row">
        <button className="btn blue sm" disabled={busy || reason.trim().length < MIN_CALLBACK} onClick={go} id="callback-confirm">
          ↶ {tx("Call back", "वापस लें")}
        </button>
        <button className="btn secondary sm" onClick={() => setOpen(false)}>
          {tx("Cancel", "रद्द करें")}
        </button>
        <span className="small muted">
          {reason.trim().length}/{MIN_CALLBACK}+
        </span>
      </div>
      {err && <div className="error-box small">{err}</div>}
    </div>
  );
}

/** Minutes left in the call-back window (ticks every 15 s); 0 when closed. */
function useCallbackLeft(ts?: string | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const left = CALLBACK_MIN - minutesSince(ts);
  return left > 0 ? Math.ceil(left) : 0;
}

function IssuedView({ appId, initial }: { appId: string; initial?: { no?: string; text?: I18n } }) {
  const { tx } = useI18n();
  const [lang, setLang] = useState<Lang>("hi");
  const [doc, setDoc] = useState<{ no?: string; text?: I18n } | null>(initial?.text ? initial : null);
  useEffect(() => {
    if (doc) return;
    api
      .issued(appId)
      .then((d) => setDoc({ no: d.document_no, text: d.text }))
      .catch(() => setDoc({}));
  }, [doc, appId]);
  if (!doc?.text) return <div className="small muted">{tx("Loading…", "लोड हो रहा है…")}</div>;
  return (
    <div>
      <div className="tabs" style={{ marginBottom: 4 }}>
        <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")}>
          हिंदी
        </button>
        <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
          English
        </button>
      </div>
      <pre className="order-preview issued" lang={lang}>
        {doc.text[lang]}
      </pre>
    </div>
  );
}

function Decided({ app, analysis, role, result, onNext, hasNext, onCalledBack }: { app: Application; analysis: Analysis; role: Role; result: DecisionResponse | null; onNext: () => void; hasNext: boolean; onCalledBack: () => void }) {
  const { t, tx, shadow } = useI18n();
  const status = result?.application.status ?? app.status;
  const [issuedTs, setIssuedTs] = useState<string | null>(result?.audit.ts ?? null);
  const [issuedNo, setIssuedNo] = useState<string | undefined>(result?.document_no);
  const [cbOpen, setCbOpen] = useState(false);
  const [showIssued, setShowIssued] = useState(false);
  // Round 5 (P0-1): the citizen message stays reachable from the decided dock (also on a later revisit)
  const [msg, setMsg] = useState<CitizenMessage | null>(result?.citizen_message ?? null);
  const [showMsg, setShowMsg] = useState(false);
  const left = useCallbackLeft(issuedTs);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
    if (result) return;
    let alive = true;
    api
      .issued(app.app_id)
      .then((d) => alive && (setIssuedTs(d.ts), setIssuedNo(d.document_no), setMsg(d.citizen_message ?? null)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [app.app_id, result]);
  const reveal = shadow && result?.tool_check ? <ToolCheckReveal appId={app.app_id} check={result.tool_check} action={result.audit.action.replace(/^decision_/, "")} /> : null;
  const patwari = status === "awaiting_patwari" ? <PatwariStage analysis={analysis} sentTs={result?.patwari?.sent_ts ?? issuedTs} /> : null;
  const drawer =
    cbOpen || showIssued || reveal || patwari || (showMsg && msg && !result) ? (
      <>
        {reveal}
        {patwari}
        {showMsg && msg && !result && (
          <div className="dock-msg" id="dock-msg">
            <WhatsAppPreview msg={msg} />
          </div>
        )}
        <CallbackBox app={app} analysis={analysis} role={role} ts={issuedTs} onCalledBack={onCalledBack} open={cbOpen} setOpen={setCbOpen} />
        {showIssued && <IssuedView appId={app.app_id} initial={result?.issued_text ? { no: result.document_no, text: result.issued_text } : undefined} />}
      </>
    ) : undefined;
  const bar = (
    <>
      <div className="dock-status ready">
        <div className="ds-main">
          ✓ {tx("Decision recorded", "निर्णय दर्ज")}: <b>{t(STATUS_LABEL[status])}</b>
          {issuedNo && (
            <>
              {" "}
              · {tx("issued as", "जारी क्रमांक")} <b className="mono">{issuedNo}</b>
            </>
          )}
        </div>
        {!result && <div className="ds-sub">{tx("Already decided. Use “Reset demo” in the ⋯ menu to replay.", "निर्णय हो चुका है। दोबारा चलाने हेतु ⋯ मेनू से “डेमो रीसेट” करें।")}</div>}
      </div>
      {left > 0 && (
        <button className="btn secondary" onClick={() => setCbOpen((v) => !v)} id="callback-btn" aria-expanded={cbOpen}>
          ↶ {tx(`Call back (${left} min left)`, `वापस लें (${left} मिनट शेष)`)}
        </button>
      )}
      {msg && (
        <button
          className="btn secondary"
          id="view-msg"
          aria-expanded={result ? undefined : showMsg}
          onClick={() => {
            // with a fresh result the message card is already at the top of the page: bring it into view
            if (result) document.getElementById("decided-msg")?.scrollIntoView({ block: "start", behavior: "smooth" });
            else setShowMsg((v) => !v);
          }}
        >
          {!result && showMsg ? tx("Hide message", "संदेश छिपाएं") : tx("View message", "संदेश देखें")}
        </button>
      )}
      <button className="btn secondary" onClick={() => setShowIssued((v) => !v)} id="view-issued" aria-expanded={showIssued}>
        {showIssued ? tx("Hide issued text", "जारी पाठ छिपाएं") : tx("View issued text", "जारी पाठ देखें")}
      </button>
      <button ref={nextRef} className="btn blue sign-btn" onClick={onNext} id="next-case-btn">
        {hasNext ? tx("Next case →", "अगला प्रकरण →") : tx("Back to queue", "कतार पर लौटें")} <Kbd k="J" />
      </button>
    </>
  );
  return <Dock bar={bar} drawer={drawer} tone="ready" />;
}

function ShowCausePending({ app, analysis, role, onBundle, onCalledBack, onNext, hasNext }: { app: Application; analysis: Analysis; role: Role; onBundle: (b: CaseBundle) => void; onCalledBack: () => void; onNext: () => void; hasNext: boolean }) {
  const { tx } = useI18n();
  const sc = analysis.show_cause;
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cbOpen, setCbOpen] = useState(false);
  const [showIssued, setShowIssued] = useState(false);
  const left = useCallbackLeft(sc?.issued_ts);
  async function reply(outcome: "reply_received" | "no_reply") {
    setBusy(true);
    setErr(null);
    try {
      const b = await api.showCauseReply(app.app_id, outcome, outcome === "reply_received" ? summary.trim() || undefined : undefined, role, analysis.office.en);
      onBundle(b);
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  }
  const drawer = (
    <>
      <div className="sc-sim">
        <div className="section-label">{tx("Demo: simulate what happens next", "डेमो: आगे क्या हुआ — अनुकरण")}</div>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={tx("Reply summary (optional), e.g. “Half-brother; different father”", "उत्तर का सारांश (वैकल्पिक)")} />
          <button className="btn blue sm" disabled={busy} onClick={() => reply("reply_received")} id="sc-reply">
            ✉ {tx("Reply received", "उत्तर प्राप्त")}
          </button>
          <button className="btn secondary sm" disabled={busy} onClick={() => reply("no_reply")} id="sc-noreply">
            ⌛ {tx("No reply by due date", "नियत तिथि तक उत्तर नहीं")}
          </button>
        </div>
        {err && <div className="error-box small">{err}</div>}
      </div>
      <CallbackBox app={app} analysis={analysis} role={role} ts={sc?.issued_ts} onCalledBack={onCalledBack} open={cbOpen} setOpen={setCbOpen} />
      {showIssued && <IssuedView appId={app.app_id} />}
    </>
  );
  const bar = (
    <>
      <div className="dock-status todo">
        <div className="ds-main">
          ⚖ {tx("Pre-rejection hearing notice issued", "सुनवाई सूचना जारी")} <span className="mono">{sc?.no ?? "—"}</span> · {tx("reply due", "उत्तर देय")} <b>{sc?.reply_due}</b>
        </div>
        <div className="ds-sub">
          {tx("No final order can be signed until the reply is received or the period lapses.", "उत्तर प्राप्त होने या अवधि बीतने तक अंतिम आदेश पर हस्ताक्षर नहीं हो सकते।")} <SlaClockNote clock={analysis.sla_clock} />
        </div>
      </div>
      {left > 0 && (
        <button className="btn secondary" onClick={() => setCbOpen((v) => !v)} id="callback-btn">
          ↶ {tx(`Call back (${left} min)`, `वापस लें (${left} मिनट)`)}
        </button>
      )}
      <button className="btn secondary" onClick={() => setShowIssued((v) => !v)} id="view-issued">
        {showIssued ? tx("Hide notice", "सूचना छिपाएं") : tx("View notice", "सूचना देखें")}
      </button>
      <button className="btn blue sign-btn" onClick={onNext}>
        {hasNext ? tx("Next case →", "अगला प्रकरण →") : tx("Back to queue", "कतार पर लौटें")} <Kbd k="J" />
      </button>
    </>
  );
  return <Dock bar={bar} drawer={drawer} tone="todo" />;
}

// ---------------------------------------------------------------- Round 4 components
const PSRC: Record<string, I18n> = {
  application: { en: "application", hi: "आवेदन" },
  record: { en: "record (archive)", hi: "अभिलेख (अभिलेखागार)" },
  ration: { en: "ration roster", hi: "राशन सूची" },
  oral: { en: "oral: Kotwar / Sarpanch statement", hi: "मौखिक: कोटवार / सरपंच कथन" },
};

/** Pre-filled vanshavali / field-report form sent with a Patwari reference (P1-B6). */
export function PatwariPreview({ form, compact }: { form: PatwariForm; compact?: boolean }) {
  const { t, tx } = useI18n();
  return (
    <div className={`patwari-form ${compact ? "compact" : ""}`} aria-label={tx("Pre-filled vanshavali form", "पूर्व-भरित वंशावली प्रपत्र")}>
      <div className="pf-head">
        <b>{tx("Vanshavali / field-report form (pre-filled)", "वंशावली / क्षेत्र-प्रतिवेदन प्रपत्र (पूर्व-भरित)")}</b>
        <span>· {t(form.halka.label)}</span>
        <span>· {tx(`report by ${form.report_by} (${form.days} days)`, `प्रतिवेदन ${form.report_by} तक (${form.days} दिन)`)}</span>
        <span className="pill outline small">{t(form.channel)}</span>
      </div>
      <table className="table pf-table">
        <thead>
          <tr>
            <th>{tx("Name", "नाम")}</th>
            <th>{tx("Relation", "संबंध")}</th>
            <th>{tx("Born", "जन्म")}</th>
            <th>{tx("Source", "स्रोत")}</th>
          </tr>
        </thead>
        <tbody>
          {form.rows.map((r, i) => (
            <tr key={i} className={`src-${r.source}`}>
              <td>{r.name ? t(r.name) : <span className="pf-blank">________________</span>}</td>
              <td>{t(r.relation)}</td>
              <td>{r.birth_year ?? "—"}</td>
              <td>
                <span className={`pf-tag ${r.source}`}>{t(PSRC[r.source])}</span>
                {r.detail && <div className="small muted">{t(r.detail)}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="kv small pf-fields">
        {form.fields.map((f) => (
          <div key={f.code} style={{ display: "contents" }}>
            <dt>{t(f.label)}</dt>
            <dd>{t(f.prefill)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PatwariStage({ analysis, sentTs }: { analysis: Analysis; sentTs?: string | null }) {
  const { t, tx } = useI18n();
  const pf = analysis.patwari_form;
  const day = sentTs ? Math.max(0, Math.floor((Date.now() - Date.parse(sentTs)) / 86400000)) : 0;
  const of = pf?.days ?? 7;
  return (
    <div className="patwari-stage">
      <b>{tx(`With the Patwari · day ${day}/${of}`, `पटवारी के पास · ${day}/${of} दिन`)}</b>
      {pf && (
        <span className="small muted">
          {" "}
          · {t(pf.halka.label)} · {tx(`report due ${pf.report_by}`, `प्रतिवेदन देय ${pf.report_by}`)} · {t(pf.channel)}
        </span>
      )}
      <div className="stage-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (100 * Math.max(day, 0.3)) / of)}%` }} />
      </div>
      <SlaClockNote clock={analysis.sla_clock} />
    </div>
  );
}

/** Shadow mode: after the officer's decision, the tool's check is revealed for comparison, with one-tap feedback. */
export function ToolCheckReveal({ appId, check, action }: { appId: string; check: NonNullable<DecisionResponse["tool_check"]>; action: string }) {
  const { t, tx } = useI18n();
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function send(v: "yes" | "no" | "wrong_family") {
    setErr(null);
    try {
      await api.toolFeedback(appId, v);
      setSent(v);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }
  return (
    <div className={`tool-reveal ${check.agrees ? "agree" : "differ"}`} role="status" id="tool-reveal">
      <div>
        <b>{tx("Records check (shown after your decision):", "अभिलेख जांच (आपके निर्णय के बाद):")}</b>{" "}
        {check.agrees ? tx("agrees with your decision", "आपके निर्णय से सहमत") : tx("differs from your decision", "आपके निर्णय से भिन्न")} ·{" "}
        {tx("the check suggested", "जांच का सुझाव")}: <b>{t(ACTION_LABEL[check.suggested_action])}</b>
        {!check.agrees && <span> ({t(ACTION_LABEL[action] ?? { en: action, hi: action })} {tx("was yours", "आपका")})</span>}
        <details className="vd-why" style={{ display: "inline-block", marginLeft: 6 }}>
          <summary>
            <span className="vd-more">{tx("why?", "क्यों?")}</span>
          </summary>
          <p className="small">{t(check.reason)}</p>
        </details>
      </div>
      <div className="row" style={{ gap: 6, marginTop: 4 }}>
        <span className="small">{tx("Was this check useful?", "यह जांच उपयोगी थी?")}</span>
        {(["yes", "no", "wrong_family"] as const).map((v) => (
          <button key={v} className={`chip ${sent === v ? "on" : ""}`} disabled={!!sent} onClick={() => send(v)} id={`fb-${v}`}>
            {v === "yes" ? tx("Yes", "हाँ") : v === "no" ? tx("No", "नहीं") : tx("Wrong family", "गलत परिवार")}
          </button>
        ))}
        <span className="small muted">{sent ? tx("Recorded as tool feedback — never an officer metric.", "उपकरण प्रतिक्रिया के रूप में दर्ज — अधिकारी का मापदंड कभी नहीं।") : tx("Logged as tool feedback, not an officer metric.", "उपकरण प्रतिक्रिया के रूप में दर्ज, अधिकारी का मापदंड नहीं।")}</span>
      </div>
      {err && <div className="error-box small">{err}</div>}
    </div>
  );
}

/** Wrong-authority guard (P0-B5): Approve / Reject disabled; one button forwards to the competent officer. */
function ForwardDock({ app, analysis, onForwarded }: { app: Application; analysis: Analysis; onForwarded?: (b: CaseBundle) => void }) {
  const { t, tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const c = analysis.competence!;
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const b = await api.forward(app.app_id, analysis.office.en);
      onForwarded?.(b);
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  }
  const bar = (
    <>
      <div className="dock-status todo">
        <div className="ds-main">{t(c.message)}</div>
        <div className="ds-sub">{tx("Approve and Reject are disabled on this desk; the audit logs the forward.", "इस डेस्क पर स्वीकृति व अस्वीकृति निष्क्रिय; अग्रेषण ऑडिट में दर्ज होगा।")}</div>
      </div>
      <div className="act-seg" role="radiogroup" aria-label={tx("Your action", "आपकी कार्यवाही")}>
        {ACTIONS.map((a) => (
          <button key={a} role="radio" aria-checked={false} className={a} disabled title={tx("Not your competence", "आपकी सक्षमता नहीं")}>
            <span className="i">{ACTION_ICON[a]}</span>
            <span className="t">{t(ACTION_LABEL[a])}</span>
          </button>
        ))}
      </div>
      <button className="btn blue sign-btn" onClick={go} disabled={busy} id="forward-btn">
        {busy ? <span className="spinner" /> : "→"} {tx(`Forward to ${c.forward_label?.en ?? "SDO (Revenue)"}`, `${c.forward_label?.hi ?? "अनुविभागीय अधिकारी (राजस्व)"} को अग्रेषित करें`)}
      </button>
    </>
  );
  return <Dock bar={bar} drawer={err ? <div className="error-box small">{err}</div> : undefined} tone="todo" />;
}

/** Round 6 (P2): a file of another SDO sub-division opened on this desk — no decision here; forward it (logged). */
function OtherDeskDock({ app, analysis, sd, onRouted }: { app: Application; analysis: Analysis; sd: Subdivision; onRouted?: () => void }) {
  const { t, tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      await api.routeDesk(app.app_id, analysis.office.en);
      onRouted?.();
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  }
  const bar = (
    <>
      <div className="dock-status todo">
        <div className="ds-main">{tx(`Belongs to ${sd.office.en} — forward`, `${sd.office.hi} की फ़ाइल — अग्रेषित करें`)}</div>
        <div className="ds-sub">{tx("Not your sub-division: no decision on this desk, and your sign tray refuses it. The audit logs the forward.", "आपका अनुविभाग नहीं: इस डेस्क पर निर्णय नहीं, और आपकी हस्ताक्षर ट्रे इसे नहीं लेगी। अग्रेषण ऑडिट में दर्ज होगा।")}</div>
      </div>
      <div className="act-seg" role="radiogroup" aria-label={tx("Your action", "आपकी कार्यवाही")}>
        {ACTIONS.map((a) => (
          <button key={a} role="radio" aria-checked={false} className={a} disabled title={tx("Another sub-division's file", "दूसरे अनुविभाग की फ़ाइल")}>
            <span className="i">{ACTION_ICON[a]}</span>
            <span className="t">{t(ACTION_LABEL[a])}</span>
          </button>
        ))}
      </div>
      <button className="btn blue sign-btn" onClick={go} disabled={busy} id="route-desk-btn">
        {busy ? <span className="spinner" /> : "→"} {tx(`Forward to ${sd.office.en}`, `${sd.office.hi} को अग्रेषित करें`)}
      </button>
    </>
  );
  return <Dock bar={bar} drawer={err ? <div className="error-box small">{err}</div> : undefined} tone="todo" />;
}
