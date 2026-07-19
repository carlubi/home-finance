import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/lib/auth";

/**
 * Vincula automáticamente al usuario las invitaciones de grupo pendientes
 * dirigidas a su dirección de correo. Así los grupos aparecen en Compartidos
 * aunque el correo de invitación nunca llegara: basta con iniciar sesión con
 * el email al que invitaron.
 *
 * Devuelve los nombres de los grupos recién vinculados.
 */
export async function claimPendingInvitations(user: AppUser): Promise<string[]> {
  if (!user.email) return [];

  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("shared_group_members")
    .select("id, shared_groups(name)")
    .eq("email", user.email.toLowerCase())
    .eq("status", "invited")
    .is("user_id", null);

  if (!pending || pending.length === 0) return [];

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
    .in(
      "id",
      pending.map((p) => p.id)
    );
  if (error) {
    console.error("claimPendingInvitations failed", error.message);
    return [];
  }

  return pending
    .map((p) => (p.shared_groups as unknown as { name: string } | null)?.name)
    .filter((name): name is string => Boolean(name));
}
