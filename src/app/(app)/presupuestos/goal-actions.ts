"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/format";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { createClient } from "@/lib/supabase/server";
import type { FinancialGoal } from "@/lib/types";

function refreshGoals() {
  revalidatePath("/presupuestos");
  revalidatePath("/");
  revalidatePath("/familia");
}

export async function createFinancialGoal(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión caducada." };
  const scope = String(formData.get("scope") ?? "") as FinancialGoal["scope"];
  const kind = String(formData.get("kind") ?? "") as FinancialGoal["kind"];
  const title = String(formData.get("title") ?? "").trim();
  const dueOn = String(formData.get("due_on") ?? "");
  const targetValue = parseMoneyInput(String(formData.get("target_value") ?? ""));
  const initialAmount = kind === "target_amount" ? parseMoneyInput(String(formData.get("initial_amount") ?? "0")) : 0;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  if (!(["personal", "family"] as string[]).includes(scope)) return { error: "Selecciona el ámbito del objetivo." };
  if (!(["target_amount", "savings_rate", "expense_limit"] as string[]).includes(kind)) return { error: "Selecciona un tipo de objetivo." };
  if (!title || title.length > 120) return { error: "Escribe un nombre de hasta 120 caracteres." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || Number.isNaN(Date.parse(dueOn)) || dueOn < today) return { error: "Elige una fecha límite válida desde hoy." };
  if (targetValue === null || targetValue <= 0 || (kind === "savings_rate" && targetValue > 100)) return { error: "Introduce una meta válida." };
  if (initialAmount === null || initialAmount < 0) return { error: "El ahorro inicial debe ser cero o mayor." };

  const supabase = await createClient();
  const familyUnit = scope === "family" ? await getOrCreateFamilyUnit(supabase, user) : null;
  if (scope === "family" && !familyUnit) return { error: "No se encontró la unidad familiar." };
  const { error } = await supabase.from("financial_goals").insert({
    owner_id: user.id,
    family_unit_id: familyUnit?.id ?? null,
    scope,
    kind,
    title,
    target_value: targetValue,
    initial_amount: initialAmount,
    starts_on: today,
    due_on: dueOn,
  });
  if (error) return { error: "No se pudo guardar el objetivo. Comprueba que la base de datos esté actualizada." };
  refreshGoals();
  return { ok: true };
}

export async function deleteFinancialGoal(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión caducada." };
  const supabase = await createClient();
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar el objetivo." };
  refreshGoals();
  return { ok: true };
}
