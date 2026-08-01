import { monthStart } from "./format";
import type {
  Category,
  Expense,
  MonthlyBudgetOutcome,
  MonthlyBudgetPlan,
} from "@/lib/types";

export type BudgetIntensity = "green" | "orange" | "red";

export interface MonthlyBudgetView {
  month: string;
  plan: MonthlyBudgetPlan | null;
  plannedTotal: number;
  actualTotal: number;
  intensity: BudgetIntensity;
  difference: number;
  suggestedOutcome: MonthlyBudgetOutcome | null;
}

export interface YearExpenseMonthView {
  month: string;
  total: number;
  topExpenses: Expense[];
  expenses: Expense[];
}

export function normalizeBudgetMonth(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-01$/.test(raw)) return raw;
  return monthStart(new Date());
}

export function buildBudgetMonths(year = new Date().getFullYear()) {
  return Array.from({ length: 12 }, (_, index) =>
    monthStart(new Date(year, index, 1))
  );
}

export function sumBudgetPlan(plan: MonthlyBudgetPlan | null) {
  return (plan?.monthly_budget_items ?? []).reduce(
    (sum, item) => sum + Number(item.planned_amount ?? 0),
    0
  );
}

export function getBudgetIntensity(total: number, maxTotal: number): BudgetIntensity {
  if (total <= 0 || maxTotal <= 0) return "green";
  const ratio = total / maxTotal;
  if (ratio >= 0.85) return "red";
  if (ratio >= 0.6) return "orange";
  return "green";
}

export function getSuggestedOutcome(
  plannedTotal: number,
  actualTotal: number
): MonthlyBudgetOutcome | null {
  if (plannedTotal <= 0) return null;
  const ratio = actualTotal / plannedTotal;
  if (ratio < 0.98) return "under";
  if (ratio <= 1.02) return "met";
  return "over";
}

export function buildBudgetViews({
  plans,
  actualTotals,
  months,
}: {
  plans: MonthlyBudgetPlan[];
  actualTotals: Map<string, number>;
  months: string[];
}): MonthlyBudgetView[] {
  const plansByMonth = new Map(plans.map((plan) => [plan.month, plan]));
  const totalsByMonth = new Map(
    months.map((month) => {
      const plan = plansByMonth.get(month) ?? null;
      return [month, sumBudgetPlan(plan)];
    })
  );
  const maxTotal = Math.max(0, ...Array.from(totalsByMonth.values()));

  return months.map((month) => {
    const plan = plansByMonth.get(month) ?? null;
    const plannedTotal = totalsByMonth.get(month) ?? 0;
    const actualTotal = actualTotals.get(month) ?? 0;

    return {
      month,
      plan,
      plannedTotal,
      actualTotal,
      intensity: getBudgetIntensity(plannedTotal, maxTotal),
      difference: actualTotal - plannedTotal,
      suggestedOutcome: getSuggestedOutcome(plannedTotal, actualTotal),
    };
  });
}

export function expenseCategories(categories: Category[]) {
  return categories.filter((category) => category.kind === "expense");
}

export function buildYearExpenseOverview({
  months,
  expenses,
}: {
  months: string[];
  expenses: Expense[];
}): YearExpenseMonthView[] {
  const byMonth = new Map<string, Expense[]>(
    months.map((month) => [month, []])
  );

  for (const expense of expenses) {
    const month = `${expense.occurred_at.slice(0, 7)}-01`;
    const monthExpenses = byMonth.get(month);
    if (monthExpenses) {
      monthExpenses.push(expense);
    }
  }

  return months.map((month) => {
    const monthExpenses = byMonth.get(month) ?? [];
    const expensesByDate = [...monthExpenses].sort((a, b) =>
      b.occurred_at.localeCompare(a.occurred_at)
    );
    const expensesByAmount = [...monthExpenses].sort(
      (a, b) => Number(b.amount) - Number(a.amount)
    );

    return {
      month,
      total: monthExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
      topExpenses: expensesByAmount.slice(0, 3),
      expenses: expensesByDate,
    };
  });
}
