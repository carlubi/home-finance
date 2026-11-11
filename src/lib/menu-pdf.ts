// PDF del menú: semana concreta, mes por semanas o calendario mensual.

import type { jsPDF } from "jspdf";
import { MEAL_TYPES, mealLabel, mealPlural, sortMeals, type MealType } from "@/lib/meals";
import { MEAL_ICON_PATHS } from "@/lib/meal-icon-paths";
import { formatMonth } from "@/lib/format";
import { normalizeRecipeUrl } from "@/lib/menu-recipes";
import type { AppLanguage } from "@/lib/language";
import {
  PDF_COLORS,
  drawBrandFooters,
  drawBrandHeader,
  loadBrandAssets,
  type PdfFonts,
} from "@/lib/pdf-brand";

export type MenuPdfMeal = { meal_date: string; meal_type: string; title: string; source_url?: string | null };
export type MenuWeek = { id: string; label: string; days: (string | null)[] };
export type MenuPdfScope = { kind: "month" } | { kind: "week"; weekId: string };
export type MenuPdfLayout = "calendar" | "weeks";

const WEEKDAYS = { es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"], ca: ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"] };
const MONTHS_SHORT = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], ca: ["gen", "feb", "març", "abr", "maig", "juny", "jul", "ag", "set", "oct", "nov", "des"] };

type MealIconImages = Partial<Record<MealType, string>>;

async function createMealIconImages(): Promise<MealIconImages> {
  if (typeof document === "undefined") return {};
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudieron preparar los iconos del menú.");
  const images: MealIconImages = {};
  const color = `rgb(${PDF_COLORS.textSecondary.join(",")})`;
  for (const type of MEAL_TYPES) {
    const paths = MEAL_ICON_PATHS[type.id].map((path) => `<path d="${path}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo cargar un icono del menú."));
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    images[type.id] = canvas.toDataURL("image/png");
  }
  return images;
}

function drawMealIcon(doc: jsPDF, type: MealType, x: number, y: number, size: number, images: MealIconImages) {
  const image = images[type];
  if (image) doc.addImage(image, "PNG", x, y, size, size, `meal-${type}`);
  else {
    // En pruebas sin DOM, el nombre completo sigue identificando cada comida.
    doc.setFillColor(...PDF_COLORS.textSecondary);
    doc.circle(x + size / 2, y + size / 2, size / 4, "F");
  }
}

function linkMeal(doc: jsPDF, meal: MenuPdfMeal, x: number, y: number, width: number, height: number) {
  const url = normalizeRecipeUrl(meal.source_url ?? "");
  if (url) doc.link(x, y, width, height, { url });
}

export function linkedMenuMeals(meals: MenuPdfMeal[], mealTypes: MealType[], days: (string | null)[]) {
  const allowed = new Set(days.filter((day): day is string => !!day));
  return sortMeals(meals.filter((meal) => allowed.has(meal.meal_date) && mealTypes.includes(meal.meal_type as MealType) && normalizeRecipeUrl(meal.source_url ?? "")))
    .sort((a, b) => a.meal_date.localeCompare(b.meal_date) || MEAL_TYPES.findIndex((type) => type.id === a.meal_type) - MEAL_TYPES.findIndex((type) => type.id === b.meal_type));
}

function appendLinks(doc: jsPDF, fonts: PdfFonts, meals: MenuPdfMeal[], mealTypes: MealType[], days: (string | null)[], language: AppLanguage) {
  const links = linkedMenuMeals(meals, mealTypes, days);
  if (!links.length) return;
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = pageH;
  const addPage = () => {
    doc.addPage();
    y = drawBrandHeader(doc, fonts, { title: language === "ca" ? "Enllaços de receptes" : "Enlaces de recetas", subtitle: language === "ca" ? "Annex del menú" : "Anexo del menú", logo: null, margin });
  };
  for (const meal of links) {
    const url = normalizeRecipeUrl(meal.source_url ?? "")!;
    doc.setFont(fonts.family, fonts.medium);
    doc.setFontSize(9);
    const heading = `${meal.meal_date} · ${mealLabel(meal.meal_type, language)} · ${meal.title}`;
    const headingLines = doc.splitTextToSize(heading, pageW - margin * 2) as string[];
    doc.setFont(fonts.family, "normal");
    doc.setFontSize(8);
    const urlLines = doc.splitTextToSize(url, pageW - margin * 2) as string[];
    const blockH = headingLines.length * 12 + urlLines.length * 11 + 10;
    if (y + blockH > pageH - margin) addPage();
    doc.setFont(fonts.family, fonts.medium);
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    headingLines.forEach((line, index) => doc.text(line, margin, y + index * 12));
    y += headingLines.length * 12;
    doc.setFont(fonts.family, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.accent);
    urlLines.forEach((line, index) => doc.text(line, margin, y + index * 11));
    linkMeal(doc, meal, margin, y - 8, pageW - margin * 2, urlLines.length * 11);
    y += urlLines.length * 11 + 10;
  }
}

/** Espacio vertical entre dos platos de la misma celda. */
const MEAL_GAP = 9;

function cellHeight(entries: string[][], lineH = 11) {
  if (entries.length === 0) return 0;
  return entries.reduce((sum, lines) => sum + lines.length * lineH, 0) + (entries.length - 1) * MEAL_GAP;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function menuMonthTitle(monthTitle: string, language: AppLanguage) {
  const month = monthTitle.charAt(0).toLowerCase() + monthTitle.slice(1);
  return language === "ca" && /^[aeiouàèéíïòóúü]/i.test(month)
    ? `Menú d'${month}`
    : `Menú de ${month}`;
}

/**
 * Semanas (lunes a domingo) del mes «YYYY-MM». Los huecos de días de otro mes
 * son null: el PDF solo incluye los datos del mes cargado.
 */
export function monthWeeks(month: string, language: AppLanguage = "es"): MenuWeek[] {
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
    const monthLabel = MONTHS_SHORT[language][monthNumber - 1];
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
  mealTypes: typeof MEAL_TYPES[number][],
  { x, y, width, roomy, iconImages = {}, language = "es" }: { x: number; y: number; width: number; roomy: boolean; iconImages?: MealIconImages; language?: AppLanguage }
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
  const rows = mealTypes.map((type) => {
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
  doc.text(`${language === "ca" ? "Setmana" : "Semana"} ${index + 1} · ${week.label}`, x, y);
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
    doc.text(WEEKDAYS[language][i], cx + cellPad, top + 12.5);
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

    drawMealIcon(doc, row.type.id, x + cellPad, rowY + cellPad, 10, iconImages);
    doc.setFont(fonts.family, fonts.medium);
    doc.setFontSize(fontSize);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(mealLabel(row.type.id, language), x + cellPad + 13, rowY + cellPad + 7.5);

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
        const meal = (meals.get(week.days[i]!) ?? []).filter((item) => item.meal_type === row.type.id)[e];
        if (meal) linkMeal(doc, meal, cx + cellPad, ty - fontSize, dayW - cellPad * 2, lines.length * lineH);
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
function measureWeek(doc: jsPDF, fonts: PdfFonts, week: MenuWeek, meals: Map<string, MenuPdfMeal[]>, mealTypes: typeof MEAL_TYPES[number][], width: number, roomy: boolean) {
  const dayW = (width - 82) / 7;
  const lineH = roomy ? 12.5 : 11;
  doc.setFont(fonts.family, "normal");
  doc.setFontSize(roomy ? 9.5 : 8.5);
  const height = mealTypes.reduce((sum, type) => {
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

/** Una semana excepcionalmente llena sigue siendo legible y conserva todos los platos. */
function drawWeekAsList(
  doc: jsPDF,
  fonts: PdfFonts,
  week: MenuWeek,
  meals: Map<string, MenuPdfMeal[]>,
  mealTypes: typeof MEAL_TYPES[number][],
  startY: number,
  { title, subtitle, logo, margin, iconImages = {}, language = "es" }: { title: string; subtitle: string; logo: string | null; margin: number; iconImages?: MealIconImages; language?: AppLanguage }
) {
  const pageH = doc.internal.pageSize.getHeight();
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = startY;
  const nextPage = () => {
    doc.addPage();
    y = drawBrandHeader(doc, fonts, { title, subtitle, logo, margin });
  };
  doc.setFont(fonts.family, fonts.medium);
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text(`${language === "ca" ? "Setmana" : "Semana"} · ${week.label}`, margin, y);
  y += 19;
  week.days.forEach((day, index) => {
    if (!day) return;
    if (y + 36 > pageH - margin) nextPage();
    doc.setFont(fonts.family, fonts.semibold);
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`${WEEKDAYS[language][index]} ${Number(day.slice(8))}`, margin, y);
    y += 16;
    for (const type of mealTypes) {
      const entries = (meals.get(day) ?? []).filter((meal) => meal.meal_type === type.id);
      for (const meal of entries) {
        doc.setFont(fonts.family, "normal");
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(meal.title, width - 105) as string[];
        if (y + lines.length * 12 + 8 > pageH - margin) {
          nextPage();
          doc.setFont(fonts.family, fonts.semibold);
          doc.setFontSize(11);
          doc.setTextColor(...PDF_COLORS.text);
          doc.text(`${WEEKDAYS[language][index]} ${Number(day.slice(8))} (${language === "ca" ? "continuació" : "continuación"})`, margin, y);
          y += 17;
        }
        drawMealIcon(doc, type.id, margin + 8, y - 9, 11, iconImages);
        doc.setFont(fonts.family, fonts.medium);
        doc.setTextColor(...PDF_COLORS.text);
        doc.text(mealLabel(type.id, language), margin + 24, y);
        doc.setFont(fonts.family, "normal");
        doc.setTextColor(...PDF_COLORS.text);
        lines.forEach((line, lineIndex) => doc.text(line, margin + 100, y + lineIndex * 12));
        linkMeal(doc, meal, margin + 100, y - 10, width - 105, lines.length * 12);
        y += lines.length * 12 + 6;
      }
    }
    y += 10;
  });
  return y;
}

export function buildMenuPdf(
  doc: jsPDF,
  fonts: PdfFonts,
  logo: string | null,
  { title, subtitle, footer, weeks, meals, mealTypes, separateWeeks = false, startIndex = 0, iconImages = {}, language = "es" }: { title: string; subtitle: string; footer: string; weeks: MenuWeek[]; meals: MenuPdfMeal[]; mealTypes: MealType[]; separateWeeks?: boolean; startIndex?: number; iconImages?: MealIconImages; language?: AppLanguage }
) {
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - margin * 2;
  const roomy = separateWeeks || weeks.length === 1;
  const selectedTypes = MEAL_TYPES.filter((type) => mealTypes.includes(type.id));

  const byDay = new Map<string, MenuPdfMeal[]>();
  for (const meal of meals) byDay.set(meal.meal_date, [...(byDay.get(meal.meal_date) ?? []), meal]);
  for (const [day, dayMeals] of byDay) byDay.set(day, sortMeals(dayMeals));

  let y = drawBrandHeader(doc, fonts, { title, subtitle, logo, margin });
  weeks.forEach((week, index) => {
    const needed = measureWeek(doc, fonts, week, byDay, selectedTypes, width, roomy) + 14;
    if (index > 0 && (separateWeeks || y + needed > pageH - margin - 10)) {
      doc.addPage();
      y = separateWeeks ? drawBrandHeader(doc, fonts, { title, subtitle, logo, margin }) : margin + 6;
    }
    if (y + needed > pageH - margin - 10) {
      y = drawWeekAsList(doc, fonts, week, byDay, selectedTypes, y, { title, subtitle, logo, margin, iconImages, language }) + 18;
    } else {
      const { height } = drawWeek(doc, fonts, week, startIndex + index, byDay, selectedTypes, { x: margin, y, width, roomy, iconImages, language });
      y += height + 18;
    }
  });

  appendLinks(doc, fonts, meals, mealTypes, weeks.flatMap((week) => week.days), language);
  drawBrandFooters(doc, fonts, footer, margin);
  return doc;
}

/** Calendario mensual en una página A3; los días muy llenos llevan detalle aparte. */
export function buildMonthCalendarPdf(
  doc: jsPDF,
  fonts: PdfFonts,
  logo: string | null,
  { month, monthTitle, meals, mealTypes, iconImages = {}, language = "es" }: { month: string; monthTitle: string; meals: MenuPdfMeal[]; mealTypes: MealType[]; iconImages?: MealIconImages; language?: AppLanguage }
) {
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - margin * 2;
  const weeks = monthWeeks(month, language);
  const selectedTypes = MEAL_TYPES.filter((type) => mealTypes.includes(type.id));
  const byDay = new Map<string, MenuPdfMeal[]>();
  for (const meal of meals) byDay.set(meal.meal_date, [...(byDay.get(meal.meal_date) ?? []), meal]);
  for (const [day, dayMeals] of byDay) byDay.set(day, sortMeals(dayMeals));
  const capitalized = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);
  const subtitle = selectedTypes.map((type) => mealPlural(type.id, language)).join(" · ");
  const top = drawBrandHeader(doc, fonts, { title: menuMonthTitle(monthTitle, language), subtitle, logo, margin });
  const headH = 26;
  const bottom = pageH - margin - 8;
  const rowH = (bottom - top - headH) / weeks.length;
  const dayW = width / 7;
  const overflowDays: string[] = [];

  doc.setFillColor(...PDF_COLORS.subtle);
  doc.rect(margin, top, width, headH, "F");
  doc.setFont(fonts.family, fonts.medium);
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  WEEKDAYS[language].forEach((weekday, index) => doc.text(weekday, margin + index * dayW + 8, top + 17));

  weeks.forEach((week, weekIndex) => {
    const rowTop = top + headH + weekIndex * rowH;
    week.days.forEach((day, dayIndex) => {
      const x = margin + dayIndex * dayW;
      if (!day) {
        doc.setFillColor(...PDF_COLORS.subtle);
        doc.rect(x, rowTop, dayW, rowH, "F");
        return;
      }
      doc.setFont(fonts.family, fonts.semibold);
      doc.setFontSize(10);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(String(Number(day.slice(8))), x + 8, rowTop + 15);

      const entries = (byDay.get(day) ?? []).filter((meal) => mealTypes.includes(meal.meal_type as MealType));
      let entryY = rowTop + 25;
      for (let index = 0; index < entries.length; index++) {
        const meal = entries[index];
        const type = selectedTypes.find((item) => item.id === meal.meal_type)!;
        doc.setFont(fonts.family, "normal");
        doc.setFontSize(7.6);
        const lines = doc.splitTextToSize(`${mealLabel(type.id, language)} · ${meal.title}`, dayW - 32) as string[];
        const entryH = Math.max(1, lines.length) * 8.8 + 3;
        if (entryY + entryH > rowTop + rowH - 16) {
          overflowDays.push(day);
          doc.setFont(fonts.family, fonts.medium);
          doc.setFontSize(7.5);
          doc.setTextColor(...PDF_COLORS.accent);
          doc.text(`+${entries.length - index} ${language === "ca" ? "al detall" : "en detalle"}`, x + 8, rowTop + rowH - 7);
          break;
        }
        drawMealIcon(doc, type.id, x + 8, entryY - 8, 11, iconImages);
        doc.setFont(fonts.family, "normal");
        doc.setFontSize(7.6);
        doc.setTextColor(...PDF_COLORS.text);
        lines.forEach((line, lineIndex) => doc.text(line, x + 24, entryY + lineIndex * 8.8));
        linkMeal(doc, meal, x + 24, entryY - 8, dayW - 32, lines.length * 8.8);
        entryY += entryH;
      }
    });
  });

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.6);
  doc.rect(margin, top, width, bottom - top, "S");
  for (let day = 1; day < 7; day++) {
    const x = margin + day * dayW;
    doc.line(x, top, x, bottom);
  }
  doc.line(margin, top + headH, margin + width, top + headH);
  for (let week = 1; week < weeks.length; week++) {
    const y = top + headH + week * rowH;
    doc.line(margin, y, margin + width, y);
  }

  if (overflowDays.length) {
    doc.addPage();
    let y = drawBrandHeader(doc, fonts, {
      title: language === "ca" ? "Detall dels dies plens" : "Detalle de días completos", subtitle: capitalized, logo, margin,
    });
    for (const day of overflowDays) {
      const entries = (byDay.get(day) ?? []).filter((meal) => mealTypes.includes(meal.meal_type as MealType));
      if (y + 38 > pageH - margin) {
        doc.addPage();
        y = drawBrandHeader(doc, fonts, { title: language === "ca" ? "Detall dels dies plens" : "Detalle de días completos", subtitle: capitalized, logo, margin });
      }
      const dateLabel = new Intl.DateTimeFormat(language === "ca" ? "ca-ES" : "es-ES", { weekday: "long", day: "numeric", month: "long" })
        .format(new Date(`${day}T12:00:00`));
      doc.setFont(fonts.family, fonts.semibold);
      doc.setFontSize(12);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), margin, y);
      y += 18;
      for (const meal of entries) {
        const type = selectedTypes.find((item) => item.id === meal.meal_type)!;
        doc.setFont(fonts.family, "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(meal.title, width - 110) as string[];
        if (y + lines.length * 13 + 12 > pageH - margin) {
          doc.addPage();
          y = drawBrandHeader(doc, fonts, { title: language === "ca" ? "Detall dels dies plens" : "Detalle de días completos", subtitle: capitalized, logo, margin });
          doc.setFont(fonts.family, fonts.semibold);
          doc.setFontSize(11);
          doc.setTextColor(...PDF_COLORS.text);
          doc.text(`${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} (${language === "ca" ? "continuació" : "continuación"})`, margin, y);
          y += 18;
        }
        drawMealIcon(doc, type.id, margin + 2, y - 10, 12, iconImages);
        doc.setFont(fonts.family, fonts.medium);
        doc.setTextColor(...PDF_COLORS.text);
        doc.text(mealLabel(type.id, language), margin + 18, y);
        doc.setFont(fonts.family, "normal");
        doc.setTextColor(...PDF_COLORS.text);
        lines.forEach((line, lineIndex) => doc.text(line, margin + 100, y + lineIndex * 13));
        linkMeal(doc, meal, margin + 100, y - 10, width - 110, lines.length * 13);
        y += lines.length * 13 + 7;
      }
      y += 15;
    }
  }

  appendLinks(doc, fonts, meals, mealTypes, weeks.flatMap((week) => week.days), language);
  drawBrandFooters(doc, fonts, `Menú · ${capitalized}`, margin);
  return doc;
}

/** Genera y descarga el PDF en el navegador. */
export async function downloadMenuPdf({
  month,
  scope,
  meals,
  layout,
  mealTypes,
  language = "es",
}: {
  month: string;
  scope: MenuPdfScope;
  meals: MenuPdfMeal[];
  layout: MenuPdfLayout;
  mealTypes: MealType[];
  language?: AppLanguage;
}) {
  if (mealTypes.length === 0) throw new Error("Selecciona al menos un tipo de comida.");
  const { jsPDF } = await import("jspdf");
  const calendar = scope.kind === "month" && layout === "calendar";
  const doc = new jsPDF({ unit: "pt", format: calendar ? "a3" : "a4", orientation: "landscape" });
  const { fonts, logo } = await loadBrandAssets(doc);

  const allWeeks = monthWeeks(month, language);
  const weekIndex = scope.kind === "week" ? allWeeks.findIndex((week) => week.id === scope.weekId) : -1;
  if (scope.kind === "week" && weekIndex < 0) throw new Error("Semana no válida.");
  const weeks = scope.kind === "week" && weekIndex >= 0 ? [allWeeks[weekIndex]] : allWeeks;
  const localizedMonthTitle = formatMonth(`${month}-01`, language);
  const capitalized = localizedMonthTitle.charAt(0).toUpperCase() + localizedMonthTitle.slice(1);
  const isWeek = weeks.length === 1 && scope.kind === "week";
  const includedMeals = meals.filter((meal) => mealTypes.includes(meal.meal_type as MealType));
  const subtitle = MEAL_TYPES.filter((type) => mealTypes.includes(type.id)).map((type) => mealPlural(type.id, language)).join(" · ");
  const iconImages = await createMealIconImages();

  if (calendar) {
    buildMonthCalendarPdf(doc, fonts, logo, { month, monthTitle: localizedMonthTitle, meals: includedMeals, mealTypes, iconImages, language });
  } else {
    buildMenuPdf(doc, fonts, logo, {
      title: isWeek ? (language === "ca" ? "Menú de la setmana" : "Menú de la semana") : menuMonthTitle(localizedMonthTitle, language),
      subtitle: isWeek ? `${weeks[0].label} · ${subtitle}` : subtitle,
      footer: isWeek ? `Menú · ${weeks[0].label} · ${capitalized}` : `Menú · ${capitalized}`,
      weeks,
      meals: includedMeals,
      mealTypes,
      separateWeeks: scope.kind === "month",
      startIndex: isWeek ? weekIndex : 0,
      iconImages,
      language,
    });
  }

  const suffix = isWeek
    ? `${language === "ca" ? "setmana" : "semana"}-${weeks[0].id}`
    : `${month}-${layout === "calendar" ? (language === "ca" ? "calendari" : "calendario") : (language === "ca" ? "setmanes" : "semanas")}`;
  doc.save(`menu-${suffix}.pdf`);
}
