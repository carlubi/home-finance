"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categoryColor, SERIES } from "@/lib/chart-colors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartTooltip } from "./chart-tooltip";

export interface CategoryTrendSeries {
  key: string;
  label: string;
  color: string | null;
}

export type CategoryTrendDatum = {
  label: string;
} & Record<string, number | string>;

const compact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 0,
});
const ALL_CATEGORIES = "__all__";

export function CategoryExpenseTrend({
  data,
  series,
}: {
  data: CategoryTrendDatum[];
  series: CategoryTrendSeries[];
}) {
  const [selectedKey, setSelectedKey] = useState(ALL_CATEGORIES);
  const selected =
    selectedKey === ALL_CATEGORIES
      ? null
      : series.find((item) => item.key === selectedKey) ?? series[0];
  const visibleSeries = selected ? [selected] : series;

  if (series.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
        No hay gastos por categoría suficientes para mostrar evolución.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Selecciona una categoría o compara todas a la vez.
        </p>
        <Select
          value={selectedKey}
          onValueChange={(value) => setSelectedKey(String(value))}
          items={[
            { value: ALL_CATEGORIES, label: "Todas las categorías" },
            ...series.map((item) => ({ value: item.key, label: item.label })),
          ]}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
            {series.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={SERIES.grid} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              axisLine={{ stroke: SERIES.axis }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: SERIES.axis }} />
            {visibleSeries.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={categoryColor(item.color)}
                strokeWidth={2}
                dot={
                  selected
                    ? {
                        r: 4,
                        fill: categoryColor(item.color),
                        stroke: "var(--background)",
                        strokeWidth: 2,
                      }
                    : false
                }
                activeDot={{
                  r: selected ? 6 : 4,
                  fill: categoryColor(item.color),
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
