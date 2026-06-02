import { createClient } from "@/lib/supabase/server";
import MapLoader from "@/components/MapLoader";
import Logo from "@/components/Logo";
import type { Restaurant } from "@/components/Map";

function formatDate(): string {
  const raw = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  });
  // "martes, 3 jun" → "Martes, 3 jun"
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, "");
}

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select(
      `*, menus!left(price_eur, drink_included, bread_included, primeros, segundos, postres)`
    )
    .eq("menus.date", today)
    .returns<Restaurant[]>();

  if (error) {
    console.error("Failed to load restaurants:", error.message);
  }

  const data = restaurants ?? [];
  const menuCount = data.filter((r) => r.menus.length > 0).length;
  const dateStr = formatDate();

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="flex items-center justify-between px-5 shrink-0"
        style={{
          height: 58,
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
        {/* Left: wordmark + date */}
        <div className="flex items-center gap-3">
          <Logo />
          <span
            className="hidden sm:block"
            style={{
              width: 1,
              height: 14,
              background: "#ddd9d5",
              display: "inline-block",
            }}
          />
          <span
            className="hidden sm:block text-[12px]"
            style={{ color: "#9a9895", letterSpacing: "0.01em" }}
          >
            {dateStr}
          </span>
        </div>

        {/* Right: favorites + account */}
        <div className="flex items-center gap-1">
          <a
            href="/favorites"
            aria-label="Favoritos"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#f4f0eb] transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a8680"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
          </a>
          <a
            href="/login"
            aria-label="Mi cuenta"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#f4f0eb] transition-colors"
            style={{ border: "1px solid #ece8e4" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a8680"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </a>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Map + floating copy chip                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapLoader restaurants={data} />

        {/* Floating count chip */}
        {menuCount > 0 && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full pointer-events-none"
            style={{
              zIndex: 1000,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 2px 12px rgba(44,40,37,0.12)",
              border: "1px solid #ece8e4",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#c0392b",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              className="text-[12px] font-medium whitespace-nowrap"
              style={{ color: "#3d3a38" }}
            >
              {menuCount} restaurantes con menú hoy
            </span>
          </div>
        )}
      </div>
    </>
  );
}
