-- ============================================================
-- Gastos independientes de la unidad familiar
-- ============================================================

create table public.family_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_at date not null,
  people_count integer not null default 1 check (people_count between 1 and 50),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_expenses_user_occurred_idx
  on public.family_expenses (user_id, occurred_at desc);
create index family_expenses_user_category_idx
  on public.family_expenses (user_id, category);

alter table public.family_expenses enable row level security;

create policy "family_expenses_all_own" on public.family_expenses
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger family_expenses_updated_at
  before update on public.family_expenses
  for each row execute function public.set_updated_at();

create table public.family_recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  monthly_amount numeric(12, 2) not null check (monthly_amount > 0),
  people_count integer not null default 1 check (people_count between 1 and 50),
  active boolean not null default true,
  starts_on date not null,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(day from starts_on) = 1),
  check (ends_on is null or ends_on >= starts_on)
);

create index family_recurring_expenses_user_period_idx
  on public.family_recurring_expenses (user_id, starts_on desc, ends_on);
create index family_recurring_expenses_user_category_idx
  on public.family_recurring_expenses (user_id, category);

alter table public.family_recurring_expenses enable row level security;

create policy "family_recurring_expenses_all_own"
  on public.family_recurring_expenses
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger family_recurring_expenses_updated_at
  before update on public.family_recurring_expenses
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.family_expenses to authenticated;
grant select, insert, update, delete on public.family_recurring_expenses to authenticated;
