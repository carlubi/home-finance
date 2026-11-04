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

export type TaskSchedule = { weekday: number | null; starts_on: string; scheduled_date: string | null };

export function taskOccursOnDate(task: TaskSchedule, date: string) {
  if (task.scheduled_date !== null) return task.scheduled_date === date;
  return task.weekday !== null && date >= task.starts_on && weekdayOf(date) === task.weekday;
}

export function taskDueDateForWeek(task: TaskSchedule, start: string) {
  if (task.scheduled_date !== null) return task.scheduled_date >= start && task.scheduled_date <= dateAfterDays(start, 6) ? task.scheduled_date : null;
  if (task.weekday === null) return null;
  const date = dueDateForWeek(start, task.weekday);
  return date >= task.starts_on ? date : null;
}

