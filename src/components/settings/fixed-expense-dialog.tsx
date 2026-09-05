"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFixedExpense } from "@/app/(app)/ajustes/actions";
import { recurringFrequencyLabels } from "@/lib/recurring";
import type { Category, FixedExpense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FixedExpenseDialog({
  expense,
  categories,
  currentMonth,
  open,
  onOpenChange,
}: {
  expense: FixedExpense | null;
  categories: Category[];
  currentMonth: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isIncome = expense?.entry_kind === "income";

  if (!expense) return null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveFixedExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Gasto recurrente actualizado.");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {isIncome ? "ingreso" : "gasto"} recurrente</DialogTitle>
        </DialogHeader>
        <form key={expense.id} action={submit} className="grid gap-4">
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="effective_month" value={currentMonth} />
          {isIncome && <input type="hidden" name="change_scope" value="global" />}
          {isIncome && <input type="hidden" name="entry_kind" value="income" />}
          <div className="grid gap-2">
            <Label htmlFor="fixed-expense-name">Concepto</Label>
            <Input id="fixed-expense-name" name="name" required defaultValue={expense.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Importe</Label>
              <div className="relative"><Input name="amount" type="number" min="0.01" step="0.01" required className="pr-7" placeholder="0,00" defaultValue={expense.amount ?? ""} /><span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">€</span></div>
            </div>
            <div className="grid gap-2">
              <Label>Frecuencia</Label>
              <Select name="frequency" defaultValue={expense.frequency} items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {!isIncome && <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select name="category_id" defaultValue={expense.category_id ?? "none"} items={[{ value: "none", label: "Sin categoría" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Sin categoría</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          {!isIncome && <div className="grid gap-2">
            <Label>Aplicar cambio</Label>
            <Select name="change_scope" defaultValue="from_month" items={[{ value: "from_month", label: "Desde este mes" }, { value: "global", label: "Todos los meses" }]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="from_month">Desde este mes</SelectItem><SelectItem value="global">Todos los meses</SelectItem></SelectContent>
            </Select>
          </div>}
          <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
