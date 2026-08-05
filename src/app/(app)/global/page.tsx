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

export const metadata = { title: "Visión global" };

function shortMonth(month: string) {
  return new Date(month + "T00:00:00").toLocaleDateString("es-ES", {
    month: "short",
    year: "2-digit",
  });
}

export default async function GlobalPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [summaries, { data: categoryRows }, { data: investmentRows }] =
    await Promise.all([
      getAllMonthlySummaries(user.id),
      supabase.from("expenses_by_category").select("*").eq("user_id", user.id),
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
  const projectedInvestedNow =
    summaries.length > 0
      ? investmentProjectedValueAtMonth(
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
  const avgSavings = roundCents(
    summaries.reduce((s, m) => s + Number(m.savings), 0) / summaries.length
  );

  const bestSavings = [...summaries].sort((a, b) => b.savings - a.savings)[0];
  const worstExpenses = [...summaries].sort(
    (a, b) => b.total_expenses - a.total_expenses
  )[0];

  // Agregado histórico por categoría (para "dónde más gastas")
  const byCategory = new Map<string, CategoryTotal>();
  for (const row of (categoryRows ?? []) as CategoryTotal[]) {
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
  const last12CategoryRows = ((categoryRows ?? []) as CategoryTotal[]).filter((row) =>
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
        <StatCard
          label="Ahorro total"
          value={formatMoney(roundCents(totalIncome - totalExpenses))}
        />
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
          label="Proyección inversión"
          value={formatMoney(projectedInvestedNow)}
          helper="Con rentabilidad esperada"
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
