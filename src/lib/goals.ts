import type { FinancialGoal } from "./types";
import { roundCents } from "./finance";

export type GoalMetric = {
  month: string;
  income: number;
  expenses: number;
  expensesWithoutMortgage: number;
  savings: number;
  hasData: boolean;
};

export type GoalResult = {
  status: "met" | "missed" | "pending";
  actual: number | null;
  expected: number;
  unit: "money" | "percent";
  detail: string;
};

function monthIndex(value: string) {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

export function evaluateGoal(goal: FinancialGoal, metrics: GoalMetric[], today: string): GoalResult {
  const currentMonth = today.slice(0, 7);
  const start = goal.starts_on.slice(0, 7);
  const due = goal.due_on.slice(0, 7);
  const evaluatedMonth = currentMonth > due ? due : currentMonth;
  const expected = Number(goal.target_value);
  const unit = goal.kind === "savings_rate" ? "percent" : "money";
  if (currentMonth < start) return { status: "pending", actual: null, expected, unit, detail: "Aún no ha empezado" };

  const inRange = metrics.filter((metric) => metric.month >= start && metric.month <= evaluatedMonth);
  if (goal.kind === "target_amount") {
    if (goal.scope === "family" && !inRange.some((metric) => metric.income > 0)) {
      return { status: "pending", actual: null, expected, unit, detail: "Registra ingresos familiares para calcular el ahorro" };
    }
    if (!inRange.some((metric) => metric.hasData) && Number(goal.initial_amount) === 0) {
      return { status: "pending", actual: null, expected, unit, detail: "Sin movimientos para medir el avance" };
    }
    const actual = roundCents(Number(goal.initial_amount) + inRange.reduce((sum, metric) => sum + metric.savings, 0));
    const duration = Math.max(1, monthIndex(due) - monthIndex(start) + 1);
    const elapsed = Math.min(duration, Math.max(1, monthIndex(evaluatedMonth) - monthIndex(start) + 1));
    const pace = roundCents(Number(goal.initial_amount) + (expected - Number(goal.initial_amount)) * elapsed / duration);
    return {
      status: actual >= (currentMonth >= due ? expected : pace) ? "met" : "missed",
      actual,
      expected,
      unit,
      detail: currentMonth >= due ? "Resultado al vencimiento" : `Ritmo necesario hasta hoy: ${pace.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
    };
  }

  const metric = metrics.find((item) => item.month === evaluatedMonth);
  if (!metric?.hasData || (goal.kind === "savings_rate" && metric.income <= 0)) {
    return { status: "pending", actual: null, expected, unit, detail: goal.scope === "family" && goal.kind === "savings_rate" ? "Registra ingresos familiares para calcular el porcentaje" : `Sin datos suficientes en ${evaluatedMonth}` };
  }
  const actual = goal.kind === "savings_rate"
    ? roundCents(metric.savings / metric.income * 100)
    : roundCents(metric.expensesWithoutMortgage);
  const met = goal.kind === "savings_rate" ? actual >= expected : actual <= expected;
  return {
    status: met ? "met" : "missed",
    actual,
    expected,
    unit,
    detail: currentMonth > due ? "Último mes del objetivo" : "Mes en curso · resultado provisional",
  };
}
