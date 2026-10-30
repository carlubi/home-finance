"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/format";

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

  if (income <= 0) return <p className="py-8 text-center text-sm text-muted-foreground">Añade ingresos para ver el reparto.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-4">
        <div><span className="text-xs text-muted-foreground">Ingreso medio mensual</span><p className="text-2xl font-semibold tabular-nums">{formatMoney(income)}</p></div>
        <span className="text-xs text-muted-foreground">Media de {months} {months === 1 ? "mes" : "meses"} con ingresos</span>
      </div>
      <div className="space-y-4">
        {groups.map((group) => {
          const share = group.amount / income * 100;
          const expandable = Boolean(group.details?.length);
          return <div key={group.key}>
            <div className="flex items-baseline justify-between gap-3">
              {expandable ? <button type="button" className="group inline-flex min-h-11 items-center gap-1 text-left text-sm font-medium hover:text-primary focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring" aria-expanded={open === group.key} onClick={() => setOpen(open === group.key ? null : group.key)}>{group.label}<ChevronDown className={`size-4 text-muted-foreground transition-transform ${open === group.key ? "rotate-180" : ""}`} /></button> : <span className="text-sm font-medium">{group.label}</span>}
              <div className="flex shrink-0 items-baseline gap-2"><span className="text-xs text-muted-foreground tabular-nums">{formatMoney(group.amount)}</span><strong className="min-w-13 text-right text-sm tabular-nums">{percent.format(share)} %</strong></div>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted" role="meter" aria-label={`${group.label}: ${percent.format(share)} % de los ingresos`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, share))}><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, share))}%`, backgroundColor: group.color }} /></div>
            {open === group.key && expandable && <div id={`allocation-detail-${group.key}`} className="mt-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs">
              <p className="mb-2 text-muted-foreground">Desglose sobre el ingreso medio</p>
              <div className="grid gap-2">{group.details!.map((detail) => <div className="flex justify-between gap-3" key={detail.name}><span className="min-w-0 truncate">{detail.name}</span><span className="shrink-0 tabular-nums text-muted-foreground">{formatMoney(detail.amount)} · {percent.format(detail.amount / income * 100)} %</span></div>)}</div>
            </div>}
          </div>;
        })}
      </div>
      <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">Porcentaje = importe medio mensual ÷ ingreso medio mensual. El ahorro es el dinero restante tras gastos, hipoteca e inversión.{estimatedMortgage ? " La hipoteca no figura en los gastos personales de todos los meses, así que para esos meses se estima la parte de la cuota que corresponde a esta persona." : ""} Si el ahorro es negativo, los destinos superan los ingresos.</p>
    </div>
  );
}
