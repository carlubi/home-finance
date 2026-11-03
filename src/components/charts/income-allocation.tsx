"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { SERIES } from "@/lib/chart-colors";
import { ChartEmpty } from "./chart-theme";

export type AllocationDetail = { name: string; amount: number };
export type AllocationGroup = {
  key: "investment" | "expenses" | "mortgage" | "savings";
  label: string;
  amount: number;
  color: string;
  details?: AllocationDetail[];
};

const percent = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export function IncomeAllocation({ income, groups, months, estimatedMortgage }: {
  income: number;
  groups: AllocationGroup[];
  months: number;
  estimatedMortgage: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (income <= 0) return <ChartEmpty>Añade ingresos para ver el reparto.</ChartEmpty>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border-primary pb-4">
        <div><span className="text-xs text-text-tertiary">Ingreso medio mensual</span><p className="text-2xl font-medium">{formatMoney(income)}</p></div>
        <span className="text-xs text-text-tertiary">Media de {months} {months === 1 ? "mes" : "meses"} con ingresos</span>
      </div>
      <div className="space-y-3">
        {groups.map((group) => {
          const share = group.amount / income * 100;
          const expandable = Boolean(group.details?.length);
          return <div key={group.key}>
            <div className="flex items-baseline justify-between gap-3">
              {expandable ? <button type="button" className="group inline-flex min-h-8 items-center gap-1 rounded-sm text-left text-[13px] font-medium text-text-primary transition-fast outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-accent max-md:min-h-11" aria-expanded={open === group.key} onClick={() => setOpen(open === group.key ? null : group.key)}>{group.label}<ChevronDown className={`size-3.5 text-text-tertiary transition-transform duration-150 ${open === group.key ? "rotate-180" : ""}`} /></button> : <span className="text-[13px] font-medium text-text-primary">{group.label}</span>}
              <div className="flex shrink-0 items-baseline gap-2"><span className="text-xs text-text-tertiary tabular-nums">{formatMoney(group.amount)}</span><strong className="min-w-13 text-right text-[13px] font-medium tabular-nums">{percent.format(share)} %</strong></div>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-quaternary" role="meter" aria-label={`${group.label}: ${percent.format(share)} % de los ingresos`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, share))}><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, share))}%`, backgroundColor: group.amount < 0 ? SERIES.expense : SERIES.savings }} /></div>
            {open === group.key && expandable && <div id={`allocation-detail-${group.key}`} className="mt-2 rounded-md border border-border-primary bg-bg-tertiary/50 px-3 py-2 text-xs">
              <p className="mb-2 text-text-tertiary">Desglose sobre el ingreso medio</p>
              <div className="grid gap-2">{group.details!.map((detail) => <div className="flex justify-between gap-3" key={detail.name}><span className="min-w-0 truncate">{detail.name}</span><span className="shrink-0 tabular-nums text-text-secondary">{formatMoney(detail.amount)} · {percent.format(detail.amount / income * 100)} %</span></div>)}</div>
            </div>}
          </div>;
        })}
      </div>
      <p className="border-t border-border-primary pt-3 text-xs leading-5 text-text-tertiary">Porcentaje = importe medio mensual ÷ ingreso medio mensual. El ahorro es el dinero restante tras gastos, hipoteca e inversión.{estimatedMortgage ? " La hipoteca no figura en los gastos personales de todos los meses, así que para esos meses se estima la parte de la cuota que corresponde a esta persona." : ""} Si el ahorro es negativo, los destinos superan los ingresos.</p>
    </div>
  );
}
