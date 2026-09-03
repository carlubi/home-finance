"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isFamilyExpenseCategory } from "@/lib/family";
import { monthStart, parseMoneyInput } from "@/lib/format";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveFamilyPeopleCount(peopleCount: number) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 50) {
    return { error: "Las personas deben ser un número entre 1 y 50." };
  }

  const { error } = await supabase
    .from("family_expense_preferences")
    .upsert(
      { user_id: user.id, people_count: peopleCount },
      { onConflict: "user_id" }
    );
  if (error) return { error: "No se pudo guardar el número de personas." };

  revalidatePath("/familia");
  return { ok: true };
}

function readPeopleCount(value: FormDataEntryValue | null) {
  const people = Number(String(value ?? ""));
  return Number.isInteger(people) && people >= 1 && people <= 50 ? people : null;
}

function readDate(value: FormDataEntryValue | null) {
  const date = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function readMonth(value: FormDataEntryValue | null) {
  const month = String(value ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-01$/.test(month)) return month;
  return monthStart(new Date());
}

function readCategory(value: FormDataEntryValue | null) {
  const category = String(value ?? "").trim();
  return isFamilyExpenseCategory(category) ? category : null;
}

function readCommonFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = readCategory(formData.get("category"));
  const amount = parseMoneyInput(String(formData.get("amount") ?? "").trim());
  const peopleCount = readPeopleCount(formData.get("people_count"));

  if (!name) return { error: "El nombre del gasto es obligatorio." } as const;
  if (!category) return { error: "Selecciona una categoría familiar." } as const;
  if (amount === null || amount <= 0) {
    return { error: "El importe debe ser mayor que 0." } as const;
  }
  if (peopleCount === null) {
    return { error: "Las personas deben ser un número entre 1 y 50." } as const;
  }

  return { name, category, amount, peopleCount } as const;
}

async function recurringExpenseOverlaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  values: {
    id?: string;
    name: string;
    category: string;
    startsOn: string;
    endsOn: string | null;
  }
) {
  let query = supabase
    .from("family_recurring_expenses")
    .select("id, starts_on, ends_on")
    .eq("user_id", userId)
    .eq("name", values.name)
    .eq("category", values.category)
    .eq("active", true);

  if (values.id) query = query.neq("id", values.id);

  const { data, error } = await query;
  if (error) return { error };

  const newEnd = values.endsOn ?? "9999-12-31";
  const overlap = (data ?? []).some((row) => {
    const existingEnd = row.ends_on ?? "9999-12-31";
    return values.startsOn <= existingEnd && row.starts_on <= newEnd;
  });

  return { overlap };
}

export async function saveFamilyExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const fields = readCommonFields(formData);
  if ("error" in fields) return fields;

  const occurredAt = readDate(formData.get("occurred_at"));
  if (!occurredAt) return { error: "Indica una fecha válida." };

  const id = String(formData.get("id") ?? "").trim();
  const payload = {
    user_id: user.id,
    name: fields.name,
    category: fields.category,
    amount: fields.amount,
    occurred_at: occurredAt,
    people_count: fields.peopleCount,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const result = id
    ? await supabase
        .from("family_expenses")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("family_expenses").insert(payload);

  if (result.error) return { error: "No se pudo guardar el gasto familiar." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteFamilyExpense(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("family_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar el gasto familiar." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteFamilyExpenses(ids: string[]) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  if (ids.length === 0) return { error: "No hay gastos seleccionados." };

  const { error, count } = await supabase
    .from("family_expenses")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudieron eliminar los gastos familiares." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true, count: count ?? ids.length };
}

export async function saveFamilyRecurringExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const fields = readCommonFields(formData);
  if ("error" in fields) return fields;

  const startsOn = readMonth(formData.get("starts_on"));
  const endValue = String(formData.get("ends_on") ?? "").trim();
  const endsOn = endValue ? readMonth(endValue) : null;
  if (endsOn && endsOn < startsOn) {
    return { error: "El mes final no puede ser anterior al inicial." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const overlapping = await recurringExpenseOverlaps(supabase, user.id, {
    id: id || undefined,
    name: fields.name,
    category: fields.category,
    startsOn,
    endsOn,
  });
  if (overlapping.error) return { error: "No se pudo comprobar el periodo del gasto." };
  if (overlapping.overlap) {
    return {
      error: "Ya existe un gasto recurrente con el mismo concepto en ese periodo.",
    };
  }

  const payload = {
    user_id: user.id,
    name: fields.name,
    category: fields.category,
    monthly_amount: fields.amount,
    people_count: fields.peopleCount,
    active: true,
    starts_on: startsOn,
    ends_on: endsOn,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const result = id
    ? await supabase
        .from("family_recurring_expenses")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("family_recurring_expenses").insert(payload);

  if (result.error) return { error: "No se pudo guardar el gasto recurrente." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteFamilyRecurringExpense(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("family_recurring_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar el gasto recurrente." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}
