"use client";

import { formatMoney } from "@/lib/format";

interface TooltipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  payload?: { fill?: string; tooltipColor?: string };
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-secondary bg-bg-secondary px-2.5 py-2 text-xs text-text-primary shadow-lg">
      {label != null && <p className="mb-1 font-medium text-text-primary">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{
              backgroundColor:
                entry.payload?.tooltipColor ?? entry.color ?? entry.payload?.fill,
            }}
          />
          <span className="text-text-secondary">{entry.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">
            {typeof entry.value === "number" ? formatMoney(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
