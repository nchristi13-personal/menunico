"use client";

// Tiny client component so we can use the onError handler
// (event handlers are not allowed in Server Components).
export default function Logo() {
  return (
    <a href="/" className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="menunico"
        height={36}
        style={{ height: 36, width: "auto" }}
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const next = img.nextElementSibling as HTMLElement | null;
          if (next) next.style.display = "";
        }}
      />
      <span
        style={{
          display: "none",
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 20,
          color: "#2c2825",
          letterSpacing: "-0.02em",
        }}
      >
        menunico
      </span>
    </a>
  );
}
