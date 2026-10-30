"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import type { FinancialGoal } from "@/lib/types";
import { createFinancialGoal, deleteFinancialGoal } from "@/app/(app)/presupuestos/goal-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoalState, goalValue, type GoalSnapshot } from "./goal-status";

const kindLabels: Record<FinancialGoal["kind"], string> = {
  target_amount: "Alcanzar una cantidad",
  savings_rate: "Ahorrar un porcentaje de los ingresos",
  expense_limit: "No superar un gasto mensual",
};

export function GoalsSection({ snapshots }: { snapshots: GoalSnapshot[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FinancialGoal["kind"]>("target_amount");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createFinancialGoal(formData);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Objetivo creado");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("¿Eliminar este objetivo?")) return;
    startTransition(async () => {
      const result = await deleteFinancialGoal(id);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Objetivo eliminado");
      router.refresh();
    });
  }

  return <section className="rounded-[1.5rem] border bg-card p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Target className="size-4" /> Tus metas</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Crear un objetivo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Decide cuánto quieres reunir, qué porcentaje ahorrar o cuánto puedes gastar al mes. Verás un check o una cruz en la sección personal o familiar según el resultado.</p></div>
      <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Nuevo objetivo</Button>
    </div>
    {snapshots.length ? <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshots.map(({ goal, result }) => {
      const progress = goal.kind === "target_amount" && result.actual !== null ? Math.max(0, Math.min(100, result.actual / Number(goal.target_value) * 100)) : null;
      return <article key={goal.id} className="rounded-2xl border bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="text-xs text-muted-foreground">{goal.scope === "personal" ? "Personal" : "Unidad familiar"} · {kindLabels[goal.kind]}</span><h2 className="mt-1 truncate font-semibold" title={goal.title}>{goal.title}</h2></div><button type="button" onClick={() => remove(goal.id)} disabled={pending} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Eliminar ${goal.title}`}><Trash2 className="size-4" /></button></div>
        <div className="mt-4 flex items-baseline justify-between gap-2"><strong className="text-xl tabular-nums">{result.actual === null ? "—" : goalValue(result.actual, result.unit)}</strong><span className="text-xs text-muted-foreground">meta: {goalValue(result.expected, result.unit)}</span></div>
        {progress !== null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><GoalState result={result} /><span className="text-xs text-muted-foreground">Hasta {formatDate(goal.due_on)}</span></div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{result.detail}</p>
      </article>;
    })}</div> : <div className="mt-5 grid gap-2 sm:grid-cols-3">{["Casa · 80.000 € para 2030", "Ahorrar el 40 % cada mes", "Gastar menos de 300 € sin hipoteca"].map((example) => <div key={example} className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground"><Check className="mb-2 size-4 text-primary" />{example}</div>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Nuevo objetivo</DialogTitle><DialogDescription>Define la meta, el plazo y dónde quieres seguirla.</DialogDescription></DialogHeader>
      <form action={submit} className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="goal-title">Nombre</Label><Input id="goal-title" name="title" placeholder="Ej. Entrada para una casa" maxLength={120} required /></div>
        <div className="grid gap-2"><Label htmlFor="goal-scope">Ámbito</Label><select id="goal-scope" name="scope" className="h-11 rounded-xl border bg-background px-3 text-sm" defaultValue="personal"><option value="personal">Personal</option><option value="family">Unidad familiar</option></select></div>
        <div className="grid gap-2"><Label htmlFor="goal-kind">Tipo de objetivo</Label><select id="goal-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as FinancialGoal["kind"])} className="h-11 rounded-xl border bg-background px-3 text-sm">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="grid gap-2"><Label htmlFor="goal-value">{kind === "savings_rate" ? "Porcentaje mínimo de ahorro" : kind === "expense_limit" ? "Límite de gasto mensual sin hipoteca" : "Cantidad que quieres reunir"}</Label><Input id="goal-value" name="target_value" inputMode="decimal" placeholder={kind === "savings_rate" ? "40" : kind === "expense_limit" ? "300" : "80.000"} required /><p className="text-xs text-muted-foreground">{kind === "savings_rate" ? "% de los ingresos del mes" : "Importe en euros"}</p></div>
        {kind === "target_amount" && <div className="grid gap-2"><Label htmlFor="goal-initial">Ya tengo ahorrado (opcional)</Label><Input id="goal-initial" name="initial_amount" inputMode="decimal" defaultValue="0" /><p className="text-xs text-muted-foreground">Saldo inicial para esta meta. Después se sumará el ahorro mensual registrado.</p></div>}
        <div className="grid gap-2"><Label htmlFor="goal-due">Fecha límite</Label><Input id="goal-due" name="due_on" type="date" required /></div>
        <p className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">Los objetivos mensuales se evalúan con el mes en curso. Para metas de dinero, el check indica si sigues el ritmo necesario hasta la fecha límite.</p>
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Guardando…" : "Crear objetivo"}</Button>
      </form>
    </DialogContent></Dialog>
  </section>;
}
