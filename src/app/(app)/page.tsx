import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMonthData } from "@/lib/data";
import { formatMonth, monthStart } from "@/lib/format";
import { pctChange, roundCents } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { CategoryDonut } from "@/components/charts/category-donut";
import { ChartCard } from "@/components/charts/chart-card";
import { IncomeExpenseBars } from "@/components/charts/income-expense-bars";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";
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

  const data = await getMonthData(user.id, month);
  const income = Number(data.current?.total_income ?? 0);
  const expenses = Number(data.current?.total_expenses ?? 0);
  const savings = roundCents(income - expenses);
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Resumen mensual</h1>
        <Suspense>
          <MonthSwitcher month={month} />
        </Suspense>
      </div>

      <SummaryCards
        income={income}
        expenses={expenses}
        savings={savings}
        savingsPct={data.current?.savings_pct ?? null}
        incomeDelta={pctChange(income, Number(data.previous?.total_income ?? 0))}
        expensesDelta={pctChange(expenses, Number(data.previous?.total_expenses ?? 0))}
        savingsDelta={pctChange(savings, Number(data.previous?.savings ?? 0))}
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
        </TabsList>
        <TabsContent value="gastos">
          <TransactionList
            kind="expense"
            items={data.expenses}
            categories={expenseCategories}
            userId={user.id}
            emptyLabel="No hay gastos registrados este mes. Añade el primero."
          />
        </TabsContent>
        <TabsContent value="ingresos">
          <TransactionList
            kind="income"
            items={data.income}
            categories={incomeCategories}
            userId={user.id}
            emptyLabel="No hay ingresos registrados este mes. Añade el primero."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
