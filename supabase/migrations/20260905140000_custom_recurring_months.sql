alter table public.fixed_expenses
  add column if not exists custom_months smallint[] not null default '{}';
alter table public.family_recurring_expenses
  add column if not exists custom_months smallint[] not null default '{}';
alter table public.investments
  add column if not exists custom_months smallint[] not null default '{}';

alter table public.fixed_expenses drop constraint if exists fixed_expenses_frequency_check;
alter table public.fixed_expenses add constraint fixed_expenses_frequency_check check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'));
alter table public.family_recurring_expenses drop constraint if exists family_recurring_expenses_frequency_check;
alter table public.family_recurring_expenses add constraint family_recurring_expenses_frequency_check check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'));
alter table public.investments drop constraint if exists investments_frequency_check;
alter table public.investments add constraint investments_frequency_check check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'));
