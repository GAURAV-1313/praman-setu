import { useState } from "react";
import waIcon from "../assets/whatsapp-icon.svg";
import Monogram from "./Monogram";
import { useI18n } from "../i18n";
import type { CitizenMessage } from "../api/types";

export default function WhatsAppPreview({ msg }: { msg: CitizenMessage }) {
  const { tx, presenter } = useI18n();
  const [ml, setMl] = useState<"hi" | "en">("hi"); // citizen message defaults to Hindi
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div className="row">
          <img src={waIcon} alt="" width={22} height={22} />
          <b>{tx("Message to citizen", "नागरिक को संदेश")}</b>
        </div>
        <div className="seg">
          <button className={ml === "hi" ? "on" : ""} onClick={() => setMl("hi")}>
            हिंदी
          </button>
          <button className={ml === "en" ? "on" : ""} onClick={() => setMl("en")}>
            EN
          </button>
        </div>
      </div>
      <div className="phone">
        <div className="phone-screen">
          <div className="wa-head">
            <span className="av">
              <Monogram text="SS" size={26} bg="#F5F0E6" fg="#075E54" />
            </span>
            <div>
              <b>Sewa Setu · सेवा सेतु</b>
              <small>{tx("Sample message (demo)", "नमूना संदेश (डेमो)")}</small>
            </div>
          </div>
          <div className="wa-body">
            <div className="wa-date">
              <span>{tx("Today", "आज")}</span>
            </div>
            <div className="wa-bubble">
              {msg.text[ml]}
              <span className="time">{now} ✓✓</span>
            </div>
          </div>
        </div>
      </div>
      <div className="stack" style={{ gap: 8, marginTop: 14, alignItems: "center" }}>
        {msg.checker.passed ? (
          <span className="checked-badge">
            ✓ {tx("checked: every number and name verified against records", "जांचा गया: हर संख्या और नाम अभिलेखों से सत्यापित")}
          </span>
        ) : (
          <span className="pill amber">
            {tx("Checker blocked: ", "जांचकर्ता ने रोका: ")} {msg.checker.unsupported_entities.join(", ")}
          </span>
        )}
        <span className="pill outline small">{msg.channel.toUpperCase()} + {tx("Kendra printout", "केंद्र प्रिंटआउट")}</span>
        {presenter && (
          <details className="tech small muted">
            <summary>{tx("Technical details", "तकनीकी विवरण")}</summary>
            <div>
              {tx("generator", "जनरेटर")}: <b>{msg.generator}</b>
            </div>
            {msg.checker.checked_entities.length > 0 && (
              <div>
                {tx("Checked", "जांचे गए")}: {msg.checker.checked_entities.join(" · ")}
              </div>
            )}
          </details>
        )}
      </div>
    </div>
  );
}
