"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAccess, getOrCreateFamilyUnit } from "@/lib/family-unit";

export type ProductInput = { name: string; brand: string; units: number; expiration_date: string };

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const familyUnit = user ? await getOrCreateFamilyUnit(supabase, user) : null;
  const canEdit = user && familyUnit ? (await getFamilyAccess(supabase, user.id, familyUnit)).pantry === "edit" : false;
  return { supabase, user, familyUnit, canEdit };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function saveProduct(input: ProductInput, id?: string) {
  const { supabase, user, familyUnit, canEdit } = await context();
  if (!user || !familyUnit || !canEdit) return { error: "No tienes permiso para editar la despensa." };
  const name = input.name.trim();
  const brand = input.brand.trim();
  if (!name || name.length > 180 || brand.length > 120 || !Number.isInteger(input.units) || input.units < 1 || input.units > 9999 || !validDate(input.expiration_date)) {
    return { error: "Revisa el nombre, las unidades y la fecha de caducidad." };
  }
  let currentStatus: string | null = null;
  if (id) {
    const { data: existing } = await supabase.from("stockalert_products")
      .select("status").eq("id", id).eq("family_unit_id", familyUnit.id).maybeSingle();
    if (!existing) return { error: "Producto no encontrado." };
    currentStatus = existing.status;
  }
  const values = { name, brand: brand || null, units: input.units, expiration_date: input.expiration_date, needs_review: false, ...(currentStatus === "pending" ? { status: "active" } : {}) };
  const query = id
    ? supabase.from("stockalert_products").update(values).eq("id", id).eq("family_unit_id", familyUnit.id).select("id").single()
    : supabase.from("stockalert_products").insert({ ...values, family_unit_id: familyUnit.id, owner_id: user.id, status: "active", confidence: 1 }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message ?? "No se pudo guardar el producto." };
  revalidatePath("/stockalert");
  return { ok: true };
}

export async function setProductStatus(id: string, status: "active" | "archived") {
  const { supabase, user, familyUnit, canEdit } = await context();
  if (!user || !familyUnit || !canEdit) return { error: "No tienes permiso para editar la despensa." };
  const { data, error } = await supabase.from("stockalert_products")
    .update({ status, consumed_at: status === "archived" ? new Date().toISOString() : null })
    .eq("id", id).eq("family_unit_id", familyUnit.id).eq("needs_review", false)
    .select("id").single();
  if (error || !data) return { error: error?.message ?? "No se pudo actualizar el producto." };
  revalidatePath("/stockalert");
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const { supabase, user, familyUnit, canEdit } = await context();
  if (!user || !familyUnit || !canEdit) return { error: "No tienes permiso para editar la despensa." };
  const { data: product, error: findError } = await supabase.from("stockalert_products")
    .select("source_image_path").eq("id", id).eq("family_unit_id", familyUnit.id).single();
  if (findError || !product) return { error: "Producto no encontrado." };
  const { error } = await supabase.from("stockalert_products").delete().eq("id", id).eq("family_unit_id", familyUnit.id);
  if (error) return { error: error.message };
  if (product.source_image_path) {
    const { error: storageError } = await supabase.storage.from("stockalert-images").remove([product.source_image_path]);
    if (storageError) console.error("StockAlert photo cleanup failed", storageError.message);
  }
  revalidatePath("/stockalert");
  return { ok: true };
}
