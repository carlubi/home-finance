import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getYearMonthlySummaries } from "@/lib/data";
import { addMonths, currentMadridMonth, formatMoney, formatMonth } from "@/lib/format";
import {
  investmentMonthlyOutflow,
  roundCents,
} from "@/lib/finance";
import type { CategoryTotal, Investment, MonthlySummary } from "@/lib/types";
import { ChartCard } from "@/components/charts/chart-card";
import { CategoryExpenseTrend } from "@/components/charts/category-expense-trend";
import { IncomeExpenseBars } from "@/components/charts/income-expense-bars";
import { SavingsTrend } from "@/components/charts/savings-trend";
import { CategoryDonut } from "@/components/charts/category-donut";
import { IncomeAllocation, type AllocationGroup } from "@/components/charts/income-allocation";
import { summarizeIncomeAllocation, type AllocationLine } from "@/lib/income-allocation";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { StatCard } from "@/components/dashboard/summary-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recurringMonthlyAmount } from "@/lib/recurring";

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
  id: string;
  name: string;
  category_id: string | null;
  amount: number;
  occurred_at: string;
  categories?: CategoryRelation;
};

type FixedExpenseCategoryRow = {
  id: string;
  name: string;
  user_id: string;
  category_id: string | null;
  amount: number | null;
  entry_kind: "expense" | "income";
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
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
    expense.entry_kind !== "income" && Number(expense.amount ?? 0) > 0 &&
    startsOn <= month &&
    (!expense.ends_on || expense.ends_on >= month)
  );
}

function comparableExpenseName(name: string) {
  return name.trim().toLocaleLowerCase("es-ES");
}

function isMortgageExpense(name: string, category: string | null | undefined) {
  return /hipoteca/i.test(name) || /hipoteca/i.test(category ?? "");
}

function activeFixedExpensesForMonth(
  fixedExpenses: FixedExpenseCategoryRow[],
  month: string
) {
  const activeExpenses = fixedExpenses.filter((expense) =>
    fixedExpenseIsActiveInMonth(expense, month)
  );
  const seen = new Set<string>();

  return [...activeExpenses]
    .sort((a, b) => {
      const aStart = a.starts_on ?? a.created_at.slice(0, 10);
      const bStart = b.starts_on ?? b.created_at.slice(0, 10);
      return bStart.localeCompare(aStart) || b.created_at.localeCompare(a.created_at);
    })
    .filter((expense) => {
      const key = `${comparableExpenseName(expense.name)}:${expense.category_id ?? "none"}:${Number(expense.amount ?? 0)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function fixedExpenseMatchesMonthExpense(
  fixedExpense: FixedExpenseCategoryRow,
  month: string,
  expenses: ExpenseCategoryRow[]
) {
  return expenses.some(
    (expense) =>
      expense.occurred_at.slice(0, 7) + "-01" === month &&
      comparableExpenseName(expense.name) ===
        comparableExpenseName(fixedExpense.name) &&
      Math.abs(Number(expense.amount ?? 0) - Number(fixedExpense.amount ?? 0)) <
        0.01
  );
}

function normalizeSummaries(
  summaries: MonthlySummary[],
  expenses: ExpenseCategoryRow[],
  fixedExpenses: FixedExpenseCategoryRow[]
) {
  return summaries.map((summary) => {
    const actualMonthExpenses = expenses.filter(
      (expense) => expense.occurred_at.slice(0, 7) + "-01" === summary.month
    );
    const activeFixedExpenses = activeFixedExpensesForMonth(
      fixedExpenses,
      summary.month
    );
    const actualTotal = actualMonthExpenses.reduce(
      (total, expense) => total + Number(expense.amount ?? 0),
      0
    );
    const fixedTotal = activeFixedExpenses.reduce(
      (total, expense) => total + recurringMonthlyAmount(Number(expense.amount ?? 0), expense.frequency ?? "monthly"),
      0
    );
    const representedFixedTotal = activeFixedExpenses
      .filter((expense) =>
        fixedExpenseMatchesMonthExpense(expense, summary.month, expenses)
      )
      .reduce((total, expense) => total + Number(expense.amount ?? 0), 0);
    const unrepresentedFixedTotal = fixedTotal - representedFixedTotal;
    const summaryIncludesFixedExpenses =
      fixedTotal > 0 &&
      Number(summary.total_expenses ?? 0) >= actualTotal + fixedTotal - 0.01;
    const adjustment = summaryIncludesFixedExpenses
      ? actualTotal + unrepresentedFixedTotal - Number(summary.total_expenses ?? 0)
      : unrepresentedFixedTotal;

    return {
      ...summary,
      total_expenses: roundCents(Number(summary.total_expenses ?? 0) + adjustment),
      savings: roundCents(Number(summary.savings ?? 0) - adjustment),
    };
  });
}

export default async function PersonalGlobalOverview() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const currentMonth = currentMadridMonth();
  const firstMonth = `${currentMonth.slice(0, 4)}-01-01`;
  const year = currentMonth.slice(0, 4);
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  const [{ data: mortgageRow }, { data: mortgagePayments }, { data: ownProfile }] = familyUnit ? await Promise.all([
    supabase.from("family_mortgages").select("started_on, fixed_payment, current_payment, rate_kind, variable_from, first_share_percent, first_borrower, second_borrower").eq("family_unit_id", familyUnit.id).maybeSingle(),
    supabase.from("family_mortgage_payments").select("month,payment").eq("family_unit_id", familyUnit.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]) : [{ data: null }, { data: [] }, { data: null }];

  const [
    summaries,
    { data: expenseCategoryRows },
    { data: fixedExpenseRows },
    { data: investmentRows },
  ] =
    await Promise.all([
      getYearMonthlySummaries(user.id, firstMonth, currentMonth),
      supabase
        .from("expenses")
        .select("id, name, category_id, amount, occurred_at, categories(name, color)")
        .eq("user_id", user.id)
        .gte("occurred_at", firstMonth)
        .lt("occurred_at", addMonths(currentMonth, 1)),
      supabase
        .from("fixed_expenses")
      .select("id, name, user_id, category_id, amount, entry_kind, frequency, active, starts_on, ends_on, created_at, categories(name, color)")
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
          Aún no hay datos de {year}. Registra gastos e ingresos para ver tu evolución anual.
        </p>
      </div>
    );
  }

  const expenseRows = (expenseCategoryRows ?? []) as ExpenseCategoryRow[];
  const fixedExpenseRowsTyped = (fixedExpenseRows ?? []) as FixedExpenseCategoryRow[];
  const normalizedSummaries = normalizeSummaries(
    summaries,
    expenseRows,
    fixedExpenseRowsTyped
  );
  const yearSummaries = normalizedSummaries;
  const investments = (investmentRows ?? []) as Investment[];
  const investedThisYear = roundCents(yearSummaries.reduce((sum, summary) =>
    sum + Number(summary.total_income) - Number(summary.total_expenses) - Number(summary.savings), 0
  ));
  const monthlyInvestment = investmentMonthlyOutflow(investments, currentMonth);
  const totalSavings = roundCents(normalizedSummaries.reduce((sum, m) => sum + Number(m.savings), 0));
  const annualAvailable = roundCents(totalSavings + investedThisYear);
  const avgSavings = roundCents(
    normalizedSummaries.reduce((s, m) => s + Number(m.savings), 0) /
      normalizedSummaries.length
  );

  const bestSavings = [...normalizedSummaries].sort((a, b) => b.savings - a.savings)[0];
  const worstExpenses = [...normalizedSummaries].sort(
    (a, b) => b.total_expenses - a.total_expenses
  )[0];

  const categoryRowsByKey = new Map<string, CategoryTotal>();
  const summaryMonths = normalizedSummaries.map((summary) => summary.month);

  for (const row of expenseRows) {
    addCategoryAmount(categoryRowsByKey, {
      userId: user.id,
      month: row.occurred_at.slice(0, 7) + "-01",
      categoryId: row.category_id,
      category: resolveCategory(row.categories),
      amount: Number(row.amount),
    });
  }

  for (const month of summaryMonths) {
    for (const expense of activeFixedExpensesForMonth(
      fixedExpenseRowsTyped,
      month
    )) {
      if (fixedExpenseMatchesMonthExpense(expense, month, expenseRows)) continue;
      addCategoryAmount(categoryRowsByKey, {
        userId: user.id,
        month,
        categoryId: expense.category_id,
        category: resolveCategory(expense.categories),
        amount: recurringMonthlyAmount(Number(expense.amount ?? 0), expense.frequency ?? "monthly"),
      });
    }
  }

  const categoryRows = [...categoryRowsByKey.values()];

  // Agregado del año vigente por categoría (para "dónde más gastas")
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
  const yearMonthKeys = new Set(yearSummaries.map((m) => m.month));
  const yearCategoryRows = categoryRows.filter((row) =>
    yearMonthKeys.has(row.month)
  );
  const categoryTrendTotals = new Map<string, CategoryTotal>();

  for (const row of yearCategoryRows) {
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
  for (const row of yearCategoryRows) {
    const key = row.category_id ?? "none";
    if (!categoryTrendByMonth.has(row.month)) {
      categoryTrendByMonth.set(row.month, new Map());
    }
    categoryTrendByMonth
      .get(row.month)!
      .set(key, Number(row.total));
  }
  const categoryTrendData = yearSummaries.map((monthRow) => {
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

  const allocationMonths = normalizedSummaries.filter((summary) => Number(summary.total_income) > 0);
  const recordedMortgage = new Map<string, number>((mortgagePayments ?? []).map((payment) => [payment.month.slice(0, 7), Number(payment.payment)]));
  const lastMortgageMonth = [...recordedMortgage.keys()].sort().at(-1) ?? "";
  const ownName = (ownProfile?.full_name ?? "").toLocaleLowerCase("es-ES");
  const firstName = (mortgageRow?.first_borrower ?? "").toLocaleLowerCase("es-ES");
  const secondName = (mortgageRow?.second_borrower ?? "").toLocaleLowerCase("es-ES");
  const mortgageShare = !secondName ? 1 : firstName && ownName.includes(firstName) ? Number(mortgageRow?.first_share_percent ?? 50) / 100 : ownName.includes(secondName) ? (100 - Number(mortgageRow?.first_share_percent ?? 50)) / 100 : 0.5;
  const allocation = summarizeIncomeAllocation(allocationMonths.map((summary) => {
    const expenses: AllocationLine[] = expenseRows
      .filter((row) => row.occurred_at.slice(0, 7) === summary.month.slice(0, 7))
      .map((row) => {
        const category = resolveCategory(row.categories)?.name ?? null;
        return {
          name: category ?? "Sin categoría",
          amount: Number(row.amount),
          mortgage: isMortgageExpense(row.name, category),
        };
      });
    for (const fixed of activeFixedExpensesForMonth(fixedExpenseRowsTyped, summary.month)) {
      if (fixedExpenseMatchesMonthExpense(fixed, summary.month, expenseRows)) continue;
      const category = resolveCategory(fixed.categories)?.name ?? null;
      expenses.push({
        name: category ?? "Sin categoría",
        amount: recurringMonthlyAmount(Number(fixed.amount ?? 0), fixed.frequency ?? "monthly"),
        mortgage: isMortgageExpense(fixed.name, category),
      });
    }
    const month = summary.month.slice(0, 7);
    const mortgagePayment = recordedMortgage.get(month) ?? (
      mortgageRow && month >= mortgageRow.started_on.slice(0, 7)
        && (lastMortgageMonth ? month > lastMortgageMonth : month === currentMonth.slice(0, 7))
        ? mortgageRow.rate_kind === "fixed" || (mortgageRow.rate_kind === "mixed" && month < mortgageRow.variable_from.slice(0, 7))
          ? Number(mortgageRow.fixed_payment)
          : Number(mortgageRow.current_payment ?? mortgageRow.fixed_payment)
        : 0
    );
    return {
      income: Number(summary.total_income),
      expenseTotal: Number(summary.total_expenses),
      expenses,
      investments: investments.map((investment) => ({
        name: investment.name,
        amount: investmentMonthlyOutflow([investment], summary.month),
      })).filter((investment) => investment.amount > 0),
      mortgageFallback: mortgageRow ? mortgagePayment * mortgageShare : 0,
    };
  }));
  const allocationGroups: AllocationGroup[] = [
    { key: "investment", label: "Inversión", amount: allocation.investment, color: "#1baf7a", details: allocation.investmentDetails },
    { key: "expenses", label: "Gastos Personales", amount: allocation.expenses, color: "#eb6834", details: allocation.expenseDetails },
    { key: "mortgage", label: "Gastos Casa · hipoteca", amount: allocation.mortgage, color: "#4a3aa7" },
    { key: "savings", label: "Ahorro", amount: allocation.savings, color: "#2a78d6" },
  ];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Visión global · {year}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ahorro medio mensual" value={formatMoney(avgSavings)} />
        <StatCard label={`Ahorro en ${year}`} value={formatMoney(totalSavings)} />
        <StatCard
          label={`Aportado a inversión en ${year}`}
          value={formatMoney(investedThisYear)}
          helper={
            monthlyInvestment > 0
              ? `${formatMoney(monthlyInvestment)} aportados este mes`
              : undefined
          }
        />
        <StatCard
          label={`Ahorro + inversión en ${year}`}
          value={formatMoney(annualAvailable)}
          helper="Suma de ahorro y aportaciones del año"
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
        title="¿A dónde van tus ingresos?"
        description={`Porcentaje del ingreso medio mensual · meses con ingresos de ${year}`}
        fileName="reparto-medio-ingresos"
      >
        <IncomeAllocation
          income={allocation.income}
          groups={allocationGroups}
          months={allocation.months}
          estimatedMortgage={allocation.estimatedMortgage}
        />
      </ChartCard>

      <ChartCard
        title="Evolución de mis finanzas"
        description={`Meses de ${year}`}
        fileName="evolucion-mis-finanzas"
      >
        <Tabs defaultValue="ahorro">
          <TabsList>
            <TabsTrigger value="ahorro">Ahorro</TabsTrigger>
            <TabsTrigger value="categorias">Gasto por categoría</TabsTrigger>
          </TabsList>
          <TabsContent value="ahorro">
            <SavingsTrend
              data={yearSummaries.map((m) => {
                const base = {
                  label: shortMonth(m.month),
                  Ahorro: Number(m.savings),
                };

                if (investments.length === 0) return base;

                return {
                  ...base,
                  "Ahorro + inversión": roundCents(Number(m.total_income) - Number(m.total_expenses)),
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
        description={`Meses de ${year}`}
        fileName="evolucion-ingresos-gastos"
      >
        <IncomeExpenseBars
          data={yearSummaries.map((m) => ({
            label: shortMonth(m.month),
            Ingresos: Number(m.total_income),
            Gastos: Number(m.total_expenses),
          }))}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Dónde más gastas"
          description={`Acumulado de ${year} por categoría`}
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
                  {[...normalizedSummaries].reverse().map((m) => (
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
