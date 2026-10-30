import Link from "next/link";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { FinancialGoal } from "@/lib/types";
import type { GoalResult } from "@/lib/goals";

export type GoalSnapshot = { goal: FinancialGoal; result: GoalResult };

export function goalValue(value: number, unit: GoalResult["unit"]) {
  return unit === "percent" ? `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)} %` : formatMoney(value);
}

export function GoalState({ result, compact = false }: { result: GoalResult; compact?: boolean }) {
  const met = result.status === "met";
  const pending = result.status === "pending";
  const Icon = pending ? CircleHelp : met ? CheckCircle2 : XCircle;
  const label = pending ? "Sin datos" : met ? "En objetivo" : "Fuera de objetivo";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pending ? "bg-muted text-muted-foreground" : met ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}><Icon className="size-3.5" />{compact ? (pending ? "—" : met ? "✓" : "✕") : label}</span>;
}

export function GoalStatusStrip({ snapshots, scope }: { snapshots: GoalSnapshot[]; scope: "personal" | "family" }) {
  if (!snapshots.length) return null;
  return <section aria-label={`Objetivos ${scope === "personal" ? "personales" : "familiares"}`} className="rounded-2xl border bg-card p-4">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Objetivos {scope === "personal" ? "personales" : "de la unidad familiar"}</h2><Link href="/presupuestos" className="text-xs font-medium text-primary hover:underline">Ver objetivos</Link></div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{snapshots.map(({ goal, result }) => <div key={goal.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2"><span className="min-w-0 truncate text-sm" title={goal.title}>{goal.title}</span><GoalState result={result} /></div>)}</div>
  </section>;
}
