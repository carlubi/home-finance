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
import { acceptFamilyInvitation } from "@/app/(app)/familia/actions";
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
  const { data: sharedMember } = await admin
    .from("shared_group_members")
    .select("id, group_id, status, email, shared_groups(name)")
    .eq("invite_token", token)
    .single();

  const { data: familyMember } = sharedMember ? { data: null } : await admin
    .from("family_unit_members")
    .select("id, unit_id, status, email, family_units(name)")
    .eq("invite_token", token)
    .maybeSingle();
  const member = sharedMember ?? familyMember;
  const isFamilyInvitation = Boolean(familyMember);
  const groupName = sharedMember
    ? (sharedMember.shared_groups as unknown as { name: string } | null)?.name ?? null
    : (familyMember?.family_units as unknown as { name: string } | null)?.name ?? null;
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
    const result = isFamilyInvitation ? await acceptFamilyInvitation(token) : await acceptInvitation(token);
    if (result.ok) redirect(isFamilyInvitation ? "/familia" : `/compartidos/${"groupId" in result ? result.groupId : ""}`);
    redirect(`/invitacion/${token}?error=1`);
  }

  if (!member || !groupName) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-bg-primary p-4">
        <section className="w-full max-w-md rounded-lg border border-border-primary bg-bg-secondary p-6 text-center linear-shadow-sm">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full border border-red/20 bg-red/10 text-red">
            <Mail className="size-5" />
          </div>
          <h1 className="font-heading text-2xl font-medium">
            Invitación no disponible
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Este enlace no existe, ha caducado o la invitación fue revocada.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            className="mt-6 w-full"
          >
            Ir a iniciar sesión
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh bg-bg-primary">
      <div className="mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <section>
          <BrandLogo size="md" className="mb-10" />
          <div className="mb-4 inline-flex h-6 items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-2.5 text-xs font-medium text-text-secondary">
            <Sparkles className="size-3 text-accent" />
            Invitación privada
          </div>
          <h1 className="max-w-2xl font-heading text-4xl font-semibold text-text-primary md:text-5xl">
            Hola, estás invitado a{" "}
            <span>{groupName}</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-text-secondary">
            Te han invitado a {isFamilyInvitation ? "compartir todos los datos de la unidad familiar" : "compartir gastos y saldos de grupo"} en Home Brain.
            Para continuar, entra con tu cuenta o crea una nueva con el email
            invitado.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[13px] text-text-secondary">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-2.5">
              <Mail className="size-3.5 text-text-tertiary" />
              {member.email}
            </span>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-2.5">
              <ShieldCheck className="size-3.5 text-text-tertiary" />
              Acceso protegido
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md border border-border-primary bg-bg-tertiary text-text-secondary">
              <Users className="size-4" />
            </div>
            <div>
              <h2 className="font-heading text-base font-medium">
                Únete al grupo
              </h2>
              <p className="text-sm text-muted-foreground">
                El enlace está preparado para {member.email}.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex gap-3 rounded-md border border-border-primary bg-bg-tertiary/50 p-3">
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-green" />
              <p className="text-muted-foreground">
                Verás el grupo y podrás aceptar la invitación después de iniciar
                sesión.
              </p>
            </div>
            <div className="flex gap-3 rounded-md border border-border-primary bg-bg-tertiary/50 p-3">
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-green" />
              <p className="text-muted-foreground">
                Si llegaste desde el correo de invitación, prepararemos la sesión
                automáticamente.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red/20 bg-red/10 p-3 text-sm text-red">
              No se pudo aceptar la invitación. Revisa que estás usando el email
              invitado.
            </p>
          )}

          <div className="mt-6 grid gap-3">
            <InvitationAuthSync />
            {member.status === "active" ? (
              <>
                <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Esta invitación ya fue aceptada.
                </p>
                <Button
                  render={
                    <Link
                      href={isFamilyInvitation ? "/familia" : (sharedMember?.group_id ? `/compartidos/${sharedMember.group_id}` : "/compartidos")}
                    />
                  }
                  className="w-full"
                >
                  {isFamilyInvitation ? "Ver unidad familiar" : "Ver compartidos"}
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
                  nativeButton={false}
                  render={<Link href={{ pathname: "/login", query: authQuery }} />}
                  className="h-10 w-full"
                >
                  <LogIn data-icon="inline-start" />
                  Iniciar sesión
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
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
