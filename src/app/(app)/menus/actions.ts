"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { normalizeRecipeUrl } from "@/lib/menu-recipes";
import { isMealType, type MealType } from "@/lib/meals";


function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validType(value: string): value is MealType {
  return isMealType(value);
}

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const familyUnit = user ? await getOrCreateFamilyUnit(supabase, user) : null;
  return { supabase, user, familyUnit };
}

export async function saveRecipe(input: { id?: string; name: string; ingredients: string; instructions: string; sourceUrl: string }) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  const name = input.name.trim();
  if (!name || name.length > 120) return { error: "El nombre debe tener entre 1 y 120 caracteres." };
  if (input.ingredients.length > 10000 || input.instructions.length > 20000) return { error: "La receta es demasiado larga." };
  const sourceUrl = input.sourceUrl.trim() ? normalizeRecipeUrl(input.sourceUrl) : null;
  if (input.sourceUrl.trim() && !sourceUrl) return { error: "Introduce un enlace válido que empiece por http:// o https://." };
  const values = { name, ingredients: input.ingredients.trim() || null, instructions: input.instructions.trim() || null, source_url: sourceUrl };
  const query = input.id
    ? supabase.from("menu_recipes").update(values).eq("id", input.id).eq("family_unit_id", familyUnit.id).select("id").single()
    : supabase.from("menu_recipes").insert({ ...values, family_unit_id: familyUnit.id, created_by: user.id }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message ?? "No se pudo guardar la receta." };
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function deleteRecipe(id: string) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  const { data, error } = await supabase.from("menu_recipes").delete().eq("id", id).eq("family_unit_id", familyUnit.id).select("id").single();
  if (error || !data) return { error: error?.message ?? "No se pudo eliminar la receta." };
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true };
}

export async function saveMeal(input: { id?: string; mealDate: string; mealType: string; title: string; recipeId?: string | null; notes: string; sourceUrl: string }) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  const title = input.title.trim();
  if (!validDate(input.mealDate) || !validType(input.mealType) || !title || title.length > 120 || input.notes.length > 2000) {
    return { error: "Revisa la fecha, el tipo de comida y el nombre." };
  }
  const sourceUrl = input.sourceUrl.trim() ? normalizeRecipeUrl(input.sourceUrl) : null;
  if (input.sourceUrl.trim() && !sourceUrl) return { error: "Introduce un enlace válido que empiece por http:// o https://." };
  if (input.recipeId) {
    const { data } = await supabase.from("menu_recipes").select("id").eq("id", input.recipeId).eq("family_unit_id", familyUnit.id).maybeSingle();
    if (!data) return { error: "La receta seleccionada ya no está disponible." };
  }
  const values = { meal_date: input.mealDate, meal_type: input.mealType, title, recipe_id: input.recipeId || null, notes: input.notes.trim() || null, source_url: sourceUrl };
  const query = input.id
    ? supabase.from("menu_meals").update(values).eq("id", input.id).eq("family_unit_id", familyUnit.id).select("id").single()
    : supabase.from("menu_meals").insert({ ...values, family_unit_id: familyUnit.id, created_by: user.id }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message ?? "No se pudo guardar la comida." };
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMeal(id: string) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  const { data, error } = await supabase.from("menu_meals").delete().eq("id", id).eq("family_unit_id", familyUnit.id).select("id").single();
  if (error || !data) return { error: error?.message ?? "No se pudo eliminar la comida." };
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true };
}

export async function duplicateMeal(id: string, mealDate: string, mealType: string) {
  const { supabase, user, familyUnit } = await context();
  if (!user || !familyUnit) return { error: "Sesión caducada." };
  if (!validDate(mealDate) || !validType(mealType)) return { error: "Fecha o tipo de comida no válidos." };
  const { data: source } = await supabase.from("menu_meals").select("title,notes,recipe_id,source_url")
    .eq("id", id).eq("family_unit_id", familyUnit.id).maybeSingle();
  if (!source) return { error: "La comida ya no está disponible." };
  const { error } = await supabase.from("menu_meals").insert({
    family_unit_id: familyUnit.id, created_by: user.id, meal_date: mealDate, meal_type: mealType,
    title: source.title, notes: source.notes, recipe_id: source.recipe_id, source_url: source.source_url,
  });
  if (error) return { error: error.message };
  revalidatePath("/menus");
  revalidatePath("/");
  return { ok: true };
}
