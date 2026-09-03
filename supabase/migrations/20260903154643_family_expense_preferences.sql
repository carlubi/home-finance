-- Preferencia de reparto para el resumen de gastos familiares.

create table public.family_expense_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  people_count integer not null default 1 check (people_count between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_expense_preferences enable row level security;

create policy "family_expense_preferences_all_own"
  on public.family_expense_preferences
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger family_expense_preferences_updated_at
  before update on public.family_expense_preferences
  for each row execute function public.set_updated_at();

grant select, insert, update on public.family_expense_preferences to authenticated;
