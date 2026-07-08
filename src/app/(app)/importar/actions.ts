"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateExtractedRow(input: {
  id: string;
  name: string;
  amount: number;
  occurred_at: string;
  suggested_category_id: string | null;
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

  const { error } = await supabase
    .from("ai_extracted_transactions")
    .update({
      name: input.name.trim(),
      amount: input.amount,
      occurred_at: input.occurred_at,
      suggested_category_id: input.suggested_category_id,
      kind: input.kind,
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

  const { data: rows } = await supabase
    .from("ai_extracted_transactions")
    .select("*")
    .eq("import_id", importId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (!rows || rows.length === 0) {
    return { error: "No hay transacciones pendientes de confirmar." };
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
    .eq("status", "pending");
  await supabase
    .from("imported_files")
    .update({ status: "confirmed" })
    .eq("id", importId);

  revalidatePath("/", "layout");
  return { ok: true, count: rows.length };
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
