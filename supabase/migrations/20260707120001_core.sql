-- ============================================================
-- Núcleo: perfiles, onboarding, categorías, finanzas personales
-- ============================================================

create extension if not exists pgcrypto;

-- Utilidad: updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles (1:1 con auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  currency text not null default 'EUR',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- onboarding_answers
-- ------------------------------------------------------------
create table public.onboarding_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  financial_goal text,
  financial_goal_other text,
  consumption_habits text[] not null default '{}',
  has_fixed_income boolean,
  fixed_income_amount numeric(12, 2),
  fixed_expense_types text[] not null default '{}',
  invests boolean,
  investment_details jsonb,
  shares_expenses boolean,
  shared_expense_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.onboarding_answers enable row level security;

create policy "onboarding_all_own" on public.onboarding_answers
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger onboarding_answers_updated_at
  before update on public.onboarding_answers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- categories (globales user_id null + personalizadas)
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  icon text,
  color text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, name, kind)
);

create index categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy "categories_select" on public.categories
  for select using (user_id is null or (select auth.uid()) = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.categories
  for update using ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.categories
  for delete using ((select auth.uid()) = user_id);

-- Seeds: categorías de gasto
-- Colores: paleta categórica validada (CVD-safe) + pasos de sus rampas para la cola
insert into public.categories (name, kind, icon, color) values
  ('Vivienda', 'expense', 'home', '#2a78d6'),
  ('Alimentación', 'expense', 'shopping-cart', '#1baf7a'),
  ('Transporte', 'expense', 'car', '#eb6834'),
  ('Ocio', 'expense', 'gamepad-2', '#4a3aa7'),
  ('Restaurantes', 'expense', 'utensils', '#e34948'),
  ('Compras', 'expense', 'shopping-bag', '#e87ba4'),
  ('Salud', 'expense', 'heart-pulse', '#008300'),
  ('Suscripciones', 'expense', 'repeat', '#eda100'),
  ('Educación', 'expense', 'graduation-cap', '#1c5cab'),
  ('Viajes', 'expense', 'plane', '#86b6ef'),
  ('Inversiones', 'expense', 'trending-up', '#104281'),
  ('Deudas', 'expense', 'credit-card', '#d95926'),
  ('Luz', 'expense', 'zap', '#c98500'),
  ('Agua', 'expense', 'droplets', '#3987e5'),
  ('Internet', 'expense', 'wifi', '#9085e9'),
  ('Limpieza', 'expense', 'sparkles', '#199e70'),
  ('Otros', 'expense', 'circle-ellipsis', '#898781');

-- Seeds: categorías de ingreso
insert into public.categories (name, kind, icon, color) values
  ('Salario', 'income', 'briefcase', '#1baf7a'),
  ('Freelance', 'income', 'laptop', '#2a78d6'),
  ('Inversiones', 'income', 'trending-up', '#4a3aa7'),
  ('Alquileres', 'income', 'building', '#eb6834'),
  ('Reembolsos', 'income', 'rotate-ccw', '#eda100'),
  ('Regalos', 'income', 'gift', '#e87ba4'),
  ('Otros', 'income', 'circle-ellipsis', '#898781');

-- ------------------------------------------------------------
-- expenses
-- ------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  -- Fecha real del gasto: determina el mes financiero (nunca la fecha de registro)
  occurred_at date not null,
  payment_method text,
  notes text,
  attachment_path text,
  tags text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual', 'import')),
  import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_occurred_idx on public.expenses (user_id, occurred_at desc);
create index expenses_category_idx on public.expenses (category_id);
create index expenses_import_idx on public.expenses (import_id);

alter table public.expenses enable row level security;

create policy "expenses_all_own" on public.expenses
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- income
-- ------------------------------------------------------------
create table public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_at date not null,
  is_recurring boolean not null default false,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'import')),
  import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index income_user_occurred_idx on public.income (user_id, occurred_at desc);
create index income_category_idx on public.income (category_id);
create index income_import_idx on public.income (import_id);

alter table public.income enable row level security;

create policy "income_all_own" on public.income
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger income_updated_at
  before update on public.income
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- fixed_expenses / investments / budgets
-- ------------------------------------------------------------
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(12, 2) check (amount > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index fixed_expenses_user_idx on public.fixed_expenses (user_id);

alter table public.fixed_expenses enable row level security;

create policy "fixed_expenses_all_own" on public.fixed_expenses
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  monthly_amount numeric(12, 2),
  one_off_amount numeric(12, 2),
  accumulated_capital numeric(14, 2),
  notes text,
  created_at timestamptz not null default now()
);

create index investments_user_idx on public.investments (user_id);

alter table public.investments enable row level security;

create policy "investments_all_own" on public.investments
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index budgets_category_idx on public.budgets (category_id);

alter table public.budgets enable row level security;

create policy "budgets_all_own" on public.budgets
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
