// Resolución de colores de categoría hacia variables CSS con variante
// clara/oscura validada. Los hex de la cola (pasos de rampa) se usan tal cual.

const HEX_TO_VAR: Record<string, string> = {
  "#2a78d6": "var(--viz-blue)",
  "#1baf7a": "var(--viz-aqua)",
  "#eda100": "var(--viz-yellow)",
  "#008300": "var(--viz-green)",
  "#4a3aa7": "var(--viz-violet)",
  "#e34948": "var(--viz-red)",
  "#e87ba4": "var(--viz-magenta)",
  "#eb6834": "var(--viz-orange)",
  "#898781": "var(--viz-other)",
  // Pasos oscuros usados como color por defecto de categorías familiares
  "#c98500": "var(--viz-yellow)",
  "#d95926": "var(--viz-orange)",
  "#3987e5": "var(--viz-blue)",
  "#9085e9": "var(--viz-violet)",
};

export function categoryColor(hex: string | null | undefined): string {
  if (!hex) return "var(--viz-other)";
  return HEX_TO_VAR[hex.toLowerCase()] ?? hex;
}

// Combinaciones validadas con validate_palette.js (claro y oscuro):
// ingreso/gasto/ahorro · ahorro/+cuenta/+inversión · gasto total/por persona.
// El azul no se combina con el lila del acento (ΔE < 15 con visión normal).
export const SERIES = {
  income: "var(--viz-income)",
  expense: "var(--viz-expense)",
  savings: "var(--viz-savings)",
  savingsWithInterest: "var(--viz-orange)",
  savingsWithInvestment: "var(--viz-investment)",
  projectedInvestment: "var(--viz-investment)",
  grid: "var(--viz-grid)",
  axis: "var(--viz-axis)",
  muted: "var(--viz-muted)",
  other: "var(--viz-other)",
} as const;
