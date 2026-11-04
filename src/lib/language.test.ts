import { describe, expect, it } from "vitest";
import { formatDate, formatMonth } from "./format";
import { translateUiText } from "./language";
import { mealLabel, mealPlural } from "./meals";

describe("idioma catalán", () => {
  it("traduce textos de páginas y etiquetas dinámicas", () => {
    expect(translateUiText("Gastos por categoría", "ca")).toBe("Despeses per categoria");
    expect(translateUiText("Caduca en 10 días", "ca")).toBe("Caduca d'aquí a 10 dies");
    expect(translateUiText("Noviembre de 2026", "ca")).toBe("Novembre de 2026");
    expect(translateUiText("Gastos · Noviembre de 2026", "ca")).toBe("Despeses · Novembre de 2026");
    expect(translateUiText("Gastos por categoría", "es")).toBe("Gastos por categoría");
  });

  it("formatea fechas y tipos de comida en catalán", () => {
    expect(formatMonth("2026-11-01", "ca")).toBe("Novembre del 2026");
    expect(formatDate("2026-11-04", "ca")).toContain("nov");
    expect(mealLabel("dinner", "ca")).toBe("Sopar");
    expect(mealPlural("lunch", "ca")).toBe("Dinars");
  });
});
