import { MEAL_ICON_PATHS } from "@/lib/meal-icon-paths";
import type { MealType } from "@/lib/meals";
import { cn } from "@/lib/utils";

/** Mismo pictograma en la interfaz y en los menús PDF. */
export function MealIcon({ type, size = "sm" }: { type: MealType; size?: "sm" | "md" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("menu-meal-icon shrink-0 text-text-secondary", size === "sm" ? "size-4" : "size-5")}
    >
      {MEAL_ICON_PATHS[type].map((path) => <path key={path} d={path} />)}
    </svg>
  );
}
