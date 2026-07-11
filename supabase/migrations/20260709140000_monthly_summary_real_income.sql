-- El ingreso mensual configurado ahora se materializa como movimientos
-- reales en `income` (auto_salary), así que la vista deja de sumarlo
-- virtualmente para no contarlo dos veces. Se mantiene la generación de
-- una fila por mes desde la primera actividad del usuario.

create or replace view public.monthly_summary
with (security_invoker = true) as
with user_bounds as (
  select
    p.id as user_id,
    least(
      coalesce(
        (
          select date_trunc('month', min(d))::date
          from (
            select occurred_at as d
            from public.expenses e
            where e.user_id = p.id
            union all
            select occurred_at as d
            from public.income i
            where i.user_id = p.id
          ) activity_dates
        ),
        date_trunc('month', current_date)::date
      ),
      date_trunc('year', current_date)::date
    ) as start_month
  from public.profiles p
),
months as (
  select
    b.user_id,
    generate_series(
      b.start_month,
      date_trunc('month', current_date)::date,
      interval '1 month'
    )::date as month
  from user_bounds b
),
e as (
  select user_id, date_trunc('month', occurred_at)::date as month, sum(amount) as total
  from public.expenses
  group by 1, 2
),
i as (
  select user_id, date_trunc('month', occurred_at)::date as month, sum(amount) as total
  from public.income
  group by 1, 2
)
select
  m.user_id,
  m.month,
  coalesce(i.total, 0) as total_income,
  coalesce(e.total, 0) as total_expenses,
  coalesce(i.total, 0) - coalesce(e.total, 0) as savings,
  case
    when coalesce(i.total, 0) > 0
    then round(
      ((coalesce(i.total, 0) - coalesce(e.total, 0)) / coalesce(i.total, 0)) * 100,
      1
    )
    else null
  end as savings_pct
from months m
left join e on e.user_id = m.user_id and e.month = m.month
left join i on i.user_id = m.user_id and i.month = m.month
order by m.user_id, m.month;
