import { redirect } from "next/navigation";
import { getAppProfile, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SharedGroup } from "@/lib/types";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Perfil" };

type GroupAssociation = {
  id: string;
  name: string;
  role: "owner" | "member";
  status: "active" | "invited" | "removed";
  joined_at: string | null;
  created_at: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, { data: onboarding }, { data: ownedGroups }, { data: memberships }] =
    await Promise.all([
      getAppProfile(user.id),
      supabase
        .from("onboarding_answers")
        .select("fixed_income_amount")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("shared_groups")
        .select("id, name, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("shared_group_members")
        .select("id, role, status, joined_at, shared_groups(id, name, created_at)")
        .eq("user_id", user.id)
        .neq("status", "removed")
        .order("created_at", { ascending: false }),
    ]);

  const groupsById = new Map<string, GroupAssociation>();

  for (const group of (ownedGroups ?? []) as SharedGroup[]) {
    groupsById.set(group.id, {
      id: group.id,
      name: group.name,
      role: "owner",
      status: "active",
      joined_at: null,
      created_at: group.created_at,
    });
  }

  for (const membership of (memberships ?? []) as unknown as {
    id: string;
    role: "owner" | "member";
    status: "active" | "invited" | "removed";
    joined_at: string | null;
    shared_groups?: { id: string; name: string; created_at: string } | null;
  }[]) {
    const group = membership.shared_groups;
    if (!group) continue;
    const existing = groupsById.get(group.id);
    groupsById.set(group.id, {
      id: group.id,
      name: group.name,
      role: existing?.role ?? membership.role,
      status: existing?.status ?? membership.status,
      joined_at: existing?.joined_at ?? membership.joined_at,
      created_at: group.created_at,
    });
  }

  const groups = Array.from(groupsById.values()).sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 p-4 pb-20 md:p-6 md:pb-6">
      <ProfileClient
        fullName={profile?.full_name ?? ""}
        email={user.email ?? ""}
        monthlyIncome={(onboarding as { fixed_income_amount?: number | null } | null)?.fixed_income_amount ?? null}
        groups={groups}
      />
    </div>
  );
}
