"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/config";
import { splitAmount } from "@/lib/finance";

type GroupNotificationInput = {
  groupId: string;
  actorUserId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function getInviteUrl(inviteToken: string) {
  return `${getSiteUrl()}/invitacion/${inviteToken}`;
}

async function sendInviteEmail(email: string, inviteUrl: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
    });
    return !error;
  } catch {
    return false;
  }
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function notifyGroupMembers({
  groupId,
  actorUserId,
  type,
  title,
  body,
  data,
}: GroupNotificationInput) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("shared_group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("status", "active")
    .not("user_id", "is", null)
    .neq("user_id", actorUserId);

  const rows = (members ?? [])
    .filter((member) => member.user_id)
    .map((member) => ({
      user_id: member.user_id as string,
      type,
      title,
      body,
      data: { group_id: groupId, ...data },
    }));

  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
  }
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

  const inviteUrl = getInviteUrl(member.invite_token);

  // Intento de email vía Supabase (si el usuario no existe aún). Si falla,
  // el enlace copiable sigue funcionando.
  const emailSent = await sendInviteEmail(email, inviteUrl);

  revalidatePath("/compartidos");
  return { ok: true, inviteUrl, emailSent };
}

export async function resendInvitation(groupId: string, memberId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { data: group } = await supabase
    .from("shared_groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (group?.owner_id !== user.id) {
    return { error: "Solo el propietario puede reenviar invitaciones." };
  }

  const { data: member, error } = await supabase
    .from("shared_group_members")
    .select("email, invite_token, status")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .single();

  if (error || !member) {
    return { error: "No se encontró la invitación." };
  }

  if (member.status !== "invited") {
    return { error: "Solo se pueden reenviar invitaciones pendientes." };
  }

  const inviteUrl = getInviteUrl(member.invite_token);
  const emailSent = await sendInviteEmail(member.email, inviteUrl);

  revalidatePath(`/compartidos/${groupId}`);
  return { ok: true, inviteUrl, emailSent };
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

  // Guard: si quien abre el enlace ya es miembro del grupo (p. ej. el
  // propietario probando su propia invitación), no vincularle la invitación:
  // quedaría "aceptada" apuntando a la cuenta equivocada y la persona
  // invitada nunca vería el grupo.
  const { data: alreadyMember } = await admin
    .from("shared_group_members")
    .select("id")
    .eq("group_id", member.group_id)
    .eq("user_id", user.id)
    .neq("id", member.id)
    .maybeSingle();
  if (alreadyMember) {
    return {
      error: `Ya formas parte de este grupo. Esta invitación es para ${member.email}: compártele el enlace para que la acepte con su propia cuenta.`,
    };
  }

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
  invoice_url: string | null;
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
    invoice_url: input.invoice_url?.trim() || null,
  };

  let expenseId = input.id;
  const isNewExpense = !expenseId;
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

  if (isNewExpense) {
    try {
      const admin = createAdminClient();
      const { data: actor } = await admin
        .from("shared_group_members")
        .select("display_name, email")
        .eq("group_id", input.group_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      await notifyGroupMembers({
        groupId: input.group_id,
        actorUserId: user.id,
        type: "shared_expense_created",
        title: "Nuevo gasto compartido",
        body: `${actor?.display_name ?? actor?.email ?? "Un integrante"} ha añadido "${input.name.trim()}" por ${input.total_amount.toFixed(2)} €.`,
        data: { expense_id: expenseId, occurred_at: input.occurred_at },
      });
    } catch {
      // La notificación no debe bloquear el guardado del gasto.
    }
  }

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

  // Notificar al grupo (con datos mínimos)
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("shared_group_members")
      .select("id, user_id, display_name, email")
      .in("id", [input.from_member, input.to_member]);
    const from = members?.find((m) => m.id === input.from_member);
    const to = members?.find((m) => m.id === input.to_member);
    await notifyGroupMembers({
      groupId: input.group_id,
      actorUserId: user.id,
      type: isPartial ? "debt_payment_registered" : "debt_paid",
      title: isPartial ? "Pago parcial registrado" : "Deuda saldada",
      body: `${from?.display_name ?? from?.email ?? "Un integrante"} ha ${isPartial ? "registrado un pago de" : "saldado"} ${input.amount.toFixed(2)} € con ${to?.display_name ?? to?.email ?? "otro miembro"}.`,
      data: { month: input.month, from_member: input.from_member, to_member: input.to_member },
    });
  } catch {
    // la notificación no debe bloquear el pago
  }

  revalidatePath("/compartidos");
  return { ok: true };
}
