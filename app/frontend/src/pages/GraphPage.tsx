import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { GRAPH_APPS, insights, type FamilyGraph, type GraphNode, type Integrity } from "../api/insights";
import { ErrorBox, fmtNum, Loading, useAsync } from "../components/common";
import FamilyNetwork from "../components/FamilyNetwork";

const SIGNAL_ICON: Record<string, string> = { category_conflict: "⇄", cancelled_relative: "⊘", duplicate_identity: "⧉", tehsildar_permanent: "§" };
const DEFAULT_APP = "SS/2026/KDG/08812";

/** Round 8a: परिवार नेटवर्क · Family graph (SYNTHETIC) — one application's 3-generation family + statewide integrity signals. */
export default function GraphPage() {
  const { t, tx, lang } = useI18n();
  const [sp, setSp] = useSearchParams();
  const appId = sp.get("app") || DEFAULT_APP;
  const fam = useAsync<FamilyGraph>(() => insights.family(appId), [appId]);
  const integ = useAsync<Integrity>(() => insights.integrity(), []);
  const [hl, setHl] = useState<string[]>([]);
  const [sel, setSel] = useState<GraphNode | null>(null);

  useEffect(() => {
    setSel(null);
    setHl(fam.data?.signals[0]?.node_ids ?? []);
  }, [fam.data]);

  const pick = (id: string) => setSp(id === DEFAULT_APP ? {} : { app: id }, { replace: true });
  const g = fam.data;
  const certs = useMemo(() => (g ? g.nodes.filter((n) => n.kind === "cert") : []), [g]);

  return (
    <div className="fade-in stack" style={{ gap: 18 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-title">{tx("Family network · परिवार नेटवर्क", "परिवार नेटवर्क · Family graph")}</div>
          <div className="page-sub">
            {tx("Three generations, their certificates, and the record the file relies on. Integrity signals need a look; they are never findings.", "तीन पीढ़ियाँ, उनके प्रमाण पत्र, और वह अभिलेख जिस पर प्रकरण निर्भर है। सत्यनिष्ठा संकेत देखने योग्य हैं; वे कभी निष्कर्ष नहीं।")}
          </div>
        </div>
        <span className="spacer" />
        <span className="badge-synth">{tx("SYNTHETIC", "सिंथेटिक")}</span>
      </div>

      <div className="row fnet-picker" role="group" aria-label={tx("Application", "आवेदन")}>
        {GRAPH_APPS.map((a) => (
          <button key={a.id} className={`pill ${a.id === appId ? "orange" : "outline"}`} onClick={() => pick(a.id)} aria-pressed={a.id === appId}>
            <b>{a.id.slice(-5)}</b> {t(a.name)} <span className="muted small">· {t(a.hint)}</span>
          </button>
        ))}
      </div>

      <div className="fnet-grid">
        <section className="card" style={{ minWidth: 0 }}>
          <div className="card-title">
            {g ? t(g.applicant.name) : "…"}
            <span className="sub">{appId} · {g?.family_id}</span>
            <span className="spacer" />
            <Link className="btn secondary sm" to={`/officer/case/${encodeURIComponent(appId)}`}>
              {tx("Open file", "प्रकरण खोलें")} →
            </Link>
          </div>
          {fam.loading && !g ? <Loading /> : fam.error ? <ErrorBox error={fam.error} /> : g ? <FamilyNetwork g={g} highlight={hl} onSelect={setSel} /> : null}
          <div className="fnet-legend small muted">
            <span><i className="lg applicant" /> {tx("applicant", "आवेदक")}</span>
            <span><i className="lg person" /> {tx("family (register)", "परिवार (रजिस्टर)")}</span>
            <span><i className="lg nameonly" /> {tx("name only, no record", "केवल नाम, अभिलेख नहीं")}</span>
            <span><i className="lg relied" /> {tx("record relied on", "जिस अभिलेख पर निर्भर")}</span>
            <span><i className="lg candidate" /> {tx("found, awaiting officer", "मिला, अधिकारी की पुष्टि शेष")}</span>
            <span><i className="lg warn" /> {tx("cancelled / needs a look", "निरस्त / देखना आवश्यक")}</span>
            <span><i className="lg matchline" /> {tx("model's link (officer decides)", "मॉडल की कड़ी (निर्णय अधिकारी का)")}</span>
          </div>
          {g && <p className="small muted" style={{ marginTop: 8 }}>{t(g.note)}</p>}
        </section>

        <aside className="stack" style={{ gap: 12, minWidth: 0 }}>
          {g && (
            <section className="card tight">
              <div className="small muted">{tx("Claimed", "दावा")}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {g.applicant.claimed_category ?? tx("Domicile", "मूल निवास")} · {t(g.applicant.village)}, {t(g.applicant.district)}
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                <b>{tx("Record relied on", "निर्भर अभिलेख")}:</b>{" "}
                {g.records_used.length ? g.records_used.join(", ") : <span className="muted">{g.records_found.length ? tx("none yet — the officer must confirm “same family”", "अभी नहीं — अधिकारी “एक ही परिवार” की पुष्टि करें") : tx("none — standard review", "कोई नहीं — सामान्य जांच")}</span>}
              </div>
              <div className="small" style={{ marginTop: 4 }}>
                <b>{tx("Certificates in the tree", "वृक्ष में प्रमाण पत्र")}:</b> {certs.length}
              </div>
            </section>
          )}
          {g && (
            <section className="card tight">
              <div className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>{tx("Signals in this family", "इस परिवार में संकेत")}</div>
              {g.signals.length === 0 ? (
                <div className="small muted">{tx("Nothing that needs a look.", "देखने योग्य कुछ नहीं।")}</div>
              ) : (
                g.signals.map((s, i) => (
                  <button key={i} className={`fnet-signal ${hl.join() === s.node_ids.join() ? "on" : ""}`} onClick={() => setHl(s.node_ids)}>
                    <span className="ic">{SIGNAL_ICON[s.code] ?? "•"}</span>
                    <span>
                      <b>{t(s.title)}</b>
                      <span className="small muted" style={{ display: "block" }}>{t(s.detail)}</span>
                    </span>
                  </button>
                ))
              )}
              <div className="small muted" style={{ marginTop: 6 }}>{tx("Needs a look, not a finding. The officer decides.", "देखना आवश्यक, निष्कर्ष नहीं। निर्णय अधिकारी का।")}</div>
            </section>
          )}
          <section className="card tight">
            <div className="small muted">{tx("Selected", "चयनित")}</div>
            {sel ? <NodeDetail n={sel} /> : <div className="small muted">{tx("Tap a person or certificate. Drag to pan, scroll to zoom.", "किसी व्यक्ति या प्रमाण पत्र पर टैप करें। खिसकाने हेतु खींचें, ज़ूम हेतु स्क्रॉल करें।")}</div>}
          </section>
        </aside>
      </div>

      <section className="card" id="integrity">
        <div className="card-title">
          {tx("Integrity signals across the archive", "पूरे अभिलेखागार में सत्यनिष्ठा संकेत")}
          <span className="sub">{tx("district level · category labels only", "जिला स्तर · केवल श्रेणी लेबल")}</span>
          <span className="spacer" />
          <span className="badge-synth">{tx("SYNTHETIC", "सिंथेटिक")}</span>
        </div>
        {integ.loading && !integ.data ? <Loading /> : integ.error ? <ErrorBox error={integ.error} /> : integ.data ? (
          <IntegrityPanel d={integ.data} onApp={(id) => { pick(id); window.scrollTo({ top: 0, behavior: "smooth" }); }} lang={lang} />
        ) : null}
      </section>
    </div>
  );
}

function NodeDetail({ n }: { n: GraphNode }) {
  const { t, tx } = useI18n();
  if (n.kind === "cert") {
    const use = n.use === "relied" ? tx("relied on in this file", "इस प्रकरण में निर्भर") : n.use === "candidate" ? tx("found by the model — awaiting the officer", "मॉडल द्वारा मिला — अधिकारी की पुष्टि शेष") : n.use === "dismissed" ? tx("officer: not this family", "अधिकारी: यह परिवार नहीं") : tx("in the family tree, not linked to this file", "वंश-वृक्ष में, इस प्रकरण से जुड़ा नहीं");
    const st = n.status === "active" ? tx("active", "सक्रिय") : n.status === "cancelled" ? tx("cancelled", "निरस्त") : tx("under scrutiny", "जांचाधीन");
    return (
      <div className="small">
        <div style={{ fontWeight: 700, fontSize: 15 }}>{n.cert_no}</div>
        <div>{n.category ?? tx("Domicile", "मूल निवास")} · {n.cert_type === "permanent" ? tx("permanent", "स्थायी") : tx("temporary", "अस्थायी")} · {n.issue_year}</div>
        <div>{tx("Issued by", "जारीकर्ता")}: {n.authority_role === "Tehsildar" ? tx("Tehsildar", "तहसीलदार") : n.authority_role === "SDO" ? tx("SDO (Revenue)", "अनुविभागीय अधिकारी (राजस्व)") : n.authority_role} · {n.district ? t(n.district) : ""}</div>
        <div>{tx("Status", "स्थिति")}: <b>{st}</b></div>
        <div className="muted">{use}</div>
      </div>
    );
  }
  if (n.kind === "application") {
    return <div className="small"><b>{n.app_id}</b> · {t(n.label)}</div>;
  }
  return (
    <div className="small">
      <div style={{ fontWeight: 700, fontSize: 15 }}>{t(n.label)}</div>
      <div>{n.rel_label ? t(n.rel_label) : ""}{n.birth_year ? ` · ${tx("born", "जन्म")} ${n.birth_year}` : ""}</div>
      <div className="muted">{n.in_register ? tx("in the synthetic population register", "सिंथेटिक जनसंख्या रजिस्टर में") : n.name_only ? tx("name from a record only (no person record)", "केवल अभिलेख में नाम (व्यक्ति अभिलेख नहीं)") : tx("from the application / certificate", "आवेदन / प्रमाण पत्र से")}</div>
    </div>
  );
}

function IntegrityPanel({ d, onApp, lang }: { d: Integrity; onApp: (id: string) => void; lang: "en" | "hi" }) {
  const { t, tx } = useI18n();
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="small muted">
        {fmtNum(d.graph.people, lang)} {tx("people", "व्यक्ति")} · {fmtNum(d.graph.families, lang)} {tx("families", "परिवार")} · {fmtNum(d.graph.certificates, lang)} {tx("certificates", "प्रमाण पत्र")} · {fmtNum(d.graph.edges, lang)} {tx("links in the graph", "ग्राफ़ में कड़ियाँ")}. {t(d.note)}
      </div>
      <div className="fnet-tiles">
        {d.signals.map((s) => (
          <div key={s.code} className="fnet-tile">
            <div className="row" style={{ gap: 8 }}>
              <span className="ic">{SIGNAL_ICON[s.code]}</span>
              <b style={{ fontSize: 15 }}>{t(s.title)}</b>
            </div>
            <div className="v">{fmtNum(s.count, lang)}</div>
            <div className="small muted">
              {fmtNum(s.families, lang)} {tx("families", "परिवार")} · {fmtNum(s.certificates, lang)} {tx("certificates", "प्रमाण पत्र")}
            </div>
            <div className="small" style={{ marginTop: 6 }}>{t(s.explanation)}</div>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              {s.examples.map((e) =>
                e.app_id ? (
                  <button key={e.family_id} className="pill orange" onClick={() => onApp(e.app_id!)} title={e.cert_nos.join(", ")}>
                    {e.app_id.slice(-5)} · {t(e.district)} →
                  </button>
                ) : (
                  <span key={e.family_id} className="pill outline" title={e.cert_nos.join(", ")}>
                    {e.family_id.replace("FAM-", "#")} · {t(e.district)}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{tx("District", "जिला")}</th>
              {d.signals.map((s) => (
                <th key={s.code} className="num" title={t(s.title)}>{SIGNAL_ICON[s.code]} {t(s.title).split(" ").slice(0, 3).join(" ")}</th>
              ))}
              <th className="num">{tx("Total", "कुल")}</th>
            </tr>
          </thead>
          <tbody>
            {d.districts.slice(0, 8).map((r) => (
              <tr key={r.lgd}>
                <td><b>{t(r.name)}</b></td>
                {d.signals.map((s) => (
                  <td key={s.code} className="num">{fmtNum(r[s.code] as number, lang)}</td>
                ))}
                <td className="num"><b>{fmtNum(r.total, lang)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fnet-note small">
        <b>{tx("Detector test", "डिटेक्टर परीक्षण")}:</b>{" "}
        {tx(
          `planted ${d.overlay.planted.category_conflict} category conflicts → found ${d.overlay.found.category_conflict}; planted ${d.overlay.planted.duplicate_identity} duplicate identities → found ${d.overlay.found.duplicate_identity} (+${d.overlay.extra_flags.duplicate_identity} namesakes flagged, which is why these are “look” signals).`,
          `${d.overlay.planted.category_conflict} श्रेणी-भिन्नताएँ जोड़ी गईं → ${d.overlay.found.category_conflict} मिलीं; ${d.overlay.planted.duplicate_identity} दोहरी पहचान जोड़ी गईं → ${d.overlay.found.duplicate_identity} मिलीं (+${d.overlay.extra_flags.duplicate_identity} हमनाम भी चिह्नित — इसीलिए ये केवल “देखें” संकेत हैं)।`,
        )}{" "}
        {t(d.overlay.note)}
        <div style={{ marginTop: 4 }}>{t(d.edges_note)}</div>
      </div>
    </div>
  );
}
