import { useState } from "react";
import { useI18n } from "../i18n";
import type { TraceStep } from "../api/types";
import "../round8b.css";

/** Round 8b: the visible "प्रमाण एजेंट" trace — what the system did for this file. Collapsed to one line by default.
 *  Honest: the agent reads, searches, scores, checks and drafts; the last step is always the officer. */
const NUM = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

function fmtMs(ms: number | null) {
  if (ms == null) return "";
  return ms < 0.1 ? "<0.1 ms" : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`;
}

export default function AgentTrace({ trace, decided }: { trace?: TraceStep[]; decided: boolean }) {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(false);
  if (!trace || trace.length === 0) return null;
  const steps = trace.map((s) =>
    s.code === "officer" && decided
      ? { ...s, status: "ok" as const, title: { en: "Decided by the officer", hi: "अधिकारी ने निर्णय लिया" } }
      : s,
  );
  const total = steps.reduce((a, s) => a + (s.ms ?? 0), 0);
  const attention = steps.filter((s) => s.status === "attention").length;
  const ico = (s: TraceStep) => (s.status === "ok" ? "✓" : s.status === "attention" ? "!" : "⏳");
  return (
    <details className="card tight agent-trace" id="agent-trace" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary title={tx("What the system did for this file. It never decides.", "इस फ़ाइल हेतु प्रणाली ने क्या किया। निर्णय कभी नहीं करती।")}>
        <b>{tx("Praman agent", "प्रमाण एजेंट")}</b>
        <span className="trace-dots" aria-hidden>
          {steps.map((s) => (
            <span key={s.step} className={`td ${s.status}`}>
              {ico(s)}
            </span>
          ))}
        </span>
        <span className="muted small trace-sum">
          {steps.length} {tx("steps", "चरण")} · {fmtMs(total)}
          {attention > 0 && ` · ${attention} ${tx("to check", "जांच हेतु")}`} · {t(steps[steps.length - 1].title)}
        </span>
      </summary>
      <ol className="trace-list">
        {steps.map((s) => (
          <li key={s.step} className={s.status}>
            <span className={`trace-ico ${s.status}`} aria-label={s.status}>
              {ico(s)}
            </span>
            <div className="trace-body">
              <div className="trace-title">
                <span className="trace-n">{NUM[s.step - 1] ?? s.step}</span> {t(s.title)}
                <span className="spacer" />
                <span className="mono small muted">{fmtMs(s.ms)}</span>
              </div>
              <div className="small muted">{t(s.detail)}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="small muted trace-foot">
        {tx(
          "Timings measured when this analysis was computed. The agent suggests; only the officer approves, sends back, refers or rejects.",
          "समय इस विश्लेषण की गणना के समय मापा गया। एजेंट केवल सुझाव देता है; स्वीकृति, वापसी, संदर्भ या अस्वीकृति केवल अधिकारी करते हैं।",
        )}
      </div>
    </details>
  );
}
