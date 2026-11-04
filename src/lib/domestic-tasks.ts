export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export function madridDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dateAfterDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function weekStart(date: string) {
  return dateAfterDays(date, -weekdayOf(date));
}

export function dueDateForWeek(start: string, weekday: number) {
  return dateAfterDays(start, weekday);
}

