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

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// On mobile unselected markers grow to 18px diameter; selected grow to 22px.
function makeIcon(selected: boolean, isMobile = false): L.DivIcon {
  if (selected) {
    const s = isMobile ? 22 : 18;
    const c = s / 2;
    return L.divIcon({
      html: `<svg width="${s}" height="${s}"><circle cx="${c}" cy="${c}" r="${c - 2}" fill="#c0392b" stroke="#ffffff" stroke-width="3"/></svg>`,
      className: "",
      iconSize: [s, s],
      iconAnchor: [c, c],
    });
  }
  const s = isMobile ? 18 : 14;
  const c = s / 2;
  return L.divIcon({
    html: `<svg width="${s}" height="${s}"><circle cx="${c}" cy="${c}" r="${c - 1}" fill="#c0392b" stroke="#fafaf8" stroke-width="1.5"/></svg>`,
    className: "",
    iconSize: [s, s],
    iconAnchor: [c, c],
  });
}

// ---------------------------------------------------------------------------
// Map click → close panel (desktop only; mobile uses overlay)
// ---------------------------------------------------------------------------

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

// ---------------------------------------------------------------------------
// Shared panel content
// ---------------------------------------------------------------------------

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

function PanelInner({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const menu = restaurant.menus?.[0] ?? null;

  return (
    <>
      {/* ── Block 1: Identity ─────────────────────────────────────────────── */}
      {/* Badge · Name · Address + Phone all left-aligned, grouped by proximity */}
      <div className="px-5 pt-4 pb-3 shrink-0">
        {/* ♥ / × float at the panel's top-right corner — 44×44px touch areas */}
        <div className="absolute top-1 right-1 flex items-center">
          <a
            href="/favorites"
            aria-label="Añadir a favoritos"
            className="w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-[#fdf0ee]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
          </a>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-[#f4f0eb]"
            style={{ color: "#aaa9a7", fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Neighborhood badge */}
        <span
          className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2"
          style={{ background: "#fdf0ee", color: "#c0392b", letterSpacing: "0.1em" }}
        >
          {restaurant.neighborhood}
        </span>

        {/* Name — right-padded to stay clear of the two floating buttons */}
        <h2
          className="leading-tight mb-2 pr-[92px]"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 19,
            fontWeight: 600,
            color: "#1e1c1a",
          }}
        >
          {restaurant.name}
        </h2>

        {/* Address · Phone — single left-aligned row, wraps if needed */}
        <div
          className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[12px]"
          style={{ color: "#7a7775" }}
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress(restaurant.address) + ', Barcelona')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            <span>{restaurant.telephone}</span>
          </a>
        </div>
      </div>

      {/* ── Block 2: Price ────────────────────────────────────────────────── */}
      <div
        className="px-5 py-3 shrink-0"
        style={{ borderTop: "1px solid #f0ece8" }}
      >
        <div className="flex items-end justify-between">
          {menu?.price_eur != null ? (
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

      {/* ── Block 3: Menu courses ─────────────────────────────────────────── */}
      {/* Each CourseBlock carries its own borderTop — the first one acts as  */}
      {/* the Block 2 → Block 3 divider; subsequent ones divide the sections. */}
      {menu?.primeros ? (
        <div className="px-5 overflow-y-auto flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <CourseBlock label="Primeros" dishes={menu.primeros} />
          {menu.segundos && <CourseBlock label="Segundos" dishes={menu.segundos} />}
          {menu.postres && <CourseBlock label="Postres" dishes={menu.postres} />}
        </div>
      ) : (
        <div className="flex-1" style={{ borderTop: "1px solid #f0ece8" }} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Quick-view panel — bottom sheet on mobile, right slide on desktop
// ---------------------------------------------------------------------------

function QuickViewPanel({
  restaurant,
  onClose,
  isMobile,
}: {
  restaurant: Restaurant | null;
  onClose: () => void;
  isMobile: boolean;
}) {
  const isOpen = restaurant !== null;

  if (isMobile) {
    return (
      <>
        {/*
          Transparent overlay covering the entire viewport.
          When the sheet is open it captures all taps (keeps the map
          non-interactive and dismisses the sheet on tap above it).
          When closed it is fully click-through.
        */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 49,
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={onClose}
        />

        {/* Bottom sheet — slides in/out with translateY */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            height: "68vh",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            borderRadius: "16px 16px 0 0",
            borderTop: "1px solid #ece8e4",
            boxShadow: "0 -8px 32px rgba(44,40,37,0.12)",
            transform: isOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 300ms ease",
            overflow: "hidden",
          }}
        >
          {/* Keep mounted so the close animation plays; hide from a11y when closed */}
          <div style={{ display: "contents" }} aria-hidden={!isOpen}>
            {restaurant && <PanelInner restaurant={restaurant} onClose={onClose} />}
          </div>
        </div>
      </>
    );
  }

  // Desktop: right-sliding sheet
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="p-0 flex flex-col"
        style={{
          top: "var(--header-height)",
          height: "calc(100dvh - var(--header-height))",
          width: 300,
          maxWidth: 300,
          background: "#ffffff",
          borderLeft: "1px solid #ece8e4",
          boxShadow: "-8px 0 24px 0 rgba(44,40,37,0.07)",
        }}
      >
        {restaurant && <PanelInner restaurant={restaurant} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Main Map component
// ---------------------------------------------------------------------------

export default function Map({ restaurants }: { restaurants: Restaurant[] }) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const markerRefs = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const isMobile = useIsMobile();

  // Swap icons when selection or viewport class changes.
  useEffect(() => {
    for (const [id, marker] of markerRefs.current.entries()) {
      marker.setIcon(makeIcon(id === selected?.id, isMobile));
    }
  }, [selected, isMobile]);

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
            icon={makeIcon(r.id === selected?.id, isMobile)}
            ref={(marker) => {
              if (marker) markerRefs.current.set(r.id, marker);
              else markerRefs.current.delete(r.id);
            }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                handleMarkerClick(r);
              },
            }}
          />
        ))}
      </MapContainer>

      <QuickViewPanel restaurant={selected} onClose={handleClose} isMobile={isMobile} />
    </>
  );
}
