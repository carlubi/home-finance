-- Backfill: materializa el salario ya configurado (onboarding/ajustes)
-- como ingresos automáticos en cada mes del año en curso.

insert into public.income
  (user_id, name, category_id, amount, occurred_at, is_recurring, auto_salary, source)
select
  oa.user_id,
  'Salario',
  c.id,
  oa.fixed_income_amount,
  gs::date,
  true,
  true,
  'manual'
from public.onboarding_answers oa
left join public.categories c
  on c.kind = 'income' and c.name = 'Salario' and c.user_id is null
cross join generate_series(
  date_trunc('year', current_date),
  date_trunc('year', current_date) + interval '11 months',
  interval '1 month'
) as gs
where oa.fixed_income_amount is not null
  and oa.fixed_income_amount > 0
  and not exists (
    select 1
    from public.income i
    where i.user_id = oa.user_id
      and i.auto_salary
      and date_trunc('month', i.occurred_at) = gs
  );
