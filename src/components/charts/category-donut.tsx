"use client";

import { useState } from "react";
import { categoryColor, SERIES } from "@/lib/chart-colors";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChartEmpty } from "./chart-theme";

const MAX_SEGMENTS = 6;
const percent = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

/**
 * Reparto por categorías: «una parte de un todo».
 * Siguiendo la skill de dataviz, sustituye al donut (malo para comparar
 * valores parecidos) por una barra segmentada fina + lista ordenada, que es
 * a la vez la leyenda y la vista en tabla accesible. Se mantiene el nombre
 * del componente para no tocar a quien lo usa.
 */
export function CategoryDonut({
  data,
  emptyLabel = "Sin gastos este mes.",
  variant = "default",
  showAllCategories = false,
}: {
  data: CategoryTotal[];
  emptyLabel?: string;
  variant?: "default" | "family";
  showAllCategories?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const sorted = [...data]
    .map((d) => ({ ...d, total: Number(d.total) }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);
  const top = showAllCategories ? sorted : sorted.slice(0, MAX_SEGMENTS - 1);
  const rest = showAllCategories ? [] : sorted.slice(MAX_SEGMENTS - 1);
  const restTotal = rest.reduce((sum, d) => sum + d.total, 0);

  const segments = [
    ...top.map((d) => ({
      name: d.category_name ?? "Sin categoría",
      value: d.total,
      color: categoryColor(d.category_color),
    })),
    ...(restTotal > 0 ? [{ name: "Otras", value: restTotal, color: SERIES.other }] : []),
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (segments.length === 0 || total <= 0) {
    return <ChartEmpty>{emptyLabel}</ChartEmpty>;
  }

  return (
    <div className={cn("grid", variant === "family" ? "gap-3" : "gap-4")}>
      <div className="grid gap-1">
        <p className="text-xs text-text-tertiary">Total</p>
        <p className="text-2xl font-medium text-text-primary">{formatMoney(total)}</p>
      </div>

      <div
        role="img"
        aria-label={segments.map((s) => `${s.name}: ${formatMoney(s.value)}`).join(", ")}
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {segments.map((s) => (
          <span
            key={s.name}
            title={`${s.name} · ${formatMoney(s.value)}`}
            onMouseEnter={() => setHovered(s.name)}
            onMouseLeave={() => setHovered(null)}
            className="h-full min-w-1 transition-opacity duration-150 first:rounded-l-full last:rounded-r-full"
            style={{
              flexGrow: s.value,
              flexBasis: 0,
              backgroundColor: s.color,
              opacity: hovered && hovered !== s.name ? 0.35 : 1,
            }}
          />
        ))}
      </div>

      <ul className="grid text-[13px]">
        {segments.map((s) => (
          <li
            key={s.name}
            onMouseEnter={() => setHovered(s.name)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "-mx-2 grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-x-3 rounded-md px-2 py-1.5 transition-fast",
              hovered === s.name && "bg-bg-tertiary/70"
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate text-text-secondary" title={s.name}>{s.name}</span>
            </span>
            <span className="text-right font-medium text-text-primary tabular-nums">{formatMoney(s.value)}</span>
            <span className="text-right text-xs text-text-tertiary tabular-nums">
              {percent.format((s.value / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
