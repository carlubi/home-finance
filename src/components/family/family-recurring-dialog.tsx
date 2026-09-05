"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteFamilyRecurringExpense,
  saveFamilyRecurringExpense,
} from "@/app/(app)/familia/actions";
import {
  familyCategoryOptions,
  type FamilyExpenseCategoryOption,
} from "@/lib/family";
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
import { recurringFrequencyLabels } from "@/lib/recurring";

function CategorySelect({
  defaultValue,
  categories,
}: {
  defaultValue?: string;
  categories: FamilyExpenseCategoryOption[];
}) {
  return (
    <Select
      name="category"
      defaultValue={defaultValue ?? categories[0]?.name}
      items={categories.map((category) => ({
        value: category.name,
        label: category.name,
      }))}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.name} value={category.name}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RecurringFields({
  expense,
  categories,
}: {
  expense?: FamilyRecurringExpense;
  categories: FamilyExpenseCategoryOption[];
}) {
  return (
    <>
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <div className="grid gap-1.5">
        <Label>Concepto</Label>
        <Input name="name" required defaultValue={expense?.name ?? ""} placeholder="Ej. Hipoteca" />
      </div>
      <div className="grid gap-1.5">
        <Label>Categoría</Label>
        <CategorySelect defaultValue={expense?.category} categories={categories} />
      </div>
      <div className="grid gap-1.5">
        <Label>Importe</Label>
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
        <Label>Tipo</Label>
        <Select
          name="entry_kind"
          defaultValue={expense?.entry_kind ?? "expense"}
          items={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="expense">Gasto</SelectItem><SelectItem value="income">Ingreso</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Frecuencia</Label>
        <Select
          name="frequency"
          defaultValue={expense?.frequency ?? "monthly"}
          items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
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
  categories,
}: {
  expenses: FamilyRecurringExpense[];
  defaultMonth: string;
  trigger?: React.ReactElement;
  categories?: FamilyExpenseCategoryOption[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const categoryOptions = categories ?? familyCategoryOptions();

  function runSave(formData: FormData, message: string, reset = false) {
    startTransition(async () => {
      const result = await saveFamilyRecurringExpense(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (reset) formRef.current?.reset();
      toast.success(message);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("¿Eliminar este gasto recurrente familiar?")) return;
    startTransition(async () => {
      const result = await deleteFamilyRecurringExpense(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Gasto recurrente eliminado.");
        router.refresh();
      }
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
      <DialogContent className="max-h-[min(820px,calc(100vh-2rem))] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-[78rem]">
        <DialogHeader>
          <DialogTitle>Ingresos y gastos recurrentes familiares</DialogTitle>
          <DialogDescription>
            Configura los movimientos de la unidad familiar de forma independiente a los personales.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Ingresos y gastos recurrentes</h2>
            <p className="text-xs text-muted-foreground">
              Registra cada concepto como gasto o ingreso, con frecuencia diaria,
              semanal, mensual, trimestral o anual.
            </p>
          </div>
          <form
            ref={formRef}
            action={(formData) => runSave(formData, "Movimiento recurrente añadido.", true)}
            className="grid gap-3 lg:grid-cols-[minmax(9rem,1.2fr)_minmax(9rem,1fr)_7rem_7rem_8rem_6rem_9rem_9rem_auto] lg:items-end"
          >
            <div className="grid gap-1.5">
              <Label>Concepto</Label>
              <Input name="name" required placeholder="Ej. Hipoteca" />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoría</Label>
              <CategorySelect categories={categoryOptions} />
            </div>
            <div className="grid gap-1.5">
              <Label>Importe</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" />
            </div>
            <div className="grid gap-1.5"><Label>Tipo</Label><Select name="entry_kind" defaultValue="expense" items={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Gasto</SelectItem><SelectItem value="income">Ingreso</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Frecuencia</Label><Select name="frequency" defaultValue="monthly" items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
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
          </form>

          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Movimientos recurrentes configurados</h3>
            {expenses.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Todavía no hay movimientos recurrentes familiares.
              </p>
            ) : (
              expenses.map((expense) => (
                <form
                  key={expense.id}
                  action={(formData) => runSave(formData, "Movimiento recurrente actualizado.")}
                  className="grid gap-2 rounded-lg border bg-muted/20 p-3 lg:grid-cols-[minmax(9rem,1.2fr)_minmax(9rem,1fr)_7rem_7rem_8rem_6rem_9rem_9rem_auto_auto] lg:items-end"
                >
                  <RecurringFields expense={expense} categories={categoryOptions} />
                  <Button type="submit" variant="outline" disabled={pending}>
                    Guardar
                  </Button>
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
        </section>
      </DialogContent>
    </Dialog>
  );
}
