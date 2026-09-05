alter table public.investments
  add column if not exists frequency text not null default 'monthly'
    check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  add column if not exists investment_type text
    check (investment_type in ('fixed_income', 'equity', 'mixed', 'money_market', 'crypto', 'real_estate'));
