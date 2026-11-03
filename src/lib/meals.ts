/**
 * Tipos de comida del planificador de menús, en el orden en que deben
 * aparecer siempre: desayuno → comida → merienda → cena.
 */
export const MEAL_TYPES = [
  { id: "breakfast", label: "Desayuno", plural: "Desayunos", short: "D" },
  { id: "lunch", label: "Comida", plural: "Comidas", short: "C" },
  { id: "snack", label: "Merienda", plural: "Meriendas", short: "M" },
  { id: "dinner", label: "Cena", plural: "Cenas", short: "Ce" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["id"];

export const MEAL_TYPE_IDS = MEAL_TYPES.map((type) => type.id) as MealType[];

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPE_IDS as string[]).includes(value);
}

export function mealLabel(value: string) {
  return MEAL_TYPES.find((type) => type.id === value)?.label ?? "Comida";
}

const order = new Map<string, number>(MEAL_TYPES.map((type, index) => [type.id, index]));

/** Ordena por tipo de comida y, dentro de cada tipo, conserva el orden recibido. */
export function sortMeals<T extends { meal_type: string }>(meals: readonly T[]): T[] {
  return meals
    .map((meal, index) => ({ meal, index }))
    .sort((a, b) => (order.get(a.meal.meal_type) ?? 99) - (order.get(b.meal.meal_type) ?? 99) || a.index - b.index)
    .map(({ meal }) => meal);
}
