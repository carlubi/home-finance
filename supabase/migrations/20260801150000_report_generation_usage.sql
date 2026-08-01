-- ============================================================
-- Límite de generación IA: un informe por usuario y mes natural
-- ============================================================

create table public.report_generation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quota_month date not null check (extract(day from quota_month) = 1),
  requested_start_month date not null check (extract(day from requested_start_month) = 1),
  requested_end_month date not null check (extract(day from requested_end_month) = 1),
  report_kind text not null check (report_kind in ('month', 'range')),
  status text not null default 'generating' check (status in ('generating', 'completed', 'failed')),
  report_table text check (report_table in ('monthly_reports', 'range_reports')),
  report_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_start_month <= requested_end_month),
  unique (user_id, quota_month)
);

create index report_generation_usage_user_idx
  on public.report_generation_usage (user_id, quota_month desc);

alter table public.report_generation_usage enable row level security;

create policy "report_generation_usage_select_own" on public.report_generation_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger report_generation_usage_updated_at
  before update on public.report_generation_usage
  for each row execute function public.set_updated_at();

insert into public.report_generation_usage (
  user_id,
  quota_month,
  requested_start_month,
  requested_end_month,
  report_kind,
  status,
  report_table,
  report_id,
  created_at,
  updated_at
)
select
  user_id,
  date_trunc('month', created_at)::date,
  month,
  month,
  'month',
  'completed',
  'monthly_reports',
  id,
  created_at,
  created_at
from public.monthly_reports
on conflict (user_id, quota_month) do nothing;

insert into public.report_generation_usage (
  user_id,
  quota_month,
  requested_start_month,
  requested_end_month,
  report_kind,
  status,
  report_table,
  report_id,
  created_at,
  updated_at
)
select
  user_id,
  date_trunc('month', created_at)::date,
  start_month,
  end_month,
  'range',
  'completed',
  'range_reports',
  id,
  created_at,
  created_at
from public.range_reports
on conflict (user_id, quota_month) do nothing;
