/* Flat inline illustrations in the Sewa Setu palette (blue #134a9c, orange #f97316, cream). */
const B = "#134a9c";
const B2 = "#3b6fc4";
const BS = "#dbe6f7";
const O = "#f97316";
const O2 = "#fdba74";
const OS = "#ffe8d4";
const G = "#16a34a";
const INK = "#1e293b";
const SKIN = "#f2c6a0";
const SKIN2 = "#d9a47c";

interface P { size?: number; className?: string }

function Person({ x, y, s = 1, shirt = B, hair = INK, skin = SKIN, female = false }: { x: number; y: number; s?: number; shirt?: string; hair?: string; skin?: string; female?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-16 34 C-16 18 -9 12 0 12 C9 12 16 18 16 34 Z" fill={shirt} />
      <circle cx="0" cy="0" r="10" fill={skin} />
      {female ? (
        <path d="M-10 -1 C-11 -12 11 -12 10 -1 C10 6 12 10 12 14 L6 8 C4 -2 -4 -2 -6 8 L-12 14 C-12 10 -10 6 -10 -1 Z" fill={hair} />
      ) : (
        <path d="M-10 -2 C-10 -12 10 -12 10 -2 C6 -6 -6 -6 -10 -2 Z" fill={hair} />
      )}
    </g>
  );
}

function CertBadge({ x, y, ok = true }: { x: number; y: number; ok?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-11" y="-14" width="22" height="28" rx="3" fill="#fff" stroke={B} strokeWidth="1.8" />
      <rect x="-7" y="-9" width="14" height="2.4" rx="1" fill={B2} />
      <rect x="-7" y="-4" width="10" height="2" rx="1" fill={BS} />
      <rect x="-7" y="0" width="12" height="2" rx="1" fill={BS} />
      <circle cx="6" cy="9" r="7" fill={ok ? G : O} stroke="#fff" strokeWidth="1.5" />
      {ok ? <path d="M3 9 l2 2 l4 -4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /> : <text x="6" y="12" fontSize="9" textAnchor="middle" fill="#fff" fontWeight="700">?</text>}
    </g>
  );
}

/** Family tree / lineage: grandfather → father → applicant with certificates. */
export function FamilyTreeIllustration({ size = 360, className }: P) {
  return (
    <svg viewBox="0 0 360 260" width={size} height={(size * 260) / 360} className={className} role="img" aria-label="Family lineage illustration">
      <circle cx="180" cy="130" r="122" fill={OS} opacity=".55" />
      <circle cx="300" cy="44" r="26" fill={BS} opacity=".7" />
      {/* connectors */}
      <g stroke={B2} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M180 76 V100 M110 100 H250 M110 100 V124 M250 100 V124" />
        <path d="M110 176 V196 M70 196 H150 M70 196 V210 M150 196 V210" strokeDasharray="0" />
      </g>
      {/* grandparent */}
      <Person x={180} y={38} s={1} shirt="#475569" hair="#cbd5e1" skin={SKIN2} />
      <CertBadge x={216} y={50} />
      {/* parents generation */}
      <Person x={110} y={138} shirt={B} />
      <CertBadge x={146} y={150} />
      <Person x={250} y={138} shirt={O} hair={INK} female />
      {/* children */}
      <Person x={70} y={222} s={0.85} shirt={O} female />
      <Person x={150} y={222} s={0.85} shirt={B2} />
      <g transform="translate(70 222)">
        <circle cx="0" cy="4" r="30" fill="none" stroke={O} strokeWidth="3" strokeDasharray="5 4" />
      </g>
      {/* link arrow from father cert to child */}
      <path d="M150 168 C 150 190, 110 200, 98 206" stroke={G} strokeWidth="2.5" fill="none" strokeDasharray="4 4" markerEnd="url(#arrG)" />
      <defs>
        <marker id="arrG" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={G} />
        </marker>
      </defs>
      {/* sparkle */}
      <g fill={O}>
        <path d="M300 170 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" />
        <path d="M40 60 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" opacity=".7" />
      </g>
    </svg>
  );
}

/** Certificate with QR code and verified seal. */
export function CertificateIllustration({ size = 150, ok = true, className }: P & { ok?: boolean }) {
  const qr = [
    "1110111", "1010101", "1110111", "0001000", "1011101", "0110110", "1101011",
  ];
  return (
    <svg viewBox="0 0 150 170" width={size} height={(size * 170) / 150} className={className} role="img" aria-label="Certificate with QR code">
      <rect x="18" y="14" width="112" height="146" rx="10" fill="#e8eef8" transform="rotate(-4 74 87)" />
      <rect x="20" y="8" width="112" height="146" rx="10" fill="#fff" stroke={B} strokeWidth="2.5" />
      <rect x="20" y="8" width="112" height="26" rx="10" fill={B} />
      <rect x="20" y="24" width="112" height="10" fill={B} />
      <circle cx="36" cy="21" r="7" fill={O2} />
      <rect x="48" y="16" width="60" height="5" rx="2" fill="#fff" opacity=".9" />
      <rect x="48" y="24" width="40" height="4" rx="2" fill="#fff" opacity=".6" />
      <rect x="32" y="46" width="88" height="5" rx="2" fill={BS} />
      <rect x="32" y="56" width="70" height="5" rx="2" fill={BS} />
      <rect x="32" y="66" width="80" height="5" rx="2" fill={BS} />
      <rect x="32" y="76" width="54" height="5" rx="2" fill={OS} />
      <g transform="translate(32 92)">
        <rect x="-3" y="-3" width="48" height="48" rx="4" fill="#fff" stroke={BS} />
        {qr.map((row, r) =>
          row.split("").map((c, i) => (c === "1" ? <rect key={`${r}-${i}`} x={i * 6} y={r * 6} width="6" height="6" fill={INK} /> : null)),
        )}
      </g>
      <g transform="translate(106 118)">
        <circle r="18" fill={ok ? G : O} />
        <circle r="13" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2" />
        {ok ? (
          <path d="M-7 0 l5 5 l9 -10" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <text y="6" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff">!</text>
        )}
      </g>
    </svg>
  );
}

/** Shield with check and pen: "the officer decides". */
export function ShieldIllustration({ size = 120, className }: P) {
  return (
    <svg viewBox="0 0 140 130" width={size} height={(size * 130) / 140} className={className} role="img" aria-label="Officer decides">
      <circle cx="70" cy="66" r="60" fill={OS} />
      <path d="M70 12 L112 28 V62 C112 88 94 106 70 116 C46 106 28 88 28 62 V28 Z" fill={B} />
      <path d="M70 22 L102 34 V62 C102 82 89 97 70 105 C51 97 38 82 38 62 V34 Z" fill={B2} />
      <path d="M52 64 l12 12 l24 -26" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(104 88) rotate(35)">
        <rect x="-5" y="-30" width="10" height="44" rx="3" fill={O} />
        <path d="M-5 14 L0 26 L5 14 Z" fill={INK} />
        <rect x="-5" y="-30" width="10" height="8" rx="2" fill="#c2410c" />
      </g>
    </svg>
  );
}

/** Magnifier over family tree for empty/no-match states. */
export function SearchFamilyIllustration({ size = 180, className }: P) {
  return (
    <svg viewBox="0 0 200 150" width={size} height={(size * 150) / 200} className={className} role="img" aria-label="Search family records">
      <circle cx="100" cy="78" r="66" fill={BS} opacity=".6" />
      <g stroke={B2} strokeWidth="2.5" fill="none">
        <path d="M100 44 V60 M64 60 H136 M64 60 V76 M136 60 V76" />
      </g>
      <Person x={100} y={26} s={0.75} shirt="#64748b" hair="#cbd5e1" />
      <Person x={64} y={90} s={0.75} shirt={B} />
      <Person x={136} y={90} s={0.75} shirt={O} female />
      <g transform="translate(150 104)">
        <circle r="22" fill="#fff" fillOpacity=".55" stroke={O} strokeWidth="6" />
        <path d="M16 16 L34 34" stroke={O} strokeWidth="9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Role illustrations for the landing page. */
export function KendraIllustration({ size = 130 }: P) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={(size * 110) / 160} aria-hidden>
      <rect x="10" y="70" width="140" height="10" rx="3" fill={B} />
      <rect x="18" y="80" width="8" height="26" fill={B2} />
      <rect x="134" y="80" width="8" height="26" fill={B2} />
      <rect x="46" y="28" width="62" height="40" rx="5" fill={INK} />
      <rect x="50" y="32" width="54" height="31" rx="3" fill={BS} />
      <rect x="55" y="38" width="30" height="4" rx="2" fill={B} />
      <rect x="55" y="46" width="42" height="3" rx="1.5" fill="#fff" />
      <circle cx="94" cy="54" r="5" fill={G} />
      <rect x="70" y="68" width="14" height="4" fill={INK} />
      <Person x={128} y={36} s={0.9} shirt={O} female />
      <Person x={26} y={38} s={0.85} shirt={B2} />
      <rect x="112" y="60" width="20" height="10" rx="2" fill="#fff" stroke={O} />
    </svg>
  );
}
export function SdoIllustration({ size = 130 }: P) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={(size * 110) / 160} aria-hidden>
      <rect x="20" y="74" width="120" height="8" rx="3" fill={B} />
      <Person x={60} y={40} s={1} shirt={B} />
      <g transform="translate(96 30)">
        <rect x="0" y="0" width="40" height="44" rx="4" fill="#fff" stroke={B} strokeWidth="2" />
        <rect x="6" y="7" width="28" height="4" rx="2" fill={B2} />
        <rect x="6" y="15" width="22" height="3" rx="1.5" fill={BS} />
        <rect x="6" y="21" width="26" height="3" rx="1.5" fill={BS} />
        <circle cx="28" cy="34" r="7" fill={G} />
        <path d="M24.5 34 l2.5 2.5 l4 -4.5" stroke="#fff" strokeWidth="1.8" fill="none" />
      </g>
      <g transform="translate(118 66) rotate(30)">
        <rect x="-3" y="-20" width="6" height="26" rx="2" fill={O} />
      </g>
    </svg>
  );
}
export function TehsildarIllustration({ size = 130 }: P) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={(size * 110) / 160} aria-hidden>
      <path d="M0 92 Q 80 70 160 92 V110 H0 Z" fill="#cde7c8" />
      <g transform="translate(24 50)">
        <path d="M0 18 L20 0 L40 18 Z" fill={O} />
        <rect x="4" y="18" width="32" height="24" fill="#fff" stroke={B} strokeWidth="1.8" />
        <rect x="16" y="28" width="8" height="14" fill={B2} />
      </g>
      <g transform="translate(96 36)">
        <path d="M0 14 L22 0 L44 14 Z" fill={B} />
        <rect x="4" y="14" width="36" height="40" fill="#fff" stroke={B} strokeWidth="1.8" />
        <rect x="10" y="20" width="8" height="8" fill={BS} />
        <rect x="26" y="20" width="8" height="8" fill={BS} />
        <rect x="17" y="36" width="10" height="18" fill={B2} />
      </g>
      <circle cx="80" cy="22" r="10" fill={O2} />
      <path d="M70 70 q 10 -10 20 0" stroke={G} strokeWidth="3" fill="none" />
    </svg>
  );
}
export function CollectorIllustration({ size = 130 }: P) {
  return (
    <svg viewBox="0 0 160 110" width={size} height={(size * 110) / 160} aria-hidden>
      <rect x="18" y="12" width="124" height="84" rx="8" fill="#fff" stroke={B} strokeWidth="2" />
      <rect x="18" y="12" width="124" height="14" rx="7" fill={B} />
      <rect x="30" y="64" width="12" height="22" rx="2" fill={O2} />
      <rect x="48" y="50" width="12" height="36" rx="2" fill={O} />
      <rect x="66" y="58" width="12" height="28" rx="2" fill={O2} />
      <rect x="84" y="40" width="12" height="46" rx="2" fill="#c2410c" />
      <circle cx="120" cy="58" r="14" fill={BS} />
      <path d="M120 58 L120 44 A14 14 0 0 1 133 62 Z" fill={B} />
      <path d="M30 42 L46 36 L62 40 L80 30" stroke={G} strokeWidth="2.5" fill="none" />
    </svg>
  );
}
