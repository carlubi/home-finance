"use client";

import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SERIES } from "@/lib/chart-colors";
import { ChartTooltip } from "./chart-tooltip";
import {
  ChartLegend,
  activeDotProps,
  chartMargin,
  gridProps,
  lineCursor,
  xAxisProps,
  yAxisProps,
  type LegendItem,
} from "./chart-theme";

export interface TrendDatum {
  label: string;
  Ahorro: number;
  "Ahorro + cuenta remunerada"?: number;
  "Ahorro + inversión"?: number;
  "Con rentabilidad"?: number;
}

export function SavingsTrend({ data }: { data: TrendDatum[] }) {
  const hasInvestment = data.some((item) => item["Ahorro + inversión"] != null);
  const hasSavingsInterest = data.some((item) => item["Ahorro + cuenta remunerada"] != null);
  const hasProjection = data.some((item) => item["Con rentabilidad"] != null);

  const legend: LegendItem[] = [
    { label: "Ahorro total sin intereses", color: SERIES.savings },
    ...(hasSavingsInterest ? [{ label: "Ahorro total + cuenta remunerada", color: SERIES.savingsWithInterest }] : []),
    ...(hasInvestment ? [{ label: "Ahorro total + inversión", color: SERIES.savingsWithInvestment }] : []),
    ...(hasProjection ? [{ label: "Con rentabilidad (proyección)", color: SERIES.projectedInvestment, dashed: true }] : []),
  ];

  return (
    <div className="grid gap-3">
      <ChartLegend items={legend} />
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<ChartTooltip />} cursor={lineCursor} />
            <ReferenceLine y={0} stroke={SERIES.axis} strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="Ahorro"
              stroke={SERIES.savings}
              strokeWidth={2}
              fill={SERIES.savings}
              fillOpacity={0.1}
              dot={false}
              activeDot={activeDotProps(SERIES.savings)}
              isAnimationActive={false}
            />
            {hasSavingsInterest && (
              <Line
                type="monotone"
                dataKey="Ahorro + cuenta remunerada"
                stroke={SERIES.savingsWithInterest}
                strokeWidth={2}
                dot={false}
                activeDot={activeDotProps(SERIES.savingsWithInterest)}
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
                activeDot={activeDotProps(SERIES.savingsWithInvestment)}
                isAnimationActive={false}
              />
            )}
            {hasProjection && (
              <Line
                type="monotone"
                dataKey="Con rentabilidad"
                stroke={SERIES.projectedInvestment}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={activeDotProps(SERIES.projectedInvestment)}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
