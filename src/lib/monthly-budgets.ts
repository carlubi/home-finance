import { monthStart } from "./format";
import type {
  Category,
  CategoryTotal,
  MonthlyBudgetItem,
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

export interface YearBudgetMonthView {
  month: string;
  total: number;
  actualTotal: number;
  topItems: MonthlyBudgetItem[];
  items: MonthlyBudgetItem[];
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

export function buildYearBudgetOverview({
  months,
  plans,
  actualTotals,
}: {
  months: string[];
  plans: MonthlyBudgetPlan[];
  actualTotals: Map<string, number>;
}): YearBudgetMonthView[] {
  const plansByMonth = new Map(plans.map((plan) => [plan.month, plan]));

  return months.map((month) => {
    const items = plansByMonth.get(month)?.monthly_budget_items ?? [];
    const itemsByAmount = [...items].sort(
      (a, b) => Number(b.planned_amount) - Number(a.planned_amount)
    );

    return {
      month,
      total: items.reduce(
        (sum, item) => sum + Number(item.planned_amount),
        0
      ),
      actualTotal: actualTotals.get(month) ?? 0,
      topItems: itemsByAmount.slice(0, 3),
      items: itemsByAmount,
    };
  });
}

export function buildBudgetCategoryTotals({
  userId,
  months,
}: {
  userId: string;
  months: YearBudgetMonthView[];
}): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();

  for (const month of months) {
    for (const item of month.items) {
      const key = item.category_id ?? "none";
      const existing = totals.get(key);
      if (existing) {
        existing.total = Number(existing.total) + Number(item.planned_amount);
        existing.num_expenses = (existing.num_expenses ?? 0) + 1;
      } else {
        totals.set(key, {
          user_id: userId,
          month: month.month,
          category_id: item.category_id,
          category_name: item.categories?.name ?? null,
          category_color: item.categories?.color ?? null,
          total: Number(item.planned_amount),
          num_expenses: 1,
        });
      }
    }
  }

  return Array.from(totals.values()).sort((a, b) => Number(b.total) - Number(a.total));
}
