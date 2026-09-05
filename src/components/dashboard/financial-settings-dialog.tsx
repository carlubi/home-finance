"use client";

import { Settings2 } from "lucide-react";
import type { Category, FixedExpense, Investment } from "@/lib/types";
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
  InvestmentsManager,
  MonthlyIncomeForm,
} from "@/components/settings/recurring-finance-forms";

export function FinancialSettingsDialog({
  monthlyIncome,
  fixedExpenses,
  investments,
  categories,
  currentMonth,
}: {
  monthlyIncome: number | null;
  fixedExpenses: FixedExpense[];
  investments: Investment[];
  categories: Category[];
  currentMonth: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="default"
            className="shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          />
        }
      >
        <Settings2 className="size-4" />
        Ajustes recurrentes
      </DialogTrigger>
      <DialogContent className="max-h-[min(820px,calc(100vh-2rem))] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-[76rem]">
        <DialogHeader>
          <DialogTitle>Ingresos, gastos e inversión recurrentes</DialogTitle>
          <DialogDescription>
            Configura tu salario, ingresos y gastos recurrentes, y aportaciones a
            inversión desde el resumen.
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
          <MonthlyIncomeForm
            monthlyIncome={monthlyIncome}
            currentMonth={currentMonth}
          />
        </section>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Ingresos y gastos recurrentes</h2>
            <p className="text-xs text-muted-foreground">
              Registra cada concepto como gasto o ingreso, con frecuencia diaria,
              semanal, mensual, trimestral o anual.
            </p>
          </div>
          <FixedExpensesManager
            fixedExpenses={fixedExpenses}
            categories={categories}
            currentMonth={currentMonth}
          />
        </section>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Inversión mensual recurrente</h2>
            <p className="text-xs text-muted-foreground">
              Añade el importe mensual, el fondo o producto, y la rentabilidad
              anual esperada para simulaciones.
            </p>
          </div>
          <InvestmentsManager
            investments={investments}
            currentMonth={currentMonth}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}
