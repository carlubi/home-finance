-- Categorías personalizadas para los gastos de la unidad familiar.

create table public.family_expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#898781',
  created_at timestamptz not null default now()
);

create unique index family_expense_categories_user_name_idx
  on public.family_expense_categories (user_id, lower(name));

create index family_expense_categories_user_idx
  on public.family_expense_categories (user_id, name);

alter table public.family_expense_categories enable row level security;

create policy "family_expense_categories_select_own"
  on public.family_expense_categories
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "family_expense_categories_insert_own"
  on public.family_expense_categories
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "family_expense_categories_delete_own"
  on public.family_expense_categories
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.family_expense_categories to authenticated;
