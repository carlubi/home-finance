"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (error) return { error: "No se pudo actualizar el perfil." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "expense");
  const color = String(formData.get("color") ?? "#898781");
  if (!name) return { error: "El nombre es obligatorio." };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    kind,
    color,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe esa categoría." : "No se pudo crear.",
    };
  }
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar." };
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function saveBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const categoryId = String(formData.get("category_id") ?? "");
  const limit = Number(formData.get("monthly_limit"));
  if (!categoryId || !(limit > 0)) {
    return { error: "Elige categoría y un límite mayor que 0." };
  }

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, monthly_limit: limit },
      { onConflict: "user_id,category_id" }
    );
  if (error) return { error: "No se pudo guardar el presupuesto." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBudget(id: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
