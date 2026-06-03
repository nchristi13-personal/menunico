import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/HomeClient";
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

  const { weekday, dayMonth } = formatDate();

  return (
    <HomeClient
      restaurants={restaurants ?? []}
      weekday={weekday}
      dayMonth={dayMonth}
    />
  );
}
