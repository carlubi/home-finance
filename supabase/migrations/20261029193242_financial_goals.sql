create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  family_unit_id uuid references public.family_units (id) on delete cascade,
  scope text not null check (scope in ('personal', 'family')),
  kind text not null check (kind in ('target_amount', 'savings_rate', 'expense_limit')),
  title text not null check (length(btrim(title)) between 1 and 120),
  target_value numeric(12, 2) not null check (target_value > 0),
  initial_amount numeric(12, 2) not null default 0 check (initial_amount >= 0),
  starts_on date not null,
  due_on date not null,
  created_at timestamptz not null default now(),
  check ((scope = 'personal' and family_unit_id is null) or (scope = 'family' and family_unit_id is not null)),
  check (due_on >= starts_on),
  check (kind <> 'savings_rate' or target_value <= 100),
  check (kind = 'target_amount' or initial_amount = 0)
);

create index financial_goals_owner_idx on public.financial_goals (owner_id, due_on);
create index financial_goals_family_idx on public.financial_goals (family_unit_id, due_on) where family_unit_id is not null;
alter table public.financial_goals enable row level security;

create policy "financial_goals_select" on public.financial_goals for select to authenticated
  using ((scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'family' and public.is_family_unit_member(family_unit_id)));
create policy "financial_goals_insert" on public.financial_goals for insert to authenticated
  with check (owner_id = (select auth.uid()) and
    (scope = 'personal' or public.is_family_unit_member(family_unit_id)));
create policy "financial_goals_delete" on public.financial_goals for delete to authenticated
  using ((scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'family' and public.is_family_unit_member(family_unit_id)));

grant select, insert, delete on public.financial_goals to authenticated;
