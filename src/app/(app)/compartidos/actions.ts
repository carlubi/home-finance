"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { splitAmount } from "@/lib/finance";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── Grupos ──────────────────────────────────────────────────

export async function createGroup(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const { data: group, error } = await supabase
    .from("shared_groups")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();
  if (error || !group) return { error: "No se pudo crear el grupo." };

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

  revalidatePath("/compartidos");
  return { ok: true, groupId: group.id };
}

export async function renameGroup(groupId: string, name: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };
  if (!name.trim()) return { error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("shared_groups")
    .update({ name: name.trim() })
    .eq("id", groupId);
  if (error) return { error: "Solo el propietario puede renombrar el grupo." };
  revalidatePath("/compartidos");
  return { ok: true };
}

// ── Miembros e invitaciones ─────────────────────────────────

export async function inviteMember(groupId: string, emailRaw: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const email = emailRaw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Email no válido." };
  }

  const { data: member, error } = await supabase
    .from("shared_group_members")
    .insert({ group_id: groupId, email, role: "member", status: "invited" })
    .select("invite_token")
    .single();
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Esa persona ya está en el grupo."
          : "Solo el propietario puede invitar.",
    };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteUrl = `${origin}/invitacion/${member.invite_token}`;

  // Intento de email vía Supabase (si el usuario no existe aún). Si falla,
  // el enlace copiable sigue funcionando.
  try {
    const admin = createAdminClient();
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo: inviteUrl });
  } catch {
    // usuario ya registrado u otro fallo de envío: el enlace manual basta
  }

  revalidatePath("/compartidos");
  return { ok: true, inviteUrl };
}

export async function removeMember(groupId: string, memberId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  // Bloquear si el miembro tiene deudas vivas este mes o saldos históricos:
  // comprobamos si participa en algún gasto; si es así, lo marcamos removed
  // (conserva el historial) en vez de borrarlo.
  const { count } = await supabase
    .from("shared_expense_participants")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("shared_group_members")
      .update({ status: "removed" })
      .eq("id", memberId)
      .eq("group_id", groupId);
    if (error) return { error: "Solo el propietario puede eliminar miembros." };
  } else {
    const { error } = await supabase
      .from("shared_group_members")
      .delete()
      .eq("id", memberId)
      .eq("group_id", groupId);
    if (error) return { error: "Solo el propietario puede eliminar miembros." };
  }

  revalidatePath("/compartidos");
  return { ok: true };
}

export async function acceptInvitation(token: string) {
  const { user } = await requireUser();
  if (!user) return { error: "Debes iniciar sesión para aceptar la invitación." };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("shared_group_members")
    .select("id, group_id, status, email")
    .eq("invite_token", token)
    .single();

  if (!member) return { error: "Invitación no encontrada." };
  if (member.status === "active") return { ok: true, groupId: member.group_id };

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { error } = await admin
    .from("shared_group_members")
    .update({
      user_id: user.id,
      display_name: profile?.full_name ?? null,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .eq("id", member.id);
  if (error) return { error: "No se pudo aceptar la invitación." };

  revalidatePath("/compartidos");
  return { ok: true, groupId: member.group_id };
}

// ── Gastos compartidos ──────────────────────────────────────

export interface SharedExpenseInput {
  id?: string;
  group_id: string;
  name: string;
  total_amount: number;
  occurred_at: string;
  paid_by: string; // member_id
  category_id: string | null;
  notes: string | null;
  receipt_path: string | null;
  participant_ids: string[]; // reparto a partes iguales
}

export async function saveSharedExpense(input: SharedExpenseInput) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  if (!input.name.trim()) return { error: "El nombre es obligatorio." };
  if (!(input.total_amount > 0)) return { error: "El importe debe ser mayor que 0." };
  if (input.participant_ids.length === 0) {
    return { error: "Selecciona al menos un participante." };
  }

  const row = {
    group_id: input.group_id,
    name: input.name.trim(),
    total_amount: input.total_amount,
    occurred_at: input.occurred_at,
    paid_by: input.paid_by,
    category_id: input.category_id,
    notes: input.notes,
    receipt_path: input.receipt_path,
  };

  let expenseId = input.id;
  if (expenseId) {
    const { error } = await supabase
      .from("shared_expenses")
      .update(row)
      .eq("id", expenseId);
    if (error) return { error: "No se pudo actualizar el gasto." };
    await supabase
      .from("shared_expense_participants")
      .delete()
      .eq("shared_expense_id", expenseId);
  } else {
    const { data, error } = await supabase
      .from("shared_expenses")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return { error: "No se pudo guardar el gasto." };
    expenseId = data.id;
  }

  const shares = splitAmount(input.total_amount, input.participant_ids.length);
  const { error: partError } = await supabase
    .from("shared_expense_participants")
    .insert(
      input.participant_ids.map((memberId, i) => ({
        shared_expense_id: expenseId,
        member_id: memberId,
        share_amount: shares[i],
      }))
    );
  if (partError) return { error: "No se pudo guardar el reparto." };

  revalidatePath("/compartidos");
  return { ok: true };
}

export async function deleteSharedExpense(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase.from("shared_expenses").delete().eq("id", id);
  if (error) return { error: "No tienes permiso para eliminar este gasto." };
  revalidatePath("/compartidos");
  return { ok: true };
}

// ── Pagos de deudas ─────────────────────────────────────────

export async function registerDebtPayment(input: {
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  pending_amount: number;
  month: string; // YYYY-MM-01
}) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  if (!(input.amount > 0)) return { error: "Importe no válido." };

  const isPartial = input.amount < input.pending_amount - 0.004;
  const { error } = await supabase.from("debt_settlements").insert({
    group_id: input.group_id,
    from_member: input.from_member,
    to_member: input.to_member,
    amount: input.amount,
    paid_amount: input.amount,
    month: input.month,
    status: isPartial ? "partial" : "paid",
    paid_at: new Date().toISOString(),
  });
  if (error) return { error: "No se pudo registrar el pago." };

  // Notificar a los implicados (con datos mínimos)
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("shared_group_members")
      .select("id, user_id, display_name, email")
      .in("id", [input.from_member, input.to_member]);
    const from = members?.find((m) => m.id === input.from_member);
    const to = members?.find((m) => m.id === input.to_member);
    const notify = (members ?? [])
      .filter((m) => m.user_id)
      .map((m) => ({
        user_id: m.user_id as string,
        type: "debt_paid",
        title: "Pago de deuda registrado",
        body: `${from?.display_name ?? from?.email ?? "Alguien"} ha pagado ${input.amount.toFixed(2)} € a ${to?.display_name ?? to?.email ?? "otro miembro"}.`,
        data: { group_id: input.group_id, month: input.month },
      }));
    if (notify.length > 0) await admin.from("notifications").insert(notify);
  } catch {
    // la notificación no debe bloquear el pago
  }

  revalidatePath("/compartidos");
  return { ok: true };
}
