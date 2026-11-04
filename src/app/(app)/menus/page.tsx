import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAccess, getOrCreateFamilyUnit } from "@/lib/family-unit";
import { MenusView, type MenuMeal, type MenuRecipe } from "./menus-view";

export const metadata = { title: "Menús" };

export default async function MenusPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes ?? "") ? mes! : currentMonth;
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5));
  const next = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");
  const familyAccess = (await getFamilyAccess(supabase, user.id, familyUnit)).menus;
  if (familyAccess === "none") redirect("/familia/gestion-miembros");
  const [{ data: recipes, error: recipesError }, { data: meals, error: mealsError }] = await Promise.all([
    supabase.from("menu_recipes").select("id,name,ingredients,instructions,source_url").eq("family_unit_id", familyUnit.id).order("name"),
    supabase.from("menu_meals").select("id,meal_date,meal_type,title,notes,recipe_id,source_url")
      .eq("family_unit_id", familyUnit.id).gte("meal_date", `${month}-01`).lt("meal_date", `${next}-01`)
      .order("meal_date").order("created_at"),
  ]);

  return <MenusView key={month} month={month} canEdit={familyAccess === "edit"} recipes={(recipes ?? []) as MenuRecipe[]} meals={(meals ?? []) as MenuMeal[]}
    loadError={recipesError?.message ?? mealsError?.message ?? null} />;
}
