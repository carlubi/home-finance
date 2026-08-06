import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Import } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMonthData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatMonth, monthStart } from "@/lib/format";
import {
  investmentActualValueAtMonth,
  investmentMonthlyContribution,
  pctChange,
  roundCents,
} from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal, Expense, FixedExpense, Investment } from "@/lib/types";
import { CategoryDonut } from "@/components/charts/category-donut";
import { ChartCard } from "@/components/charts/chart-card";
import { IncomeExpenseBars } from "@/components/charts/income-expense-bars";
import { FinancialSettingsDialog } from "@/components/dashboard/financial-settings-dialog";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { InvestmentList } from "@/components/investments/investment-list";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Resumen mensual" };

function activeFixedExpensesForMonth(fixedExpenses: FixedExpense[], month: string) {
  return fixedExpenses.filter((expense) => {
    const startsOn = expense.starts_on ?? expense.created_at.slice(0, 10);
    return (
      expense.active &&
      Number(expense.amount ?? 0) > 0 &&
      startsOn <= month &&
      (!expense.ends_on || expense.ends_on >= month)
    );
  });
}

function fixedExpensesTotal(fixedExpenses: FixedExpense[]) {
  return fixedExpenses.reduce(
    (total, expense) => total + Number(expense.amount ?? 0),
    0
  );
}

function mergeFixedExpensesByCategory(
  byCategory: CategoryTotal[],
  fixedExpenses: FixedExpense[]
) {
  const merged = new Map<string, CategoryTotal>();

  byCategory.forEach((category) => {
    merged.set(category.category_id ?? "none", { ...category });
  });

  fixedExpenses.forEach((expense) => {
    const key = expense.category_id ?? "none";
    const current = merged.get(key);
    if (current) {
      current.total = Number(current.total) + Number(expense.amount ?? 0);
      current.num_expenses = Number(current.num_expenses ?? 0) + 1;
      return;
    }

    merged.set(key, {
      user_id: expense.user_id,
      month: expense.starts_on ?? expense.created_at.slice(0, 10),
      category_id: expense.category_id,
      category_name: expense.categories?.name ?? null,
      category_color: expense.categories?.color ?? null,
      total: Number(expense.amount ?? 0),
      num_expenses: 1,
    });
  });

  return [...merged.values()];
}

function fixedExpensesAsMonthExpenses(
  fixedExpenses: FixedExpense[],
  month: string
): (Expense & { readOnlyReason: string })[] {
  return fixedExpenses.map((expense) => ({
    id: `fixed-${expense.id}-${month}`,
    user_id: expense.user_id,
    name: expense.name,
    category_id: expense.category_id,
    amount: Number(expense.amount ?? 0),
    occurred_at: month,
    payment_method: null,
    notes: null,
    attachment_path: null,
    tags: [],
    source: "manual",
    import_id: null,
    created_at: expense.created_at,
    categories: expense.categories,
    readOnlyReason:
      "Gasto recurrente gestionado desde Ajustes recurrentes.",
  }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(mes ?? "")
    ? `${mes}-01`
    : monthStart(new Date());

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [
    data,
    { data: onboarding },
    { data: fixedExpenses },
  ] = await Promise.all([
    getMonthData(user.id, month),
    supabase
      .from("onboarding_answers")
      .select("fixed_income_amount")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("fixed_expenses")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);
  const recurrentSettingsMonth = monthStart(new Date());
  const recurringInvestmentsForSettings = data.investments.filter(
    (investment) =>
      Number(investment.monthly_amount ?? 0) > 0 &&
      !investment.ends_on
  );
  const monthInvestmentMovements = data.investments.filter((investment) => {
    const startsOn = investment.starts_on ?? investment.created_at.slice(0, 10);
    const isRecurringInMonth =
      Number(investment.monthly_amount ?? 0) > 0 &&
      startsOn <= month &&
      (!investment.ends_on || investment.ends_on >= month);
    const isOneOffThisMonth =
      Number(investment.one_off_amount ?? 0) > 0 &&
      Number(investment.monthly_amount ?? 0) === 0 &&
      startsOn.slice(0, 7) === month.slice(0, 7);

    return isRecurringInMonth || isOneOffThisMonth;
  });
  const monthlyInvestment = investmentMonthlyContribution(data.investments, month);
  const accumulatedInvestment = investmentActualValueAtMonth(
    data.investments,
    month
  );
  const allFixedExpenses = ((fixedExpenses ?? []) as FixedExpense[]).filter(
    (expense) => expense.active && Number(expense.amount ?? 0) > 0
  );
  const fixed = allFixedExpenses.filter((expense) => !expense.ends_on);
  const monthFixedExpenses = activeFixedExpensesForMonth(allFixedExpenses, month);
  const prevMonth = new Date(month + "T00:00:00");
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const previousMonthValue = monthStart(prevMonth);
  const previousFixedExpenses = activeFixedExpensesForMonth(
    allFixedExpenses,
    previousMonthValue
  );
  const fixedMonthTotal = fixedExpensesTotal(monthFixedExpenses);
  const fixedPreviousTotal = fixedExpensesTotal(previousFixedExpenses);
  const income = Number(data.current?.total_income ?? 0);
  const rawExpenses = Number(data.current?.total_expenses ?? 0);
  const manualExpenseTotal = data.expenses.reduce(
    (total, expense) => total + Number(expense.amount ?? 0),
    0
  );
  const summaryAlreadyHasFixedExpenses =
    fixedMonthTotal > 0 &&
    rawExpenses >= manualExpenseTotal + monthlyInvestment + fixedMonthTotal - 0.01;
  const shouldAddFixedExpenses = fixedMonthTotal > 0 && !summaryAlreadyHasFixedExpenses;
  const expenses = shouldAddFixedExpenses
    ? roundCents(rawExpenses + fixedMonthTotal)
    : rawExpenses;
  const previousExpenses = shouldAddFixedExpenses
    ? Number(data.previous?.total_expenses ?? 0) + fixedPreviousTotal
    : Number(data.previous?.total_expenses ?? 0);
  const savings = roundCents(income - expenses);
  const savingsPct = income > 0 ? roundCents((savings / income) * 100) : null;
  const byCategory = shouldAddFixedExpenses
    ? mergeFixedExpensesByCategory(data.byCategory, monthFixedExpenses)
    : data.byCategory;
  const visibleExpenses = [
    ...fixedExpensesAsMonthExpenses(monthFixedExpenses, month),
    ...data.expenses,
  ];
  const prevLabel = new Date(month + "T00:00:00");
  prevLabel.setMonth(prevLabel.getMonth() - 1);

  const spentByCategory = new Map(
    byCategory.map((c) => [c.category_id, Number(c.total)])
  );
  const budgetsWithSpent = data.budgets
    .map((b) => ({
      ...b,
      spent: spentByCategory.get(b.category_id) ?? 0,
    }))
    .sort((a, b) => b.spent / b.monthly_limit - a.spent / a.monthly_limit);

  const expenseCategories = data.categories.filter((c) => c.kind === "expense");
  const incomeCategories = data.categories.filter((c) => c.kind === "income");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Resumen mensual</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={{
                  pathname: "/importar",
                  query: { mes: month.slice(0, 7) },
                }}
              />
            }
            variant="outline"
          >
            <Import className="size-4" />
            Importar documentos
          </Button>
          <FinancialSettingsDialog
            monthlyIncome={onboarding?.fixed_income_amount ?? null}
            fixedExpenses={fixed}
            investments={recurringInvestmentsForSettings as Investment[]}
            categories={expenseCategories}
            currentMonth={recurrentSettingsMonth}
          />
          <Suspense>
            <MonthSwitcher month={month} />
          </Suspense>
        </div>
      </div>

      <SummaryCards
        income={income}
        expenses={expenses}
        savings={savings}
        savingsPct={shouldAddFixedExpenses ? savingsPct : data.current?.savings_pct ?? null}
        incomeDelta={pctChange(income, Number(data.previous?.total_income ?? 0))}
        expensesDelta={pctChange(expenses, previousExpenses)}
        savingsDelta={pctChange(savings, Number(data.previous?.savings ?? 0))}
        monthlyInvestment={monthlyInvestment}
        accumulatedInvestment={accumulatedInvestment}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Gastos por categoría"
          fileName={`gastos-categoria-${month.slice(0, 7)}`}
          exportSubtitle={formatMonth(month)}
        >
          <CategoryDonut data={byCategory} />
        </ChartCard>

        <ChartCard
          title="Ingresos vs gastos"
          description="Comparación con el mes anterior"
          fileName={`ingresos-gastos-${month.slice(0, 7)}`}
          exportSubtitle={formatMonth(month)}
        >
          <IncomeExpenseBars
            data={[
              {
                label: prevLabel.toLocaleDateString("es-ES", { month: "short" }),
                Ingresos: Number(data.previous?.total_income ?? 0),
                Gastos: Number(data.previous?.total_expenses ?? 0),
              },
              {
                label: new Date(month + "T00:00:00").toLocaleDateString("es-ES", {
                  month: "short",
                }),
                Ingresos: income,
                Gastos: expenses,
              },
            ]}
          />
        </ChartCard>
      </div>

      {budgetsWithSpent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presupuestos del mes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {budgetsWithSpent.map((b) => {
              const pct = Math.min(100, (b.spent / b.monthly_limit) * 100);
              const over = b.spent > b.monthly_limit;
              return (
                <div key={b.id} className="grid gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{b.categories?.name ?? "Categoría"}</span>
                    <span
                      className={
                        over
                          ? "font-medium text-red-700 dark:text-red-400"
                          : "text-muted-foreground"
                      }
                    >
                      {formatMoney(b.spent)} / {formatMoney(b.monthly_limit)}
                      {over && " · superado"}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="gastos">
        <TabsList>
          <TabsTrigger value="gastos">Gastos ({visibleExpenses.length})</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos ({data.income.length})</TabsTrigger>
          <TabsTrigger value="inversion">
            Inversión ({monthInvestmentMovements.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gastos">
          <TransactionList
            kind="expense"
            items={visibleExpenses}
            categories={expenseCategories}
            userId={user.id}
            emptyLabel="No hay gastos registrados este mes. Añade el primero."
            defaultDate={month}
          />
        </TabsContent>
        <TabsContent value="ingresos">
          <TransactionList
            kind="income"
            items={data.income}
            categories={incomeCategories}
            userId={user.id}
            emptyLabel="No hay ingresos registrados este mes. Añade el primero."
            defaultDate={month}
          />
        </TabsContent>
        <TabsContent value="inversion">
          <InvestmentList month={month} investments={monthInvestmentMovements} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
