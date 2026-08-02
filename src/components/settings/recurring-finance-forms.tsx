"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import type { Category, FixedExpense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteFixedExpense,
  saveFixedExpense,
  updateMonthlyIncome,
} from "@/app/(app)/ajustes/actions";

export function MonthlyIncomeForm({
  monthlyIncome,
}: {
  monthlyIncome: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const r = await updateMonthlyIncome(formData);
          if (r.error) toast.error(r.error);
          else {
            toast.success("Ingreso mensual actualizado.");
            router.refresh();
          }
        })
      }
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="monthly_income">Ingreso mensual / salario</Label>
        <Input
          key={monthlyIncome ?? "empty"}
          id="monthly_income"
          name="monthly_income"
          type="text"
          inputMode="decimal"
          defaultValue={monthlyIncome ?? ""}
          placeholder="Ej. 1.800,50"
        />
        <p className="text-xs text-muted-foreground">
          Puedes escribir decimales con coma o punto:{" "}
          <span className="tabular-nums">1.800,50</span>,{" "}
          <span className="tabular-nums">1800.50</span> o{" "}
          <span className="tabular-nums">1800</span>. Los puntos de miles se
          permiten y se normalizan automáticamente.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}

export function FixedExpensesManager({
  fixedExpenses,
  categories,
}: {
  fixedExpenses: FixedExpense[];
  categories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function runSave(formData: FormData, successMessage: string) {
    startTransition(async () => {
      const result = await saveFixedExpense(formData);
      if (result.error) toast.error(result.error);
      else {
        formRef.current?.reset();
        toast.success(successMessage);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4">
      <form
        ref={formRef}
        action={(formData) => runSave(formData, "Gasto fijo añadido.")}
        className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto]"
      >
        <Input name="name" placeholder="Nombre del gasto fijo" required />
        <Select
          name="category_id"
          defaultValue="none"
          items={[
            { value: "none", label: "Sin categoría" },
            ...categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin categoría</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input name="amount" inputMode="decimal" placeholder="EUR/mes" />
        <Button type="submit" disabled={pending}>
          Añadir
        </Button>
      </form>

      {fixedExpenses.length > 0 ? (
        <div className="grid gap-2">
          {fixedExpenses.map((expense) => (
            <form
              key={expense.id}
              action={(formData) => runSave(formData, "Gasto fijo actualizado.")}
              className="grid gap-2 rounded-lg border bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto_auto]"
            >
              <input type="hidden" name="id" value={expense.id} />
              <Input name="name" defaultValue={expense.name} required />
              <Select
                name="category_id"
                defaultValue={expense.category_id ?? "none"}
                items={[
                  { value: "none", label: "Sin categoría" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name="amount"
                inputMode="decimal"
                defaultValue={expense.amount ?? ""}
                placeholder="EUR/mes"
              />
              <Button type="submit" variant="outline" disabled={pending}>
                <Save className="size-4" />
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteFixedExpense(expense.id);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success("Gasto fijo eliminado.");
                      router.refresh();
                    }
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no tienes gastos mensuales fijos.
        </p>
      )}
    </div>
  );
}
