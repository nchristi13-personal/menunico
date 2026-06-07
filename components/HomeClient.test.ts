import { describe, it, expect } from "vitest";
import { searchRestaurants } from "./HomeClient";
import type { Restaurant, MenuRow } from "./Map";

function makeMenu(overrides: Partial<MenuRow> = {}): MenuRow {
  return {
    price_eur: 12,
    drink_included: true,
    bread_included: true,
    primeros: [],
    segundos: [],
    postres: [],
    ...overrides,
  };
}

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: "r1",
    name: "Restaurant",
    neighborhood: "Eixample",
    address: "Carrer Test 1",
    telephone: "000",
    website: null,
    latitude: 41.38,
    longitude: 2.17,
    menus: [],
    ...overrides,
  };
}

describe("searchRestaurants", () => {
  const restaurants: Restaurant[] = [
    makeRestaurant({
      id: "paella-house",
      name: "La Paella House",
      menus: [makeMenu({ primeros: ["Ensalada"], segundos: ["Pollo al horno"], postres: ["Flan"] })],
    }),
    makeRestaurant({
      id: "sushi-bar",
      name: "Sushi Bar Gràcia",
      menus: [makeMenu({ primeros: ["Sopa miso"], segundos: ["Salmón a la plancha"], postres: ["Mochi"] })],
    }),
    makeRestaurant({
      id: "no-menu",
      name: "Bistro Sin Menú",
      menus: [],
    }),
  ];

  it("returns every restaurant for an empty or whitespace-only query", () => {
    expect(searchRestaurants(restaurants, "")).toEqual(restaurants);
    expect(searchRestaurants(restaurants, "   ")).toEqual(restaurants);
  });

  it("matches by restaurant name, case-insensitively", () => {
    expect(searchRestaurants(restaurants, "paella").map((r) => r.id)).toEqual(["paella-house"]);
    expect(searchRestaurants(restaurants, "SUSHI").map((r) => r.id)).toEqual(["sushi-bar"]);
  });

  it("matches by dish across primeros, segundos and postres", () => {
    expect(searchRestaurants(restaurants, "pollo").map((r) => r.id)).toEqual(["paella-house"]);
    expect(searchRestaurants(restaurants, "miso").map((r) => r.id)).toEqual(["sushi-bar"]);
    expect(searchRestaurants(restaurants, "mochi").map((r) => r.id)).toEqual(["sushi-bar"]);
  });

  it("trims surrounding whitespace from the query", () => {
    expect(searchRestaurants(restaurants, "  paella  ").map((r) => r.id)).toEqual(["paella-house"]);
  });

  it("does not crash on restaurants without menus, and excludes them from dish matches", () => {
    expect(() => searchRestaurants(restaurants, "anything")).not.toThrow();
    expect(searchRestaurants(restaurants, "menú").map((r) => r.id)).toEqual(["no-menu"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchRestaurants(restaurants, "xyz-does-not-exist")).toEqual([]);
  });
});
