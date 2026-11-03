// PDF del informe IA con la identidad visual de la app (lib/pdf-brand):
// cabecera sobria, Inter incrustada, títulos de sección en texto primario
// con una marca lila pequeña y paginación en el pie.

import type { jsPDF } from "jspdf";
import { formatMonthRange } from "@/lib/format";
import {
  PDF_COLORS,
  drawBrandFooters,
  drawBrandHeader,
  loadBrandAssets,
  type PdfFonts,
} from "@/lib/pdf-brand";

const MARGIN = 52;

interface ReportLike {
  content_md: string;
  month: string;
  end_month?: string | null;
}

/** Maquetación del markdown del informe (títulos ##, viñetas -, párrafos). */
function renderBody(doc: jsPDF, fonts: PdfFonts, markdown: string, startY: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const bottom = pageH - MARGIN - 12;
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottom) {
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
      // Título + al menos dos líneas, para no dejar títulos huérfanos
      ensureSpace(72);
      y += 12;
      doc.setFillColor(...PDF_COLORS.accent);
      doc.circle(MARGIN + 2.5, y - 3.8, 2.5, "F");
      doc.setFont(fonts.family, fonts.semibold);
      doc.setFontSize(12.5);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(clean(line.slice(3)), MARGIN + 11, y);
      y += 18;
      continue;
    }

    if (line.startsWith("- ")) {
      doc.setFont(fonts.family, "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...PDF_COLORS.text);
      const wrapped = doc.splitTextToSize(clean(line.slice(2)), contentW - 16);
      ensureSpace(wrapped.length * 15 + 4);
      doc.setFillColor(...PDF_COLORS.textTertiary);
      doc.circle(MARGIN + 4, y - 3.4, 1.5, "F");
      doc.text(wrapped, MARGIN + 14, y);
      y += wrapped.length * 15 + 3;
      continue;
    }

    doc.setFont(fonts.family, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_COLORS.text);
    const wrapped = doc.splitTextToSize(clean(line), contentW);
    ensureSpace(wrapped.length * 15 + 6);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 15 + 7;
  }
}

/** Genera el documento (separado de la descarga para poder probarlo en Node). */
export function buildReportPdf(doc: jsPDF, report: ReportLike, logo: string | null, fonts: PdfFonts) {
  const subtitle = formatMonthRange(report.month, report.end_month);
  const startY = drawBrandHeader(doc, fonts, { title: "Informe financiero", subtitle, logo, margin: MARGIN });
  renderBody(doc, fonts, report.content_md, startY + 4);
  drawBrandFooters(doc, fonts, `Informe · ${subtitle}`, MARGIN);
  return doc;
}

/** Descarga el informe como PDF con la identidad de la app. */
export async function downloadReportPdf(report: ReportLike) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const { fonts, logo } = await loadBrandAssets(doc);

  buildReportPdf(doc, report, logo, fonts);

  const suffix =
    report.end_month && report.end_month !== report.month
      ? `${report.month.slice(0, 7)}_a_${report.end_month.slice(0, 7)}`
      : report.month.slice(0, 7);
  doc.save(`informe-${suffix}.pdf`);
}
