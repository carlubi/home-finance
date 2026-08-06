-- Inversiones recurrentes en ajustes mensuales y resumen.

alter table public.investments
  add column if not exists expected_annual_return_pct numeric(6, 2)
    check (
      expected_annual_return_pct is null
      or (
        expected_annual_return_pct >= -100
        and expected_annual_return_pct <= 100
      )
    );

alter table public.fixed_expenses
  add column if not exists starts_on date,
  add column if not exists ends_on date;

alter table public.investments
  add column if not exists starts_on date,
  add column if not exists ends_on date;

update public.fixed_expenses
set starts_on = date_trunc('month', created_at)::date
where starts_on is null;

delete from public.fixed_expenses
where amount is null;

update public.investments
set starts_on = date_trunc('month', created_at)::date
where starts_on is null;

insert into public.investments (
  user_id,
  name,
  monthly_amount,
  one_off_amount,
  accumulated_capital,
  expected_annual_return_pct,
  starts_on
)
select
  user_id,
  coalesce(nullif(investment_details->>'name', ''), 'Inversión'),
  case
    when investment_details->>'monthly' ~ '^\d+(\.\d+)?$'
      and (investment_details->>'monthly')::numeric > 0
    then (investment_details->>'monthly')::numeric
    else null
  end,
  case
    when investment_details->>'one_off' ~ '^\d+(\.\d+)?$'
    then (investment_details->>'one_off')::numeric
    else null
  end,
  case
    when investment_details->>'capital' ~ '^\d+(\.\d+)?$'
    then (investment_details->>'capital')::numeric
    else null
  end,
  case
    when investment_details->>'expected_annual_return_pct'
      ~ '^-?\d+(\.\d+)?$'
      and (investment_details->>'expected_annual_return_pct')::numeric >= -100
      and (investment_details->>'expected_annual_return_pct')::numeric <= 100
    then (investment_details->>'expected_annual_return_pct')::numeric
    else null
  end,
  date_trunc('month', oa.created_at)::date
from public.onboarding_answers oa
where oa.invests is true
  and oa.investment_details is not null
  and not exists (
    select 1
    from public.investments existing
    where existing.user_id = oa.user_id
  );

alter table public.investments
  add constraint investments_monthly_amount_positive
    check (monthly_amount is null or monthly_amount > 0) not valid,
  add constraint investments_one_off_amount_non_negative
    check (one_off_amount is null or one_off_amount >= 0) not valid,
  add constraint investments_accumulated_capital_non_negative
    check (accumulated_capital is null or accumulated_capital >= 0) not valid;

grant select, insert, update, delete on public.investments to authenticated;
grant select, insert, update, delete on public.fixed_expenses to authenticated;

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
            union all
            select coalesce(starts_on, date_trunc('month', created_at)::date) as d
            from public.investments inv
            where inv.user_id = p.id
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
),
inv as (
  select
    m.user_id,
    m.month,
    sum(
      coalesce(investments.monthly_amount, 0)
      + case
          when coalesce(
            investments.starts_on,
            date_trunc('month', investments.created_at)::date
          ) = m.month
          then coalesce(investments.one_off_amount, 0)
          else 0
        end
    ) as total
  from months m
  join public.investments investments
    on investments.user_id = m.user_id
    and coalesce(
      investments.starts_on,
      date_trunc('month', investments.created_at)::date
    ) <= m.month
    and (
      investments.ends_on is null
      or investments.ends_on >= m.month
    )
  group by 1, 2
)
select
  m.user_id,
  m.month,
  coalesce(i.total, 0) as total_income,
  coalesce(e.total, 0) + coalesce(inv.total, 0) as total_expenses,
  coalesce(i.total, 0) - coalesce(e.total, 0) - coalesce(inv.total, 0) as savings,
  case
    when coalesce(i.total, 0) > 0
    then round(
      (
        (
          coalesce(i.total, 0)
          - coalesce(e.total, 0)
          - coalesce(inv.total, 0)
        ) / coalesce(i.total, 0)
      ) * 100,
      1
    )
    else null
  end as savings_pct
from months m
left join e on e.user_id = m.user_id and e.month = m.month
left join i on i.user_id = m.user_id and i.month = m.month
left join inv on inv.user_id = m.user_id and inv.month = m.month
order by m.user_id, m.month;
