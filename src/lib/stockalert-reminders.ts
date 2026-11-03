import { createHash } from "node:crypto";

export const EXPIRY_MILESTONES = [10, 3, 0] as const;

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

export function reminderId(productId: string, expirationDate: string, days: number) {
  const hex = createHash("sha256")
    .update(`stockalert-expiry/${productId}/${expirationDate}/${days}`)
    .digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function reminderCopy(name: string, date: string, days: number) {
  const when = days === 0 ? "caduca hoy" : `caduca en ${days} días`;
  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
  return {
    title: `${name} ${when}`,
    body: `Fecha de caducidad: ${formattedDate}. Revisa tu despensa en Home Brain.`,
  };
}
