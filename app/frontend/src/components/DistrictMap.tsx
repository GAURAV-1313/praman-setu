import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { geoArea, geoMercator } from "d3-geo";
import type { DistrictGeo, MisDistrict } from "../api/types";
import { useI18n } from "../i18n";

const W = 460;
const H = 620;

/** Neutral sequential orange scale. */
function color(v: number, lo: number, hi: number) {
  const stops = ["#fff1e3", "#fed7aa", "#fdba74", "#fb923c", "#ea580c", "#9a3412"];
  const x = Math.max(0, Math.min(0.9999, (v - lo) / (hi - lo || 1)));
  const i = x * (stops.length - 1);
  const a = hexToRgb(stops[Math.floor(i)]);
  const b = hexToRgb(stops[Math.floor(i) + 1]);
  const f = i - Math.floor(i);
  return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * f)).join(",")})`;
}
function hexToRgb(h: string) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export default function DistrictMap({ geo, districts }: { geo: DistrictGeo; districts: MisDistrict[] }) {
  const { lang, tx } = useI18n();
  const [tip, setTip] = useState<{ x: number; y: number; text: string; sub: string } | null>(null);

  const fixed = useMemo<DistrictGeo>(() => {
    // Guard against RFC 7946 winding (d3 expects clockwise exteriors).
    const g: DistrictGeo = JSON.parse(JSON.stringify(geo));
    for (const f of g.features) {
      const feat = f as unknown as GeoJSON.Feature;
      if (geoArea(feat) > 2 * Math.PI) {
        const geom = feat.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
        if (geom.type === "Polygon") geom.coordinates.forEach((r) => r.reverse());
        else geom.coordinates.forEach((p) => p.forEach((r) => r.reverse()));
      }
    }
    return g;
  }, [geo]);

  const projection = useMemo(() => geoMercator().fitSize([W, H], fixed as unknown as GeoJSON.FeatureCollection), [fixed]);
  const byLgd = useMemo(() => new Map(districts.map((d) => [d.lgd, d])), [districts]);
  const vals = fixed.features.map((f) => byLgd.get(Number(f.properties.lgd_code))?.rejection_pct ?? f.properties.mis_rejection_rate_pct);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);

  return (
    <div className="map-box" onMouseLeave={() => setTip(null)}>
      <ComposableMap width={W} height={H} projection={projection as never} style={{ width: "100%", height: 540, display: "block" }}>
        <Geographies geography={fixed}>
          {({ geographies }) =>
            geographies.map((g) => {
              const p = g.properties as DistrictGeo["features"][number]["properties"];
              const d = byLgd.get(Number(p.lgd_code));
              const v = d?.rejection_pct ?? p.mis_rejection_rate_pct;
              const name = lang === "hi" ? p.name_hi : p.district;
              return (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  fill={color(v, lo, hi)}
                  stroke="#ffffff"
                  strokeWidth={1}
                  tabIndex={-1}
                  style={{ default: { outline: "none" }, hover: { outline: "none", stroke: "#134a9c", strokeWidth: 2.2 }, pressed: { outline: "none" } }}
                  onMouseMove={(e) => {
                    const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect();
                    setTip({
                      x: e.clientX - box.left,
                      y: e.clientY - box.top,
                      text: `${name}: ${v.toFixed(1)}%`,
                      sub: d ? `${d.rejected.toLocaleString("en-IN")} / ${d.total.toLocaleString("en-IN")} ${tx("applications", "आवेदन")}` : "",
                    });
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tip && (
        <div className="map-tip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.text}</b>
          {tip.sub && <div style={{ opacity: 0.8, fontSize: 13 }}>{tip.sub}</div>}
        </div>
      )}
      <div style={{ maxWidth: 320, margin: "6px auto 0" }}>
        <div className="legend-bar" />
        <div className="row small muted" style={{ justifyContent: "space-between" }}>
          <span>{lo.toFixed(1)}%</span>
          <span>{tx("rejected / applications", "अस्वीकृत / आवेदन")}</span>
          <span>{hi.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
