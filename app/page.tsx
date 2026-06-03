import { createClient } from "@/lib/supabase/server";
import MapLoader from "@/components/MapLoader";
import Logo from "@/components/Logo";
import type { Restaurant } from "@/components/Map";

function formatDate(): { weekday: string; dayMonth: string } {
  const now = new Date();
  const weekday = now.toLocaleDateString("es-ES", {
    weekday: "long",
    timeZone: "Europe/Madrid",
  });
  const dayMonth = now.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    dayMonth,
  };
}

export default async function Home() {
  const supabase = await createClient();

  // No date filter while menus are static (pre-cron).
  // Weekend 4: add .eq("menus.date", today) once the daily cron is live.
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select(
      `*, menus!left(price_eur, drink_included, bread_included, primeros, segundos, postres)`
    )
    .returns<Restaurant[]>();

  if (error) {
    console.error("Failed to load restaurants:", error.message);
  }

  const data = restaurants ?? [];
  const { weekday, dayMonth } = formatDate();

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Header — 3-column: logo | date (centered) | login               */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="flex sm:grid items-center justify-between px-4 shrink-0"
        style={{
          height: 58,
          gridTemplateColumns: "1fr auto 1fr",
          background: "#ffffff",
          borderBottom: "1px solid #ece8e4",
          zIndex: 1000,
          position: "relative",
        }}
      >
        {/* Left: wordmark */}
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Center: single-line date — desktop only */}
        <span
          className="hidden sm:block"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#1e1c1a",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {weekday}, {dayMonth}
        </span>

        {/* Right */}
        <div className="flex items-center justify-end gap-3">
          {/* Mobile: 2-line date + icon button */}
          <div className="sm:hidden flex items-center gap-3">
            <div className="flex flex-col items-end" style={{ lineHeight: 1.2 }}>
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e1c1a",
                  letterSpacing: "-0.01em",
                }}
              >
                {weekday}
              </span>
              <span style={{ fontSize: 11, color: "#7a7775" }}>{dayMonth}</span>
            </div>
            <a
              href="/login"
              aria-label="Iniciar sesión"
              className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-80 shrink-0"
              style={{ background: "#c0392b" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </a>
          </div>

          {/* Desktop: full pill */}
          <a
            href="/login"
            className="hidden sm:block text-white text-[13px] font-medium px-4 py-1.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: "#c0392b", whiteSpace: "nowrap" }}
          >
            Iniciar sesión
          </a>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Map + floating copy chip                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapLoader restaurants={data} />

      </div>
    </>
  );
}
