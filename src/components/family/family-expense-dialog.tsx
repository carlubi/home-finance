"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFamilyExpense } from "@/app/(app)/familia/actions";
import {
  familyCategoryOptions,
  type FamilyExpenseCategoryOption,
} from "@/lib/family";
import type { FamilyExpense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function FamilyExpenseDialog({
  defaultDate,
  initial = null,
  trigger,
  open,
  onOpenChange,
  categories,
  recurringExpenseId,
}: {
  defaultDate: string;
  initial?: FamilyExpense | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  categories?: FamilyExpenseCategoryOption[];
  recurringExpenseId?: string | null;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const categoryOptions = categories ?? familyCategoryOptions();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveFamilyExpense(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "Gasto familiar actualizado." : "Gasto familiar añadido.");
      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button className="shadow-sm hover:-translate-y-0.5 hover:shadow-md">
                Añadir gasto
              </Button>
            )
          }
        />
      )}
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar gasto familiar" : "Nuevo gasto familiar"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="grid gap-4">
          {initial && !recurringExpenseId && <input type="hidden" name="id" value={initial.id} />}
          {recurringExpenseId && <input type="hidden" name="recurring_expense_id" value={recurringExpenseId} />}
          {initial?.recurring_expense_id && !recurringExpenseId && <input type="hidden" name="recurring_expense_id" value={initial.recurring_expense_id} />}
          <div className="grid gap-2">
            <Label htmlFor="family-expense-name">Concepto</Label>
            <Input
              id="family-expense-name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              placeholder="Ej. Recibo de la luz"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="family-expense-amount">Importe</Label>
              <div className="relative">
                <Input
                  id="family-expense-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={initial?.amount ?? ""}
                  className="pr-8"
                  placeholder="0,00"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="family-expense-date">Fecha</Label>
              <Input
                id="family-expense-date"
                name="occurred_at"
                type="date"
                required
                defaultValue={initial?.occurred_at ?? defaultDate}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select
              name="category"
              defaultValue={initial?.category ?? categoryOptions[0]?.name}
              items={categoryOptions.map((category) => ({
                value: category.name,
                label: category.name,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="family-expense-people">Se divide entre</Label>
            <div className="flex items-center gap-2">
              <Input
                id="family-expense-people"
                name="people_count"
                type="number"
                min="1"
                max="50"
                step="1"
                required
                defaultValue={initial?.people_count ?? 1}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">personas</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="family-expense-notes">Notas (opcional)</Label>
            <Textarea
              id="family-expense-notes"
              name="notes"
              defaultValue={initial?.notes ?? ""}
              placeholder="Cualquier detalle útil"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : initial ? "Guardar cambios" : "Añadir gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
