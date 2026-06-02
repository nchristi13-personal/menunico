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
          width: 290,
          maxWidth: 290,
          background: "#ffffff",
          borderLeft: "1px solid #e8e4e0",
        }}
      >
        {restaurant && (
          <>
            {/* Header area */}
            <div className="p-5 pb-0">
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="absolute top-4 right-4 text-lg leading-none text-[#8a8680] hover:text-[#3d3a38] transition-colors"
              >
                ×
              </button>

              {/* District badge */}
              <span
                className="inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded mb-3"
                style={{ background: "#fdf0ee", color: "#c0392b" }}
              >
                {restaurant.neighborhood}
              </span>

              {/* Name */}
              <h2
                className="mb-3 leading-snug"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#2c2825" }}
              >
                {restaurant.name}
              </h2>

              {/* Address + phone */}
              <div className="space-y-1 mb-4">
                <div className="flex items-start gap-1.5 text-[13px]" style={{ color: "#8a8680" }}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 mt-0.5"
                  >
                    <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{restaurant.address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "#8a8680" }}>
                  <svg
                    width="13"
                    height="13"
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
                </div>
              </div>

              {/* Price */}
              {menu?.price_eur != null ? (
                <div
                  className="mb-1"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, color: "#c0392b", lineHeight: 1 }}
                >
                  €{Number(menu.price_eur).toFixed(2)}
                </div>
              ) : (
                <div className="mb-1 text-[15px]" style={{ color: "#8a8680" }}>
                  No menu today
                </div>
              )}

              {/* Drink / bread note */}
              {menu && (
                <p className="text-[12px] mb-4" style={{ color: "#8a8680" }}>
                  {[
                    menu.drink_included && "drink included",
                    menu.bread_included && "bread included",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "drink & bread not included"}
                </p>
              )}
            </div>

            {/* Menu boxes */}
            {menu?.primeros && menu.segundos ? (
              <div className="px-5 space-y-2 overflow-y-auto flex-1">
                {/* Primeros */}
                <div
                  className="rounded p-3"
                  style={{ background: "#f8f5f1", border: "1px solid #e8e4e0" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8a8680" }}>
                    Primeros
                  </p>
                  <ul className="space-y-0.5">
                    {menu.primeros.map((d) => (
                      <li key={d} className="text-[13px]" style={{ color: "#2c2825" }}>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Segundos */}
                <div
                  className="rounded p-3"
                  style={{ background: "#f8f5f1", border: "1px solid #e8e4e0" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8a8680" }}>
                    Segundos
                  </p>
                  <ul className="space-y-0.5">
                    {menu.segundos.map((d) => (
                      <li key={d} className="text-[13px]" style={{ color: "#2c2825" }}>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Postres */}
                {menu.postres && (
                  <div
                    className="rounded p-3"
                    style={{ background: "#f8f5f1", border: "1px solid #e8e4e0" }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8a8680" }}>
                      Postres
                    </p>
                    <ul className="space-y-0.5">
                      {menu.postres.map((d) => (
                        <li key={d} className="text-[13px]" style={{ color: "#2c2825" }}>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 flex-1" />
            )}

            {/* CTA */}
            <div className="p-5 pt-3">
              {menu?.price_eur != null ? (
                <a
                  href={`/restaurant/${restaurant.id}`}
                  className="block w-full text-center text-[13px] font-medium text-white rounded py-2.5 transition-opacity hover:opacity-90"
                  style={{ background: "#c0392b" }}
                >
                  See today's menu →
                </a>
              ) : (
                <button
                  disabled
                  className="block w-full text-center text-[13px] font-medium rounded py-2.5 opacity-40 cursor-not-allowed"
                  style={{ background: "#e8e4e0", color: "#8a8680" }}
                >
                  No menu today
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
