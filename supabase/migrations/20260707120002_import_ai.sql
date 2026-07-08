-- ============================================================
-- Importación de documentos con IA e informes mensuales
-- ============================================================

-- ------------------------------------------------------------
-- imported_files
-- ------------------------------------------------------------
create table public.imported_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'confirmed', 'error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index imported_files_user_idx on public.imported_files (user_id, created_at desc);

alter table public.imported_files enable row level security;

create policy "imported_files_all_own" on public.imported_files
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger imported_files_updated_at
  before update on public.imported_files
  for each row execute function public.set_updated_at();

-- FK diferida desde expenses/income hacia imported_files
alter table public.expenses
  add constraint expenses_import_fk
  foreign key (import_id) references public.imported_files (id) on delete set null;

alter table public.income
  add constraint income_import_fk
  foreign key (import_id) references public.imported_files (id) on delete set null;

-- ------------------------------------------------------------
-- ai_extracted_transactions (staging editable antes de confirmar)
-- La IA nunca escribe directamente en expenses/income.
-- ------------------------------------------------------------
create table public.ai_extracted_transactions (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imported_files (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  name text not null,
  suggested_category_id uuid references public.categories (id) on delete set null,
  amount numeric(12, 2) not null,
  occurred_at date not null,
  is_recurring boolean not null default false,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_extracted_import_idx on public.ai_extracted_transactions (import_id);
create index ai_extracted_user_idx on public.ai_extracted_transactions (user_id);
create index ai_extracted_category_idx on public.ai_extracted_transactions (suggested_category_id);

alter table public.ai_extracted_transactions enable row level security;

create policy "ai_extracted_all_own" on public.ai_extracted_transactions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger ai_extracted_updated_at
  before update on public.ai_extracted_transactions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- monthly_reports (informe IA por usuario y mes)
-- ------------------------------------------------------------
create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Primer día del mes al que pertenece el informe
  month date not null check (extract(day from month) = 1),
  content_md text not null,
  content_json jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create index monthly_reports_user_idx on public.monthly_reports (user_id, month desc);

alter table public.monthly_reports enable row level security;

create policy "monthly_reports_all_own" on public.monthly_reports
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
