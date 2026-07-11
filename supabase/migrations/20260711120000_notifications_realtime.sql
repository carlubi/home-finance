-- Habilita Realtime para la tabla de notificaciones (la campana escucha
-- INSERTs vía postgres_changes; sin esto no llega ningún evento).
-- Idempotente: en el proyecto remoto ya se activó desde el dashboard.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
