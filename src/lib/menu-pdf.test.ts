import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { MEAL_ICON_PATHS } from "./meal-icon-paths";
import { MEAL_TYPES } from "./meals";
import { PDF_COLORS } from "./pdf-brand";
import { buildMenuPdf, buildMonthCalendarPdf, monthWeeks, type MenuPdfMeal } from "./menu-pdf";

const fonts = { family: "helvetica", medium: "bold", semibold: "bold" };
const month = "2026-08";
const weeks = monthWeeks(month);
const meals: MenuPdfMeal[] = weeks.flatMap((week) => week.days.filter((day): day is string => Boolean(day)).flatMap((day) => [
  { meal_date: day, meal_type: "breakfast", title: "Tostadas con tomate" },
  { meal_date: day, meal_type: "lunch", title: "Arroz con verduras" },
  { meal_date: day, meal_type: "snack", title: "Fruta de temporada" },
  { meal_date: day, meal_type: "dinner", title: "Crema de calabaza" },
]));

function saveQaPdf(doc: jsPDF, name: string) {
  if (!process.env.MENU_PDF_QA) return;
  mkdirSync("tmp/pdfs", { recursive: true });
  writeFileSync(`tmp/pdfs/${name}.pdf`, Buffer.from(doc.output("arraybuffer")));
}

describe("PDF de menús", () => {
  it("escribe en catalán los días, las comidas y las cabeceras de ambos formatos", () => {
    const calendar = new jsPDF({ unit: "pt", format: "a3", orientation: "landscape" });
    const calendarText = vi.spyOn(calendar, "text");
    buildMonthCalendarPdf(calendar, fonts, null, {
      month, monthTitle: "agost de 2026", meals, mealTypes: ["breakfast", "lunch", "snack", "dinner"], language: "ca",
    });
    expect(monthWeeks(month, "ca")[0].label).toContain("ag");
    for (const label of ["Esmorzar", "Dinar", "Berenar", "Sopar"]) {
      expect(calendarText.mock.calls.some(([value]) => typeof value === "string" && value.startsWith(`${label} · `))).toBe(true);
    }
    saveQaPdf(calendar, "menu-calendari-ca");

    const weekly = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const weeklyText = vi.spyOn(weekly, "text");
    buildMenuPdf(weekly, fonts, null, {
      title: "Menú de la setmana", subtitle: "Dinars · Sopars", footer: "Menú · Agost de 2026",
      weeks: monthWeeks(month, "ca").slice(0, 1), meals, mealTypes: ["lunch", "dinner"], language: "ca",
    });
    expect(weeklyText.mock.calls.some(([value]) => value === "Dinar")).toBe(true);
    expect(weeklyText.mock.calls.some(([value]) => value === "Sopar")).toBe(true);
    saveQaPdf(weekly, "menu-setmana-ca");
  });
  it("dibuja el calendario de un mes de seis semanas en una sola página", () => {
    const doc = new jsPDF({ unit: "pt", format: "a3", orientation: "landscape" });
    const text = vi.spyOn(doc, "text");
    buildMonthCalendarPdf(doc, fonts, null, {
      month, monthTitle: "agosto de 2026", meals,
      mealTypes: ["breakfast", "lunch", "snack", "dinner"],
    });
    expect(weeks).toHaveLength(6);
    expect(doc.getNumberOfPages()).toBe(1);
    for (const label of ["Desayuno", "Comida", "Merienda", "Cena"]) {
      expect(text.mock.calls.some(([value]) => typeof value === "string" && value.startsWith(`${label} · `))).toBe(true);
    }
    saveQaPdf(doc, "menu-calendario");
  });

  it("separa las semanas y muestra solo los tipos elegidos", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const text = vi.spyOn(doc, "text");
    buildMenuPdf(doc, fonts, null, {
      title: "Menú de agosto de 2026", subtitle: "Comidas · Cenas", footer: "Menú · Agosto de 2026",
      weeks, meals, mealTypes: ["lunch", "dinner"], separateWeeks: true,
    });
    expect(doc.getNumberOfPages()).toBe(6);
    expect(text.mock.calls.some(([value]) => value === "Comida")).toBe(true);
    expect(text.mock.calls.some(([value]) => value === "Cena")).toBe(true);
    saveQaPdf(doc, "menu-semanas");
  });

  it("incrusta los iconos de cada tipo en el calendario y en las semanas", async () => {
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";
    const iconImages: Record<(typeof MEAL_TYPES)[number]["id"], string> = { breakfast: pixel, lunch: pixel, snack: pixel, dinner: pixel };
    if (process.env.MENU_PDF_QA) {
      const { default: sharp } = await import("sharp");
      const color = `rgb(${PDF_COLORS.textSecondary.join(",")})`;
      for (const type of MEAL_TYPES) {
        const paths = MEAL_ICON_PATHS[type.id].map((path) => `<path d="${path}"/>`).join("");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
        iconImages[type.id] = `data:image/png;base64,${(await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64")}`;
      }
    }
    const calendar = new jsPDF({ unit: "pt", format: "a3", orientation: "landscape" });
    const calendarImages = vi.spyOn(calendar, "addImage");
    buildMonthCalendarPdf(calendar, fonts, null, { month, monthTitle: "agosto de 2026", meals, mealTypes: ["breakfast", "lunch", "snack", "dinner"], iconImages });
    for (const type of MEAL_TYPES) {
      expect(calendarImages.mock.calls.some((args) => (args as unknown[])[6] === `meal-${type.id}`)).toBe(true);
    }
    saveQaPdf(calendar, "menu-iconos-calendario");

    const weekly = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const weeklyImages = vi.spyOn(weekly, "addImage");
    buildMenuPdf(weekly, fonts, null, { title: "Menú", subtitle: "Todas las comidas", footer: "Menú", weeks: [weeks[1]], meals, mealTypes: ["breakfast", "lunch", "snack", "dinner"], iconImages });
    for (const type of MEAL_TYPES) {
      expect(weeklyImages.mock.calls.some((args) => (args as unknown[])[6] === `meal-${type.id}`)).toBe(true);
    }
    saveQaPdf(weekly, "menu-iconos-semana");
  });

  it("conserva los platos que no caben en el calendario en una página de detalle", () => {
    const doc = new jsPDF({ unit: "pt", format: "a3", orientation: "landscape" });
    const extra = Array.from({ length: 18 }, (_, index) => ({
      meal_date: "2026-08-03", meal_type: "lunch", title: `Plato adicional ${index + 1}`,
    }));
    buildMonthCalendarPdf(doc, fonts, null, {
      month, monthTitle: "agosto de 2026", meals: [...meals, ...extra], mealTypes: ["lunch"],
    });
    expect(doc.getNumberOfPages()).toBe(2);
    saveQaPdf(doc, "menu-desbordamiento");
  });

  it("conserva una semana muy llena en páginas de continuación", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const extra = Array.from({ length: 30 }, (_, index) => ({
      meal_date: "2026-08-03", meal_type: "lunch", title: `Comida extra ${index + 1}`,
    }));
    buildMenuPdf(doc, fonts, null, {
      title: "Menú de la semana", subtitle: "Comidas", footer: "Menú · Agosto de 2026",
      weeks: [weeks[1]], meals: [...meals, ...extra], mealTypes: ["lunch"],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    saveQaPdf(doc, "menu-semana-llena");
  });
});
