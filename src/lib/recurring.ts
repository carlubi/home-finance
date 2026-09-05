import { roundCents } from "./finance";

export const RECURRING_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];
export type RecurringEntryKind = "expense" | "income";

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

/** Convierte un importe de su periodicidad a su equivalente mensual presupuestario. */
export function recurringMonthlyAmount(amount: number, frequency: RecurringFrequency = "monthly") {
  const factors: Record<RecurringFrequency, number> = {
    daily: 365.25 / 12,
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
  };
  return roundCents(Number(amount ?? 0) * factors[frequency]);
}

export function readRecurringFrequency(value: FormDataEntryValue | null): RecurringFrequency {
  return RECURRING_FREQUENCIES.includes(value as RecurringFrequency)
    ? (value as RecurringFrequency)
    : "monthly";
}

export function readRecurringEntryKind(value: FormDataEntryValue | null): RecurringEntryKind {
  return value === "income" ? "income" : "expense";
}
