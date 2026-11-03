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
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { currentMadridMonth } from "@/lib/format";
import { StartingBalanceSettings } from "./starting-balance-settings";

export const metadata = { title: "Configuración" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");

  const [{ data: categories }, { data: budgets }, { data: familyCategories }, { data: startingBalance }] =
    await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("budgets").select("*, categories(*)").eq("user_id", user.id),
    supabase
      .from("family_expense_categories")
      .select("id, name, color")
      .eq("family_unit_id", familyUnit.id)
      .order("name"),
    supabase.from("personal_starting_balances")
      .select("starts_on,amount")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const cats = (categories ?? []) as Category[];
  const expenseCategories = cats.filter((category) => category.kind === "expense");

  return (
    <div className="grid w-full gap-4">
      <h1 className="text-2xl font-medium">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo inicial de ahorro</CardTitle>
          <CardDescription>
            Indica cuánto habías ahorrado y en qué mes ya disponías de ese dinero. Se suma al ahorro total y genera intereses desde ese mes si tienes una cuenta remunerada; no se registra como ingreso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StartingBalanceSettings
            balance={startingBalance ? { starts_on: startingBalance.starts_on, amount: Number(startingBalance.amount) } : null}
            currentMonth={currentMadridMonth()}
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
            Crea categorías de gastos, ingresos e inversiones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager categories={cats} />
        </CardContent>
      </Card>
    </div>
  );
}
