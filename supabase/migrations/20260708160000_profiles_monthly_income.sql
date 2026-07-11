-- Añadir ingreso mensual a profiles
alter table public.profiles
  add column if not exists monthly_income numeric(12, 2);

-- Migrar el dato disponible desde el onboarding inicial
update public.profiles p
set monthly_income = oa.fixed_income_amount
from public.onboarding_answers oa
where oa.user_id = p.id
  and p.monthly_income is null
  and oa.fixed_income_amount is not null;

