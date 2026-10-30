import { describe, expect, it } from "vitest";
import { evaluateGoal, type GoalMetric } from "./goals";
import type { FinancialGoal } from "./types";

const base: FinancialGoal = {
  id: "goal", owner_id: "user", family_unit_id: null, scope: "personal",
  kind: "target_amount", title: "Casa", target_value: 80_000,
  initial_amount: 20_000, starts_on: "2026-01-01", due_on: "2030-12-31", created_at: "2026-01-01",
};
const month: GoalMetric = { month: "2026-01", income: 3_000, expenses: 1_000, expensesWithoutMortgage: 700, savings: 1_500, hasData: true };

describe("financial goal status", () => {
  it("checks an amount target against the pace required by its deadline", () => {
    expect(evaluateGoal(base, [month], "2026-01-29").status).toBe("met");
    expect(evaluateGoal({ ...base, initial_amount: 0 }, [month], "2026-01-29").status).toBe("met");
    expect(evaluateGoal({ ...base, initial_amount: 0 }, [{ ...month, savings: 500 }], "2026-01-29").status).toBe("missed");
  });

  it("compares savings rate to income and spending limit without mortgage", () => {
    const savingsGoal = { ...base, kind: "savings_rate" as const, target_value: 40 };
    const spendingGoal = { ...base, kind: "expense_limit" as const, target_value: 300 };
    expect(evaluateGoal(savingsGoal, [month], "2026-01-29").status).toBe("met");
    expect(evaluateGoal(spendingGoal, [month], "2026-01-29").status).toBe("missed");
    expect(evaluateGoal({ ...spendingGoal, target_value: 700 }, [month], "2026-01-29").status).toBe("met");
  });

  it("keeps a family savings goal neutral until family income is recorded", () => {
    expect(evaluateGoal({ ...base, scope: "family", family_unit_id: "unit" }, [{ ...month, income: 0 }], "2026-01-29").status).toBe("pending");
  });
});
