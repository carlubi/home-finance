import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInvitation } from "@/app/(app)/compartidos/actions";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { InvitationAuthSync } from "./invitation-auth-sync";

export const metadata = { title: "Invitación" };

export default async function InvitacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("shared_group_members")
    .select("id, group_id, status, email, shared_groups(name)")
    .eq("invite_token", token)
    .single();

  const groupName =
    (member?.shared_groups as unknown as { name: string } | null)?.name ?? null;
  const invitePath = `/invitacion/${token}`;
  const authQuery = member?.email
    ? { next: invitePath, email: member.email }
    : { next: invitePath };

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

  if (!member || !groupName) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[linear-gradient(135deg,var(--background),var(--muted))] p-4">
        <section className="animate-pop-in w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-2xl shadow-primary/10">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Mail className="size-7" />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-normal">
            Invitación no disponible
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Este enlace no existe, ha caducado o la invitación fue revocada.
          </p>
          <Button render={<Link href="/login" />} className="mt-6 w-full">
            Ir a iniciar sesión
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(135deg,var(--background),var(--muted))]">
      <div className="mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <section className="animate-fade-up">
          <BrandLogo className="mb-10 h-14" />
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            Invitación privada
          </div>
          <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight tracking-normal text-foreground md:text-6xl">
            Hola, estás invitado a{" "}
            <span className="brand-gradient">{groupName}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Te han invitado a compartir gastos y saldos de grupo en Home Finance.
            Para continuar, entra con tu cuenta o crea una nueva con el email
            invitado.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5">
              <Mail className="size-4 text-primary" />
              {member.email}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5">
              <ShieldCheck className="size-4 text-primary" />
              Acceso protegido
            </span>
          </div>
        </section>

        <section className="animate-pop-in rounded-2xl border bg-card/95 p-5 shadow-2xl shadow-primary/10 backdrop-blur md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-normal">
                Únete al grupo
              </h2>
              <p className="text-sm text-muted-foreground">
                El enlace está preparado para {member.email}.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex gap-3 rounded-xl border bg-muted/40 p-3">
              <CheckCircle className="mt-0.5 size-4 text-primary" />
              <p className="text-muted-foreground">
                Verás el grupo y podrás aceptar la invitación después de iniciar
                sesión.
              </p>
            </div>
            <div className="flex gap-3 rounded-xl border bg-muted/40 p-3">
              <CheckCircle className="mt-0.5 size-4 text-primary" />
              <p className="text-muted-foreground">
                Si llegaste desde el correo de invitación, prepararemos la sesión
                automáticamente.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              No se pudo aceptar la invitación. Revisa que estás usando el email
              invitado.
            </p>
          )}

          <div className="mt-6 grid gap-3">
            <InvitationAuthSync />
            {member.status === "active" ? (
              <>
                <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Esta invitación ya fue aceptada.
                </p>
                <Button
                  render={
                    <Link
                      href={
                        member.group_id ? `/compartidos/${member.group_id}` : "/compartidos"
                      }
                    />
                  }
                  className="w-full"
                >
                  Ver compartidos
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : user ? (
              <form action={accept}>
                <Button type="submit" className="h-10 w-full">
                  Aceptar invitación
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </form>
            ) : (
              <>
                <Button
                  render={<Link href={{ pathname: "/login", query: authQuery }} />}
                  className="h-10 w-full"
                >
                  <LogIn data-icon="inline-start" />
                  Iniciar sesión
                </Button>
                <Button
                  variant="outline"
                  render={<Link href={{ pathname: "/registro", query: authQuery }} />}
                  className="h-10 w-full"
                >
                  <UserPlus data-icon="inline-start" />
                  Crear cuenta
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
