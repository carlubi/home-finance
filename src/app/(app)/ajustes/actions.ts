"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addMonths, monthStart, parseMoneyInput } from "@/lib/format";
import { investmentActualValueAtMonth } from "@/lib/finance";
import { syncSalaryIncome } from "@/lib/salary";
import { FAMILY_EXPENSE_CATEGORIES } from "@/lib/family";
import type { Investment } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { readRecurringEntryKind, readRecurringFrequency, readRecurringMonths } from "@/lib/recurring";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type ChangeScope = "global" | "from_month";

function readChangeScope(formData: FormData): ChangeScope {
  return formData.get("change_scope") === "global" ? "global" : "from_month";
}

function readEffectiveMonth(formData: FormData) {
  const raw = String(formData.get("effective_month") ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  return monthStart(new Date());
}

async function getGlobalRecurrenceStartMonth(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from("monthly_summary")
    .select("month")
    .eq("user_id", userId)
    .order("month", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.month ?? monthStart(new Date(new Date().getFullYear(), 0, 1));
}

export async function updateMonthlyIncome(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const monthlyIncomeRaw = String(formData.get("monthly_income") ?? "").trim();
  const monthlyIncome = parseMoneyInput(monthlyIncomeRaw);
  const changeScope = readChangeScope(formData);
  const effectiveMonth = readEffectiveMonth(formData);

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
  const sync = await syncSalaryIncome(supabase, user.id, monthlyIncome, {
    scope: changeScope,
    effectiveMonth,
    startMonth:
      changeScope === "global"
        ? await getGlobalRecurrenceStartMonth(supabase, user.id)
        : undefined,
  });
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

export async function createFamilyCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) return { error: "No se pudo acceder a la unidad familiar." };

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#898781");
  if (!name) return { error: "El nombre es obligatorio." };
  if (name.length > 80) return { error: "El nombre no puede superar 80 caracteres." };
  if (
    FAMILY_EXPENSE_CATEGORIES.some(
      (category) =>
        category.toLocaleLowerCase("es-ES") === name.toLocaleLowerCase("es-ES")
    )
  ) {
    return { error: "Esa categoría ya existe entre las estándar." };
  }

  const { error } = await supabase.from("family_expense_categories").insert({
    user_id: user.id,
    family_unit_id: familyUnit.id,
    name,
    color,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe esa categoría familiar."
          : "No se pudo crear la categoría familiar.",
    };
  }

  revalidatePath("/ajustes");
  revalidatePath("/familia");
  return { ok: true };
}

export async function deleteFamilyCategory(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) return { error: "No se pudo acceder a la unidad familiar." };

  const { data: category, error: categoryError } = await supabase
    .from("family_expense_categories")
    .select("name")
    .eq("id", id)
    .eq("family_unit_id", familyUnit.id)
    .maybeSingle();
  if (categoryError) return { error: "No se pudo eliminar la categoría familiar." };
  if (!category) return { ok: true };

  const [{ count: expenseCount, error: expenseError }, { count: recurringCount, error: recurringError }] =
    await Promise.all([
      supabase
        .from("family_expenses")
        .select("id", { count: "exact", head: true })
        .eq("family_unit_id", familyUnit.id)
        .eq("category", category.name),
      supabase
        .from("family_recurring_expenses")
        .select("id", { count: "exact", head: true })
        .eq("family_unit_id", familyUnit.id)
        .eq("category", category.name),
    ]);
  if (expenseError || recurringError) {
    return { error: "No se pudo comprobar el uso de la categoría." };
  }
  if ((expenseCount ?? 0) > 0 || (recurringCount ?? 0) > 0) {
    return {
      error: "No puedes eliminar una categoría que está siendo utilizada.",
    };
  }

  const { error } = await supabase
    .from("family_expense_categories")
    .delete()
    .eq("id", id)
    .eq("family_unit_id", familyUnit.id);
  if (error) return { error: "No se pudo eliminar la categoría familiar." };

  revalidatePath("/ajustes");
  revalidatePath("/familia");
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

export async function saveFixedExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const categoryIdRaw = String(formData.get("category_id") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = parseMoneyInput(amountRaw);
  const entryKind = readRecurringEntryKind(formData.get("entry_kind"));
  const frequency = readRecurringFrequency(formData.get("frequency"));
  const customMonths = readRecurringMonths(formData);
  if (frequency === "custom" && customMonths.length === 0) return { error: "Selecciona al menos un mes." };
  const changeScope = readChangeScope(formData);
  const effectiveMonth = readEffectiveMonth(formData);

  if (!name) return { error: "El concepto recurrente es obligatorio." };
  if (amount === null || amount <= 0) {
    return { error: "El importe debe ser mayor que 0." };
  }

  const payload = {
    user_id: user.id,
    name,
    category_id: categoryIdRaw && categoryIdRaw !== "none" ? categoryIdRaw : null,
    amount,
    entry_kind: entryKind,
    frequency,
    custom_months: customMonths,
    active: true,
  };
  let error;
  if (id && changeScope === "from_month") {
    const previousMonth = addMonths(effectiveMonth, -1);
    const { error: closeError } = await supabase
      .from("fixed_expenses")
      .update({ ends_on: previousMonth })
      .eq("id", id)
      .eq("user_id", user.id);
    if (closeError) error = closeError;
    else {
      const { error: insertError } = await supabase
        .from("fixed_expenses")
        .insert({
          ...payload,
          starts_on: effectiveMonth,
          ends_on: null,
        });
      error = insertError;
    }
  } else if (id && changeScope === "global") {
    const { data: current, error: currentError } = await supabase
      .from("fixed_expenses")
      .select("name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (currentError) {
      error = currentError;
    } else {
      const globalStart = await getGlobalRecurrenceStartMonth(supabase, user.id);
      const { error: cleanupError } = await supabase
        .from("fixed_expenses")
        .delete()
        .eq("user_id", user.id)
        .eq("name", current.name)
        .neq("id", id);

      if (cleanupError) error = cleanupError;
      else {
        const { error: updateError } = await supabase
          .from("fixed_expenses")
          .update({ ...payload, starts_on: globalStart, ends_on: null })
          .eq("id", id)
          .eq("user_id", user.id);
        error = updateError;
      }
    }
  } else {
    const startsOn =
      changeScope === "global"
        ? await getGlobalRecurrenceStartMonth(supabase, user.id)
        : effectiveMonth;
    const result = await supabase.from("fixed_expenses").insert({
      ...payload,
      starts_on: startsOn,
      ends_on: null,
    });
    error = result.error;
  }
  if (error) return { error: "No se pudo guardar el movimiento recurrente." };

  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  revalidatePath("/informes");
  return { ok: true };
}

export async function deleteFixedExpense(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar el gasto fijo." };

  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  revalidatePath("/informes");
  return { ok: true };
}

export async function saveInvestment(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmountRaw = String(formData.get("monthly_amount") ?? "").trim();
  const oneOffAmountRaw = String(formData.get("one_off_amount") ?? "").trim();
  const expectedReturnRaw = String(
    formData.get("expected_annual_return_pct") ?? ""
  ).trim();
  const accumulatedCapitalRaw = String(
    formData.get("accumulated_capital") ?? ""
  ).trim();
  const changeScope = readChangeScope(formData);
  const effectiveMonth = readEffectiveMonth(formData);

  const monthlyAmount = parseMoneyInput(monthlyAmountRaw);
  const oneOffAmount = parseMoneyInput(oneOffAmountRaw);
  const accumulatedCapital = parseMoneyInput(accumulatedCapitalRaw);
  const expectedAnnualReturnPct = expectedReturnRaw
    ? Number(expectedReturnRaw.replace(",", "."))
    : null;
  const entryType =
    formData.get("investment_entry_type") === "one_off" ? "one_off" : "recurring";
  const frequency = readRecurringFrequency(formData.get("frequency"));
  const customMonths = readRecurringMonths(formData);
  if (frequency === "custom" && customMonths.length === 0) return { error: "Selecciona al menos un mes." };
  const investmentType = ["fixed_income", "equity", "mixed", "money_market", "crypto", "real_estate"].includes(String(formData.get("investment_type")))
    ? String(formData.get("investment_type"))
    : null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;

  if (!name) return { error: "El fondo o inversión es obligatorio." };
  if (monthlyAmountRaw && (monthlyAmount === null || monthlyAmount <= 0)) {
    return { error: "El importe mensual debe ser mayor que 0." };
  }
  if (oneOffAmountRaw && (oneOffAmount === null || oneOffAmount <= 0)) {
    return { error: "El importe invertido debe ser mayor que 0." };
  }
  if (entryType === "recurring" && !id && !(monthlyAmount && monthlyAmount > 0)) {
    return { error: "El importe mensual debe ser mayor que 0." };
  }
  if (entryType === "one_off" && !(oneOffAmount && oneOffAmount > 0)) {
    return { error: "El importe invertido debe ser mayor que 0." };
  }
  if (
    accumulatedCapitalRaw &&
    (accumulatedCapital === null || accumulatedCapital < 0)
  ) {
    return { error: "El capital acumulado no puede ser negativo." };
  }
  if (
    expectedAnnualReturnPct !== null &&
    (!Number.isFinite(expectedAnnualReturnPct) ||
      expectedAnnualReturnPct < -100 ||
      expectedAnnualReturnPct > 100)
  ) {
    return { error: "La rentabilidad esperada debe estar entre -100% y 100%." };
  }

  const payload = {
    user_id: user.id,
    name,
    monthly_amount: entryType === "one_off" ? null : monthlyAmount,
    one_off_amount: entryType === "one_off" ? oneOffAmount : null,
    accumulated_capital: accumulatedCapital,
    expected_annual_return_pct: expectedAnnualReturnPct,
    frequency,
    investment_type: investmentType,
    custom_months: customMonths,
    category_id: categoryId,
  };
  let error;
  if (id && changeScope === "from_month") {
    const { data: current, error: currentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (currentError) {
      error = currentError;
    } else {
      const previousMonth = addMonths(effectiveMonth, -1);
      const carriedCapital = investmentActualValueAtMonth(
        [current as Investment],
        previousMonth
      );
      const { error: closeError } = await supabase
        .from("investments")
        .update({ ends_on: previousMonth })
        .eq("id", id)
        .eq("user_id", user.id);

      if (closeError) error = closeError;
      else {
        const { error: insertError } = await supabase.from("investments").insert({
          ...payload,
          starts_on: effectiveMonth,
          ends_on: null,
          accumulated_capital:
            accumulatedCapitalRaw.trim() === "" ? carriedCapital : accumulatedCapital,
          one_off_amount: entryType === "one_off" ? oneOffAmount : null,
        });
        error = insertError;
      }
    }
  } else if (id && changeScope === "global") {
    const { data: current, error: currentError } = await supabase
      .from("investments")
      .select("name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (currentError) {
      error = currentError;
    } else {
      const globalStart = await getGlobalRecurrenceStartMonth(supabase, user.id);
      const { error: cleanupError } = await supabase
        .from("investments")
        .delete()
        .eq("user_id", user.id)
        .eq("name", current.name)
        .neq("id", id);

      if (cleanupError) error = cleanupError;
      else {
        const { error: updateError } = await supabase
          .from("investments")
          .update({ ...payload, starts_on: globalStart, ends_on: null })
          .eq("id", id)
          .eq("user_id", user.id);
        error = updateError;
      }
    }
  } else {
    const startsOn =
      changeScope === "global"
        ? await getGlobalRecurrenceStartMonth(supabase, user.id)
        : effectiveMonth;
    const result = await supabase.from("investments").insert({
      ...payload,
      starts_on: startsOn,
      ends_on: null,
    });
    error = result.error;
  }
  if (error) return { error: "No se pudo guardar la inversión recurrente." };

  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  revalidatePath("/global");
  revalidatePath("/informes");
  return { ok: true };
}

export async function deleteInvestment(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar la inversión recurrente." };

  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  revalidatePath("/global");
  revalidatePath("/informes");
  return { ok: true };
}

async function splitInvestmentAtMonth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  investment: Investment,
  month: string,
  monthAmount: number | null
) {
  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const startsOn = investment.starts_on ?? investment.created_at.slice(0, 10);
  const capitalBeforeMonth = investmentActualValueAtMonth([investment], previousMonth);

  const closeResult = startsOn < month
    ? await supabase.from("investments").update({ ends_on: previousMonth }).eq("id", investment.id).eq("user_id", userId)
    : await supabase.from("investments").delete().eq("id", investment.id).eq("user_id", userId);
  if (closeResult.error) return closeResult.error;

  if (monthAmount !== null) {
    const { error } = await supabase.from("investments").insert({
      user_id: userId,
      name: investment.name,
      monthly_amount: null,
      one_off_amount: monthAmount,
      accumulated_capital: 0,
      expected_annual_return_pct: investment.expected_annual_return_pct,
      frequency: investment.frequency ?? "monthly",
      investment_type: investment.investment_type ?? null,
      starts_on: month,
      ends_on: month,
    });
    if (error) return error;
  }

  const { error } = await supabase.from("investments").insert({
    user_id: userId,
    name: investment.name,
    monthly_amount: investment.monthly_amount,
    one_off_amount: null,
    accumulated_capital: capitalBeforeMonth + (monthAmount ?? 0),
    expected_annual_return_pct: investment.expected_annual_return_pct,
    frequency: investment.frequency ?? "monthly",
    investment_type: investment.investment_type ?? null,
    starts_on: nextMonth,
    ends_on: investment.ends_on,
  });
  return error;
}

export async function saveInvestmentMonthOverride(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  const id = String(formData.get("id") ?? "").trim();
  const month = readEffectiveMonth(formData);
  const amount = parseMoneyInput(String(formData.get("monthly_amount") ?? "").trim());
  if (!id || amount === null || amount <= 0) return { error: "El importe debe ser mayor que 0." };
  const { data, error: readError } = await supabase.from("investments").select("*").eq("id", id).eq("user_id", user.id).single();
  if (readError || !data) return { error: "No se pudo encontrar la inversión recurrente." };
  const error = await splitInvestmentAtMonth(supabase, user.id, data as Investment, month, amount);
  if (error) return { error: "No se pudo guardar la excepción de este mes." };
  revalidatePath("/", "layout"); revalidatePath("/ajustes"); revalidatePath("/global"); revalidatePath("/informes");
  return { ok: true };
}

export async function skipInvestmentForMonth(id: string, month: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  if (!/^\d{4}-\d{2}-01$/.test(month)) return { error: "Mes no válido." };
  const { data, error: readError } = await supabase.from("investments").select("*").eq("id", id).eq("user_id", user.id).single();
  if (readError || !data) return { error: "No se pudo encontrar la inversión recurrente." };
  const error = await splitInvestmentAtMonth(supabase, user.id, data as Investment, month, null);
  if (error) return { error: "No se pudo eliminar esta inversión del mes." };
  revalidatePath("/", "layout"); revalidatePath("/ajustes"); revalidatePath("/global"); revalidatePath("/informes");
  return { ok: true };
}
