-- Ingreso mensual (salario) definido en Ajustes/Onboarding: se materializa
-- como un movimiento de ingreso por mes, marcado con auto_salary para poder
-- actualizarlo o retirarlo cuando cambie el importe configurado.

alter table public.income
  add column auto_salary boolean not null default false;

create index income_auto_salary_idx on public.income (user_id)
  where auto_salary;
