-- StockAlert inventory. Rows and photos belong to the signed-in user.
create table public.stockalert_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  brand text check (char_length(brand) <= 120),
  units integer check (units between 1 and 9999),
  expiration_date date,
  confidence numeric(3,2) not null default 1 check (confidence between 0 and 1),
  needs_review boolean not null default false,
  source_image_path text,
  status text not null default 'active' check (status in ('pending', 'active', 'archived')),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'active' or (needs_review = false and expiration_date is not null and units is not null))
);
create index stockalert_products_owner_status_expiry_idx
  on public.stockalert_products (owner_id, status, expiration_date);
alter table public.stockalert_products enable row level security;
grant select, insert, update, delete on public.stockalert_products to authenticated;
create policy "Read own StockAlert products" on public.stockalert_products
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Add own StockAlert products" on public.stockalert_products
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own StockAlert products" on public.stockalert_products
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Delete own StockAlert products" on public.stockalert_products
  for delete to authenticated using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stockalert-images', 'stockalert-images', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "Read own StockAlert photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'stockalert-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Upload own StockAlert photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'stockalert-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Delete own StockAlert photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'stockalert-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
