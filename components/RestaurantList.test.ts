import { describe, it, expect } from "vitest";
import { cleanAddress } from "./RestaurantList";

describe("cleanAddress", () => {
  it("strips a trailing parenthesised district suffix", () => {
    expect(cleanAddress("Carrer de Mallorca 123 (Eixample)")).toBe("Carrer de Mallorca 123");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanAddress("  Carrer de Mallorca 123 (Eixample)  ")).toBe("Carrer de Mallorca 123");
  });

  it("leaves addresses without a suffix unchanged", () => {
    expect(cleanAddress("Carrer de Mallorca 123")).toBe("Carrer de Mallorca 123");
  });

  it("only strips the trailing parenthesised group, not ones mid-string", () => {
    expect(cleanAddress("Plaça (Sol) Carrer 5 (Gràcia)")).toBe("Plaça (Sol) Carrer 5");
  });
});
