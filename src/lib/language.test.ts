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

  it("traduce tareas domésticas y permisos familiares, también en textos dinámicos", () => {
    expect(translateUiText("Tareas Domésticas", "ca")).toBe("Tasques domèstiques");
    expect(translateUiText("Gestión de miembros", "ca")).toBe("Gestió de membres");
    expect(translateUiText("Sin acceso", "ca")).toBe("Sense accés");
    expect(translateUiText("tareas completadas", "ca")).toBe("tasques completades");
    expect(translateUiText("de 3 familias creadas", "ca")).toBe("de 3 unitats familiars creades");
    expect(translateUiText("Marcar como hecha sacar la basura del lunes", "ca"))
      .toBe("Marcar com a feta sacar la basura del dilluns");
    expect(translateUiText("Eliminar a persona@example.com", "ca")).toBe("Eliminar persona@example.com");
    expect(translateUiText("Gestión de miembros", "es")).toBe("Gestión de miembros");
  });
});
