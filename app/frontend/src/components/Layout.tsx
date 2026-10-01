import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Monogram from "./Monogram";
import { api, useApiMode } from "../api/client";
import { useI18n } from "../i18n";
import type { Role } from "../api/types";
import { SyntheticBanner, SyntheticPill } from "./common";
import DemoLinks from "./DemoLinks";
import { resetDemo } from "../demo";

const ROLE_LABEL: Record<Role, { en: string; hi: string }> = {
  kendra_operator: { en: "Kendra operator", hi: "केंद्र संचालक" },
  sdo: { en: "SDO (Revenue)", hi: "अनुविभागीय अधिकारी (राजस्व)" },
  tehsildar: { en: "Tehsildar", hi: "तहसीलदार" },
  collector: { en: "Collector", hi: "कलेक्टर" },
};

export default function Layout() {
  const { lang, setLang, tx, t, role, presenter, setPresenter, shadow, setShadow } = useI18n();
  const mode = useApiMode();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const [resetting, setResetting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // probe the backend once so the mode pill is right from the start
    api.health().catch(() => undefined);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  const synthetic = /^\/(kendra|officer|audit|renewals)/.test(loc.pathname);
  // Round 3: every working screen gets ONE compact bar (≤ 56 px): brand · nav · data pill · role · language · menu.
  // The landing page keeps the full header.
  const compact = loc.pathname !== "/";

  // Round 5 (P0-2): reset restores the demo data AND every UI mode (shadow / presenter / service-down / policy /
  // "then next case" off, language HI) — see demo.ts
  async function reset() {
    setResetting(true);
    try {
      await resetDemo();
    } finally {
      setResetting(false);
      setMenu(false);
      window.location.replace("/");
    }
  }

  const officerLink = role === "tehsildar" ? "/officer?role=tehsildar" : "/officer?role=sdo";

  const langToggle = (
    <div className="lang-toggle" role="group" aria-label={tx("Language", "भाषा")}>
      <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")} aria-pressed={lang === "hi"}>
        हिंदी
      </button>
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
        EN
      </button>
    </div>
  );
  const offline =
    mode === "offline" ? (
      <span className="offline-pill" title={tx("Backend not reachable: using bundled demo data", "बैकएंड उपलब्ध नहीं: संलग्न डेमो डेटा उपयोग में")}>
        <span className="dot" /> {tx("offline", "ऑफ़लाइन")}<span className="pill-more"> {tx("demo", "डेमो")}</span>
      </span>
    ) : null;

  return (
    <div className={compact ? "app compact" : "app"}>
      {!compact && <div className="topbar">
        <div className="shell">
          <div className="topbar-left">
            {(presenter || loc.pathname === "/") && <span className="topbar-event">{tx("Sewa Setu Innovation Hackathon · PS1", "सेवा सेतु इनोवेशन हैकाथॉन · PS1")}</span>}
            <span className="small topbar-sub" style={{ opacity: 0.85 }}>
              {tx("Government of Chhattisgarh citizen services", "छत्तीसगढ़ शासन की नागरिक सेवाएँ")}
            </span>
          </div>
          <div className="topbar-right">
            {mode === "offline" && (
              <span className="offline-pill" title={tx("Backend not reachable: using bundled demo data", "बैकएंड उपलब्ध नहीं: संलग्न डेमो डेटा उपयोग में")}>
                <span className="dot" /> {tx("offline demo mode", "ऑफ़लाइन डेमो मोड")}
              </span>
            )}
            {mode === "online" && presenter && (
              <span className="online-pill">
                <span className="dot" /> {tx("live model", "लाइव मॉडल")}
              </span>
            )}
            <div className="lang-toggle" role="group" aria-label="Language">
              <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")}>
                हिंदी
              </button>
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
                English
              </button>
            </div>
          </div>
        </div>
      </div>}

      <header className="nav">
        <div className="shell">
          <NavLink to="/" className="brand">
            <Monogram text="प्र" size={38} />
            {compact ? (
              <div className="brand-title">{tx("Praman Setu", "प्रमाण सेतु")}</div>
            ) : (
              <div>
                <div className="brand-title">
                  Praman Setu · <span className="dev">प्रमाण सेतु</span>
                </div>
                <div className="brand-sub">{tx("Inside Sewa Setu · links to the family's existing certificate (demo)", "सेवा सेतु के भीतर · परिवार के मौजूदा प्रमाण पत्र से कड़ी (डेमो)")}</div>
              </div>
            )}
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/kendra">{tx("Kendra", "केंद्र")}</NavLink>
            <NavLink to={officerLink} className={() => (loc.pathname.startsWith("/officer") ? "active" : "")}>
              {tx("Officer", "अधिकारी")}
            </NavLink>
            <NavLink to="/collector">{tx("Collector", "कलेक्टर")}</NavLink>
            <NavLink to="/audit">{tx("Audit", "ऑडिट")}</NavLink>
            <NavLink to="/graph">{tx("Network", "नेटवर्क")}</NavLink>
            <NavLink to="/renewals">{tx("Renewals", "नवीनीकरण")}</NavLink>
            <NavLink to="/reader">{tx("Reader", "रीडर")}</NavLink>
          </nav>
          <div className="nav-right">
            {compact && synthetic && <SyntheticPill />}
            {compact && offline}
            {compact && mode === "online" && presenter && (
              <span className="online-pill">
                <span className="dot" /> {tx("live model", "लाइव मॉडल")}
              </span>
            )}
            {shadow && (
              <button className="shadow-pill" onClick={() => setShadow(false)} title={tx("Shadow mode (pilot phase 1): the tool's check appears only after you decide. Click to turn off.", "शैडो मोड (पायलट चरण 1): उपकरण की जांच आपके निर्णय के बाद ही दिखती है। बंद करने हेतु क्लिक करें।")}>
                {tx("Pilot phase 1 · shadow mode", "पायलट चरण 1 · शैडो मोड")}
              </button>
            )}
            {role && <span className="role-pill" title={tx("Single sign-on via Sewa Setu · inside the State Data Centre · no external API", "सेवा सेतु SSO से एकल लॉगिन · राज्य डेटा केंद्र (SDC) के भीतर · कोई बाहरी API नहीं")}>{t(ROLE_LABEL[role])}</span>}
            {compact && langToggle}
            <div className="menu" ref={menuRef}>
              <button className="menu-btn" aria-label={tx("Menu", "मेनू")} onClick={() => setMenu((m) => !m)}>
                ⋯
              </button>
              {menu && (
                <div className="menu-pop">
                  <div className="menu-nav">
                    {role && <div className="menu-role">{t(ROLE_LABEL[role])}</div>}
                    <NavLink to="/kendra" onClick={() => setMenu(false)}>
                      {tx("Kendra", "केंद्र")}
                    </NavLink>
                    <NavLink to={officerLink} className={() => (loc.pathname.startsWith("/officer") ? "active" : "")} onClick={() => setMenu(false)}>
                      {tx("Officer", "अधिकारी")}
                    </NavLink>
                    <NavLink to="/collector" onClick={() => setMenu(false)}>
                      {tx("Collector", "कलेक्टर")}
                    </NavLink>
                    <NavLink to="/audit" onClick={() => setMenu(false)}>
                      {tx("Audit", "ऑडिट")}
                    </NavLink>
                    <NavLink to="/graph" onClick={() => setMenu(false)}>
                      {tx("Family network", "परिवार नेटवर्क")}
                    </NavLink>
                    <NavLink to="/renewals" onClick={() => setMenu(false)}>
                      {tx("Renewals", "नवीनीकरण")}
                    </NavLink>
                    <NavLink to="/reader" onClick={() => setMenu(false)}>
                      {tx("Praman Reader", "प्रमाण रीडर")}
                    </NavLink>
                    <div className="menu-sep" />
                  </div>
                  <DemoLinks onPick={() => setMenu(false)} className="top" />
                  <NavLink to="/" onClick={() => setMenu(false)}>
                    {tx("Switch role", "भूमिका बदलें")}
                  </NavLink>
                  <button onClick={reset} disabled={resetting}>
                    ↺ {tx("Reset demo", "डेमो रीसेट करें")}
                  </button>
                  <div className="hint">{tx("Restores all demo cases and the default policy; clears decisions, confirmations and the audit; switches shadow, presenter, service-down and “then next case” off; language Hindi.", "सभी डेमो मामले व डिफ़ॉल्ट नीति पुनः स्थापित; निर्णय, पुष्टियाँ व ऑडिट हटते हैं; शैडो, प्रस्तुतकर्ता, सेवा-अनुपलब्ध व “फिर अगला प्रकरण” बंद; भाषा हिंदी।")}</div>
                  <label className="menu-toggle">
                    <input type="checkbox" checked={presenter} onChange={(e) => setPresenter(e.target.checked)} />
                    <span>{tx("Presenter mode", "प्रस्तुतकर्ता मोड")}</span>
                  </label>
                  <div className="hint">{tx("Shows demo story notes and technical details (model version, checker tokens).", "डेमो कथा-टिप्पणियाँ व तकनीकी विवरण दिखाता है।")}</div>
                  <label className="menu-toggle">
                    <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} id="shadow-toggle" />
                    <span>{tx("Shadow mode (pilot phase 1)", "शैडो मोड (पायलट चरण 1)")}</span>
                  </label>
                  <div className="hint">{tx("The tool's lane, suggestion and link strength stay hidden until you record your decision; then its check is shown for comparison.", "उपकरण की श्रेणी, सुझाव व कड़ी-प्रबलता आपके निर्णय तक छिपे रहते हैं; फिर तुलना हेतु उसकी जांच दिखती है।")}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {synthetic && !compact && <SyntheticBanner />}

      <main>
        <div className="shell">
          <Outlet />
        </div>
      </main>

      <footer>
        <div className="shell">
          <span>
            {tx(
              "Hackathon demo · not an official Government portal · synthetic citizen data",
              "हैकाथॉन डेमो · यह आधिकारिक शासकीय पोर्टल नहीं है · नागरिक डेटा सिंथेटिक है",
            )}
          </span>
          <span>{tx("Real Sewa Setu public MIS, fetched 27-09-2026 · built to plug into Sewa Setu", "वास्तविक सेवा सेतु सार्वजनिक MIS, 27-09-2026 · सेवा सेतु से जुड़ने हेतु निर्मित")}</span>
        </div>
      </footer>
    </div>
  );
}
