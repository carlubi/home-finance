"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";
import { syncSalaryIncome } from "@/lib/salary";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateMonthlyIncome(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const monthlyIncomeRaw = String(formData.get("monthly_income") ?? "").trim();
  const monthlyIncome = parseMoneyInput(monthlyIncomeRaw);

  if (monthlyIncomeRaw && (monthlyIncome === null || monthlyIncome <= 0)) {
    return { error: "El ingreso mensual debe ser mayor que 0." };
  }

  const { error } = await supabase
    .from("onboarding_answers")
    .upsert(
      {
        user_id: user.id,
        fixed_income_amount: monthlyIncome,
        has_fixed_income: monthlyIncome !== null ? true : null,
      },
      { onConflict: "user_id" }
    );
  if (error) {
    console.error("updateMonthlyIncome failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      error:
        error.message ||
        "No se pudo actualizar el ingreso mensual. Revisa la conexión con Supabase.",
    };
  }

  // Mantener también la copia en profiles (la usa la migración inicial)
  await supabase
    .from("profiles")
    .update({ monthly_income: monthlyIncome })
    .eq("id", user.id);

  // Reflejar el salario en los ingresos de cada mes del año
  const sync = await syncSalaryIncome(supabase, user.id, monthlyIncome);
  if (sync.error) return { error: sync.error };

  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function createCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "expense");
  const color = String(formData.get("color") ?? "#898781");
  if (!name) return { error: "El nombre es obligatorio." };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    kind,
    color,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe esa categoría." : "No se pudo crear.",
    };
  }
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar." };
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function saveBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const categoryId = String(formData.get("category_id") ?? "");
  const limit = Number(formData.get("monthly_limit"));
  if (!categoryId || !(limit > 0)) {
    return { error: "Elige categoría y un límite mayor que 0." };
  }

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, monthly_limit: limit },
      { onConflict: "user_id,category_id" }
    );
  if (error) return { error: "No se pudo guardar el presupuesto." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBudget(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
