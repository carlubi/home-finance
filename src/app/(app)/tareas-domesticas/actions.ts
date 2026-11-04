"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAccess, getOrCreateFamilyUnit } from "@/lib/family-unit";
import { createAdminClient } from "@/lib/supabase/admin";
import { madridDate, taskOccursOnDate } from "@/lib/domestic-tasks";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const familyUnit = user ? await getOrCreateFamilyUnit(supabase, user) : null;
  return { supabase, user, familyUnit };
}

export async function saveDomesticTask(input: { id?: string; title: string; schedule: "weekly" | "once"; weekday: number; scheduledDate: string; memberId: string }) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if ((await getFamilyAccess(supabase, user.id, familyUnit)).tasks !== "edit") return { error: "No tienes permiso para editar las tareas." };
  const title = input.title.trim();
  if (!title || title.length > 120) {
    return { error: "Revisa el nombre y el día de la tarea." };
  }
  if (input.schedule !== "weekly" && input.schedule !== "once") return { error: "Selecciona cuándo se hará la tarea." };
  const scheduledDate = input.scheduledDate;
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) ? new Date(`${scheduledDate}T12:00:00Z`) : null;
  if (input.schedule === "weekly" ? !Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6
    : !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== scheduledDate) {
    return { error: "Selecciona un día válido para la tarea." };
  }
  const { data: member } = await supabase.from("family_unit_members").select("id,role")
    .eq("id", input.memberId).eq("unit_id", familyUnit.id).eq("status", "active").not("user_id", "is", null).maybeSingle();
  if (!member) return { error: "Selecciona un miembro activo de la familia." };
  if (member.role !== "owner") {
    const { data: permission } = await createAdminClient().from("family_section_permissions").select("access")
      .eq("unit_id", familyUnit.id).eq("member_id", member.id).eq("section", "tasks").maybeSingle();
    if (permission?.access !== "edit") return { error: "El responsable necesita permiso para editar las tareas y marcar sus checks." };
  }
  const { data: existing } = input.id ? await supabase.from("domestic_tasks").select("id,starts_on,scheduled_date")
    .eq("id", input.id).eq("family_unit_id", familyUnit.id).maybeSingle() : { data: null };
  if (input.id && !existing) return { error: "No se encontró la tarea." };
  const values = {
    title,
    weekday: input.schedule === "weekly" ? input.weekday : null,
    scheduled_date: input.schedule === "once" ? scheduledDate : null,
    starts_on: input.schedule === "once" ? scheduledDate : existing?.scheduled_date ? madridDate(new Date()) : existing?.starts_on ?? madridDate(new Date()),
    assignee_member_id: input.memberId,
  };
  const query = input.id
    ? supabase.from("domestic_tasks").update(values).eq("id", input.id).eq("family_unit_id", familyUnit.id).select("id").maybeSingle()
    : supabase.from("domestic_tasks").insert({ ...values, family_unit_id: familyUnit.id, created_by: user.id }).select("id").maybeSingle();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message ?? "No se pudo guardar la tarea." };
  revalidatePath("/tareas-domesticas");
  return { ok: true };
}

export async function deleteDomesticTask(id: string) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if ((await getFamilyAccess(supabase, user.id, familyUnit)).tasks !== "edit") return { error: "No tienes permiso para editar las tareas." };
  const { data, error } = await supabase.from("domestic_tasks").delete().eq("id", id).eq("family_unit_id", familyUnit.id).select("id").maybeSingle();
  if (error || !data) return { error: error?.message ?? "No se pudo eliminar la tarea." };
  revalidatePath("/tareas-domesticas");
  return { ok: true };
}

export async function setDomesticTaskDone(taskId: string, dueDate: string, done: boolean) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if ((await getFamilyAccess(supabase, user.id, familyUnit)).tasks !== "edit") return { error: "No tienes permiso para editar las tareas." };
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? new Date(`${dueDate}T12:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dueDate || dueDate > madridDate(new Date())) {
    return { error: "Solo puedes marcar tareas de hoy o de días anteriores." };
  }
  const { data: task } = await supabase.from("domestic_tasks").select("id,weekday,starts_on,scheduled_date")
    .eq("id", taskId).eq("family_unit_id", familyUnit.id).maybeSingle();
  if (!task || !taskOccursOnDate(task, dueDate)) return { error: "La tarea no corresponde a ese día." };
  if (done) {
    const { error } = await supabase.from("domestic_task_completions").upsert(
      { task_id: taskId, family_unit_id: familyUnit.id, due_date: dueDate, completed_by: user.id },
      { onConflict: "task_id,due_date", ignoreDuplicates: true }
    );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("domestic_task_completions").delete()
      .eq("task_id", taskId).eq("family_unit_id", familyUnit.id).eq("due_date", dueDate);
    if (error) return { error: error.message };
  }
  revalidatePath("/tareas-domesticas");
  return { ok: true };
}
