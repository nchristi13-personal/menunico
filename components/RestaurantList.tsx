"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { Restaurant } from "@/components/Map";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanAddress(raw: string) {
  return raw.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

// ---------------------------------------------------------------------------
// District chips
// ---------------------------------------------------------------------------

function DistrictChips({
  districts,
  active,
  onChange,
}: {
  districts: string[];
  active: string;
  onChange: (d: string) => void;
}) {
  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
    cursor: "pointer",
    border: "none",
    whiteSpace: "nowrap",
    transition: "background 0.15s, color 0.15s",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        whiteSpace: "nowrap",
        scrollbarWidth: "none",
        paddingBottom: 2,
      }}
    >
      {["Todos", ...districts].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          style={
            active === d
              ? { ...chipBase, background: "#c0392b", color: "#fff" }
              : { ...chipBase, background: "transparent", color: "#5a5755", border: "1px solid #d8d4d0" }
          }
        >
          {d}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded card detail
// ---------------------------------------------------------------------------

function CardDetail({ restaurant }: { restaurant: Restaurant }) {
  const menu = restaurant.menus?.[0] ?? null;
  const [toastVisible, setToastVisible] = useState(false);

  const handleGuardar = () => {
    // No auth context on client yet → show prompt toast
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <div style={{ padding: "10px 0 4px" }}>
      {/* Address · Phone */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0 6px",
          fontSize: 12,
          color: "#7a7775",
          marginBottom: 10,
        }}
      >
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            cleanAddress(restaurant.address) + ", Barcelona"
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 3, color: "inherit", textDecoration: "none" }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {cleanAddress(restaurant.address)}
        </a>
        <span style={{ color: "#d8d4d0" }}>·</span>
        <a
          href={`tel:${restaurant.telephone.replace(/\s+/g, "")}`}
          style={{ display: "flex", alignItems: "center", gap: 3, color: "inherit", textDecoration: "none" }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
          </svg>
          {restaurant.telephone}
        </a>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#f0ece8", marginBottom: 10 }} />

      {/* Course sections: 8px between items, 14px between sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 10 }}>
        {menu?.primeros && (
          <section>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c0392b", marginBottom: 4 }}>
              Primeros
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {menu.primeros.map((d) => (
                <li key={d} style={{ fontSize: 13, color: "#7a7775" }}>{d}</li>
              ))}
            </ul>
          </section>
        )}
        {menu?.segundos && (
          <section>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c0392b", marginBottom: 4 }}>
              Segundos
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {menu.segundos.map((d) => (
                <li key={d} style={{ fontSize: 13, color: "#7a7775" }}>{d}</li>
              ))}
            </ul>
          </section>
        )}
        {menu?.postres && (
          <section>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c0392b", marginBottom: 4 }}>
              Postres
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {menu.postres.map((d) => (
                <li key={d} style={{ fontSize: 13, color: "#7a7775" }}>{d}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#f0ece8", marginBottom: 10 }} />

      {/* Guardar button */}
      <div style={{ position: "relative" }}>
        <button
          onClick={handleGuardar}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 0",
            borderRadius: 8,
            border: "1px solid #c0392b",
            background: "transparent",
            color: "#c0392b",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#fdf0ee")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
          Guardar restaurante
        </button>

        {toastVisible && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "#1e1c1a",
              color: "#fff",
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              textAlign: "center",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            Inicia sesión para guardar restaurantes
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restaurant card — collapsed + expandable detail
// ---------------------------------------------------------------------------

function RestaurantCard({
  restaurant,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  restaurant: Restaurant;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const menu = restaurant.menus?.[0] ?? null;

  // Scroll expanded card into view smoothly
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHover(restaurant.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        borderBottom: "1px solid #f0ece8",
        background: isHovered || isSelected ? "#fdf9f8" : "#ffffff",
        transition: "background 0.12s",
      }}
    >
      {/* Collapsed summary row — always visible */}
      <button
        onClick={onSelect}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "block",
        }}
      >
        {/* Row 1: neighbourhood (left) + price (right) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#c0392b",
            }}
          >
            {restaurant.neighborhood}
          </span>
          {menu?.price_eur != null && (
            <span style={{ fontSize: 14, fontWeight: 500, color: "#c0392b" }}>
              €{Number(menu.price_eur).toFixed(2)}
            </span>
          )}
        </div>

        {/* Row 2: name */}
        <p style={{ fontSize: 15, fontWeight: 500, color: "#1e1c1a", margin: "0 0 3px" }}>
          {restaurant.name}
        </p>

        {/* Row 3: drink/bread includes */}
        {menu && (
          <p style={{ fontSize: 11, color: "#b0ada9", margin: 0 }}>
            {[
              menu.drink_included ? "bebida incl." : "sin bebida",
              menu.bread_included ? "pan incl." : "sin pan",
            ].join(" · ")}
          </p>
        )}
      </button>

      {/* Expandable detail — max-height transition */}
      <div
        style={{
          maxHeight: isSelected ? 600 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}
      >
        <div
          style={{
            padding: "0 16px 12px",
            borderTop: "1px solid #f0ece8",
          }}
        >
          <CardDetail restaurant={restaurant} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RestaurantList — desktop left pane
// ---------------------------------------------------------------------------

export default function RestaurantList({
  restaurants,
  allDistricts,
  activeDistrict,
  onDistrictChange,
  selectedRestaurant,
  onSelectRestaurant,
  hoveredRestaurantId,
  onHoverRestaurant,
}: {
  restaurants: Restaurant[];
  allDistricts: string[];
  activeDistrict: string;
  onDistrictChange: (d: string) => void;
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (r: Restaurant | null) => void;
  hoveredRestaurantId: string | null;
  onHoverRestaurant: (id: string | null) => void;
}) {
  const handleCardSelect = useCallback(
    (restaurant: Restaurant) => {
      onSelectRestaurant(
        selectedRestaurant?.id === restaurant.id ? null : restaurant
      );
    },
    [selectedRestaurant, onSelectRestaurant]
  );

  return (
    // Flex column filling the left pane height; header is non-scrolling,
    // card list scrolls independently below it.
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Non-scrolling header ─────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          padding: "12px 16px",
        }}
      >
        {/* Count */}
        <p style={{ fontSize: 12, color: "#9a9895", margin: "0 0 8px" }}>
          {restaurants.length} restaurante{restaurants.length !== 1 ? "s" : ""} hoy
        </p>

        {/* District chips */}
        <DistrictChips
          districts={allDistricts}
          active={activeDistrict}
          onChange={onDistrictChange}
        />
      </div>

      {/* ── Scrollable card list ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {restaurants.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9a9895", padding: "24px 16px" }}>
            Sin restaurantes en este barrio hoy.
          </p>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              isSelected={selectedRestaurant?.id === r.id}
              isHovered={hoveredRestaurantId === r.id}
              onSelect={() => handleCardSelect(r)}
              onHover={onHoverRestaurant}
            />
          ))
        )}
      </div>
    </div>
  );
}
