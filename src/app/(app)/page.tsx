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
import type { FixedExpense, Investment } from "@/lib/types";
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
      .select("fixed_income_amount, fixed_expense_types")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("fixed_expenses")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);
  const income = Number(data.current?.total_income ?? 0);
  const expenses = Number(data.current?.total_expenses ?? 0);
  const savings = roundCents(income - expenses);
  const recurringInvestmentsForSettings = data.investments.filter(
    (investment) =>
      Number(investment.monthly_amount ?? 0) > 0 &&
      (investment.starts_on ?? investment.created_at.slice(0, 10)) <= month &&
      (!investment.ends_on || investment.ends_on >= month)
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
  const prevLabel = new Date(month + "T00:00:00");
  prevLabel.setMonth(prevLabel.getMonth() - 1);

  const spentByCategory = new Map(
    data.byCategory.map((c) => [c.category_id, Number(c.total)])
  );
  const budgetsWithSpent = data.budgets
    .map((b) => ({
      ...b,
      spent: spentByCategory.get(b.category_id) ?? 0,
    }))
    .sort((a, b) => b.spent / b.monthly_limit - a.spent / a.monthly_limit);

  const expenseCategories = data.categories.filter((c) => c.kind === "expense");
  const incomeCategories = data.categories.filter((c) => c.kind === "income");
  const selectedMonthSalary =
    data.income.find((item) => item.auto_salary)?.amount ??
    onboarding?.fixed_income_amount ??
    null;
  let fixed = ((fixedExpenses ?? []) as FixedExpense[]).filter(
    (expense) =>
      (expense.starts_on ?? expense.created_at.slice(0, 10)) <= month &&
      (!expense.ends_on || expense.ends_on >= month)
  );
  const onboardingFixedTypes = (onboarding?.fixed_expense_types ?? []) as string[];
  const existingNames = new Set(fixed.map((expense) => expense.name.toLowerCase()));
  const missingOnboardingFixed = onboardingFixedTypes.filter(
    (name) => !existingNames.has(name.toLowerCase())
  );

  if (missingOnboardingFixed.length > 0) {
    const categoryByName = new Map(
      expenseCategories.map((category) => [category.name.toLowerCase(), category.id])
    );
    const { data: inserted } = await supabase
      .from("fixed_expenses")
      .insert(
        missingOnboardingFixed.map((name) => ({
          user_id: user.id,
          name,
          category_id: categoryByName.get(name.toLowerCase()) ?? null,
          amount: null,
          active: true,
          starts_on: month,
        }))
      )
      .select("*, categories(*)");

    fixed = [...fixed, ...((inserted ?? []) as FixedExpense[])];
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Resumen mensual</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
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
            monthlyIncome={selectedMonthSalary}
            fixedExpenses={fixed}
            investments={recurringInvestmentsForSettings as Investment[]}
            categories={expenseCategories}
            currentMonth={month}
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
        savingsPct={data.current?.savings_pct ?? null}
        incomeDelta={pctChange(income, Number(data.previous?.total_income ?? 0))}
        expensesDelta={pctChange(expenses, Number(data.previous?.total_expenses ?? 0))}
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
          <CategoryDonut data={data.byCategory} />
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
          <TabsTrigger value="gastos">Gastos ({data.expenses.length})</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos ({data.income.length})</TabsTrigger>
          <TabsTrigger value="inversion">
            Inversión ({monthInvestmentMovements.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gastos">
          <TransactionList
            kind="expense"
            items={data.expenses}
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
