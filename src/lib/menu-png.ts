import { formatMonth } from "@/lib/format";
import type { AppLanguage } from "@/lib/language";
import { MEAL_TYPES, mealLabel, sortMeals, type MealType } from "@/lib/meals";
import { normalizeRecipeUrl } from "@/lib/menu-recipes";
import { loadDarkBrandIcon } from "@/lib/pdf-brand";
import { monthWeeks, type MenuPdfLayout, type MenuPdfMeal, type MenuPdfScope } from "@/lib/menu-pdf";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function fitLines(ctx: CanvasRenderingContext2D, value: string, width: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (ctx.measureText(word).width > width) {
      if (line) { lines.push(line); line = ""; }
      let part = "";
      for (const character of word) {
        if (ctx.measureText(part + character).width > width && part) { lines.push(part); part = ""; }
        part += character;
      }
      line = part;
      continue;
    }
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function downloadMenuPng({ month, scope, meals, layout, mealTypes, language = "es" }: {
  month: string; scope: MenuPdfScope; meals: MenuPdfMeal[]; layout: MenuPdfLayout; mealTypes: MealType[]; language?: AppLanguage;
}) {
  if (!mealTypes.length) throw new Error("Selecciona al menos un tipo de comida.");
  const allWeeks = monthWeeks(month, language);
  const weeks = scope.kind === "week" ? allWeeks.filter((week) => week.id === scope.weekId) : allWeeks;
  if (!weeks.length) throw new Error("Semana no válida.");
  const calendar = scope.kind === "month" && layout === "calendar";
  const width = 1600;
  const margin = 56;
  const gap = 12;
  const cellWidth = (width - margin * 2 - gap * 6) / 7;
  const top = 180;
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) throw new Error("No se pudo generar la imagen.");
  measure.font = "14px Inter, sans-serif";
  const filtered = sortMeals(meals.filter((meal) => mealTypes.includes(meal.meal_type as MealType)));
  const visibleDays = new Set(weeks.flatMap((week) => week.days.filter((day): day is string => !!day)));
  const links = filtered.filter((meal) => visibleDays.has(meal.meal_date) && normalizeRecipeUrl(meal.source_url ?? ""))
    .sort((a, b) => a.meal_date.localeCompare(b.meal_date) || MEAL_TYPES.findIndex((type) => type.id === a.meal_type) - MEAL_TYPES.findIndex((type) => type.id === b.meal_type));
  measure.font = "14px Inter, sans-serif";
  const annexHeight = links.length ? 75 + links.reduce((sum, meal) => sum + 30 + fitLines(measure, normalizeRecipeUrl(meal.source_url ?? "")!, width - margin * 2).length * 19, 0) : 0;
  const dayHeight = (day: string) => 75 + filtered.filter((meal) => meal.meal_date === day).reduce((sum, meal) => sum + 27 + fitLines(measure, meal.title, cellWidth - 30).length * 18, 0);
  const rowHeights = weeks.map((week) => Math.max(calendar ? 210 : 280, ...week.days.filter((day): day is string => !!day).map(dayHeight)) + (calendar ? 0 : 36));
  const height = top + rowHeights.reduce((sum, rowHeight) => sum + rowHeight + gap, 0) + annexHeight + 90;
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo generar la imagen.");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f8f8fa";
  ctx.fillRect(0, 0, width, height);
  const brand = new Image();
  brand.src = await loadDarkBrandIcon();
  await brand.decode();
  ctx.drawImage(brand, margin, 40, 34, 34);
  ctx.fillStyle = "#52525b";
  ctx.font = "600 18px Inter, sans-serif";
  ctx.fillText("Home Brain", margin + 48, 64);
  const monthTitle = formatMonth(`${month}-01`, language);
  ctx.fillStyle = "#18181b";
  ctx.font = "600 34px Inter, sans-serif";
  ctx.fillText(`${language === "ca" ? "Menú de" : "Menú de"} ${monthTitle}`, margin, 120);
  ctx.fillStyle = "#71717a";
  ctx.font = "16px Inter, sans-serif";
  const selected = MEAL_TYPES.filter((type) => mealTypes.includes(type.id)).map((type) => type.label).join(" · ");
  ctx.fillText(`${scope.kind === "week" ? weeks[0].label + " · " : ""}${selected}`, margin, 150);
  const weekdays = language === "ca" ? ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"] : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  let y = top;
  weeks.forEach((week, weekIndex) => {
    const rowHeight = rowHeights[weekIndex];
    if (!calendar) {
      ctx.fillStyle = "#52525b";
      ctx.font = "600 17px Inter, sans-serif";
      ctx.fillText(`${language === "ca" ? "Setmana" : "Semana"} ${weekIndex + 1} · ${week.label}`, margin, y + 18);
    }
    const rowY = y + (calendar ? 0 : 36);
    week.days.forEach((day, dayIndex) => {
      const x = margin + dayIndex * (cellWidth + gap);
      roundedRect(ctx, x, rowY, cellWidth, rowHeight - (calendar ? 0 : 36), day ? "#ffffff" : "#eeeeF1");
      if (!day) return;
      ctx.fillStyle = "#71717a";
      ctx.font = "500 14px Inter, sans-serif";
      ctx.fillText(weekdays[dayIndex], x + 15, rowY + 25);
      ctx.fillStyle = "#18181b";
      ctx.font = "600 21px Inter, sans-serif";
      ctx.fillText(String(Number(day.slice(8))), x + 15, rowY + 53);
      let textY = rowY + 79;
      for (const meal of filtered.filter((item) => item.meal_date === day)) {
        ctx.fillStyle = "#71717a";
        ctx.font = "600 12px Inter, sans-serif";
        ctx.fillText(mealLabel(meal.meal_type as MealType, language), x + 15, textY);
        textY += 18;
        ctx.fillStyle = "#27272a";
        ctx.font = "14px Inter, sans-serif";
        for (const line of fitLines(ctx, meal.title, cellWidth - 30)) {
          ctx.fillText(line, x + 15, textY);
          textY += 18;
        }
        textY += 9;
      }
    });
    y += rowHeight + gap;
  });
  if (links.length) {
    y += 25;
    ctx.fillStyle = "#18181b";
    ctx.font = "600 23px Inter, sans-serif";
    ctx.fillText(language === "ca" ? "Enllaços de receptes" : "Enlaces de recetas", margin, y);
    y += 30;
    for (const meal of links) {
      ctx.fillStyle = "#27272a";
      ctx.font = "600 14px Inter, sans-serif";
      ctx.fillText(`${meal.meal_date} · ${mealLabel(meal.meal_type, language)} · ${meal.title}`, margin, y);
      y += 19;
      ctx.fillStyle = "#4f46a5";
      ctx.font = "14px Inter, sans-serif";
      for (const line of fitLines(ctx, normalizeRecipeUrl(meal.source_url ?? "")!, width - margin * 2)) { ctx.fillText(line, margin, y); y += 19; }
      y += 11;
    }
  }
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "13px Inter, sans-serif";
  ctx.fillText(`Home Brain · ${monthTitle}`, margin, height - 35);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo crear el PNG.")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `menu-${scope.kind === "week" ? `semana-${weeks[0].id}` : `${month}-${layout === "calendar" ? "calendario" : "semanas"}`}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
