"use client";

import { Settings2 } from "lucide-react";
import type { Category, FixedExpense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FixedExpensesManager,
  MonthlyIncomeForm,
} from "@/components/settings/recurring-finance-forms";

export function FinancialSettingsDialog({
  monthlyIncome,
  fixedExpenses,
  categories,
}: {
  monthlyIncome: number | null;
  fixedExpenses: FixedExpense[];
  categories: Category[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Settings2 className="size-4" />
        Ajustes mensuales
      </DialogTrigger>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ingreso y gastos fijos</DialogTitle>
          <DialogDescription>
            Configura tu ingreso mensual y los pagos recurrentes desde el
            resumen.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Ingreso mensual</h2>
            <p className="text-xs text-muted-foreground">
              Este valor se refleja como salario automático en los ingresos del
              año.
            </p>
          </div>
          <MonthlyIncomeForm monthlyIncome={monthlyIncome} />
        </section>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Gastos mensuales fijos</h2>
            <p className="text-xs text-muted-foreground">
              Añade, edita o elimina pagos recurrentes como alquiler, seguros o
              suministros.
            </p>
          </div>
          <FixedExpensesManager
            fixedExpenses={fixedExpenses}
            categories={categories}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}
