export type SavingsAccount = {
  is_remunerated: boolean;
  balance: number;
};

export type SavingsInterestRate = {
  id: string;
  starts_on: string;
  annual_rate_pct: number;
  payout_frequency: "monthly" | "annual";
};

export function currentSavingsRate(rates: SavingsInterestRate[], month: string) {
  return [...rates]
    .filter((rate) => rate.starts_on.slice(0, 7) <= month.slice(0, 7))
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0] ?? null;
}

export function estimatedMonthlyInterest(balance: number, annualRatePct: number) {
  return Math.round(balance * annualRatePct / 1200 * 100) / 100;
}
