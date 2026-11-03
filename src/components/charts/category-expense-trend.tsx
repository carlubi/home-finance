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
import { categoryColor } from "@/lib/chart-colors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartTooltip } from "./chart-tooltip";
import { ChartEmpty, ChartLegend, activeDotProps, chartMargin, dotProps, gridProps, lineCursor, xAxisProps, yAxisProps } from "./chart-theme";

export interface CategoryTrendSeries {
  key: string;
  label: string;
  color: string | null;
}

export type CategoryTrendDatum = {
  label: string;
} & Record<string, number | string>;

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
      <ChartEmpty>No hay gastos por categoría suficientes para mostrar evolución.</ChartEmpty>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChartLegend items={visibleSeries.map((item) => ({ label: item.label, color: categoryColor(item.color) }))} className="min-w-0 flex-1" />
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

      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<ChartTooltip />} cursor={lineCursor} />
            {visibleSeries.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={categoryColor(item.color)}
                strokeWidth={2}
                dot={selected ? dotProps(categoryColor(item.color)) : false}
                activeDot={activeDotProps(categoryColor(item.color))}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
