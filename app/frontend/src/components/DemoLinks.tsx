/**
 * Round 5: "Demo mode" — one-click jumps to the steps of the 5-minute script, so the presenter never types a URL.
 * Used in the ⋯ menu and in the Sewa Setu console header.
 */
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

const enc = encodeURIComponent;
const id = (n: string) => enc(`SS/2026/KDG/${n}`);

export const DEMO_STEPS: { to: string; en: string; hi: string; time: string }[] = [
  { to: "/sewasetu", en: "Sewa Setu console · pending list", hi: "सेवा सेतु कंसोल · लंबित सूची", time: "0:00" },
  { to: `/sewasetu/case/${id("08790")}`, en: "Console · 08790 Rohit (clean file, DSC token)", hi: "कंसोल · 08790 रोहित (साफ़ फ़ाइल, DSC टोकन)", time: "0:20" },
  { to: `/officer/case/${id("08812")}`, en: "08812 Sunita · same family → sign → message", hi: "08812 सुनीता · वही परिवार → हस्ताक्षर → संदेश", time: "1:05" },
  { to: `/officer/case/${id("08835")}`, en: "08835 Pooja · send back (no rejection)", hi: "08835 पूजा · वापस भेजें (अस्वीकृति नहीं)", time: "2:20" },
  { to: `/officer/case/${id("08841")}`, en: "08841 Kiran · needs attention → Patwari", hi: "08841 किरण · ध्यान दें → पटवारी", time: "2:55" },
  { to: "/collector", en: "Collector · real MIS, pilot stop rules", hi: "कलेक्टर · वास्तविक MIS, पायलट रोक-नियम", time: "3:55" },
  { to: "/audit?q=004512", en: "Audit · who saw certificate 004512?", hi: "ऑडिट · प्रमाण पत्र 004512 किसने देखा?", time: "4:35" },
];

export default function DemoLinks({ onPick, className }: { onPick?: () => void; className?: string }) {
  const { tx } = useI18n();
  return (
    <div className={`demo-links ${className ?? ""}`} role="group" aria-label={tx("Demo mode: 5-minute script", "डेमो मोड: 5-मिनट स्क्रिप्ट")}>
      <div className="demo-links-head">{tx("Demo mode · 5-minute script", "डेमो मोड · 5-मिनट स्क्रिप्ट")}</div>
      <ol>
        {DEMO_STEPS.map((s, i) => (
          <li key={s.to}>
            <Link to={s.to} onClick={onPick} id={`demo-step-${i}`}>
              <span className="demo-t">{s.time}</span> {tx(s.en, s.hi)}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
