import { describe, expect, it } from "vitest";
import { sortMeals } from "./meals";

describe("sortMeals", () => {
  it("ordena desayuno, comida, merienda y cena, estable dentro de cada tipo", () => {
    const meals = [
      { id: "1", meal_type: "dinner" },
      { id: "2", meal_type: "snack" },
      { id: "3", meal_type: "breakfast" },
      { id: "4", meal_type: "lunch" },
      { id: "5", meal_type: "breakfast" },
    ];
    expect(sortMeals(meals).map((meal) => meal.id)).toEqual(["3", "5", "4", "2", "1"]);
  });
});
