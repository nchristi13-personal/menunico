"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { Restaurant } from "@/components/Map";
import type { PriceFilter } from "@/components/HomeClient";

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
// Price chips
// ---------------------------------------------------------------------------

const PRICE_CHIPS: { key: NonNullable<PriceFilter>; label: string }[] = [
  { key: "bajo",  label: "< €12"    },
  { key: "medio", label: "€12–€14"  },
  { key: "alto",  label: "> €14"    },
];

function PriceChips({
  active,
  onChange,
}: {
  active: PriceFilter;
  onChange: (f: PriceFilter) => void;
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 11, color: "#9a9895", whiteSpace: "nowrap", flexShrink: 0 }}>
        Precio:
      </span>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {PRICE_CHIPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={
              active === key
                ? { ...chipBase, background: "#c0392b", color: "#fff" }
                : { ...chipBase, background: "transparent", color: "#5a5755", border: "1px solid #d8d4d0" }
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded card detail
// ---------------------------------------------------------------------------

function CardDetail({ restaurant }: { restaurant: Restaurant }) {
  const menu = restaurant.menus?.[0] ?? null;

  return (
    <div style={{ padding: "10px 0 4px" }}>
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

      {/* Drink / bread — secondary info */}
      {menu && (
        <p style={{ fontSize: 11, color: "#b0ada9", margin: "0 0 4px" }}>
          {[
            menu.drink_included ? "bebida incl." : "sin bebida",
            menu.bread_included ? "pan incl." : "sin pan",
          ].join(" · ")}
        </p>
      )}
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
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isSelected]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHover(restaurant.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        borderBottom: "1px solid #f0ece8",
        background: isSelected ? "#f2f2f2" : isHovered ? "#f7f7f7" : "#ffffff",
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

        {/* Row 3: address · phone */}
        <p style={{ fontSize: 11, color: "#b0ada9", margin: 0 }}>
          {cleanAddress(restaurant.address)}
          {restaurant.telephone ? ` · ${restaurant.telephone}` : ""}
        </p>
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
  activePriceFilter,
  onPriceFilterChange,
  selectedRestaurant,
  onSelectRestaurant,
  hoveredRestaurantId,
  onHoverRestaurant,
}: {
  restaurants: Restaurant[];
  allDistricts: string[];
  activeDistrict: string;
  onDistrictChange: (d: string) => void;
  activePriceFilter: PriceFilter;
  onPriceFilterChange: (f: PriceFilter) => void;
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

        {/* Price chips */}
        <PriceChips
          active={activePriceFilter}
          onChange={onPriceFilterChange}
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
