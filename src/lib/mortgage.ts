export type MortgageTerms = {
  familyUnitId: string;
  rateKind: "fixed" | "mixed" | "variable";
  lender: string;
  firstBorrower: string;
  secondBorrower: string;
  firstSharePercent: number;
  purchasePrice: number;
  principal: number;
  startedOn: string;
  fixedRate: number;
  fixedPayment: number;
  currentPayment: number;
  fixedUntil: string;
  variableFrom: string;
  endsOn: string;
  spread: number;
  lastRecordedOn: string;
  lastRecordedBalance: number;
  paidTotalToDate: number | null;
};

export type MortgagePayment = { month: string; payment: number; balance: number };

export function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function recordedTotals(mortgage: MortgageTerms, recordedPayments: MortgagePayment[]) {
  const recordedPaid = roundCents(recordedPayments.reduce((sum, row) => sum + row.payment, 0));
  const paid = mortgage.paidTotalToDate === null && recordedPayments.length === 0
    ? null : roundCents(Math.max(recordedPaid, mortgage.paidTotalToDate ?? 0));
  const capital = roundCents(mortgage.principal - mortgage.lastRecordedBalance);
  return { paid, capital, interest: paid === null ? null : roundCents(paid - capital), balance: mortgage.lastRecordedBalance };
}

export function monthOffset(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthsThrough(start: string, end: string) {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return (ey - sy) * 12 + em - sm + 1;
}

export function annuity(balance: number, annualRate: number, months: number) {
  if (balance <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return balance / months;
  return balance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

export type AmortizationMode = "term" | "payment";

export function projectMortgage(mortgage: MortgageTerms, euribor: number, extra = 0, mode: AmortizationMode = "term") {
  const variableRate = euribor + mortgage.spread;
  const initialBalance = roundCents(Math.max(0, mortgage.lastRecordedBalance - extra));
  const firstFutureMonth = monthOffset(mortgage.lastRecordedOn.slice(0, 7), 1);
  const variableStarts = mortgage.rateKind === "fixed" ? "9999-12"
    : mortgage.rateKind === "variable" ? firstFutureMonth : mortgage.variableFrom.slice(0, 7);
  const fullMonths = monthsThrough(firstFutureMonth, mortgage.endsOn.slice(0, 7));
  const fixedPayment = mode === "payment"
    ? mortgage.fixedPayment * initialBalance / mortgage.lastRecordedBalance
    : mortgage.fixedPayment;
  let balance = initialBalance;
  let variablePayment = 0;
  let totalInterest = 0;
  let payoffMonth = mortgage.lastRecordedOn.slice(0, 7);

  for (let index = 0; index < fullMonths && balance > 0.005; index++) {
    const month = monthOffset(firstFutureMonth, index);
    const variable = month >= variableStarts;
    const rate = variable ? variableRate : mortgage.fixedRate;
    if (variable && variablePayment === 0) {
      if (mode === "term" && extra > 0) {
        let baselineBalance = mortgage.lastRecordedBalance;
        for (let fixedIndex = 0; fixedIndex < index; fixedIndex++) {
          baselineBalance = baselineBalance * (1 + mortgage.fixedRate / 1200) - mortgage.fixedPayment;
        }
        variablePayment = annuity(baselineBalance, rate, fullMonths - index);
      } else {
        variablePayment = annuity(balance, rate, fullMonths - index);
      }
    }
    const interest = balance * rate / 1200;
    totalInterest += interest;
    const payment = Math.min(balance + interest, variable ? variablePayment : fixedPayment);
    balance = Math.max(0, balance + interest - payment);
    payoffMonth = month;
  }

  return {
    fixedPayment: roundCents(fixedPayment),
    variablePayment: roundCents(variablePayment),
    payoffMonth,
    remainingBalance: roundCents(balance),
    futureInterest: roundCents(totalInterest),
  };
}
