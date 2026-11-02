"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentMadridMonth, parseMoneyInput } from "@/lib/format";

function revalidateSavings() {
  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  revalidatePath("/global");
}

export async function saveStartingBalance(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };

  const month = String(formData.get("starts_on") ?? "");
  const amount = parseMoneyInput(String(formData.get("amount") ?? ""));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || `${month}-01` > currentMadridMonth()) {
    return { error: "Selecciona un mes válido que no sea futuro." };
  }
  if (amount === null || amount < 0 || amount > 999999999999.99 || Math.round(amount * 100) / 100 !== amount) {
    return { error: "Introduce un saldo válido con hasta dos decimales." };
  }

  const { error } = await supabase.from("personal_starting_balances").upsert({
    user_id: user.id, starts_on: `${month}-01`, amount,
  }, { onConflict: "user_id" });
  if (error) return { error: "No se pudo guardar el saldo inicial." };
  revalidateSavings();
  return { ok: true };
}

export async function deleteStartingBalance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión caducada." };
  const { error } = await supabase.from("personal_starting_balances")
    .delete().eq("user_id", user.id);
  if (error) return { error: "No se pudo quitar el saldo inicial." };
  revalidateSavings();
  return { ok: true };
}
