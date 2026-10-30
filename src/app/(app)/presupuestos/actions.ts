"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeBudgetMonth } from "@/lib/monthly-budgets";
import { parseMoneyInput } from "@/lib/format";
import type { MonthlyBudgetOutcome } from "@/lib/types";
import { getOrCreateFamilyUnit, type FamilyUnit } from "@/lib/family-unit";
import { familyCategoryOptions, type FamilyExpenseCategoryOption } from "@/lib/family";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user, familyUnit: user ? await getOrCreateFamilyUnit(supabase, user) : null };
}

async function ensurePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyUnit: FamilyUnit,
  month: string
) {
  const { data, error } = await supabase
    .from("monthly_budget_plans")
    .upsert({ user_id: familyUnit.owner_id, family_unit_id: familyUnit.id, month }, { onConflict: "family_unit_id,month" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo preparar el presupuesto.");
  }

  return String(data.id);
}

export async function saveMonthlyBudgetItem(formData: FormData) {
  const { supabase, user, familyUnit } = await requireUser();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const month = normalizeBudgetMonth(String(formData.get("month") ?? ""));
  const categoryValue = String(formData.get("category_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseMoneyInput(String(formData.get("planned_amount") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Indica el gasto previsto." };
  if (amount === null || amount <= 0) {
    return { error: "El importe previsto debe ser mayor que 0." };
  }

  const { data: customCategories } = await supabase.from("family_expense_categories")
    .select("name,color").eq("family_unit_id", familyUnit.id);
  const categoryName = categoryValue.startsWith("family:") ? categoryValue.slice(7) : "";
  const category = categoryName ? familyCategoryOptions((customCategories ?? []) as FamilyExpenseCategoryOption[])
    .find((item) => item.name === categoryName) : null;
  if (categoryValue && !category) return { error: "Selecciona una categoría familiar disponible." };

  try {
    const planId = await ensurePlan(supabase, familyUnit, month);
    const { error } = await supabase.from("monthly_budget_items").insert({
      user_id: user.id,
      plan_id: planId,
      category_id: null,
      category_name: category?.name ?? null,
      category_color: category?.color ?? null,
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
  const { supabase, user, familyUnit } = await requireUser();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("monthly_budget_items")
    .delete()
    .eq("id", id);

  if (error) return { error: "No se pudo eliminar la línea." };

  revalidatePath("/presupuestos");
  revalidatePath("/informes");
  return { ok: true };
}

export async function closeMonthlyBudget(formData: FormData) {
  const { supabase, user, familyUnit } = await requireUser();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const month = normalizeBudgetMonth(String(formData.get("month") ?? ""));
  const outcomeRaw = String(formData.get("outcome") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const allowed: MonthlyBudgetOutcome[] = ["under", "met", "over"];

  if (!allowed.includes(outcomeRaw as MonthlyBudgetOutcome)) {
    return { error: "Elige cómo fue el mes respecto al presupuesto." };
  }

  try {
    const planId = await ensurePlan(supabase, familyUnit, month);
    const { error } = await supabase
      .from("monthly_budget_plans")
      .update({
        outcome: outcomeRaw,
        notes,
        closed_at: new Date().toISOString(),
      })
      .eq("id", planId);

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
