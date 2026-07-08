import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInvitation } from "@/app/(app)/compartidos/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Invitación" };

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("shared_group_members")
    .select("id, status, email, shared_groups(name)")
    .eq("invite_token", token)
    .single();

  const groupName =
    (member?.shared_groups as unknown as { name: string } | null)?.name ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function accept() {
    "use server";
    const result = await acceptInvitation(token);
    if (result.ok) redirect(`/compartidos/${result.groupId}`);
    redirect(`/invitacion/${token}?error=1`);
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <Users className="mx-auto mb-2 size-8 text-primary" />
          <CardTitle>Invitación a un grupo</CardTitle>
          <CardDescription>
            {member && groupName
              ? `Te han invitado a compartir gastos en «${groupName}».`
              : "Esta invitación no existe o ha sido revocada."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {member && groupName && (
            <>
              {member.status === "active" ? (
                <p className="text-sm text-muted-foreground">
                  Esta invitación ya fue aceptada.
                </p>
              ) : user ? (
                <form action={accept}>
                  <Button type="submit" className="w-full">
                    Aceptar invitación
                  </Button>
                </form>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Inicia sesión o crea una cuenta con el email {member.email} para
                    unirte.
                  </p>
                  <Button
                    render={<Link href={`/login?next=/invitacion/${token}`} />}
                    className="w-full"
                  >
                    Iniciar sesión
                  </Button>
                  <Button
                    variant="outline"
                    render={<Link href={`/registro?next=/invitacion/${token}`} />}
                    className="w-full"
                  >
                    Crear cuenta
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
