alter table public.categories drop constraint if exists categories_kind_check;
alter table public.categories add constraint categories_kind_check
  check (kind in ('expense', 'income', 'investment'));

alter table public.investments
  add column if not exists category_id uuid references public.categories (id) on delete set null;
create index if not exists investments_category_idx on public.investments (category_id);
