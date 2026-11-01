create table public.savings_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_remunerated boolean not null default false,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create trigger savings_accounts_updated_at before update on public.savings_accounts
  for each row execute function public.set_updated_at();

alter table public.savings_accounts enable row level security;
create policy "savings_accounts_own" on public.savings_accounts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.savings_accounts to authenticated;

create table public.savings_interest_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.savings_accounts(user_id) on delete cascade,
  starts_on date not null check (starts_on = date_trunc('month', starts_on)::date),
  annual_rate_pct numeric(7,4) not null check (annual_rate_pct >= 0 and annual_rate_pct <= 100),
  payout_frequency text not null check (payout_frequency in ('monthly', 'annual')),
  created_at timestamptz not null default now(),
  unique (user_id, starts_on)
);

create index savings_interest_rates_user_month_idx
  on public.savings_interest_rates (user_id, starts_on desc);
alter table public.savings_interest_rates enable row level security;
create policy "savings_interest_rates_own" on public.savings_interest_rates for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.savings_interest_rates to authenticated;
