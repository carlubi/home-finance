-- Los ingresos marcados como recurrentes antes del nuevo gestor pasan a
-- `fixed_expenses` (con entry_kind = income) y dejan de duplicarse como filas
-- mensuales generadas automáticamente.
insert into public.fixed_expenses (
  user_id, name, category_id, amount, entry_kind, frequency, active, starts_on, ends_on
)
select
  income.user_id,
  income.name,
  income.category_id,
  max(income.amount) as amount,
  'income' as entry_kind,
  'monthly' as frequency,
  true as active,
  date_trunc('month', min(income.occurred_at))::date as starts_on,
  null as ends_on
from public.income
where income.is_recurring = true
group by income.user_id, income.name, income.category_id
having not exists (
  select 1 from public.fixed_expenses existing
  where existing.user_id = income.user_id
    and existing.entry_kind = 'income'
    and existing.name = income.name
    and existing.category_id is not distinct from income.category_id
);

delete from public.income where is_recurring = true;

update public.onboarding_answers
set fixed_income_amount = null,
    has_fixed_income = null
where fixed_income_amount is not null;
