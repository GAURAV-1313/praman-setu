import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { MisSummary, PrecheckRequest, PrecheckResponse, Service, Village } from "../api/types";
import { Bi, ErrorBox, fmtDate, SERVICE_ICON, Tick, useAsync } from "../components/common";
import { CertificateIllustration, FamilyTreeIllustration, SearchFamilyIllustration } from "../illustrations";
import VillagePicker from "../components/VillagePicker";

const SERVICES: { key: Service; en: string; hi: string }[] = [
  { key: "caste_st", en: "Caste · ST", hi: "जाति · अ.ज.जा." },
  { key: "caste_sc", en: "Caste · SC", hi: "जाति · अ.जा." },
  { key: "caste_obc", en: "Caste · OBC", hi: "जाति · अ.पि.व." },
  { key: "domicile", en: "Domicile", hi: "मूल निवास" },
];

interface Form {
  service: Service;
  applicant_name: string;
  father_name: string;
  district_lgd: number;
  village: Village | null;
  villageText: string;
  relative_cert_no: string;
  /** Round 7: native / maiden village (married women) */
  native: Village | null;
  nativeText: string;
}

const EMPTY: Form = { service: "caste_st", applicant_name: "", father_name: "", district_lgd: 643, village: null, villageText: "", relative_cert_no: "", native: null, nativeText: "" };

export default function Kendra() {
  const { t, tx, lang, setRole } = useI18n();
  useEffect(() => setRole("kendra_operator"), [setRole]);
  const [f, setF] = useState<Form>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [res, setRes] = useState<PrecheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [attached, setAttached] = useState<string | null>(null);
  const { data: mis } = useAsync<MisSummary>(() => api.misSummary(), []);

  // village autocomplete
  const [sugg, setSugg] = useState<Village[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const acRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!acOpen) return;
    let alive = true;
    const id = setTimeout(() => {
      api
        .villages(f.district_lgd, f.villageText)
        .then((v) => alive && (setSugg(v), setHl(0)))
        .catch(() => alive && setSugg([]));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [f.villageText, f.district_lgd, acOpen]);
  useEffect(() => {
    const h = (e: MouseEvent) => acRef.current && !acRef.current.contains(e.target as Node) && setAcOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  async function prefill(kind: "sunita" | "nomatch" | "married") {
    setRes(null);
    setAttached(null);
    setConsent(false);
    if (kind === "sunita") {
      const vs = await api.villages(643, "Bayanar").catch(() => [] as Village[]);
      const v = vs[0] ?? { village_lgd: 448703, name: { en: "Bayanar", hi: "बयानार" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" } };
      setF({ ...EMPTY, service: "caste_st", applicant_name: "Sunita Markam", father_name: "Ramlal Markam", village: v, villageText: t(v.name) });
    } else if (kind === "married") {
      // Round 7: married woman — lives in her husband's village (Masora); her father's record is in her maiden village
      const vs = await api.villages(643, "Masora").catch(() => [] as Village[]);
      const v = vs[0] ?? { village_lgd: 448686, name: { en: "Masora", hi: "मसोरा" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" } };
      const ns = await api.villages(undefined, "Garhbengal").catch(() => [] as Village[]);
      const n = ns.find((x) => x.village_lgd === 449687) ?? { village_lgd: 449687, name: { en: "Garhbengal", hi: "गढ़बेंगाल" }, tehsil: { en: "Narayanpur", hi: "नारायणपुर" }, district: { en: "Narayanpur", hi: "नारायणपुर" } };
      setF({ ...EMPTY, service: "caste_st", applicant_name: "Rajni Korram", father_name: "Jaglu Usendi", village: v, villageText: t(v.name), native: n, nativeText: t(n.name) });
    } else {
      const vs = await api.villages(643, "Umargaon").catch(() => [] as Village[]);
      const v = vs[0] ?? { village_lgd: 448804, name: { en: "Umargaon", hi: "उमरगांव" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" } };
      setF({ ...EMPTY, service: "caste_obc", applicant_name: "Ramesh Yadav", father_name: "Bhagwati Yadav", village: v, villageText: t(v.name) });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setAttached(null);
    try {
      const req: PrecheckRequest & { consent: boolean } = {
        service: f.service,
        applicant_name: f.applicant_name.trim(),
        father_name: f.father_name.trim(),
        district_lgd: f.district_lgd,
        village_lgd: f.village?.village_lgd,
        village_name: f.village ? f.village.name.en : f.villageText || undefined,
        relative_cert_no: f.relative_cert_no.trim() || undefined,
        native_village_lgd: f.native?.village_lgd,
        consent: true,
      };
      const r = await api.precheck(req);
      setRes(r);
    } catch (ex) {
      setErr(ex);
    } finally {
      setBusy(false);
    }
  }

  const usable = res?.matches.find((m) => m.usable_as_evidence) ?? null;
  const other = res && !usable ? res.matches[0] : null;
  const districts = [...(mis?.districts ?? [])].sort((a, b) => a.name.en.localeCompare(b.name.en));

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">{tx("Kendra pre-check", "केंद्र पूर्व-जांच")}</div>
          <div className="page-sub">
            {tx(
              "Before the fee is paid: look for a family member's certificate, or see exactly which documents to bring.",
              "शुल्क से पहले: परिवार के सदस्य का प्रमाण पत्र खोजें, या देखें कि कौन से दस्तावेज़ लाने हैं।",
            )}
          </div>
        </div>
        <div className="row">
          <button className="btn soft" onClick={() => prefill("sunita")}>
            ✦ {tx("Demo: Sunita Markam", "डेमो: सुनीता मरकाम")}
          </button>
          <button className="btn secondary" onClick={() => prefill("nomatch")}>
            {tx("Demo: no match", "डेमो: मिलान नहीं")}
          </button>
          <button className="btn secondary" onClick={() => prefill("married")}>
            {tx("Demo: married woman", "डेमो: विवाहित महिला")}
          </button>
        </div>
      </div>

      <div className="kendra-grid">
        <form className="card" onSubmit={submit}>
          <div className="card-title">{tx("Citizen details", "नागरिक विवरण")}</div>
          <div className="field">
            <label>{tx("Service", "सेवा")}</label>
            <div className="svc-grid" role="radiogroup">
              {SERVICES.map((s) => (
                <button type="button" key={s.key} role="radio" aria-checked={f.service === s.key} className={`svc-opt ${f.service === s.key ? "on" : ""}`} onClick={() => set("service", s.key)}>
                  <img src={SERVICE_ICON[s.key]} alt="" />
                  {lang === "hi" ? s.hi : s.en}
                </button>
              ))}
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="an">{tx("Applicant name", "आवेदक का नाम")}</label>
              <input id="an" className="input" value={f.applicant_name} onChange={(e) => set("applicant_name", e.target.value)} required placeholder={tx("e.g. Sunita Markam", "जैसे सुनीता मरकाम")} />
            </div>
            <div className="field">
              <label htmlFor="fn">{tx("Father's name", "पिता का नाम")}</label>
              <input id="fn" className="input" value={f.father_name} onChange={(e) => set("father_name", e.target.value)} required placeholder={tx("Hindi or English", "हिंदी या अंग्रेज़ी")} />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="dist">{tx("District", "जिला")}</label>
              <select
                id="dist"
                className="select"
                value={f.district_lgd}
                onChange={(e) => setF((cur) => ({ ...cur, district_lgd: Number(e.target.value), village: null, villageText: "" }))}
              >
                {districts.length === 0 && <option value={643}>{tx("Kondagaon", "कोंडागांव")}</option>}
                {districts.map((d) => (
                  <option key={d.lgd} value={d.lgd}>
                    {t(d.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" ref={acRef}>
              <label htmlFor="vil">{tx("Village", "गांव")}</label>
              <input
                id="vil"
                className="input"
                autoComplete="off"
                value={f.villageText}
                placeholder={tx("Start typing…", "टाइप करें…")}
                onFocus={() => setAcOpen(true)}
                onChange={(e) => setF((cur) => ({ ...cur, villageText: e.target.value, village: null }))}
                onKeyDown={(e) => {
                  if (!acOpen || sugg.length === 0) return;
                  if (e.key === "ArrowDown") (e.preventDefault(), setHl((h) => Math.min(h + 1, sugg.length - 1)));
                  if (e.key === "ArrowUp") (e.preventDefault(), setHl((h) => Math.max(h - 1, 0)));
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = sugg[hl];
                    setF((cur) => ({ ...cur, village: v, villageText: t(v.name) }));
                    setAcOpen(false);
                  }
                  if (e.key === "Escape") setAcOpen(false);
                }}
              />
              {acOpen && sugg.length > 0 && (
                <div className="ac-list" role="listbox">
                  {sugg.map((v, i) => (
                    <button
                      type="button"
                      key={v.village_lgd}
                      className={i === hl ? "hl" : ""}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setF((cur) => ({ ...cur, village: v, villageText: t(v.name) }));
                        setAcOpen(false);
                      }}
                    >
                      <span>
                        <Bi v={v.name} inline />
                      </span>
                      <span className="small muted">
                        {t(v.tehsil)} · <span className="mono">{v.village_lgd}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {f.village && <span className="small muted">LGD {f.village.village_lgd} · {t(f.village.tehsil)}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="nv">
              {tx("Native / maiden village (for married women)", "मायके / मूल गांव (विवाहित महिला आवेदक हेतु)")} <span className="opt">({tx("optional", "वैकल्पिक")})</span>
            </label>
            <VillagePicker id="nv" value={f.native} text={f.nativeText} onChange={(v, text) => setF((cur) => ({ ...cur, native: v, nativeText: text }))} placeholder={tx("Father's village — any district", "पिता का गांव — किसी भी जिले का")} />
            <span className="small muted">
              {tx(
                "After marriage, her family's records stay in her father's village. Both villages are searched.",
                "विवाह के बाद पैतृक परिवार के अभिलेख पिता के गांव में रहते हैं। दोनों गांवों में खोज होगी।",
              )}
            </span>
          </div>
          <div className="field">
            <label htmlFor="rc">
              {tx("Family member's certificate number", "परिवार के सदस्य का प्रमाण पत्र क्रमांक")} <span className="opt">({tx("optional", "वैकल्पिक")})</span>
            </label>
            <input id="rc" className="input mono" value={f.relative_cert_no} onChange={(e) => set("relative_cert_no", e.target.value)} placeholder="CG/KDG/SDO/2019/…" />
          </div>
          <label className="consent-check">
            <input type="checkbox" checked={consent} required onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {tx(
                "The applicant consents to a search of the certificate archive for this application",
                "आवेदक इस आवेदन हेतु प्रमाण पत्र अभिलेखागार की खोज के लिए सहमति देते हैं",
              )}
            </span>
          </label>
          <div className="small muted" style={{ marginBottom: 14 }}>
            🔒 {tx(
              "The search is logged in the audit trail (who searched, when, which records).",
              "यह खोज ऑडिट ट्रेल में दर्ज होती है (किसने खोजा, कब, कौन से अभिलेख)।",
            )}
          </div>
          <button className="btn lg" type="submit" disabled={busy || !consent || !f.applicant_name || !f.father_name} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? <span className="spinner" /> : "🔍"} {tx("Check family records", "पारिवारिक अभिलेख जांचें")}
          </button>
        </form>

        <div className="stack">
          {err != null && <ErrorBox error={err} />}
          {!res && !err && (
            <div className="card empty">
              <FamilyTreeIllustration size={300} />
              <h3>{tx("The state may already hold this family's proof", "इस परिवार का प्रमाण शासन के पास पहले से हो सकता है")}</h3>
              <p style={{ marginTop: 6 }}>{tx("Enter the father's name and village. We check the certificate archive before the citizen pays.", "पिता का नाम और गांव दर्ज करें। नागरिक के भुगतान से पहले हम प्रमाण पत्र अभिलेखागार जांचते हैं।")}</p>
            </div>
          )}

          {res && usable && (
            <section className="card found fade-in">
              <div className="found-head">
                <CertificateIllustration size={120} />
                <div>
                  <span className="pill green">✔ {tx("Matching family certificate found", "परिवार का मिलता-जुलता प्रमाण पत्र मिला")}</span>
                  <h2 style={{ marginTop: 8 }} className="mono" id="kd-masked-no">
                    {tx("No.", "क्र.")} {maskNo(usable.certificate.cert_no)}
                  </h2>
                  <div style={{ fontSize: 16, marginTop: 4 }}>
                    <b>{t(usable.relation_label)}</b> · {tx("matches the father's name entered", "दर्ज पिता के नाम से मेल")}
                  </div>
                  <div className="small muted">
                    {t(usable.certificate.issuing_authority)} · {fmtDate(usable.certificate.issue_date, lang)}
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>
                    {usable.found_via === "native_village" ? (
                      <span className="pill blue">⌂ {tx("Found in the native / maiden village entered", "दर्ज मायके / मूल गांव से मिला")}</span>
                    ) : (
                      <span className="muted">
                        {tx("Privacy: the operator sees only part of the number — no name, village or category of the holder. The officer sees the full record.", "निजता: ऑपरेटर को क्रमांक का केवल अंश दिखता है — धारक का नाम, गांव या वर्ग नहीं। अधिकारी पूरा अभिलेख देखते हैं।")}
                      </span>
                    )}
                  </div>
                </div>
                <span className="spacer" />
                <div className={`prob-badge strength ${usable.match_level === "exact" ? "" : "possible"}`}>
                  <b>{usable.match_level === "exact" ? tx("Strong link", "प्रबल कड़ी") : tx("Possible link", "संभावित कड़ी")}</b>
                  <small>{tx("model link — the officer confirms the relationship", "मॉडल कड़ी — संबंध की पुष्टि अधिकारी करेंगे")}</small>
                </div>
              </div>
              {usable.validity_headline && (
                <p className="pill amber" style={{ whiteSpace: "normal", marginTop: 10 }}>
                  ⚠ {t(usable.validity_headline)}
                </p>
              )}
              <div className="validity">
                {usable.validity.map((v) => (
                  <div key={v.code} className={`vcheck ${v.ok ? "" : "bad"}`}>
                    <Tick ok={v.ok} />
                    <div>
                      <b>{t(v.label)}</b>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 14 }}>{maskText(t(res.summary))}</p>
              <p className="small muted" style={{ marginTop: 4 }}>{maskText(t(res.suggestion))}</p>
              <div style={{ marginTop: 14 }}>
                {attached === usable.certificate.cert_no ? (
                  <div className="attach-done">
                    ✓{" "}
                    {tx(
                      "Attached as a Kendra search result (not an applicant declaration). The officer will compare it side by side and must confirm the relationship before relying on it.",
                      "केंद्र खोज परिणाम के रूप में संलग्न (आवेदक की घोषणा नहीं)। अधिकारी इसे आमने-सामने मिलाएंगे और इस पर भरोसा करने से पहले संबंध की पुष्टि करना अनिवार्य है।",
                    )}
                  </div>
                ) : (
                  <button className="btn green lg" onClick={() => setAttached(usable.certificate.cert_no)}>
                    📎 {tx("Attach as proof", "प्रमाण के रूप में संलग्न करें")}
                  </button>
                )}
              </div>
            </section>
          )}

          {res && !usable && (
            <section className="card fade-in">
              <div className="row" style={{ alignItems: "center", gap: 18 }}>
                <SearchFamilyIllustration size={150} className="no-shrink" />
                <div>
                  <h2 style={{ fontSize: 19 }}>{maskText(t(res.summary))}</h2>
                  <p className="muted" style={{ marginTop: 6 }}>
                    {tx("Common for first-time applicants and families who moved. Not a negative signal.", "पहली बार आवेदन करने वालों व स्थानांतरित परिवारों में सामान्य। यह कोई नकारात्मक संकेत नहीं है।")}
                  </p>
                </div>
              </div>
              {other && (
                <p className="pill amber" style={{ whiteSpace: "normal", marginTop: 10 }}>
                  {tx("A record was found but it cannot be used as proof; the officer will review it.", "एक अभिलेख मिला परंतु प्रमाण के रूप में उपयोग नहीं हो सकता; अधिकारी इसकी समीक्षा करेंगे।")}
                </p>
              )}
              {other?.validity_headline && (
                <p className="pill amber" style={{ whiteSpace: "normal", marginTop: 8 }}>
                  ⚠ {t(other.validity_headline)}
                </p>
              )}
              <p style={{ marginTop: 12 }}>{maskText(t(res.suggestion))}</p>
            </section>
          )}

          {res && (
            <section className="card fade-in">
              <div className="card-title">{tx("Documents for this service", "इस सेवा हेतु दस्तावेज़")}</div>
              <ul className="check-list">
                {res.checklist.map((c) => (
                  <li key={c.code}>
                    <Tick ok={c.present} neutral={!c.present} />
                    <span>
                      {t(c.label)}
                      {c.satisfied_by && <span className="sat">✓ {maskText(t(c.satisfied_by))}</span>}
                      {!c.present && (
                        <span className="sat" style={{ color: "var(--muted)" }}>
                          {c.code === "family_tree"
                            ? tx("bring it if available; otherwise the officer can get it from the Patwari", "उपलब्ध हो तो लाएं; नहीं तो पटवारी से मंगाया जा सकता है")
                            : tx("bring to the Kendra", "केंद्र पर लाएं")}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** The Kendra is a private operator: like the citizen, it sees only the last 4 digits of a family certificate. */
const maskNo = (no: string) => "••••" + no.slice(-4);
const maskText = (text: string) => text.replace(/\b[A-Z]{2}\/[A-Z]{2,4}\/[A-Z]{2,4}\/\d{4}\/\d{3,7}\b/g, (m) => maskNo(m));
