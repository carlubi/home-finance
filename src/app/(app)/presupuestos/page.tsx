import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  MonthlyBudgetPlan,
  FamilyExpense,
  FamilyRecurringExpense,
} from "@/lib/types";
import { familyCategoryOptions, type FamilyExpenseCategoryOption } from "@/lib/family";
import {
  buildBudgetMonths,
  buildBudgetViews,
  buildYearBudgetOverview,
  expenseCategories,
  normalizeBudgetMonth,
} from "@/lib/monthly-budgets";
import { recurringMonthlyAmount, recurringOccursInMonth } from "@/lib/recurring";
import { BudgetsView } from "./budgets-view";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { getGoalSnapshots } from "@/lib/goal-data";
import { GoalsSection } from "@/components/goals/goals-section";

export const metadata = { title: "Presupuestos mensuales" };

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const selectedMonth = normalizeBudgetMonth(mes);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");
  const [personalGoals, familyGoals] = await Promise.all([
    getGoalSnapshots("personal", user.id),
    getGoalSnapshots("family", user.id, familyUnit.id),
  ]);
  const currentYear = new Date().getFullYear();
  const [{ data: categoryRows }, { data: plans }, { data: familyExpenses }, { data: recurringRows }, { data: skipRows }] =
    await Promise.all([
      supabase.from("family_expense_categories").select("name,color").eq("family_unit_id", familyUnit.id).order("name"),
      supabase
        .from("monthly_budget_plans")
        .select("*, monthly_budget_items(*, categories(*))")
        .eq("family_unit_id", familyUnit.id)
        .order("month", { ascending: true }),
      supabase
        .from("family_expenses").select("amount, occurred_at, recurring_expense_id")
        .eq("family_unit_id", familyUnit.id),
      supabase.from("family_recurring_expenses")
        .select("id, monthly_amount, entry_kind, frequency, custom_months, active, starts_on, ends_on")
        .eq("family_unit_id", familyUnit.id),
      supabase.from("family_recurring_expense_skips")
        .select("recurring_expense_id, month").eq("family_unit_id", familyUnit.id),
    ]);

  const budgetPlans = ((plans ?? []) as MonthlyBudgetPlan[]).map((plan) => ({ ...plan,
    monthly_budget_items: (plan.monthly_budget_items ?? []).map((item) => ({ ...item,
      categories: item.category_name ? { id: item.category_id ?? item.category_name, user_id: null, kind: "expense" as const, name: item.category_name, color: item.category_color ?? null, icon: null } : item.categories,
    })),
  }));
  const categories: Category[] = familyCategoryOptions((categoryRows ?? []) as FamilyExpenseCategoryOption[]).map((category) => ({
    id: `family:${category.name}`, user_id: null, kind: "expense", name: category.name, color: category.color, icon: null,
  }));
  const months = buildBudgetMonths(currentYear);

  const actualTotals = new Map(months.map((month) => [month, 0]));
  const manual = (familyExpenses ?? []) as Pick<FamilyExpense, "amount" | "occurred_at" | "recurring_expense_id">[];
  const recurring = (recurringRows ?? []) as Pick<FamilyRecurringExpense, "id" | "monthly_amount" | "entry_kind" | "frequency" | "custom_months" | "active" | "starts_on" | "ends_on">[];
  const skipped = new Set((skipRows ?? []).map((row) => `${row.recurring_expense_id}:${row.month}`));
  for (const expense of manual) {
    const month = `${expense.occurred_at.slice(0, 7)}-01`;
    if (actualTotals.has(month)) actualTotals.set(month, (actualTotals.get(month) ?? 0) + Number(expense.amount));
  }
  for (const expense of recurring) {
    if (!expense.active || expense.entry_kind === "income") continue;
    for (const month of months) {
      if (expense.starts_on > month || (expense.ends_on && expense.ends_on < month)
        || !recurringOccursInMonth(expense.frequency, expense.custom_months, month)
        || skipped.has(`${expense.id}:${month}`)
        || manual.some((entry) => entry.recurring_expense_id === expense.id && entry.occurred_at.slice(0, 7) === month.slice(0, 7))) continue;
      actualTotals.set(month, (actualTotals.get(month) ?? 0) + recurringMonthlyAmount(Number(expense.monthly_amount), expense.frequency, expense.custom_months ?? undefined));
    }
  }
  const views = buildBudgetViews({
    plans: budgetPlans,
    actualTotals,
    months,
  });
  const selected =
    views.find((view) => view.month === selectedMonth) ??
    views[0] ??
    buildBudgetViews({
      plans: [],
      actualTotals,
      months: [selectedMonth],
    })[0];

  return (
    <div className="grid gap-5">
    <GoalsSection snapshots={[...personalGoals, ...familyGoals]} />
    <BudgetsView
      key={selected.month}
      categories={expenseCategories(categories)}
      views={views}
      selected={selected}
      year={currentYear}
      userId={user.id}
      yearBudget={buildYearBudgetOverview({
        months,
        plans: budgetPlans,
        actualTotals,
      })}
    />
    </div>
  );
}
