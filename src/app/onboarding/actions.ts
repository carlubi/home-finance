"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncSalaryIncome } from "@/lib/salary";

export interface OnboardingData {
  goal: string;
  goalOther: string;
  habits: string[];
  hasFixedIncome: boolean | null;
  fixedIncomeAmount: number | null;
  fixedExpenseTypes: string[];
  invests: boolean | null;
  investmentName: string;
  investmentMonthly: number | null;
  investmentOneOff: number | null;
  investmentCapital: number | null;
  sharesExpenses: boolean | null;
  groupName: string;
  inviteEmails: string[];
  sharedExpenseTypes: string[];
  statementPath: string | null;
  statementName: string | null;
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: answersError } = await supabase.from("onboarding_answers").upsert({
    user_id: user.id,
    financial_goal: data.goal || null,
    financial_goal_other: data.goalOther || null,
    consumption_habits: data.habits,
    has_fixed_income: data.hasFixedIncome,
    fixed_income_amount: data.fixedIncomeAmount,
    fixed_expense_types: data.fixedExpenseTypes,
    invests: data.invests,
    investment_details: data.invests
      ? {
          name: data.investmentName || null,
          monthly: data.investmentMonthly,
          one_off: data.investmentOneOff,
          capital: data.investmentCapital,
        }
      : null,
    shares_expenses: data.sharesExpenses,
    shared_expense_types: data.sharedExpenseTypes,
  });
  if (answersError) {
    return { error: "No se pudieron guardar las respuestas." };
  }

  // Reflejar el salario declarado en los ingresos de cada mes del año
  await syncSalaryIncome(supabase, user.id, data.fixedIncomeAmount);

  if (data.invests && (data.investmentName || data.investmentMonthly)) {
    await supabase.from("investments").insert({
      user_id: user.id,
      name: data.investmentName || "Inversión",
      monthly_amount: data.investmentMonthly,
      one_off_amount: data.investmentOneOff,
      accumulated_capital: data.investmentCapital,
    });
  }

  // Extracto subido durante el onboarding → pendiente de procesar en /importar
  if (data.statementPath) {
    await supabase.from("imported_files").insert({
      user_id: user.id,
      file_path: data.statementPath,
      file_name: data.statementName ?? "extracto",
      status: "pending",
    });
  }

  // Grupo de gastos compartidos + invitaciones
  if (data.sharesExpenses && data.groupName) {
    const { data: group, error: groupError } = await supabase
      .from("shared_groups")
      .insert({ name: data.groupName, owner_id: user.id })
      .select("id")
      .single();

    if (!groupError && group) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      await supabase.from("shared_group_members").insert({
        group_id: group.id,
        user_id: user.id,
        email: user.email ?? "",
        display_name: profile?.full_name ?? null,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });

      const emails = data.inviteEmails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && e !== user.email);
      if (emails.length > 0) {
        await supabase.from("shared_group_members").insert(
          emails.map((email) => ({
            group_id: group.id,
            email,
            role: "member",
            status: "invited",
          }))
        );
      }
    }
  }

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/");
}
