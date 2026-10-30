import { roundCents } from "./finance";

type SharedSummary = {
  total_income: number;
  total_expenses: number;
  savings: number;
};

/** Los gastos de Familia son una vista de los mismos gastos personales. */
export function summarizeSharedFinances(rows: SharedSummary[]) {
  const income = roundCents(rows.reduce((sum, row) => sum + Number(row.total_income), 0));
  const expenses = roundCents(rows.reduce((sum, row) => sum + Number(row.total_expenses), 0));
  const savings = roundCents(rows.reduce((sum, row) => sum + Number(row.savings), 0));
  return { income, expenses, savings, investmentOutflow: roundCents(income - expenses - savings) };
}

export function groupInvestmentCapital(rows: { name: string; capital: number }[]) {
  const grouped = new Map<string, { name: string; capital: number }>();
  for (const row of rows) {
    const name = row.name.trim().replace(/\s+/g, " ") || "Sin nombre";
    const key = name.normalize("NFC").toLocaleLowerCase("es-ES");
    const previous = grouped.get(key);
    grouped.set(key, { name: previous?.name ?? name, capital: roundCents((previous?.capital ?? 0) + Number(row.capital)) });
  }
  return [...grouped.values()];
}
