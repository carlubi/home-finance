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
} from "@/components/settings/recurring-finance-forms";
import { SavingsAccountSettings } from "@/app/(app)/ajustes/savings-account-settings";
import type { SavingsAccount, SavingsInterestRate } from "@/lib/savings-account";

export function FinancialSettingsDialog({
  fixedExpenses,
  investments,
  categories,
  incomeCategories,
  currentMonth,
  savingsAccount,
  savingsRates,
  monthlyInterest,
}: {
  fixedExpenses: FixedExpense[];
  investments: Investment[];
  categories: Category[];
  incomeCategories: Category[];
  currentMonth: string;
  savingsAccount: SavingsAccount | null;
  savingsRates: SavingsInterestRate[];
  monthlyInterest: number;
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
      <DialogContent className="max-h-[min(820px,calc(100vh-2rem))] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-[76rem]">
        <DialogHeader>
          <DialogTitle>Ingresos, gastos, inversión y cuenta remunerada</DialogTitle>
          <DialogDescription>
            Configura tus movimientos recurrentes y los intereses de tu cuenta remunerada.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Gastos recurrentes</h2>
            <p className="text-xs text-muted-foreground">
              Registra cada gasto con frecuencia diaria,
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
            <h2 className="text-sm font-medium">Ingresos recurrentes</h2>
            <p className="text-xs text-muted-foreground">Configura ingresos con su propia frecuencia.</p>
          </div>
          <FixedExpensesManager
            fixedExpenses={fixedExpenses}
            categories={incomeCategories}
            currentMonth={currentMonth}
            entryKind="income"
          />
        </section>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <h2 className="text-sm font-medium">Cuenta remunerada</h2>
            <p className="text-xs text-muted-foreground">Registra el saldo y los tipos de interés aplicados en cada periodo.</p>
          </div>
          <SavingsAccountSettings account={savingsAccount} rates={savingsRates} currentMonth={currentMonth} monthlyInterest={monthlyInterest} />
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
