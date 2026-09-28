import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { I18n, Lang, Role } from "./api/types";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** pick from an {en, hi} object coming from the API */
  t: (v: I18n | null | undefined) => string;
  /** inline bilingual UI copy */
  tx: (en: string, hi: string) => string;
  role: Role | null;
  setRole: (r: Role | null) => void;
  /** Presenter mode: shows demo storyline notes and technical details. Off by default (officer view). */
  presenter: boolean;
  setPresenter: (v: boolean) => void;
  /** Round 4: shadow mode (pilot phase 1) — the tool's lane / suggestion / link strength stay hidden until the
   *  officer records a decision; then the check is revealed and the officer's one-tap feedback is captured. */
  shadow: boolean;
  setShadow: (v: boolean) => void;
}

const LangContext = createContext<Ctx | null>(null);

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>((readLS("ps_lang") as Lang) || "hi");
  const [role, setRoleState] = useState<Role | null>((readLS("ps_role") as Role) || null);
  const [presenter, setPresenterState] = useState<boolean>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("presenter");
      if (q === "1" || q === "0") {
        writeLS("ps_presenter", q);
        return q === "1";
      }
    } catch {
      /* ignore */
    }
    return readLS("ps_presenter") === "1";
  });

  const [shadow, setShadowState] = useState<boolean>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("shadow");
      if (q === "1" || q === "0") {
        writeLS("ps_shadow", q);
        return q === "1";
      }
    } catch {
      /* ignore */
    }
    return readLS("ps_shadow") === "1";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.classList.toggle("shadow-mode", shadow);
  }, [shadow]);
  const setShadow = useCallback((v: boolean) => {
    setShadowState(v);
    writeLS("ps_shadow", v ? "1" : "0");
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLS("ps_lang", l);
  }, []);
  const setRole = useCallback((r: Role | null) => {
    setRoleState(r);
    writeLS("ps_role", r);
  }, []);

  const setPresenter = useCallback((v: boolean) => {
    setPresenterState(v);
    writeLS("ps_presenter", v ? "1" : "0");
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      role,
      setRole,
      presenter,
      setPresenter,
      shadow,
      setShadow,
      t: (v) => (v ? v[lang] || v.en || v.hi || "" : ""),
      tx: (en, hi) => (lang === "hi" ? hi : en),
    }),
    [lang, role, presenter, shadow, setLang, setRole, setPresenter, setShadow],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(LangContext);
  if (!c) throw new Error("useI18n outside LangProvider");
  return c;
}
