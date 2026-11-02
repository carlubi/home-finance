"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
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
  "Ahorro + cuenta remunerada"?: number;
  "Ahorro + inversión"?: number;
  "Con rentabilidad"?: number;
}

const compact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 0,
});

export function SavingsTrend({ data }: { data: TrendDatum[] }) {
  const hasInvestment = data.some((item) => item["Ahorro + inversión"] != null);
  const hasSavingsInterest = data.some((item) => item["Ahorro + cuenta remunerada"] != null);
  const hasProjection = data.some((item) => item["Con rentabilidad"] != null);

  return (
    <div className="grid gap-3">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
            {hasSavingsInterest && (
              <Line
                type="monotone"
                dataKey="Ahorro + cuenta remunerada"
                stroke={SERIES.savingsWithInterest}
                strokeWidth={2.5}
                dot={{ r: 3, fill: SERIES.savingsWithInterest }}
                isAnimationActive={false}
              />
            )}
            {hasInvestment && (
              <Line
                type="monotone"
                dataKey="Ahorro + inversión"
                stroke={SERIES.savingsWithInvestment}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {hasProjection && (
              <Line
                type="monotone"
                dataKey="Con rentabilidad"
                stroke={SERIES.projectedInvestment}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: SERIES.savings }} />Ahorro total sin intereses</span>
        {hasSavingsInterest && <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: SERIES.savingsWithInterest }} />Ahorro total + cuenta remunerada</span>}
        {hasInvestment && <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: SERIES.savingsWithInvestment }} />Ahorro total + inversión</span>}
      </div>
    </div>
  );
}
