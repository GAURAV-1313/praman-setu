import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { useI18n } from "../i18n";
import type { Application, LineageMatch } from "../api/types";

/** Tiny family graph: applicant ↔ relative, each with certificate nodes. */
export default function FamilyGraph({ app, matches, confirmed }: { app: Application; matches: LineageMatch[]; confirmed: Set<string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t, lang, tx } = useI18n();

  useEffect(() => {
    if (!ref.current) return;
    const els: cytoscape.ElementDefinition[] = [];
    const shortName = (s: string) => (s.length > 16 ? s.split(" ")[0] : s);
    els.push({ data: { id: "app", label: `${shortName(t(app.applicant_name))}\n${tx("applicant", "आवेदक")}`, kind: "applicant" }, position: { x: 0, y: 150 } });
    els.push({ data: { id: "appcert", label: tx("applied", "आवेदित"), kind: "pending" }, position: { x: 190, y: 150 } });
    els.push({ data: { id: "e-app", source: "app", target: "appcert", kind: "holds" } });

    matches.slice(0, 2).forEach((m, i) => {
      const isParent = m.relation === "father" || m.relation === "paternal_grandfather" || m.relation === "paternal_uncle";
      const y = isParent ? 20 : 150;
      const xp = isParent ? i * 40 : -200;
      const pid = `rel${i}`;
      const cid = `cert${i}`;
      const certOk = m.usable_as_evidence;
      els.push({ data: { id: pid, label: `${shortName(t(m.certificate.holder_name))}\n${t(m.relation_label)}`, kind: "relative" }, position: { x: xp, y } });
      els.push({
        data: { id: cid, label: `${m.certificate.category ?? tx("Domicile", "मूल निवास")} · ${m.certificate.issue_date.slice(0, 4)}\n${m.certificate.status === "active" ? "✓" : "!"}`, kind: certOk ? "cert_ok" : "cert_warn" },
        position: { x: isParent ? xp + 190 : xp, y: isParent ? y : 20 },
      });
      els.push({ data: { id: `e-${cid}`, source: pid, target: cid, kind: "holds" } });
      els.push({ data: { id: `e-rel${i}`, source: pid, target: "app", kind: confirmed.has(m.certificate.cert_no) ? "confirmed" : "relation", label: `${confirmed.has(m.certificate.cert_no) ? "✓ " : ""}${(m.match_probability * 100).toFixed(0)}%` } });
    });

    const cy = cytoscape({
      container: ref.current,
      elements: els,
      layout: { name: "preset", padding: 18 },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      maxZoom: 1.25,
      autoungrabify: true,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-wrap": "wrap",
            "text-valign": "center",
            "text-halign": "center",
            "font-family": "Space Grotesk, Noto Sans Devanagari, sans-serif",
            "font-size": 11,
            "font-weight": 600,
            color: "#0f172a",
            width: 110,
            height: 42,
            shape: "round-rectangle",
            "background-color": "#ffffff",
            "border-width": 2,
            "border-color": "#134a9c",
          },
        },
        { selector: 'node[kind="applicant"]', style: { "background-color": "#fff1e6", "border-color": "#f97316" } },
        { selector: 'node[kind="relative"]', style: { "background-color": "#e8effb" } },
        { selector: 'node[kind="pending"]', style: { "border-style": "dashed", "border-color": "#94a3b8", color: "#64748b", width: 70, height: 30, shape: "tag" } },
        { selector: 'node[kind="cert_ok"]', style: { "background-color": "#dcfce7", "border-color": "#16a34a", width: 82, height: 36, shape: "tag" } },
        { selector: 'node[kind="cert_warn"]', style: { "background-color": "#fef3c7", "border-color": "#f59e0b", width: 82, height: 36, shape: "tag" } },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "curve-style": "bezier",
            "target-arrow-shape": "none",
          },
        },
        {
          selector: 'edge[kind="relation"]',
          style: { "line-style": "dashed", "line-color": "#f97316", width: 3, label: "data(label)", "font-size": 11, "font-weight": 700, color: "#c2410c", "text-background-color": "#fff", "text-background-opacity": 1, "text-background-padding": "2px" },
        },
        {
          selector: 'edge[kind="confirmed"]',
          style: { "line-color": "#16a34a", width: 4, label: "data(label)", "font-size": 11, "font-weight": 700, color: "#166534", "text-background-color": "#fff", "text-background-opacity": 1, "text-background-padding": "2px" },
        },
      ],
    });
    cy.fit(undefined, 14);
    const onResize = () => cy.fit(undefined, 14);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cy.destroy();
    };
  }, [app, matches, confirmed, t, tx, lang]);

  return <div ref={ref} className="cy-box" aria-label="Family graph" />;
}
