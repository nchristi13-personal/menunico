"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import Supercluster from "supercluster";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MapBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
};

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
 * Every pin now uses the same teardrop location-pin shape that used to be
 * reserved for the "selected" state — size, opacity and the white centre dot
 * still vary by state so the selected/hovered/dimmed hierarchy stays legible.
 *
 *   selected → 20×28, full opacity, white dot + drop shadow (most prominent)
 *   hovered  → 18×25, full opacity
 *   default  → 16×22, 0.78 opacity
 *   dimmed   → 13×18, 0.4 opacity (least prominent)
 *
 * Anchor is always the teardrop's tip (bottom centre).
 */
const PIN_SPECS: Record<PinState, { width: number; opacity: number; highlighted: boolean }> = {
  selected: { width: 20, opacity: 1, highlighted: true },
  hovered: { width: 18, opacity: 1, highlighted: false },
  default: { width: 16, opacity: 0.78, highlighted: false },
  dimmed: { width: 13, opacity: 0.4, highlighted: false },
};

function teardropPinHtml(width: number, height: number, opacity: number, highlighted: boolean): string {
  const shadow = highlighted ? ' style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))"' : "";
  const dot = highlighted ? '<circle cx="10" cy="10" r="4" fill="white"/>' : "";
  return `<svg width="${width}" height="${height}" viewBox="0 0 20 28"${shadow}><path d="M10 0C4.477 0 0 4.477 0 10c0 7.18 10 18 10 18s10-10.82 10-18C20 4.477 15.523 0 10 0z" fill="#c0392b" fill-opacity="${opacity}"/>${dot}</svg>`;
}

function makeIcon(state: PinState): L.DivIcon {
  const { width, opacity, highlighted } = PIN_SPECS[state];
  const height = Math.round((width * 28) / 20);
  return L.divIcon({
    html: teardropPinHtml(width, height, opacity, highlighted),
    className: "",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
}

// ---------------------------------------------------------------------------
// Clustering — group nearby restaurants into a numbered badge that splits
// apart as the user zooms in (powered by supercluster).
// ---------------------------------------------------------------------------

type RestaurantPointProps = { restaurantId: string };

function makeClusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 32 : count < 100 ? 40 : 48;
  const fontSize = count < 10 ? 13 : count < 100 ? 14 : 15;
  const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#c0392b;color:#fff;border:2px solid #fff;font:600 ${fontSize}px/1 system-ui,-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 2px 5px rgba(0,0,0,0.35);">${count}</div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function RestaurantMarker({
  restaurant,
  pinState,
  selectedId,
  isMobile,
  onSelectRestaurant,
  onHoverRestaurant,
  markerRefs,
}: {
  restaurant: Restaurant;
  pinState: PinState;
  selectedId: string | null;
  isMobile: boolean;
  onSelectRestaurant: (r: Restaurant | null) => void;
  onHoverRestaurant?: (id: string | null) => void;
  markerRefs: React.MutableRefObject<globalThis.Map<string, L.Marker>>;
}) {
  const r = restaurant;
  return (
    <Marker
      position={[r.latitude, r.longitude]}
      icon={makeIcon(pinState)}
      ref={(marker) => {
        if (marker) markerRefs.current.set(r.id, marker);
        else markerRefs.current.delete(r.id);
      }}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRestaurant(selectedId === r.id ? null : r);
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
}

function ClusterLayer({
  restaurants,
  selectedRestaurant,
  hoveredId,
  isMobile,
  onSelectRestaurant,
  onHoverRestaurant,
  markerRefs,
}: {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  hoveredId: string | null;
  isMobile: boolean;
  onSelectRestaurant: (r: Restaurant | null) => void;
  onHoverRestaurant?: (id: string | null) => void;
  markerRefs: React.MutableRefObject<globalThis.Map<string, L.Marker>>;
}) {
  const map = useMap();
  const selectedId = selectedRestaurant?.id ?? null;

  const [view, setView] = useState(() => ({ zoom: map.getZoom(), bounds: map.getBounds() }));
  useMapEvents({
    zoomend: () => setView({ zoom: map.getZoom(), bounds: map.getBounds() }),
    moveend: () => setView((v) => ({ ...v, bounds: map.getBounds() })),
  });

  const points = useMemo(
    () => restaurants.filter((r) => r.latitude != null && r.longitude != null),
    [restaurants]
  );

  const index = useMemo(() => {
    const sc = new Supercluster<RestaurantPointProps>({ radius: 56, maxZoom: 16 });
    sc.load(
      points.map((r) => ({
        type: "Feature",
        properties: { restaurantId: r.id },
        geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
      }))
    );
    return sc;
  }, [points]);

  const items = useMemo(() => {
    const b = view.bounds;
    const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const raw = index.getClusters(bbox, Math.round(view.zoom));
    if (!selectedId) return raw;

    // If the selected restaurant landed inside a cluster, break that one
    // cluster open into its individual points — the highlighted pin must
    // always stand on its own, never hidden behind a numbered badge.
    const expanded: typeof raw = [];
    for (const feature of raw) {
      const props = feature.properties as { cluster?: true; cluster_id?: number };
      if (props.cluster) {
        const leaves = index.getLeaves(props.cluster_id!, Infinity);
        if (leaves.some((leaf) => (leaf.properties as RestaurantPointProps).restaurantId === selectedId)) {
          expanded.push(...leaves);
          continue;
        }
      }
      expanded.push(feature);
    }
    return expanded;
  }, [index, view, selectedId]);

  return (
    <>
      {items.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as Partial<RestaurantPointProps> & {
          cluster?: true;
          cluster_id?: number;
          point_count?: number;
        };

        if (props.cluster) {
          const clusterId = props.cluster_id!;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={makeClusterIcon(props.point_count!)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
                  map.flyTo([lat, lng], expansionZoom, { animate: true, duration: 0.5 });
                },
              }}
            />
          );
        }

        const r = restaurants.find((rr) => rr.id === props.restaurantId);
        if (!r) return null;
        return (
          <RestaurantMarker
            key={r.id}
            restaurant={r}
            pinState={getPinState(r.id, selectedId, hoveredId, isMobile)}
            selectedId={selectedId}
            isMobile={isMobile}
            onSelectRestaurant={onSelectRestaurant}
            onHoverRestaurant={onHoverRestaurant}
            markerRefs={markerRefs}
          />
        );
      })}
    </>
  );
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
  activeDistrict,
  onUserMoved,
  suppressFitBoundsRef,
}: {
  selected: Restaurant | null;
  restaurants: Restaurant[];
  isMobile: boolean;
  activeDistrict?: string;
  onUserMoved?: (bounds: MapBounds) => void;
  suppressFitBoundsRef?: React.RefObject<boolean>;
}) {
  const map = useMap();
  const prevRef = useRef<Restaurant | null>(null);
  // True while a programmatic move (flyTo / fitBounds / panTo) is in flight.
  // Prevents moveend from being reported as a user gesture.
  const isProgrammaticRef = useRef(false);

  // Register a moveend listener that fires onUserMoved only for real drags.
  useEffect(() => {
    const handler = () => {
      if (isProgrammaticRef.current) {
        isProgrammaticRef.current = false;
        return;
      }
      if (!onUserMoved) return;
      const b = map.getBounds();
      onUserMoved({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
    };
    map.on("moveend", handler);
    return () => { map.off("moveend", handler); };
  }, [map, onUserMoved]);

  // Selection-driven movement (unchanged behaviour).
  useEffect(() => {
    if (isMobile) {
      if (selected) {
        isProgrammaticRef.current = true;
        map.flyTo([selected.latitude, selected.longitude], 15, {
          animate: true,
          duration: 0.6,
        });
      } else if (prevRef.current !== null) {
        const coords = restaurants
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => [r.latitude, r.longitude] as [number, number]);
        if (coords.length > 0) {
          isProgrammaticRef.current = true;
          map.fitBounds(coords, { padding: [40, 40] });
        }
      }
    } else {
      // Desktop: only pan if the selected pin is off-screen; never change zoom.
      if (selected) {
        const latLng = L.latLng(selected.latitude, selected.longitude);
        if (!map.getBounds().contains(latLng)) {
          isProgrammaticRef.current = true;
          map.panTo(latLng);
        }
      }
    }
    prevRef.current = selected;
  }, [selected, map, restaurants, isMobile]);

  // District-filter zoom: fit the map to the district's restaurants.
  // `restaurants` is already filtered by district when this effect fires,
  // so we just read it from the closure — intentionally not in the deps array
  // to avoid also zooming on search-query changes.
  useEffect(() => {
    if (activeDistrict === undefined) return;
    const coords = restaurants
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => [r.latitude, r.longitude] as [number, number]);
    if (coords.length === 0) return;
    // When the district is reset to "Todos" via "Buscar en esta zona", the
    // caller sets suppressFitBoundsRef so the map stays where the user panned.
    if (suppressFitBoundsRef?.current) {
      suppressFitBoundsRef.current = false;
      return;
    }
    isProgrammaticRef.current = true;
    if (activeDistrict === "Todos") {
      map.fitBounds(coords, { padding: [32, 32], animate: true });
    } else {
      map.fitBounds(coords, { padding: [48, 48], maxZoom: 15, animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDistrict, map]);

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
  activeDistrict,
  onUserMoved,
  suppressFitBoundsRef,
}: {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (r: Restaurant | null) => void;
  hoveredRestaurantId?: string | null;
  onHoverRestaurant?: (id: string | null) => void;
  activeDistrict?: string;
  onUserMoved?: (bounds: MapBounds) => void;
  suppressFitBoundsRef?: React.RefObject<boolean>;
}) {
  const markerRefs = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const isMobile = useIsMobile();

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

  return (
    <>
      <MapContainer
        center={[41.3851, 2.1734]}
        zoom={12}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={() => onSelectRestaurant(null)} />
        <MapController
          selected={selectedRestaurant}
          restaurants={restaurants}
          isMobile={isMobile}
          activeDistrict={activeDistrict}
          onUserMoved={onUserMoved}
          suppressFitBoundsRef={suppressFitBoundsRef}
        />

        <ClusterLayer
          restaurants={restaurants}
          selectedRestaurant={selectedRestaurant}
          hoveredId={hoveredId}
          isMobile={isMobile}
          onSelectRestaurant={onSelectRestaurant}
          onHoverRestaurant={onHoverRestaurant}
          markerRefs={markerRefs}
        />
      </MapContainer>
      {/* Desktop panel removed — detail lives in RestaurantList left pane.
          Mobile detail lives in BottomSheet. */}
    </>
  );
}
