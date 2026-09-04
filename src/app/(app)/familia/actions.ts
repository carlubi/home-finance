"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isFamilyExpenseCategory } from "@/lib/family";
import { monthStart, parseMoneyInput } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/config";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function requireFamilyUnit() {
  const { supabase, user } = await requireUser();
  if (!user) return { supabase, user, familyUnit: null };
  return { supabase, user, familyUnit: await getOrCreateFamilyUnit(supabase, user) };
}

export async function inviteFamilyMember(unitId: string, emailRaw: string) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if (familyUnit.id !== unitId || familyUnit.owner_id !== user.id) return { error: "Solo el propietario puede invitar." };
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email no válido." };
  const { data: member, error } = await supabase.from("family_unit_members")
    .insert({ unit_id: unitId, email, role: "member", status: "invited" }).select("invite_token").single();
  if (error || !member) return { error: error?.code === "23505" ? "Esa persona ya está en la unidad familiar." : "No se pudo crear la invitación." };
  const inviteUrl = `${getSiteUrl()}/invitacion/${member.invite_token}`;
  let emailSent = false;
  try {
    const admin = createAdminClient();
    emailSent = !(await admin.auth.admin.inviteUserByEmail(email, { redirectTo: inviteUrl })).error;
  } catch { /* El enlace copiable sigue siendo válido. */ }
  revalidatePath("/familia");
  return { ok: true, inviteUrl, emailSent };
}

export async function removeFamilyMember(unitId: string, memberId: string) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if (familyUnit.id !== unitId || familyUnit.owner_id !== user.id) return { error: "Solo el propietario puede eliminar miembros." };
  const { error } = await supabase.from("family_unit_members").delete().eq("id", memberId).eq("unit_id", unitId).neq("role", "owner");
  if (error) return { error: "No se pudo eliminar el miembro." };
  revalidatePath("/familia");
  return { ok: true };
}

export async function acceptFamilyInvitation(token: string) {
  const { user } = await requireUser();
  if (!user) return { error: "Debes iniciar sesión para aceptar la invitación." };
  const admin = createAdminClient();
  const { data: member } = await admin.from("family_unit_members").select("id, unit_id, status, email").eq("invite_token", token).maybeSingle();
  if (!member) return { error: "Invitación no encontrada." };
  if (member.status === "active") return { ok: true };
  if (user.email?.toLowerCase() !== member.email.toLowerCase()) return { error: "Usa el email al que se envió la invitación." };
  const { data: existing } = await admin.from("family_unit_members").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (existing) return { error: "Ya formas parte de otra unidad familiar." };
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { error } = await admin.from("family_unit_members").update({ user_id: user.id, display_name: profile?.full_name ?? null, status: "active", joined_at: new Date().toISOString() }).eq("id", member.id);
  if (error) return { error: "No se pudo aceptar la invitación." };
  revalidatePath("/familia");
  return { ok: true };
}

export async function saveFamilyPeopleCount(peopleCount: number) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 50) {
    return { error: "Las personas deben ser un número entre 1 y 50." };
  }

  const { error } = await supabase
    .from("family_expense_preferences")
    .upsert(
      { user_id: familyUnit.owner_id, family_unit_id: familyUnit.id, people_count: peopleCount },
      { onConflict: "family_unit_id" }
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

async function readCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyUnitId: string,
  value: FormDataEntryValue | null
) {
  const category = String(value ?? "").trim();
  if (isFamilyExpenseCategory(category)) return category;

  const { data, error } = await supabase
    .from("family_expense_categories")
    .select("name")
    .eq("family_unit_id", familyUnitId);
  if (error) return null;

  return (
    data ?? []
  ).find((item) => item.name.toLocaleLowerCase("es-ES") === category.toLocaleLowerCase("es-ES"))?.name ?? null;
}

async function readCommonFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyUnitId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const category = await readCategory(supabase, familyUnitId, formData.get("category"));
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
  familyUnitId: string,
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
    .eq("family_unit_id", familyUnitId)
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
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const fields = await readCommonFields(supabase, familyUnit.id, formData);
  if ("error" in fields) return fields;

  const occurredAt = readDate(formData.get("occurred_at"));
  if (!occurredAt) return { error: "Indica una fecha válida." };

  const id = String(formData.get("id") ?? "").trim();
  const payload = {
    user_id: user.id, family_unit_id: familyUnit.id,
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
        .eq("family_unit_id", familyUnit.id)
    : await supabase.from("family_expenses").insert(payload);

  if (result.error) return { error: "No se pudo guardar el gasto familiar." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteFamilyExpense(id: string) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("family_expenses")
    .delete()
    .eq("id", id)
    .eq("family_unit_id", familyUnit.id);
  if (error) return { error: "No se pudo eliminar el gasto familiar." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteFamilyExpenses(ids: string[]) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if (ids.length === 0) return { error: "No hay gastos seleccionados." };

  const { error, count } = await supabase
    .from("family_expenses")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("family_unit_id", familyUnit.id);
  if (error) return { error: "No se pudieron eliminar los gastos familiares." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true, count: count ?? ids.length };
}

export async function saveFamilyRecurringExpense(formData: FormData) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const fields = await readCommonFields(supabase, familyUnit.id, formData);
  if ("error" in fields) return fields;

  const startsOn = readMonth(formData.get("starts_on"));
  const endValue = String(formData.get("ends_on") ?? "").trim();
  const endsOn = endValue ? readMonth(endValue) : null;
  if (endsOn && endsOn < startsOn) {
    return { error: "El mes final no puede ser anterior al inicial." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const overlapping = await recurringExpenseOverlaps(supabase, familyUnit.id, {
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
    user_id: user.id, family_unit_id: familyUnit.id,
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
        .eq("family_unit_id", familyUnit.id)
    : await supabase.from("family_recurring_expenses").insert(payload);

  if (result.error) return { error: "No se pudo guardar el gasto recurrente." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteFamilyRecurringExpense(id: string) {
  const { supabase, user, familyUnit } = await requireFamilyUnit();
  if (!user || !familyUnit) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("family_recurring_expenses")
    .delete()
    .eq("id", id)
    .eq("family_unit_id", familyUnit.id);
  if (error) return { error: "No se pudo eliminar el gasto recurrente." };

  revalidatePath("/familia");
  revalidatePath("/global");
  return { ok: true };
}
