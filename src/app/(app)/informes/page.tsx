import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, MonthlyReport } from "@/lib/types";
import { ExportPanel } from "./export-panel";
import { ReportsView } from "./reports-view";

export const metadata = { title: "Informes y exportación" };

export default async function InformesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [
    { data: monthlyReports },
    { data: rangeReports },
    { data: summaries },
    { data: budgetPlans },
    { data: categories },
  ] = await Promise.all([
      supabase.from("monthly_reports").select("*").order("month", { ascending: false }),
      supabase
        .from("range_reports")
        .select("*")
        .order("start_month", { ascending: false }),
      supabase.from("monthly_summary").select("month").order("month", { ascending: true }),
      supabase
        .from("monthly_budget_plans")
        .select("month")
        .order("month", { ascending: true }),
      supabase.from("categories").select("*").order("name"),
    ]);

  const earliestMonth = [summaries?.[0]?.month, budgetPlans?.[0]?.month]
    .filter(Boolean)
    .sort()[0] ?? null;
  const reports = [
    ...((monthlyReports ?? []) as MonthlyReport[]).map((r) => ({
      ...r,
      kind: "month" as const,
      end_month: r.month,
    })),
    ...((rangeReports ?? []) as Array<{
      id: string;
      user_id: string;
      start_month: string;
      end_month: string;
      content_md: string;
      content_json: Record<string, unknown> | null;
      created_at: string;
    }>).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      month: r.start_month,
      end_month: r.end_month,
      kind: "range" as const,
      content_md: r.content_md,
      content_json: r.content_json,
      created_at: r.created_at,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="grid max-w-4xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Informes y exportación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera análisis financieros con IA o descarga tus datos cuando los necesites.
        </p>
      </div>

      <ExportPanel categories={(categories ?? []) as Category[]} />

      <ReportsView reports={reports} earliestMonth={earliestMonth} />
    </div>
  );
}
