import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Analysis, Application, EvidenceRow, LineageMatch } from "../api/types";
import { fmtDate, Kbd, Tick } from "./common";
import { buildRows, Diff, sameText, type Row } from "./compare";
import Waterfall from "./Waterfall";
import FamilyGraph from "./FamilyGraph";
import { CertificateIllustration } from "../illustrations";

export interface DisposeTarget {
  cert_no: string;
  decision: "same" | "not";
}

interface Props {
  app: Application;
  analysis: Analysis;
  matches: LineageMatch[];
  /** certificates the officer confirmed (from the backend: analysis.confirmed_cert_nos) */
  confirmed: Set<string>;
  /** certificates relied on as evidence (confirmed, or declared by the applicant and matched) */
  accepted: Set<string>;
  decided: boolean;
  evidenceRows: EvidenceRow[];
  /** the grounds popover that is open (C / N or a click), owned by the case view */
  active: DisposeTarget | null;
  setActive: (t: DisposeTarget | null) => void;
  onDispose: (certNo: string, decision: "same" | "not", grounds: string[], note: string) => Promise<void>;
  onClear: (certNo: string) => Promise<void>;
  /** Round 6 (P1): the record on screen, owned by the case view — the C / N keys act on exactly this record */
  idx: number;
  setIdx: (i: number) => void;
  /** Round 6: the C / N keys are live for the record on screen (focus ring + hint when several records) */
  keysLive: boolean;
}

export default function LineageCard({ app, analysis, matches, confirmed, accepted, decided, evidenceRows, active, setActive, onDispose, onClear, idx, setIdx, keysLive }: Props) {
  const { t, tx, lang, shadow } = useI18n();
  const [busy, setBusy] = useState(false);
  const [clearErr, setClearErr] = useState<string | null>(null);
  // follow the active popover to its match
  useEffect(() => {
    if (!active) return;
    const i = matches.findIndex((m) => m.certificate.cert_no === active.cert_no);
    if (i >= 0 && i !== idx) setIdx(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.cert_no]);
  const m = matches[Math.min(idx, matches.length - 1)];
  const c = m.certificate;
  useEffect(() => setClearErr(null), [c.cert_no]);
  const isConfirmed = confirmed.has(c.cert_no);
  const isAccepted = accepted.has(c.cert_no);
  const disp = m.disposition ?? null;
  const declaredByApplicant = !!m.declared && !m.kendra_attached && !m.citizen_attached;
  const problem = m.validity_headline ?? null;
  const reviewOnly = m.validity_severity === "review";
  const v = Object.fromEntries(m.validity.map((x) => [x.code, x]));
  const relLabel = t(m.relation_label);

  // ---------- comparison rows: disagreements first (max 5 + context); never truncated ----------
  const rows: Row[] = buildRows(app, m, { t, tx, lang });

  // ---------- one-line validity strip ----------
  const bad = (code: string) => v[code] && !v[code].ok;
  const strip: { k: string; text: string; bad: boolean }[] = [
    { k: "qr", text: c.qr_verified ? tx("QR verified", "QR सत्यापित") : tx("QR not verified", "QR सत्यापित नहीं"), bad: !c.qr_verified },
    { k: "perm", text: c.cert_type === "permanent" ? tx("Permanent", "स्थायी") : tx("Temporary", "अस्थायी"), bad: bad("permanent") },
    { k: "status", text: c.status === "active" ? tx("Active", "सक्रिय") : c.status === "cancelled" ? tx("Cancelled", "निरस्त") : tx("Under scrutiny", "जांचाधीन"), bad: bad("not_cancelled") },
    { k: "auth", text: `${t(c.issuing_authority)} · ${fmtDate(c.issue_date, lang)}`, bad: bad("competent_authority") || bad("issue_date_valid") },
  ];

  void evidenceRows; // shown once, in the verdict card and the side column (round 3)
  const pct = Math.round(m.match_probability * 100);
  const strength = m.match_level === "exact" ? tx("strong link", "प्रबल कड़ी") : tx("possible link", "संभावित कड़ी");
  const source = declaredByApplicant
    ? tx("Declared by the applicant (Form 2A) — matched in the archive", "आवेदक द्वारा घोषित (फॉर्म 2A) — अभिलेखागार में मिलान")
    : m.kendra_attached
      ? tx("Attached by the Kendra after an archive search — needs your confirmation", "केंद्र द्वारा अभिलेखागार खोज के बाद संलग्न — आपकी पुष्टि आवश्यक")
      : m.citizen_attached
        ? tx("Cited by the applicant on the citizen portal (masked archive search) — needs your confirmation", "आवेदक द्वारा नागरिक पोर्टल पर बताया (मास्क्ड अभिलेखागार खोज) — आपकी पुष्टि आवश्यक")
      : m.found_via === "native_village"
        ? tx(`Found by the native (maiden) village search — ${c.village.en}, ${c.district.en}`, `मायके / मूल गांव की खोज से मिला — ${c.village.hi}, ${c.district.hi}`)
        : tx("Found in the archive by the system", "सिस्टम द्वारा अभिलेखागार में मिला");
  const popOpen = !!active && active.cert_no === c.cert_no;
  const grounds = (code: string) => t(analysis.grounds_catalogue?.[disp?.decision === "not" ? "not" : "same"]?.find((g) => g.code === code)?.label) || code;

  async function doClear() {
    setBusy(true);
    setClearErr(null);
    try {
      await onClear(c.cert_no);
    } catch (e) {
      // e.g. the file was decided meanwhile in another tab: say why nothing changed (never an unhandled rejection)
      setClearErr(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card lineage fade-in ${problem ? "has-problem" : ""} ${disp?.decision === "not" ? "dismissed" : ""}`} id="lineage-card">
      <div className="lineage-head">
        <CertificateIllustration size={34} ok={m.usable_as_evidence} />
        <div>
          {problem ? (
            <h2 className={`problem-title ${reviewOnly ? "review" : ""}`}>⚠ {t(problem)}</h2>
          ) : (
            <h2>
              {relLabel}: {t(c.holder_name)}
            </h2>
          )}
          <span className="src-label">
            {source} · <span className="mono">{c.cert_no}</span>
          </span>
        </div>
        {!shadow && <div
          className={`prob-badge ${problem || m.match_level === "possible" ? "muted" : ""}`}
          title={tx(
            "How strongly the model links the two records. On test data about 1 in 10 strong links were wrong: the link is not proof of relationship.",
            "मॉडल दोनों अभिलेखों को कितनी प्रबलता से जोड़ता है। परीक्षण डेटा पर लगभग 10 में 1 प्रबल कड़ी गलत थी: कड़ी संबंध का प्रमाण नहीं है।",
          )}
        >
          <b>{strength}</b>
        </div>}
      </div>

      <div className="vstrip" aria-label={tx("Certificate validity", "प्रमाण पत्र की वैधता")}>
        {strip.map((s, i) => (
          <span key={s.k} className={s.bad ? "bad" : ""}>
            {i > 0 && <span className="sep">·</span>}
            {s.text}
          </span>
        ))}
      </div>

      {matches.length > 1 && (
        <div className="match-tabs-row">
          <div className="seg match-tabs" role="tablist" aria-label={tx("Family records found", "मिले पारिवारिक अभिलेख")}>
            {matches.map((mm, i) => (
              <button
                key={mm.certificate.cert_no}
                role="tab"
                aria-selected={i === idx}
                tabIndex={i === idx ? 0 : -1}
                data-match-tab={i}
                className={`${i === idx ? "on" : ""} ${i === idx && keysLive ? "key-target" : ""}`}
                onClick={() => setIdx(i)}
                title={tx("←/→ or Tab: switch record · C / N act on the record shown", "←/→ या Tab: अभिलेख बदलें · C / N दिखाए गए अभिलेख पर")}
              >
                {mm.disposition ? (mm.disposition.decision === "same" ? "✓ " : "✗ ") : analysis.disposition_required?.includes(mm.certificate.cert_no) || analysis.pending_cert_nos?.includes(mm.certificate.cert_no) ? "⚑ " : ""}
                {t(mm.relation_label)} · {mm.certificate.cert_no.split("/").slice(-2).join("/")}
              </button>
            ))}
          </div>
          {keysLive && (
            <span className="key-hint small" id="key-target-hint" aria-live="polite">
              <Kbd k="C" />/<Kbd k="N" /> → {t(m.relation_label)} · {c.cert_no.split("/").slice(-2).join("/")} <span className="muted">· <Kbd k="←" /><Kbd k="→" /> {tx("switch", "बदलें")}</span>
            </span>
          )}
        </div>
      )}

      {/* Round 5 (P0-3): the same family / not this family pair sits above the comparison, so it is on screen
          (above the sticky dock) at a 1366×657 browser window without scrolling */}
      <div className={`confirm-row ${keysLive && matches.length > 1 && !disp ? "key-target-row" : ""}`} id="confirm-row" data-cert={c.cert_no}>
        {decided ? (
          disp ? (
            <span className={`checked-badge ${disp.decision === "not" ? "neutral" : ""}`}>
              {disp.decision === "same" ? "✓ " + tx("Same family — recorded by you", "वही परिवार — आपके द्वारा दर्ज") : "✗ " + tx("Not this family — recorded by you", "यह परिवार नहीं — आपके द्वारा दर्ज")}
            </span>
          ) : null
        ) : disp ? (
          <>
            <span className={`checked-badge ${disp.decision === "not" ? "neutral" : ""}`}>
              {disp.decision === "same"
                ? "✓ " + (isAccepted ? tx("Same family — relied on as evidence", "वही परिवार — साक्ष्य के रूप में मान्य") : tx("Same family — recorded (not relied on: see above)", "वही परिवार — दर्ज (आधार नहीं: ऊपर देखें)"))
                : "✗ " + tx("Not this family — removed from evidence", "यह परिवार नहीं — साक्ष्य से हटाया")}
              <span className="grounds-inline">
                {disp.grounds.map(grounds).join(" · ")}
                {disp.note ? ` · “${disp.note}”` : ""}
              </span>
            </span>
            <button className="btn secondary sm" disabled={busy} onClick={doClear} id="undo-disp">
              ↶ {tx("Undo", "पूर्ववत करें")}
            </button>
            {clearErr && <span className="error-box small">{clearErr}</span>}
          </>
        ) : popOpen ? (
          <GroundsPop key={active!.decision + c.cert_no} analysis={analysis} m={m} decision={active!.decision} onCancel={() => setActive(null)} onCommit={(g, n) => onDispose(c.cert_no, active!.decision, g, n)} />
        ) : (
          <>
            {isAccepted && declaredByApplicant ? (
              <span className="checked-badge neutral">✓ {tx("Declared by applicant & matched — no confirmation needed", "आवेदक द्वारा घोषित व मिलान — पुष्टि आवश्यक नहीं")}</span>
            ) : (
              <button className="btn decide-pair" onClick={() => setActive({ cert_no: c.cert_no, decision: "same" })} id="same-family-btn">
                ✓ {tx("Same family", "वही परिवार")} <Kbd k="C" />
              </button>
            )}
            <button className={`btn ${isAccepted && declaredByApplicant ? "secondary sm" : "decide-pair"}`} onClick={() => setActive({ cert_no: c.cert_no, decision: "not" })} id="not-family-btn">
              ✗ {tx("Not this family", "यह परिवार नहीं")} <Kbd k="N" />
            </button>
            {!isAccepted && (
              <span className="muted small pair-hint">
                {m.usable_as_evidence || (m.match_level === "possible" && !problem)
                  ? tx("Only you can decide this is the applicant's relative; the model only links records.", "यह आवेदक का संबंधी है, यह केवल आप तय कर सकते हैं; मॉडल केवल अभिलेख जोड़ता है।")
                  : reviewOnly
                    ? tx("Not counted as caste proof until verified — record whether it is the family.", "सत्यापन तक जाति प्रमाण नहीं — दर्ज करें कि यह परिवार है या नहीं।")
                    : tx("Not usable as proof — record whether it is the family (the order will say).", "प्रमाण हेतु उपयोग योग्य नहीं — दर्ज करें कि यह परिवार है या नहीं (आदेश में लिखा जाएगा)।")}
              </span>
            )}
          </>
        )}
      </div>

      <div className="sbs cmp" style={{ marginTop: 8 }} role="table" aria-label={tx("Application compared with the archived certificate", "आवेदन व संग्रहित प्रमाण पत्र का मिलान")}>
        <div className="hd">{tx("Compared", "मिलान")}</div>
        <div className="hd">{tx("Application", "आवेदन")}</div>
        <div className="hd cert">{tx("Archived certificate", "संग्रहित प्रमाण पत्र")}</div>
        {rows.map((r) => (
          <CompareRow key={r.key} r={r} />
        ))}
      </div>

      {!shadow && <details className="why">
        <summary>{tx(`Why? How the records were linked (model: ${strength})`, `क्यों? अभिलेख कैसे जोड़े गए (मॉडल: ${strength})`)}</summary>
        <div className="lineage-lower">
          <div className="subpanel">
            <Waterfall prior={m.prior_weight} weights={m.weights} probability={m.match_probability} />
            <p className="small muted" style={{ marginTop: 8 }}>
              {tx("A model link is not proof of relationship. On synthetic test data about 1 in 10 'strong' links were wrong.", "मॉडल की कड़ी संबंध का प्रमाण नहीं है। सिंथेटिक परीक्षण डेटा पर लगभग 10 में 1 'प्रबल' कड़ी गलत थी।")}
            </p>
          </div>
          <div className="subpanel">
            <h3>{tx("Family graph", "पारिवारिक ग्राफ़")}</h3>
            <FamilyGraph app={app} matches={matches} confirmed={confirmed} />
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 6 }}>
          {tx(`Model link probability: ${pct}% — on test data about 9 in 10 strong links were right; you decide the relationship.`, `मॉडल कड़ी संभाव्यता: ${pct}% — परीक्षण में ऐसी कड़ियाँ लगभग 10 में 9 सही; संबंध आप तय करते हैं।`)}
        </p>
      </details>}
      <details className="why">
        <summary>{tx(`All validity checks (${m.validity.filter((x) => x.ok).length}/${m.validity.length} pass)`, `सभी वैधता जांच (${m.validity.length} में से ${m.validity.filter((x) => x.ok).length} सही)`)}</summary>
        <div className="validity">
          {m.validity.map((x) => (
            <div key={x.code} className={`vcheck ${x.ok ? "" : "bad"}`}>
              <Tick ok={x.ok} />
              <div>
                <b>{t(x.label)}</b>
                <small>{t(x.detail)}</small>
              </div>
            </div>
          ))}
        </div>
      </details>
      {isConfirmed && null}
    </section>
  );
}

export function GroundsPop({ analysis, m, decision, onCancel, onCommit }: { analysis: Analysis; m: LineageMatch; decision: "same" | "not"; onCancel: () => void; onCommit: (grounds: string[], note: string) => Promise<void> }) {
  const { t, tx } = useI18n();
  const cat = analysis.grounds_catalogue?.[decision] ?? [];
  const [sel, setSel] = useState<string[]>(decision === "same" ? (m.default_grounds ?? []) : []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = decision === "same" ? sel.length > 0 || note.trim().length >= 10 : sel.length > 0 || note.trim().length >= 10;
  const btn = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Round 6: keep the keyboard inside the popover — "Record" when it is ready, else the first ground chip
    const target = btn.current && !btn.current.disabled ? btn.current : root.current?.querySelector<HTMLButtonElement>(".chip");
    target?.focus({ preventScroll: true });
    root.current?.closest(".confirm-row")?.scrollIntoView({ block: "nearest" });
  }, []);
  async function commit() {
    if (!ok || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onCommit(sel, note.trim());
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
      setBusy(false);
    }
  }
  return (
    <div
      ref={root}
      className={`grounds-pop ${decision}`}
      role="dialog"
      aria-label={decision === "same" ? tx("Grounds: same family", "आधार: वही परिवार") : tx("Grounds: not this family", "आधार: यह परिवार नहीं")}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        } else if (e.key === "Enter" && !(e.target instanceof HTMLElement && e.target.classList.contains("gp-cancel"))) {
          // Enter records (also right after clicking a chip); only the Cancel button keeps its own Enter
          e.preventDefault();
          void commit();
        }
      }}
    >
      <div className="gp-title">
        {decision === "same" ? "✓ " + tx("Same family — your grounds (go into the order)", "वही परिवार — आपके आधार (आदेश में जाएंगे)") : "✗ " + tx("Not this family — your grounds (go into the order)", "यह परिवार नहीं — आपके आधार (आदेश में जाएंगे)")}
      </div>
      <div className="gp-chips">
        {cat.map((g) => (
          <button key={g.code} type="button" className={`chip ${sel.includes(g.code) ? "on" : ""}`} aria-pressed={sel.includes(g.code)} onClick={() => setSel((cur) => (cur.includes(g.code) ? cur.filter((x) => x !== g.code) : [...cur, g.code]))}>
            {sel.includes(g.code) ? "✓ " : ""}
            {t(g.label)}
          </button>
        ))}
      </div>
      <input className="input gp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx("Note (optional), e.g. ration card shows her in his household", "टिप्पणी (वैकल्पिक)")} />
      <div className="row" style={{ marginTop: 6 }}>
        <button ref={btn} className="btn sm blue" disabled={!ok || busy} onClick={commit} id="grounds-commit">
          {busy ? <span className="spinner" /> : decision === "same" ? "✓" : "✗"} {tx("Record", "दर्ज करें")} <Kbd k="↵" />
        </button>
        <button className="btn secondary sm gp-cancel" onClick={onCancel}>
          {tx("Cancel", "रद्द करें")} <Kbd k="Esc" />
        </button>
        <span className="small muted">{tx("You can undo until you sign.", "हस्ताक्षर तक पूर्ववत कर सकते हैं।")}</span>
      </div>
      {err && <div className="error-box small">{err}</div>}
    </div>
  );
}

function CompareRow({ r }: { r: Row }) {
  const { tx } = useI18n();
  const look = r.state === "variant" || r.state === "differs";
  const full = r.state === "differs" ? `≠ ${r.note ?? tx("differs", "भिन्न")}` : r.state === "variant" ? `≈ ${r.note ?? tx("spelling variant (same name)", "वर्तनी भिन्न (वही नाम)")}` : r.state === "agree" ? `= ${r.note ?? tx("same", "समान")}` : "";
  const tag = r.state === "differs" ? `≠ ${r.note ?? tx("differs", "भिन्न")}` : r.state === "variant" ? `≈ ${r.note ?? tx("spelling variant", "वर्तनी भिन्न")}` : r.state === "agree" ? "=" : "";
  // where the officer must look: diff both scripts; when the main script is identical, the other script carries the difference
  const mainSame = sameText(r.a, r.b);
  const altDiffers = !!(r.aAlt && r.bAlt && !sameText(r.aAlt, r.bAlt));
  const cell = (v: string, alt: string | undefined, vOther: string, altOther: string | undefined, _isCert: boolean) => {
    if (look && r.names) {
      return (
        <span className="cv">
          <b>{mainSame ? v : <Diff s={v} other={vOther} />}</b>
          {alt && (
            <span className={`cv-alt ${mainSame && altDiffers ? "strong" : ""}`}>
              {altDiffers ? <Diff s={alt} other={altOther ?? ""} /> : alt}
            </span>
          )}
        </span>
      );
    }
    if (look) {
      // not a name: the whole value differs — no character marks, the amber row carries it
      return (
        <span className="cv">
          <b>{v}</b>
          {alt && <span className="cv-alt">{alt}</span>}
        </span>
      );
    }
    return (
      <span className="cv">
        <b>{v}</b>
        {alt && <span className="alt-inline"> · {alt}</span>}
      </span>
    );
  };
  return (
    <>
      <div className={`lbl ${r.state}`} title={full ? `${r.label} — ${full}` : r.label}>
        <span>{r.label}</span>
        {tag && (
          <span className={`match-tag ${r.state}`} aria-label={full}>
            {tag}
          </span>
        )}
      </div>
      <div className={`val ${r.state}`}>{cell(r.a, r.aAlt, r.b, r.bAlt, false)}</div>
      <div className={`val ${r.state}`}>{cell(r.b, r.bAlt, r.a, r.aAlt, true)}</div>
    </>
  );
}
