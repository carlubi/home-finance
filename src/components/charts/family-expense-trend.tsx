"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SERIES } from "@/lib/chart-colors";
import { ChartTooltip } from "./chart-tooltip";
import { ChartEmpty, ChartLegend, activeDotProps, chartMargin, gridProps, lineCursor, xAxisProps, yAxisProps } from "./chart-theme";

export interface FamilyExpenseTrendDatum {
  label: string;
  "Gasto total": number;
  "Por persona": number;
}


export function FamilyExpenseTrend({ data }: { data: FamilyExpenseTrendDatum[] }) {
  if (data.length === 0) {
    return <ChartEmpty>Todavía no hay gastos familiares para mostrar evolución.</ChartEmpty>;
  }

  return (
    <div className="grid gap-3">
      <ChartLegend
        items={[
          { label: "Gasto total", color: SERIES.expense },
          { label: "Por persona", color: SERIES.savings },
        ]}
      />
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<ChartTooltip />} cursor={lineCursor} />
            <Area
              type="monotone"
              dataKey="Gasto total"
              stroke={SERIES.expense}
              fill={SERIES.expense}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              activeDot={activeDotProps(SERIES.expense)}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="Por persona"
              stroke={SERIES.savings}
              fill={SERIES.savings}
              fillOpacity={0.06}
              strokeWidth={2}
              dot={false}
              activeDot={activeDotProps(SERIES.savings)}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
