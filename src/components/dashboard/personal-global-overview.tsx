import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllMonthlySummaries } from "@/lib/data";
import { formatMoney, formatMonth } from "@/lib/format";
import {
  investmentActualValueAtMonth,
  investmentMonthlyContribution,
  investmentProjectedValueAtMonth,
  roundCents,
} from "@/lib/finance";
import type { CategoryTotal, Investment } from "@/lib/types";
import { ChartCard } from "@/components/charts/chart-card";
import { CategoryExpenseTrend } from "@/components/charts/category-expense-trend";
import { IncomeExpenseBars } from "@/components/charts/income-expense-bars";
import { SavingsTrend } from "@/components/charts/savings-trend";
import { CategoryDonut } from "@/components/charts/category-donut";
import { StatCard } from "@/components/dashboard/summary-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function shortMonth(month: string) {
  return new Date(month + "T00:00:00").toLocaleDateString("es-ES", {
    month: "short",
    year: "2-digit",
  });
}

type CategorySnapshot = {
  name: string | null;
  color: string | null;
};

type CategoryRelation = CategorySnapshot | CategorySnapshot[] | null;

type ExpenseCategoryRow = {
  category_id: string | null;
  amount: number;
  occurred_at: string;
  categories?: CategoryRelation;
};

type FixedExpenseCategoryRow = {
  user_id: string;
  category_id: string | null;
  amount: number | null;
  active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  categories?: CategoryRelation;
};

function resolveCategory(category: CategoryRelation | undefined) {
  if (Array.isArray(category)) return category[0] ?? null;
  return category ?? null;
}

function addCategoryAmount(
  rowsByKey: Map<string, CategoryTotal>,
  {
    userId,
    month,
    categoryId,
    category,
    amount,
  }: {
    userId: string;
    month: string;
    categoryId: string | null;
    category: CategorySnapshot | null;
    amount: number;
  }
) {
  const key = `${month}:${categoryId ?? "none"}`;
  const existing = rowsByKey.get(key);

  if (existing) {
    existing.total = Number(existing.total) + amount;
    existing.num_expenses = Number(existing.num_expenses ?? 0) + 1;
    return;
  }

  rowsByKey.set(key, {
    user_id: userId,
    month,
    category_id: categoryId,
    category_name: category?.name ?? "Sin categoría",
    category_color: category?.color ?? null,
    total: amount,
    num_expenses: 1,
  });
}

function fixedExpenseIsActiveInMonth(
  expense: FixedExpenseCategoryRow,
  month: string
) {
  const startsOn = expense.starts_on ?? expense.created_at.slice(0, 10);
  return (
    expense.active &&
    Number(expense.amount ?? 0) > 0 &&
    startsOn <= month &&
    (!expense.ends_on || expense.ends_on >= month)
  );
}

export default async function PersonalGlobalOverview() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [
    summaries,
    { data: expenseCategoryRows },
    { data: fixedExpenseRows },
    { data: investmentRows },
  ] =
    await Promise.all([
      getAllMonthlySummaries(user.id),
      supabase
        .from("expenses")
        .select("category_id, amount, occurred_at, categories(name, color)")
        .eq("user_id", user.id),
      supabase
        .from("fixed_expenses")
        .select("user_id, category_id, amount, active, starts_on, ends_on, created_at, categories(name, color)")
        .eq("user_id", user.id),
      supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  if (summaries.length === 0) {
    return (
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Visión global</h1>
        <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aún no hay datos suficientes. Registra gastos e ingresos para ver tu
          evolución anual.
        </p>
      </div>
    );
  }

  const last12 = summaries.slice(-12);
  const investments = (investmentRows ?? []) as Investment[];
  const investedNow =
    summaries.length > 0
      ? investmentActualValueAtMonth(
          investments,
          summaries[summaries.length - 1].month
        )
      : 0;
  const monthlyInvestment = investmentMonthlyContribution(
    investments,
    summaries[summaries.length - 1].month
  );
  const totalIncome = summaries.reduce((s, m) => s + Number(m.total_income), 0);
  const totalExpenses = summaries.reduce((s, m) => s + Number(m.total_expenses), 0);
  const totalSavings = roundCents(totalIncome - totalExpenses);
  const totalNetWorth = roundCents(totalSavings + investedNow);
  const avgSavings = roundCents(
    summaries.reduce((s, m) => s + Number(m.savings), 0) / summaries.length
  );

  const bestSavings = [...summaries].sort((a, b) => b.savings - a.savings)[0];
  const worstExpenses = [...summaries].sort(
    (a, b) => b.total_expenses - a.total_expenses
  )[0];

  const categoryRowsByKey = new Map<string, CategoryTotal>();
  const summaryMonths = summaries.map((summary) => summary.month);

  for (const row of (expenseCategoryRows ?? []) as ExpenseCategoryRow[]) {
    addCategoryAmount(categoryRowsByKey, {
      userId: user.id,
      month: row.occurred_at.slice(0, 7) + "-01",
      categoryId: row.category_id,
      category: resolveCategory(row.categories),
      amount: Number(row.amount),
    });
  }

  for (const expense of (fixedExpenseRows ?? []) as FixedExpenseCategoryRow[]) {
    for (const month of summaryMonths) {
      if (!fixedExpenseIsActiveInMonth(expense, month)) continue;
      addCategoryAmount(categoryRowsByKey, {
        userId: user.id,
        month,
        categoryId: expense.category_id,
        category: resolveCategory(expense.categories),
        amount: Number(expense.amount ?? 0),
      });
    }
  }

  const categoryRows = [...categoryRowsByKey.values()];

  // Agregado histórico por categoría (para "dónde más gastas")
  const byCategory = new Map<string, CategoryTotal>();
  for (const row of categoryRows) {
    const key = row.category_id ?? "none";
    const existing = byCategory.get(key);
    if (existing) {
      existing.total = Number(existing.total) + Number(row.total);
    } else {
      byCategory.set(key, { ...row, total: Number(row.total) });
    }
  }
  const topCategories = [...byCategory.values()];
  const last12MonthKeys = new Set(last12.map((m) => m.month));
  const last12CategoryRows = categoryRows.filter((row) =>
    last12MonthKeys.has(row.month)
  );
  const categoryTrendTotals = new Map<string, CategoryTotal>();

  for (const row of last12CategoryRows) {
    const key = row.category_id ?? "none";
    const existing = categoryTrendTotals.get(key);
    if (existing) {
      existing.total = Number(existing.total) + Number(row.total);
    } else {
      categoryTrendTotals.set(key, {
        ...row,
        total: Number(row.total),
        category_name: row.category_name ?? "Sin categoría",
      });
    }
  }

  const categoryTrendSeries = [...categoryTrendTotals.entries()]
    .sort(([, a], [, b]) => Number(b.total) - Number(a.total))
    .slice(0, 5)
    .map(([key, row]) => ({
      key,
      label: row.category_name ?? "Sin categoría",
      color: row.category_color,
    }));

  const categoryTrendByMonth = new Map<string, Map<string, number>>();
  for (const row of last12CategoryRows) {
    const key = row.category_id ?? "none";
    if (!categoryTrendByMonth.has(row.month)) {
      categoryTrendByMonth.set(row.month, new Map());
    }
    categoryTrendByMonth
      .get(row.month)!
      .set(key, Number(row.total));
  }
  const categoryTrendData = last12.map((monthRow) => {
    const values = categoryTrendByMonth.get(monthRow.month);
    return {
      label: shortMonth(monthRow.month),
      ...Object.fromEntries(
        categoryTrendSeries.map((series) => [
          series.key,
          values?.get(series.key) ?? 0,
        ])
      ),
    };
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Visión global</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ahorro medio mensual" value={formatMoney(avgSavings)} />
        <StatCard label="Ahorro total" value={formatMoney(totalSavings)} />
        <StatCard
          label="Inversión acumulada"
          value={formatMoney(investedNow)}
          helper={
            monthlyInvestment > 0
              ? `${formatMoney(monthlyInvestment)} recurrentes al mes`
              : undefined
          }
        />
        <StatCard
          label="Patrimonio Total"
          value={formatMoney(totalNetWorth)}
          helper="Ahorro + inversión"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <StatCard
          label="Mes con más ahorro"
          value={bestSavings ? formatMonth(bestSavings.month) : "—"}
        />
        <StatCard
          label="Mes con más gasto"
          value={worstExpenses ? formatMonth(worstExpenses.month) : "—"}
        />
      </div>

      <ChartCard
        title="Evolución de mis finanzas"
        description="Últimos 12 meses"
        fileName="evolucion-mis-finanzas"
      >
        <Tabs defaultValue="ahorro">
          <TabsList>
            <TabsTrigger value="ahorro">Ahorro</TabsTrigger>
            <TabsTrigger value="categorias">Gasto por categoría</TabsTrigger>
          </TabsList>
          <TabsContent value="ahorro">
            <SavingsTrend
              data={last12.map((m) => {
                const base = {
                  label: shortMonth(m.month),
                  Ahorro: Number(m.savings),
                };

                if (investments.length === 0) return base;

                return {
                  ...base,
                  "Ahorro + inversión": roundCents(
                    Number(m.savings) +
                      investmentActualValueAtMonth(investments, m.month)
                  ),
                  "Con rentabilidad": roundCents(
                    Number(m.savings) +
                      investmentProjectedValueAtMonth(investments, m.month)
                  ),
                };
              })}
            />
          </TabsContent>
          <TabsContent value="categorias">
            <CategoryExpenseTrend
              data={categoryTrendData}
              series={categoryTrendSeries}
            />
          </TabsContent>
        </Tabs>
      </ChartCard>

      <ChartCard
        title="Ingresos vs gastos"
        description="Últimos 12 meses"
        fileName="evolucion-ingresos-gastos"
      >
        <IncomeExpenseBars
          data={last12.map((m) => ({
            label: shortMonth(m.month),
            Ingresos: Number(m.total_income),
            Gastos: Number(m.total_expenses),
          }))}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Dónde más gastas"
          description="Acumulado histórico por categoría"
          fileName="top-categorias"
        >
          <CategoryDonut data={topCategories} />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5 font-medium">Mes</th>
                    <th className="py-1.5 text-right font-medium">Ingresos</th>
                    <th className="py-1.5 text-right font-medium">Gastos</th>
                    <th className="py-1.5 text-right font-medium">Ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summaries].reverse().map((m) => (
                    <tr key={m.month} className="border-t">
                      <td className="py-1.5">{formatMonth(m.month)}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatMoney(Number(m.total_income))}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatMoney(Number(m.total_expenses))}
                      </td>
                      <td className="py-1.5 text-right font-medium tabular-nums">
                        {formatMoney(Number(m.savings))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

