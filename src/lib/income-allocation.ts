import { roundCents } from "./finance";

export type AllocationLine = { name: string; amount: number; mortgage?: boolean };
export type AllocationMonth = {
  income: number;
  expenseTotal: number;
  expenses: AllocationLine[];
  investments: AllocationLine[];
  mortgageFallback: number;
};

function add(map: Map<string, number>, name: string, amount: number) {
  map.set(name, (map.get(name) ?? 0) + amount);
}

export function summarizeIncomeAllocation(months: AllocationMonth[]) {
  const expenseDetails = new Map<string, number>();
  const investmentDetails = new Map<string, number>();
  let totalIncome = 0;
  let totalMortgage = 0;
  let totalExpenses = 0;
  let totalInvestment = 0;
  let estimatedMortgage = false;

  for (const month of months) {
    totalIncome += month.income;
    const knownTotal = month.expenses.reduce((sum, item) => sum + item.amount, 0);
    const scale = knownTotal > month.expenseTotal + 0.01 && knownTotal > 0
      ? month.expenseTotal / knownTotal
      : 1;
    let bookedMortgage = 0;
    let bookedOther = 0;
    for (const line of month.expenses) {
      const amount = line.amount * scale;
      if (line.mortgage) bookedMortgage += amount;
      else {
        bookedOther += amount;
        add(expenseDetails, line.name, amount);
      }
    }
    const remainder = Math.max(0, month.expenseTotal - bookedMortgage - bookedOther);
    if (remainder > 0.01) add(expenseDetails, "Otros gastos", remainder);
    const fallback = bookedMortgage < 0.01 ? month.mortgageFallback : 0;
    if (fallback > 0) estimatedMortgage = true;
    totalMortgage += bookedMortgage + fallback;
    totalExpenses += bookedOther + remainder;
    for (const line of month.investments) {
      totalInvestment += line.amount;
      add(investmentDetails, line.name, line.amount);
    }
  }

  const count = months.length || 1;
  const average = (value: number) => roundCents(value / count);
  const detailList = (map: Map<string, number>) => [...map]
    .map(([name, amount]) => ({ name, amount: average(amount) }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    months: months.length,
    income: average(totalIncome),
    investment: average(totalInvestment),
    expenses: average(totalExpenses),
    mortgage: average(totalMortgage),
    savings: average(totalIncome - totalInvestment - totalExpenses - totalMortgage),
    investmentDetails: detailList(investmentDetails),
    expenseDetails: detailList(expenseDetails),
    estimatedMortgage,
  };
}
