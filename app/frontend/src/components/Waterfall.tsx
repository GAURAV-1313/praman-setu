import { useI18n } from "../i18n";
import type { WeightItem } from "../api/types";

/** Explainable match-weight waterfall: prior + Σ weights = log2 odds → probability. */
export default function Waterfall({ prior, weights, probability }: { prior: number; weights: WeightItem[]; probability: number }) {
  const { t, tx } = useI18n();
  const rows: { key: string; label: string; sub?: string; start: number; end: number; kind: "prior" | "pos" | "neg" | "total"; value: number }[] = [];
  let acc = prior;
  rows.push({ key: "prior", label: tx("Starting odds (prior)", "प्रारंभिक संभावना (प्रायर)"), sub: tx("before any comparison", "किसी तुलना से पहले"), start: 0, end: prior, kind: "prior", value: prior });
  for (const w of [...weights].sort((a, b) => a.weight - b.weight)) {
    rows.push({ key: w.field, label: t(w.label), sub: t(w.comparison), start: acc, end: acc + w.weight, kind: w.weight >= 0 ? "pos" : "neg", value: w.weight });
    acc += w.weight;
  }
  const total = acc;
  rows.push({ key: "total", label: tx("Total match weight", "कुल मिलान भार"), start: 0, end: total, kind: "total", value: total });

  const lo = Math.min(0, ...rows.map((r) => Math.min(r.start, r.end))) - 0.5;
  const hi = Math.max(0, ...rows.map((r) => Math.max(r.start, r.end))) + 0.5;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;

  return (
    <div>
      <div className="wf">
        {rows.map((r) => {
          const a = Math.min(r.start, r.end);
          const b = Math.max(r.start, r.end);
          return (
            <div key={r.key} className={`wf-row ${r.kind === "total" ? "total-row" : ""}`}>
              <div className="lbl">
                {r.label}
                {r.sub && <small>{r.sub}</small>}
              </div>
              <div className="wf-track">
                <div className="wf-zero" style={{ left: `${x(0)}%` }} />
                <div className={`wf-bar ${r.kind}`} style={{ left: `${x(a)}%`, width: `${Math.max(0.6, x(b) - x(a))}%` }} />
              </div>
              <div className={`val ${r.kind === "neg" ? "neg" : r.kind === "pos" ? "pos" : ""}`}>
                {r.value > 0 && r.kind !== "total" && r.kind !== "prior" ? "+" : ""}
                {r.value.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="wf-result">
        <span className="muted small">{tx("Model link strength", "मॉडल कड़ी की प्रबलता")}: {probability >= 0.95 ? tx("strong", "प्रबल") : tx("possible", "संभावित")}</span>
        <b style={{ fontSize: 19, color: "var(--ink-2)" }}>{(probability * 100).toFixed(0)}%</b>
        <span className="spacer" />
        <span className="small muted">
          <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--green-bar)", borderRadius: 2 }} /> {tx("supports", "समर्थन")}
          &nbsp;&nbsp;
          <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--grey-bar)", borderRadius: 2 }} /> {tx("against", "विरुद्ध")}
        </span>
      </div>
    </div>
  );
}
