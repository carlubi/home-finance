"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isFamilyExpenseCategory } from "@/lib/family";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";

async function getFamilyCategoryNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyUnitId: string
) {
  const { data } = await supabase
    .from("family_expense_categories")
    .select("name")
    .eq("family_unit_id", familyUnitId);
  return (data ?? []).map((category) => category.name);
}

function resolveFamilyCategory(value: string | null | undefined, customNames: string[]) {
  const category = String(value ?? "").trim();
  if (isFamilyExpenseCategory(category)) return category;
  return (
    customNames.find(
      (name) => name.toLocaleLowerCase("es-ES") === category.toLocaleLowerCase("es-ES")
    ) ?? "Extras"
  );
}

export async function updateExtractedRow(input: {
  id: string;
  name: string;
  amount: number;
  occurred_at: string;
  suggested_category_id: string | null;
  suggested_category?: string | null;
  people_count?: number;
  kind: "expense" | "income";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  if (!input.name.trim() || !(input.amount > 0) || !input.occurred_at) {
    return { error: "Revisa nombre, importe y fecha." };
  }

  const { data: extracted } = await supabase
    .from("ai_extracted_transactions")
    .select("import_id")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .single();
  if (!extracted) return { error: "No se pudo actualizar." };

  const { data: importedFile } = await supabase
    .from("imported_files")
    .select("import_scope")
    .eq("id", extracted.import_id)
    .eq("user_id", user.id)
    .single();

  const familyCategoryNames =
    importedFile?.import_scope === "family"
      ? await getFamilyCategoryNames(supabase, (await getOrCreateFamilyUnit(supabase, user))?.id ?? "")
      : [];
  const resolvedCategoryFields =
    importedFile?.import_scope === "family"
      ? {
          suggested_category_id: null,
          suggested_category: resolveFamilyCategory(
            input.suggested_category,
            familyCategoryNames
          ),
        }
      : { suggested_category_id: input.suggested_category_id };
  const peopleFields =
    importedFile?.import_scope === "family"
      ? {
          people_count:
            Number.isInteger(input.people_count) &&
            (input.people_count ?? 0) >= 1 &&
            (input.people_count ?? 0) <= 50
              ? input.people_count
              : 1,
        }
      : {};

  const { error } = await supabase
    .from("ai_extracted_transactions")
    .update({
      name: input.name.trim(),
      amount: input.amount,
      occurred_at: input.occurred_at,
      kind: input.kind,
      ...resolvedCategoryFields,
      ...peopleFields,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo actualizar." };
  return { ok: true };
}

export async function discardExtractedRow(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("ai_extracted_transactions")
    .update({ status: "discarded" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo descartar." };
  return { ok: true };
}

export async function restoreExtractedRow(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("ai_extracted_transactions")
    .update({ status: "pending" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo restaurar." };
  return { ok: true };
}

export async function confirmImport(importId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  const { data: importedFile } = await supabase
    .from("imported_files")
    .select("import_scope")
    .eq("id", importId)
    .eq("user_id", user.id)
    .single();
  if (!importedFile) return { error: "Importación no encontrada." };

  const { data: rows } = await supabase
    .from("ai_extracted_transactions")
    .select("*")
    .eq("import_id", importId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (!rows || rows.length === 0) {
    return { error: "No hay transacciones pendientes de confirmar." };
  }

  if (importedFile.import_scope === "family") {
    if (rows.some((row) => row.kind !== "expense")) {
      return {
        error: "Una importación familiar solo puede contener gastos, no ingresos.",
      };
    }

    const familyUnit = await getOrCreateFamilyUnit(supabase, user);
    if (!familyUnit) return { error: "No se pudo acceder a la unidad familiar." };
    const familyCategoryNames = await getFamilyCategoryNames(supabase, familyUnit.id);
    const familyExpenses = rows.map((row) => ({
      user_id: user.id,
      family_unit_id: familyUnit.id,
      name: row.name,
      category: resolveFamilyCategory(row.suggested_category, familyCategoryNames),
      amount: row.amount,
      occurred_at: row.occurred_at,
      people_count: row.people_count ?? 1,
      notes: row.notes,
      import_id: importId,
    }));
    const { error } = await supabase.from("family_expenses").insert(familyExpenses);
    if (error) return { error: "No se pudieron guardar los gastos familiares." };

    await supabase
      .from("ai_extracted_transactions")
      .update({ status: "confirmed" })
      .eq("import_id", importId)
      .eq("user_id", user.id)
      .eq("status", "pending");
    await supabase
      .from("imported_files")
      .update({ status: "confirmed" })
      .eq("id", importId)
      .eq("user_id", user.id);

    revalidatePath("/familia");
    revalidatePath("/importar");
    return { ok: true, count: familyExpenses.length, scope: "family" as const };
  }

  const expenses = rows
    .filter((r) => r.kind === "expense")
    .map((r) => ({
      user_id: user.id,
      name: r.name,
      category_id: r.suggested_category_id,
      amount: r.amount,
      occurred_at: r.occurred_at,
      notes: r.notes,
      source: "import",
      import_id: importId,
    }));
  const income = rows
    .filter((r) => r.kind === "income")
    .map((r) => ({
      user_id: user.id,
      name: r.name,
      category_id: r.suggested_category_id,
      amount: r.amount,
      occurred_at: r.occurred_at,
      is_recurring: r.is_recurring,
      notes: r.notes,
      source: "import",
      import_id: importId,
    }));

  if (expenses.length > 0) {
    const { error } = await supabase.from("expenses").insert(expenses);
    if (error) return { error: "No se pudieron guardar los gastos." };
  }
  if (income.length > 0) {
    const { error } = await supabase.from("income").insert(income);
    if (error) return { error: "No se pudieron guardar los ingresos." };
  }

  await supabase
    .from("ai_extracted_transactions")
    .update({ status: "confirmed" })
    .eq("import_id", importId)
    .eq("user_id", user.id)
    .eq("status", "pending");
  await supabase
    .from("imported_files")
    .update({ status: "confirmed" })
    .eq("id", importId)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
  return { ok: true, count: rows.length, scope: "personal" as const };
}

export async function deleteImport(importId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from("imported_files")
    .delete()
    .eq("id", importId)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar." };
  revalidatePath("/importar");
  return { ok: true };
}
