import { createClient } from "@/lib/supabase/server";
import { addMonths } from "@/lib/format";
import type {
  Budget,
  Category,
  CategoryTotal,
  Expense,
  Income,
  MonthlySummary,
} from "@/lib/types";

/** Datos de un mes para el dashboard (mes = YYYY-MM-01) */
export async function getMonthData(userId: string, month: string) {
  const supabase = await createClient();
  const nextMonth = addMonths(month, 1);
  const prevMonth = addMonths(month, -1);

  const [summaries, byCategory, expenses, income, categories, budgets] =
    await Promise.all([
      supabase
        .from("monthly_summary")
        .select("*")
        .eq("user_id", userId)
        .in("month", [month, prevMonth]),
      supabase
        .from("expenses_by_category")
        .select("*")
        .eq("user_id", userId)
        .eq("month", month),
      supabase
        .from("expenses")
        .select("*, categories(*)")
        .eq("user_id", userId)
        .gte("occurred_at", month)
        .lt("occurred_at", nextMonth)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("income")
        .select("*, categories(*)")
        .eq("user_id", userId)
        .gte("occurred_at", month)
        .lt("occurred_at", nextMonth)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .order("name"),
      supabase
        .from("budgets")
        .select("*, categories(*)")
        .eq("user_id", userId),
    ]);

  const summaryRows = (summaries.data ?? []) as MonthlySummary[];
  return {
    current: summaryRows.find((s) => s.month === month) ?? null,
    previous: summaryRows.find((s) => s.month === prevMonth) ?? null,
    byCategory: (byCategory.data ?? []) as CategoryTotal[],
    expenses: (expenses.data ?? []) as Expense[],
    income: (income.data ?? []) as Income[],
    categories: (categories.data ?? []) as Category[],
    budgets: (budgets.data ?? []) as Budget[],
  };
}

/** Serie mensual completa del usuario (para visión global) */
export async function getAllMonthlySummaries(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_summary")
    .select("*")
    .eq("user_id", userId)
    .order("month", { ascending: true });
  return (data ?? []) as MonthlySummary[];
}
