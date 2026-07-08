-- ============================================================
-- Gastos compartidos: grupos, miembros, gastos, deudas
-- ============================================================

create table public.shared_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_groups_owner_idx on public.shared_groups (owner_id);

create table public.shared_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_groups (id) on delete cascade,
  -- null hasta que la invitación se acepta
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  display_name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invite_token uuid not null default gen_random_uuid(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, email)
);

create index sgm_group_idx on public.shared_group_members (group_id);
create index sgm_user_idx on public.shared_group_members (user_id);

-- ------------------------------------------------------------
-- Helpers security definer (evitan recursión en las policies)
-- ------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.shared_group_members m
    where m.group_id = gid
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.shared_groups g
    where g.id = gid
      and g.owner_id = (select auth.uid())
  );
$$;

-- ------------------------------------------------------------
-- RLS: shared_groups
-- ------------------------------------------------------------
alter table public.shared_groups enable row level security;

create policy "groups_select_member" on public.shared_groups
  for select using (
    owner_id = (select auth.uid()) or public.is_group_member(id)
  );
create policy "groups_insert_owner" on public.shared_groups
  for insert with check (owner_id = (select auth.uid()));
create policy "groups_update_owner" on public.shared_groups
  for update using (owner_id = (select auth.uid()));
create policy "groups_delete_owner" on public.shared_groups
  for delete using (owner_id = (select auth.uid()));

create trigger shared_groups_updated_at
  before update on public.shared_groups
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS: shared_group_members
-- ------------------------------------------------------------
alter table public.shared_group_members enable row level security;

create policy "sgm_select_member" on public.shared_group_members
  for select using (
    user_id = (select auth.uid())
    or public.is_group_member(group_id)
    or public.is_group_owner(group_id)
  );
create policy "sgm_insert_owner" on public.shared_group_members
  for insert with check (public.is_group_owner(group_id));
create policy "sgm_update_owner_or_self" on public.shared_group_members
  for update using (
    public.is_group_owner(group_id) or user_id = (select auth.uid())
  );
create policy "sgm_delete_owner" on public.shared_group_members
  for delete using (public.is_group_owner(group_id));

-- ------------------------------------------------------------
-- shared_expenses
-- ------------------------------------------------------------
create table public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_groups (id) on delete cascade,
  name text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  occurred_at date not null,
  paid_by uuid not null references public.shared_group_members (id),
  category_id uuid references public.categories (id) on delete set null,
  receipt_path text,
  notes text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index se_group_occurred_idx on public.shared_expenses (group_id, occurred_at desc);
create index se_paid_by_idx on public.shared_expenses (paid_by);
create index se_category_idx on public.shared_expenses (category_id);
create index se_created_by_idx on public.shared_expenses (created_by);

alter table public.shared_expenses enable row level security;

create policy "se_select_member" on public.shared_expenses
  for select using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "se_insert_member" on public.shared_expenses
  for insert with check (
    (public.is_group_member(group_id) or public.is_group_owner(group_id))
    and created_by = (select auth.uid())
  );
create policy "se_update_creator_or_owner" on public.shared_expenses
  for update using (
    created_by = (select auth.uid()) or public.is_group_owner(group_id)
  );
create policy "se_delete_creator_or_owner" on public.shared_expenses
  for delete using (
    created_by = (select auth.uid()) or public.is_group_owner(group_id)
  );

create trigger shared_expenses_updated_at
  before update on public.shared_expenses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- shared_expense_participants
-- ------------------------------------------------------------
create table public.shared_expense_participants (
  id uuid primary key default gen_random_uuid(),
  shared_expense_id uuid not null references public.shared_expenses (id) on delete cascade,
  member_id uuid not null references public.shared_group_members (id),
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  created_at timestamptz not null default now(),
  unique (shared_expense_id, member_id)
);

create index sep_expense_idx on public.shared_expense_participants (shared_expense_id);
create index sep_member_idx on public.shared_expense_participants (member_id);

alter table public.shared_expense_participants enable row level security;

create policy "sep_select_member" on public.shared_expense_participants
  for select using (
    exists (
      select 1 from public.shared_expenses e
      where e.id = shared_expense_id
        and (public.is_group_member(e.group_id) or public.is_group_owner(e.group_id))
    )
  );
create policy "sep_write_creator_or_owner" on public.shared_expense_participants
  for all using (
    exists (
      select 1 from public.shared_expenses e
      where e.id = shared_expense_id
        and (e.created_by = (select auth.uid()) or public.is_group_owner(e.group_id))
    )
  )
  with check (
    exists (
      select 1 from public.shared_expenses e
      where e.id = shared_expense_id
        and (e.created_by = (select auth.uid()) or public.is_group_owner(e.group_id))
    )
  );

-- ------------------------------------------------------------
-- debt_settlements (deudas entre miembros por mes)
-- ------------------------------------------------------------
create table public.debt_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_groups (id) on delete cascade,
  from_member uuid not null references public.shared_group_members (id),
  to_member uuid not null references public.shared_group_members (id),
  amount numeric(12, 2) not null check (amount > 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  -- Primer día del mes al que pertenece la deuda
  month date not null check (extract(day from month) = 1),
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_member <> to_member)
);

create index ds_group_month_idx on public.debt_settlements (group_id, month desc);
create index ds_from_idx on public.debt_settlements (from_member);
create index ds_to_idx on public.debt_settlements (to_member);

alter table public.debt_settlements enable row level security;

create policy "ds_select_member" on public.debt_settlements
  for select using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "ds_insert_member" on public.debt_settlements
  for insert with check (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "ds_update_member" on public.debt_settlements
  for update using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "ds_delete_owner" on public.debt_settlements
  for delete using (public.is_group_owner(group_id));

create trigger debt_settlements_updated_at
  before update on public.debt_settlements
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- uploaded_receipts (tickets subidos, con datos extraídos por IA)
-- ------------------------------------------------------------
create table public.uploaded_receipts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_groups (id) on delete cascade,
  uploader_id uuid not null references auth.users (id),
  file_path text not null,
  parsed jsonb,
  shared_expense_id uuid references public.shared_expenses (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ur_group_idx on public.uploaded_receipts (group_id);
create index ur_uploader_idx on public.uploaded_receipts (uploader_id);
create index ur_expense_idx on public.uploaded_receipts (shared_expense_id);

alter table public.uploaded_receipts enable row level security;

create policy "ur_select_member" on public.uploaded_receipts
  for select using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "ur_insert_member" on public.uploaded_receipts
  for insert with check (
    (public.is_group_member(group_id) or public.is_group_owner(group_id))
    and uploader_id = (select auth.uid())
  );
create policy "ur_delete_uploader_or_owner" on public.uploaded_receipts
  for delete using (
    uploader_id = (select auth.uid()) or public.is_group_owner(group_id)
  );

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using ((select auth.uid()) = user_id);
create policy "notifications_update_own" on public.notifications
  for update using ((select auth.uid()) = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete using ((select auth.uid()) = user_id);
-- Las inserciones las hacen server actions / edge functions (service role).

-- ------------------------------------------------------------
-- audit_log (historial de acciones importantes)
-- ------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_select_own" on public.audit_log
  for select using ((select auth.uid()) = user_id);
create policy "audit_insert_own" on public.audit_log
  for insert with check ((select auth.uid()) = user_id);
