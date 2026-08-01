-- ============================================================
-- Presupuestos mensuales planificados
-- ============================================================

create table public.monthly_budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  outcome text check (outcome in ('met', 'under', 'over')),
  notes text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index monthly_budget_plans_user_month_idx
  on public.monthly_budget_plans (user_id, month desc);

alter table public.monthly_budget_plans enable row level security;

create policy "monthly_budget_plans_all_own" on public.monthly_budget_plans
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger monthly_budget_plans_updated_at
  before update on public.monthly_budget_plans
  for each row execute function public.set_updated_at();

create table public.monthly_budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.monthly_budget_plans (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  planned_amount numeric(12, 2) not null check (planned_amount > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index monthly_budget_items_user_idx
  on public.monthly_budget_items (user_id);
create index monthly_budget_items_plan_idx
  on public.monthly_budget_items (plan_id);
create index monthly_budget_items_category_idx
  on public.monthly_budget_items (category_id);

alter table public.monthly_budget_items enable row level security;

create policy "monthly_budget_items_all_own" on public.monthly_budget_items
  for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.monthly_budget_plans p
      where p.id = plan_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.monthly_budget_plans p
      where p.id = plan_id
        and p.user_id = (select auth.uid())
    )
  );

create trigger monthly_budget_items_updated_at
  before update on public.monthly_budget_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.monthly_budget_plans to authenticated;
grant select, insert, update, delete on public.monthly_budget_items to authenticated;
