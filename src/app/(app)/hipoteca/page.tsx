import type { Metadata } from "next";
import { MortgageView } from "./mortgage-view";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { createClient } from "@/lib/supabase/server";
import type { MortgageTerms, MortgagePayment } from "@/lib/mortgage";
import { MortgageConfiguration } from "./mortgage-configuration";

export const metadata: Metadata = { title: "Hipoteca" };

export default async function MortgagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");
  const [{ data: row }, { data: paymentRows }] = await Promise.all([
    supabase.from("family_mortgages").select("*").eq("family_unit_id", familyUnit.id).maybeSingle(),
    supabase.from("family_mortgage_payments").select("month,payment,balance").eq("family_unit_id", familyUnit.id).order("month"),
  ]);
  if (!row) return <div className="mx-auto max-w-6xl"><MortgageConfiguration mortgage={null} /></div>;
  const mortgage: MortgageTerms = {
    familyUnitId: row.family_unit_id,
    rateKind: row.rate_kind ?? "mixed",
    lender: row.lender,
    firstBorrower: row.first_borrower,
    secondBorrower: row.second_borrower,
    firstSharePercent: Number(row.first_share_percent),
    purchasePrice: Number(row.purchase_price),
    principal: Number(row.principal),
    startedOn: row.started_on,
    fixedRate: Number(row.fixed_rate),
    fixedPayment: Number(row.fixed_payment),
    currentPayment: Number(row.current_payment ?? row.fixed_payment),
    fixedUntil: row.fixed_until,
    variableFrom: row.variable_from,
    endsOn: row.ends_on,
    spread: Number(row.spread),
    lastRecordedOn: row.last_recorded_on,
    lastRecordedBalance: Number(row.last_recorded_balance),
    paidTotalToDate: row.paid_total_to_date === null || row.paid_total_to_date === undefined ? null : Number(row.paid_total_to_date),
  };
  const payments: MortgagePayment[] = (paymentRows ?? []).map((payment) => ({ month: payment.month.slice(0, 7), payment: Number(payment.payment), balance: Number(payment.balance) }));
  return <MortgageView key={`${familyUnit.id}:${mortgage.firstSharePercent}:${row.updated_at}`} mortgage={mortgage} recordedPayments={payments} />;
}
