import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Budget, Category } from "@/lib/types";
import type { FamilyExpenseCategoryOption } from "@/lib/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CategoriesManager,
  BudgetsManager,
  FamilyCategoriesManager,
} from "./settings-forms";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ data: categories }, { data: budgets }, { data: familyCategories }] =
    await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("budgets").select("*, categories(*)").eq("user_id", user.id),
    supabase
      .from("family_expense_categories")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  const cats = (categories ?? []) as Category[];
  const expenseCategories = cats.filter((category) => category.kind === "expense");

  return (
    <div className="grid w-full gap-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

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
            categories={expenseCategories}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorías de gastos familiares</CardTitle>
          <CardDescription>
            Añade categorías propias para los gastos de la unidad familiar. Las estándar siempre están disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FamilyCategoriesManager
            categories={(familyCategories ?? []) as FamilyExpenseCategoryOption[]}
          />
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
