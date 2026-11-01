"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveSavingsAccount(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const balance = parseMoneyInput(String(formData.get("balance") ?? ""));
  if (balance === null || balance < 0 || balance > 999999999999.99) {
    return { error: "Introduce un saldo válido, igual o mayor que cero." };
  }
  const isRemunerated = formData.get("is_remunerated") === "on";
  const { error } = await supabase.from("savings_accounts").upsert({
    user_id: user.id, is_remunerated: isRemunerated, balance,
  }, { onConflict: "user_id" });
  if (error) return { error: "No se pudo guardar la cuenta de ahorro." };
  revalidatePath("/", "layout");
  revalidatePath("/global");
  return { ok: true };
}

export async function saveSavingsInterestRate(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const month = String(formData.get("starts_on") ?? "");
  const rawRate = String(formData.get("annual_rate_pct") ?? "").trim().replace(",", ".");
  const rate = Number(rawRate);
  const payoutFrequency = String(formData.get("payout_frequency") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Selecciona un mes válido." };
  if (!rawRate || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { error: "El interés anual debe estar entre 0 % y 100 %." };
  }
  if (payoutFrequency !== "monthly" && payoutFrequency !== "annual") {
    return { error: "Selecciona cuándo se abonan los intereses." };
  }
  const { data: account, error: accountError } = await supabase.from("savings_accounts")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (accountError || !account) return { error: "Guarda primero la cuenta remunerada." };
  const { error } = await supabase.from("savings_interest_rates").upsert({
    user_id: user.id, starts_on: `${month}-01`, annual_rate_pct: rate,
    payout_frequency: payoutFrequency,
  }, { onConflict: "user_id,starts_on" });
  if (error) return { error: "No se pudo guardar el tipo de interés." };
  revalidatePath("/", "layout");
  revalidatePath("/global");
  return { ok: true };
}

export async function deleteSavingsInterestRate(id: string) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const { error } = await supabase.from("savings_interest_rates")
    .delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar el tipo de interés." };
  revalidatePath("/", "layout");
  revalidatePath("/global");
  return { ok: true };
}

