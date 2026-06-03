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
// Search input
// ---------------------------------------------------------------------------

function SearchInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <svg
        className="absolute left-3 shrink-0 pointer-events-none"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9a9895"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar restaurante o plato…"
        className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-full outline-none transition-colors"
        style={{
          background: "#f4f0eb",
          border: "1px solid transparent",
          color: "#1e1c1a",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#c0392b")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 text-[#9a9895] hover:text-[#3d3a38] transition-colors"
          aria-label="Limpiar búsqueda"
          style={{ fontSize: 16, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
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
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}

      {/* Desktop: single row (logo | search | date + login) */}
      <header
        className="hidden sm:flex items-center gap-4 px-5 shrink-0"
        style={{
          height: 58,
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
        <Logo />
        <SearchInput value={query} onChange={setQuery} className="flex-1 max-w-sm" />
        <div className="flex items-center gap-4 ml-auto">
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

      {/* Mobile: two rows (logo + date/icon | search) */}
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
        <div className="flex items-center justify-between px-4" style={{ height: 58 }}>
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
        {/* Row 2: search */}
        <div className="px-4 pb-3">
          <SearchInput value={query} onChange={setQuery} className="w-full" />
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
                Sin resultados para "{query}"
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
