import { describe, expect, it } from "vitest";
import { groupInvestmentCapital, summarizeSharedFinances } from "./shared-finances";

describe("visión global familiar", () => {
  it("suma las finanzas personales una vez por miembro", () => {
    const totals = summarizeSharedFinances([
      { total_income: 3000, total_expenses: 1200, savings: 1300 },
      { total_income: 2400, total_expenses: 900, savings: 1100 },
    ]);
    expect(totals).toEqual({ income: 5400, expenses: 2100, savings: 2400, investmentOutflow: 900 });
    expect(totals.expenses + totals.savings + totals.investmentOutflow).toBe(totals.income);
  });

  it("agrupa inversiones de distintos miembros con el mismo nombre", () => {
    expect(groupInvestmentCapital([
      { name: "MSCI World", capital: 1250.25 },
      { name: " msci  world ", capital: 749.75 },
      { name: "Bonos", capital: 500 },
    ])).toEqual([
      { name: "MSCI World", capital: 2000 },
      { name: "Bonos", capital: 500 },
    ]);
  });
});
