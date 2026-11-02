import { describe, expect, it } from "vitest";
import { currentSavingsRate, type SavingsInterestRate } from "./savings-account";

const rates: SavingsInterestRate[] = [
  { id: "new", account_id: "account", starts_on: "2026-10-01", ends_on: null, annual_rate_pct: 3 },
  { id: "old", account_id: "account", starts_on: "2026-03-01", ends_on: "2026-09-01", annual_rate_pct: 2 },
];

describe("cuenta remunerada", () => {
  it("conserva el tipo anterior para los meses previos al cambio", () => {
    expect(currentSavingsRate(rates, "2026-02")?.id).toBeUndefined();
    expect(currentSavingsRate(rates, "2026-09")?.id).toBe("old");
    expect(currentSavingsRate(rates, "2026-10")?.id).toBe("new");
  });

  it("deja de aplicar un tipo después de su mes final", () => {
    expect(currentSavingsRate([rates[1]], "2026-09")?.id).toBe("old");
    expect(currentSavingsRate([rates[1]], "2026-10")).toBeNull();
  });

  it("no reactiva un tipo antiguo cuando termina el último", () => {
    const stoppedRates = [
      { ...rates[0], ends_on: "2026-10-01" },
      { ...rates[1], ends_on: null },
    ];
    expect(currentSavingsRate(stoppedRates, "2026-11")).toBeNull();
  });

});
