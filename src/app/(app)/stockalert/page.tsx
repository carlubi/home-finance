import { createClient } from "@/lib/supabase/server";
import { StockAlertView, type StockProduct } from "./stockalert-view";

export const metadata = { title: "StockAlert · Despensa" };

export default async function StockAlertPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stockalert_products")
    .select("id,name,brand,units,expiration_date,confidence,needs_review,status,created_at")
    .order("expiration_date", { ascending: true, nullsFirst: false });
  return <StockAlertView products={(data ?? []) as StockProduct[]} loadError={error?.message ?? null} />;
}
