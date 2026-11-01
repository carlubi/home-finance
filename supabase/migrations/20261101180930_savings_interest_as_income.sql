-- El saldo puede cambiar sin alterar los intereses de meses anteriores.
create table public.savings_account_balances (
  user_id uuid not null references public.savings_accounts(user_id) on delete cascade,
  starts_on date not null check (starts_on = date_trunc('month', starts_on)::date),
  balance numeric(14,2) not null check (balance >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, starts_on)
);

create index savings_account_balances_user_month_idx
  on public.savings_account_balances (user_id, starts_on desc);
alter table public.savings_account_balances enable row level security;
create policy "savings_account_balances_own" on public.savings_account_balances
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.savings_account_balances to authenticated;

insert into public.savings_account_balances (user_id, starts_on, balance)
select user_id, date_trunc('month', updated_at at time zone 'Europe/Madrid')::date, balance
from public.savings_accounts
on conflict (user_id, starts_on) do nothing;

-- El ingreso automático representa un mes completo al saldo y tipo vigentes.
-- Solo se incorpora cuando el banco abona los intereses mensualmente.
create view public.savings_interest_monthly
with (security_invoker = true) as
with months as (
  select a.user_id, series.month::date as month
  from public.savings_accounts a
  join lateral generate_series(
    (select min(b.starts_on) from public.savings_account_balances b where b.user_id = a.user_id),
    date_trunc('month', now() at time zone 'Europe/Madrid')::date,
    interval '1 month'
  ) as series(month) on true
  where a.is_remunerated
), terms as (
  select m.user_id, m.month, b.balance, r.annual_rate_pct,
    round(b.balance * r.annual_rate_pct / 1200, 2) as amount
  from months m
  join lateral (
    select balance from public.savings_account_balances b
    where b.user_id = m.user_id and b.starts_on <= m.month
    order by b.starts_on desc limit 1
  ) b on true
  join lateral (
    select annual_rate_pct, payout_frequency from public.savings_interest_rates r
    where r.user_id = m.user_id and r.starts_on <= m.month
    order by r.starts_on desc limit 1
  ) r on r.payout_frequency = 'monthly'
)
select user_id, month, balance, annual_rate_pct, amount
from terms where amount > 0;
grant select on public.savings_interest_monthly to authenticated;

-- El resumen mantiene las mismas columnas y suma el interés automático una sola vez.
create or replace view public.monthly_summary
with (security_invoker = true) as
with user_bounds as (
  select p.id as user_id,
    least(coalesce((select date_trunc('month', min(d))::date from (
      select occurred_at as d from public.expenses e where e.user_id = p.id
      union all select occurred_at from public.income i where i.user_id = p.id
      union all select coalesce(starts_on, date_trunc('month', created_at)::date) from public.investments inv where inv.user_id = p.id
      union all select coalesce(starts_on, date_trunc('month', created_at)::date) from public.fixed_expenses fe where fe.user_id = p.id
      union all select starts_on from public.savings_account_balances b where b.user_id = p.id
    ) activity_dates), date_trunc('month', now() at time zone 'Europe/Madrid')::date), date_trunc('year', now() at time zone 'Europe/Madrid')::date) as start_month
  from public.profiles p
), months as (
  select b.user_id, generate_series(b.start_month, date_trunc('month', now() at time zone 'Europe/Madrid')::date, interval '1 month')::date as month from user_bounds b
), e as (
  select user_id, date_trunc('month', occurred_at)::date as month, sum(amount) as total from public.expenses group by 1, 2
), i as (
  select user_id, date_trunc('month', occurred_at)::date as month, sum(amount) as total from public.income group by 1, 2
), recurring as (
  select m.user_id, m.month, fe.entry_kind,
    sum(fe.amount * case fe.frequency when 'daily' then 365.25 / 12 when 'weekly' then 52.0 / 12 when 'quarterly' then 1.0 / 3 when 'yearly' then 1.0 / 12 else 1 end) as total
  from months m join public.fixed_expenses fe on fe.user_id = m.user_id
    and fe.active and coalesce(fe.amount, 0) > 0
    and coalesce(fe.starts_on, date_trunc('month', fe.created_at)::date) <= m.month
    and (fe.ends_on is null or fe.ends_on >= m.month)
  group by 1, 2, 3
), fixed_expenses as (
  select user_id, month, sum(total) as total from recurring where entry_kind = 'expense' group by 1, 2
), fixed_income as (
  select user_id, month, sum(total) as total from recurring where entry_kind = 'income' group by 1, 2
), inv as (
  select m.user_id, m.month, sum(coalesce(v.monthly_amount, 0) + case when coalesce(v.starts_on, date_trunc('month', v.created_at)::date) = m.month then coalesce(v.one_off_amount, 0) else 0 end) as total
  from months m join public.investments v on v.user_id = m.user_id
    and coalesce(v.starts_on, date_trunc('month', v.created_at)::date) <= m.month and (v.ends_on is null or v.ends_on >= m.month)
  group by 1, 2
), amounts as (
  select m.user_id, m.month,
    coalesce(i.total, 0) + coalesce(fixed_income.total, 0) + coalesce(interest.amount, 0) as income,
    coalesce(e.total, 0) + coalesce(fixed_expenses.total, 0) as expenses,
    coalesce(inv.total, 0) as investment
  from months m
  left join e on e.user_id = m.user_id and e.month = m.month
  left join i on i.user_id = m.user_id and i.month = m.month
  left join fixed_expenses on fixed_expenses.user_id = m.user_id and fixed_expenses.month = m.month
  left join fixed_income on fixed_income.user_id = m.user_id and fixed_income.month = m.month
  left join inv on inv.user_id = m.user_id and inv.month = m.month
  left join public.savings_interest_monthly interest on interest.user_id = m.user_id and interest.month = m.month
)
select user_id, month, income as total_income, expenses as total_expenses,
  income - expenses - investment as savings,
  case when income > 0 then round((income - expenses - investment) / income * 100, 1) else null end as savings_pct
from amounts order by user_id, month;
