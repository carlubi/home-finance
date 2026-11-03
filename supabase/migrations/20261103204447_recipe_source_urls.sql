alter table public.menu_recipes
  add column source_url text
    check (
      source_url is null
      or (char_length(source_url) <= 2048 and source_url ~* '^https?://[^[:space:]]+$')
    );

alter table public.menu_meals
  add column source_url text
    check (
      source_url is null
      or (char_length(source_url) <= 2048 and source_url ~* '^https?://[^[:space:]]+$')
    );
