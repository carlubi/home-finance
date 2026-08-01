"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeBudgetMonth } from "@/lib/monthly-budgets";
import { parseMoneyInput } from "@/lib/format";
import type { MonthlyBudgetOutcome } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function ensurePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  month: string
) {
  const { data, error } = await supabase
    .from("monthly_budget_plans")
    .upsert({ user_id: userId, month }, { onConflict: "user_id,month" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo preparar el presupuesto.");
  }

  return String(data.id);
}

export async function saveMonthlyBudgetItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const month = normalizeBudgetMonth(String(formData.get("month") ?? ""));
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseMoneyInput(String(formData.get("planned_amount") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Indica el gasto previsto." };
  if (amount === null || amount <= 0) {
    return { error: "El importe previsto debe ser mayor que 0." };
  }

  try {
    const planId = await ensurePlan(supabase, user.id, month);
    const { error } = await supabase.from("monthly_budget_items").insert({
      user_id: user.id,
      plan_id: planId,
      category_id: categoryId,
      name,
      planned_amount: amount,
      notes,
    });

    if (error) throw new Error(error.message);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar el gasto previsto.",
    };
  }

  revalidatePath("/presupuestos");
  revalidatePath("/informes");
  return { ok: true };
}

export async function deleteMonthlyBudgetItem(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("monthly_budget_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar la línea." };

  revalidatePath("/presupuestos");
  revalidatePath("/informes");
  return { ok: true };
}

export async function closeMonthlyBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const month = normalizeBudgetMonth(String(formData.get("month") ?? ""));
  const outcomeRaw = String(formData.get("outcome") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const allowed: MonthlyBudgetOutcome[] = ["under", "met", "over"];

  if (!allowed.includes(outcomeRaw as MonthlyBudgetOutcome)) {
    return { error: "Elige cómo fue el mes respecto al presupuesto." };
  }

  try {
    const planId = await ensurePlan(supabase, user.id, month);
    const { error } = await supabase
      .from("monthly_budget_plans")
      .update({
        outcome: outcomeRaw,
        notes,
        closed_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cerrar el presupuesto.",
    };
  }

  revalidatePath("/presupuestos");
  revalidatePath("/informes");
  return { ok: true };
}
