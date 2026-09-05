-- Excepciones de una sola mensualidad para movimientos recurrentes.
alter table public.expenses
  add column if not exists fixed_expense_id uuid references public.fixed_expenses (id) on delete set null;
create index if not exists expenses_fixed_expense_month_idx
  on public.expenses (fixed_expense_id, occurred_at);

alter table public.income
  add column if not exists fixed_expense_id uuid references public.fixed_expenses (id) on delete set null;
create index if not exists income_fixed_expense_month_idx
  on public.income (fixed_expense_id, occurred_at);

create table if not exists public.fixed_expense_skips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fixed_expense_id uuid not null references public.fixed_expenses (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  unique (fixed_expense_id, month)
);
alter table public.fixed_expense_skips enable row level security;
create policy "fixed_expense_skips_all_own" on public.fixed_expense_skips
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.family_expenses
  add column if not exists recurring_expense_id uuid references public.family_recurring_expenses (id) on delete set null;
create index if not exists family_expenses_recurring_month_idx
  on public.family_expenses (recurring_expense_id, occurred_at);

create table if not exists public.family_recurring_expense_skips (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units (id) on delete cascade,
  recurring_expense_id uuid not null references public.family_recurring_expenses (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  unique (recurring_expense_id, month)
);
alter table public.family_recurring_expense_skips enable row level security;
create policy "family_recurring_expense_skips_all_unit" on public.family_recurring_expense_skips
  for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));

grant select, insert, update, delete on public.fixed_expense_skips to authenticated;
grant select, insert, update, delete on public.family_recurring_expense_skips to authenticated;
