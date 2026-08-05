import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sincroniza el ingreso mensual (salario) configurado en Resumen/Onboarding
 * con la tabla `income`: crea un movimiento "Salario" el día 1 de cada mes.
 * Si `scope` es "global", actualiza todos los salarios automáticos. Si es
 * "from_month", solo toca el mes indicado y los posteriores.
 *
 * Los movimientos llevan `auto_salary = true`, así que los ingresos añadidos
 * a mano por el usuario nunca se tocan.
 */
export async function syncSalaryIncome(
  supabase: SupabaseClient,
  userId: string,
  amount: number | null,
  options: {
    scope?: "global" | "from_month";
    effectiveMonth?: string;
  } = {}
): Promise<{ error?: string }> {
  const scope = options.scope ?? "global";
  const effectiveMonth = options.effectiveMonth ?? `${new Date().getFullYear()}-01-01`;

  if (amount === null || amount <= 0) {
    let query = supabase
      .from("income")
      .delete()
      .eq("user_id", userId)
      .eq("auto_salary", true);
    if (scope === "from_month") query = query.gte("occurred_at", effectiveMonth);

    const { error } = await query;
    return error ? { error: "No se pudieron retirar los salarios automáticos." } : {};
  }

  // Categoría global "Salario"
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("kind", "income")
    .eq("name", "Salario")
    .is("user_id", null)
    .maybeSingle();

  const { data: existing, error: readError } = await supabase
    .from("income")
    .select("id, occurred_at")
    .eq("user_id", userId)
    .eq("auto_salary", true);
  if (readError) {
    return { error: "No se pudo leer el salario actual: " + readError.message };
  }

  // Actualizar los existentes según el alcance seleccionado.
  if ((existing ?? []).length > 0) {
    let query = supabase
      .from("income")
      .update({
        amount,
        name: "Salario",
        category_id: category?.id ?? null,
        is_recurring: true,
      })
      .eq("user_id", userId)
      .eq("auto_salary", true);

    if (scope === "from_month") query = query.gte("occurred_at", effectiveMonth);

    const { error } = await query;
    if (error) return { error: "No se pudo actualizar el salario mensual." };
  }

  // Crear los meses del año en curso que falten, respetando el mes efectivo.
  const effectiveDate = new Date(effectiveMonth + "T00:00:00");
  const year = effectiveDate.getFullYear();
  const startIndex = scope === "from_month" ? effectiveDate.getMonth() : 0;
  const existingMonths = new Set(
    (existing ?? []).map((r) => String(r.occurred_at).slice(0, 7))
  );
  const missing = Array.from({ length: 12 - startIndex }, (_, offset) => {
    const i = startIndex + offset;
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return existingMonths.has(month) ? null : `${month}-01`;
  }).filter((d): d is string => d !== null);

  if (missing.length > 0) {
    const { error } = await supabase.from("income").insert(
      missing.map((occurred_at) => ({
        user_id: userId,
        name: "Salario",
        category_id: category?.id ?? null,
        amount,
        occurred_at,
        is_recurring: true,
        auto_salary: true,
        source: "manual",
      }))
    );
    if (error) return { error: "No se pudo crear el salario mensual." };
  }

  return {};
}
