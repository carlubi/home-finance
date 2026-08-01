import { describe, expect, it } from "vitest";
import {
  buildBudgetMonths,
  buildYearExpenseOverview,
  getBudgetIntensity,
  getSuggestedOutcome,
  normalizeBudgetMonth,
} from "./monthly-budgets";
import type { Expense } from "./types";

describe("monthly budget helpers", () => {
  it("builds the full current-year map from January to December", () => {
    expect(buildBudgetMonths(2026)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
  });

  it("normalizes month inputs to the first day of the month", () => {
    expect(normalizeBudgetMonth("2026-08")).toBe("2026-08-01");
    expect(normalizeBudgetMonth("2026-08-01")).toBe("2026-08-01");
  });

  it("classifies monthly budget strength against the largest planned month", () => {
    expect(getBudgetIntensity(250, 1000)).toBe("green");
    expect(getBudgetIntensity(650, 1000)).toBe("orange");
    expect(getBudgetIntensity(900, 1000)).toBe("red");
  });

  it("suggests the closing outcome from planned vs actual spend", () => {
    expect(getSuggestedOutcome(1000, 900)).toBe("under");
    expect(getSuggestedOutcome(1000, 1005)).toBe("met");
    expect(getSuggestedOutcome(1000, 1100)).toBe("over");
  });

  it("builds a monthly expense overview with top expenses by amount", () => {
    const overview = buildYearExpenseOverview({
      months: ["2026-01-01", "2026-02-01"],
      expenses: [
        { id: "1", name: "Cafe", amount: 4, occurred_at: "2026-01-10" },
        { id: "2", name: "Alquiler", amount: 900, occurred_at: "2026-01-01" },
        { id: "3", name: "Compra", amount: 80, occurred_at: "2026-01-08" },
        { id: "4", name: "Seguro", amount: 240, occurred_at: "2026-01-05" },
      ] as Expense[],
    });

    expect(overview[0].total).toBe(1224);
    expect(overview[0].topExpenses.map((expense) => expense.name)).toEqual([
      "Alquiler",
      "Seguro",
      "Compra",
    ]);
    expect(overview[1].expenses).toEqual([]);
  });
});
