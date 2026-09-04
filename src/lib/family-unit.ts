import type { AppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FamilyUnit = { id: string; owner_id: string; name: string };

/** Obtiene la unidad del usuario y crea una privada para cuentas nuevas. */
export async function getOrCreateFamilyUnit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: Pick<AppUser, "id"> & { email?: string | null }
): Promise<FamilyUnit | null> {
  // Una invitación enviada al mismo email se activa también al entrar en Familia.
  if (user.email) {
    const admin = createAdminClient();
    const { data: pending } = await admin
      .from("family_unit_members")
      .select("id")
      .eq("email", user.email.toLowerCase())
      .eq("status", "invited")
      .is("user_id", null);
    if (pending?.length) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      await admin.from("family_unit_members").update({
        user_id: user.id,
        display_name: profile?.full_name ?? null,
        status: "active",
        joined_at: new Date().toISOString(),
      }).in("id", pending.map((member) => member.id));
    }
  }

  const { data: membership } = await supabase
    .from("family_unit_members")
    .select("family_units(id, owner_id, name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const existing = membership?.family_units as unknown as FamilyUnit | null;
  if (existing) return existing;

  const { data: unit } = await supabase
    .from("family_units")
    .insert({ owner_id: user.id, name: "Mi unidad familiar" })
    .select("id, owner_id, name")
    .single();
  if (!unit) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const { error } = await supabase.from("family_unit_members").insert({
    unit_id: unit.id,
    user_id: user.id,
    email: user.email ?? "",
    display_name: profile?.full_name ?? null,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  return error ? null : (unit as FamilyUnit);
}
