"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import type { Restaurant } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#f4f0eb" }}>
      <p style={{ color: "#8a8680", fontSize: 14 }}>Loading map…</p>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Search logic
// ---------------------------------------------------------------------------

function searchRestaurants(restaurants: Restaurant[], query: string): Restaurant[] {
  const q = query.toLowerCase().trim();
  if (!q) return restaurants;
  return restaurants.filter((r) => {
    if (r.name.toLowerCase().includes(q)) return true;
    const menu = r.menus[0];
    if (!menu) return false;
    return [
      ...(menu.primeros ?? []),
      ...(menu.segundos ?? []),
      ...(menu.postres ?? []),
    ].some((dish) => dish.toLowerCase().includes(q));
  });
}

// ---------------------------------------------------------------------------
// Search pill — Airbnb-inspired: white, shadow, red search button
// ---------------------------------------------------------------------------

function SearchPill({
  value,
  onChange,
  showButton = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  showButton?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-4 rounded-full bg-white ${className}`}
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
        height: 46,
      }}
    >
      {/* Search icon */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9895" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      {/* Input */}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar restaurante o plato…"
        className="flex-1 outline-none bg-transparent text-[14px] min-w-0"
        style={{ color: "#1e1c1a" }}
      />

      {/* Clear */}
      {value && !showButton && (
        <button
          onClick={() => onChange("")}
          aria-label="Limpiar"
          className="text-[#9a9895] hover:text-[#3d3a38] transition-colors shrink-0"
          style={{ fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      )}

      {/* Red search button (desktop) */}
      {showButton && (
        <button
          onClick={() => {}}
          aria-label="Buscar"
          className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-opacity hover:opacity-90"
          style={{ background: "#c0392b", marginRight: -8 }}
        >
          {value ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function HomeClient({
  restaurants,
  weekday,
  dayMonth,
}: {
  restaurants: Restaurant[];
  weekday: string;
  dayMonth: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchRestaurants(restaurants, query), [restaurants, query]);

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Desktop header (sm+) — single row, 72px                          */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="hidden sm:flex items-center gap-6 px-6 shrink-0"
        style={{
          height: 72,
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
        {/* Left: wordmark */}
        <Logo />

        {/* Center: search pill */}
        <SearchPill
          value={query}
          onChange={setQuery}
          showButton
          className="flex-1 max-w-lg"
        />

        {/* Right: date + login */}
        <div className="flex items-center gap-4 shrink-0 ml-auto">
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#1e1c1a",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {weekday}, {dayMonth}
          </span>
          <a
            href="/login"
            className="text-white text-[13px] font-medium px-4 py-1.5 rounded-full transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ background: "#c0392b" }}
          >
            Iniciar sesión
          </a>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile header (<sm) — row 1: logo + info, row 2: pill            */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="sm:hidden flex flex-col shrink-0"
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
        {/* Row 1 */}
        <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
          <Logo />
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end" style={{ lineHeight: 1.2 }}>
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e1c1a",
                  letterSpacing: "-0.01em",
                }}
              >
                {weekday}
              </span>
              <span style={{ fontSize: 11, color: "#7a7775" }}>{dayMonth}</span>
            </div>
            <a
              href="/login"
              aria-label="Iniciar sesión"
              className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-80 shrink-0"
              style={{ background: "#c0392b" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </a>
          </div>
        </div>

        {/* Row 2: pill */}
        <div className="px-4 pb-3">
          <SearchPill value={query} onChange={setQuery} className="w-full" />
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Map                                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Map restaurants={filtered} />

        {query.trim() && filtered.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 500 }}
          >
            <div
              className="text-center px-6 py-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(6px)",
                border: "1px solid #ece8e4",
              }}
            >
              <p className="text-[14px] font-medium" style={{ color: "#1e1c1a" }}>
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-[12px] mt-1" style={{ color: "#9a9895" }}>
                Prueba con otro nombre o plato
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
