// Neutral monogram used instead of any state emblem (the demo must not look like an official channel).
export default function Monogram({ text, size = 36, bg = "#1C2B3A", fg = "#F5F0E6" }: { text: string; size?: number; bg?: string; fg?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%", background: bg, color: fg,
        fontWeight: 700, fontSize: Math.round(size * 0.42), lineHeight: 1, flex: "none",
      }}
    >
      {text}
    </span>
  );
}
