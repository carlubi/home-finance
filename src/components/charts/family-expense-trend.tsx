"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERIES } from "@/lib/chart-colors";
import { ChartTooltip } from "./chart-tooltip";

export interface FamilyExpenseTrendDatum {
  label: string;
  "Gasto total": number;
  "Por persona": number;
}

const compact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 0,
});

export function FamilyExpenseTrend({ data }: { data: FamilyExpenseTrendDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
        Todavía no hay gastos familiares para mostrar evolución.
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            tickFormatter={(value: number) => compact.format(value)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: SERIES.axis }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="Gasto total"
            stroke={SERIES.expense}
            fill={SERIES.expense}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={false}
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
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
