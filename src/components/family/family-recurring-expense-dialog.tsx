"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFamilyRecurringExpense } from "@/app/(app)/familia/actions";
import type { FamilyRecurringExpense } from "@/lib/types";
import type { FamilyExpenseCategoryOption } from "@/lib/family";
import { recurringFrequencyLabels } from "@/lib/recurring";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FamilyRecurringExpenseDialog({
  expense,
  categories,
  open,
  onOpenChange,
}: {
  expense: FamilyRecurringExpense | null;
  categories: FamilyExpenseCategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!expense) return null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveFamilyRecurringExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Gasto recurrente familiar actualizado.");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar gasto recurrente familiar</DialogTitle></DialogHeader>
        <form key={expense.id} action={submit} className="grid gap-4">
          <input type="hidden" name="id" value={expense.id} />
          <div className="grid gap-2"><Label htmlFor="family-recurring-name">Concepto</Label><Input id="family-recurring-name" name="name" required defaultValue={expense.name} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Importe</Label><div className="relative"><Input name="amount" type="number" min="0.01" step="0.01" required className="pr-7" placeholder="0,00" defaultValue={expense.monthly_amount} /><span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">€</span></div></div>
            <div className="grid gap-2"><Label>Personas</Label><Input name="people_count" type="number" min="1" max="50" step="1" required defaultValue={expense.people_count} /></div>
          </div>
          <div className="grid gap-2"><Label>Categoría</Label><Select name="category" defaultValue={expense.category} items={categories.map((category) => ({ value: category.name, label: category.name }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.name} value={category.name}>{category.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Tipo</Label><Select name="entry_kind" defaultValue={expense.entry_kind} items={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Gasto</SelectItem><SelectItem value="income">Ingreso</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label>Frecuencia</Label><Select name="frequency" defaultValue={expense.frequency} items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Desde</Label><Input name="starts_on" type="month" required defaultValue={expense.starts_on.slice(0, 7)} /></div><div className="grid gap-2"><Label>Hasta</Label><Input name="ends_on" type="month" defaultValue={expense.ends_on?.slice(0, 7) ?? ""} /></div></div>
          <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
