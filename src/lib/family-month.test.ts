import { describe, expect, it } from "vitest";
import { familyMonthTotal } from "./family-month";
import type { FamilyRecurringExpense } from "./types";

const recurring = (over: Partial<FamilyRecurringExpense>): FamilyRecurringExpense => ({
  id: "r1", user_id: "u", name: "Luz", category: "Luz", monthly_amount: 60, entry_kind: "expense",
  frequency: "monthly", custom_months: null, people_count: 2, active: true, starts_on: "2026-01-01",
  ends_on: null, notes: null, created_at: "", updated_at: "", ...over,
});

describe("familyMonthTotal", () => {
  it("suma recurrentes activos y gastos manuales del mes", () => {
    const result = familyMonthTotal({
      month: "2026-11-01",
      recurring: [recurring({}), recurring({ id: "r2", monthly_amount: 100, entry_kind: "income" })],
      expenses: [
        { amount: 40, occurred_at: "2026-11-05", recurring_expense_id: null },
        { amount: 999, occurred_at: "2026-10-30", recurring_expense_id: null },
      ],
      skips: [],
    });
    expect(result).toEqual({ total: 60 - 100 + 40, count: 3 });
  });

  it("no cuenta un recurrente sustituido o saltado ese mes", () => {
    const result = familyMonthTotal({
      month: "2026-11-01",
      recurring: [recurring({}), recurring({ id: "r2" })],
      expenses: [{ amount: 75, occurred_at: "2026-11-02", recurring_expense_id: "r1" }],
      skips: [{ recurring_expense_id: "r2", month: "2026-11-01" }],
    });
    expect(result).toEqual({ total: 75, count: 1 });
  });
});
