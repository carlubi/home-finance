"use client";

import { SERIES } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

/**
 * Tema común de gráficos (skill dataviz + Linear):
 * - Ejes y rejilla: líneas finas, sólidas y recesivas; texto en tokens.
 * - Marcas: barras ≤24px con extremo redondeado de 4px, líneas de 2px,
 *   puntos ≥8px con anillo de 2px del color de la superficie.
 * - Leyenda HTML siempre presente con ≥2 series; el texto nunca lleva el
 *   color de la serie (la identidad la da la muestra de color).
 */

const full = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

/** Un único estilo por eje: cifras completas («2.800») y compactas solo desde el millón. */
function axisNumber(value: number) {
  return Math.abs(value) >= 1_000_000 ? compact.format(value) : full.format(value);
}

/** Superficie sobre la que se dibujan los gráficos (cards). */
export const CHART_SURFACE = "var(--card)";

const tick = { fill: SERIES.muted, fontSize: 11, fontFeatureSettings: '"tnum"' };

export const xAxisProps = {
  tick,
  axisLine: { stroke: SERIES.axis },
  tickLine: false,
  tickMargin: 8,
  minTickGap: 12,
} as const;

export const yAxisProps = {
  tick,
  axisLine: false,
  tickLine: false,
  width: 52,
  tickMargin: 4,
  tickFormatter: axisNumber,
} as const;

export const gridProps = { stroke: SERIES.grid, strokeWidth: 1, vertical: false } as const;

export const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 } as const;

/** Cursor de hover: línea vertical en series temporales, banda en barras. */
export const lineCursor = { stroke: SERIES.axis, strokeWidth: 1 } as const;
export const barCursor = { fill: "var(--bg-tertiary)", opacity: 0.7 } as const;

export function dotProps(color: string) {
  return { r: 4, fill: color, stroke: CHART_SURFACE, strokeWidth: 2 };
}

export function activeDotProps(color: string) {
  return { r: 5, fill: color, stroke: CHART_SURFACE, strokeWidth: 2 };
}

export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const BAR_MAX = 24;

export type LegendItem = { label: string; color: string; dashed?: boolean };

/** Leyenda de una fila, encima del gráfico. Muestra de color + texto neutro. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  if (items.length < 2) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.dashed ? (
            <span
              aria-hidden
              className="h-0 w-3 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Estado vacío común a todos los gráficos. */
export function ChartEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid h-48 place-items-center rounded-md border border-dashed border-border-secondary px-4 text-center text-[13px] text-text-secondary",
        className
      )}
    >
      {children}
    </div>
  );
}
