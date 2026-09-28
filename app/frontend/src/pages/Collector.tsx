import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { CollectorTiles, DistrictGeo, EvalResult, MisDistrict, MisSummary, PilotStats, PolicyResponse, PolicyValue, SlaPauseValue } from "../api/types";
import { ErrorBox, fmtNum, LANE_LABEL, Loading, pct, useAsync } from "../components/common";
import DistrictMap from "../components/DistrictMap";
import chartPng from "../assets/rejection_by_service_and_district_2026-09-27.png";

type SortKey = "name" | "total" | "rejected" | "rejection_pct" | "pending_beyond";

const DIVISION_HI: Record<string, string> = { Durg: "दुर्ग", Bastar: "बस्तर", Bilaspur: "बिलासपुर", Surguja: "सरगुजा", Raipur: "रायपुर" };

export default function Collector() {
  const { t, tx, lang } = useI18n();
  const mis = useAsync<MisSummary>(() => api.misSummary(), []);
  const geo = useAsync<DistrictGeo>(() => api.geo(), []);
  const pilot = useAsync<PilotStats>(() => api.pilot(), []);
  const ev = useAsync<EvalResult>(() => api.evalResult(), []);
  const tiles = useAsync<CollectorTiles>(() => api.collectorTiles(), []);
  const policy = useAsync<PolicyResponse>(() => api.policy(), []);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [showPng, setShowPng] = useState(false);

  const districts = useMemo(() => {
    const d = [...(mis.data?.districts ?? [])];
    d.sort((a, b) => {
      const va = sort.k === "name" ? t(a.name) : (a[sort.k] as number);
      const vb = sort.k === "name" ? t(b.name) : (b[sort.k] as number);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
    return d;
  }, [mis.data, sort, t]);

  if (mis.loading && !mis.data) return <Loading />;
  if (mis.error) return <ErrorBox error={mis.error} />;
  const m = mis.data!;
  // share_of_* are already percentages (22.2 = 22.2%) — never multiply by 100 again.
  const isCaste = (s: { key: string; is_caste?: boolean }) => s.is_caste ?? s.key.startsWith("caste");
  const caste = m.services.filter(isCaste);
  const casteVol = m.caste_combined?.share_of_volume ?? caste.reduce((a, s) => a + s.share_of_volume, 0);
  const casteRej = m.caste_combined?.share_of_rejections ?? caste.reduce((a, s) => a + s.share_of_rejections, 0);
  const top = [...m.services].sort((a, b) => b.total - a.total).filter((s) => !isCaste(s)).slice(0, 8);
  const svcData = [...caste, ...top].map((s) => ({
    name: t(s.label),
    key: isCaste(s) ? `caste:${s.key}` : s.key,
    volume: +s.share_of_volume.toFixed(1),
    rejections: +s.share_of_rejections.toFixed(1),
  }));
  const rates = m.districts.map((d) => d.rejection_pct);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);

  const th = (k: SortKey, label: string, num = true) => (
    <th className={`sortable ${num ? "num" : ""}`} onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : k === "name" ? 1 : -1 }))}>
      {label} {sort.k === k ? (sort.dir === 1 ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="fade-in stack" style={{ gap: 22 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-title">{tx("Collector · consistency view", "कलेक्टर · एकरूपता दृश्य")}</div>
          <div className="page-sub">{tx("District and tehsil level only. No officer ranking.", "केवल जिला व तहसील स्तर। किसी अधिकारी की रैंकिंग नहीं।")}</div>
        </div>
      </div>

      {tiles.data && <SupportTiles d={tiles.data} />}

      <div className="data-banner real">
        <span className="badge-real" style={{ background: "#fff", color: "var(--blue)" }}>{tx("REAL", "वास्तविक")}</span>
        {tx("Sewa Setu public MIS · fetched 27-09-2026", "सेवा सेतु सार्वजनिक MIS · प्राप्त 27-09-2026")} · {tx("period", "अवधि")}: {m.period.label ? t(m.period.label) : `${m.period.from ?? "—"} → ${m.period.to}`}
        <span className="spacer" />
        <span style={{ fontWeight: 500, opacity: 0.85 }}>{t(m.source)}</span>
      </div>

      <div className="kpis">
        <div className="kpi blue">
          <div className="v">{fmtNum(m.totals.applications, lang)}</div>
          <div className="l">{tx("applications", "आवेदन")}</div>
        </div>
        <div className="kpi">
          <div className="v">{fmtNum(m.totals.approved, lang)}</div>
          <div className="l">{tx("approved", "स्वीकृत")}</div>
        </div>
        <div className="kpi accent">
          <div className="v">{fmtNum(m.totals.rejected, lang)}</div>
          <div className="l">{tx("rejected", "अस्वीकृत")}</div>
        </div>
        <div className="kpi blue">
          <div className="v">{m.totals.on_time_pct.toFixed(1)}%</div>
          <div className="l">{tx("resolved on time", "समय पर निराकरण")}</div>
        </div>
        <div className="kpi">
          <div className="v">{fmtNum(m.totals.pending_beyond_sla, lang)}</div>
          <div className="l">{tx("pending beyond SLA", "समय-सीमा के बाद लंबित")}</div>
        </div>
      </div>

      <section className="card">
        <div className="card-title">
          {tx("Caste certificates are a small share of volume, but most of the rejections", "जाति प्रमाण पत्र आवेदनों का छोटा हिस्सा, पर अधिकांश अस्वीकृतियाँ")}
          <span className="spacer" />
          <span className="badge-real">{tx("REAL", "वास्तविक")}</span>
        </div>
        <div className="row" style={{ gap: 14, marginBottom: 6 }}>
          <div className="callout">
            <div className="n">
              {casteVol.toFixed(1)}%
              <small>{tx("of all applications", "सभी आवेदनों का")}</small>
            </div>
            <div style={{ fontSize: 26, color: "var(--muted)" }}>→</div>
            <div className="n">
              {casteRej.toFixed(1)}%
              <small>{tx("of all rejections", "सभी अस्वीकृतियों का")}</small>
            </div>
          </div>
          <p className="muted" style={{ maxWidth: 520 }}>
            {tx(
              "SC/ST and OBC certificates together. Hypothesis, not a finding: how many of these applicants have a parent or sibling who already holds a Sewa Setu certificate will be measured with one query in the first week of the shadow pilot.",
              "अ.जा./अ.ज.जा. और अ.पि.व. प्रमाण पत्र मिलाकर। परिकल्पना, निष्कर्ष नहीं: इनमें से कितने आवेदकों के माता-पिता/भाई-बहन के पास पहले से सेवा सेतु प्रमाण पत्र है — शैडो पायलट के पहले सप्ताह में एक क्वेरी से मापा जाएगा।",
            )}
          </p>
        </div>
        <div style={{ height: Math.max(320, svcData.length * 34) }}>
          <ResponsiveContainer>
            <BarChart data={svcData} layout="vertical" margin={{ left: 10, right: 30, top: 6, bottom: 6 }} barGap={2}>
              <CartesianGrid horizontal={false} stroke="#eef2f7" />
              <XAxis type="number" unit="%" tick={{ fontSize: 13 }} />
              <YAxis type="category" dataKey="name" width={lang === "hi" ? 190 : 230} tick={{ fontSize: 13 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 14 }} formatter={(v: string) => <span style={{ color: "var(--ink-2)" }}>{v}</span>} />
              <Bar isAnimationActive={false} dataKey="volume" name={tx("share of applications", "आवेदनों में हिस्सा")} fill="#9fb6dc" radius={[0, 4, 4, 0]} />
              <Bar isAnimationActive={false} dataKey="rejections" fill="#ea580c" name={tx("share of rejections", "अस्वीकृतियों में हिस्सा")} radius={[0, 4, 4, 0]}>
                {svcData.map((d) => (
                  <Cell key={d.key} fill={d.key.startsWith("caste:") ? "#ea580c" : "#fdba74"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="two">
        <section className="card">
          <div className="card-title">
            {tx("Rejection rate by district", "जिलेवार अस्वीकृति दर")}
            <span className="spacer" />
            <span className="badge-real">{tx("REAL", "वास्तविक")}</span>
          </div>
          <p className="muted small" style={{ marginBottom: 6 }}>
            {tx(`Range ${lo.toFixed(1)}%–${hi.toFixed(1)}% under the same rules.`, `एक ही नियमों के अंतर्गत सीमा ${lo.toFixed(1)}%–${hi.toFixed(1)}%।`)}
          </p>
          {geo.data ? <DistrictMap geo={geo.data} districts={m.districts} /> : geo.error ? <ErrorBox error={geo.error} /> : <Loading />}
        </section>
        <section className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-title">
            {tx("Districts", "जिले")}
            <span className="sub">{tx("click a header to sort", "क्रमबद्ध करने हेतु शीर्षक दबाएं")}</span>
          </div>
          <div className="table-wrap" style={{ maxHeight: 600 }}>
            <table className="table">
              <thead>
                <tr>
                  {th("name", tx("District", "जिला"), false)}
                  {th("total", tx("Applications", "आवेदन"))}
                  {th("rejected", tx("Rejected", "अस्वीकृत"))}
                  {th("rejection_pct", tx("Rate", "दर"))}
                  {th("pending_beyond", tx("Beyond SLA", "सीमा पार"))}
                </tr>
              </thead>
              <tbody>
                {districts.map((d: MisDistrict) => (
                  <tr key={d.lgd}>
                    <td>
                      <b>{t(d.name)}</b>
                      <div className="small muted">{lang === "hi" ? (DIVISION_HI[d.division] ?? d.division) : d.division}</div>
                    </td>
                    <td className="num">{fmtNum(d.total, lang)}</td>
                    <td className="num">{fmtNum(d.rejected, lang)}</td>
                    <td className="num">
                      <b>{d.rejection_pct.toFixed(1)}%</b>
                    </td>
                    <td className="num">{fmtNum(d.pending_beyond, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {pilot.data && <PilotPanel p={pilot.data} />}
      {policy.data && <PolicyCard p={policy.data} onChange={(v) => api.setPolicy(v).then((r) => policy.setData(r))} onSlaChange={(v) => api.setSlaPause(v).then((r) => policy.setData(r))} />}
      {ev.data && <EvalPanel e={ev.data} />}

      <section className="card tight">
        <div className="row">
          <b>{tx("About the data", "डेटा के बारे में")}</b>
          <span className="muted small">
            {tx(
              "Service-wise and district-wise counts from the Sewa Setu public MIS, fetched 27-09-2026. Rates are rejected ÷ applications.",
              "सेवा सेतु सार्वजनिक MIS से सेवा-वार व जिला-वार आंकड़े, 27-09-2026 को प्राप्त। दर = अस्वीकृत ÷ आवेदन।",
            )}
          </span>
          <span className="spacer" />
          <button className="btn secondary sm" onClick={() => setShowPng((s) => !s)}>
            {showPng ? tx("Hide source chart", "स्रोत चार्ट छिपाएं") : tx("Show source chart", "स्रोत चार्ट दिखाएं")}
          </button>
        </div>
        {showPng && <img src={chartPng} alt={tx("Rejection by service and district", "सेवा व जिलेवार अस्वीकृति")} style={{ marginTop: 12, borderRadius: 12, border: "1px solid var(--line-cool)" }} />}
      </section>
    </div>
  );
}

/** Round 4 (P1-C4): support tiles — files and tehsils, never officers. Each links to a filtered list of files. */
function SupportTiles({ d }: { d: CollectorTiles }) {
  const { t, tx } = useI18n();
  const tehsils = (files: { tehsil: { en: string; hi: string } }[]) => {
    const m = new Map<string, number>();
    files.forEach((f) => m.set(t(f.tehsil), (m.get(t(f.tehsil)) ?? 0) + 1));
    return [...m.entries()].map(([k, v]) => `${k} ${v}`).join(" · ");
  };
  return (
    <section className="card support-tiles" aria-label={tx("Where files wait", "फ़ाइलें कहाँ रुकी हैं")}>
      <div className="card-title">
        {tx("Where files wait — support, not surveillance", "फ़ाइलें कहाँ रुकी हैं — सहायता, निगरानी नहीं")}
        <span className="sub">{tx("files and tehsils only; no officer names", "केवल फ़ाइलें व तहसील; किसी अधिकारी का नाम नहीं")}</span>
      </div>
      <div className="tiles">
        <Link className="tile" to="/officer?role=sdo&filter=awaiting_patwari" id="tile-patwari">
          <div className="v">{d.awaiting_patwari.count}</div>
          <div className="l">{tx("Awaiting Patwari report", "पटवारी प्रतिवेदन की प्रतीक्षा")}</div>
          <div className="s">
            {tx(`${d.awaiting_patwari.over_7_days} over 7 days`, `${d.awaiting_patwari.over_7_days} — 7 दिन से अधिक`)}
            {d.awaiting_patwari.files.length > 0 && <> · {tehsils(d.awaiting_patwari.files)}</>}
          </div>
        </Link>
        <Link className="tile" to="/officer?role=sdo&filter=awaiting_reply" id="tile-showcause">
          <div className="v">{d.show_cause_pending.count}</div>
          <div className="l">{tx("Hearing notice reply pending", "सुनवाई सूचना उत्तर प्रतीक्षित")}</div>
          <div className="s">{d.show_cause_pending.files.length > 0 ? tehsils(d.show_cause_pending.files) : tx("no file waiting", "कोई फ़ाइल प्रतीक्षा में नहीं")}</div>
        </Link>
        <div className="tile camp" id="tile-camp">
          <div className="v">
            {d.camp.camp_rejection_pct.toFixed(0)}% <small>{tx("vs", "बनाम")} {d.camp.regular_rejection_pct.toFixed(0)}%</small>
          </div>
          <div className="l">{tx("SC/ST certificate rejections: camps vs the regular SC/ST service", "अ.जा./अ.ज.जा. प्रमाण पत्र अस्वीकृति: कैंप बनाम नियमित अ.जा./अ.ज.जा. सेवा")}</div>
          <div className="s">
            <span className="badge-real">{tx("REAL", "वास्तविक")}</span> {t(d.camp.source)} · {d.camp.camp_applications.toLocaleString("en-IN")} {tx("camp applications", "कैंप आवेदन")} · {d.camp.basis ? t(d.camp.basis) : tx("rejected ÷ decided", "अस्वीकृत ÷ निर्णीत")}
          </div>
          <div className="s muted">{tx("A difference, not a cause: why camps reject more is not known from the MIS.", "यह अंतर है, कारण नहीं: कैंप में अधिक अस्वीकृति क्यों है, यह MIS से ज्ञात नहीं।")}</div>
          <div className="s muted">{t(d.camp.roadmap)}</div>
        </div>
        <div className="tile" id="tile-tool">
          <div className="v">{d.tool_disagreements.count}</div>
          <div className="l">{tx("Tool-disagreement files, for rule review", "उपकरण-असहमति फ़ाइलें, नियम सुधार हेतु")}</div>
          <div className="s">
            {tx(`reviewed ${d.tool_disagreements.reviewed} (target: all)`, `समीक्षित ${d.tool_disagreements.reviewed} (लक्ष्य: सभी)`)} · {tx("link right? officer feedback", "मिलान सही? अधिकारी प्रतिक्रिया")}: ✓ {d.tool_feedback.yes} · ✗ {d.tool_feedback.no + d.tool_feedback.wrong_family}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Round 4 (P0-C2): pilot TARGETS and stop rules — measured in the pilot, not results. */
function PilotPanel({ p }: { p: PilotStats }) {
  const { t, tx } = useI18n();
  const raw = [
    { key: "records_complete" as const, v: p.lane_mix.records_complete, c: "#16a34a" },
    { key: "standard_review" as const, v: p.lane_mix.standard_review, c: "#6b84ad" },
    { key: "needs_attention" as const, v: p.lane_mix.needs_attention, c: "#f59e0b" },
  ];
  // Round 5: whole percentages that add up to 100 (largest remainder)
  const floors = raw.map((l) => Math.floor(l.v * 100));
  let short = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((l, i) => [l.v * 100 - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (short-- > 0) floors[i] += 1;
  const lanes = raw.map((l, i) => ({ ...l, v: floors[i] / 100 }));
  return (
    <section className="card" style={{ borderStyle: "dashed", borderColor: "#b9c6dc" }} id="pilot-targets">
      <div className="card-title">
        {tx("Pilot targets & stop rules", "पायलट लक्ष्य व रोक-नियम")}
        <span className="sub">{tx("90-day shadow pilot, 2 tehsils — measured in the pilot, these are not results", "90-दिवसीय शैडो पायलट, 2 तहसील — पायलट में मापा जाएगा, ये परिणाम नहीं हैं")}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(220px, 0.8fr) minmax(360px, 2fr)", alignItems: "start" }}>
        <div>
          <div className="section-label">{tx("Lane mix of the demo queue", "डेमो कतार का श्रेणी मिश्रण")}</div>
          <div style={{ height: 170 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie isAnimationActive={false} data={lanes.map((l) => ({ name: t(LANE_LABEL[l.key]), value: Math.round(l.v * 100) }))} dataKey="value" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="#fff">
                  {lanes.map((l) => (
                    <Cell key={l.key} fill={l.c} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {lanes.map((l) => (
              <div key={l.key} className="row small" style={{ gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.c }} />
                {t(LANE_LABEL[l.key])}
                <span className="spacer" />
                <b>{pct(l.v)}</b>
              </div>
            ))}
            <div className="small muted">{tx("Source: synthetic demo applications", "स्रोत: सिंथेटिक डेमो आवेदन")}</div>
          </div>
        </div>
        <table className="table targets">
          <thead>
            <tr>
              <th>{tx("Measure", "माप")}</th>
              <th>{tx("Target", "लक्ष्य")}</th>
              <th>{tx("Stop rule", "रोक-नियम")}</th>
              <th>{tx("Value", "मान")}</th>
            </tr>
          </thead>
          <tbody>
            {p.targets.map((g) => (
              <tr key={g.metric.en}>
                <td>{t(g.metric)}</td>
                <td>
                  <b>{t(g.target)}</b>
                </td>
                <td className="small">{t(g.stop_rule)}</td>
                <td className="small muted">{tx("measured in the pilot", "पायलट में मापा जाएगा")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        {tx(
          "Agreement with the tool is never an officer metric: in the shadow pilot it is recorded as tool feedback, to improve the rules.",
          "उपकरण से सहमति कभी अधिकारी का मापदंड नहीं: शैडो पायलट में यह उपकरण प्रतिक्रिया के रूप में, नियम सुधार हेतु दर्ज होती है।",
        )}
      </p>
    </section>
  );
}

/** Round 4 (P0-B4): policy setting — the tool follows the department's notification, not its own reading of the ruling. */
function PolicyCard({ p, onChange, onSlaChange }: { p: PolicyResponse; onChange: (v: PolicyValue) => void; onSlaChange: (v: SlaPauseValue) => void }) {
  const { t, tx } = useI18n();
  const cur = p.policy.tehsildar_issued_permanent;
  const sla = p.policy.sla_pause ?? "running";
  return (
    <section className="card" id="policy-card">
      <div className="card-title">
        {tx("Policy setting (Collector / CHiPS admin)", "नीति-सेटिंग (कलेक्टर / CHiPS प्रशासक)")}
        <span className="sub">{tx("logged in the audit", "ऑडिट में दर्ज")}</span>
      </div>
      <div className="small" style={{ marginBottom: 6 }}>
        <b>{tx("Permanent caste certificates issued earlier by a Tehsildar (before CG HC, 22-07-2026):", "तहसीलदार द्वारा पूर्व में जारी स्थायी जाति प्रमाण पत्र (छ.ग. उच्च न्यायालय, 22-07-2026 से पूर्व):")}</b>
      </div>
      <div className="refer-opts">
        {(Object.keys(p.options.tehsildar_issued_permanent) as PolicyValue[]).map((k) => (
          <label key={k} className={`def-item ${cur === k ? "on" : ""}`}>
            <input type="radio" name="policy-tsl" checked={cur === k} onChange={() => onChange(k)} id={`policy-${k}`} />
            <span>
              {t(p.options.tehsildar_issued_permanent[k])}
              {k === p.defaults.tehsildar_issued_permanent && <span className="pill outline small" style={{ marginLeft: 6 }}>{tx("default", "डिफ़ॉल्ट")}</span>}
            </span>
          </label>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 6 }}>
        {tx(
          "Default keeps these genuine files out of “needs attention” (with a note on screen and in the order). A Scrutiny Committee referral stays available to the officer as a manual choice.",
          "डिफ़ॉल्ट इन वास्तविक फ़ाइलों को “ध्यान दें” से बाहर रखता है (स्क्रीन व आदेश में टिप्पणी सहित)। छानबीन समिति को संदर्भ अधिकारी के विकल्प के रूप में उपलब्ध रहता है।",
        )}
      </p>
      {p.options.sla_pause && (
        <div className="sla-policy" id="sla-policy">
          <div className="small" style={{ margin: "10px 0 6px" }}>
            <b>{tx("SLA clock during a hearing notice (15 days) or a Patwari referral (7 days)", "सुनवाई सूचना (15 दिन) या पटवारी संदर्भ (7 दिन) के दौरान SLA घड़ी")}</b>{" "}
            <span className="pill amber small">{tx("PROPOSED policy — needs a Revenue Department order", "प्रस्तावित नीति — राजस्व विभाग का आदेश आवश्यक")}</span>
          </div>
          <div className="refer-opts">
            {(Object.keys(p.options.sla_pause) as SlaPauseValue[]).map((k) => (
              <label key={k} className={`def-item ${sla === k ? "on" : ""}`}>
                <input type="radio" name="policy-sla" checked={sla === k} onChange={() => onSlaChange(k)} id={`policy-sla-${k}`} />
                <span>
                  {t(p.options.sla_pause![k])}
                  {k === (p.defaults.sla_pause ?? "running") && <span className="pill outline small" style={{ marginLeft: 6 }}>{tx("default", "डिफ़ॉल्ट")}</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 6 }}>
            {tx(
              "Display only: it changes the label on files at the hearing or Patwari stage (“SLA paused (pending Revenue order)”), never a due date or the Lok Sewa Guarantee clock. Without the order, the clock runs.",
              "केवल प्रदर्शन: यह सुनवाई या पटवारी चरण की फ़ाइलों पर लेबल बदलता है (“SLA रुकी (राजस्व आदेश लंबित)”), कोई नियत तिथि या लोक सेवा गारंटी घड़ी नहीं। आदेश के बिना घड़ी चालू रहती है।",
            )}
          </p>
        </div>
      )}
    </section>
  );
}

function EvalPanel({ e }: { e: EvalResult }) {
  const { t, tx } = useI18n();
  return (
    <section className="card">
      <div className="card-title">
        {tx("Model evaluation", "मॉडल मूल्यांकन")}
        <span className="sub">{e.model}</span>
        <span className="spacer" />
        <span className="badge-synth">{tx("SYNTHETIC TEST SET", "नमूना परीक्षण सेट")}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(260px, 0.9fr) minmax(360px, 1.6fr)", alignItems: "start" }}>
        <div className="stack" style={{ gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {(
              [
                ["precision", tx("Precision", "परिशुद्धता")],
                ["recall", tx("Recall", "रिकॉल")],
                ["f1", "F1"],
              ] as const
            ).map(([k, l]) => (
              <div key={k} className="kpi">
                <div className="v" style={{ fontSize: 24, color: "var(--blue)" }}>{(e.overall[k] * 100).toFixed(1)}%</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>
          <p className="small muted">
            {fmtN(e.test_set.pairs)} {tx("pairs", "जोड़े")} · {fmtN(e.test_set.positives)} {tx("true family links", "वास्तविक पारिवारिक संबंध")} · {tx("thresholds", "सीमा")}: {tx("exact", "सटीक")} ≥ {e.thresholds.exact}, {tx("possible", "संभावित")} ≥ {e.thresholds.possible}
          </p>
          <p className="small" style={{ background: "#f8fafc", padding: 10, borderRadius: 10 }}>
            ⓘ {t(e.test_set.description)}
            <br />
            <b>{tx("Synthetic + held-out; real calibration in shadow mode.", "सिंथेटिक + अलग रखा गया सेट; वास्तविक कैलिब्रेशन शैडो मोड में।")}</b>
          </p>
          <p className="small muted">
            {tx("Precision matters most: a wrong link is worse than a missed one, because a missed link only means normal review.", "परिशुद्धता सबसे महत्वपूर्ण: गलत संबंध, छूटे संबंध से अधिक हानिकारक है, क्योंकि छूटे संबंध का अर्थ केवल सामान्य जांच है।")}
          </p>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{tx("Slice", "वर्ग")}</th>
                <th className="num">n</th>
                <th>{tx("Precision", "परिशुद्धता")}</th>
                <th>{tx("Recall", "रिकॉल")}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#fcfaf7" }}>
                <td>
                  <b>{tx("Overall", "कुल")}</b>
                </td>
                <td className="num">{fmtN(e.test_set.pairs)}</td>
                <PrCell v={e.overall.precision} />
                <PrCell v={e.overall.recall} />
              </tr>
              {e.slices.map((s) => (
                <tr key={s.name.en}>
                  <td>
                    {t(s.name)}
                    {s.note && <div className="small muted">{t(s.note)}</div>}
                  </td>
                  <td className="num">{fmtN(s.n)}</td>
                  <PrCell v={s.precision} />
                  <PrCell v={s.recall} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const fmtN = (n: number) => n.toLocaleString("en-IN");

function PrCell({ v }: { v: number }) {
  return (
    <td>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
        <div className="pr-bar" style={{ flex: 1 }}>
          <span style={{ width: `${v * 100}%` }} />
        </div>
        <b style={{ minWidth: 52, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(v * 100).toFixed(1)}%</b>
      </div>
    </td>
  );
}
