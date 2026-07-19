"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface TransactionInput {
  id?: string;
  kind: "expense" | "income";
  name: string;
  category_id: string | null;
  amount: number;
  occurred_at: string;
  payment_method?: string | null;
  is_recurring?: boolean;
  notes: string | null;
  attachment_path?: string | null;
  tags?: string[];
}

function table(kind: "expense" | "income") {
  return kind === "expense" ? "expenses" : "income";
}

export async function saveTransaction(input: TransactionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  if (!input.name.trim()) return { error: "El nombre es obligatorio." };
  if (!(input.amount > 0)) return { error: "El importe debe ser mayor que 0." };
  if (!input.occurred_at) return { error: "La fecha es obligatoria." };

  const base = {
    user_id: user.id,
    name: input.name.trim(),
    category_id: input.category_id,
    amount: input.amount,
    occurred_at: input.occurred_at,
    notes: input.notes,
  };
  const row: Record<string, unknown> =
    input.kind === "expense"
      ? {
          ...base,
          payment_method: input.payment_method ?? null,
          attachment_path: input.attachment_path ?? null,
          tags: input.tags ?? [],
        }
      : {
          ...base,
          is_recurring: input.is_recurring ?? false,
          // Editar un salario automático lo "desengancha" de Ajustes: se
          // convierte en un ingreso normal y los cambios futuros del
          // ingreso mensual ya no tocan este mes.
          auto_salary: false,
        };

  const query = input.id
    ? supabase.from(table(input.kind)).update(row).eq("id", input.id).eq("user_id", user.id)
    : supabase.from(table(input.kind)).insert(row);

  const { error } = await query;
  if (error) return { error: "No se pudo guardar: " + error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTransaction(kind: "expense" | "income", id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  const { error } = await supabase
    .from(table(kind))
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar." };

  revalidatePath("/", "layout");
  return { ok: true };
}
