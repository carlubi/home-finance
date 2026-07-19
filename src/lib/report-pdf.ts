// Generación del PDF del informe IA con la identidad visual de la app:
// cabecera con logo y "Mis Finanzas", subtítulo con el periodo, secciones
// en violeta corporativo y paginación con pie de página.

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

function drawHeader(doc: jsPDF, subtitle: string, logo: string | null) {
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("Mis Finanzas", textX, 52);

  doc.setTextColor(...INK);
  doc.setFontSize(13);
  doc.text("Informe financiero", textX, 72);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, textX, 90);
}

function drawFooters(doc: jsPDF, subtitle: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND_SOFT);
    doc.setLineWidth(1);
    doc.line(MARGIN, FOOTER_Y - 10, PAGE_W - MARGIN, FOOTER_Y - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Mis Finanzas · ${subtitle}`, MARGIN, FOOTER_Y);
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }
}

/** Maquetación del markdown del informe (títulos ##, viñetas -, párrafos). */
function renderBody(doc: jsPDF, markdown: string) {
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
      ensureSpace(40);
      y += 14;
      doc.setFillColor(...BRAND);
      doc.rect(MARGIN, y - 9, 3.5, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(...BRAND);
      doc.text(clean(line.slice(3)), MARGIN + 10, y);
      y += 16;
      continue;
    }

    if (line.startsWith("- ")) {
      doc.setFont("helvetica", "normal");
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(clean(line), CONTENT_W);
    ensureSpace(wrapped.length * 14 + 6);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 14 + 6;
  }
}

/** Genera el documento (exportado aparte para poder probarlo en Node). */
export function buildReportPdf(
  doc: jsPDF,
  report: ReportLike,
  logo: string | null
) {
  const subtitle = formatMonthRange(report.month, report.end_month);
  drawHeader(doc, subtitle, logo);
  renderBody(doc, report.content_md);
  drawFooters(doc, subtitle);
  return doc;
}

/** Descarga el informe como PDF con la identidad de la app. */
export async function downloadReportPdf(report: ReportLike) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Logo (si falla la carga, el PDF sale sin él)
  let logo: string | null = null;
  try {
    const blob = await fetch("/icon.png?v=2").then((r) => r.blob());
    logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    logo = null;
  }

  buildReportPdf(doc, report, logo);

  const suffix =
    report.end_month && report.end_month !== report.month
      ? `${report.month.slice(0, 7)}_a_${report.end_month.slice(0, 7)}`
      : report.month.slice(0, 7);
  doc.save(`informe-${suffix}.pdf`);
}
