"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";

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

// ---------------------------------------------------------------------------
// Pin state → icon
// ---------------------------------------------------------------------------

type PinState = "default" | "hovered" | "selected" | "dimmed";

function getPinState(
  id: string,
  selectedId: string | null,
  hoveredId: string | null,
  isMobile: boolean
): PinState {
  if (isMobile) {
    return id === selectedId ? "selected" : "default";
  }
  if (selectedId !== null) return id === selectedId ? "selected" : "dimmed";
  if (hoveredId !== null) return id === hoveredId ? "hovered" : "dimmed";
  return "default";
}

/**
 * Desktop pin sizes (PRD spec):
 *   default  → 8px, 0.65 opacity
 *   hovered  → 10px, full opacity
 *   selected → 13px fill + 2px white border
 *   dimmed   → 7px, 0.45 opacity
 *
 * Mobile pin sizes (unchanged from BottomSheet era):
 *   default  → 8px, 0.65 opacity
 *   selected → 12px fill + 2px white border
 */
function makeIcon(state: PinState, isMobile: boolean): L.DivIcon {
  if (isMobile) {
    if (state === "selected") {
      return L.divIcon({
        html: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#c0392b" stroke="#ffffff" stroke-width="2"/></svg>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    }
    return L.divIcon({
      html: `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#c0392b" fill-opacity="0.65"/></svg>`,
      className: "",
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });
  }

  // Desktop
  switch (state) {
    case "selected":
      // 13px fill + 2px white border → outer edge 7.5px → use 18×18 SVG
      return L.divIcon({
        html: `<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.5" fill="#c0392b" stroke="#ffffff" stroke-width="2"/></svg>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
    case "hovered":
      return L.divIcon({
        html: `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#c0392b"/></svg>`,
        className: "",
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
    case "dimmed":
      return L.divIcon({
        html: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="#c0392b" fill-opacity="0.45"/></svg>`,
        className: "",
        iconSize: [7, 7],
        iconAnchor: [3.5, 3.5],
      });
    default: // "default"
      return L.divIcon({
        html: `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#c0392b" fill-opacity="0.65"/></svg>`,
        className: "",
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
  }
}

// ---------------------------------------------------------------------------
// Map click → deselect
// ---------------------------------------------------------------------------

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

// ---------------------------------------------------------------------------
// Map controller
//   Mobile  → flyTo on select, fitBounds on deselect
//   Desktop → panTo (no zoom) if selected pin is outside current bounds;
//             deselect does NOT move the map
// ---------------------------------------------------------------------------

function MapController({
  selected,
  restaurants,
  isMobile,
}: {
  selected: Restaurant | null;
  restaurants: Restaurant[];
  isMobile: boolean;
}) {
  const map = useMap();
  const prevRef = useRef<Restaurant | null>(null);

  useEffect(() => {
    if (isMobile) {
      if (selected) {
        map.flyTo([selected.latitude, selected.longitude], 15, {
          animate: true,
          duration: 0.6,
        });
      } else if (prevRef.current !== null) {
        const coords = restaurants
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => [r.latitude, r.longitude] as [number, number]);
        if (coords.length > 0) map.fitBounds(coords, { padding: [40, 40] });
      }
    } else {
      // Desktop: only pan if the selected pin is off-screen; never change zoom.
      if (selected) {
        const latLng = L.latLng(selected.latitude, selected.longitude);
        if (!map.getBounds().contains(latLng)) {
          map.panTo(latLng);
        }
      }
      // Deselect on desktop: do nothing to the viewport.
    }
    prevRef.current = selected;
  }, [selected, map, restaurants, isMobile]);

  return null;
}

// ---------------------------------------------------------------------------
// Main Map component
//
// State is fully controlled from outside:
//   selectedRestaurant  → drives pin highlight + mobile flyTo / desktop panTo
//   hoveredRestaurantId → drives desktop hover highlight + tooltip (ignored on mobile)
// ---------------------------------------------------------------------------

export default function Map({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  hoveredRestaurantId,
  onHoverRestaurant,
}: {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (r: Restaurant | null) => void;
  hoveredRestaurantId?: string | null;
  onHoverRestaurant?: (id: string | null) => void;
}) {
  const markerRefs = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const isMobile = useIsMobile();

  const selectedId = selectedRestaurant?.id ?? null;
  const hoveredId = hoveredRestaurantId ?? null;

  // Bind/unbind Leaflet tooltips (desktop only: name + price above the pin).
  useEffect(() => {
    for (const [id, marker] of markerRefs.current.entries()) {
      if (!isMobile) {
        const r = restaurants.find((r) => r.id === id);
        if (r) {
          const menu = r.menus?.[0];
          const price =
            menu?.price_eur != null
              ? ` · €${Number(menu.price_eur).toFixed(2)}`
              : "";
          marker.bindTooltip(`${r.name}${price}`, {
            permanent: false,
            direction: "top",
            offset: L.point(0, -4),
            className: "menunico-tooltip",
          });
        }
      } else {
        marker.unbindTooltip();
      }
    }
  }, [isMobile, restaurants]);

  const handleMarkerClick = (r: Restaurant) => {
    onSelectRestaurant(selectedRestaurant?.id === r.id ? null : r);
  };

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

        <MapClickHandler onMapClick={() => onSelectRestaurant(null)} />
        <MapController
          selected={selectedRestaurant}
          restaurants={restaurants}
          isMobile={isMobile}
        />

        {restaurants.map((r) => {
          const pinState = getPinState(r.id, selectedId, hoveredId, isMobile);
          return (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={makeIcon(pinState, isMobile)}
              ref={(marker) => {
                if (marker) markerRefs.current.set(r.id, marker);
                else markerRefs.current.delete(r.id);
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  handleMarkerClick(r);
                },
                // Desktop hover → propagate up so RestaurantList highlights too
                ...(isMobile
                  ? {}
                  : {
                      mouseover: () => onHoverRestaurant?.(r.id),
                      mouseout: () => onHoverRestaurant?.(null),
                    }),
              }}
            />
          );
        })}
      </MapContainer>
      {/* Desktop panel removed — detail lives in RestaurantList left pane.
          Mobile detail lives in BottomSheet. */}
    </>
  );
}
