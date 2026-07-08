import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category, ExtractedTransaction, ImportedFile } from "@/lib/types";
import { ReviewTable } from "./review-table";

export const metadata = { title: "Revisar importación" };

export default async function RevisarImportacionPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const { importId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [fileRes, rowsRes, categoriesRes] = await Promise.all([
    supabase.from("imported_files").select("*").eq("id", importId).single(),
    supabase
      .from("ai_extracted_transactions")
      .select("*")
      .eq("import_id", importId)
      .order("occurred_at"),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!fileRes.data) notFound();
  const file = fileRes.data as ImportedFile;
  const rows = (rowsRes.data ?? []) as ExtractedTransaction[];

  // Detección de posibles duplicados: mismo importe y misma fecha ya registrados
  const dates = [...new Set(rows.map((r) => r.occurred_at))];
  const duplicates = new Set<string>();
  if (dates.length > 0) {
    const [{ data: existingExpenses }, { data: existingIncome }] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("amount, occurred_at")
          .in("occurred_at", dates),
        supabase
          .from("income")
          .select("amount, occurred_at")
          .in("occurred_at", dates),
      ]);
    const keys = new Set(
      [
        ...(existingExpenses ?? []).map((e) => `expense:${e.occurred_at}:${e.amount}`),
        ...(existingIncome ?? []).map((i) => `income:${i.occurred_at}:${i.amount}`),
      ]
    );
    for (const r of rows) {
      if (keys.has(`${r.kind}:${r.occurred_at}:${r.amount}`)) duplicates.add(r.id);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Revisar importación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {file.file_name} · edita o descarta lo que no encaje y confirma. Nada se
          guarda en tus finanzas hasta que confirmes.
        </p>
      </div>
      <ReviewTable
        importId={importId}
        rows={rows}
        categories={(categoriesRes.data ?? []) as Category[]}
        duplicates={[...duplicates]}
        confirmed={file.status === "confirmed"}
      />
    </div>
  );
}
