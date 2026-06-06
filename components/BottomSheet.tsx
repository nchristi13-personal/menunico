"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Restaurant } from "@/components/Map";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SnapState = "peek" | "expanded";

const PEEK_OFFSET = 160;       // sheet height in px when peeking (from bottom)
const MAP_STRIP_PX = 44;       // px of map visible above the sheet when expanded
const VELOCITY_THRESHOLD = 0.3; // px/ms

/**
 * Reads the --header-height CSS variable (set in globals.css) at runtime so
 * the sheet clears the page header when expanded.
 * Falls back to 109 (mobile header: 56 + 46 + 12).
 */
function getHeaderHeightPx(): number {
  if (typeof window === "undefined") return 109;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-height")
    .trim();
  return parseInt(raw, 10) || 109;
}

/** Pixel value of the sheet top in expanded state. */
function expandedTopPx(): number {
  return getHeaderHeightPx() + MAP_STRIP_PX;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanAddress(raw: string) {
  return raw.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

// ---------------------------------------------------------------------------
// Restaurant card (list view)
// ---------------------------------------------------------------------------

function RestaurantCard({
  restaurant,
  onTap,
}: {
  restaurant: Restaurant;
  onTap: () => void;
}) {
  const menu = restaurant.menus?.[0] ?? null;

  return (
    <button
      onClick={onTap}
      className="w-full text-left px-4 py-3 flex flex-col gap-0.5 active:bg-[#fdf9f8]"
      style={{ borderBottom: "1px solid #f0ece8" }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "#c0392b", letterSpacing: "0.1em" }}
      >
        {restaurant.neighborhood}
      </span>
      <span className="text-[14px] font-medium leading-snug" style={{ color: "#1e1c1a" }}>
        {restaurant.name}
      </span>
      {menu?.price_eur != null && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[14px] font-medium" style={{ color: "#c0392b" }}>
            €{Number(menu.price_eur).toFixed(2)}
          </span>
          <span className="text-[11px]" style={{ color: "#b0ada9" }}>
            {[
              menu.drink_included ? "bebida incl." : "sin bebida",
              menu.bread_included ? "pan incl." : "sin pan",
            ].join(" · ")}
          </span>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function DetailView({
  restaurant,
  onBack,
}: {
  restaurant: Restaurant;
  onBack: () => void;
}) {
  const menu = restaurant.menus?.[0] ?? null;

  return (
    <div className="h-full overflow-y-auto">
      {/* Top row: ← Lista | ♥ */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] font-medium py-1"
          style={{ color: "#c0392b" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Lista
        </button>
        <a
          href="/favorites"
          aria-label="Añadir a favoritos"
          className="w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-[#fdf0ee]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c0392b"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        </a>
      </div>

      <div className="px-4 pb-8">
        {/* Neighbourhood badge */}
        <span
          className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2"
          style={{ background: "#fdf0ee", color: "#c0392b", letterSpacing: "0.1em" }}
        >
          {restaurant.neighborhood}
        </span>

        {/* Name */}
        <h2
          className="leading-tight mb-2"
          style={{ fontSize: 18, fontWeight: 500, color: "#1e1c1a" }}
        >
          {restaurant.name}
        </h2>

        {/* Address · Phone */}
        <div
          className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[12px] mb-4"
          style={{ color: "#7a7775" }}
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              cleanAddress(restaurant.address) + ", Barcelona"
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{cleanAddress(restaurant.address)}</span>
          </a>
          <span aria-hidden="true" style={{ color: "#d8d4d0" }}>·</span>
          <a
            href={`tel:${restaurant.telephone.replace(/\s+/g, "")}`}
            className="flex items-center gap-1 hover:underline"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            <span>{restaurant.telephone}</span>
          </a>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f0ece8", marginBottom: 12 }} />

        {/* Price row */}
        <div className="flex items-end justify-between mb-3">
          {menu?.price_eur != null ? (
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 24,
                fontWeight: 500,
                color: "#c0392b",
                lineHeight: 1,
              }}
            >
              €{Number(menu.price_eur).toFixed(2)}
            </span>
          ) : (
            <span className="text-[14px]" style={{ color: "#7a7775" }}>
              No menu today
            </span>
          )}
          {menu && (
            <span className="text-[11px]" style={{ color: "#b0ada9" }}>
              {[
                menu.drink_included ? "bebida incl." : "sin bebida",
                menu.bread_included ? "pan incl." : "sin pan",
              ].join(" · ")}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f0ece8", marginBottom: 12 }} />

        {/* Menu courses: 6px gap between items, 12px gap between sections */}
        <div className="flex flex-col gap-3">
          {menu?.primeros && (
            <section>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "#c0392b", letterSpacing: "0.1em" }}
              >
                Primeros
              </p>
              <ul className="flex flex-col gap-1.5">
                {menu.primeros.map((d) => (
                  <li key={d} className="text-[13px]" style={{ color: "#7a7775" }}>
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {menu?.segundos && (
            <section>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "#c0392b", letterSpacing: "0.1em" }}
              >
                Segundos
              </p>
              <ul className="flex flex-col gap-1.5">
                {menu.segundos.map((d) => (
                  <li key={d} className="text-[13px]" style={{ color: "#7a7775" }}>
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {menu?.postres && (
            <section>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "#c0392b", letterSpacing: "0.1em" }}
              >
                Postres
              </p>
              <ul className="flex flex-col gap-1.5">
                {menu.postres.map((d) => (
                  <li key={d} className="text-[13px]" style={{ color: "#7a7775" }}>
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BottomSheet
// ---------------------------------------------------------------------------

export default function BottomSheet({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  allDistricts,
  activeDistrict,
  onDistrictChange,
}: {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (r: Restaurant | null) => void;
  allDistricts: string[];
  activeDistrict: string;
  onDistrictChange: (d: string) => void;
}) {
  const [snapState, setSnapState] = useState<SnapState>("peek");
  const [dragging, setDragging] = useState(false);
  const [dragTopPx, setDragTopPx] = useState<number | null>(null);

  const dragStateRef = useRef<{
    startY: number;
    lastY: number;
    lastTime: number;
    baseTopPx: number;
  } | null>(null);

  // When a restaurant is selected (e.g. from a map marker tap),
  // always snap to expanded so the detail view is fully visible.
  useEffect(() => {
    if (selectedRestaurant !== null && snapState === "peek") {
      setSnapState("expanded");
    }
    // Only re-run when the selected restaurant changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurant]);

  // ── Drag touch handlers (handle-only) ─────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const baseTopPx =
        snapState === "peek"
          ? window.innerHeight - PEEK_OFFSET
          : expandedTopPx();
      dragStateRef.current = {
        startY: touch.clientY,
        lastY: touch.clientY,
        lastTime: Date.now(),
        baseTopPx,
      };
      setDragging(true);
    },
    [snapState]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStateRef.current) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStateRef.current.startY;
    const minTop = expandedTopPx();
    const maxTop = window.innerHeight - PEEK_OFFSET;
    const newTop = Math.max(
      minTop,
      Math.min(maxTop, dragStateRef.current.baseTopPx + deltaY)
    );
    dragStateRef.current.lastY = touch.clientY;
    dragStateRef.current.lastTime = Date.now();
    setDragTopPx(newTop);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!dragStateRef.current) return;
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - dragStateRef.current.lastY;
      const deltaT = Math.max(1, Date.now() - dragStateRef.current.lastTime);
      const velocity = deltaY / deltaT; // px/ms; positive = downward

      setDragging(false);
      setDragTopPx(null);
      dragStateRef.current = null;

      const etPx = expandedTopPx();

      // ── In detail view ─────────────────────────────────────────────────
      if (selectedRestaurant !== null) {
        // Swipe down = "back to list"; any other gesture = stay expanded.
        if (velocity > VELOCITY_THRESHOLD) {
          onSelectRestaurant(null);
        }
        setSnapState("expanded");
        return;
      }

      // ── In list view ───────────────────────────────────────────────────
      if (velocity > VELOCITY_THRESHOLD) {
        setSnapState("peek");
      } else if (velocity < -VELOCITY_THRESHOLD) {
        setSnapState("expanded");
      } else {
        // Snap to closest position by midpoint
        const ct =
          dragTopPx ??
          (snapState === "peek" ? window.innerHeight - PEEK_OFFSET : etPx);
        const midpoint = (etPx + (window.innerHeight - PEEK_OFFSET)) / 2;
        setSnapState(ct > midpoint ? "peek" : "expanded");
      }
    },
    [selectedRestaurant, onSelectRestaurant, dragTopPx, snapState]
  );

  const handleCardTap = useCallback(
    (restaurant: Restaurant) => {
      onSelectRestaurant(restaurant);
      setSnapState("expanded");
    },
    [onSelectRestaurant]
  );

  // ── Derived top value ──────────────────────────────────────────────────────

  // CSS string used when not dragging. The expanded top clears the page header
  // (--header-height) plus MAP_STRIP_PX of visible map, using the CSS variable
  // so it automatically adjusts if the header height changes.
  const cssTop =
    snapState === "peek"
      ? `calc(100dvh - ${PEEK_OFFSET}px)`
      : `calc(var(--header-height) + ${MAP_STRIP_PX}px)`;

  // Pixel value used during active drag (needs actual window height).
  const dragCssTop =
    dragging && dragTopPx !== null ? `${dragTopPx}px` : cssTop;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        top: dragging ? dragCssTop : cssTop,
        zIndex: 50,
        background: "#ffffff",
        borderRadius: "16px 16px 0 0",
        borderTop: "1px solid #ece8e4",
        boxShadow: "0 -8px 32px rgba(44,40,37,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // Animate top when snapping; disable during drag for direct tracking.
        transition: dragging ? "none" : "top 0.3s ease",
      }}
    >
      {/* ── Drag handle ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex justify-center select-none touch-none"
        style={{ paddingTop: 6, paddingBottom: 6, cursor: "grab" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            width: 28,
            height: 3,
            borderRadius: 9999,
            background: "#d0cdc9",
          }}
        />
      </div>

      {/* ── Sliding panel area ──────────────────────────────────────────── */}
      {/* List and detail are absolute siblings; translateX animates between them */}
      <div className="flex-1 relative overflow-hidden">
        {/* List panel */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            transform: selectedRestaurant ? "translateX(-100%)" : "translateX(0)",
            transition: "transform 0.25s ease",
          }}
        >
          {/* Count + district chips */}
          <div
            className="shrink-0 px-4 pt-2 pb-3"
            style={{ borderBottom: "1px solid #f0ece8" }}
          >
            <p className="text-[12px] mb-2" style={{ color: "#9a9895" }}>
              {restaurants.length} restaurante{restaurants.length !== 1 ? "s" : ""} hoy
            </p>
            {/* District chips — horizontally scrollable */}
            <div
              className="flex gap-1.5"
              style={{ overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}
            >
              {["Todos", ...allDistricts].map((d) => (
                <button
                  key={d}
                  onClick={() => onDistrictChange(d)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium shrink-0 transition-colors"
                  style={
                    activeDistrict === d
                      ? { background: "#c0392b", color: "#fff", border: "1px solid #c0392b" }
                      : { background: "transparent", color: "#5a5755", border: "1px solid #d8d4d0" }
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto">
            {restaurants.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                onTap={() => handleCardTap(r)}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div
          className="absolute inset-0"
          style={{
            transform: selectedRestaurant ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.25s ease",
          }}
        >
          {selectedRestaurant && (
            <DetailView
              restaurant={selectedRestaurant}
              onBack={() => onSelectRestaurant(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
