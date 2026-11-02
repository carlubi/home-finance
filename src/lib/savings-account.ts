export type RemuneratedAccount = {
  id: string;
  name: string;
  allocation_mode: "remaining_savings" | "specified_amount";
  active: boolean;
  remunerated_account_rates: SavingsInterestRate[];
  remunerated_account_amounts: SavingsAccountAmount[];
};

export type SavingsInterestRate = {
  id: string;
  account_id: string;
  starts_on: string;
  ends_on: string | null;
  annual_rate_pct: number;
};

export type SavingsAccountAmount = {
  id: string;
  account_id: string;
  starts_on: string;
  amount: number;
};

export type SavingsAccountInterest = {
  account_id: string;
  account_name: string;
  month: string;
  balance: number;
  annual_rate_pct: number;
  amount: number;
};

export function currentSavingsRate(rates: SavingsInterestRate[], month: string) {
  const latest = [...rates]
    .filter((rate) => rate.starts_on.slice(0, 7) <= month.slice(0, 7))
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];
  return latest && (!latest.ends_on || latest.ends_on.slice(0, 7) >= month.slice(0, 7))
    ? latest : null;
}
