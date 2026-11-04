import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAccess, getOrCreateFamilyUnit } from "@/lib/family-unit";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateAfterDays, madridDate, weekStart } from "@/lib/domestic-tasks";
import { DomesticTasksView, type DomesticTask, type FamilyMember, type TaskCompletion } from "./tasks-view";

export const metadata = { title: "Tareas Domésticas" };

export default async function DomesticTasksPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const today = madridDate(new Date());
  const selectedWeek = /^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") && !Number.isNaN(Date.parse(`${semana}T12:00:00Z`))
    ? weekStart(semana!) : weekStart(today);
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");
  const familyAccess = (await getFamilyAccess(supabase, user.id, familyUnit)).tasks;
  if (familyAccess === "none") redirect("/familia/gestion-miembros");
  const [{ data: members, error: membersError }, { data: tasks, error: tasksError }, { data: completions, error: completionsError }, { data: permissions }] = await Promise.all([
    supabase.from("family_unit_members").select("id,user_id,display_name,email,role,status").eq("unit_id", familyUnit.id).order("created_at"),
    supabase.from("domestic_tasks").select("id,title,weekday,starts_on,assignee_member_id").eq("family_unit_id", familyUnit.id).order("weekday").order("created_at"),
    supabase.from("domestic_task_completions").select("task_id,due_date,completed_at").eq("family_unit_id", familyUnit.id)
      .gte("due_date", selectedWeek).lte("due_date", dateAfterDays(selectedWeek, 6)),
    familyAccess === "edit" ? createAdminClient().from("family_section_permissions").select("member_id,access")
      .eq("unit_id", familyUnit.id).eq("section", "tasks") : Promise.resolve({ data: [] }),
  ]);
  const editableMemberIds = new Set((permissions ?? []).filter((row) => row.access === "edit").map((row) => row.member_id));
  for (const member of members ?? []) if (member.role === "owner" && member.status === "active") editableMemberIds.add(member.id);
  return <DomesticTasksView key={selectedWeek} week={selectedWeek} today={today} currentUserId={user.id} canEdit={familyAccess === "edit"}
    members={(members ?? []) as FamilyMember[]} tasks={(tasks ?? []) as DomesticTask[]}
    editableMemberIds={[...editableMemberIds]}
    completions={(completions ?? []) as TaskCompletion[]}
    loadError={membersError?.message ?? tasksError?.message ?? completionsError?.message ?? null} />;
}
