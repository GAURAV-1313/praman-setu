import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { RenewalItem, RenewalRecord, RenewalStrength } from "../api/types";
import { ErrorBox, fmtDate, Loading, SyntheticPill, Tick, useAsync } from "../components/common";
import WhatsAppPreview from "../components/WhatsAppPreview";
import "../round8b.css";

/** Round 8b: a second service on the same evidence engine: proactive income-certificate renewal (SYNTHETIC). */
const STRENGTH_CLASS: Record<RenewalStrength, string> = { strong: "green", partial: "amber", verify: "amber" };

export function EngineServices({ compact }: { compact?: boolean }) {
  const { tx } = useI18n();
  return (
    <div className={`engine-strip ${compact ? "compact" : ""}`} id="engine-services">
      <b>{tx("One engine, many services:", "एक इंजन, कई सेवाएँ:")}</b>
      <span className="pill blue">{tx("Caste", "जाति")}</span>
      <span className="pill blue">{tx("Domicile", "मूल निवास")}</span>
      <span className="pill blue">{tx("Income renewal", "आय नवीनीकरण")}</span>
      <span className="muted small">
        {tx("Next on the same engine (rule file + templates):", "इसी इंजन पर अगली सेवाएँ (नियम फ़ाइल + टेम्पलेट):")}{" "}
        {tx("legal heir (वारिस), EWS · roadmap", "वारिस (उत्तराधिकार), EWS · रोडमैप")}
      </span>
    </div>
  );
}

export default function Renewals() {
  const { t, tx, lang, presenter } = useI18n();
  const [district, setDistrict] = useState(643);
  const [win, setWin] = useState<30 | 60>(60);
  const { data, error, loading, reload } = useAsync(() => api.renewals(district, win), [district, win]);
  const [sel, setSel] = useState<string | null>(null);
  const [rec, setRec] = useState<RenewalRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => {
    setSel(null);
    setRec(null);
  }, [district]);

  async function open(it: RenewalItem) {
    const no = it.certificate.cert_no;
    setSel(no);
    setRec(null);
    setErr(null);
    setBusy(true);
    try {
      const r = await api.renewalPrefill(no);
      setRec(r);
      if (!it.renewal_id) reload();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  }

  const share = data?.context.income_share_of_volume;

  return (
    <div className="fade-in renewals">
      <div className="page-head">
        <div>
          <div className="page-title">{tx("Renewals · income certificate", "नवीनीकरण · Renewals — आय प्रमाण पत्र")}</div>
          <div className="page-sub">
            {tx(
              "Certificates that expire soon, with last year's record and evidence already pre-filled. The citizen confirms; the Tehsildar decides.",
              "जल्द समाप्त होने वाले प्रमाण पत्र, पिछले वर्ष के अभिलेख व साक्ष्य पहले से भरे हुए। नागरिक पुष्टि करें; निर्णय तहसीलदार का।",
            )}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <SyntheticPill />
          <select className="ren-select" value={district} onChange={(e) => setDistrict(Number(e.target.value))} aria-label={tx("District", "जिला")}>
            {(data?.districts ?? [{ lgd: 643, name: { en: "Kondagaon", hi: "कोंडागांव" } }]).map((d) => (
              <option key={d.lgd} value={d.lgd}>
                {t(d.name)}
              </option>
            ))}
          </select>
          <div className="seg" role="group" aria-label={tx("Window", "अवधि")}>
            <button className={win === 30 ? "on" : ""} onClick={() => setWin(30)}>
              ≤ 30 {tx("days", "दिन")}
            </button>
            <button className={win === 60 ? "on" : ""} onClick={() => setWin(60)}>
              ≤ 60 {tx("days", "दिन")}
            </button>
          </div>
        </div>
      </div>

      <EngineServices />
      {share != null && (
        <div className="ren-context small">
          <span className="pill slate">{tx("REAL · Sewa Setu MIS 27-09-2026", "वास्तविक · सेवा सेतु MIS 27-09-2026")}</span>{" "}
          <b>{tx(`Income certificates: ${Math.round(share)}% of all applications`, `आय प्रमाण पत्र: सभी आवेदनों का ${Math.round(share)}%`)}</b> ·{" "}
          {tx("valid 1 year, so the same families return every year.", "1 वर्ष हेतु मान्य, इसलिए वही परिवार हर वर्ष लौटते हैं।")}
        </div>
      )}

      {error ? (
        <ErrorBox error={error} />
      ) : loading && !data ? (
        <Loading />
      ) : data ? (
        <div className="ren-grid">
          <section className="card tight ren-list">
            <div className="card-title">
              {tx(`Expiring in ${win} days`, `${win} दिन में समाप्त`)}: {data.items.length}
              <span className="spacer" />
              <span className="small muted">
                {tx("≤ 30 days", "≤ 30 दिन")}: {data.counts.d30}
              </span>
            </div>
            {data.items.length === 0 && <p className="muted small">{tx("Nothing expires in this window.", "इस अवधि में कुछ समाप्त नहीं होता।")}</p>}
            <ul>
              {data.items.map((it) => {
                const c = it.certificate;
                return (
                  <li key={c.cert_no}>
                    <button className={`ren-row ${sel === c.cert_no ? "on" : ""}`} onClick={() => open(it)} aria-pressed={sel === c.cert_no}>
                      <span className={`ren-days ${it.days_left <= 30 ? "soon" : ""}`}>
                        <b>{it.days_left}</b>
                        <small>{tx("days", "दिन")}</small>
                      </span>
                      <span className="ren-main">
                        <b>{t(c.holder_name)}</b>
                        <span className="small muted">
                          {t(c.village)} · {c.annual_income_text}/{tx("yr", "वर्ष")} · <span className="mono">{c.cert_no}</span>
                        </span>
                      </span>
                      <span className={`pill ${STRENGTH_CLASS[it.strength]}`} title={t(it.strength_reason)}>
                        {t(it.strength_label).split(":")[0]}
                      </span>
                      {it.renewal_id && <span className="pill outline small">{tx("pre-filled", "पूर्व-भरित")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card tight ren-detail" aria-live="polite">
            {!sel && (
              <div className="ren-empty muted">
                {tx(
                  "Pick a certificate: Praman Setu pre-fills the renewal from last year's record and shows the message the citizen would get.",
                  "कोई प्रमाण पत्र चुनें: प्रमाण सेतु पिछले वर्ष के अभिलेख से नवीनीकरण पूर्व-भरित करता है और नागरिक को जाने वाला संदेश दिखाता है।",
                )}
              </div>
            )}
            {sel && busy && <Loading />}
            {sel && !!err && <ErrorBox error={err} />}
            {rec && rec.source_certificate.cert_no === sel && (
              <div className="stack fade-in" style={{ gap: 12 }}>
                <div className="ren-head">
                  <div>
                    <div className="card-title" style={{ marginBottom: 2 }}>
                      {t(rec.source_certificate.holder_name)}
                      <span className={`pill ${STRENGTH_CLASS[rec.strength]}`}>{t(rec.strength_label)}</span>
                    </div>
                    <div className="small muted">
                      <span className="mono">{rec.renewal_id}</span> · {t(rec.service_label)} · {tx("expires", "समाप्ति")} {fmtDate(rec.source_certificate.valid_until, lang)} ({rec.days_left}{" "}
                      {tx("days", "दिन")})
                    </div>
                    <div className="small" style={{ marginTop: 4 }}>{t(rec.strength_reason)}</div>
                  </div>
                </div>
                {presenter && rec.source_certificate.persona_note && <div className="persona">🎬 {t(rec.source_certificate.persona_note)}</div>}

                <div className="ren-cols">
                  <div className="stack" style={{ gap: 12 }}>
                    <div>
                      <div className="ren-sub">{tx("Pre-filled from last year's record", "पिछले वर्ष के अभिलेख से पूर्व-भरित")}</div>
                      <dl className="kv ren-kv">
                        {rec.fields.map((f) => (
                          <div key={f.label.en} className="ren-kv-row">
                            <dt>{t(f.label)}</dt>
                            <dd>
                              {t(f.value)}
                              <span className="kv-alt">{t(f.source)}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <div className="ren-sub">{tx("Evidence reused (no new upload)", "पुनः उपयोग किए गए साक्ष्य (नया अपलोड नहीं)")}</div>
                      {rec.evidence_reused.map((e, i) => (
                        <div key={i} className="ev-row">
                          <Tick ok={e.status === "ok"} neutral={false} />
                          <div>
                            <div className="ev-src">
                              {t(e.source)} · {t(e.field)}
                            </div>
                            <div style={{ fontWeight: 600 }}>{t(e.value)}</div>
                            {e.note && <div className="small muted">{t(e.note)}</div>}
                          </div>
                        </div>
                      ))}
                      {rec.rule_flags.map((f) => (
                        <div key={f.code} className="ren-flag small">
                          ⚠ {t(f.label)} <span className="muted">· {rec.rule_file.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="ren-gates">
                      <div className="ren-gate">
                        <span className="ren-gate-n">1</span>
                        <div>
                          <b>{tx("Citizen confirms at the Kendra (pending)", "केंद्र पर नागरिक की पुष्टि (लंबित)")}</b>
                          <label className="small ren-confirm">
                            <input type="checkbox" checked={rec.citizen_confirmation.confirmed} disabled readOnly /> “{t(rec.citizen_confirmation.statement)}”
                          </label>
                          <div className="small muted">{t(rec.citizen_confirmation.note)}</div>
                        </div>
                      </div>
                      <div className="ren-gate">
                        <span className="ren-gate-n">2</span>
                        <div>
                          <b>{tx("Officer decides", "अधिकारी निर्णय लेंगे")}</b>
                          <div className="small">{t(rec.officer_step.note)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <WhatsAppPreview msg={rec.nudge} />
                    <div className="small muted" style={{ textAlign: "center", marginTop: 6 }}>
                      {t(rec.nudge.status_note)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {data && (
        <section className="card tight ren-roadmap" id="renewal-roadmap">
          <div className="card-title">{tx("Next services on the same engine (rule file + templates)", "इसी इंजन पर अगली सेवाएँ (नियम फ़ाइल + टेम्पलेट)")}</div>
          <div className="ren-road">
            {data.roadmap.map((r) => (
              <div key={r.code}>
                <b>{t(r.label)}</b> <span className="pill outline small">{tx("roadmap", "रोडमैप")}</span>
                <div className="small muted">{t(r.note)}</div>
              </div>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>{t(data.context.note)}</div>
        </section>
      )}
    </div>
  );
}
