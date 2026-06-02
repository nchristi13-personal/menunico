"use client";

// `ssr: false` is only permitted in Client Components (Next.js 15+).
// This thin wrapper lets the Server Component page.tsx import the map
// without running Leaflet's window-dependent code on the server.

import dynamic from "next/dynamic";
import type { Restaurant } from "./Map";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "#f4f0eb" }}
    >
      <p style={{ color: "#8a8680", fontSize: 14 }}>Loading map…</p>
    </div>
  ),
});

export default function MapLoader({ restaurants }: { restaurants: Restaurant[] }) {
  return <Map restaurants={restaurants} />;
}
