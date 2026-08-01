import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  MonthlyBudgetPlan,
  MonthlySummary,
} from "@/lib/types";
import {
  buildBudgetMonths,
  buildBudgetViews,
  buildYearBudgetOverview,
  expenseCategories,
  normalizeBudgetMonth,
} from "@/lib/monthly-budgets";
import { BudgetsView } from "./budgets-view";

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
  const currentYear = new Date().getFullYear();
  const [{ data: categories }, { data: plans }, { data: summaries }] =
    await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("monthly_budget_plans")
        .select("*, monthly_budget_items(*, categories(*))")
        .eq("user_id", user.id)
        .order("month", { ascending: true }),
      supabase
        .from("monthly_summary")
        .select("month, total_expenses")
        .eq("user_id", user.id)
        .order("month", { ascending: true }),
    ]);

  const budgetPlans = (plans ?? []) as MonthlyBudgetPlan[];
  const months = buildBudgetMonths(currentYear);

  const actualTotals = new Map(
    ((summaries ?? []) as MonthlySummary[]).map((summary) => [
      summary.month,
      Number(summary.total_expenses ?? 0),
    ])
  );
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
    <BudgetsView
      key={selected.month}
      categories={expenseCategories((categories ?? []) as Category[])}
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
  );
}
