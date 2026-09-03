import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Import,
  Receipt,
  Users,
  WalletCards,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { familyCategoryColor } from "@/lib/family";
import { addMonths, formatMoney, formatMonth, monthStart } from "@/lib/format";
import type {
  CategoryTotal,
  FamilyDisplayExpense,
  FamilyExpense,
  FamilyRecurringExpense,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { FamilyExpenseTrend } from "@/components/charts/family-expense-trend";
import { ChartCard } from "@/components/charts/chart-card";
import { StatCard } from "@/components/dashboard/summary-cards";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { FamilyExpenseTable } from "@/components/family/family-expense-table";
import { FamilyRecurringSettingsDialog } from "@/components/family/family-recurring-dialog";
import { CategoryDonut } from "@/components/charts/category-donut";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Gastos unidad familiar" };

function monthFromSearchParam(mes?: string) {
  return /^\d{4}-\d{2}$/.test(mes ?? "") ? `${mes}-01` : monthStart(new Date());
}

function monthKey(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function recurringIsActive(expense: FamilyRecurringExpense, month: string) {
  return (
    expense.active &&
    expense.starts_on <= month &&
    (!expense.ends_on || expense.ends_on >= month)
  );
}

function monthsBetween(start: string, end: string) {
  const months: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function perPerson(amount: number, peopleCount: number) {
  return amount / peopleCount;
}

export default async function FamilyExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const month = monthFromSearchParam(mes);
  const currentMonth = monthStart(new Date());
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: familyExpenseRows }, { data: recurringRows }] = await Promise.all([
    supabase
      .from("family_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("family_recurring_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("starts_on", { ascending: false }),
  ]);

  const familyExpenses = (familyExpenseRows ?? []) as FamilyExpense[];
  const recurringExpenses = (recurringRows ?? []) as FamilyRecurringExpense[];
  const monthExpenses = familyExpenses.filter((expense) => monthKey(expense.occurred_at) === month);
  const activeRecurring = recurringExpenses.filter((expense) => recurringIsActive(expense, month));
  const displayRows: FamilyDisplayExpense[] = [
    ...activeRecurring.map((expense) => ({
      id: `recurring-${expense.id}`,
      name: expense.name,
      category: expense.category,
      amount: Number(expense.monthly_amount),
      occurred_at: month,
      people_count: expense.people_count,
      source: "recurring" as const,
      recurring_id: expense.id,
    })),
    ...monthExpenses.map((expense) => ({
      id: expense.id,
      name: expense.name,
      category: expense.category,
      amount: Number(expense.amount),
      occurred_at: expense.occurred_at,
      people_count: expense.people_count,
      source: "manual" as const,
    })),
  ].sort((a, b) => {
    if (a.source !== b.source) return a.source === "recurring" ? -1 : 1;
    return b.occurred_at.localeCompare(a.occurred_at);
  });

  const historicalDates = [
    ...familyExpenses
      .filter((expense) => expense.occurred_at <= addMonths(currentMonth, 1))
      .map((expense) => monthKey(expense.occurred_at)),
    ...recurringExpenses
      .filter((expense) => expense.starts_on <= currentMonth)
      .map((expense) => expense.starts_on),
  ];
  const firstMonth = historicalDates.length > 0
    ? historicalDates.sort()[0]
    : currentMonth;
  const overviewMonths = monthsBetween(
    firstMonth <= currentMonth ? firstMonth : currentMonth,
    currentMonth
  );

  const monthlyOverview = overviewMonths.map((overviewMonth) => {
    const punctual = familyExpenses.filter(
      (expense) => monthKey(expense.occurred_at) === overviewMonth
    );
    const recurring = recurringExpenses.filter((expense) =>
      recurringIsActive(expense, overviewMonth)
    );
    const total =
      punctual.reduce((sum, expense) => sum + Number(expense.amount), 0) +
      recurring.reduce((sum, expense) => sum + Number(expense.monthly_amount), 0);
    const totalPerPerson =
      punctual.reduce(
        (sum, expense) => sum + perPerson(Number(expense.amount), expense.people_count),
        0
      ) +
      recurring.reduce(
        (sum, expense) =>
          sum + perPerson(Number(expense.monthly_amount), expense.people_count),
        0
      );
    return { month: overviewMonth, total, totalPerPerson };
  });

  const categoryTotals = new Map<string, number>();
  for (const overviewMonth of overviewMonths) {
    for (const expense of familyExpenses) {
      if (monthKey(expense.occurred_at) !== overviewMonth) continue;
      categoryTotals.set(
        expense.category,
        (categoryTotals.get(expense.category) ?? 0) + Number(expense.amount)
      );
    }
    for (const expense of recurringExpenses) {
      if (!recurringIsActive(expense, overviewMonth)) continue;
      categoryTotals.set(
        expense.category,
        (categoryTotals.get(expense.category) ?? 0) + Number(expense.monthly_amount)
      );
    }
  }

  const globalCategoryData: CategoryTotal[] = [...categoryTotals.entries()].map(
    ([category, total]) => ({
      user_id: user.id,
      month: currentMonth,
      category_id: null,
      category_name: category,
      category_color: familyCategoryColor(category),
      total,
      num_expenses: 1,
    })
  );
  const totalUntilNow = monthlyOverview.reduce((sum, item) => sum + item.total, 0);
  const totalPerPersonUntilNow = monthlyOverview.reduce(
    (sum, item) => sum + item.totalPerPerson,
    0
  );
  const mostExpensiveMonth = [...monthlyOverview].sort((a, b) => b.total - a.total)[0];
  const last12Months = monthlyOverview.slice(-12);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Coste de mantener la vivienda</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Gastos unidad familiar</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Una vista separada para entender cuánto cuesta la casa y cómo se reparte entre las personas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={{
                  pathname: "/importar",
                  query: { scope: "family", mes: month.slice(0, 7) },
                }}
              />
            }
            variant="default"
            className="shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          >
            <Import className="size-4" />
            Importar documentos
          </Button>
          <FamilyRecurringSettingsDialog
            expenses={recurringExpenses}
            defaultMonth={month}
          />
          <Suspense>
            <MonthSwitcher month={month} />
          </Suspense>
        </div>
      </div>

      <Tabs defaultValue="month" className="grid gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="month">Vista mensual</TabsTrigger>
          <TabsTrigger value="global">Visión global</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
            <StatCard label="Total del mes" value={formatMoney(displayRows.reduce((sum, row) => sum + row.amount, 0))} icon={Receipt} />
            <StatCard label="Total por persona" value={formatMoney(displayRows.reduce((sum, row) => sum + perPerson(row.amount, row.people_count), 0))} icon={Users} />
          </div>
          <FamilyExpenseTable
            month={month}
            rows={displayRows}
            manualExpenses={monthExpenses}
          />
        </TabsContent>

        <TabsContent value="global" className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Gastado hasta ahora" value={formatMoney(totalUntilNow)} icon={Receipt} />
            <StatCard label="Coste por persona" value={formatMoney(totalPerPersonUntilNow)} icon={Users} />
            <StatCard
              label="Mes más costoso"
              value={mostExpensiveMonth ? formatMonth(mostExpensiveMonth.month) : "—"}
              helper={mostExpensiveMonth ? formatMoney(mostExpensiveMonth.total) : undefined}
              icon={WalletCards}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Gasto por categoría" description="Acumulado hasta ahora" fileName="gastos-familiares-categoria">
              <CategoryDonut data={globalCategoryData} emptyLabel="Todavía no hay gastos familiares." />
            </ChartCard>
            <ChartCard title="Evolución del gasto" description="Últimos 12 meses" fileName="evolucion-gastos-familiares">
              <FamilyExpenseTrend
                data={last12Months.map((item) => ({
                  label: new Date(`${item.month}T00:00:00`).toLocaleDateString("es-ES", {
                    month: "short",
                    year: "2-digit",
                  }),
                  "Gasto total": item.total,
                  "Por persona": item.totalPerPerson,
                }))}
              />
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
