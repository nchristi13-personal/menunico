"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MenuRow = {
  price_eur: number | null;
  drink_included: boolean | null;
  bread_included: boolean | null;
  primeros: string[] | null;
  segundos: string[] | null;
  postres: string[] | null;
};

export type Restaurant = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  telephone: string;
  website: string | null;
  latitude: number;
  longitude: number;
  menus: MenuRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIcon(selected: boolean): L.DivIcon {
  if (selected) {
    return L.divIcon({
      html: `<svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="#c0392b" stroke="#ffffff" stroke-width="3"/></svg>`,
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
  return L.divIcon({
    html: `<svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#c0392b" stroke="#fafaf8" stroke-width="1.5"/></svg>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// ---------------------------------------------------------------------------
// Map click → close panel
// ---------------------------------------------------------------------------

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

// ---------------------------------------------------------------------------
// Quick-view panel
// ---------------------------------------------------------------------------

/** Strip the "(District)" suffix the spreadsheet embeds in addresses. */
function cleanAddress(raw: string) {
  return raw.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

function CourseBlock({ label, dishes }: { label: string; dishes: string[] }) {
  return (
    <div className="py-3" style={{ borderTop: "1px solid #f0ece8" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "#c0392b", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <ul className="space-y-1">
        {dishes.map((d) => (
          <li key={d} className="text-[13px] leading-snug" style={{ color: "#3d3a38" }}>
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickViewPanel({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant | null;
  onClose: () => void;
}) {
  const menu = restaurant?.menus?.[0] ?? null;

  return (
    <Sheet open={restaurant !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col"
        style={{
          // Push below the 58px header so the panel doesn't overlap it.
          // Use 100dvh (dynamic viewport height) instead of 100vh so the
          // panel doesn't extend behind the mobile browser's nav bar.
          top: 58,
          height: "calc(100dvh - 58px)",
          width: 300,
          maxWidth: 300,
          background: "#ffffff",
          borderLeft: "1px solid #ece8e4",
          boxShadow: "-8px 0 24px 0 rgba(44,40,37,0.07)",
        }}
      >
        {restaurant && (
          <>
            {/* ── Top info ──────────────────────────────────── */}
            <div className="px-5 pt-5 pb-0 shrink-0">
              {/* Top-right controls: favorite + close */}
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <a
                  href="/favorites"
                  aria-label="Añadir a favoritos"
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#fdf0ee]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                  </svg>
                </a>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#f4f0eb]"
                  style={{ color: "#aaa9a7", fontSize: 18, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              {/* Neighborhood chip */}
              <span
                className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3"
                style={{ background: "#fdf0ee", color: "#c0392b", letterSpacing: "0.1em" }}
              >
                {restaurant.neighborhood}
              </span>

              {/* Name */}
              <h2
                className="leading-tight mb-4 pr-5"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: "#1e1c1a",
                }}
              >
                {restaurant.name}
              </h2>

              {/* Meta — address + phone */}
              <div className="space-y-1.5 mb-5">
                <div className="flex items-start gap-2 text-[12px]" style={{ color: "#7a7775" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{cleanAddress(restaurant.address)}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: "#7a7775" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
                  </svg>
                  <span>{restaurant.telephone}</span>
                </div>
              </div>

              {/* Price row */}
              <div
                className="flex items-end justify-between pb-4"
                style={{ borderBottom: "1px solid #f0ece8" }}
              >
                {menu?.price_eur != null ? (
                  <div>
                    <span
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 30,
                        fontWeight: 600,
                        color: "#c0392b",
                        lineHeight: 1,
                      }}
                    >
                      €{Number(menu.price_eur).toFixed(2)}
                    </span>
                  </div>
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
            </div>

            {/* ── Menu courses ──────────────────────────────── */}
            {menu?.primeros ? (
              <div className="px-5 overflow-y-auto flex-1 pb-1">
                <CourseBlock label="Primeros" dishes={menu.primeros} />
                {menu.segundos && <CourseBlock label="Segundos" dishes={menu.segundos} />}
                {menu.postres && <CourseBlock label="Postres" dishes={menu.postres} />}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* ── CTA ───────────────────────────────────────── */}
            <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0" style={{ borderTop: "1px solid #f0ece8" }}>
              {menu?.price_eur != null ? (
                <a
                  href={`/restaurant/${restaurant.id}`}
                  className="flex items-center justify-between w-full text-[13px] font-medium text-white px-4 py-3 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: "#c0392b" }}
                >
                  <span>Ver el menú completo</span>
                  <span>→</span>
                </a>
              ) : (
                <button
                  disabled
                  className="w-full text-[13px] font-medium px-4 py-3 rounded-lg opacity-40 cursor-not-allowed"
                  style={{ background: "#f0ece8", color: "#7a7775" }}
                >
                  Sin menú hoy
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Main Map component
// ---------------------------------------------------------------------------

export default function Map({ restaurants }: { restaurants: Restaurant[] }) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  // Keep a ref map so we can swap icons without re-rendering all markers.
  // Use globalThis.Map to avoid collision with this component's export name.
  const markerRefs = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());

  // Swap icons when selection changes.
  useEffect(() => {
    for (const [id, marker] of markerRefs.current.entries()) {
      marker.setIcon(makeIcon(id === selected?.id));
    }
  }, [selected]);

  const handleMarkerClick = (r: Restaurant) => {
    setSelected((prev) => (prev?.id === r.id ? null : r));
  };

  const handleClose = () => setSelected(null);

  return (
    <>
      <MapContainer
        center={[41.3851, 2.1734]}
        zoom={12}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={handleClose} />

        {restaurants.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={makeIcon(r.id === selected?.id)}
            ref={(marker) => {
              if (marker) markerRefs.current.set(r.id, marker);
              else markerRefs.current.delete(r.id);
            }}
            eventHandlers={{
              click: (e) => {
                // Stop propagation so MapClickHandler doesn't immediately close.
                L.DomEvent.stopPropagation(e);
                handleMarkerClick(r);
              },
            }}
          />
        ))}
      </MapContainer>

      <QuickViewPanel restaurant={selected} onClose={handleClose} />
    </>
  );
}
