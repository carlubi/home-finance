-- Asegura que la API de Supabase vea la columna monthly_income recién añadida.
alter table public.profiles
  add column if not exists monthly_income numeric(12, 2);

notify pgrst, 'reload schema';
