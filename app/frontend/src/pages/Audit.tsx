import { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { AuditEntry, DecisionSnapshot, Role } from "../api/types";
import { ErrorBox, fmtDateTime, Loading, useAsync } from "../components/common";

const ROLE: Record<Role | "citizen", { en: string; hi: string }> = {
  citizen: { en: "Citizen (self)", hi: "नागरिक (स्वयं)" },
  kendra_operator: { en: "Kendra operator", hi: "केंद्र संचालक" },
  sdo: { en: "SDO (Revenue)", hi: "अनुविभागीय अधिकारी" },
  tehsildar: { en: "Tehsildar", hi: "तहसीलदार" },
  collector: { en: "Collector", hi: "कलेक्टर" },
};

const ACTION: Record<string, { en: string; hi: string }> = {
  precheck: { en: "Kendra pre-check", hi: "केंद्र पूर्व-जांच" },
  citizen_precheck: { en: "Citizen's own family-record search (shown masked)", hi: "नागरिक द्वारा स्वयं परिवार-अभिलेख खोज (आंशिक दिखाया)" },
  citizen_submitted: { en: "Filed online by the citizen", hi: "नागरिक द्वारा ऑनलाइन दाखिल" },
  view_case: { en: "Viewed case", hi: "मामला देखा" },
  confirm_relationship: { en: "Confirmed relationship", hi: "संबंध की पुष्टि" },
  "decision:approve": { en: "Decision: approve", hi: "निर्णय: स्वीकृत" },
  "decision:send_back": { en: "Decision: send back", hi: "निर्णय: वापस भेजा" },
  "decision:refer": { en: "Decision: refer", hi: "निर्णय: संदर्भित" },
  "decision:reject": { en: "Decision: reject", hi: "निर्णय: अस्वीकृत" },
  reset: { en: "Demo reset", hi: "डेमो रीसेट" },
  // backend action codes
  case_opened: { en: "Opened case (records shown)", hi: "प्रकरण खोला (अभिलेख दिखाए)" },
  relationship_confirmed: { en: "Confirmed relationship", hi: "संबंध की पुष्टि" },
  decision_approve: { en: "Approved (order signed)", hi: "स्वीकृत (आदेश हस्ताक्षरित)" },
  decision_send_back: { en: "Sent back (notice)", hi: "वापस भेजा (सूचना)" },
  decision_refer: { en: "Referred", hi: "संदर्भित" },
  decision_reject: { en: "Rejected (order signed)", hi: "अस्वीकृत (आदेश हस्ताक्षरित)" },
  match_rejected: { en: "Marked 'not this family'", hi: "'यह परिवार नहीं' दर्ज" },
  native_village_searched: { en: "Searched native (maiden) village", hi: "मायके / मूल गांव में खोज" },
  renewal_prefilled: { en: "Income renewal pre-filled (citizen confirms, officer decides)", hi: "आय नवीनीकरण पूर्व-भरित (नागरिक पुष्टि, अधिकारी निर्णय)" },
  archive_certificate_lookup: { en: "Praman Reader: archive lookup by certificate no.", hi: "प्रमाण रीडर: क्रमांक से अभिलेखागार खोज" },
  native_village_search_cleared: { en: "Removed native-village search", hi: "मायके के गांव की खोज हटाई" },
  relationship_unconfirmed: { en: "Confirmation withdrawn (before signing)", hi: "पुष्टि वापस (हस्ताक्षर से पहले)" },
  match_rejection_undone: { en: "'Not this family' withdrawn", hi: "'यह परिवार नहीं' वापस" },
  show_cause_issued: { en: "Pre-rejection hearing notice issued", hi: "सुनवाई सूचना जारी" },
  show_cause_reply: { en: "Hearing notice reply received", hi: "सुनवाई सूचना का उत्तर प्राप्त" },
  show_cause_no_reply: { en: "No reply to hearing notice", hi: "सुनवाई सूचना का उत्तर नहीं" },
  decision_called_back: { en: "Decision called back (with reason)", hi: "निर्णय वापस लिया (कारण सहित)" },
  // Round 4
  policy_changed: { en: "Policy setting changed", hi: "नीति-सेटिंग बदली" },
  forwarded_wrong_authority: { en: "Forwarded — not the competent authority", hi: "अक्षम प्राधिकारी से अग्रेषित" },
  tray_added: { en: "Order read, added to sign tray", hi: "आदेश पढ़ा, हस्ताक्षर ट्रे में" },
  tray_signed: { en: "Sign tray signed (one DSC token passcode)", hi: "हस्ताक्षर ट्रे हस्ताक्षरित (एक DSC टोकन पासकोड)" },
  tool_feedback: { en: "Tool feedback (not an officer metric)", hi: "उपकरण प्रतिक्रिया (अधिकारी मापदंड नहीं)" },
  forwarded_other_subdivision: { en: "Forwarded to its own sub-division desk", hi: "अपने अनुविभाग की डेस्क को अग्रेषित" },
  // Round 8a/8c
  family_graph_viewed: { en: "Family network opened (records shown)", hi: "परिवार नेटवर्क खोला (अभिलेख दिखाए)" },
  learning_label: { en: "Answered an 'ask the officer' pair (model label only)", hi: "'अधिकारी से पूछें' जोड़े का उत्तर (केवल मॉडल लेबल)" },
  model_recalibrated: { en: "Model recalibration proposed (not applied to live matching)", hi: "मॉडल पुनः अंशांकन प्रस्तावित (लाइव मिलान पर लागू नहीं)" },
};

/** Round 3: Hindi view of the (English) audit log — actor and the head of each note; the full English note stays on hover. */
const ACTOR_HI: [RegExp, string][] = [
  [/SDO \(Revenue\)/g, "अनुविभागीय अधिकारी (राजस्व)"],
  [/Tehsildar/g, "तहसीलदार"],
  [/Citizen \(Aadhaar e-authenticated\)/g, "नागरिक (आधार ई-प्रमाणीकृत)"],
  [/Operator, CSC/g, "संचालक, सीएससी"],
  [/Collector/g, "कलेक्टर"],
  [/Kondagaon/g, "कोंडागांव"],
  [/Keskal/g, "केशकाल"],
  [/Makdi/g, "माकड़ी"],
  [/Kongera/g, "कोंगेरा"],
  [/Model owner \(demo\)/g, "मॉडल स्वामी (डेमो)"],
];
const REG_HI: Record<string, string> = { "Bhuiyan land record (mock)": "भुइयां भू-अभिलेख (नमूना)", "Khadya ration roster (mock)": "खाद्य राशन सूची (नमूना)" };
function actorHi(a: string): string {
  return ACTOR_HI.reduce((x, [re, hi]) => x.replace(re, hi), a);
}
const NOTE_HI: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Records shown to the officer/, () => "अधिकारी को दिखाए गए अभिलेख (वंश-मिलान व पंजी प्रविष्टियाँ)"],
  [/^Officer confirmed the family relationship with certificate (\S+)/, (m) => `अधिकारी ने प्रमाण पत्र ${m[1]} से पारिवारिक संबंध की पुष्टि की`],
  [/^Officer searched the applicant's native \(maiden\) village (.+?) \(LGD (\d+)[^:]*: (\d+) record/, (m) => `अधिकारी ने आवेदिका के मायके / मूल गांव ${m[1]} (एलजीडी ${m[2]}) में खोजा: ${m[3]} अभिलेख मिला; मिले अभिलेख पर संबंध की पुष्टि अधिकारी ही करेंगे`],
  [/^Officer removed the native \(maiden\) village search/, () => "अधिकारी ने मायके के गांव की खोज हटाई"],
  [/^Officer found certificate (\S+) is NOT/, (m) => `अधिकारी ने दर्ज किया: प्रमाण पत्र ${m[1]} आवेदक के परिवार का नहीं`],
  [/^Officer withdrew/, () => "अधिकारी ने पूर्व चिह्नांकन वापस लिया (हस्ताक्षर से पहले)"],
  [/^Pre-rejection hearing notice (\S+) issued; reply due (\S+)/, (m) => `सुनवाई सूचना ${m[1]} जारी; उत्तर देय ${m[2].replace(/\.$/, "")}`],
  [/^Reply to hearing notice (\S+) received/, (m) => `सुनवाई सूचना ${m[1]} का उत्तर प्राप्त (अनुकरण)`],
  [/^(\w+) (\S+) called back/, (m) => `${m[2]} 10 मिनट के भीतर वापस लिया`],
  [/^Order (\S+) issued/, (m) => `आदेश ${m[1]} जारी`],
  [/^Notice (\S+) issued/, (m) => `सूचना ${m[1]} जारी`],
  [/^Reference (\S+) issued/, (m) => `संदर्भ ${m[1]} जारी`],
  [/^Archive lookup with the applicant's consent/, () => "आवेदक की सहमति से अभिलेखागार खोज"],
  [/^Archive lookup WITHOUT/, () => "सहमति टिक के बिना अभिलेखागार खोज"],
  [/^Citizen self-search with consent, (\d)\/(\d)[^—]*— result (\w+)/, (m) => `नागरिक द्वारा सहमति सहित स्वयं खोज, ${m[1]}/${m[2]} — परिणाम: ${m[3] === "not_found" ? "नहीं मिला" : "मिला (नागरिक को आंशिक क्रमांक ही दिखा)"}`],
  [/^Filed online with the archive-verified/, () => "अभिलेखागार से सत्यापित परिवार प्रमाण पत्र संलग्न कर ऑनलाइन दाखिल; संबंध की पुष्टि अधिकारी करेंगे"],
  [/^Family network opened for (\S+) \((\S+)\): (\d+) certificate/, (m) => `${m[1]} (${m[2]}) का परिवार नेटवर्क खोला: तीन पीढ़ियों के वृक्ष में ${m[3]} प्रमाण पत्र`],
  [/^Officer answered an 'ask the officer' pair \((\S+)\): (same|not)/, (m) => `अधिकारी ने 'अधिकारी से पूछें' जोड़े (${m[1]}) का उत्तर दिया: ${m[2] === "same" ? "एक ही परिवार" : "यह परिवार नहीं"}; केवल मॉडल लेबल के रूप में उपयोग`],
  [/^Matcher calibration refitted on (\d+) labels \((\d+) real, (\d+) simulated\)/, (m) => `मिलान-मॉडल का अंशांकन ${m[1]} लेबलों (${m[2]} वास्तविक, ${m[3]} सिम्युलेटेड) पर पुनः किया गया; केवल प्रस्ताव — लाइव मिलान पर लागू नहीं`],
  [/^Praman Reader: certificate number read from an uploaded paper \(([^)]+)\)( — not in the archive)?/, (m) => `प्रमाण रीडर: अपलोड किए कागज़ से पढ़ा गया प्रमाण पत्र क्रमांक (${m[1]})${m[2] ? " — अभिलेखागार में नहीं" : ""}`],
  [/^Filed online WITHOUT pre-notification papers/, () => "पुराने कागज़ों के बिना ऑनलाइन दाखिल: अनुपलब्धता घोषणा + वंशावली; नियम 7 जांच का अनुरोध"],
];
function noteHi(n: string): string {
  for (const [re, f] of NOTE_HI) {
    const m = n.match(re);
    if (m) return f(m) + (/system text EDITED/.test(n) ? " · सिस्टम पाठ में अधिकारी द्वारा संपादन" : "");
  }
  return n;
}

export default function Audit() {
  const { t, tx, lang } = useI18n();
  const [sp] = useSearchParams();
  // Round 5: the demo jump link pre-fills the number (the presenter still presses Search on stage)
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [query, setQuery] = useState("");
  // the demo jump link can be used while already on /audit: pick up the new number (still not searched)
  const loc = useLocation();
  useEffect(() => {
    const v = new URLSearchParams(loc.search).get("q");
    if (v !== null) setQ(v);
  }, [loc.key, loc.search]);
  const { data, error, loading, reload } = useAsync<AuditEntry[]>(() => api.audit(query || undefined), [query]);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">{tx("Audit log", "ऑडिट लॉग")}</div>
          <div className="page-sub">
            {tx("Every access and every decision logged, with what the officer's screen showed at the time.", "हर पहुंच और हर निर्णय दर्ज — निर्णय के समय अधिकारी की स्क्रीन पर क्या दिखा, सहित।")}
          </div>
        </div>
        <div className="row">
          <span className="pill blue">{tx("DPDP Rules 2025 · logs kept ≥ 1 year", "DPDP नियम 2025 · लॉग ≥ 1 वर्ष")}</span>
          <button className="btn secondary sm" onClick={() => (setOpen(null), reload())}>
            ↻ {tx("Refresh", "रीफ़्रेश")}
          </button>
        </div>
      </div>
      <form
        className="card tight who-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
          setOpen(null);
        }}
      >
        <label htmlFor="who-q" className="who-label">
          <b>{tx("Who accessed this certificate / application?", "इस प्रमाण पत्र / आवेदन को किसने देखा?")}</b>
          <span className="small muted"> {tx("certificate or application number (or part of it)", "प्रमाण पत्र या आवेदन क्रमांक (या उसका भाग)")}</span>
        </label>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input id="who-q" className="input mono" value={q} onChange={(e) => setQ(e.target.value)} placeholder="004512 / SS/2026/KDG/08812" />
          <button className="btn blue sm" type="submit" id="who-search">
            {tx("Search", "खोजें")}
          </button>
          {query && (
            <>
              <button className="btn secondary sm" type="button" onClick={() => (setQ(""), setQuery(""))}>
                {tx("Clear", "हटाएं")}
              </button>
              <button className="btn secondary sm" type="button" onClick={() => window.print()} id="who-print">
                {tx("Give this list to the citizen (DPDP s.11)", "नागरिक को यह सूची दें (DPDP धारा 11)")}
              </button>
            </>
          )}
        </div>
        {query && data && (
          <div className="small" style={{ marginTop: 6 }} id="who-result">
            {tx(`${data.length} access(es) to “${query}”: date, role, office and purpose below.`, `“${query}” तक ${data.length} पहुंच: दिनांक, भूमिका, कार्यालय व प्रयोजन नीचे।`)}
          </div>
        )}
      </form>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <div style={{ padding: 16 }}>
            <ErrorBox error={error} />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{tx("Time", "समय")}</th>
                  <th>{tx("Role", "भूमिका")}</th>
                  <th>{tx("Actor", "कर्ता")}</th>
                  <th>{tx("Action", "कार्य")}</th>
                  <th>{tx("Application", "आवेदन")}</th>
                  <th>{tx("Records accessed", "देखे गए अभिलेख")}</th>
                  <th>{tx("Note", "टिप्पणी")}</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((e, i) => (
                  <Fragment key={`${e.ts}-${i}`}>
                    <tr className={e.snapshot ? "click" : ""} onClick={() => e.snapshot && setOpen(open === i ? null : i)}>
                      <td className="small" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.ts, lang)}</td>
                      <td>
                        <span className="pill blue">{t(ROLE[e.actor_role] ?? { en: e.actor_role, hi: e.actor_role })}</span>
                      </td>
                      <td className="small">{lang === "hi" ? actorHi(e.actor) : e.actor}</td>
                      <td style={{ fontWeight: 600 }}>
                        {ACTION[e.action] ? t(ACTION[e.action]) : e.action}
                        {e.document_no && <div className="mono small muted">{e.document_no}</div>}
                        {e.snapshot && (
                          <div className="small" style={{ color: "var(--blue)" }}>
                            {open === i ? "▾" : "▸"} {tx("what the screen showed", "स्क्रीन पर क्या दिखा")}
                          </div>
                        )}
                      </td>
                      <td className="mono small">
                        {e.app_id ? (
                          <Link to={`/officer/case/${encodeURIComponent(e.app_id)}`} style={{ color: "var(--blue)", textDecoration: "underline" }} onClick={(ev) => ev.stopPropagation()}>
                            {e.app_id}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          {e.records_accessed.length ? e.records_accessed.map((r) => <span key={r} className="pill outline mono small">{lang === "hi" ? (REG_HI[r] ?? r) : r}</span>) : <span className="muted">—</span>}
                        </div>
                      </td>
                      <td className="small muted" title={e.note ?? ""}>
                        {lang === "hi" && e.note ? noteHi(e.note) : (e.note ?? "")}
                      </td>
                    </tr>
                    {open === i && e.snapshot && (
                      <tr className="snap-row">
                        <td colSpan={7}>
                          <Snapshot s={e.snapshot} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {data && data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 30 }}>
                      {tx("No entries yet.", "अभी कोई प्रविष्टि नहीं।")}
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
          "This log audits the tool and who saw which records (DPDP). It is not used to rank or score officers; agreement with the tool's suggestion is kept only inside the snapshot, for evaluating the tool. Demo storage is a JSON file; production would be append-only and hash-chained.",
          "यह लॉग उपकरण का और किसने कौन-से अभिलेख देखे (DPDP) इसका ऑडिट है। इसका उपयोग अधिकारियों की रैंकिंग या अंकन हेतु नहीं होता; उपकरण के सुझाव से सहमति केवल स्नैपशॉट में, उपकरण के मूल्यांकन हेतु। डेमो में JSON फ़ाइल; वास्तविक प्रणाली में केवल-जोड़ व हैश-शृंखला।",
        )}
      </p>
    </div>
  );
}

function Snapshot({ s }: { s: DecisionSnapshot }) {
  const { tx } = useI18n();
  return (
    <div className="snapshot">
      <div className="snap-grid">
        <div>
          <div className="section-label">{tx("Screen at decision", "निर्णय के समय स्क्रीन")}</div>
          <dl className="kv small">
            <dt>{tx("Lane", "लेन")}</dt>
            <dd>{s.lane}</dd>
            <dt>{tx("Tool suggested", "उपकरण का सुझाव")}</dt>
            <dd>{s.suggested_action}</dd>
            <dt>{tx("Open flags", "खुले बिंदु")}</dt>
            <dd>{s.flags_open.length ? s.flags_open.map((f) => `${f.code} (${f.severity})`).join(", ") : "—"}</dd>
            <dt>{tx("Relied on", "आधार")}</dt>
            <dd className="mono">{s.accepted_cert_nos.join(", ") || "—"}</dd>
            <dt>{tx("Evidence picked", "चुना गया साक्ष्य")}</dt>
            <dd>{s.evidence_basis ? `${s.evidence_basis.caste ?? "—"} / ${s.evidence_basis.residence ?? "—"}` : "—"}</dd>
            <dt>{tx("Hearing notice", "सुनवाई सूचना")}</dt>
            <dd>{s.show_cause ? `${s.show_cause.no} · ${s.show_cause.reply?.outcome ?? tx("awaiting", "प्रतीक्षा")}` : "—"}</dd>
          </dl>
        </div>
        <div>
          <div className="section-label">{tx("Order text & signing", "आदेश पाठ व हस्ताक्षर")}</div>
          <dl className="kv small">
            <dt>{tx("System text", "सिस्टम पाठ")}</dt>
            <dd>{s.edited ? tx("EDITED by the officer", "अधिकारी द्वारा संपादित") : tx("unedited", "असंपादित")}</dd>
            <dt>{tx("Read tick", "पढ़ा — टिक")}</dt>
            <dd>{s.read_confirmed ? "✓" : "—"}</dd>
            <dt>{tx("Time on screen", "स्क्रीन पर समय")}</dt>
            <dd>{s.time_on_screen_s != null ? `${Math.round(s.time_on_screen_s)} s` : "—"}</dd>
            <dt>{tx("Authoritative", "प्रामाणिक")}</dt>
            <dd>{s.authoritative_lang === "hi" ? "हिंदी" : s.authoritative_lang}</dd>
            <dt>{tx("Signed text hash", "हस्ताक्षरित पाठ हैश")}</dt>
            <dd className="mono">{s.signed_sha.slice(0, 16)}…</dd>
            <dt>{tx("Versions", "संस्करण")}</dt>
            <dd className="mono">{s.model_version} · {s.rules_version}</dd>
          </dl>
        </div>
      </div>
      <div className="section-label" style={{ marginTop: 8 }}>{tx("Records shown", "दिखाए गए अभिलेख")}</div>
      <table className="table snap-table">
        <thead>
          <tr>
            <th>{tx("Certificate", "प्रमाण पत्र")}</th>
            <th>{tx("Relation", "संबंध")}</th>
            <th>{tx("Link", "कड़ी")}</th>
            <th>{tx("Validity", "वैधता")}</th>
            <th>{tx("Officer's act", "अधिकारी का कार्य")}</th>
          </tr>
        </thead>
        <tbody>
          {s.matches_shown.map((m) => (
            <tr key={m.cert_no}>
              <td className="mono small">{m.cert_no}</td>
              <td className="small">{m.relation}</td>
              <td className="small">
                {m.level} · {Math.round(m.probability * 100)}%
              </td>
              <td className="small">{m.validity_headline ?? tx("all checks pass", "सभी जांच सही")}</td>
              <td className="small">{m.disposition ? `${m.disposition.decision === "same" ? tx("same family", "वही परिवार") : tx("not this family", "यह परिवार नहीं")}: ${m.disposition.grounds.join(", ")}${m.disposition.note ? ` · “${m.disposition.note}”` : ""}` : "—"}</td>
            </tr>
          ))}
          {s.matches_shown.length === 0 && (
            <tr>
              <td colSpan={5} className="small muted">
                {tx("No family record was shown.", "कोई पारिवारिक अभिलेख नहीं दिखाया गया।")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
