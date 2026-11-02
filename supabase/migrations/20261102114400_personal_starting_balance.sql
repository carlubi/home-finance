-- Saldo previo a los movimientos registrados. Es patrimonio, no ingreso mensual.
create table public.personal_starting_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starts_on date not null check (starts_on = date_trunc('month', starts_on)::date),
  amount numeric(14,2) not null check (amount >= 0)
);

alter table public.personal_starting_balances enable row level security;
create policy "personal_starting_balances_own"
  on public.personal_starting_balances for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.personal_starting_balances to authenticated;

create or replace view public.savings_interest_monthly
with (security_invoker = true) as
with recursive user_bounds as (
  select a.user_id,
    least(
      coalesce((select date_trunc('month', min(d))::date from (
        select occurred_at as d from public.expenses e where e.user_id = a.user_id
        union all select occurred_at from public.income i where i.user_id = a.user_id
        union all select coalesce(starts_on, date_trunc('month', created_at)::date) from public.investments v where v.user_id = a.user_id
        union all select coalesce(starts_on, date_trunc('month', created_at)::date) from public.fixed_expenses f where f.user_id = a.user_id
        union all select starts_on from public.savings_interest_rates r where r.user_id = a.user_id
        union all select starts_on from public.personal_starting_balances s where s.user_id = a.user_id
      ) activity_dates), date_trunc('month', now() at time zone 'Europe/Madrid')::date),
      date_trunc('year', now() at time zone 'Europe/Madrid')::date
    ) as first_month
  from public.savings_accounts a
  where a.is_remunerated
), months as (
  select b.user_id, generate_series(
    b.first_month,
    date_trunc('month', now() at time zone 'Europe/Madrid')::date,
    interval '1 month'
  )::date as month
  from user_bounds b
), e as (
  select user_id, date_trunc('month', occurred_at)::date as month, sum(amount) as total
  from public.expenses group by 1, 2
), i as (
  select user_id, date_trunc('month', occurred_at)::date as month, sum(amount) as total
  from public.income group by 1, 2
), recurring as (
  select m.user_id, m.month, f.entry_kind,
    sum(f.amount * case f.frequency when 'daily' then 365.25 / 12 when 'weekly' then 52.0 / 12 when 'quarterly' then 1.0 / 3 when 'yearly' then 1.0 / 12 else 1 end) as total
  from months m
  join public.fixed_expenses f on f.user_id = m.user_id
    and f.active and coalesce(f.amount, 0) > 0
    and coalesce(f.starts_on, date_trunc('month', f.created_at)::date) <= m.month
    and (f.ends_on is null or f.ends_on >= m.month)
  group by 1, 2, 3
), fixed_expenses as (
  select user_id, month, sum(total) as total
  from recurring where entry_kind = 'expense' group by 1, 2
), fixed_income as (
  select user_id, month, sum(total) as total
  from recurring where entry_kind = 'income' group by 1, 2
), inv as (
  select m.user_id, m.month,
    sum(coalesce(v.monthly_amount, 0) + case
      when coalesce(v.starts_on, date_trunc('month', v.created_at)::date) = m.month
      then coalesce(v.one_off_amount, 0) else 0 end) as total
  from months m
  join public.investments v on v.user_id = m.user_id
    and coalesce(v.starts_on, date_trunc('month', v.created_at)::date) <= m.month
    and (v.ends_on is null or v.ends_on >= m.month)
  group by 1, 2
), base_months as (
  select m.user_id, m.month,
    coalesce(i.total, 0) + coalesce(fixed_income.total, 0)
      - coalesce(e.total, 0) - coalesce(fixed_expenses.total, 0)
      - coalesce(inv.total, 0) + coalesce(s.amount, 0) as base_savings,
    r.annual_rate_pct
  from months m
  left join i on i.user_id = m.user_id and i.month = m.month
  left join e on e.user_id = m.user_id and e.month = m.month
  left join fixed_income on fixed_income.user_id = m.user_id and fixed_income.month = m.month
  left join fixed_expenses on fixed_expenses.user_id = m.user_id and fixed_expenses.month = m.month
  left join inv on inv.user_id = m.user_id and inv.month = m.month
  left join public.personal_starting_balances s on s.user_id = m.user_id and s.starts_on = m.month
  left join lateral (
    select annual_rate_pct from public.savings_interest_rates r
    where r.user_id = m.user_id and r.starts_on <= m.month
      and r.payout_frequency = 'monthly'
    order by r.starts_on desc limit 1
  ) r on true
), numbered as (
  select user_id, month, annual_rate_pct,
    row_number() over (partition by user_id order by month) as rn,
    sum(base_savings) over (partition by user_id order by month) as cumulative_base
  from base_months
), interest_calc as (
  select n.user_id, n.month, n.rn, n.annual_rate_pct,
    greatest(0::numeric, n.cumulative_base) as balance,
    case when n.annual_rate_pct is not null then
      round(greatest(0::numeric, n.cumulative_base) * n.annual_rate_pct / 1200, 2)
      else 0::numeric end as amount,
    case when n.annual_rate_pct is not null then
      round(greatest(0::numeric, n.cumulative_base) * n.annual_rate_pct / 1200, 2)
      else 0::numeric end as accrued_interest
  from numbered n where n.rn = 1
  union all
  select n.user_id, n.month, n.rn, n.annual_rate_pct,
    greatest(0::numeric, n.cumulative_base + p.accrued_interest) as balance,
    case when n.annual_rate_pct is not null then
      round(greatest(0::numeric, n.cumulative_base + p.accrued_interest) * n.annual_rate_pct / 1200, 2)
      else 0::numeric end as amount,
    p.accrued_interest + case when n.annual_rate_pct is not null then
      round(greatest(0::numeric, n.cumulative_base + p.accrued_interest) * n.annual_rate_pct / 1200, 2)
      else 0::numeric end as accrued_interest
  from interest_calc p
  join numbered n on n.user_id = p.user_id and n.rn = p.rn + 1
)
select user_id, month, balance::numeric(14,2) as balance,
  annual_rate_pct::numeric(7,4) as annual_rate_pct, amount
from interest_calc where amount > 0;
