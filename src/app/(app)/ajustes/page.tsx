import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Budget, Category, FixedExpense } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyIncomeForm, CategoriesManager, BudgetsManager } from "./settings-forms";
import { FixedExpensesManager } from "./settings-forms";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [
    { data: onboarding },
    { data: categories },
    { data: budgets },
    { data: fixedExpenses },
  ] =
    await Promise.all([
      supabase
        .from("onboarding_answers")
        .select("fixed_income_amount, fixed_expense_types")
        .eq("user_id", user.id)
        .single(),
      supabase.from("categories").select("*").order("name"),
      supabase.from("budgets").select("*, categories(*)").eq("user_id", user.id),
      supabase
        .from("fixed_expenses")
        .select("*, categories(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  const cats = (categories ?? []) as Category[];
  let fixed = (fixedExpenses ?? []) as FixedExpense[];
  const onboardingFixedTypes = (onboarding?.fixed_expense_types ?? []) as string[];
  const existingNames = new Set(fixed.map((expense) => expense.name.toLowerCase()));
  const expenseCategories = cats.filter((category) => category.kind === "expense");

  const missingOnboardingFixed = onboardingFixedTypes.filter(
    (name) => !existingNames.has(name.toLowerCase())
  );

  if (missingOnboardingFixed.length > 0) {
    const categoryByName = new Map(
      expenseCategories.map((category) => [category.name.toLowerCase(), category.id])
    );
    const { data: inserted } = await supabase
      .from("fixed_expenses")
      .insert(
        missingOnboardingFixed.map((name) => ({
          user_id: user.id,
          name,
          category_id: categoryByName.get(name.toLowerCase()) ?? null,
          amount: null,
          active: true,
        }))
      )
      .select("*, categories(*)");

    fixed = [...fixed, ...((inserted ?? []) as FixedExpense[])];
  }

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
          <CardTitle className="text-base">Gastos mensuales fijos</CardTitle>
          <CardDescription>
            Añade, edita o elimina pagos recurrentes como alquiler, seguros o suministros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FixedExpensesManager
            fixedExpenses={fixed}
            categories={expenseCategories}
          />
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
            categories={expenseCategories}
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
