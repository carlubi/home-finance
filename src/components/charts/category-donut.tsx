"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { categoryColor, SERIES } from "@/lib/chart-colors";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";
import { ChartTooltip } from "./chart-tooltip";

const MAX_SEGMENTS = 6;

export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, MAX_SEGMENTS - 1);
  const rest = sorted.slice(MAX_SEGMENTS - 1);
  const restTotal = rest.reduce((sum, d) => sum + Number(d.total), 0);

  const segments = [
    ...top.map((d) => ({
      name: d.category_name ?? "Sin categoría",
      value: Number(d.total),
      color: categoryColor(d.category_color),
    })),
    ...(restTotal > 0
      ? [{ name: "Otras", value: restTotal, color: SERIES.other }]
      : []),
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (segments.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sin gastos este mes.
      </p>
    );
  }

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="95%"
              stroke="var(--background)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {segments.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Leyenda con valores: canal de identidad y vista de datos accesible */}
      <ul className="grid gap-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="truncate text-muted-foreground">{s.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatMoney(s.value)}
            </span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
