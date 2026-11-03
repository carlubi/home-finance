// PDF del menú (semana concreta o mes completo) con el diseño de la app:
// tabla por semana — días en columnas, tipos de comida en filas y siempre
// en el orden desayuno → comida → merienda → cena.

import type { jsPDF } from "jspdf";
import { MEAL_TYPES, sortMeals } from "@/lib/meals";
import {
  PDF_COLORS,
  drawBrandFooters,
  drawBrandHeader,
  loadBrandAssets,
  type PdfFonts,
} from "@/lib/pdf-brand";

export type MenuPdfMeal = { meal_date: string; meal_type: string; title: string };
export type MenuWeek = { id: string; label: string; days: (string | null)[] };
export type MenuPdfScope = { kind: "month" } | { kind: "week"; weekId: string };

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const MEAL_DOT = {
  breakfast: PDF_COLORS.status.yellow,
  lunch: PDF_COLORS.status.orange,
  snack: PDF_COLORS.status.green,
  dinner: PDF_COLORS.status.blue,
} as const;

/** Espacio vertical entre dos platos de la misma celda. */
const MEAL_GAP = 9;

function cellHeight(entries: string[][], lineH = 11) {
  if (entries.length === 0) return 0;
  return entries.reduce((sum, lines) => sum + lines.length * lineH, 0) + (entries.length - 1) * MEAL_GAP;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Semanas (lunes a domingo) del mes «YYYY-MM». Los huecos de días de otro mes
 * son null: el PDF solo incluye los datos del mes cargado.
 */
export function monthWeeks(month: string): MenuWeek[] {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(monthNumber)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  const weeks: MenuWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const days = cells.slice(i, i + 7);
    const present = days.filter((day): day is string => day !== null);
    const first = Number(present[0].slice(8));
    const last = Number(present[present.length - 1].slice(8));
    const monthLabel = MONTHS_SHORT[monthNumber - 1];
    weeks.push({
      id: present[0],
      label: first === last ? `${first} ${monthLabel}` : `${first}–${last} ${monthLabel}`,
      days,
    });
  }
  return weeks;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function drawWeek(
  doc: jsPDF,
  fonts: PdfFonts,
  week: MenuWeek,
  index: number,
  meals: Map<string, MenuPdfMeal[]>,
  { x, y, width, roomy }: { x: number; y: number; width: number; roomy: boolean }
) {
  const labelW = 82;
  const dayW = (width - labelW) / 7;
  const headH = 30;
  const cellPad = 7;
  const lineH = roomy ? 12.5 : 11;
  const fontSize = roomy ? 9.5 : 8.5;
  const minRowH = roomy ? 64 : 34;
  const today = todayKey();

  // Altura de cada fila según el contenido más largo de la semana.
  doc.setFont(fonts.family, "normal");
  doc.setFontSize(fontSize);
  const rows = MEAL_TYPES.map((type) => {
    const cells = week.days.map((day) => {
      if (!day) return [] as string[][];
      const entries = (meals.get(day) ?? []).filter((meal) => meal.meal_type === type.id);
      return entries.map((meal) => doc.splitTextToSize(meal.title, dayW - cellPad * 2) as string[]);
    });
    const contentH = Math.max(lineH, ...cells.map((entries) => cellHeight(entries, lineH)));
    return { type, cells, height: Math.max(minRowH, contentH + cellPad * 2) };
  });
  const blockH = headH + rows.reduce((sum, row) => sum + row.height, 0);

  // Título de la semana
  doc.setFont(fonts.family, fonts.medium);
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text(`Semana ${index + 1} · ${week.label}`, x, y);
  const top = y + 8;

  // Marco y cabecera
  doc.setFillColor(...PDF_COLORS.subtle);
  doc.roundedRect(x, top, width, headH, 6, 6, "F");
  doc.rect(x, top + headH - 6, width, 6, "F");
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, top, width, blockH, 6, 6, "S");

  week.days.forEach((day, i) => {
    const cx = x + labelW + dayW * i;
    const isToday = day === today;
    doc.setFont(fonts.family, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...(isToday ? PDF_COLORS.accent : PDF_COLORS.textTertiary));
    doc.text(WEEKDAYS[i], cx + cellPad, top + 12.5);
    if (!day) {
      doc.setFillColor(...PDF_COLORS.surface);
      doc.rect(cx + 0.4, top + headH, dayW - 0.8, blockH - headH - 0.8, "F");
      return;
    }
    doc.setFont(fonts.family, fonts.semibold);
    doc.setFontSize(10);
    doc.setTextColor(...(isToday ? PDF_COLORS.accent : PDF_COLORS.text));
    doc.text(String(Number(day.slice(8))), cx + cellPad, top + 24);
  });

  // Filas
  let rowY = top + headH;
  rows.forEach((row) => {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(x, rowY, x + width, rowY);

    doc.setFillColor(...MEAL_DOT[row.type.id]);
    doc.circle(x + cellPad + 2.5, rowY + cellPad + 4.5, 2.5, "F");
    doc.setFont(fonts.family, fonts.medium);
    doc.setFontSize(fontSize);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(row.type.label, x + cellPad + 9, rowY + cellPad + 7.5);

    row.cells.forEach((entries, i) => {
      const cx = x + labelW + dayW * i;
      if (!week.days[i]) return;
      doc.setFont(fonts.family, "normal");
      doc.setFontSize(fontSize);
      if (entries.length === 0) {
        doc.setTextColor(...PDF_COLORS.textTertiary);
        doc.text("—", cx + cellPad, rowY + cellPad + 7.5);
        return;
      }
      let ty = rowY + cellPad + 7.5;
      entries.forEach((lines, e) => {
        if (e > 0) {
          // Separador fino entre platos de la misma celda
          doc.setDrawColor(...PDF_COLORS.border);
          doc.setLineWidth(0.5);
          const sepY = ty - (MEAL_GAP + lineH + 5) / 2;
          doc.line(cx + cellPad, sepY, cx + dayW - cellPad, sepY);
        }
        doc.setTextColor(...PDF_COLORS.text);
        lines.forEach((line) => {
          doc.text(line, cx + cellPad, ty);
          ty += lineH;
        });
        ty += MEAL_GAP;
      });
    });
    rowY += row.height;
  });

  // Separadores verticales
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.5);
  for (let i = 0; i < 7; i++) {
    const vx = x + labelW + dayW * i;
    doc.line(vx, top + (i === 0 ? 0 : headH * 0.25), vx, top + blockH);
  }

  return { height: blockH + 8 };
}

/** Mide una semana sin dibujar (para decidir saltos de página). */
function measureWeek(doc: jsPDF, fonts: PdfFonts, week: MenuWeek, meals: Map<string, MenuPdfMeal[]>, width: number, roomy: boolean) {
  const dayW = (width - 82) / 7;
  const lineH = roomy ? 12.5 : 11;
  doc.setFont(fonts.family, "normal");
  doc.setFontSize(roomy ? 9.5 : 8.5);
  const height = MEAL_TYPES.reduce((sum, type) => {
    const contentH = Math.max(
      lineH,
      ...week.days.map((day) =>
        day
          ? cellHeight(
              (meals.get(day) ?? [])
                .filter((meal) => meal.meal_type === type.id)
                .map((meal) => doc.splitTextToSize(meal.title, dayW - 14) as string[]),
              lineH
            )
          : 0
      )
    );
    return sum + Math.max(roomy ? 64 : 34, contentH + 14);
  }, 30);
  return height + 8;
}

export function buildMenuPdf(
  doc: jsPDF,
  fonts: PdfFonts,
  logo: string | null,
  { title, subtitle, footer, weeks, meals, startIndex = 0 }: { title: string; subtitle: string; footer: string; weeks: MenuWeek[]; meals: MenuPdfMeal[]; startIndex?: number }
) {
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - margin * 2;
  const roomy = weeks.length === 1;

  const byDay = new Map<string, MenuPdfMeal[]>();
  for (const meal of meals) byDay.set(meal.meal_date, [...(byDay.get(meal.meal_date) ?? []), meal]);
  for (const [day, dayMeals] of byDay) byDay.set(day, sortMeals(dayMeals));

  let y = drawBrandHeader(doc, fonts, { title, subtitle, logo, margin });
  weeks.forEach((week, index) => {
    const needed = measureWeek(doc, fonts, week, byDay, width, roomy) + 14;
    if (index > 0 && y + needed > pageH - margin - 10) {
      doc.addPage();
      y = margin + 6;
    }
    const { height } = drawWeek(doc, fonts, week, startIndex + index, byDay, { x: margin, y, width, roomy });
    y += height + 18;
  });

  drawBrandFooters(doc, fonts, footer, margin);
  return doc;
}

/** Genera y descarga el PDF en el navegador. */
export async function downloadMenuPdf({
  month,
  monthTitle,
  scope,
  meals,
}: {
  month: string;
  monthTitle: string;
  scope: MenuPdfScope;
  meals: MenuPdfMeal[];
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const { fonts, logo } = await loadBrandAssets(doc);

  const allWeeks = monthWeeks(month);
  const weekIndex = scope.kind === "week" ? allWeeks.findIndex((week) => week.id === scope.weekId) : -1;
  const weeks = scope.kind === "week" && weekIndex >= 0 ? [allWeeks[weekIndex]] : allWeeks;
  const capitalized = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);
  const isWeek = weeks.length === 1 && scope.kind === "week";

  buildMenuPdf(doc, fonts, logo, {
    title: isWeek ? `Menú de la semana` : `Menú de ${monthTitle}`,
    subtitle: isWeek ? `${weeks[0].label} · ${capitalized}` : "Desayunos, comidas, meriendas y cenas del mes",
    footer: isWeek ? `Menú · ${weeks[0].label}` : `Menú · ${capitalized}`,
    weeks,
    meals,
    startIndex: isWeek ? weekIndex : 0,
  });

  const suffix = isWeek ? `semana-${weeks[0].id}` : month;
  doc.save(`menu-${suffix}.pdf`);
}
