-- Keep every existing family and row. Existing memberships start with the
-- equivalent of their previous full access; new invitations start restricted.
create table public.family_section_permissions (
  unit_id uuid not null references public.family_units(id) on delete cascade,
  member_id uuid not null references public.family_unit_members(id) on delete cascade,
  section text not null check (section in ('expenses','menus','pantry','mortgage','tasks','overview')),
  access text not null default 'none' check (access in ('none','view','edit')),
  primary key (member_id, section)
);
create index family_section_permissions_unit_idx on public.family_section_permissions(unit_id);
alter table public.family_section_permissions enable row level security;
create policy "family_section_permissions_read" on public.family_section_permissions for select to authenticated
  using (public.is_family_unit_owner(unit_id) or exists (
    select 1 from public.family_unit_members m where m.id = member_id and m.unit_id = unit_id and m.user_id = (select auth.uid()) and m.status = 'active'
  ));
create policy "family_section_permissions_insert_owner" on public.family_section_permissions for insert to authenticated
  with check (public.is_family_unit_owner(unit_id) and exists (
    select 1 from public.family_unit_members m where m.id = member_id and m.unit_id = unit_id and m.role = 'member'
  ));
create policy "family_section_permissions_update_owner" on public.family_section_permissions for update to authenticated
  using (public.is_family_unit_owner(unit_id))
  with check (public.is_family_unit_owner(unit_id) and exists (
    select 1 from public.family_unit_members m where m.id = member_id and m.unit_id = unit_id and m.role = 'member'
  ));
create policy "family_section_permissions_delete_owner" on public.family_section_permissions for delete to authenticated
  using (public.is_family_unit_owner(unit_id));
grant select, insert, update, delete on public.family_section_permissions to authenticated;

insert into public.family_section_permissions(unit_id, member_id, section, access)
select m.unit_id, m.id, sections.section, 'edit'
from public.family_unit_members m
cross join (values ('expenses'),('menus'),('pantry'),('mortgage'),('tasks'),('overview')) sections(section)
where m.role = 'member' and m.status = 'active'
on conflict (member_id, section) do nothing;

create or replace function private.family_access_level(fid uuid, requested_section text)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.family_units u where u.id = fid and u.owner_id = (select auth.uid())) then 'edit'
    else coalesce((
      select p.access from public.family_section_permissions p
      join public.family_unit_members m on m.id = p.member_id and m.unit_id = p.unit_id
      where p.unit_id = fid and p.section = requested_section
        and m.user_id = (select auth.uid()) and m.status = 'active'
      limit 1
    ), 'none')
  end;
$$;
revoke all on function private.family_access_level(uuid,text) from public;
grant execute on function private.family_access_level(uuid,text) to authenticated;

create or replace function private.can_access_family_section(fid uuid, requested_section text, edit_required boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when edit_required then private.family_access_level(fid, requested_section) = 'edit'
    else private.family_access_level(fid, requested_section) in ('view','edit') end;
$$;
revoke all on function private.can_access_family_section(uuid,text,boolean) from public;
grant execute on function private.can_access_family_section(uuid,text,boolean) to authenticated;

-- Limit families owned, not memberships. The lock serializes concurrent creates.
create function private.limit_owned_families()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 0));
  if (select count(*) from public.family_units where owner_id = new.owner_id) >= 3 then
    raise exception 'Solo puedes crear hasta tres unidades familiares.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_owned_families() from public;
create trigger limit_owned_families_before_insert before insert on public.family_units
  for each row execute function private.limit_owned_families();

-- Removing a person only revokes access; deleting membership rows would erase
-- task assignments and their completion history through foreign-key cascades.
drop policy "family_unit_members_delete_owner" on public.family_unit_members;
revoke delete on public.family_unit_members from authenticated;
create function private.protect_family_owner_membership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'owner' and not exists (
      select 1 from public.family_units u where u.id = new.unit_id and u.owner_id = new.user_id
    ) then
      raise exception 'El propietario de la unidad debe coincidir con su miembro propietario.' using errcode = '23514';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      raise exception 'No se puede retirar al propietario de la unidad familiar.' using errcode = '23514';
    end if;
    return old;
  end if;
  if old.role = 'owner' and (new.role is distinct from 'owner'
    or new.status is distinct from 'active' or new.unit_id is distinct from old.unit_id
    or new.user_id is distinct from old.user_id) then
    raise exception 'No se puede retirar al propietario de la unidad familiar.' using errcode = '23514';
  end if;
  if old.role <> 'owner' and new.role = 'owner' then
    raise exception 'No se puede cambiar el propietario de la unidad familiar.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_family_owner_membership() from public;
create trigger protect_family_owner_membership_before_change before insert or update or delete on public.family_unit_members
  for each row execute function private.protect_family_owner_membership();

-- A consent choice belongs to each family separately.
alter table public.family_personal_sharing drop constraint family_personal_sharing_pkey;
alter table public.family_personal_sharing add primary key (user_id, family_unit_id);

-- Family data uses section-specific RLS. All old broad policies are removed.
do $$
declare entry record;
declare policy_row record;
begin
  for entry in select * from (values
    ('family_expenses','expenses'), ('family_recurring_expenses','expenses'),
    ('family_expense_preferences','expenses'), ('family_expense_categories','expenses'),
    ('family_recurring_expense_skips','expenses'),
    ('menu_recipes','menus'), ('menu_meals','menus'),
    ('family_mortgages','mortgage'), ('family_mortgage_payments','mortgage'),
    ('domestic_tasks','tasks'), ('domestic_task_completions','tasks')
  ) as x(table_name, section_name) loop
    for policy_row in select policyname from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = entry.table_name loop
      execute format('drop policy %I on public.%I', policy_row.policyname, entry.table_name);
    end loop;
    execute format('create policy %I on public.%I for select to authenticated using (private.can_access_family_section(family_unit_id,%L))',
      entry.table_name || '_section_read', entry.table_name, entry.section_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.can_access_family_section(family_unit_id,%L,true))',
      entry.table_name || '_section_insert', entry.table_name, entry.section_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.can_access_family_section(family_unit_id,%L,true)) with check (private.can_access_family_section(family_unit_id,%L,true))',
      entry.table_name || '_section_update', entry.table_name, entry.section_name, entry.section_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.can_access_family_section(family_unit_id,%L,true))',
      entry.table_name || '_section_delete', entry.table_name, entry.section_name);
  end loop;
end $$;

-- Preserve the cross-row checks from the previous feature policies.
drop policy domestic_tasks_section_insert on public.domestic_tasks;
drop policy domestic_tasks_section_update on public.domestic_tasks;
create policy domestic_tasks_section_insert on public.domestic_tasks for insert to authenticated
  with check (private.can_access_family_section(family_unit_id,'tasks',true)
    and exists (select 1 from public.family_unit_members m where m.id = assignee_member_id
      and m.unit_id = family_unit_id and m.status = 'active' and m.user_id is not null));
create policy domestic_tasks_section_update on public.domestic_tasks for update to authenticated
  using (private.can_access_family_section(family_unit_id,'tasks',true))
  with check (private.can_access_family_section(family_unit_id,'tasks',true)
    and exists (select 1 from public.family_unit_members m where m.id = assignee_member_id
      and m.unit_id = family_unit_id and m.status = 'active' and m.user_id is not null));
drop policy menu_meals_section_insert on public.menu_meals;
drop policy menu_meals_section_update on public.menu_meals;
create policy menu_meals_section_insert on public.menu_meals for insert to authenticated
  with check (private.can_access_family_section(family_unit_id,'menus',true)
    and (recipe_id is null or exists (select 1 from public.menu_recipes r
      where r.id = recipe_id and r.family_unit_id = menu_meals.family_unit_id)));
create policy menu_meals_section_update on public.menu_meals for update to authenticated
  using (private.can_access_family_section(family_unit_id,'menus',true))
  with check (private.can_access_family_section(family_unit_id,'menus',true)
    and (recipe_id is null or exists (select 1 from public.menu_recipes r
      where r.id = recipe_id and r.family_unit_id = menu_meals.family_unit_id)));

-- Keep task completion integrity after replacing the old policy.
drop policy domestic_task_completions_section_insert on public.domestic_task_completions;
create policy domestic_task_completions_section_insert on public.domestic_task_completions for insert to authenticated
  with check (private.can_access_family_section(family_unit_id,'tasks',true)
    and completed_by = (select auth.uid())
    and due_date <= (now() at time zone 'Europe/Madrid')::date
    and exists (select 1 from public.domestic_tasks t where t.id = task_id
      and t.family_unit_id = domestic_task_completions.family_unit_id
      and due_date >= t.starts_on and extract(isodow from due_date)::integer - 1 = t.weekday));

-- Family goals belong to the Expenses section; personal goals remain personal.
drop policy "financial_goals_select" on public.financial_goals;
drop policy "financial_goals_insert" on public.financial_goals;
drop policy "financial_goals_delete" on public.financial_goals;
create policy financial_goals_select on public.financial_goals for select to authenticated
  using ((scope = 'personal' and owner_id = (select auth.uid())) or
    (scope = 'family' and private.can_access_family_section(family_unit_id,'expenses')));
create policy financial_goals_insert on public.financial_goals for insert to authenticated
  with check (owner_id = (select auth.uid()) and
    (scope = 'personal' or (scope = 'family' and private.can_access_family_section(family_unit_id,'expenses',true))));
create policy financial_goals_delete on public.financial_goals for delete to authenticated
  using ((scope = 'personal' and owner_id = (select auth.uid())) or
    (scope = 'family' and private.can_access_family_section(family_unit_id,'expenses',true)));

-- Personal sharing is visible only through the Overview permission.
drop policy "family_personal_sharing_select" on public.family_personal_sharing;
create policy family_personal_sharing_select on public.family_personal_sharing for select to authenticated
  using (user_id = (select auth.uid()) or private.can_access_family_section(family_unit_id,'overview'));
create or replace function private.can_view_shared_finances(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_personal_sharing s
    join public.family_unit_members viewer on viewer.unit_id = s.family_unit_id
      and viewer.user_id = (select auth.uid()) and viewer.status = 'active'
    join public.family_unit_members owner_member on owner_member.unit_id = s.family_unit_id
      and owner_member.user_id = target_user_id and owner_member.status = 'active'
    where s.user_id = target_user_id and s.enabled and target_user_id <> (select auth.uid())
      and private.can_access_family_section(s.family_unit_id,'overview')
  );
$$;

-- StockAlert was personal. Attach each existing product to the family that its
-- owner currently uses (latest active membership), without changing owner_id.
alter table public.stockalert_products add column family_unit_id uuid references public.family_units(id) on delete cascade;
update public.stockalert_products p set family_unit_id = chosen.unit_id
from (
  select distinct on (m.user_id) m.user_id, m.unit_id from public.family_unit_members m
  where m.status = 'active' and m.user_id is not null
  order by m.user_id, m.joined_at desc nulls last, m.created_at desc
) chosen where p.owner_id = chosen.user_id;
create index stockalert_products_family_idx on public.stockalert_products(family_unit_id,status,expiration_date);
drop policy "Read own StockAlert products" on public.stockalert_products;
drop policy "Add own StockAlert products" on public.stockalert_products;
drop policy "Update own StockAlert products" on public.stockalert_products;
drop policy "Delete own StockAlert products" on public.stockalert_products;
create policy stockalert_products_section_read on public.stockalert_products for select to authenticated
  using ((family_unit_id is not null and private.can_access_family_section(family_unit_id,'pantry'))
    or (family_unit_id is null and owner_id = (select auth.uid())));
create policy stockalert_products_section_insert on public.stockalert_products for insert to authenticated
  with check (owner_id = (select auth.uid()) and family_unit_id is not null
    and private.can_access_family_section(family_unit_id,'pantry',true));
create policy stockalert_products_section_update on public.stockalert_products for update to authenticated
  using ((family_unit_id is not null and private.can_access_family_section(family_unit_id,'pantry',true))
    or (family_unit_id is null and owner_id = (select auth.uid())))
  with check (family_unit_id is not null and private.can_access_family_section(family_unit_id,'pantry',true));
create policy stockalert_products_section_delete on public.stockalert_products for delete to authenticated
  using ((family_unit_id is not null and private.can_access_family_section(family_unit_id,'pantry',true))
    or (family_unit_id is null and owner_id = (select auth.uid())));

create function private.keep_stockalert_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.family_unit_id is distinct from old.family_unit_id then
    raise exception 'No se puede cambiar el propietario ni la unidad de un producto.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_stockalert_scope() from public;
create trigger keep_stockalert_scope_before_update before update on public.stockalert_products
  for each row execute function private.keep_stockalert_scope();
