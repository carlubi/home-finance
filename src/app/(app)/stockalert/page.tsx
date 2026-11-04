import { createClient } from "@/lib/supabase/server";
import { StockAlertView, type StockProduct } from "./stockalert-view";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFamilyAccess, getOrCreateFamilyUnit } from "@/lib/family-unit";

export const metadata = { title: "StockAlert · Despensa" };

export default async function StockAlertPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");
  const familyAccess = (await getFamilyAccess(supabase, user.id, familyUnit)).pantry;
  if (familyAccess === "none") redirect("/familia/gestion-miembros");
  const { data, error } = await supabase.from("stockalert_products")
    .select("id,name,brand,units,expiration_date,confidence,needs_review,status,created_at")
    .eq("family_unit_id", familyUnit.id)
    .order("expiration_date", { ascending: true, nullsFirst: false });
  return <StockAlertView products={(data ?? []) as StockProduct[]} loadError={error?.message ?? null} canEdit={familyAccess === "edit"} />;
}
