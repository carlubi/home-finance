import { redirect } from "next/navigation";
import { Landmark, Receipt, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, formatMoney, monthStart } from "@/lib/format";
import {
  investmentActualValueAtMonth,
  roundCents,
} from "@/lib/finance";
import type {
  CategoryTotal,
  FamilyExpense,
  FamilyRecurringExpense,
  Investment,
  MonthlySummary,
  SharedExpense,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { ChartCard } from "@/components/charts/chart-card";
import { CategoryDonut } from "@/components/charts/category-donut";
import { StatCard } from "@/components/dashboard/summary-cards";
import { recurringMonthlyAmount } from "@/lib/recurring";

export const metadata = { title: "Visión global" };

const SECTION_COLORS = ["#2a78d6", "#4a3aa7", "#eb6834"];
const INVESTMENT_COLORS = [
  "#1baf7a",
  "#eda100",
  "#4a3aa7",
  "#e34948",
  "#2a78d6",
  "#e87ba4",
];

function monthKey(value: string) {
  return `${value.slice(0, 7)}-01`;
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

function recurringFamilyTotalUntilNow(
  expenses: Pick<FamilyRecurringExpense, "monthly_amount" | "entry_kind" | "frequency" | "active" | "starts_on" | "ends_on">[],
  currentMonth: string
) {
  return expenses.reduce((total, expense) => {
    if (!expense.active || expense.starts_on > currentMonth) return total;

    const start = monthKey(expense.starts_on);
    const end = expense.ends_on && expense.ends_on < currentMonth
      ? monthKey(expense.ends_on)
      : currentMonth;

    if (start > end) return total;
    if (expense.entry_kind === "income") return total;
    return total + recurringMonthlyAmount(Number(expense.monthly_amount ?? 0), expense.frequency ?? "monthly") * monthsBetween(start, end).length;
  }, 0);
}

function categoryTotal(
  userId: string,
  name: string,
  total: number,
  color: string,
  id: string
): CategoryTotal {
  return {
    user_id: userId,
    month: "",
    category_id: id,
    category_name: name,
    category_color: color,
    total: roundCents(total),
    num_expenses: 1,
  };
}

function mapRows<T>(rows: T[] | null | undefined) {
  return rows ?? [];
}

type PersonalExpenseRow = {
  name: string;
  amount: number;
  occurred_at: string;
};

type PersonalFixedExpenseRow = {
  name: string;
  amount: number | null;
  entry_kind: "expense" | "income";
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
};

function comparableExpenseName(name: string) {
  return name.trim().toLocaleLowerCase("es-ES");
}

function personalFixedExpenseIsActiveInMonth(
  expense: PersonalFixedExpenseRow,
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

function activePersonalFixedExpensesForMonth(
  fixedExpenses: PersonalFixedExpenseRow[],
  month: string
) {
  const activeExpenses = fixedExpenses.filter((expense) =>
    personalFixedExpenseIsActiveInMonth(expense, month)
  );
  const seen = new Set<string>();

  return [...activeExpenses]
    .sort((a, b) => {
      const aStart = a.starts_on ?? a.created_at.slice(0, 10);
      const bStart = b.starts_on ?? b.created_at.slice(0, 10);
      return bStart.localeCompare(aStart) || b.created_at.localeCompare(a.created_at);
    })
    .filter((expense) => {
      const key = `${comparableExpenseName(expense.name)}:${Number(expense.amount ?? 0)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizePersonalSummaries(
  summaries: MonthlySummary[],
  expenses: PersonalExpenseRow[],
  fixedExpenses: PersonalFixedExpenseRow[]
) {
  return summaries.map((summary) => {
    const monthExpenses = expenses.filter(
      (expense) => monthKey(expense.occurred_at) === summary.month
    );
    const activeFixedExpenses = activePersonalFixedExpensesForMonth(
      fixedExpenses,
      summary.month
    );
    const actualTotal = monthExpenses.reduce(
      (total, expense) => total + Number(expense.amount ?? 0),
      0
    );
    const fixedTotal = activeFixedExpenses.reduce(
      (total, expense) => total + recurringMonthlyAmount(Number(expense.amount ?? 0), expense.frequency ?? "monthly"),
      0
    );
    const representedFixedTotal = activeFixedExpenses
      .filter((fixedExpense) =>
        monthExpenses.some(
          (expense) =>
            comparableExpenseName(expense.name) ===
              comparableExpenseName(fixedExpense.name) &&
            Math.abs(
              Number(expense.amount ?? 0) - Number(fixedExpense.amount ?? 0)
            ) < 0.01
        )
      )
      .reduce((total, expense) => total + Number(expense.amount ?? 0), 0);
    const summaryIncludesFixedExpenses =
      fixedTotal > 0 &&
      Number(summary.total_expenses ?? 0) >= actualTotal + fixedTotal - 0.01;
    const unrepresentedFixedTotal = fixedTotal - representedFixedTotal;
    const adjustment = summaryIncludesFixedExpenses
      ? actualTotal + unrepresentedFixedTotal - Number(summary.total_expenses ?? 0)
      : unrepresentedFixedTotal;

    return {
      ...summary,
      total_expenses: roundCents(Number(summary.total_expenses ?? 0) + adjustment),
    };
  });
}

export default async function GlobalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  const currentMonth = monthStart(new Date());
  const nextMonth = addMonths(currentMonth, 1);

  const [
    { data: summaryRows },
    { data: personalExpenseRows },
    { data: personalFixedExpenseRows },
    { data: familyExpenseRows },
    { data: familyRecurringRows },
    { data: groupRows },
    { data: investmentRows },
  ] = await Promise.all([
    supabase
      .from("monthly_summary")
      .select("*")
      .eq("user_id", user.id)
      .order("month", { ascending: true }),
    supabase
      .from("expenses")
      .select("name, amount, occurred_at")
      .eq("user_id", user.id),
    supabase
      .from("fixed_expenses")
      .select("name, amount, entry_kind, frequency, active, starts_on, ends_on, created_at")
      .eq("user_id", user.id),
    supabase
      .from("family_expenses")
      .select("amount, occurred_at")
      .eq("family_unit_id", familyUnit?.id ?? ""),
    supabase
      .from("family_recurring_expenses")
      .select("monthly_amount, entry_kind, frequency, active, starts_on, ends_on")
      .eq("family_unit_id", familyUnit?.id ?? ""),
    supabase.from("shared_groups").select("id"),
    supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const groups = mapRows(groupRows as { id: string }[] | null | undefined);
  const groupIds = groups.map((group) => group.id);
  const sharedExpenseRows = groupIds.length > 0
    ? (await supabase
        .from("shared_expenses")
        .select("total_amount, occurred_at")
        .in("group_id", groupIds)).data
    : [];

  const summaries = mapRows(summaryRows as MonthlySummary[] | null | undefined);
  const normalizedPersonalSummaries = normalizePersonalSummaries(
    summaries,
    mapRows(personalExpenseRows as PersonalExpenseRow[] | null | undefined),
    mapRows(
      personalFixedExpenseRows as PersonalFixedExpenseRow[] | null | undefined
    )
  );
  const familyExpenses = mapRows(
    familyExpenseRows as Pick<FamilyExpense, "amount" | "occurred_at">[] | null | undefined
  );
  const familyRecurringExpenses = mapRows(
    familyRecurringRows as Pick<FamilyRecurringExpense, "monthly_amount" | "entry_kind" | "frequency" | "active" | "starts_on" | "ends_on">[] | null | undefined
  );
  const sharedExpenses = mapRows(
    sharedExpenseRows as Pick<SharedExpense, "total_amount" | "occurred_at">[] | null | undefined
  );
  const investments = mapRows(investmentRows as Investment[] | null | undefined);

  const personalExpensesTotal = normalizedPersonalSummaries.reduce(
    (total, month) => total + Number(month.total_expenses ?? 0),
    0
  );
  const totalIncome = summaries.reduce(
    (total, month) => total + Number(month.total_income ?? 0),
    0
  );
  const familyExpensesTotal =
    familyExpenses
      .filter((expense) => expense.occurred_at < nextMonth)
      .reduce((total, expense) => total + Number(expense.amount ?? 0), 0) +
    recurringFamilyTotalUntilNow(familyRecurringExpenses, currentMonth);
  const sharedExpensesTotal = sharedExpenses
    .filter((expense) => expense.occurred_at < nextMonth)
    .reduce((total, expense) => total + Number(expense.total_amount ?? 0), 0);
  const sectionTotals = [
    ["Gastos personales", personalExpensesTotal],
    ["Gastos unidad familiar", familyExpensesTotal],
    ["Gastos compartidos", sharedExpensesTotal],
  ] as const;
  const sectionData = sectionTotals
    .map(([name, total], index) =>
      categoryTotal(user.id, name, total, SECTION_COLORS[index], `section-${index}`)
    )
    .filter((item) => item.total > 0);
  const totalExpenses = sectionData.reduce((total, item) => total + Number(item.total), 0);

  const investmentData = investments
    .map((investment, index) =>
      categoryTotal(
        user.id,
        investment.name,
        investmentActualValueAtMonth([investment], currentMonth),
        INVESTMENT_COLORS[index % INVESTMENT_COLORS.length],
        investment.id
      )
    )
    .filter((item) => item.total > 0);
  const totalInvestments = investmentData.reduce(
    (total, item) => total + Number(item.total),
    0
  );

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-medium text-primary">Tu panorama financiero</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Visión global</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Un resumen conjunto de tus gastos personales, familiares, compartidos e inversiones.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Gastos totales" value={formatMoney(totalExpenses)} icon={Receipt} />
        <StatCard label="Ingresos totales" value={formatMoney(totalIncome)} icon={Wallet} />
        <StatCard label="Inversiones realizadas" value={formatMoney(totalInvestments)} icon={Landmark} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Gastos por sección"
          description="Acumulado hasta ahora"
          fileName="gastos-por-seccion"
        >
          <CategoryDonut
            data={sectionData}
            emptyLabel="Todavía no hay gastos registrados."
          />
        </ChartCard>

        <ChartCard
          title="Inversiones por producto"
          description={`Valor acumulado a ${currentMonth.slice(0, 7)}`}
          fileName="inversiones-por-producto"
        >
          <CategoryDonut
            data={investmentData}
            emptyLabel="Todavía no hay inversiones registradas."
          />
        </ChartCard>
      </div>

    </div>
  );
}
