import { describe, expect, it } from "vitest";
import { emptyMortgageDraft, parseMortgageDraft } from "./mortgage-config";

const basic = {
  ...emptyMortgageDraft,
  lender: "Banco ejemplo", firstBorrower: "Alex", purchasePrice: "250.000",
  principal: "200.000", startedOn: "2025-01-01", endsOn: "2055-01-01",
  currentPayment: "850", fixedRate: "2,8", fixedPayment: "850",
};

describe("configuración hipotecaria", () => {
  it("admite una hipoteca fija sin historial y sin segundo titular", () => {
    const result = parseMortgageDraft({ ...basic, rateKind: "fixed" });
    expect(result.error).toBeUndefined();
    expect(result.data?.firstSharePercent).toBe(100);
    expect(result.data?.lastRecordedBalance).toBe(200000);
    expect(result.data?.paidTotalToDate).toBe(0);
  });

  it("permite una hipoteca variable con saldo conocido e intereses aún desconocidos", () => {
    const result = parseMortgageDraft({ ...basic, rateKind: "variable", spread: "0,79", lastRecordedOn: "2026-10-01", lastRecordedBalance: "195.000" });
    expect(result.error).toBeUndefined();
    expect(result.data?.paidTotalToDate).toBeNull();
    expect(result.data?.spread).toBe(0.79);
  });

  it("rechaza un total abonado inferior al capital amortizado", () => {
    const result = parseMortgageDraft({ ...basic, rateKind: "fixed", lastRecordedOn: "2026-10-01", lastRecordedBalance: "195.000", paidTotalToDate: "4.000" });
    expect(result.error).toMatch(/total abonado/);
  });
});
