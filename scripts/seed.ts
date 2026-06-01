/**
 * Seed the menunico Supabase database from per-district xlsx files.
 *
 * Run: `npx tsx --env-file=.env.local scripts/seed.ts`
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Flow:
 *   1. Read each district's xlsx → flat list of candidate restaurants.
 *   2. Per district: shuffle and take TARGET_PER_DISTRICT (+oversample buffer
 *      so geocoding failures don't undercount).
 *   3. Geocode each address via Nominatim at 1 req/sec.
 *   4. Single Anthropic call generates a menu per (geocoded) restaurant,
 *      using restaurant name + address as context.
 *   5. Wipe existing Barcelona restaurants (cascades to menus & favorites),
 *      insert fresh restaurants, upsert today's menus.
 *
 * Not deterministic: shuffle is unseeded. Re-runs produce different picks.
 */

import { randomUUID } from "node:crypto";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const XLSX_DIR =
  "/Users/nikolaoschristianos/Downloads/drive-download-20260601T204340Z-3-001";

/** Target restaurants per district. */
const TARGET_PER_DISTRICT = 5;
/** Pick this many candidates per district before geocoding (buffer for failures). */
const PICK_PER_DISTRICT = 8;

/** xlsx filename → canonical district name (matches schema CHECK constraint). */
const DISTRICTS: ReadonlyArray<{ file: string; district: string }> = [
  { file: "Ciutat Vella.xlsx", district: "Ciutat Vella" },
  { file: "Eixample.xlsx", district: "Eixample" },
  { file: "Gracia.xlsx", district: "Gràcia" },
  { file: "Horta-Guinardó.xlsx", district: "Horta-Guinardó" },
  { file: "Les Cortes.xlsx", district: "Les Corts" },
  { file: "Nou Barris_.xlsx", district: "Nou Barris" },
  { file: "Sant Andreu.xlsx", district: "Sant Andreu" },
  { file: "Sant Marti.xlsx", district: "Sant Martí" },
  { file: "Sants-Montjuic.xlsx", district: "Sants-Montjuïc" },
  { file: "Sarrià-Sant Gervasi.xlsx", district: "Sarrià-Sant Gervasi" },
];

/** Sheets we never want to read. */
const SKIP_SHEET_PREFIXES = ["_", "Mailchimp"];

/** Barcelona street-type abbreviations (start of address). */
const ABBREV: Array<[RegExp, string]> = [
  [/^G\.V\.\s+/i, "Gran Via "],
  [/^Av\s+/i, "Avinguda "],
  [/^Pg\s+/i, "Passeig "],
  [/^Pl\s+/i, "Plaça "],
  [/^Ptge\s+/i, "Passatge "],
  [/^Trav\s+/i, "Travessera "],
  [/^Rda\s+/i, "Ronda "],
  [/^Ctra\s+/i, "Carretera "],
  [/^Camí\s+/i, "Camí "],
  [/^C\s+/i, "Carrer "],
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CandidateRestaurant = {
  name: string;
  rawAddress: string;
  geocodeAddress: string;
  telephone: string;
  website: string | null;
  district: string;
};

type GeocodedRestaurant = CandidateRestaurant & {
  id: string;
  latitude: number;
  longitude: number;
};

type Menu = {
  restaurant_index: number;
  primeros: string[];
  segundos: string[];
  postres: string[];
  drink_included: boolean;
  bread_included: boolean;
  price_eur: number;
};

type RestaurantMenuPair = { restaurant: GeocodedRestaurant; menu: Menu };

// ---------------------------------------------------------------------------
// Spreadsheet extraction (handles all 3 formats)
// ---------------------------------------------------------------------------

/** Pull the first non-null string out of a row, by trying each candidate column. */
function firstString(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const k of candidates) {
    const v = row[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
}

/** Parse `"Dirección: <addr> Tel.: <phone>"` (Format C). */
function parseCombinedField(raw: string): { address: string | null; phone: string | null } {
  const addr = raw.match(/Direcci[oó]n:\s*(.+?)(?:\s+Tel\.?:|$)/i)?.[1]?.trim() ?? null;
  const phone = raw.match(/Tel\.?:\s*([\d\s]+)/i)?.[1]?.replace(/\s+/g, "") ?? null;
  return { address: addr, phone };
}

/**
 * Extract restaurants from one workbook (a district's file).
 * Walks every non-junk sheet, tries each known column layout.
 */
function extractFromWorkbook(filePath: string, district: string): CandidateRestaurant[] {
  const wb = XLSX.readFile(filePath);
  const out: CandidateRestaurant[] = [];

  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEET_PREFIXES.some((p) => sheetName.startsWith(p))) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets[sheetName],
      { defval: null },
    );

    for (const row of rows) {
      // Name: try every layout
      const name = firstString(row, [
        "Name",
        "dadesblock_link/_text",
        "dades_link_1/_text",
      ]);
      if (!name) continue;

      // Address
      let rawAddress = firstString(row, ["Address", "direccin_value"]);
      let telephone = firstString(row, ["Telephone", "dades_number", "tel_number"]);
      const combined = firstString(row, ["dades_content"]);
      if (combined && (!rawAddress || !telephone)) {
        const parsed = parseCombinedField(combined);
        rawAddress = rawAddress ?? parsed.address;
        telephone = telephone ?? parsed.phone;
      }
      if (!rawAddress || !telephone) continue;

      // Website (optional)
      const website = firstString(row, [
        "Website",
        "dadesdl_link",
        "dadesdl_link/_text",
        "dades_link_2",
      ]);

      out.push({
        name,
        rawAddress,
        geocodeAddress: normalizeAddressForGeocoding(rawAddress),
        telephone: String(telephone),
        website,
        district,
      });
    }
  }

  // Dedupe by (name, address) within a district — same restaurant sometimes
  // appears across sub-neighbourhood sheets.
  const seen = new Set<string>();
  return out.filter((r) => {
    const key = `${r.name}|${r.rawAddress}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Strip `(District)` suffix, expand street abbreviations, append city/country. */
function normalizeAddressForGeocoding(raw: string): string {
  let cleaned = raw.replace(/\s*\([^)]+\)\s*$/, "").trim();
  for (const [pattern, replacement] of ABBREV) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, replacement);
      break;
    }
  }
  return `${cleaned}, Barcelona, Spain`;
}

// ---------------------------------------------------------------------------
// Geocoding (Nominatim, 1 req/sec)
// ---------------------------------------------------------------------------

const NOMINATIM_DELAY_MS = 1100; // a hair over 1s to be safe
const NOMINATIM_UA = "menunico-seed/1.0 (https://github.com/nchristi13-personal/menunico)";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "es");

  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "ca,es,en" },
  });
  if (!resp.ok) {
    console.warn(`  Nominatim HTTP ${resp.status} for "${address}"`);
    return null;
  }
  const json = (await resp.json()) as Array<{ lat: string; lon: string }>;
  if (json.length === 0) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}

async function geocodeAll(
  candidates: CandidateRestaurant[],
): Promise<GeocodedRestaurant[]> {
  const out: GeocodedRestaurant[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    process.stdout.write(`  [${i + 1}/${candidates.length}] ${c.district} — ${c.name.slice(0, 50)}… `);
    try {
      let hit = await geocode(c.geocodeAddress);
      if (!hit) {
        // Retry once with bare street (no district info)
        await sleep(NOMINATIM_DELAY_MS);
        hit = await geocode(c.geocodeAddress);
      }
      if (hit) {
        out.push({ ...c, id: randomUUID(), latitude: hit.lat, longitude: hit.lon });
        console.log(`✓ ${hit.lat.toFixed(5)},${hit.lon.toFixed(5)}`);
      } else {
        console.log("✗ not found");
      }
    } catch (err) {
      console.log(`✗ error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (i < candidates.length - 1) await sleep(NOMINATIM_DELAY_MS);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Anthropic — generate menus
// ---------------------------------------------------------------------------

const MENU_TOOL: Anthropic.Tool = {
  name: "submit_menus",
  description:
    "Submit one menú del día per restaurant. Each menu must carry its `restaurant_index` so the host can pair menus back to restaurants even if some are missing.",
  input_schema: {
    type: "object",
    properties: {
      menus: {
        type: "array",
        description: "One menu per restaurant. Identify each by `restaurant_index` (1-based, matching the numbered list in the prompt).",
        items: {
          type: "object",
          properties: {
            restaurant_index: {
              type: "integer",
              description: "1-based position of this menu's restaurant in the prompt list.",
            },
            primeros: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
            segundos: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
            postres: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
            drink_included: { type: "boolean" },
            bread_included: { type: "boolean" },
            price_eur: { type: "number", minimum: 10, maximum: 15.5 },
          },
          required: [
            "restaurant_index",
            "primeros",
            "segundos",
            "postres",
            "drink_included",
            "bread_included",
            "price_eur",
          ],
        },
      },
    },
    required: ["menus"],
  },
};

async function generateMenus(
  client: Anthropic,
  restaurants: GeocodedRestaurant[],
): Promise<RestaurantMenuPair[]> {
  const restaurantList = restaurants
    .map(
      (r, i) =>
        `${i + 1}. ${r.name}\n   Address: ${r.rawAddress}\n   District: ${r.district}`,
    )
    .join("\n\n");

  const prompt = `Generate a fictional "menú del día" for each of the ${restaurants.length} real Barcelona restaurants below. The menus are invented — do not pull real menu data. Use the restaurant name and address as context to pick dishes that fit the venue (a "Cervecería" leans tapas; "Restaurant Vegetarian" leans plant-based; a hotel restaurant leans international; a Barceloneta venue leans seafood; etc.).

CRITICAL: return exactly ${restaurants.length} menus — one per numbered restaurant. Each menu MUST include a \`restaurant_index\` field set to the 1-based number from the list (1 through ${restaurants.length}). Do not skip any number. Do not duplicate any number.

Rules for every menu:

- **primeros**: exactly 3 plausible Spanish/Catalan starters. Examples: ensalada de tomate y burrata, escudella, sopa de pescado, croquetes de pollastre, pa amb tomàquet amb pernil, esqueixada de bacallà, crema de carbassa, amanida catalana, gazpacho.
- **segundos**: exactly 3 plausible mains in Spanish/Catalan. Examples: bacallà a la llauna, botifarra amb mongetes, pollastre rostit, peix del mercat a la planxa, arròs caldós, fideuà, calamars a la romana, entrecot a la pedra, mandonguilles amb sípia.
- **postres**: exactly 3 options. ALWAYS include "fruita del temps" or "iogurt" as one of them. The other two are traditional desserts (crema catalana, mel i mató, flam, pijama, recuit amb mel, tarta de Santiago).
- **drink_included**: true for ~80% of menus (~${Math.round(restaurants.length * 0.8)} of ${restaurants.length}); spread the falses, don't clump them.
- **bread_included**: always true.
- **price_eur**: between 10.00 and 15.50, two decimals. Higher-end venues (hotel restaurants, Sarrià-Sant Gervasi) cluster nearer 15; neighbourhood bars (Nou Barris, Sant Andreu) nearer 10.

Vary dish combinations so menus don't feel templated.

Restaurants:

${restaurantList}`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 32000,
    thinking: { type: "disabled" },
    output_config: { effort: "medium" },
    tools: [MENU_TOOL],
    tool_choice: { type: "tool", name: "submit_menus" },
    messages: [{ role: "user", content: prompt }],
  });

  const message = await stream.finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error(
      `Expected tool_use, got blocks: [${message.content.map((b) => b.type).join(", ")}], stop_reason=${message.stop_reason}`,
    );
  }
  const input = toolUse.input as { menus?: Menu[] };
  if (!Array.isArray(input.menus)) {
    throw new Error(`Tool input missing 'menus' array: ${JSON.stringify(input).slice(0, 200)}`);
  }

  // Pair menus to restaurants by 1-based restaurant_index. Tolerate drops,
  // duplicates, and out-of-range indices.
  const menuByIndex = new Map<number, Menu>();
  for (const m of input.menus) {
    if (
      typeof m.restaurant_index === "number" &&
      Number.isInteger(m.restaurant_index) &&
      m.restaurant_index >= 1 &&
      m.restaurant_index <= restaurants.length &&
      !menuByIndex.has(m.restaurant_index)
    ) {
      menuByIndex.set(m.restaurant_index, m);
    }
  }

  const pairs: RestaurantMenuPair[] = [];
  const missing: number[] = [];
  for (let i = 0; i < restaurants.length; i++) {
    const menu = menuByIndex.get(i + 1);
    if (menu) {
      pairs.push({ restaurant: restaurants[i], menu });
    } else {
      missing.push(i + 1);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `  ⚠ model returned ${input.menus.length}/${restaurants.length} usable menus — skipping restaurant index(es): ${missing.join(", ")}`,
    );
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Fisher–Yates shuffle (in-place); returns the array for chaining. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    const missing = [
      !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
      !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
      !anthropicKey && "ANTHROPIC_API_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Missing required env var(s): ${missing}`);
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---- 1. Extract -----------------------------------------------------
  console.log("Extracting restaurants from spreadsheets…");
  const candidates: CandidateRestaurant[] = [];
  for (const { file, district } of DISTRICTS) {
    const fullPath = path.join(XLSX_DIR, file);
    const found = extractFromWorkbook(fullPath, district);
    console.log(`  ${district.padEnd(22)} ${found.length.toString().padStart(4)} candidates from ${file}`);
    candidates.push(...found);
  }

  // ---- 2. Sample -----------------------------------------------------
  console.log(`\nSampling up to ${PICK_PER_DISTRICT} per district…`);
  const picks: CandidateRestaurant[] = [];
  for (const { district } of DISTRICTS) {
    const pool = candidates.filter((c) => c.district === district);
    const sampled = shuffle([...pool]).slice(0, PICK_PER_DISTRICT);
    if (sampled.length < TARGET_PER_DISTRICT) {
      console.warn(
        `  ⚠ ${district}: only ${sampled.length} candidates (target ${TARGET_PER_DISTRICT})`,
      );
    }
    picks.push(...sampled);
  }
  console.log(`  Total picked: ${picks.length} (will geocode all, target ${DISTRICTS.length * TARGET_PER_DISTRICT})`);

  // ---- 3. Geocode ----------------------------------------------------
  console.log(`\nGeocoding ${picks.length} addresses via Nominatim (${NOMINATIM_DELAY_MS}ms/req)…`);
  const geocoded = await geocodeAll(picks);

  // Trim each district back to TARGET_PER_DISTRICT successful geocodes.
  const finalSet: GeocodedRestaurant[] = [];
  for (const { district } of DISTRICTS) {
    const districtGeocoded = geocoded.filter((g) => g.district === district);
    if (districtGeocoded.length < TARGET_PER_DISTRICT) {
      console.warn(
        `  ⚠ ${district}: only ${districtGeocoded.length} geocoded (wanted ${TARGET_PER_DISTRICT})`,
      );
    }
    finalSet.push(...districtGeocoded.slice(0, TARGET_PER_DISTRICT));
  }
  console.log(`\nFinal restaurant count: ${finalSet.length} / ${DISTRICTS.length * TARGET_PER_DISTRICT}`);
  if (finalSet.length === 0) {
    throw new Error("No restaurants geocoded successfully — aborting.");
  }

  // ---- 4. Generate menus --------------------------------------------
  console.log(`\nGenerating ${finalSet.length} menus via Claude…`);
  const pairs = await generateMenus(anthropic, finalSet);
  console.log(`  ↳ paired ${pairs.length}/${finalSet.length} menus.`);
  if (pairs.length === 0) {
    throw new Error("No menus paired successfully — aborting.");
  }

  // ---- 5. Wipe and insert ------------------------------------------
  console.log("\nDeleting existing Barcelona restaurants (cascades to menus + favorites)…");
  // RLS on, but we're using the service-role key — bypasses policies.
  // .delete() needs a filter to be allowed; the neighborhood IN (...) is a
  // no-op filter that matches every valid row in our schema.
  const districtNames = DISTRICTS.map((d) => d.district);
  const { error: deleteError } = await supabase
    .from("restaurants")
    .delete()
    .in("neighborhood", districtNames);
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

  console.log(`Inserting ${pairs.length} restaurants…`);
  const restaurantRows = pairs.map(({ restaurant: r }) => ({
    id: r.id,
    name: r.name,
    neighborhood: r.district,
    address: r.rawAddress, // keep human-readable form for display
    telephone: r.telephone,
    website: r.website,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
  const { error: restaurantError } = await supabase
    .from("restaurants")
    .insert(restaurantRows);
  if (restaurantError) throw new Error(`Restaurant insert failed: ${restaurantError.message}`);

  const today = new Date().toISOString().split("T")[0];
  const menuRows = pairs.map(({ restaurant: r, menu }) => ({
    restaurant_id: r.id,
    date: today,
    primeros: menu.primeros,
    segundos: menu.segundos,
    postres: menu.postres,
    drink_included: menu.drink_included,
    bread_included: menu.bread_included,
    price_eur: menu.price_eur,
  }));

  console.log(`Upserting ${menuRows.length} menus for ${today}…`);
  const { error: menuError } = await supabase
    .from("menus")
    .upsert(menuRows, { onConflict: "restaurant_id,date" });
  if (menuError) throw new Error(`Menu upsert failed: ${menuError.message}`);

  // ---- Summary ------------------------------------------------------
  const perDistrict = new Map<string, number>();
  for (const { restaurant: r } of pairs)
    perDistrict.set(r.district, (perDistrict.get(r.district) ?? 0) + 1);
  console.log("\nPer-district final counts:");
  for (const { district } of DISTRICTS) {
    const count = perDistrict.get(district) ?? 0;
    console.log(`  ${count === TARGET_PER_DISTRICT ? "✓" : "⚠"} ${district.padEnd(22)} ${count}`);
  }

  console.log("\n✓ Seed complete.");
}

seed().catch((err) => {
  console.error("\n✗ Seed failed:", err);
  process.exit(1);
});
