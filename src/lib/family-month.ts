import type { FamilyExpense, FamilyRecurringExpense } from "./types";
import { recurringMonthlyAmount, recurringOccursInMonth } from "./recurring";

/** Normaliza una fecha (YYYY-MM-DD) a su mes (YYYY-MM-01). */
export function familyMonthKey(value: string) {
  return `${value.slice(0, 7)}-01`;
}

export function familyRecurringIsActive(expense: FamilyRecurringExpense, month: string) {
  return (
    expense.active &&
    expense.starts_on <= month &&
    (!expense.ends_on || expense.ends_on >= month) &&
    recurringOccursInMonth(expense.frequency ?? "monthly", expense.custom_months, month)
  );
}

type Skip = { recurring_expense_id: string; month: string };

/**
 * Total neto de la unidad familiar en un mes (gastos − ingresos), con la
 * misma regla que la página de Familia: recurrentes activos que no se han
 * sustituido ni saltado ese mes + movimientos manuales del mes.
 */
export function familyMonthTotal({
  expenses,
  recurring,
  skips,
  month,
}: {
  expenses: Pick<FamilyExpense, "amount" | "occurred_at" | "recurring_expense_id">[];
  recurring: FamilyRecurringExpense[];
  skips: Skip[];
  month: string;
}) {
  const monthExpenses = expenses.filter((expense) => familyMonthKey(expense.occurred_at) === month);
  const overridden = (id: string) =>
    expenses.some((expense) => expense.recurring_expense_id === id && familyMonthKey(expense.occurred_at) === month) ||
    skips.some((skip) => skip.recurring_expense_id === id && skip.month === month);
  const activeRecurring = recurring.filter((expense) => familyRecurringIsActive(expense, month) && !overridden(expense.id));

  const signed = (kind: string | null | undefined, amount: number) => (kind === "income" ? -1 : 1) * amount;
  const total =
    activeRecurring.reduce(
      (sum, expense) => sum + signed(expense.entry_kind, recurringMonthlyAmount(Number(expense.monthly_amount), expense.frequency ?? "monthly")),
      0
    ) + monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return { total, count: activeRecurring.length + monthExpenses.length };
}
