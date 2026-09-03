"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteFamilyRecurringExpense,
  saveFamilyRecurringExpense,
} from "@/app/(app)/familia/actions";
import { FAMILY_EXPENSE_CATEGORIES } from "@/lib/family";
import type { FamilyRecurringExpense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Trash2 } from "lucide-react";

function CategorySelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <Select
      name="category"
      defaultValue={defaultValue ?? FAMILY_EXPENSE_CATEGORIES[0]}
      items={FAMILY_EXPENSE_CATEGORIES.map((category) => ({
        value: category,
        label: category,
      }))}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FAMILY_EXPENSE_CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RecurringFields({ expense }: { expense?: FamilyRecurringExpense }) {
  return (
    <>
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <div className="grid gap-1.5">
        <Label>Concepto</Label>
        <Input name="name" required defaultValue={expense?.name ?? ""} placeholder="Ej. Hipoteca" />
      </div>
      <div className="grid gap-1.5">
        <Label>Categoría</Label>
        <CategorySelect defaultValue={expense?.category} />
      </div>
      <div className="grid gap-1.5">
        <Label>€/mes</Label>
        <Input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={expense?.monthly_amount ?? ""}
          placeholder="0,00"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Personas</Label>
        <Input
          name="people_count"
          type="number"
          min="1"
          max="50"
          step="1"
          required
          defaultValue={expense?.people_count ?? 1}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Desde</Label>
        <Input
          name="starts_on"
          type="month"
          required
          defaultValue={expense?.starts_on.slice(0, 7)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Hasta</Label>
        <Input
          name="ends_on"
          type="month"
          defaultValue={expense?.ends_on?.slice(0, 7) ?? ""}
        />
      </div>
    </>
  );
}

export function FamilyRecurringSettingsDialog({
  expenses,
  defaultMonth,
  trigger,
}: {
  expenses: FamilyRecurringExpense[];
  defaultMonth: string;
  trigger?: React.ReactElement;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function runSave(formData: FormData, message: string, reset = false) {
    startTransition(async () => {
      const result = await saveFamilyRecurringExpense(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (reset) formRef.current?.reset();
      toast.success(message);
    });
  }

  function remove(id: string) {
    if (!window.confirm("¿Eliminar este gasto recurrente familiar?")) return;
    startTransition(async () => {
      const result = await deleteFamilyRecurringExpense(id);
      if (result.error) toast.error(result.error);
      else toast.success("Gasto recurrente eliminado.");
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              variant="default"
              className="shadow-sm hover:-translate-y-0.5 hover:shadow-md"
            >
              Ajustes recurrentes
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-[70rem]">
        <DialogHeader>
          <DialogTitle>Ajustes recurrentes familiares</DialogTitle>
          <DialogDescription>
            Estos gastos son independientes de tus gastos personales y se aplican automáticamente a los meses activos.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData) => runSave(formData, "Gasto recurrente añadido.", true)}
          className="grid gap-3 rounded-xl border bg-muted/20 p-3 lg:grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1fr)_8rem_6rem_9rem_9rem_auto] lg:items-end"
        >
          <div className="contents">
            <div className="grid gap-1.5">
              <Label>Concepto</Label>
              <Input name="name" required placeholder="Ej. Hipoteca" />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoría</Label>
              <CategorySelect />
            </div>
            <div className="grid gap-1.5">
              <Label>€/mes</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" />
            </div>
            <div className="grid gap-1.5">
              <Label>Personas</Label>
              <Input name="people_count" type="number" min="1" max="50" step="1" required defaultValue={1} />
            </div>
            <div className="grid gap-1.5">
              <Label>Desde</Label>
              <Input name="starts_on" type="month" required defaultValue={defaultMonth.slice(0, 7)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Hasta</Label>
              <Input name="ends_on" type="month" placeholder="Opcional" />
            </div>
            <Button type="submit" disabled={pending}>Añadir</Button>
          </div>
        </form>

        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Gastos recurrentes configurados</h3>
          {expenses.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Todavía no hay gastos recurrentes familiares.
            </p>
          ) : (
            expenses.map((expense) => (
              <form
                key={expense.id}
                action={(formData) => runSave(formData, "Gasto recurrente actualizado.")}
                className="grid gap-2 rounded-xl border p-3 lg:grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1fr)_8rem_6rem_9rem_9rem_auto] lg:items-end"
              >
                <RecurringFields expense={expense} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  title="Eliminar gasto recurrente"
                  onClick={() => remove(expense.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </form>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
