import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FamilyExpenseCategoryOption } from "@/lib/family";
import type { Category, ExtractedTransaction, ImportedFile } from "@/lib/types";
import { ReviewTable } from "./review-table";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";

export const metadata = { title: "Revisar importación" };

export default async function RevisarImportacionPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const { importId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);

  const [fileRes, rowsRes, categoriesRes, familyCategoriesRes] = await Promise.all([
    supabase.from("imported_files").select("*").eq("id", importId).single(),
    supabase
      .from("ai_extracted_transactions")
      .select("*")
      .eq("import_id", importId)
      .order("occurred_at"),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("family_expense_categories")
      .select("id, name, color")
      .eq("family_unit_id", familyUnit?.id ?? "")
      .order("name"),
  ]);

  if (!fileRes.data) notFound();
  const file = fileRes.data as ImportedFile;
  const rows = (rowsRes.data ?? []) as ExtractedTransaction[];

  // Detección de posibles duplicados: mismo importe y misma fecha ya registrados
  const dates = [...new Set(rows.map((r) => r.occurred_at))];
  const duplicates = new Set<string>();
  if (dates.length > 0) {
    const [
      { data: existingExpenses },
      { data: existingIncome },
      { data: existingFamilyExpenses },
    ] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("amount, occurred_at")
          .eq("user_id", user.id)
          .in("occurred_at", dates),
        supabase
          .from("income")
          .select("amount, occurred_at")
          .eq("user_id", user.id)
          .in("occurred_at", dates),
        supabase
          .from("family_expenses")
          .select("amount, occurred_at")
          .eq("family_unit_id", familyUnit?.id ?? "")
          .in("occurred_at", dates),
      ]);
    const keys = new Set(
      [
        ...(existingExpenses ?? []).map((e) => `expense:${e.occurred_at}:${e.amount}`),
        ...(existingIncome ?? []).map((i) => `income:${i.occurred_at}:${i.amount}`),
        ...(existingFamilyExpenses ?? []).map(
          (e) => `family:${e.occurred_at}:${e.amount}`
        ),
      ]
    );
    for (const r of rows) {
      const key = file.import_scope === "family"
        ? `family:${r.occurred_at}:${r.amount}`
        : `${r.kind}:${r.occurred_at}:${r.amount}`;
      if (keys.has(key)) duplicates.add(r.id);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Revisar importación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {file.file_name} · edita o descarta lo que no encaje y confirma. Nada se
          guarda hasta que confirmes en {file.import_scope === "family" ? "gastos familiares" : "gastos personales"}.
        </p>
      </div>
      <ReviewTable
        importId={importId}
        scope={file.import_scope}
        rows={rows}
        categories={(categoriesRes.data ?? []) as Category[]}
        familyCategories={(familyCategoriesRes.data ?? []) as FamilyExpenseCategoryOption[]}
        duplicates={[...duplicates]}
        confirmed={file.status === "confirmed"}
      />
    </div>
  );
}
