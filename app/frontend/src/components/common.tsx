import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import type { I18n, Lane, Service, SlaClock } from "../api/types";
import scstIcon from "../assets/services/scst.svg";
import obcIcon from "../assets/services/obc.svg";
import domicileIcon from "../assets/services/domicile.svg";
import landIcon from "../assets/services/land.svg";

export const SERVICE_ICON: Record<Service, string> = {
  caste_st: scstIcon,
  caste_sc: scstIcon,
  caste_obc: obcIcon,
  domicile: domicileIcon,
};
export { landIcon };

export const SERVICE_SHORT: Record<Service, I18n> = {
  caste_st: { en: "Caste · ST", hi: "जाति · अ.ज.जा." },
  caste_sc: { en: "Caste · SC", hi: "जाति · अ.जा." },
  caste_obc: { en: "Caste · OBC", hi: "जाति · अ.पि.व." },
  domicile: { en: "Domicile", hi: "मूल निवास" },
};

export const LANE_LABEL: Record<Lane, I18n> = {
  records_complete: { en: "Records complete", hi: "अभिलेख पूर्ण" },
  standard_review: { en: "Standard review", hi: "सामान्य जांच" },
  needs_attention: { en: "Needs attention", hi: "ध्यान दें" },
};

export const ACTION_LABEL: Record<string, I18n> = {
  approve: { en: "Approve", hi: "स्वीकृत करें" },
  send_back: { en: "Send back", hi: "वापस भेजें" },
  refer: { en: "Refer", hi: "संदर्भित करें" },
  reject: { en: "Reject", hi: "अस्वीकृत करें" },
  show_cause: { en: "Pre-rejection hearing notice", hi: "पूर्व-अस्वीकृति सुनवाई सूचना" },
};
export const ACTION_ICON: Record<string, string> = { approve: "✓", send_back: "↩", refer: "⇆", reject: "✕", show_cause: "⚖" };

export const STATUS_LABEL: Record<string, I18n> = {
  pending: { en: "Pending", hi: "लंबित" },
  approved: { en: "Approved", hi: "स्वीकृत" },
  sent_back: { en: "Sent back", hi: "वापस भेजा" },
  referred: { en: "Referred", hi: "संदर्भित" },
  rejected: { en: "Rejected", hi: "अस्वीकृत" },
  show_cause_issued: { en: "Hearing notice issued", hi: "सुनवाई सूचना जारी" },
  awaiting_patwari: { en: "Awaiting Patwari report", hi: "पटवारी प्रतिवेदन की प्रतीक्षा" },
};

/** Round 4 (P1-A3): which Sewa Setu status each Praman action writes back. */
export const SEWASETU_STATUS: Record<string, I18n> = {
  approve: { en: "Writes Sewa Setu status: Approve (certificate issued with QR, pushed to DigiLocker)", hi: "सेवा सेतु में स्थिति: Approve (QR सहित प्रमाण पत्र, DigiLocker में)" },
  send_back: { en: "Writes Sewa Setu status: Sendback (to the applicant)", hi: "सेवा सेतु में स्थिति: Sendback (आवेदक को)" },
  refer: { en: "Writes Sewa Setu status: Sendback (to the Patwari / Committee; the applicant is informed)", hi: "सेवा सेतु में स्थिति: Sendback (पटवारी / समिति को, आवेदक को सूचना सहित)" },
  reject: { en: "Writes Sewa Setu status: pre-rejection hearing notice first, then Reject", hi: "सेवा सेतु में स्थिति: पहले सुनवाई सूचना, फिर Reject" },
};

/** Round 4: masks long identifiers (ration card etc.) to the last 4 digits for display. */
export function maskIds(s: string): string {
  return (s ?? "").replace(/\b(\d{4,})(\d{4})\b/g, "••••$2");
}

export const CATEGORY_LABEL: Record<string, I18n> = {
  ST: { en: "ST", hi: "अ.ज.जा." },
  SC: { en: "SC", hi: "अ.जा." },
  OBC: { en: "OBC", hi: "अ.पि.व." },
};

export function LaneChip({ lane, large, animateKey, popOnMount, title }: { lane: Lane; large?: boolean; animateKey?: string | number; popOnMount?: boolean; title?: string }) {
  const { t } = useI18n();
  const [pop, setPop] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current && !popOnMount) {
      first.current = false;
      return;
    }
    setPop(true);
    const id = setTimeout(() => setPop(false), 1200);
    return () => clearTimeout(id);
  }, [lane, animateKey]);
  return (
    <span className={`lane-chip ${lane} ${large ? "lg" : ""} ${pop ? "pop" : ""}`} title={title}>
      <span className="dot" />
      {t(LANE_LABEL[lane])}
    </span>
  );
}

export function Tick({ ok, neutral }: { ok: boolean; neutral?: boolean }) {
  if (neutral) return <span className="tick neutral">–</span>;
  return <span className={`tick ${ok ? "ok" : "no"}`}>{ok ? "✓" : "!"}</span>;
}

export function Loading({ label }: { label?: string }) {
  const { tx } = useI18n();
  return (
    <div className="loading-box">
      <span className="spinner" /> {label ?? tx("Loading…", "लोड हो रहा है…")}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="error-box">{error instanceof Error ? error.message : String(error)}</div>;
}

/** Round 3: the synthetic-data notice as a small pill in the compact officer bar. */
export function SyntheticPill() {
  const { tx } = useI18n();
  return (
    <span className="synth-pill" role="note" title={tx("All citizen data on this screen is synthetic (demo)", "इस स्क्रीन का सारा नागरिक डेटा नमूना (डेमो) है")}>
      {tx("Synthetic data", "नमूना डेटा")}
    </span>
  );
}

export function SyntheticBanner() {
  return (
    <div className="data-banner synthetic" role="note">
      <span>●</span> SYNTHETIC DEMO DATA · नमूना डेटा <span>●</span>
    </div>
  );
}

export function Section({ title, sub, right, children, className }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ""}`}>
      <div className="card-title">
        {title}
        {sub && <span className="sub">{sub}</span>}
        <span className="spacer" />
        {right}
      </div>
      {children}
    </section>
  );
}

/** Bilingual name: current-language primary, other script secondary. */
export function Bi({ v, inline }: { v: I18n | null | undefined; inline?: boolean }) {
  const { lang } = useI18n();
  if (!v) return <>—</>;
  const main = v[lang];
  const alt = lang === "hi" ? v.en : v.hi;
  if (!alt || alt === main) return <>{main}</>;
  return inline ? (
    <>
      {main} <span className="dev-alt">· {alt}</span>
    </>
  ) : (
    <>
      <b>{main}</b>
      <span className="alt">{alt}</span>
    </>
  );
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    run()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run]);
  useEffect(() => {
    return reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Calendar days from today (IST) to the due date — same maths as the backend queue. */
export function slaDaysLeft(due: string): number {
  const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  return Math.round((Date.parse(due.slice(0, 10)) - Date.parse(today)) / 86400000);
}

/** Officers read DD-MM-YYYY (the format used in orders), in both languages. */
export function fmtDate(iso: string, _lang?: "en" | "hi") {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00+05:30" : iso);
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(ist.getUTCDate())}-${p(ist.getUTCMonth() + 1)}-${ist.getUTCFullYear()}`;
}
export function fmtDateTime(iso: string, lang: "en" | "hi") {
  const d = new Date(iso);
  return d.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function fmtNum(n: number, lang: "en" | "hi") {
  return n.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");
}
export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

/** Keyboard-shortcut hint. */
export function Kbd({ k }: { k: string }) {
  return <kbd className="kbd">{k}</kbd>;
}

/** Placeholders that must never reach a signed order: "[ ...... ]", "[Officer …]", "Date: ______". */
export const PLACEHOLDER_RE = /\[\s*(\.{3,}|…)|\[\s*(Officer|अधिकारी|written findings|लिखित|specify|आवश्यक दस्तावेज़)|_{4,}/;

export function todayDMY(): string {
  const d = new Date(Date.now() + 5.5 * 3600000); // IST
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

/** Round 6: the SLA clock while a hearing notice (15 d) or a Patwari referral (7 d) is out. Running by default; the
 *  pause is a PROPOSED policy (needs a Revenue order) and only changes this label, never a due date. */
export function SlaClockNote({ clock }: { clock?: SlaClock | null }) {
  const { t, tx } = useI18n();
  if (!clock) return null;
  return (
    <span
      className={`sla-clock ${clock.paused ? "paused" : ""}`}
      title={tx(
        "Hearing (15 days) and Patwari (7 days) timers run inside the 22-day SLA. A pause needs a Revenue Department order; the tool never changes a due date.",
        "सुनवाई (15 दिन) व पटवारी (7 दिन) की अवधि 22 दिन की SLA के भीतर चलती है। रोकने हेतु राजस्व विभाग का आदेश आवश्यक; उपकरण कोई नियत तिथि नहीं बदलता।",
      )}
    >
      {clock.paused ? "⏸" : "⏱"} {t(clock.label)}
    </span>
  );
}
