-- ============================================================
-- Ámbito de las importaciones: gastos personales o familiares
-- ============================================================

alter table public.imported_files
  add column if not exists import_scope text not null default 'personal';

alter table public.imported_files
  add constraint imported_files_scope_check
  check (import_scope in ('personal', 'family'));

alter table public.family_expenses
  add column if not exists import_id uuid references public.imported_files (id) on delete set null;

create index if not exists family_expenses_import_idx
  on public.family_expenses (import_id);

alter table public.ai_extracted_transactions
  add column if not exists suggested_category text;

alter table public.ai_extracted_transactions
  add column if not exists people_count integer not null default 1;

alter table public.ai_extracted_transactions
  add constraint ai_extracted_people_count_check
  check (people_count between 1 and 50);

grant select, insert, update, delete on public.imported_files to authenticated;
grant select, insert, update, delete on public.ai_extracted_transactions to authenticated;
