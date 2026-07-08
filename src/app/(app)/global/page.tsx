import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllMonthlySummaries } from "@/lib/data";
import { formatMoney, formatMonth } from "@/lib/format";
import { roundCents } from "@/lib/finance";
import type { CategoryTotal } from "@/lib/types";
import { ChartCard } from "@/components/charts/chart-card";
import { IncomeExpenseBars } from "@/components/charts/income-expense-bars";
import { SavingsTrend } from "@/components/charts/savings-trend";
import { CategoryDonut } from "@/components/charts/category-donut";
import { StatCard } from "@/components/dashboard/summary-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Visión global" };

function shortMonth(month: string) {
  return new Date(month + "T00:00:00").toLocaleDateString("es-ES", {
    month: "short",
    year: "2-digit",
  });
}

export default async function GlobalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [summaries, { data: categoryRows }] = await Promise.all([
    getAllMonthlySummaries(user.id),
    supabase.from("expenses_by_category").select("*").eq("user_id", user.id),
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
          label="Mes con más ahorro"
          value={bestSavings ? formatMonth(bestSavings.month) : "—"}
        />
        <StatCard
          label="Mes con más gasto"
          value={worstExpenses ? formatMonth(worstExpenses.month) : "—"}
        />
      </div>

      <ChartCard
        title="Evolución del ahorro"
        description="Últimos 12 meses"
        fileName="evolucion-ahorro"
      >
        <SavingsTrend
          data={last12.map((m) => ({
            label: shortMonth(m.month),
            Ahorro: Number(m.savings),
          }))}
        />
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
