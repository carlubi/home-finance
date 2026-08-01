-- ============================================================
-- Categorías predeterminadas adicionales
-- ============================================================

insert into public.categories (name, kind, icon, color) values
  ('Gas', 'expense', 'flame', '#d95926'),
  ('Agua', 'expense', 'droplets', '#3987e5'),
  ('Seguro coche', 'expense', 'shield-check', '#2a78d6'),
  ('Seguro casa', 'expense', 'house', '#1baf7a'),
  ('Impuestos', 'expense', 'landmark', '#4a3aa7')
on conflict (user_id, name, kind) do nothing;
