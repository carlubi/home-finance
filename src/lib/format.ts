const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function formatMoney(amount: number): string {
  return eur.format(amount);
}

export function formatMonth(month: string | Date): string {
  const d = typeof month === "string" ? new Date(month + "T00:00:00") : month;
  const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthRange(start: string, end?: string | null): string {
  if (!end || end === start) {
    return formatMonth(start);
  }
  return `${formatMonth(start)} - ${formatMonth(end)}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function parseMoneyInput(value: string): number | null {
  const raw = value.trim().replace(/\s+/g, "");
  if (!raw) return null;

  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");

  let normalized = raw;

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot !== -1) {
    const decimals = raw.length - lastDot - 1;
    normalized =
      decimals > 0 && decimals <= 2 ? raw.replace(/,/g, "") : raw.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Primer día del mes en formato YYYY-MM-DD */
export function monthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Suma n meses a un YYYY-MM-01 */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthStart(d);
}
