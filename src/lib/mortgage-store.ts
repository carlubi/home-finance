import "server-only";

import { parseMortgageDraft, type MortgageDraft } from "./mortgage-config";
import { createClient } from "./supabase/server";

export async function storeMortgageForUnit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyUnitId: string,
  draft: MortgageDraft,
  createOnly = false
) {
  const parsed = parseMortgageDraft(draft);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  if (createOnly) {
    const { data: existing, error: readError } = await supabase.from("family_mortgages")
      .select("family_unit_id").eq("family_unit_id", familyUnitId).maybeSingle();
    if (readError) return { error: "No se pudo comprobar la hipoteca familiar." };
    if (existing) return { ok: true };
  }
  const mortgage = parsed.data!;
  const payload = {
    family_unit_id: familyUnitId,
    rate_kind: mortgage.rateKind,
    lender: mortgage.lender,
    first_borrower: mortgage.firstBorrower,
    second_borrower: mortgage.secondBorrower,
    first_share_percent: mortgage.firstSharePercent,
    purchase_price: mortgage.purchasePrice,
    principal: mortgage.principal,
    started_on: mortgage.startedOn,
    ends_on: mortgage.endsOn,
    fixed_rate: mortgage.fixedRate,
    fixed_payment: mortgage.fixedPayment,
    current_payment: mortgage.currentPayment,
    fixed_until: mortgage.fixedUntil,
    variable_from: mortgage.variableFrom,
    spread: mortgage.spread,
    last_recorded_on: mortgage.lastRecordedOn,
    last_recorded_balance: mortgage.lastRecordedBalance,
    paid_total_to_date: mortgage.paidTotalToDate,
    updated_at: new Date().toISOString(),
  };
  const { error } = createOnly
    ? await supabase.from("family_mortgages").insert(payload)
    : await supabase.from("family_mortgages").upsert(payload, { onConflict: "family_unit_id" });
  if (error) return { error: "No se pudo guardar la hipoteca. Comprueba los datos y la base de datos." };
  return { ok: true };
}
