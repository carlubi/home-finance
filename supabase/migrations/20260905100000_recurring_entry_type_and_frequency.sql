-- Los registros existentes mantienen exactamente su significado: gasto mensual.
alter table public.fixed_expenses
  add column if not exists entry_kind text not null default 'expense'
    check (entry_kind in ('expense', 'income')),
  add column if not exists frequency text not null default 'monthly'
    check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));

alter table public.family_recurring_expenses
  add column if not exists entry_kind text not null default 'expense'
    check (entry_kind in ('expense', 'income')),
  add column if not exists frequency text not null default 'monthly'
    check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));

-- La aplicación es mensual: los importes diario/semanal/trimestral/anual se
-- presupuestan como equivalente mensual para que el flujo de caja sea comparable.
create or replace view public.monthly_summary
with (security_invoker = true) as
with user_bounds as (
  select p.id as user_id,
    least(coalesce((select date_trunc('month', min(d))::date from (
      select occurred_at as d from public.expenses e where e.user_id = p.id
      union all select occurred_at from public.income i where i.user_id = p.id
      union all select coalesce(starts_on, date_trunc('month', created_at)::date) from public.investments inv where inv.user_id = p.id
      union all select coalesce(starts_on, date_trunc('month', created_at)::date) from public.fixed_expenses fe where fe.user_id = p.id
    ) activity_dates), date_trunc('month', current_date)::date), date_trunc('year', current_date)::date) as start_month
  from public.profiles p
), months as (
  select b.user_id, generate_series(b.start_month, date_trunc('month', current_date)::date, interval '1 month')::date as month from user_bounds b
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
)
select m.user_id, m.month,
  coalesce(i.total, 0) + coalesce(fixed_income.total, 0) as total_income,
  coalesce(e.total, 0) + coalesce(fixed_expenses.total, 0) as total_expenses,
  coalesce(i.total, 0) + coalesce(fixed_income.total, 0) - coalesce(e.total, 0) - coalesce(fixed_expenses.total, 0) - coalesce(inv.total, 0) as savings,
  case when coalesce(i.total, 0) + coalesce(fixed_income.total, 0) > 0 then round(((coalesce(i.total, 0) + coalesce(fixed_income.total, 0) - coalesce(e.total, 0) - coalesce(fixed_expenses.total, 0) - coalesce(inv.total, 0)) / (coalesce(i.total, 0) + coalesce(fixed_income.total, 0))) * 100, 1) else null end as savings_pct
from months m left join e on e.user_id = m.user_id and e.month = m.month left join i on i.user_id = m.user_id and i.month = m.month
left join fixed_expenses on fixed_expenses.user_id = m.user_id and fixed_expenses.month = m.month
left join fixed_income on fixed_income.user_id = m.user_id and fixed_income.month = m.month
left join inv on inv.user_id = m.user_id and inv.month = m.month
order by m.user_id, m.month;
