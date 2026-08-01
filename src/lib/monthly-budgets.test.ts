import { describe, expect, it } from "vitest";
import {
  buildBudgetCategoryTotals,
  buildBudgetMonths,
  buildYearBudgetOverview,
  getBudgetIntensity,
  getSuggestedOutcome,
  normalizeBudgetMonth,
} from "./monthly-budgets";
import type { MonthlyBudgetPlan } from "./types";

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

  it("builds a monthly planned budget overview with top items by amount", () => {
    const plans = [
      {
        month: "2026-01-01",
        monthly_budget_items: [
          { id: "1", name: "Cafe", planned_amount: 4, category_id: null },
          {
            id: "2",
            name: "Alquiler",
            planned_amount: 900,
            category_id: "home",
            categories: { name: "Vivienda", color: "#2a78d6" },
          },
          { id: "3", name: "Compra", planned_amount: 80, category_id: "food" },
          { id: "4", name: "Seguro", planned_amount: 240, category_id: "car" },
        ],
      },
    ] as MonthlyBudgetPlan[];
    const actualTotals = new Map([["2026-01-01", 1100]]);
    const overview = buildYearBudgetOverview({
      months: ["2026-01-01", "2026-02-01"],
      plans,
      actualTotals,
    });

    expect(overview[0].total).toBe(1224);
    expect(overview[0].actualTotal).toBe(1100);
    expect(overview[0].topItems.map((item) => item.name)).toEqual([
      "Alquiler",
      "Seguro",
      "Compra",
    ]);
    expect(overview[1].items).toEqual([]);

    expect(buildBudgetCategoryTotals({ userId: "user", months: overview })[0]).toMatchObject({
      category_id: "home",
      category_name: "Vivienda",
      total: 900,
    });
  });
});
