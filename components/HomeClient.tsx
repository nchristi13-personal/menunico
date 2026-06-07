"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import BottomSheet from "@/components/BottomSheet";
import RestaurantList from "@/components/RestaurantList";
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
// Search logic (mobile only — desktop uses district chips)
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
// Mobile search pill
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9895" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar restaurante o plato…"
        className="flex-1 outline-none bg-transparent text-[14px] min-w-0"
        style={{ color: "#1e1c1a" }}
      />
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
      {showButton && (
        <button
          onClick={() => {}}
          aria-label="Buscar"
          className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-opacity hover:opacity-90"
          style={{ background: "#c0392b", marginRight: -8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
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
  // Mobile search
  const [query, setQuery] = useState("");

  // Shared selection state — drives both desktop left-pane expansion and
  // mobile BottomSheet detail view, plus map pin highlight.
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Desktop hover state — drives map pin hover highlight.
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState<string | null>(null);

  // District filter — shared between desktop chips and mobile BottomSheet chips.
  const [activeDistrict, setActiveDistrict] = useState("Todos");

  // All unique districts, sorted — derived from the full restaurant list.
  const allDistricts = useMemo(
    () => [...new Set(restaurants.map((r) => r.neighborhood))].sort(),
    [restaurants]
  );

  // Search filtering (mobile). Desktop has no search UI so query is always "".
  const searchFiltered = useMemo(
    () => searchRestaurants(restaurants, query),
    [restaurants, query]
  );

  // District filtering applied on top of search.
  const districtFiltered = useMemo(
    () =>
      activeDistrict === "Todos"
        ? searchFiltered
        : searchFiltered.filter((r) => r.neighborhood === activeDistrict),
    [searchFiltered, activeDistrict]
  );

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Desktop header (≥768px) — single row, 72px                       */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="hidden md:grid items-center px-6 shrink-0"
        style={{
          height: 72,
          gridTemplateColumns: "1fr minmax(0, 480px) 1fr",
          gap: "1.5rem",
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
        <div className="flex items-center">
          <Logo />
        </div>
        <SearchPill value={query} onChange={setQuery} showButton className="w-full" />
        <div className="flex items-center gap-4 justify-end">
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
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile header — hidden at ≥768px                                 */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="md:hidden flex flex-col shrink-0"
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
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
          </div>
        </div>
        <div className="px-4 pb-3">
          <SearchPill value={query} onChange={setQuery} className="w-full" />
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main area                                                         */}
      {/*   Mobile  (<md): flex-col → Map takes flex-1 below the header    */}
      {/*   Desktop (≥md): flex-row → RestaurantList (380px) + Map (flex-1) */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="flex flex-col md:flex-row flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* ── Desktop left pane — hidden on mobile ──────────────────── */}
        <div
          className="hidden md:flex flex-col"
          style={{
            width: 380,
            flexShrink: 0,
            borderRight: "1px solid #ece8e4",
            overflow: "hidden",
          }}
        >
          <RestaurantList
            restaurants={districtFiltered}
            allDistricts={allDistricts}
            activeDistrict={activeDistrict}
            onDistrictChange={setActiveDistrict}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={setSelectedRestaurant}
            hoveredRestaurantId={hoveredRestaurantId}
            onHoverRestaurant={setHoveredRestaurantId}
          />
        </div>

        {/* ── Map — shared by mobile and desktop ────────────────────── */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <Map
            restaurants={districtFiltered}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={setSelectedRestaurant}
            hoveredRestaurantId={hoveredRestaurantId}
            onHoverRestaurant={setHoveredRestaurantId}
            activeDistrict={activeDistrict}
          />

          {/* Mobile empty-search overlay */}
          {query.trim() && districtFiltered.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none md:hidden"
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
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile BottomSheet — hidden at ≥768px                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="md:hidden">
        <BottomSheet
          restaurants={districtFiltered}
          selectedRestaurant={selectedRestaurant}
          onSelectRestaurant={setSelectedRestaurant}
          allDistricts={allDistricts}
          activeDistrict={activeDistrict}
          onDistrictChange={setActiveDistrict}
        />
      </div>
    </>
  );
}
