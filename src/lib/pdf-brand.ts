// Identidad visual de los PDF: la misma que la app en tema claro
// (tokens de src/lib/design-system/tokens/colors.ts) con Inter incrustada.
// La Helvetica «core» de jsPDF no tiene métricas para € y rompe el espaciado,
// por eso se incrustan los TTF de /public/fonts.

import type { jsPDF } from "jspdf";
import { colors } from "@/lib/design-system/tokens/colors";

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as RGB;
}

const light = colors.light;

export const PDF_COLORS = {
  page: hexToRgb(light.backgrounds.secondary),
  surface: hexToRgb(light.backgrounds.primary),
  subtle: hexToRgb(light.backgrounds.tertiary),
  border: [230, 230, 233] as RGB, // border-primary (8 % negro) sobre blanco
  borderStrong: [214, 214, 219] as RGB,
  text: hexToRgb(light.text.primary),
  textSecondary: hexToRgb(light.text.secondary),
  textTertiary: hexToRgb(light.text.tertiary),
  accent: hexToRgb(light.accent.default),
  status: {
    green: hexToRgb(light.status.green),
    blue: hexToRgb(light.status.blue),
    orange: hexToRgb(light.status.orange),
    yellow: hexToRgb(light.status.yellow),
    red: hexToRgb(light.status.red),
  },
};

export const APP_NAME = "Todo en Casa";

export type PdfFonts = { family: string; medium: string; semibold: string };

const FALLBACK: PdfFonts = { family: "helvetica", medium: "bold", semibold: "bold" };

export async function fetchAsBase64(url: string): Promise<string | null> {
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

/** Registra Inter 400/500/600 en el documento (o cae a Helvetica). */
export function registerInter(
  doc: jsPDF,
  regular: string | null,
  medium: string | null,
  semibold: string | null
): PdfFonts {
  if (!regular || !medium || !semibold) return FALLBACK;
  try {
    doc.addFileToVFS("Inter-Regular.ttf", regular);
    doc.addFont("Inter-Regular.ttf", "Inter", "normal");
    doc.addFileToVFS("Inter-Medium.ttf", medium);
    doc.addFont("Inter-Medium.ttf", "Inter", "medium");
    doc.addFileToVFS("Inter-SemiBold.ttf", semibold);
    doc.addFont("Inter-SemiBold.ttf", "Inter", "semibold");
    return { family: "Inter", medium: "medium", semibold: "semibold" };
  } catch {
    return FALLBACK;
  }
}

/** Carga logo y fuentes en paralelo. */
export async function loadBrandAssets(doc: jsPDF) {
  const [logo, regular, medium, semibold] = await Promise.all([
    fetchAsBase64("/brand/icon-lilac.png"),
    fetchAsBase64("/fonts/inter-regular.ttf"),
    fetchAsBase64("/fonts/inter-medium.ttf"),
    fetchAsBase64("/fonts/inter-semibold.ttf"),
  ]);
  return {
    fonts: registerInter(doc, regular, medium, semibold),
    logo: logo ? `data:image/png;base64,${logo}` : null,
  };
}

/**
 * Cabecera sobria tipo Linear: logo + nombre de la app pequeño, título del
 * documento y subtítulo en texto secundario, y una línea fina de separación.
 * Devuelve la coordenada Y donde empieza el contenido.
 */
export function drawBrandHeader(
  doc: jsPDF,
  fonts: PdfFonts,
  { title, subtitle, logo, margin }: { title: string; subtitle: string; logo: string | null; margin: number }
) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  if (logo) doc.addImage(logo, "PNG", margin, y - 2, 14, 14);
  doc.setFont(fonts.family, fonts.medium);
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text(APP_NAME, margin + (logo ? 20 : 0), y + 8.5);

  y += 34;
  doc.setFont(fonts.family, fonts.semibold);
  doc.setFontSize(20);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(title, margin, y, { charSpace: -0.2 });

  y += 17;
  doc.setFont(fonts.family, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text(subtitle, margin, y);

  y += 16;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageW - margin, y);
  return y + 18;
}

/** Pie con nombre del documento y paginación en todas las páginas. */
export function drawBrandFooters(doc: jsPDF, fonts: PdfFonts, label: string, margin: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont(fonts.family, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.textTertiary);
    doc.text(`${APP_NAME} · ${label}`, margin, pageH - margin / 2);
    doc.text(`${i} / ${pages}`, pageW - margin, pageH - margin / 2, { align: "right" });
  }
}
