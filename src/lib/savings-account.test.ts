import { describe, expect, it } from "vitest";
import { currentSavingsRate, estimatedMonthlyInterest, type SavingsInterestRate } from "./savings-account";

const rates: SavingsInterestRate[] = [
  { id: "new", starts_on: "2026-10-01", annual_rate_pct: 3, payout_frequency: "monthly" },
  { id: "old", starts_on: "2026-03-01", annual_rate_pct: 2, payout_frequency: "monthly" },
];

describe("cuenta remunerada", () => {
  it("conserva el tipo anterior para los meses previos al cambio", () => {
    expect(currentSavingsRate(rates, "2026-02")?.id).toBeUndefined();
    expect(currentSavingsRate(rates, "2026-09")?.id).toBe("old");
    expect(currentSavingsRate(rates, "2026-10")?.id).toBe("new");
  });

  it("calcula el equivalente mensual sobre el saldo actual", () => {
    expect(estimatedMonthlyInterest(10000, 3)).toBe(25);
  });
});
