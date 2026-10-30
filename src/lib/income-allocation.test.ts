import { describe, expect, it } from "vitest";
import { summarizeIncomeAllocation } from "./income-allocation";

describe("income allocation", () => {
  it("averages monthly destinations against income without counting a booked mortgage twice", () => {
    const result = summarizeIncomeAllocation([
      {
        income: 2_000,
        expenseTotal: 900,
        expenses: [
          { name: "Comida", amount: 500 },
          { name: "Hipoteca", amount: 400, mortgage: true },
        ],
        investments: [{ name: "Fondo", amount: 200 }],
        mortgageFallback: 320.81,
      },
      {
        income: 3_000,
        expenseTotal: 600,
        expenses: [{ name: "Comida", amount: 600 }],
        investments: [{ name: "Fondo", amount: 300 }],
        mortgageFallback: 320,
      },
    ]);
    expect(result.income).toBe(2_500);
    expect(result.expenses).toBe(550);
    expect(result.mortgage).toBe(360);
    expect(result.investment).toBe(250);
    expect(result.savings).toBe(1_340);
    expect(result.income).toBe(result.expenses + result.mortgage + result.investment + result.savings);
    expect(result.investmentDetails).toEqual([{ name: "Fondo", amount: 250 }]);
    expect(result.estimatedMortgage).toBe(true);
  });
});
