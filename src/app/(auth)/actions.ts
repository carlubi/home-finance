"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";

type AuthState = {
  error?: string;
  ok?: boolean;
  message?: string;
  next?: string;
  email?: string;
};

function getInvitationToken(path: string) {
  try {
    const { pathname } = new URL(path, "https://home-finance.local");
    const [, route, token] = pathname.split("/");
    return route === "invitacion" && token ? token : null;
  } catch {
    return null;
  }
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalized = email.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === normalized);
    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }
  }

  return null;
}

async function activateInvitedAuthUser({
  email,
  fullName,
  next,
  password,
  supabase,
}: {
  email: string;
  fullName: string;
  next: string;
  password: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const token = getInvitationToken(next);
  if (!token) {
    return null;
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("shared_group_members")
    .select("email, status")
    .eq("invite_token", token)
    .single();

  if (!member || member.status !== "invited") {
    return { error: "Esta invitación no está disponible." };
  }

  if (member.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "Usa el email al que se envió la invitación." };
  }

  const authUser = await findAuthUserByEmail(admin, email);
  if (!authUser) {
    return null;
  }

  if (authUser.email_confirmed_at || authUser.confirmed_at) {
    return {
      error:
        "Ya existe una cuenta con este email. Inicia sesión para aceptar la invitación.",
    };
  }

  if (!authUser.invited_at) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      return { error: "No se pudo reenviar el correo de confirmación." };
    }

    return {
      ok: true,
      next,
      email,
      message:
        "Te hemos reenviado el correo para confirmar tu usuario. Cuando lo verifiques volverás a la invitación.",
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: { ...authUser.user_metadata, full_name: fullName },
  });

  if (updateError) {
    return { error: "No se pudo activar la cuenta invitada." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      error:
        "La cuenta invitada ya está activa. Inicia sesión con la contraseña que acabas de crear.",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function login(_prev: AuthState | null, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(
  _prev: AuthState | null,
  formData: FormData
) {
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"), "/onboarding");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const invitedResult = await activateInvitedAuthUser({
    email,
    fullName,
    next,
    password,
    supabase,
  });
  if (invitedResult) {
    return invitedResult;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: "No se pudo crear la cuenta: " + error.message };
  }
  if (data.user?.identities && data.user.identities.length === 0) {
    return {
      error:
        "Ya existe una cuenta con este email. Inicia sesión o recupera tu contraseña.",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  revalidatePath("/", "layout");
  if (session) {
    redirect(next);
  }

  return {
    ok: true,
    next,
    email,
    message: next.startsWith("/invitacion/")
      ? "Te hemos enviado un correo para confirmar tu usuario. Cuando lo verifiques volverás a la invitación."
      : "Te hemos enviado un correo para confirmar tu usuario. Cuando lo verifiques podrás continuar con el onboarding.",
  };
}

export async function resetPassword(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    return { error: "No se pudo enviar el email de recuperación." };
  }
  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
