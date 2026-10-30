-- La visibilidad personal es una decisión de cada miembro; comienza desactivada.
-- Una cuenta ya existente puede conservar su antigua unidad privada al aceptar
-- una invitación. La aplicación elige la unidad activa más reciente.
drop index if exists public.family_unit_members_one_active_unit_idx;

create table public.family_personal_sharing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create index family_personal_sharing_unit_idx on public.family_personal_sharing(family_unit_id);
alter table public.family_personal_sharing enable row level security;
create policy "family_personal_sharing_select" on public.family_personal_sharing for select to authenticated
  using (public.is_family_unit_member(family_unit_id));
create policy "family_personal_sharing_insert_self" on public.family_personal_sharing for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_family_unit_member(family_unit_id));
create policy "family_personal_sharing_update_self" on public.family_personal_sharing for update to authenticated
  using (user_id = (select auth.uid()) and public.is_family_unit_member(family_unit_id))
  with check (user_id = (select auth.uid()) and public.is_family_unit_member(family_unit_id));
grant select, insert, update on public.family_personal_sharing to authenticated;

-- Función interna: comprueba las dos pertenencias activas y el consentimiento.
create schema if not exists private;
create function private.can_view_shared_finances(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_personal_sharing s
    join public.family_unit_members viewer on viewer.unit_id = s.family_unit_id
      and viewer.user_id = (select auth.uid()) and viewer.status = 'active'
    join public.family_unit_members owner_member on owner_member.unit_id = s.family_unit_id
      and owner_member.user_id = target_user_id and owner_member.status = 'active'
    where s.user_id = target_user_id and s.enabled and target_user_id <> (select auth.uid())
  );
$$;
revoke all on function private.can_view_shared_finances(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_view_shared_finances(uuid) to authenticated;

create policy "profiles_select_shared_family" on public.profiles for select to authenticated
  using (private.can_view_shared_finances(id));
create policy "categories_select_shared_family" on public.categories for select to authenticated
  using (private.can_view_shared_finances(user_id));
create policy "expenses_select_shared_family" on public.expenses for select to authenticated
  using (private.can_view_shared_finances(user_id));
create policy "income_select_shared_family" on public.income for select to authenticated
  using (private.can_view_shared_finances(user_id));
create policy "fixed_expenses_select_shared_family" on public.fixed_expenses for select to authenticated
  using (private.can_view_shared_finances(user_id));
create policy "fixed_expense_skips_select_shared_family" on public.fixed_expense_skips for select to authenticated
  using (private.can_view_shared_finances(user_id));
create policy "investments_select_shared_family" on public.investments for select to authenticated
  using (private.can_view_shared_finances(user_id));

-- Un plan por unidad y mes. Cada cuenta conserva su plan privado original.
-- Las partidas del miembro que se une se copian una sola vez al plan común.
alter table public.monthly_budget_plans
  add column family_unit_id uuid references public.family_units(id) on delete cascade;
update public.monthly_budget_plans p set family_unit_id = u.id
  from (select distinct on (owner_id) id, owner_id from public.family_units
    order by owner_id, created_at, id) u where u.owner_id = p.user_id;
alter table public.monthly_budget_plans add constraint monthly_budget_plans_family_month_key unique(family_unit_id, month);
create index monthly_budget_plans_family_idx on public.monthly_budget_plans(family_unit_id, month desc);
alter table public.monthly_budget_items
  add column category_name text,
  add column category_color text,
  add column source_item_id uuid;
alter table public.monthly_budget_items
  add constraint monthly_budget_items_source_once_key unique (plan_id, source_item_id);
update public.monthly_budget_items i set category_name = c.name, category_color = c.color
  from public.categories c where i.category_id = c.id;

drop policy "monthly_budget_plans_all_own" on public.monthly_budget_plans;
create policy "monthly_budget_plans_select" on public.monthly_budget_plans for select to authenticated
  using ((family_unit_id is not null and public.is_family_unit_member(family_unit_id))
    or (family_unit_id is null and user_id = (select auth.uid())));
create policy "monthly_budget_plans_insert" on public.monthly_budget_plans for insert to authenticated
  with check (family_unit_id is not null and public.is_family_unit_member(family_unit_id)
    and user_id = (select owner_id from public.family_units where id = family_unit_id));
create policy "monthly_budget_plans_update" on public.monthly_budget_plans for update to authenticated
  using (family_unit_id is not null and public.is_family_unit_member(family_unit_id))
  with check (family_unit_id is not null and public.is_family_unit_member(family_unit_id)
    and user_id = (select owner_id from public.family_units where id = family_unit_id));
create policy "monthly_budget_plans_delete" on public.monthly_budget_plans for delete to authenticated
  using (family_unit_id is not null and public.is_family_unit_member(family_unit_id));

drop policy "monthly_budget_items_all_own" on public.monthly_budget_items;
create policy "monthly_budget_items_select" on public.monthly_budget_items for select to authenticated
  using (exists(select 1 from public.monthly_budget_plans p where p.id = plan_id));
create policy "monthly_budget_items_insert" on public.monthly_budget_items for insert to authenticated
  with check (user_id = (select auth.uid()) and exists(
    select 1 from public.monthly_budget_plans p where p.id = plan_id
      and p.family_unit_id is not null and public.is_family_unit_member(p.family_unit_id)));
create policy "monthly_budget_items_update" on public.monthly_budget_items for update to authenticated
  using (exists(select 1 from public.monthly_budget_plans p where p.id = plan_id
    and p.family_unit_id is not null and public.is_family_unit_member(p.family_unit_id)))
  with check (exists(select 1 from public.monthly_budget_plans p where p.id = plan_id
    and p.family_unit_id is not null and public.is_family_unit_member(p.family_unit_id)));
create policy "monthly_budget_items_delete" on public.monthly_budget_items for delete to authenticated
  using (exists(select 1 from public.monthly_budget_plans p where p.id = plan_id
    and p.family_unit_id is not null and public.is_family_unit_member(p.family_unit_id)));

-- Al aceptar una invitación, une las partidas del presupuesto privado del
-- nuevo miembro con las del propietario. Las filas iguales de dos personas
-- se conservan: cada una representa una partida creada por su titular.
create function private.merge_family_member_budgets(target_unit_id uuid, member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_owner_id uuid;
  source_plan record;
  target_plan_id uuid;
  copied_items integer;
begin
  select u.owner_id into target_owner_id
  from public.family_units u
  join public.family_unit_members m on m.unit_id = u.id
    and m.user_id = member_id and m.status = 'active'
  where u.id = target_unit_id;
  if target_owner_id is null or target_owner_id = member_id then return; end if;

  for source_plan in
    select p.id, p.month from public.monthly_budget_plans p
    left join public.family_units source_unit on source_unit.id = p.family_unit_id
    where p.user_id = member_id
      and (p.family_unit_id is null or source_unit.owner_id = member_id)
      and p.family_unit_id is distinct from target_unit_id
    order by p.month
  loop
    select p.id into target_plan_id from public.monthly_budget_plans p
    where p.family_unit_id = target_unit_id and p.month = source_plan.month;
    if target_plan_id is null then
      -- Puede existir un plan anterior del propietario todavía en otra unidad.
      select p.id into target_plan_id from public.monthly_budget_plans p
      where p.user_id = target_owner_id and p.month = source_plan.month;
      if target_plan_id is not null then
        update public.monthly_budget_plans set family_unit_id = target_unit_id
        where id = target_plan_id;
      else
        insert into public.monthly_budget_plans (user_id, family_unit_id, month)
        values (target_owner_id, target_unit_id, source_plan.month)
        returning id into target_plan_id;
      end if;
    end if;

    insert into public.monthly_budget_items
      (user_id, plan_id, category_id, category_name, category_color,
       name, planned_amount, notes, source_item_id)
    select i.user_id, target_plan_id, null, i.category_name, i.category_color,
      i.name, i.planned_amount, i.notes, i.id
    from public.monthly_budget_items i
    where i.plan_id = source_plan.id and i.user_id = member_id
    on conflict (plan_id, source_item_id) do nothing;
    get diagnostics copied_items = row_count;
    if copied_items > 0 then
      -- El resultado anterior ya no representa el presupuesto combinado.
      update public.monthly_budget_plans
      set outcome = null, closed_at = null
      where id = target_plan_id;
    end if;
  end loop;
end;
$$;
revoke all on function private.merge_family_member_budgets(uuid, uuid) from public;

create function private.merge_family_budgets_on_join()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and new.user_id is not null then
    if tg_op = 'INSERT' then
      perform private.merge_family_member_budgets(new.unit_id, new.user_id);
    elsif old.status is distinct from 'active'
      or old.user_id is distinct from new.user_id then
      perform private.merge_family_member_budgets(new.unit_id, new.user_id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.merge_family_budgets_on_join() from public;
create trigger merge_family_budgets_on_join
  after insert or update on public.family_unit_members
  for each row execute function private.merge_family_budgets_on_join();

-- También une las partidas de quienes ya estaban en la unidad al migrar.
do $$
declare member record;
begin
  for member in select m.unit_id, m.user_id from public.family_unit_members m
    where m.status = 'active' and m.user_id is not null
  loop
    perform private.merge_family_member_budgets(member.unit_id, member.user_id);
  end loop;
end $$;

-- El extracto hipotecario pertenece a la unidad familiar, no a todos los usuarios.
create table public.family_mortgages (
  family_unit_id uuid primary key references public.family_units(id) on delete cascade,
  lender text not null,
  first_borrower text not null,
  second_borrower text not null,
  purchase_price numeric(12,2) not null check (purchase_price > 0),
  principal numeric(12,2) not null check (principal > 0),
  started_on date not null,
  fixed_rate numeric(6,3) not null,
  fixed_payment numeric(12,2) not null check (fixed_payment > 0),
  fixed_until date not null,
  variable_from date not null,
  ends_on date not null,
  spread numeric(6,3) not null,
  last_recorded_on date not null,
  last_recorded_balance numeric(12,2) not null check (last_recorded_balance >= 0),
  first_share_percent integer not null default 50 check (first_share_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.family_mortgages enable row level security;
create policy "family_mortgages_select" on public.family_mortgages for select to authenticated
  using (public.is_family_unit_member(family_unit_id));
create policy "family_mortgages_insert" on public.family_mortgages for insert to authenticated
  with check (public.is_family_unit_member(family_unit_id));
create policy "family_mortgages_update" on public.family_mortgages for update to authenticated
  using (public.is_family_unit_member(family_unit_id)) with check (public.is_family_unit_member(family_unit_id));
grant select, insert, update on public.family_mortgages to authenticated;

create table public.family_mortgage_payments (
  family_unit_id uuid not null references public.family_mortgages(family_unit_id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  payment numeric(12,2) not null check (payment > 0),
  balance numeric(12,2) not null check (balance >= 0),
  primary key(family_unit_id, month)
);
alter table public.family_mortgage_payments enable row level security;
create policy "family_mortgage_payments_select" on public.family_mortgage_payments for select to authenticated
  using (public.is_family_unit_member(family_unit_id));
create policy "family_mortgage_payments_insert" on public.family_mortgage_payments for insert to authenticated
  with check (public.is_family_unit_member(family_unit_id));
create policy "family_mortgage_payments_update" on public.family_mortgage_payments for update to authenticated
  using (public.is_family_unit_member(family_unit_id)) with check (public.is_family_unit_member(family_unit_id));
grant select, insert, update on public.family_mortgage_payments to authenticated;

insert into public.family_mortgages(family_unit_id, lender, first_borrower, second_borrower,
  purchase_price, principal, started_on, fixed_rate, fixed_payment, fixed_until,
  variable_from, ends_on, spread, last_recorded_on, last_recorded_balance)
select u.id, 'ING', 'Carla', 'Alba', 218000, 196200, '2025-09-18', 2.450,
  641.62, '2030-09-30', '2030-10-01', '2065-01-01', 0.790, '2026-10-01', 193274.77
from public.family_units u
join public.profiles p on p.id = u.owner_id
where lower(p.full_name) like 'carla%' or lower(p.full_name) like 'alba%'
on conflict(family_unit_id) do nothing;

insert into public.family_mortgage_payments(family_unit_id, month, payment, balance)
select m.family_unit_id, v.month::date, v.payment, v.balance
from public.family_mortgages m cross join (values
  ('2025-11-01', 815.21, 195958.96), ('2025-12-01', 641.62, 195717.42),
  ('2026-01-01', 641.62, 195475.39), ('2026-02-01', 641.62, 195232.87),
  ('2026-03-01', 641.62, 194989.85), ('2026-04-01', 641.62, 194746.33),
  ('2026-05-01', 641.62, 194502.32), ('2026-06-01', 641.62, 194257.81),
  ('2026-07-01', 641.62, 194012.80), ('2026-08-01', 641.62, 193767.29),
  ('2026-09-01', 641.62, 193521.28), ('2026-10-01', 641.62, 193274.77)
) as v(month, payment, balance)
on conflict(family_unit_id, month) do nothing;

-- Los cambios en tablas de la unidad pueden actualizar las pestañas abiertas.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'family_expenses', 'family_recurring_expenses', 'family_recurring_expense_skips',
    'family_expense_preferences', 'family_expense_categories', 'family_unit_members',
    'family_personal_sharing', 'monthly_budget_plans', 'monthly_budget_items',
    'family_mortgages', 'family_mortgage_payments', 'financial_goals',
    'expenses', 'income', 'fixed_expenses', 'fixed_expense_skips', 'investments'
  ] loop
    if not exists(select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
