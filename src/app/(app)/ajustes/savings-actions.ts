"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/format";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function refreshFinances() {
  revalidatePath("/", "layout");
  revalidatePath("/global");
}

function readMonth(formData: FormData) {
  const month = String(formData.get("starts_on") ?? "");
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `${month}-01` : null;
}

async function ownsAccount(accountId: string, userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("remunerated_accounts")
    .select("id").eq("id", accountId).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

export async function saveRemuneratedAccount(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const allocationMode = String(formData.get("allocation_mode") ?? "");
  const active = formData.get("active") === "on";
  if (!name || name.length > 100) return { error: "Indica el nombre del banco o de la cuenta." };
  if (allocationMode !== "remaining_savings" && allocationMode !== "specified_amount") {
    return { error: "Selecciona cómo se calcula el saldo remunerado." };
  }
  if (allocationMode === "remaining_savings" && active) {
    const { data: other } = await supabase.from("remunerated_accounts")
      .select("id").eq("user_id", user.id).eq("allocation_mode", "remaining_savings").eq("active", true)
      .neq("id", id || "00000000-0000-0000-0000-000000000000").maybeSingle();
    if (other) return { error: "Ya hay una cuenta que usa todo el ahorro disponible." };
  }
  const values = { name, allocation_mode: allocationMode, active };
  const result = id
    ? await supabase.from("remunerated_accounts").update(values).eq("id", id).eq("user_id", user.id).select("id").maybeSingle()
    : await supabase.from("remunerated_accounts").insert({ ...values, user_id: user.id }).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "No se pudo guardar la cuenta remunerada." };
  refreshFinances();
  return { ok: true };
}

export async function deleteRemuneratedAccount(id: string) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const { error } = await supabase.from("remunerated_accounts")
    .delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "No se pudo eliminar la cuenta." };
  refreshFinances();
  return { ok: true };
}

export async function saveSavingsInterestRate(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const accountId = String(formData.get("account_id") ?? "");
  const month = readMonth(formData);
  const endInput = String(formData.get("ends_on") ?? "").trim();
  const endMonth = endInput ? /^\d{4}-(0[1-9]|1[0-2])$/.test(endInput) ? `${endInput}-01` : null : null;
  const rawRate = String(formData.get("annual_rate_pct") ?? "").trim().replace(",", ".");
  const rate = Number(rawRate);
  if (!month) return { error: "Selecciona un mes válido." };
  if (endInput && (!endMonth || endMonth < month)) return { error: "El mes de fin debe ser igual o posterior al de inicio." };
  if (!rawRate || !Number.isFinite(rate) || rate < 0 || rate > 100 || Math.round(rate * 10000) / 10000 !== rate) {
    return { error: "El interés anual debe estar entre 0 % y 100 %, con hasta cuatro decimales." };
  }
  if (!await ownsAccount(accountId, user.id, supabase)) return { error: "No se encontró la cuenta." };
  const { error } = await supabase.from("remunerated_account_rates").upsert({
    account_id: accountId, starts_on: month, ends_on: endMonth, annual_rate_pct: rate,
  }, { onConflict: "account_id,starts_on" });
  if (error) return { error: "No se pudo guardar el tipo de interés." };
  refreshFinances();
  return { ok: true };
}

export async function updateSavingsInterestRate(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const id = String(formData.get("id") ?? "");
  const targetAccountId = String(formData.get("account_id") ?? "");
  const month = readMonth(formData);
  const endInput = String(formData.get("ends_on") ?? "").trim();
  const endMonth = endInput && /^\d{4}-(0[1-9]|1[0-2])$/.test(endInput) ? `${endInput}-01` : null;
  const rawRate = String(formData.get("annual_rate_pct") ?? "").trim().replace(",", ".");
  const rate = Number(rawRate);
  if (!month) return { error: "Selecciona un mes de inicio válido." };
  if (endInput && (!endMonth || endMonth < month)) return { error: "El mes de fin debe ser igual o posterior al de inicio." };
  if (!rawRate || !Number.isFinite(rate) || rate < 0 || rate > 100 || Math.round(rate * 10000) / 10000 !== rate) {
    return { error: "El interés anual debe estar entre 0 % y 100 %, con hasta cuatro decimales." };
  }
  const { data: existing } = await supabase.from("remunerated_account_rates")
    .select("account_id").eq("id", id).maybeSingle();
  if (!existing || !await ownsAccount(existing.account_id, user.id, supabase)
    || !await ownsAccount(targetAccountId, user.id, supabase)) {
    return { error: "No se encontró el tipo o la cuenta." };
  }
  const { data, error } = await supabase.from("remunerated_account_rates")
    .update({ account_id: targetAccountId, starts_on: month, ends_on: endMonth, annual_rate_pct: rate })
    .eq("id", id).eq("account_id", existing.account_id).select("id").maybeSingle();
  if (error?.code === "23505") return { error: "Esa cuenta ya tiene un tipo que comienza en ese mes." };
  if (error || !data) return { error: "No se pudo actualizar el tipo de interés." };
  refreshFinances();
  return { ok: true };
}

export async function deleteSavingsInterestRate(id: string, accountId: string) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  if (!await ownsAccount(accountId, user.id, supabase)) return { error: "No se encontró la cuenta." };
  const { error } = await supabase.from("remunerated_account_rates")
    .delete().eq("id", id).eq("account_id", accountId);
  if (error) return { error: "No se pudo eliminar el tipo de interés." };
  refreshFinances();
  return { ok: true };
}

export async function saveSavingsAccountAmount(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const accountId = String(formData.get("account_id") ?? "");
  const month = readMonth(formData);
  const amount = parseMoneyInput(String(formData.get("amount") ?? ""));
  if (!month) return { error: "Selecciona un mes válido." };
  if (amount === null || amount < 0 || amount > 999999999999.99 || Math.round(amount * 100) / 100 !== amount) {
    return { error: "Introduce un importe válido con hasta dos decimales." };
  }
  if (!await ownsAccount(accountId, user.id, supabase)) return { error: "No se encontró la cuenta." };
  const { error } = await supabase.from("remunerated_account_amounts").upsert({
    account_id: accountId, starts_on: month, amount,
  }, { onConflict: "account_id,starts_on" });
  if (error) return { error: "No se pudo guardar el importe de la cuenta." };
  refreshFinances();
  return { ok: true };
}

export async function updateSavingsAccountAmount(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  const id = String(formData.get("id") ?? "");
  const targetAccountId = String(formData.get("account_id") ?? "");
  const month = readMonth(formData);
  const amount = parseMoneyInput(String(formData.get("amount") ?? ""));
  if (!month) return { error: "Selecciona un mes válido." };
  if (amount === null || amount < 0 || amount > 999999999999.99 || Math.round(amount * 100) / 100 !== amount) {
    return { error: "Introduce un importe válido con hasta dos decimales." };
  }
  const { data: target } = await supabase.from("remunerated_accounts")
    .select("id,allocation_mode").eq("id", targetAccountId).eq("user_id", user.id).maybeSingle();
  const { data: existing } = await supabase.from("remunerated_account_amounts")
    .select("account_id").eq("id", id).maybeSingle();
  if (!existing || !await ownsAccount(existing.account_id, user.id, supabase)
    || !target || target.allocation_mode !== "specified_amount") {
    return { error: "Selecciona una cuenta de importe concreto válida." };
  }
  const { data, error } = await supabase.from("remunerated_account_amounts")
    .update({ account_id: targetAccountId, starts_on: month, amount })
    .eq("id", id).eq("account_id", existing.account_id).select("id").maybeSingle();
  if (error?.code === "23505") return { error: "Esa cuenta ya tiene un saldo que comienza en ese mes." };
  if (error || !data) return { error: "No se pudo actualizar el importe." };
  refreshFinances();
  return { ok: true };
}

export async function deleteSavingsAccountAmount(id: string, accountId: string) {
  const { supabase, user } = await context();
  if (!user) return { error: "Sesión caducada." };
  if (!await ownsAccount(accountId, user.id, supabase)) return { error: "No se encontró la cuenta." };
  const { error } = await supabase.from("remunerated_account_amounts")
    .delete().eq("id", id).eq("account_id", accountId);
  if (error) return { error: "No se pudo eliminar el importe." };
  refreshFinances();
  return { ok: true };
}
