"use client";

export default function Logo() {
  return (
    <a href="/" className="flex items-baseline gap-0" style={{ textDecoration: "none" }}>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
          color: "#1e1c1a",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        menu
      </span>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#c0392b",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        .
      </span>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
          color: "#1e1c1a",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        nico
      </span>
    </a>
  );
}
