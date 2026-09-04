-- Una única unidad familiar compartible. Los gastos previos se conservan y
-- pasan a la unidad privada de la persona que los creó.
create table public.family_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Mi unidad familiar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_unit_members (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.family_units (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  display_name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invite_token uuid not null default gen_random_uuid(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (unit_id, email)
);
create unique index family_unit_members_one_active_unit_idx
  on public.family_unit_members (user_id) where status = 'active';
create index family_unit_members_unit_idx on public.family_unit_members (unit_id);
create index family_unit_members_user_idx on public.family_unit_members (user_id);

create or replace function public.is_family_unit_member(fid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.family_unit_members m
    where m.unit_id = fid and m.user_id = (select auth.uid()) and m.status = 'active');
$$;
create or replace function public.is_family_unit_owner(fid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.family_units u
    where u.id = fid and u.owner_id = (select auth.uid()));
$$;

alter table public.family_units enable row level security;
alter table public.family_unit_members enable row level security;
create policy "family_units_select_member" on public.family_units for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_family_unit_member(id));
create policy "family_units_insert_owner" on public.family_units for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "family_units_update_owner" on public.family_units for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "family_unit_members_select" on public.family_unit_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_family_unit_member(unit_id) or public.is_family_unit_owner(unit_id));
create policy "family_unit_members_insert_owner" on public.family_unit_members for insert to authenticated
  with check (public.is_family_unit_owner(unit_id));
create policy "family_unit_members_update_owner" on public.family_unit_members for update to authenticated
  using (public.is_family_unit_owner(unit_id)) with check (public.is_family_unit_owner(unit_id));
create policy "family_unit_members_delete_owner" on public.family_unit_members for delete to authenticated
  using (public.is_family_unit_owner(unit_id));
grant select, insert, update, delete on public.family_units, public.family_unit_members to authenticated;

-- Backfill: una unidad para cada propietario que ya tenía datos familiares.
insert into public.family_units (owner_id)
select distinct user_id from (
  select user_id from public.family_expenses union
  select user_id from public.family_recurring_expenses union
  select user_id from public.family_expense_preferences union
  select user_id from public.family_expense_categories
) legacy;
insert into public.family_unit_members (unit_id, user_id, email, display_name, role, status, joined_at)
select u.id, u.owner_id, coalesce(au.email, ''), p.full_name, 'owner', 'active', now()
from public.family_units u
left join auth.users au on au.id = u.owner_id
left join public.profiles p on p.id = u.owner_id;

alter table public.family_expenses add column family_unit_id uuid references public.family_units (id) on delete cascade;
alter table public.family_recurring_expenses add column family_unit_id uuid references public.family_units (id) on delete cascade;
alter table public.family_expense_preferences add column family_unit_id uuid references public.family_units (id) on delete cascade;
alter table public.family_expense_categories add column family_unit_id uuid references public.family_units (id) on delete cascade;
update public.family_expenses e set family_unit_id = u.id from public.family_units u where u.owner_id = e.user_id;
update public.family_recurring_expenses e set family_unit_id = u.id from public.family_units u where u.owner_id = e.user_id;
update public.family_expense_preferences p set family_unit_id = u.id from public.family_units u where u.owner_id = p.user_id;
update public.family_expense_categories c set family_unit_id = u.id from public.family_units u where u.owner_id = c.user_id;
alter table public.family_expenses alter column family_unit_id set not null;
alter table public.family_recurring_expenses alter column family_unit_id set not null;
alter table public.family_expense_preferences alter column family_unit_id set not null;
alter table public.family_expense_categories alter column family_unit_id set not null;

alter table public.family_expense_preferences drop constraint family_expense_preferences_pkey;
alter table public.family_expense_preferences add primary key (family_unit_id);
drop index public.family_expense_categories_user_name_idx;
create unique index family_expense_categories_unit_name_idx on public.family_expense_categories (family_unit_id, lower(name));
create index family_expenses_unit_occurred_idx on public.family_expenses (family_unit_id, occurred_at desc);
create index family_recurring_expenses_unit_period_idx on public.family_recurring_expenses (family_unit_id, starts_on desc, ends_on);

drop policy "family_expenses_all_own" on public.family_expenses;
create policy "family_expenses_all_unit" on public.family_expenses for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
drop policy "family_recurring_expenses_all_own" on public.family_recurring_expenses;
create policy "family_recurring_expenses_all_unit" on public.family_recurring_expenses for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
drop policy "family_expense_preferences_all_own" on public.family_expense_preferences;
create policy "family_expense_preferences_all_unit" on public.family_expense_preferences for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
drop policy "family_expense_categories_select_own" on public.family_expense_categories;
drop policy "family_expense_categories_insert_own" on public.family_expense_categories;
drop policy "family_expense_categories_delete_own" on public.family_expense_categories;
create policy "family_expense_categories_all_unit" on public.family_expense_categories for all to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
