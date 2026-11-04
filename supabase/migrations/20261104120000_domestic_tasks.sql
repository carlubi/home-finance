create table public.domestic_tasks (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  assignee_member_id uuid not null references public.family_unit_members(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  weekday smallint not null check (weekday between 0 and 6),
  starts_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index domestic_tasks_family_day_idx on public.domestic_tasks(family_unit_id, weekday);
create index domestic_tasks_assignee_idx on public.domestic_tasks(assignee_member_id);
alter table public.domestic_tasks enable row level security;
create policy "domestic_tasks_select_family" on public.domestic_tasks for select to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
create policy "domestic_tasks_insert_family" on public.domestic_tasks for insert to authenticated
  with check (
    (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
    and exists (select 1 from public.family_unit_members m where m.id = assignee_member_id and m.unit_id = family_unit_id and m.status = 'active' and m.user_id is not null)
  );
create policy "domestic_tasks_update_family" on public.domestic_tasks for update to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
  with check (
    (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
    and exists (select 1 from public.family_unit_members m where m.id = assignee_member_id and m.unit_id = family_unit_id and m.status = 'active' and m.user_id is not null)
  );
create policy "domestic_tasks_delete_family" on public.domestic_tasks for delete to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
create trigger domestic_tasks_updated_at before update on public.domestic_tasks
  for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.domestic_tasks to authenticated;

create table public.domestic_task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.domestic_tasks(id) on delete cascade,
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  due_date date not null,
  completed_by uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(task_id, due_date)
);
create index domestic_task_completions_family_date_idx on public.domestic_task_completions(family_unit_id, due_date);
alter table public.domestic_task_completions enable row level security;
create policy "domestic_task_completions_select_family" on public.domestic_task_completions for select to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
create policy "domestic_task_completions_insert_family" on public.domestic_task_completions for insert to authenticated
  with check (
    completed_by = (select auth.uid())
    and (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id))
    and due_date <= (now() at time zone 'Europe/Madrid')::date
    and exists (
      select 1 from public.domestic_tasks t
      where t.id = task_id
        and t.family_unit_id = domestic_task_completions.family_unit_id
        and due_date >= t.starts_on
        and ((extract(isodow from due_date)::integer - 1) = t.weekday)
    )
  );
create policy "domestic_task_completions_delete_family" on public.domestic_task_completions for delete to authenticated
  using (public.is_family_unit_member(family_unit_id) or public.is_family_unit_owner(family_unit_id));
grant select, insert, delete on public.domestic_task_completions to authenticated;
