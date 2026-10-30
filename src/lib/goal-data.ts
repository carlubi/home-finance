import "server-only";

import { addMonths } from "./format";
import { recurringMonthlyAmount, recurringOccursInMonth } from "./recurring";
import { createClient } from "./supabase/server";
import { evaluateGoal, type GoalMetric } from "./goals";
import type { FinancialGoal, MonthlySummary } from "./types";

type MortgageExpense = { name: string; amount: number; occurred_at: string; categories: { name: string } | { name: string }[] | null };
type MortgageFixed = { name: string; amount: number; active: boolean; starts_on: string | null; ends_on: string | null; created_at: string; frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom"; custom_months: number[] | null; categories: { name: string } | { name: string }[] | null };

function isMortgage(name: string, category?: string | null) {
  return /hipoteca/i.test(name) || /hipoteca/i.test(category ?? "");
}

function categoryName(value: MortgageExpense["categories"]) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

function mortgageTotalForMonth(month: string, expenses: MortgageExpense[], fixed: MortgageFixed[]) {
  const actualMortgage = expenses.filter((item) => item.occurred_at.slice(0, 7) === month.slice(0, 7) && isMortgage(item.name, categoryName(item.categories)));
  const fixedMortgage = fixed.filter((item) => item.active && isMortgage(item.name, categoryName(item.categories)) && (item.starts_on ?? item.created_at.slice(0, 10)) <= month && (!item.ends_on || item.ends_on >= month) && recurringOccursInMonth(item.frequency, item.custom_months, month) && !actualMortgage.some((actual) => actual.name.toLowerCase() === item.name.toLowerCase() && Math.abs(Number(actual.amount) - Number(item.amount)) < 0.01));
  return actualMortgage.reduce((sum, item) => sum + Number(item.amount), 0) + fixedMortgage.reduce((sum, item) => sum + recurringMonthlyAmount(Number(item.amount), item.frequency, item.custom_months ?? undefined), 0);
}

export async function getGoalSnapshots(scope: "personal" | "family", userId: string, familyUnitId?: string) {
  const supabase = await createClient();
  const query = supabase.from("financial_goals").select("*").eq("scope", scope).order("due_on");
  const { data: rows } = await (scope === "personal" ? query.eq("owner_id", userId) : query.eq("family_unit_id", familyUnitId ?? ""));
  const goals = (rows ?? []) as FinancialGoal[];
  if (!goals.length) return [];
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const currentMonth = `${today.slice(0, 7)}-01`;
  let metrics: GoalMetric[] = [];

  if (scope === "personal") {
    const [{ data: summaryRows }, { data: expenseRows }, { data: fixedRows }] = await Promise.all([
      supabase.from("monthly_summary").select("month,total_income,total_expenses,savings").eq("user_id", userId),
      supabase.from("expenses").select("name,amount,occurred_at,categories(name)").eq("user_id", userId),
      supabase.from("fixed_expenses").select("name,amount,active,starts_on,ends_on,created_at,frequency,custom_months,categories(name)").eq("user_id", userId).eq("entry_kind", "expense"),
    ]);
    const expenses = (expenseRows ?? []) as MortgageExpense[];
    const fixed = (fixedRows ?? []) as MortgageFixed[];
    metrics = ((summaryRows ?? []) as MonthlySummary[]).filter((row) => row.month <= currentMonth).map((row) => {
      const mortgageTotal = mortgageTotalForMonth(row.month, expenses, fixed);
      return {
        month: row.month.slice(0, 7),
        income: Number(row.total_income),
        expenses: Number(row.total_expenses),
        expensesWithoutMortgage: Math.max(0, Number(row.total_expenses) - mortgageTotal),
        savings: Number(row.savings),
        hasData: Number(row.total_income) !== 0 || Number(row.total_expenses) !== 0,
      };
    });
  } else if (familyUnitId) {
    const [{ data: members }, { data: sharing }] = await Promise.all([
      supabase.from("family_unit_members").select("user_id").eq("unit_id", familyUnitId).eq("status", "active"),
      supabase.from("family_personal_sharing").select("user_id,enabled").eq("family_unit_id", familyUnitId),
    ]);
    const activeIds = (members ?? []).map((member) => member.user_id).filter((id): id is string => Boolean(id));
    const enabledIds = new Set((sharing ?? []).filter((row) => row.enabled).map((row) => row.user_id));
    const sharedIds = activeIds.filter((id) => activeIds.length === 1 || enabledIds.has(id));
    const [{ data: sharedSummaries }, { data: expenseRows }, { data: fixedRows }] = sharedIds.length
      ? await Promise.all([
        supabase.from("monthly_summary").select("user_id,month,total_income,total_expenses,savings").in("user_id", sharedIds),
        supabase.from("expenses").select("user_id,name,amount,occurred_at,categories(name)").in("user_id", sharedIds),
        supabase.from("fixed_expenses").select("user_id,name,amount,active,starts_on,ends_on,created_at,frequency,custom_months,categories(name)").in("user_id", sharedIds).eq("entry_kind", "expense"),
      ]) : [{ data: [] }, { data: [] }, { data: [] }];
    const personal = (sharedSummaries ?? []) as MonthlySummary[];
    const personalExpenses = (expenseRows ?? []) as (MortgageExpense & { user_id: string })[];
    const personalFixed = (fixedRows ?? []) as (MortgageFixed & { user_id: string })[];
    const firstStart = goals.reduce((first, goal) => goal.starts_on < first ? goal.starts_on : first, currentMonth).slice(0, 7) + "-01";
    for (let month = firstStart; month <= currentMonth; month = addMonths(month, 1)) {
      const personalRows = personal.filter((item) => item.month.slice(0, 7) === month.slice(0, 7));
      const income = personalRows.reduce((sum, item) => sum + Number(item.total_income), 0);
      const expenses = personalRows.reduce((sum, item) => sum + Number(item.total_expenses), 0);
      const savings = personalRows.reduce((sum, item) => sum + Number(item.savings), 0);
      const mortgageTotal = sharedIds.reduce((sum, id) => sum + mortgageTotalForMonth(month,
        personalExpenses.filter((item) => item.user_id === id),
        personalFixed.filter((item) => item.user_id === id)), 0);
      metrics.push({ month: month.slice(0, 7), income, expenses, expensesWithoutMortgage: Math.max(0, expenses - mortgageTotal), savings, hasData: income > 0 || expenses > 0 });
    }
  }

  return goals.map((goal) => ({ goal, result: evaluateGoal(goal, metrics, today) }));
}
