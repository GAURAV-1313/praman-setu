import { useNavigate } from "react-router-dom";
import heroBanner from "../assets/hero-banner.jpg";
import { useI18n } from "../i18n";
import type { Role } from "../api/types";
import {
  CollectorIllustration,
  FamilyTreeIllustration,
  KendraIllustration,
  SdoIllustration,
  TehsildarIllustration,
} from "../illustrations";

export default function Landing() {
  const { tx, setRole } = useI18n();
  const nav = useNavigate();

  const roles: { role: Role; to: string; title: string; body: string; ill: JSX.Element }[] = [
    {
      role: "kendra_operator",
      to: "/kendra",
      title: tx("Kendra Operator", "केंद्र संचालक"),
      body: tx("Pre-check before the fee: find a family certificate, or show exactly what's missing.", "शुल्क से पहले जांच: परिवार का प्रमाण पत्र खोजें, या बताएं कि क्या कमी है।"),
      ill: <KendraIllustration />,
    },
    {
      role: "sdo",
      to: "/officer?role=sdo",
      title: tx("SDO (Revenue)", "अनुविभागीय अधिकारी (राजस्व)"),
      body: tx("Permanent SC/ST/OBC certificates. Side-by-side evidence, draft order, you sign.", "स्थायी अ.जा./अ.ज.जा./अ.पि.व. प्रमाण पत्र। साक्ष्य आमने-सामने, प्रारूप आदेश, हस्ताक्षर आपके।"),
      ill: <SdoIllustration />,
    },
    {
      role: "tehsildar",
      to: "/officer?role=tehsildar",
      title: tx("Tehsildar", "तहसीलदार"),
      body: tx("Domicile and temporary caste certificates, with land and ration evidence.", "मूल निवास व अस्थायी जाति प्रमाण पत्र, भू-अभिलेख व राशन साक्ष्य सहित।"),
      ill: <TehsildarIllustration />,
    },
    {
      role: "collector",
      to: "/collector",
      title: tx("Collector", "कलेक्टर"),
      body: tx("Real Sewa Setu MIS: where rejections concentrate, and what a pilot would measure.", "वास्तविक सेवा सेतु MIS: अस्वीकृतियाँ कहाँ केंद्रित हैं, और पायलट क्या मापेगा।"),
      ill: <CollectorIllustration />,
    },
  ];

  return (
    <div className="fade-in">
      {/* Round 5: banner cropped (hero-banner.jpg) so no ID-card-like graphic is visible; shown as a slim strip */}
      <div className="hero banner">
        <img src={heroBanner} alt={tx("Lok Seva Kendra banner", "लोक सेवा केंद्र बैनर")} />
      </div>

      <div className="value">
        <div>
          <span className="pill orange">{tx("PS1 · Caste & domicile certificates", "PS1 · जाति एवं मूल निवास प्रमाण पत्र")}</span>
          <h1 style={{ marginTop: 12 }}>
            {tx("The state already holds ", "आपके परिवार का प्रमाण ")}
            <span className="accent">{tx("your family's proof.", "शासन के पास पहले से है।")}</span>
          </h1>
          <div className="credit-line" id="credit-line">
            <b>{tx("Sewa Setu made it fast (95.7% on time, REAL MIS)", "सेवा सेतु ने गति दी (95.7% समय पर, वास्तविक MIS)")}</b> · {tx("we add the evidence, not a new portal", "हम साक्ष्य जोड़ते हैं, नया पोर्टल नहीं")}
          </div>
          <p>
            {tx(
              "Praman Setu finds a parent's or sibling's earlier certificate in the Sewa Setu archive, shows the officer why it matches, and drafts a reasoned order. The officer always decides.",
              "प्रमाण सेतु सेवा सेतु अभिलेखागार में माता-पिता या भाई-बहन का पुराना प्रमाण पत्र खोजता है, अधिकारी को मिलान का कारण दिखाता है, और तर्कसंगत आदेश का प्रारूप बनाता है। निर्णय सदैव अधिकारी का।",
            )}
          </p>
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button
              className="btn blue"
              id="cta-sewasetu"
              onClick={() => {
                setRole("sdo");
                nav("/sewasetu");
              }}
            >
              {tx("Open inside Sewa Setu (SDO) →", "सेवा सेतु में खोलें (एसडीओ) →")}
            </button>
            <span className="small muted">{tx("Same Sewa Setu screen, same Approve button, one new panel.", "वही सेवा सेतु स्क्रीन, वही Approve बटन, एक नया पैनल।")}</span>
          </div>
          <div className="points">
            <span className="pill blue">✓ {tx("Officer decides and signs", "अधिकारी निर्णय लेते व हस्ताक्षर करते हैं")}</span>
            <span className="pill blue">✓ {tx("No match = normal review, never a rejection", "मिलान नहीं = सामान्य जांच, अस्वीकृति नहीं")}</span>
            <span className="pill blue">✓ {tx("Every access logged", "हर पहुंच दर्ज")}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <FamilyTreeIllustration size={380} />
        </div>
      </div>

      <div className="section-label">{tx("Choose a role to enter the demo (mock login)", "डेमो में प्रवेश हेतु भूमिका चुनें (मॉक लॉगिन)")}</div>
      <div className="roles">
        {roles.map((r) => (
          <button
            key={r.role}
            className="role-card"
            onClick={() => {
              setRole(r.role);
              nav(r.to);
            }}
          >
            <div className="ill">{r.ill}</div>
            <h3>{r.title}</h3>
            <p>{r.body}</p>
            <span className="go">{tx("Enter", "प्रवेश करें")} →</span>
          </button>
        ))}
      </div>

      <div className="credit">
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>
            {tx("Built to plug into Sewa Setu", "सेवा सेतु से जुड़ने हेतु निर्मित")}
          </div>
          <div style={{ fontWeight: 600 }}>{tx("Sewa Setu already delivers at scale. We add evidence, not a new portal.", "सेवा सेतु पहले से बड़े पैमाने पर सेवा देता है। हम नया पोर्टल नहीं, साक्ष्य जोड़ते हैं।")}</div>
        </div>
        <span className="spacer" />
        <div className="stat">
          <span className="big">95.7%</span>
          <small>{tx("resolved on time (REAL MIS)", "समय पर निराकरण (वास्तविक MIS)")}</small>
        </div>
        <div className="stat">
          <span className="big">900+</span>
          <small>{tx("services online", "ऑनलाइन सेवाएँ")}</small>
        </div>
        <div className="stat">
          <span className="big">53.9 L</span>
          <small>{tx("applications since the portal went live (to 27-09-2026)", "आवेदन, पोर्टल आरंभ से (27-09-2026 तक)")}</small>
        </div>
      </div>

      <div className="guardrails">
        {[
          [tx("The officer decides and signs. Drafts cite records only.", "अधिकारी निर्णय लेते व हस्ताक्षर करते हैं। प्रारूप में केवल अभिलेखों का उल्लेख।"), "✍"],
          [tx("No caste scoring. Caste comes only from certificates.", "जाति का कोई स्कोर नहीं। जाति केवल प्रमाण पत्रों से।"), "⚖"],
          [tx("Missing data never means ineligible.", "डेटा की कमी का अर्थ अपात्रता नहीं।"), "○"],
          [tx("Runs inside the State Data Centre. No external APIs.", "राज्य डेटा सेंटर के भीतर। कोई बाहरी API नहीं।"), "⛨"],
        ].map(([text, ico]) => (
          <div key={text} className="guardrail">
            <span className="ico">{ico}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
