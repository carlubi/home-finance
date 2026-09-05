import { roundCents } from "./finance";

export const RECURRING_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];
export type RecurringEntryKind = "expense" | "income";

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
  custom: "Personalizado",
};

export const recurringMonthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Convierte un importe de su periodicidad a su equivalente mensual presupuestario. */
export function recurringMonthlyAmount(amount: number, frequency: RecurringFrequency = "monthly", customMonths: number[] = []) {
  const factors: Record<RecurringFrequency, number> = {
    daily: 365.25 / 12,
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
    custom: customMonths.length / 12,
  };
  return roundCents(Number(amount ?? 0) * factors[frequency]);
}

export function recurringOccursInMonth(frequency: RecurringFrequency, customMonths: number[] | null | undefined, month: string) {
  return frequency !== "custom" || (customMonths ?? []).includes(Number(month.slice(5, 7)));
}

export function readRecurringMonths(formData: FormData) {
  return [...new Set(formData.getAll("custom_months").map(Number).filter((month) => Number.isInteger(month) && month >= 1 && month <= 12))].sort((a, b) => a - b);
}

export function readRecurringFrequency(value: FormDataEntryValue | null): RecurringFrequency {
  return RECURRING_FREQUENCIES.includes(value as RecurringFrequency)
    ? (value as RecurringFrequency)
    : "monthly";
}

export function readRecurringEntryKind(value: FormDataEntryValue | null): RecurringEntryKind {
  return value === "income" ? "income" : "expense";
}
