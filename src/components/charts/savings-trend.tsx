"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERIES } from "@/lib/chart-colors";
import { ChartTooltip } from "./chart-tooltip";

export interface TrendDatum {
  label: string;
  Ahorro: number;
}

const compact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 0,
});

export function SavingsTrend({ data }: { data: TrendDatum[] }) {
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
            tickFormatter={(v: number) => compact.format(v)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: SERIES.axis }} />
          <ReferenceLine y={0} stroke={SERIES.axis} strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="Ahorro"
            stroke={SERIES.savings}
            strokeWidth={2}
            fill={SERIES.savings}
            fillOpacity={0.1}
            dot={{
              r: 4,
              fill: SERIES.savings,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
