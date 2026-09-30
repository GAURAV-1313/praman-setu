import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { useI18n } from "../i18n";
import type { FamilyGraph, GraphNode } from "../api/insights";

/** Round 8a: interactive 3-generation family network (pan / zoom / tap). SYNTHETIC. */
export default function FamilyNetwork({ g, highlight, onSelect }: { g: FamilyGraph; highlight: string[]; onSelect: (n: GraphNode | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { t, tx, lang } = useI18n();

  useEffect(() => {
    if (!ref.current) return;
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    const people = g.nodes.filter((n) => n.kind === "person" || n.kind === "applicant");
    const holderOf = new Map<string, string>();
    g.edges.forEach((e) => e.kind === "holds" && holderOf.set(e.target, e.source));
    // layout: generation rows; the applicant's line in the middle; things outside the tree on the right
    const ORDER: Record<string, number> = { grandfather: 0, grandmother: 1, uncle: 2, father: 3, mother: 4, applicant: 5, spouse: 6, sibling: 7, outside: 9 };
    const pos = new Map<string, { x: number; y: number }>();
    [1, 2, 3].forEach((gen) => {
      const row = people.filter((p) => (p.gen ?? 3) === gen).sort((a, b) => (ORDER[a.rel ?? ""] ?? 8) - (ORDER[b.rel ?? ""] ?? 8));
      row.forEach((p, i) => pos.set(p.id, { x: i * 300, y: (gen - 1) * 170 }));
    });
    const certCount = new Map<string, number>();
    g.nodes.forEach((n) => {
      if (n.kind !== "cert" && n.kind !== "application") return;
      const h = n.kind === "application" ? g.nodes.find((x) => x.kind === "applicant")?.id : holderOf.get(n.id);
      const hp = (h && pos.get(h)) || { x: 0, y: 0 };
      const k = certCount.get(h ?? "") ?? 0;
      certCount.set(h ?? "", k + 1);
      pos.set(n.id, { x: hp.x + 150, y: hp.y + (k - (n.kind === "application" ? -1 : 0)) * 44 - 22 });
    });

    const nm = (n: GraphNode) => {
      const s = t(n.label);
      return s.length > 18 ? s.split(" ")[0] : s;
    };
    const els: cytoscape.ElementDefinition[] = g.nodes.map((n) => {
      let label = "";
      let kind: string = n.kind;
      if (n.kind === "person" || n.kind === "applicant") {
        label = `${nm(n)}\n${n.rel_label ? t(n.rel_label) : ""}${n.birth_year ? ` · ${n.birth_year}` : ""}`;
        if (n.rel === "outside") kind = "outside";
        if (n.name_only) kind = "name_only";
      } else if (n.kind === "cert") {
        const st = n.status === "cancelled" ? tx("cancelled", "निरस्त") : n.status === "under_scrutiny" ? tx("scrutiny", "जांचाधीन") : "";
        label = `${n.category ?? tx("Domicile", "मूल निवास")} · ${n.issue_year}${n.authority_role === "Tehsildar" && n.service !== "domicile" ? ` · ${tx("Tehsildar", "तहसीलदार")}` : ""}${st ? `\n${st}` : ""}`;
        kind = n.use === "relied" ? "cert_relied" : n.use === "dismissed" ? "cert_dismissed" : n.status !== "active" ? "cert_warn" : n.use === "candidate" ? "cert_candidate" : "cert";
      } else {
        label = t(n.label);
      }
      return { data: { id: n.id, label, kind, hl: highlight.includes(n.id) ? 1 : 0 }, position: pos.get(n.id) ?? { x: 0, y: 0 } };
    });
    g.edges.forEach((e) => {
      if (!byId.has(e.source) || !byId.has(e.target)) return;
      const lab = e.kind === "match" ? `${e.use === "relied" ? "✓ " : e.use === "dismissed" ? "✗ " : ""}${Math.round((e.probability ?? 0) * 100)}% · ${e.relation_label ? t(e.relation_label) : ""}` : "";
      els.push({ data: { id: e.id, source: e.source, target: e.target, kind: e.kind === "match" ? `match_${e.use ?? "candidate"}` : e.kind, label: lab } });
    });

    const cy = cytoscape({
      container: ref.current,
      elements: els,
      layout: { name: "preset", padding: 24 },
      minZoom: 0.4,
      maxZoom: 2,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      autoungrabify: false,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)", "text-wrap": "wrap", "text-valign": "center", "text-halign": "center",
            "font-family": "Space Grotesk, Noto Sans Devanagari, sans-serif", "font-size": 12, "font-weight": 600, color: "#0f172a",
            width: 150, height: 50, shape: "round-rectangle", "background-color": "#e8effb", "border-width": 2, "border-color": "#134a9c",
          },
        },
        { selector: 'node[kind="applicant"]', style: { "background-color": "#fff1e6", "border-color": "#f97316", "border-width": 3 } },
        { selector: 'node[kind="name_only"]', style: { "background-color": "#f8fafc", "border-style": "dashed", "border-color": "#94a3b8", color: "#475569" } },
        { selector: 'node[kind="outside"]', style: { "background-color": "#f8fafc", "border-style": "dotted", "border-color": "#64748b" } },
        { selector: 'node[kind="application"]', style: { shape: "tag", width: 110, height: 34, "font-size": 11, "background-color": "#fff", "border-style": "dashed", "border-color": "#f97316", color: "#9a3412" } },
        { selector: 'node[kind^="cert"]', style: { shape: "tag", width: 110, height: 38, "font-size": 11, "background-color": "#ffffff", "border-color": "#94a3b8" } },
        { selector: 'node[kind="cert_relied"]', style: { "background-color": "#dcfce7", "border-color": "#16a34a", "border-width": 3 } },
        { selector: 'node[kind="cert_candidate"]', style: { "background-color": "#fff7ed", "border-color": "#f97316", "border-style": "dashed" } },
        { selector: 'node[kind="cert_dismissed"]', style: { "background-color": "#f1f5f9", "border-color": "#94a3b8", color: "#64748b" } },
        { selector: 'node[kind="cert_warn"]', style: { "background-color": "#fef3c7", "border-color": "#d97706" } },
        { selector: "node[hl = 1]", style: { "overlay-color": "#f59e0b", "overlay-opacity": 0.18, "overlay-padding": 7, "border-color": "#d97706", "border-width": 4 } },
        { selector: "node:selected", style: { "overlay-color": "#134a9c", "overlay-opacity": 0.12, "overlay-padding": 6 } },
        { selector: "edge", style: { width: 2, "line-color": "#94a3b8", "curve-style": "bezier" } },
        { selector: 'edge[kind="parent"]', style: { "target-arrow-shape": "triangle", "target-arrow-color": "#94a3b8", "arrow-scale": 0.8 } },
        { selector: 'edge[kind="spouse"]', style: { "line-style": "dotted", "line-color": "#cbd5e1" } },
        { selector: 'edge[kind="holds"]', style: { width: 1.5, "line-color": "#cbd5e1" } },
        { selector: 'edge[kind="applied"]', style: { width: 1.5, "line-style": "dashed", "line-color": "#fdba74" } },
        {
          selector: 'edge[kind^="match"]',
          style: {
            "curve-style": "unbundled-bezier", "control-point-distances": [-60], "control-point-weights": [0.5],
            "line-style": "dashed", "line-color": "#f97316", width: 3, label: "data(label)", "font-size": 11, "font-weight": 700,
            color: "#c2410c", "text-background-color": "#fff", "text-background-opacity": 1, "text-background-padding": "2px",
            "target-arrow-shape": "triangle", "target-arrow-color": "#f97316",
          },
        },
        { selector: 'edge[kind="match_relied"]', style: { "line-style": "solid", "line-color": "#16a34a", "target-arrow-color": "#16a34a", color: "#166534" } },
        { selector: 'edge[kind="match_dismissed"]', style: { "line-color": "#94a3b8", "target-arrow-color": "#94a3b8", color: "#64748b" } },
      ],
    });
    cy.on("tap", "node", (ev) => onSelect(byId.get(ev.target.id()) ?? null));
    cy.on("tap", (ev) => {
      if (ev.target === cy) onSelect(null);
    });
    cy.fit(undefined, 24);
    cyRef.current = cy;
    const onResize = () => cy.fit(undefined, 24);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, lang]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().forEach((n) => {
      n.data("hl", highlight.includes(n.id()) ? 1 : 0);
    });
  }, [highlight]);

  return (
    <div className="fnet-wrap">
      <div ref={ref} className="fnet-box" aria-label={tx("Family network", "परिवार नेटवर्क")} />
      <button className="btn secondary sm fnet-fit" onClick={() => cyRef.current?.fit(undefined, 24)}>
        ⤢ {tx("Fit", "फिट करें")}
      </button>
    </div>
  );
}
