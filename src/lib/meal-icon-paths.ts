import type { MealType } from "@/lib/meals";

/** Trazos de Coffee, Utensils, Apple y Moon de Lucide (licencia MIT). */
export const MEAL_ICON_PATHS: Record<MealType, readonly string[]> = {
  breakfast: [
    "M10 2v2",
    "M14 2v2",
    "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
    "M6 2v2",
  ],
  lunch: [
    "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2",
    "M7 2v20",
    "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",
  ],
  snack: [
    "M12 6.528V3a1 1 0 0 1 1-1h0",
    "M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21",
  ],
  dinner: [
    "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
  ],
};
