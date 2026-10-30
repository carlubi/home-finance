"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import type { MortgageDraft } from "@/lib/mortgage-config";
import { storeMortgageForUnit } from "@/lib/mortgage-store";
import { createClient } from "@/lib/supabase/server";

export async function saveMortgageConfiguration(draft: MortgageDraft) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión caducada." };
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) return { error: "Unidad familiar no encontrada." };
  const result = await storeMortgageForUnit(supabase, familyUnit.id, draft);
  if (result.error) return result;
  revalidatePath("/hipoteca");
  revalidatePath("/");
  revalidatePath("/global");
  return { ok: true };
}

export async function saveMortgageShare(percent: number) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión caducada." };
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return { error: "Porcentaje no válido." };
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) return { error: "Unidad familiar no encontrada." };
  const { data, error } = await supabase.from("family_mortgages")
    .update({ first_share_percent: percent, updated_at: new Date().toISOString() })
    .eq("family_unit_id", familyUnit.id)
    .select("family_unit_id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo guardar el reparto." };
  revalidatePath("/hipoteca");
  revalidatePath("/global");
  return { ok: true };
}

