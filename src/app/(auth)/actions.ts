"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";

type AuthState = {
  error?: string;
  ok?: boolean;
  message?: string;
  next?: string;
  email?: string;
};

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

  const { error } = await supabase.auth.signUp({
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
