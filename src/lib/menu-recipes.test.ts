import { describe, expect, it } from "vitest";
import { normalizeRecipeUrl } from "./menu-recipes";

describe("normalizeRecipeUrl", () => {
  it("accepts web links for a recipe", () => {
    expect(normalizeRecipeUrl(" https://recetas.example/pasta?personas=2 "))
      .toBe("https://recetas.example/pasta?personas=2");
    expect(normalizeRecipeUrl("http://recetas.example")).toBe("http://recetas.example/");
  });

  it("rejects links that should not be opened from the app", () => {
    expect(normalizeRecipeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeRecipeUrl("https://usuario:clave@recetas.example/pasta")).toBeNull();
    expect(normalizeRecipeUrl("recetas.example/pasta")).toBeNull();
    expect(normalizeRecipeUrl("https://recetas.example/" + "a".repeat(2048))).toBeNull();
  });
});
