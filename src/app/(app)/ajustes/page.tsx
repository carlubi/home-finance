import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Budget, Category } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyIncomeForm, CategoriesManager, BudgetsManager } from "./settings-forms";
import { ExportData } from "@/components/export/export-data";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: onboarding }, { data: categories }, { data: budgets }] =
    await Promise.all([
      supabase
        .from("onboarding_answers")
        .select("fixed_income_amount")
        .eq("user_id", user.id)
        .single(),
      supabase.from("categories").select("*").order("name"),
      supabase.from("budgets").select("*, categories(*)").eq("user_id", user.id),
    ]);

  const cats = (categories ?? []) as Category[];

  return (
    <div className="grid w-full gap-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingreso mensual</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyIncomeForm monthlyIncome={onboarding?.fixed_income_amount ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presupuestos por categoría</CardTitle>
          <CardDescription>
            Recibirás una alerta visual en el resumen cuando superes el límite mensual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetsManager
            budgets={(budgets ?? []) as Budget[]}
            categories={cats.filter((c) => c.kind === "expense")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportación de datos</CardTitle>
          <CardDescription>
            Descarga tus movimientos y resúmenes en CSV o Excel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportData categories={cats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorías personalizadas</CardTitle>
          <CardDescription>
            Además de las categorías estándar puedes crear las tuyas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager categories={cats} />
        </CardContent>
      </Card>
    </div>
  );
}
