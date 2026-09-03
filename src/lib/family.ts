export const FAMILY_EXPENSE_CATEGORIES = [
  "Hipoteca",
  "Luz",
  "Gas",
  "Agua",
  "IBI",
  "WiFi",
  "Comida",
  "Extras",
  "Seguro de vida",
  "Seguro de hogar",
  "Gastos de comunidad de vecinos",
  "Transporte",
  "Tasa de basuras",
] as const;

export type FamilyExpenseCategory = (typeof FAMILY_EXPENSE_CATEGORIES)[number];

export type FamilyExpenseCategoryOption = {
  id?: string;
  name: string;
  color: string | null;
};

const FAMILY_CATEGORY_COLORS: Record<FamilyExpenseCategory, string> = {
  Hipoteca: "#4a3aa7",
  Luz: "#c98500",
  Gas: "#d95926",
  Agua: "#3987e5",
  IBI: "#1c5cab",
  WiFi: "#9085e9",
  Comida: "#1baf7a",
  Extras: "#e87ba4",
  "Seguro de vida": "#e34948",
  "Seguro de hogar": "#2a78d6",
  "Gastos de comunidad de vecinos": "#008300",
  Transporte: "#eb6834",
  "Tasa de basuras": "#898781",
};

export function familyCategoryColor(category: string, customColor?: string | null) {
  return customColor ?? FAMILY_CATEGORY_COLORS[category as FamilyExpenseCategory] ?? "#898781";
}

export function isFamilyExpenseCategory(value: string): value is FamilyExpenseCategory {
  return FAMILY_EXPENSE_CATEGORIES.includes(value as FamilyExpenseCategory);
}

export function familyCategoryOptions(
  customCategories: FamilyExpenseCategoryOption[] = []
) {
  return [
    ...FAMILY_EXPENSE_CATEGORIES.map((name) => ({
      name,
      color: FAMILY_CATEGORY_COLORS[name],
    })),
    ...customCategories,
  ];
}
