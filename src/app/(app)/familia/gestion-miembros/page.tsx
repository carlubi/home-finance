import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFamilyUnits, getOrCreateFamilyUnit } from "@/lib/family-unit";
import { MembersManagementView, type ManagedMember, type ManagedPermission } from "./view";

export const metadata = { title: "Gestión de miembros" };

export default async function MembersManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const unit = await getOrCreateFamilyUnit(supabase, user);
  if (!unit) redirect("/login");
  const units = await getFamilyUnits(supabase, user.id);
  const isOwner = unit.owner_id === user.id;
  const [{ count }, { data: members }, { data: permissions }] = await Promise.all([
    supabase.from("family_units").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    isOwner ? supabase.from("family_unit_members").select("id,email,display_name,role,status,user_id")
      .eq("unit_id", unit.id).neq("status", "removed").order("created_at") : Promise.resolve({ data: [] }),
    isOwner ? supabase.from("family_section_permissions").select("member_id,section,access").eq("unit_id", unit.id) : Promise.resolve({ data: [] }),
  ]);
  return <MembersManagementView key={unit.id} unit={unit} units={units} ownerCount={count ?? 0}
    isOwner={isOwner} members={(members ?? []) as ManagedMember[]} permissions={(permissions ?? []) as ManagedPermission[]} />;
}
