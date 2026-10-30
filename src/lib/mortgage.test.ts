import { describe, expect, it } from "vitest";
import { projectMortgage, recordedTotals, type MortgageTerms } from "./mortgage";

const mortgage: MortgageTerms = {
  familyUnitId: "unit", rateKind: "mixed", lender: "ING", firstBorrower: "Carla", secondBorrower: "Alba", firstSharePercent: 50,
  purchasePrice: 218_000, principal: 196_200, startedOn: "2025-09-18", fixedRate: 2.45, fixedPayment: 641.62, currentPayment: 641.62,
  fixedUntil: "2030-09-30", variableFrom: "2030-10-01", endsOn: "2065-01-01", spread: 0.79,
  lastRecordedOn: "2026-10-01", lastRecordedBalance: 193_274.77, paidTotalToDate: 7873.03,
};
const payments = [
  { month: "2025-11", payment: 815.21, balance: 195_958.96 },
  ...Array.from({ length: 11 }, (_, index) => ({ month: `2026-${String(index + 1).padStart(2, "0")}`, payment: 641.62, balance: 193_274.77 })),
];

describe("mortgage figures", () => {
  it("reconciles the recorded receipts with ING's outstanding balance and 2025 interest", () => {
    const totals = recordedTotals(mortgage, payments);
    expect(totals.paid).toBe(7_873.03);
    expect(totals.capital).toBe(2_925.23);
    expect(totals.interest).toBe(4_947.8);
    expect(totals.balance + totals.capital).toBe(mortgage.principal);
  });

  it("raises the variable quota when the assumed euribor rises", () => {
    expect(projectMortgage(mortgage, 3).variablePayment).toBeGreaterThan(projectMortgage(mortgage, 2).variablePayment);
  });

  it("reduces duration or monthly payment according to the selected amortization goal", () => {
    const baseline = projectMortgage(mortgage, 2);
    const shorten = projectMortgage(mortgage, 2, 5_000, "term");
    const cheaper = projectMortgage(mortgage, 2, 5_000, "payment");
    expect(shorten.fixedPayment).toBe(mortgage.fixedPayment);
    expect(shorten.payoffMonth < baseline.payoffMonth).toBe(true);
    expect(cheaper.fixedPayment).toBeLessThan(mortgage.fixedPayment);
    expect(cheaper.payoffMonth).toBe(baseline.payoffMonth);
  });

  it("does not invent paid interest without a payment total or receipt history", () => {
    const totals = recordedTotals({ ...mortgage, paidTotalToDate: null }, []);
    expect(totals.capital).toBe(2_925.23);
    expect(totals.paid).toBeNull();
    expect(totals.interest).toBeNull();
  });

  it("supports fixed-only and already-variable loans", () => {
    expect(projectMortgage({ ...mortgage, rateKind: "fixed" }, 0).variablePayment).toBe(0);
    expect(projectMortgage({ ...mortgage, rateKind: "variable", variableFrom: "2025-09-18" }, 2).variablePayment).toBeGreaterThan(0);
  });
});
