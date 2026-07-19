// Generación del PDF del informe IA con la identidad visual de la app:
// cabecera con logo y "Mis Finanzas", subtítulo con el periodo, secciones
// en violeta corporativo, tipografía Figtree y paginación con pie de página.
//
// La fuente se incrusta (TTF Unicode): la Helvetica "core" de jsPDF no tiene
// métricas para caracteres como € y rompe el espaciado de las líneas.

import type { jsPDF } from "jspdf";
import { formatMonthRange } from "@/lib/format";

// Colores corporativos (violeta de la marca + tintas)
const BRAND: [number, number, number] = [124, 58, 237]; // #7c3aed
const BRAND_SOFT: [number, number, number] = [243, 239, 252]; // banda lavanda
const INK: [number, number, number] = [43, 36, 64]; // texto principal
const MUTED: [number, number, number] = [110, 104, 130];

const PAGE_W = 595.28; // A4 en puntos
const PAGE_H = 841.89;
const MARGIN = 52;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 36;
const BOTTOM_LIMIT = FOOTER_Y - 24;

interface ReportLike {
  content_md: string;
  month: string;
  end_month?: string | null;
}

function drawHeader(doc: jsPDF, family: string, subtitle: string, logo: string | null) {
  doc.setFillColor(...BRAND_SOFT);
  doc.rect(0, 0, PAGE_W, 118, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 118, PAGE_W, 3, "F");

  const logoSize = 46;
  if (logo) {
    doc.addImage(logo, "PNG", MARGIN, 32, logoSize, logoSize);
  }
  const textX = MARGIN + (logo ? logoSize + 14 : 0);

  doc.setTextColor(...BRAND);
  doc.setFont(family, "bold");
  doc.setFontSize(21);
  doc.text("Mis Finanzas", textX, 52);

  doc.setTextColor(...INK);
  doc.setFontSize(13);
  doc.text("Informe financiero", textX, 72);

  doc.setFont(family, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, textX, 90);
}

function drawFooters(doc: jsPDF, family: string, subtitle: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND_SOFT);
    doc.setLineWidth(1);
    doc.line(MARGIN, FOOTER_Y - 10, PAGE_W - MARGIN, FOOTER_Y - 10);
    doc.setFont(family, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Mis Finanzas · ${subtitle}`, MARGIN, FOOTER_Y);
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }
}

/** Maquetación del markdown del informe (títulos ##, viñetas -, párrafos). */
function renderBody(doc: jsPDF, family: string, markdown: string) {
  let y = 150;

  const ensureSpace = (needed: number) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const clean = (text: string) => text.replace(/\*\*|__|\*|_/g, "").trim();

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("# ")) continue; // el título ya está en la cabecera

    if (line.startsWith("## ")) {
      // Espacio para el título + al menos dos líneas de contenido,
      // para no dejar títulos huérfanos al final de la página
      ensureSpace(72);
      y += 14;
      doc.setFillColor(...BRAND);
      doc.rect(MARGIN, y - 9, 3.5, 12, "F");
      doc.setFont(family, "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(...BRAND);
      doc.text(clean(line.slice(3)), MARGIN + 10, y);
      y += 16;
      continue;
    }

    if (line.startsWith("- ")) {
      doc.setFont(family, "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      const wrapped = doc.splitTextToSize(clean(line.slice(2)), CONTENT_W - 16);
      ensureSpace(wrapped.length * 14 + 4);
      doc.setFillColor(...BRAND);
      doc.circle(MARGIN + 4, y - 3.2, 1.8, "F");
      doc.text(wrapped, MARGIN + 14, y);
      y += wrapped.length * 14 + 3;
      continue;
    }

    // Párrafo normal
    doc.setFont(family, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(clean(line), CONTENT_W);
    ensureSpace(wrapped.length * 14 + 6);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 14 + 6;
  }
}

/**
 * Registra Figtree (regular y bold) en el documento a partir de sus TTF en
 * base64. Devuelve el nombre de familia a usar.
 */
export function registerFonts(
  doc: jsPDF,
  regularB64: string | null,
  boldB64: string | null
): string {
  if (!regularB64 || !boldB64) return "helvetica";
  try {
    doc.addFileToVFS("Figtree-Regular.ttf", regularB64);
    doc.addFont("Figtree-Regular.ttf", "Figtree", "normal");
    doc.addFileToVFS("Figtree-Bold.ttf", boldB64);
    doc.addFont("Figtree-Bold.ttf", "Figtree", "bold");
    return "Figtree";
  } catch {
    return "helvetica";
  }
}

/** Genera el documento (exportado aparte para poder probarlo en Node). */
export function buildReportPdf(
  doc: jsPDF,
  report: ReportLike,
  logo: string | null,
  family = "helvetica"
) {
  const subtitle = formatMonthRange(report.month, report.end_month);
  drawHeader(doc, family, subtitle, logo);
  renderBody(doc, family, report.content_md);
  drawFooters(doc, family, subtitle);
  return doc;
}

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const blob = await fetch(url).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return dataUrl.split(",")[1] ?? null;
  } catch {
    return null;
  }
}

/** Descarga el informe como PDF con la identidad de la app. */
export async function downloadReportPdf(report: ReportLike) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const [logoB64, regularB64, boldB64] = await Promise.all([
    fetchAsBase64("/icon.png?v=2"),
    fetchAsBase64("/fonts/figtree-regular.ttf"),
    fetchAsBase64("/fonts/figtree-bold.ttf"),
  ]);

  const family = registerFonts(doc, regularB64, boldB64);
  const logo = logoB64 ? `data:image/png;base64,${logoB64}` : null;

  buildReportPdf(doc, report, logo, family);

  const suffix =
    report.end_month && report.end_month !== report.month
      ? `${report.month.slice(0, 7)}_a_${report.end_month.slice(0, 7)}`
      : report.month.slice(0, 7);
  doc.save(`informe-${suffix}.pdf`);
}
