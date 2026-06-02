import { createClient } from "@/lib/supabase/server";
import MapLoader from "@/components/MapLoader";
import Logo from "@/components/Logo";
import type { Restaurant } from "@/components/Map";

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
          borderBottom: "1px solid #e8e4e0",
          zIndex: 1000,
          position: "relative",
        }}
      >
        {/* Logo / wordmark — client component to allow onError handler */}
        <Logo />

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Favorites */}
          <a
            href="/favorites"
            aria-label="Favorites"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f4f0eb] transition-colors"
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

          {/* User avatar */}
          <a
            href="/login"
            aria-label="Account"
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ background: "#f4f0eb", border: "1px solid #e8e4e0" }}
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
      {/* Map — fills remaining viewport height                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapLoader restaurants={data} />
      </div>
    </>
  );
}
