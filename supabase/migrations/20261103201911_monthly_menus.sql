create table public.menu_recipes (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  ingredients text,
  instructions text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_recipes_family_name_idx on public.menu_recipes(family_unit_id, name);
alter table public.menu_recipes enable row level security;
create policy "menu_recipes_family_access" on public.menu_recipes for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
create trigger menu_recipes_updated_at before update on public.menu_recipes
  for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.menu_recipes to authenticated;

create table public.menu_meals (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  recipe_id uuid references public.menu_recipes(id) on delete set null,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_meals_family_date_idx on public.menu_meals(family_unit_id, meal_date);
create index menu_meals_recipe_idx on public.menu_meals(recipe_id);
alter table public.menu_meals enable row level security;
create policy "menu_meals_family_access" on public.menu_meals for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (
    (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
    and (recipe_id is null or exists (
      select 1 from public.menu_recipes r where r.id = recipe_id and r.family_unit_id = menu_meals.family_unit_id
    ))
  );
create trigger menu_meals_updated_at before update on public.menu_meals
  for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.menu_meals to authenticated;
