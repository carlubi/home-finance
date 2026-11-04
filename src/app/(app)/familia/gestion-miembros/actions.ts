"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFamilyUnits, getOrCreateFamilyUnit, FAMILY_SECTIONS, type FamilyAccess, type FamilySection } from "@/lib/family-unit";

const COOKIE = "selected_family_unit";

function refreshFamily() {
  revalidatePath("/", "layout");
  for (const path of ["/familia", "/familia/gestion-miembros", "/menus", "/stockalert", "/hipoteca", "/tareas-domesticas", "/global"]) revalidatePath(path);
}

export async function selectFamily(unitId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };
  const units = await getFamilyUnits(supabase, user.id);
  if (!units.some((unit) => unit.id === unitId)) return { error: "No perteneces a esa unidad familiar." };
  (await cookies()).set(COOKIE, unitId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  refreshFamily();
  return { ok: true };
}

export async function createFamily(nameRaw: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };
  const name = nameRaw.trim() || "Mi unidad familiar";
  if (name.length > 80) return { error: "El nombre puede tener como máximo 80 caracteres." };
  const { count, error: countError } = await supabase.from("family_units").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if (countError) return { error: "No se pudo comprobar el número de unidades familiares." };
  if ((count ?? 0) >= 3) return { error: "Puedes crear hasta tres unidades familiares." };
  const { data: unit, error } = await supabase.from("family_units").insert({ owner_id: user.id, name }).select("id").single();
  if (error || !unit) return { error: error?.message ?? "No se pudo crear la unidad familiar." };
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { error: memberError } = await supabase.from("family_unit_members").insert({
    unit_id: unit.id, user_id: user.id, email: user.email ?? "", display_name: profile?.full_name ?? null,
    role: "owner", status: "active", joined_at: new Date().toISOString(),
  });
  if (memberError) {
    await createAdminClient().from("family_units").delete().eq("id", unit.id).eq("owner_id", user.id);
    return { error: "No se pudo completar la creación de la unidad familiar." };
  }
  (await cookies()).set(COOKIE, unit.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  refreshFamily();
  return { ok: true, unitId: unit.id };
}

export async function renameFamily(nameRaw: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };
  const unit = await getOrCreateFamilyUnit(supabase, user);
  if (!unit || unit.owner_id !== user.id) return { error: "Solo el propietario puede cambiar el nombre." };
  const name = nameRaw.trim() || "Mi unidad familiar";
  if (name.length > 80) return { error: "El nombre puede tener como máximo 80 caracteres." };
  const { error } = await supabase.from("family_units").update({ name }).eq("id", unit.id).eq("owner_id", user.id);
  if (error) return { error: "No se pudo cambiar el nombre." };
  refreshFamily();
  return { ok: true };
}

export async function setMemberPermission(memberId: string, section: FamilySection, access: FamilyAccess) {
  if (!FAMILY_SECTIONS.includes(section) || !["none", "view", "edit"].includes(access)) return { error: "Permiso no válido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };
  const unit = await getOrCreateFamilyUnit(supabase, user);
  if (!unit || unit.owner_id !== user.id) return { error: "Solo el propietario puede gestionar permisos." };
  const { data: member } = await supabase.from("family_unit_members").select("id").eq("id", memberId)
    .eq("unit_id", unit.id).eq("role", "member").neq("status", "removed").maybeSingle();
  if (!member) return { error: "Miembro no encontrado." };
  const { error } = await supabase.from("family_section_permissions").upsert({
    unit_id: unit.id, member_id: member.id, section, access,
  }, { onConflict: "member_id,section" });
  if (error) return { error: "No se pudo guardar el permiso." };
  refreshFamily();
  return { ok: true };
}
