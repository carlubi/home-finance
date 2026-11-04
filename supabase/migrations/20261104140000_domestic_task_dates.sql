-- Existing weekly tasks keep their weekday and completion history.
-- A dated task has exactly one scheduled occurrence.
alter table public.domestic_tasks add column scheduled_date date;
alter table public.domestic_tasks alter column weekday drop not null;
alter table public.domestic_tasks add constraint domestic_tasks_schedule_check
  check ((weekday is not null and scheduled_date is null)
    or (weekday is null and scheduled_date is not null));
create index domestic_tasks_family_scheduled_date_idx
  on public.domestic_tasks(family_unit_id, scheduled_date)
  where scheduled_date is not null;

drop policy domestic_task_completions_section_insert on public.domestic_task_completions;
create policy domestic_task_completions_section_insert on public.domestic_task_completions for insert to authenticated
  with check (private.can_access_family_section(family_unit_id,'tasks',true)
    and completed_by = (select auth.uid())
    and due_date <= (now() at time zone 'Europe/Madrid')::date
    and exists (select 1 from public.domestic_tasks t where t.id = task_id
      and t.family_unit_id = domestic_task_completions.family_unit_id
      and ((t.scheduled_date = due_date)
        or (t.scheduled_date is null and due_date >= t.starts_on
          and extract(isodow from due_date)::integer - 1 = t.weekday))));
