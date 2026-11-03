"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SERIES } from "@/lib/chart-colors";
import { ChartTooltip } from "./chart-tooltip";
import {
  BAR_MAX,
  BAR_RADIUS,
  ChartLegend,
  barCursor,
  chartMargin,
  gridProps,
  xAxisProps,
  yAxisProps,
} from "./chart-theme";

export interface MonthBarDatum {
  label: string;
  Ingresos: number;
  Gastos: number;
}

export function IncomeExpenseBars({ data }: { data: MonthBarDatum[] }) {
  return (
    <div className="grid gap-3">
      <ChartLegend
        items={[
          { label: "Ingresos", color: SERIES.income },
          { label: "Gastos", color: SERIES.expense },
        ]}
      />
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<ChartTooltip />} cursor={barCursor} />
            <Bar dataKey="Ingresos" fill={SERIES.income} maxBarSize={BAR_MAX} radius={BAR_RADIUS} isAnimationActive={false} />
            <Bar dataKey="Gastos" fill={SERIES.expense} maxBarSize={BAR_MAX} radius={BAR_RADIUS} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
