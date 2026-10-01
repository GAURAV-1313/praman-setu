/**
 * Round 7: village autocomplete (LGD) for the native / maiden village. Searches the whole state by default,
 * because a married woman's parental village is often in the neighbouring district.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import type { Village } from "../api/types";
import { Bi } from "./common";

export default function VillagePicker({
  id,
  value,
  text,
  onChange,
  districtLgd,
  placeholder,
  autoFocus,
}: {
  id: string;
  value: Village | null;
  text: string;
  onChange: (v: Village | null, text: string) => void;
  districtLgd?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { t, tx } = useI18n();
  const [sugg, setSugg] = useState<Village[]>([]);
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !text.trim()) {
      setSugg([]);
      return;
    }
    let alive = true;
    const idt = setTimeout(() => {
      api
        .villages(districtLgd, text.trim())
        .then((v) => {
          if (!alive) return;
          setSugg(v);
          setHl(0);
          // typed the full name of exactly one village but did not tap the list: take it (the LGD line below shows it)
          const q = text.trim().toLowerCase();
          const exact = v.filter((x) => x.name.en.toLowerCase() === q || x.name.hi === text.trim());
          if (!value && exact.length === 1) onChange(exact[0], text);
        })
        .catch(() => alive && setSugg([]));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(idt);
    };
  }, [text, districtLgd, open]);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (v: Village) => {
    onChange(v, t(v.name));
    setOpen(false);
  };

  return (
    <div className="vpick" ref={ref} style={{ position: "relative" }}>
      <input
        id={id}
        className="input"
        autoComplete="off"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder ?? tx("Type the village name…", "गांव का नाम टाइप करें…")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(null, e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || sugg.length === 0) return;
          if (e.key === "ArrowDown") (e.preventDefault(), setHl((h) => Math.min(h + 1, sugg.length - 1)));
          if (e.key === "ArrowUp") (e.preventDefault(), setHl((h) => Math.max(h - 1, 0)));
          if (e.key === "Enter") {
            e.preventDefault();
            pick(sugg[hl]);
          }
          if (e.key === "Escape") (e.stopPropagation(), setOpen(false));
        }}
      />
      {open && sugg.length > 0 && (
        <div className="ac-list" role="listbox">
          {sugg.map((v, i) => (
            <button
              type="button"
              key={v.village_lgd}
              className={i === hl ? "hl" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(v);
              }}
            >
              <span>
                <Bi v={v.name} inline />
              </span>
              <span className="small muted">
                {t(v.tehsil)}
                {v.district ? ` · ${t(v.district)}` : ""} · <span className="mono">{v.village_lgd}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {value && (
        <span className="small muted">
          LGD {value.village_lgd} · {t(value.tehsil)}
          {value.district ? ` · ${t(value.district)}` : ""}
        </span>
      )}
    </div>
  );
}
