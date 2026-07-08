import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyReport } from "@/lib/types";
import { ReportsView } from "./reports-view";

export const metadata = { title: "Informes IA" };

export default async function InformesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reports } = await supabase
    .from("monthly_reports")
    .select("*")
    .order("month", { ascending: false });

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Informes IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada mes la IA analiza tus finanzas: en qué gastas más, qué podrías
          evitar, patrones detectados y un plan de acción personalizado.
        </p>
      </div>
      <ReportsView reports={(reports ?? []) as MonthlyReport[]} />
    </div>
  );
}
