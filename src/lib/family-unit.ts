import type { AppUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { pickFamilyUnit } from "@/lib/family-selection";

export type FamilyUnit = { id: string; owner_id: string; name: string };
export const FAMILY_SECTIONS = ["expenses", "menus", "pantry", "mortgage", "tasks", "overview"] as const;
export type FamilySection = typeof FAMILY_SECTIONS[number];
export type FamilyAccess = "none" | "view" | "edit";
export type FamilyAccessMap = Record<FamilySection, FamilyAccess>;

const emptyAccess = (): FamilyAccessMap => ({ expenses: "none", menus: "none", pantry: "none", mortgage: "none", tasks: "none", overview: "none" });

/** The selected family is a preference, never an authorization claim. */
export async function getFamilyUnits(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase.from("family_unit_members")
    .select("joined_at,created_at,family_units(id,owner_id,name)")
    .eq("user_id", userId).eq("status", "active")
    .order("joined_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.family_units as unknown as FamilyUnit | null).filter((unit): unit is FamilyUnit => Boolean(unit));
}

export async function getFamilyAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, unit: FamilyUnit): Promise<FamilyAccessMap> {
  if (unit.owner_id === userId) return Object.fromEntries(FAMILY_SECTIONS.map((section) => [section, "edit"])) as FamilyAccessMap;
  const access = emptyAccess();
  const { data: membership } = await supabase.from("family_unit_members").select("id")
    .eq("unit_id", unit.id).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!membership) return access;
  const { data } = await supabase.from("family_section_permissions").select("section,access").eq("member_id", membership.id);
  for (const row of data ?? []) {
    if (FAMILY_SECTIONS.includes(row.section as FamilySection) && (row.access === "view" || row.access === "edit")) {
      access[row.section as FamilySection] = row.access;
    }
  }
  return access;
}

/** Returns the selected active family. Existing users keep their most recent family. */
export async function getOrCreateFamilyUnit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: Pick<AppUser, "id"> & { email?: string | null }
): Promise<FamilyUnit | null> {
  if (user.email) {
    const admin = createAdminClient();
    const { data: pending } = await admin.from("family_unit_members").select("id")
      .eq("email", user.email.toLowerCase()).eq("status", "invited").is("user_id", null);
    if (pending?.length) {
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      await admin.from("family_unit_members").update({
        user_id: user.id, display_name: profile?.full_name ?? null, status: "active", joined_at: new Date().toISOString(),
      }).in("id", pending.map((member) => member.id));
    }
  }

  const units = await getFamilyUnits(supabase, user.id);
  const selectedId = (await cookies()).get("selected_family_unit")?.value;
  const selected = pickFamilyUnit(units, selectedId);
  if (selected) return selected;

  const { data: unit } = await supabase.from("family_units")
    .insert({ owner_id: user.id, name: "Mi unidad familiar" })
    .select("id,owner_id,name").single();
  if (!unit) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("family_unit_members").insert({
    unit_id: unit.id, user_id: user.id, email: user.email ?? "", display_name: profile?.full_name ?? null,
    role: "owner", status: "active", joined_at: new Date().toISOString(),
  });
  return error ? null : unit as FamilyUnit;
}
