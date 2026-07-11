-- ============================================================
-- Informes IA por rangos de meses
-- ============================================================

create table public.range_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_month date not null check (extract(day from start_month) = 1),
  end_month date not null check (extract(day from end_month) = 1),
  content_md text not null,
  content_json jsonb,
  created_at timestamptz not null default now(),
  check (start_month <= end_month),
  unique (user_id, start_month, end_month)
);

create index range_reports_user_idx on public.range_reports (user_id, start_month desc, end_month desc);

alter table public.range_reports enable row level security;

create policy "range_reports_all_own" on public.range_reports
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
