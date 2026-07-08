-- ============================================================
-- Vistas de agregación y Storage (buckets + policies)
-- ============================================================

-- Resumen mensual por usuario (ingresos, gastos, ahorro)
-- security_invoker: las vistas respetan la RLS del usuario que consulta
create view public.monthly_summary
with (security_invoker = true) as
with e as (
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
  coalesce(e.user_id, i.user_id) as user_id,
  coalesce(e.month, i.month) as month,
  coalesce(i.total, 0) as total_income,
  coalesce(e.total, 0) as total_expenses,
  coalesce(i.total, 0) - coalesce(e.total, 0) as savings,
  case
    when coalesce(i.total, 0) > 0
    then round((coalesce(i.total, 0) - coalesce(e.total, 0)) / i.total * 100, 1)
    else null
  end as savings_pct
from e
full outer join i on e.user_id = i.user_id and e.month = i.month;

-- Gastos por categoría y mes
create view public.expenses_by_category
with (security_invoker = true) as
select
  x.user_id,
  date_trunc('month', x.occurred_at)::date as month,
  x.category_id,
  c.name as category_name,
  c.color as category_color,
  sum(x.amount) as total,
  count(*) as num_expenses
from public.expenses x
left join public.categories c on c.id = x.category_id
group by 1, 2, 3, 4, 5;

-- Ingresos por categoría y mes
create view public.income_by_category
with (security_invoker = true) as
select
  x.user_id,
  date_trunc('month', x.occurred_at)::date as month,
  x.category_id,
  c.name as category_name,
  c.color as category_color,
  sum(x.amount) as total
from public.income x
left join public.categories c on c.id = x.category_id
group by 1, 2, 3, 4, 5;

-- ============================================================
-- Storage: buckets privados
--   documents/{user_id}/...  → extractos y adjuntos personales
--   receipts/{group_id}/...  → tickets de gastos compartidos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- documents: solo el dueño de la carpeta
create policy "documents_select_own" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- receipts: miembros del grupo (carpeta raíz = group_id)
create policy "receipts_select_member" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (
      public.is_group_member(((storage.foldername(name))[1])::uuid)
      or public.is_group_owner(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "receipts_insert_member" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and (
      public.is_group_member(((storage.foldername(name))[1])::uuid)
      or public.is_group_owner(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "receipts_delete_uploader_or_owner" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and (
      owner_id = (select auth.uid())::text
      or public.is_group_owner(((storage.foldername(name))[1])::uuid)
    )
  );
