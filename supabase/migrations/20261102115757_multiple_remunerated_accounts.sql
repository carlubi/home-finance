-- Una persona puede repartir su ahorro entre bancos con tipos y capitales distintos.
create table public.remunerated_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  allocation_mode text not null check (allocation_mode in ('remaining_savings', 'specified_amount')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index remunerated_accounts_user_idx on public.remunerated_accounts (user_id);
create unique index remunerated_accounts_one_remaining_per_user
  on public.remunerated_accounts (user_id) where allocation_mode = 'remaining_savings' and active;
alter table public.remunerated_accounts enable row level security;
create policy "remunerated_accounts_own" on public.remunerated_accounts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.remunerated_accounts to authenticated;

create table public.remunerated_account_rates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.remunerated_accounts(id) on delete cascade,
  starts_on date not null check (starts_on = date_trunc('month', starts_on)::date),
  ends_on date check (ends_on is null or (ends_on = date_trunc('month', ends_on)::date and ends_on >= starts_on)),
  annual_rate_pct numeric(7,4) not null check (annual_rate_pct between 0 and 100),
  unique (account_id, starts_on)
);
create index remunerated_account_rates_account_month_idx
  on public.remunerated_account_rates (account_id, starts_on desc);
alter table public.remunerated_account_rates enable row level security;
create policy "remunerated_account_rates_own" on public.remunerated_account_rates for all to authenticated
  using (exists (select 1 from public.remunerated_accounts a where a.id = account_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.remunerated_accounts a where a.id = account_id and a.user_id = (select auth.uid())));
grant select, insert, update, delete on public.remunerated_account_rates to authenticated;

-- Saldo real en cada mes de cambio; a partir de él se acumulan nuevos intereses.
create table public.remunerated_account_amounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.remunerated_accounts(id) on delete cascade,
  starts_on date not null check (starts_on = date_trunc('month', starts_on)::date),
  amount numeric(14,2) not null check (amount >= 0),
  unique (account_id, starts_on)
);
create index remunerated_account_amounts_account_month_idx
  on public.remunerated_account_amounts (account_id, starts_on desc);
alter table public.remunerated_account_amounts enable row level security;
create policy "remunerated_account_amounts_own" on public.remunerated_account_amounts for all to authenticated
  using (exists (select 1 from public.remunerated_accounts a where a.id = account_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.remunerated_accounts a where a.id = account_id and a.user_id = (select auth.uid())));
grant select, insert, update, delete on public.remunerated_account_amounts to authenticated;

-- Conserva la configuración e historial de la cuenta única anterior.
insert into public.remunerated_accounts (user_id, name, allocation_mode, active)
select user_id, 'Cuenta remunerada', 'remaining_savings', is_remunerated
from public.savings_accounts;
insert into public.remunerated_account_rates (account_id, starts_on, annual_rate_pct)
select a.id, r.starts_on, r.annual_rate_pct
from public.savings_interest_rates r
join public.remunerated_accounts a on a.user_id = r.user_id and a.allocation_mode = 'remaining_savings';

create function public.calculate_remunerated_interest(p_user_id uuid)
returns table (
  user_id uuid, account_id uuid, account_name text, month date,
  balance numeric, annual_rate_pct numeric, amount numeric
)
language plpgsql security invoker set search_path = '' as $$
declare
  first_month date;
  month_row record;
  account_row record;
  cumulative_base numeric := 0;
  total_prior_interest numeric := 0;
  interest_by_account jsonb := '{}'::jsonb;
  assigned_balance numeric;
  monthly_interest numeric;
  account_principal numeric;
  principal_month date;
  account_prior_interest numeric;
  account_rate numeric;
  account_rate_ends_on date;
  current_balance numeric;
  account_interest numeric;
  has_principal boolean;
begin
  select least(coalesce(date_trunc('month', min(d))::date,
    date_trunc('month', now() at time zone 'Europe/Madrid')::date),
    date_trunc('year', now() at time zone 'Europe/Madrid')::date)
  into first_month
  from (
    select e.occurred_at as d from public.expenses e where e.user_id = p_user_id
    union all select i.occurred_at from public.income i where i.user_id = p_user_id
    union all select coalesce(v.starts_on, date_trunc('month', v.created_at)::date) from public.investments v where v.user_id = p_user_id
    union all select coalesce(f.starts_on, date_trunc('month', f.created_at)::date) from public.fixed_expenses f where f.user_id = p_user_id
    union all select r.starts_on from public.remunerated_account_rates r
      join public.remunerated_accounts a on a.id = r.account_id where a.user_id = p_user_id
    union all select b.starts_on from public.remunerated_account_amounts b
      join public.remunerated_accounts a on a.id = b.account_id where a.user_id = p_user_id
    union all select s.starts_on from public.personal_starting_balances s where s.user_id = p_user_id
  ) activity_dates;

  for month_row in
    with months as (
      select generate_series(first_month, date_trunc('month', now() at time zone 'Europe/Madrid')::date, interval '1 month')::date as month
    ), e as (
      select date_trunc('month', x.occurred_at)::date as month, sum(x.amount) as total
      from public.expenses x where x.user_id = p_user_id group by 1
    ), i as (
      select date_trunc('month', x.occurred_at)::date as month, sum(x.amount) as total
      from public.income x where x.user_id = p_user_id group by 1
    ), recurring as (
      select m.month, f.entry_kind,
        sum(f.amount * case f.frequency when 'daily' then 365.25 / 12 when 'weekly' then 52.0 / 12 when 'quarterly' then 1.0 / 3 when 'yearly' then 1.0 / 12 else 1 end) as total
      from months m join public.fixed_expenses f on f.user_id = p_user_id
        and f.active and coalesce(f.amount, 0) > 0
        and coalesce(f.starts_on, date_trunc('month', f.created_at)::date) <= m.month
        and (f.ends_on is null or f.ends_on >= m.month)
      group by 1, 2
    ), inv as (
      select m.month, sum(coalesce(v.monthly_amount, 0) + case
        when coalesce(v.starts_on, date_trunc('month', v.created_at)::date) = m.month
        then coalesce(v.one_off_amount, 0) else 0 end) as total
      from months m join public.investments v on v.user_id = p_user_id
        and coalesce(v.starts_on, date_trunc('month', v.created_at)::date) <= m.month
        and (v.ends_on is null or v.ends_on >= m.month)
      group by 1
    )
    select m.month,
      coalesce(i.total, 0) + coalesce((select sum(total) from recurring r where r.month = m.month and r.entry_kind = 'income'), 0)
      - coalesce(e.total, 0) - coalesce((select sum(total) from recurring r where r.month = m.month and r.entry_kind = 'expense'), 0)
      - coalesce(inv.total, 0) + coalesce(s.amount, 0) as base_savings
    from months m
    left join e on e.month = m.month
    left join i on i.month = m.month
    left join inv on inv.month = m.month
    left join public.personal_starting_balances s on s.user_id = p_user_id and s.starts_on = m.month
    order by m.month
  loop
    cumulative_base := cumulative_base + month_row.base_savings;
    assigned_balance := 0;
    monthly_interest := 0;

    for account_row in
      select a.id, a.name, a.allocation_mode from public.remunerated_accounts a
      where a.user_id = p_user_id and a.active
      order by case when a.allocation_mode = 'specified_amount' then 0 else 1 end, a.created_at, a.id
    loop
      account_prior_interest := coalesce((interest_by_account ->> account_row.id::text)::numeric, 0);
      if account_row.allocation_mode = 'specified_amount' then
        select b.amount, b.starts_on into account_principal, principal_month from public.remunerated_account_amounts b
        where b.account_id = account_row.id and b.starts_on <= month_row.month
        order by b.starts_on desc limit 1;
        has_principal := found;
        if has_principal and principal_month = month_row.month then
          account_prior_interest := 0;
        end if;
        current_balance := case when has_principal then account_principal + account_prior_interest else 0 end;
        assigned_balance := assigned_balance + current_balance;
      else
        current_balance := greatest(0, cumulative_base + total_prior_interest - assigned_balance);
      end if;

      select r.annual_rate_pct, r.ends_on into account_rate, account_rate_ends_on from public.remunerated_account_rates r
      where r.account_id = account_row.id and r.starts_on <= month_row.month
      order by r.starts_on desc limit 1;
      if account_rate_ends_on is not null and account_rate_ends_on < month_row.month then
        account_rate := null;
      end if;
      account_interest := case when account_rate is not null then
        round(current_balance * account_rate / 1200, 2) else 0 end;
      interest_by_account := jsonb_set(interest_by_account, array[account_row.id::text],
        to_jsonb(account_prior_interest + account_interest), true);
      monthly_interest := monthly_interest + account_interest;

      if account_interest > 0 then
        user_id := p_user_id;
        account_id := account_row.id;
        account_name := account_row.name;
        month := month_row.month;
        balance := current_balance;
        annual_rate_pct := account_rate;
        amount := account_interest;
        return next;
      end if;
    end loop;
    total_prior_interest := total_prior_interest + monthly_interest;
  end loop;
end;
$$;
revoke all on function public.calculate_remunerated_interest(uuid) from public, anon;
grant execute on function public.calculate_remunerated_interest(uuid) to authenticated;

create view public.savings_interest_by_account_monthly
with (security_invoker = true) as
select i.user_id, i.account_id, i.account_name, i.month, i.balance, i.annual_rate_pct, i.amount
from (select distinct user_id from public.remunerated_accounts) a
cross join lateral public.calculate_remunerated_interest(a.user_id) i;
grant select on public.savings_interest_by_account_monthly to authenticated;

create or replace view public.savings_interest_monthly
with (security_invoker = true) as
select user_id, month, sum(balance)::numeric(14,2) as balance,
  (case when count(*) = 1 then max(annual_rate_pct) else null end)::numeric(7,4) as annual_rate_pct,
  sum(amount) as amount
from public.savings_interest_by_account_monthly
group by user_id, month;
