-- Añade las meriendas como tipo de comida en los menús.
alter table public.menu_meals drop constraint if exists menu_meals_meal_type_check;
alter table public.menu_meals
  add constraint menu_meals_meal_type_check
  check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner'));
