"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect(String(formData.get("next") || "/"));
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signup(
  _prev: { error?: string; ok?: boolean; message?: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/onboarding`,
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
    redirect("/onboarding");
  }

  return {
    ok: true,
    message:
      "Te hemos enviado un correo para confirmar tu usuario. Cuando lo verifiques podrás continuar con el onboarding.",
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
