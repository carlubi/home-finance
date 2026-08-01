"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfileName(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (error) return { error: "No se pudo actualizar el nombre." };

  revalidatePath("/", "layout");
  revalidatePath("/perfil");
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function changePassword(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) {
    return { error: "Escribe tu contraseña actual." };
  }

  if (password.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas nuevas no coinciden." };
  }

  if (currentPassword === password) {
    return { error: "La nueva contraseña debe ser distinta a la actual." };
  }

  const { error } = await supabase.auth.updateUser({
    email: user.email,
    current_password: currentPassword,
    password,
  });

  if (error) {
    return { error: "No se pudo cambiar la contraseña. Revisa la contraseña actual." };
  }

  revalidatePath("/perfil");
  return { ok: true };
}

export async function deleteAccount(confirmEmail: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const email = user.email ?? "";
  if (!confirmEmail.trim() || confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
    return { error: "Escribe exactamente tu correo para confirmar." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "No se pudo eliminar la cuenta." };

  try {
    await supabase.auth.signOut();
  } catch {
    // Si la sesión ya quedó invalidada por el borrado, seguimos redirigiendo.
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
