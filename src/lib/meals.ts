/**
 * Tipos de comida del planificador de menús, en el orden en que deben
 * aparecer siempre: desayuno → comida → merienda → cena.
 */
import type { AppLanguage } from "@/lib/language";

export const MEAL_TYPES = [
  { id: "breakfast", label: "Desayuno", plural: "Desayunos", caLabel: "Esmorzar", caPlural: "Esmorzars" },
  { id: "lunch", label: "Comida", plural: "Comidas", caLabel: "Dinar", caPlural: "Dinars" },
  { id: "snack", label: "Merienda", plural: "Meriendas", caLabel: "Berenar", caPlural: "Berenars" },
  { id: "dinner", label: "Cena", plural: "Cenas", caLabel: "Sopar", caPlural: "Sopars" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["id"];

export const MEAL_TYPE_IDS = MEAL_TYPES.map((type) => type.id) as MealType[];

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPE_IDS as string[]).includes(value);
}

export function mealLabel(value: string, language: AppLanguage = "es") {
  const type = MEAL_TYPES.find((item) => item.id === value);
  return language === "ca" ? type?.caLabel ?? "Dinar" : type?.label ?? "Comida";
}

export function mealPlural(value: string, language: AppLanguage = "es") {
  const type = MEAL_TYPES.find((item) => item.id === value);
  return language === "ca" ? type?.caPlural ?? "Dinars" : type?.plural ?? "Comidas";
}

const order = new Map<string, number>(MEAL_TYPES.map((type, index) => [type.id, index]));

/** Ordena por tipo de comida y, dentro de cada tipo, conserva el orden recibido. */
export function sortMeals<T extends { meal_type: string }>(meals: readonly T[]): T[] {
  return meals
    .map((meal, index) => ({ meal, index }))
    .sort((a, b) => (order.get(a.meal.meal_type) ?? 99) - (order.get(b.meal.meal_type) ?? 99) || a.index - b.index)
    .map(({ meal }) => meal);
}
