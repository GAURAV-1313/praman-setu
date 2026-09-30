import { useState } from "react";
import { useI18n } from "../i18n";
import { insights, type LearningStatus, type Prf, type UncertainPair } from "../api/insights";
import { ErrorBox, Loading, useAsync } from "./common";

const pc = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);

/** Round 8a: "अधिकारियों से सीखता मॉडल" — human-in-the-loop recalibration + active learning ("ask the officer"). */
export default function LearningPanel() {
  const { t, tx, presenter } = useI18n();
  const st = useAsync<LearningStatus>(() => insights.learningStatus(), []);
  const [busy, setBusy] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [flash, setFlash] = useState(false);

  async function recalibrate() {
    setBusy(true);
    setErr(null);
    try {
      st.setData(await insights.recalibrate());
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  }
  async function answer(p: UncertainPair, d: "same" | "not") {
    setAnswering(p.pair_id);
    setErr(null);
    try {
      st.setData((await insights.label(p.pair_id, d)).status);
    } catch (e) {
      setErr(e);
    } finally {
      setAnswering(null);
    }
  }

  const s = st.data;
  const cal = s?.calibration?.models.calibration;
  const before: Prf | undefined = s?.calibration?.before ?? s?.baseline.exact;

  return (
    <section className="card learn-card" id="learning">
      <div className="card-title">
        {tx("Model learns from officer confirmations", "अधिकारियों से सीखता मॉडल")}
        <span className="sub">{tx("अधिकारियों से सीखता मॉडल", "Model learns from officer confirmations")}</span>
        <span className="spacer" />
        <span className="badge-synth">{tx("SIMULATED LABELS", "सिम्युलेटेड लेबल")}</span>
      </div>
      {st.loading && !s ? <Loading /> : st.error ? <ErrorBox error={st.error} /> : s ? (
        <div className="learn-grid">
          <div className="stack" style={{ gap: 12 }}>
            <div className="learn-counts">
              <div className="kpi blue">
                <div className="v">{s.labels.real}</div>
                <div className="l">{tx("real officer labels", "वास्तविक अधिकारी लेबल")}</div>
                <div className="small muted">{tx(`${s.labels.by_source.officer_case} from files · ${s.labels.by_source.officer_active} asked`, `${s.labels.by_source.officer_case} प्रकरणों से · ${s.labels.by_source.officer_active} पूछे गए`)}</div>
              </div>
              <div className="kpi">
                <div className="v">{s.labels.simulated}</div>
                <div className="l">{tx("simulated confirmations", "सिम्युलेटेड पुष्टियाँ")}</div>
                <div className="small muted">{tx(`${Math.round(s.labels.simulated_officer_error_rate * 100)}% officer error built in`, `${Math.round(s.labels.simulated_officer_error_rate * 100)}% अधिकारी त्रुटि सम्मिलित`)}</div>
              </div>
            </div>

            <div className="row">
              <button className="btn blue" onClick={recalibrate} disabled={busy}>
                ↻ {busy ? tx("Recalibrating…", "अंशांकन हो रहा है…") : tx("Recalibrate · पुनः अंशांकन करें", "पुनः अंशांकन करें · Recalibrate")}
              </button>
              {s.calibration && <span className="small muted">{tx("fitted on", "आधार")} {s.calibration.n_labels} {tx("labels", "लेबल")} · {s.calibration.fitted_at.slice(11, 16)}</span>}
            </div>
            {err ? <ErrorBox error={err} /> : null}

            <table className={`table learn-table ${flash ? "flash" : ""}`}>
              <thead>
                <tr>
                  <th>{tx("Held-out families", "अलग रखे परिवार")}</th>
                  <th className="num">{tx("Before", "पहले")}</th>
                  <th className="num">{tx("After", "बाद में")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{tx("Precision (strong link)", "परिशुद्धता (प्रबल कड़ी)")}</td>
                  <td className="num">{pc(before?.precision)}</td>
                  <td className="num"><b>{cal ? pc(cal.after.precision) : "—"}</b></td>
                </tr>
                <tr>
                  <td>{tx("Recall (strong link)", "रिकॉल (प्रबल कड़ी)")}</td>
                  <td className="num">{pc(before?.recall)}</td>
                  <td className="num"><b>{cal ? pc(cal.after.recall) : "—"}</b></td>
                </tr>
                <tr>
                  <td>{tx("Confidence shown on screen (avg)", "स्क्रीन पर दिखा विश्वास (औसत)")}</td>
                  <td className="num">{pc(before?.mean_claimed)}</td>
                  <td className="num">{cal ? pc(cal.after.mean_claimed) : "—"}</td>
                </tr>
              </tbody>
            </table>
            <div className="small muted">
              {tx(`Measured on ${s.held_out.queries.toLocaleString("en-IN")} held-out synthetic applicants (${s.held_out.positives.toLocaleString("en-IN")} true family records) that never supply a label.`, `${s.held_out.queries.toLocaleString("en-IN")} अलग रखे सिंथेटिक आवेदकों (${s.held_out.positives.toLocaleString("en-IN")} वास्तविक पारिवारिक अभिलेख) पर मापा गया, जिनसे कोई लेबल नहीं लिया गया।`)}
              {cal?.bootstrap && ` ${t(cal.bootstrap.note)}: ${tx("precision", "परिशुद्धता")} ${pc(cal.bootstrap.precision[0])}–${pc(cal.bootstrap.precision[1])}.`}
              {before?.mean_claimed && before.precision ? (
                <> {tx(`Before: the screen said ${pc(before.mean_claimed)} where officers would confirm ${pc(before.precision)} (over-confident).`, `पहले: स्क्रीन ${pc(before.mean_claimed)} कहती थी जबकि अधिकारी ${pc(before.precision)} की पुष्टि करते (अति-आश्वस्त)।`)}</>
              ) : null}
              {cal && cal.after.mean_claimed && cal.after.precision ? (
                cal.after.mean_claimed < cal.after.precision ? (
                  <> {tx(`After: ${pc(cal.after.mean_claimed)} vs ${pc(cal.after.precision)} — it now errs on the cautious side (the simulated labels carry 3% officer error); more real labels narrow the gap.`, `बाद में: ${pc(cal.after.mean_claimed)} बनाम ${pc(cal.after.precision)} — अब सतर्क पक्ष में (सिम्युलेटेड लेबलों में 3% अधिकारी त्रुटि); अधिक वास्तविक लेबल अंतर घटाएँगे।`)}</>
                ) : (
                  <> {tx(`After: ${pc(cal.after.mean_claimed)} vs ${pc(cal.after.precision)}.`, `बाद में: ${pc(cal.after.mean_claimed)} बनाम ${pc(cal.after.precision)}।`)}</>
                )
              ) : null}
            </div>
            <div className="learn-note small">
              <b>{t(s.note)}</b>
              <div style={{ marginTop: 4 }}>{t(s.simulated_note)}</div>
              <div style={{ marginTop: 4 }}>{t(s.method)}</div>
              <div style={{ marginTop: 4 }}>{tx("Precedent: the UK government's Consult tool — AI agreed with expert reviewers 83% of the time, with experts keeping the final say.", "मिसाल: ब्रिटेन सरकार का Consult उपकरण — AI 83% बार विशेषज्ञ समीक्षकों से सहमत रहा, अंतिम निर्णय विशेषज्ञों का।")}</div>
            </div>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <div style={{ fontWeight: 700 }}>
              {tx("Ask the officer · अधिकारी से पूछें", "अधिकारी से पूछें · Ask the officer")}
              <span className="small muted" style={{ fontWeight: 500 }}> — {tx("the 5 pairs the model is least sure about", "वे 5 जोड़े जिन पर मॉडल सबसे कम निश्चित है")}</span>
            </div>
            {s.uncertain.length === 0 && <div className="small muted">{tx("No open questions.", "कोई प्रश्न शेष नहीं।")}</div>}
            {s.uncertain.map((p) => (
              <div key={p.pair_id} className="learn-pair">
                <div className="lp-cols">
                  <div>
                    <div className="small muted">{tx("Applicant", "आवेदक")}</div>
                    <b>{p.applicant.name}</b>
                    <div className="small">{tx("father", "पिता")}: {p.applicant.father} · {p.applicant.birth_year}</div>
                    <div className="small muted">{t(p.applicant.village)}</div>
                  </div>
                  <div>
                    <div className="small muted">{tx("Record", "अभिलेख")} · {t(p.relation_label)}?</div>
                    <b>{t(p.record.holder)}</b>
                    <div className="small">{tx("father", "पिता")}: {t(p.record.father)} · {p.record.birth_year}</div>
                    <div className="small muted">{t(p.record.village)}</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <span className="pill slate">{tx("model", "मॉडल")} {Math.round(p.probability * 100)}%</span>
                  {presenter && <span className="pill outline small">{tx("synthetic truth", "सिंथेटिक सत्य")}: {p.synthetic_truth === "same" ? tx("same", "एक ही") : tx("not", "नहीं")}</span>}
                  <span className="spacer" />
                  <button className="btn green sm" disabled={answering !== null} onClick={() => answer(p, "same")}>✓ {tx("Same family", "एक ही परिवार")}</button>
                  <button className="btn pair not sm" disabled={answering !== null} onClick={() => answer(p, "not")}>✗ {tx("Not this family", "यह परिवार नहीं")}</button>
                </div>
              </div>
            ))}
            <div className="small muted">{tx("Each answer is one label (logged). Then press Recalibrate.", "हर उत्तर एक लेबल है (लॉग किया गया)। फिर पुनः अंशांकन दबाएँ।")}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
