-- Distingue la aportación desde ingresos del capital/saldo ya amortizado y
-- permite configurar préstamos fijos, variables o mixtos por unidad familiar.
alter table public.family_mortgages
  add column rate_kind text not null default 'mixed'
    check (rate_kind in ('fixed', 'mixed', 'variable')),
  add column current_payment numeric(12,2)
    check (current_payment > 0),
  add column paid_total_to_date numeric(12,2)
    check (paid_total_to_date >= 0);

update public.family_mortgages set current_payment = fixed_payment;
alter table public.family_mortgages alter column current_payment set not null;

-- La referencia facilitada pertenece exclusivamente a la unidad donde ambas
-- direcciones son miembros activos. Los nombres de perfil no son un criterio.
create function private.is_reference_mortgage_unit(fid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_unit_members m
    join auth.users u on u.id = m.user_id
    where m.unit_id = fid and m.status = 'active'
      and lower(m.email) = 'munyozgarcia@gmail.com'
      and lower(u.email) = 'munyozgarcia@gmail.com'
  ) and exists (
    select 1 from public.family_unit_members m
    join auth.users u on u.id = m.user_id
    where m.unit_id = fid and m.status = 'active'
      and lower(m.email) = 'carlamunyozz@gmail.com'
      and lower(u.email) = 'carlamunyozz@gmail.com'
  );
$$;
revoke all on function private.is_reference_mortgage_unit(uuid) from public;

-- La migración anterior copió doce cuotas a todas las hipotecas existentes.
-- Solo retiramos las que coinciden con el extracto completo de ejemplo.
with reference_payments(month, payment, balance) as (values
  ('2025-11-01'::date, 815.21::numeric, 195958.96::numeric),
  ('2025-12-01'::date, 641.62::numeric, 195717.42::numeric),
  ('2026-01-01'::date, 641.62::numeric, 195475.39::numeric),
  ('2026-02-01'::date, 641.62::numeric, 195232.87::numeric),
  ('2026-03-01'::date, 641.62::numeric, 194989.85::numeric),
  ('2026-04-01'::date, 641.62::numeric, 194746.33::numeric),
  ('2026-05-01'::date, 641.62::numeric, 194502.32::numeric),
  ('2026-06-01'::date, 641.62::numeric, 194257.81::numeric),
  ('2026-07-01'::date, 641.62::numeric, 194012.80::numeric),
  ('2026-08-01'::date, 641.62::numeric, 193767.29::numeric),
  ('2026-09-01'::date, 641.62::numeric, 193521.28::numeric),
  ('2026-10-01'::date, 641.62::numeric, 193274.77::numeric)
), contaminated as (
  select p.family_unit_id from public.family_mortgage_payments p
  join reference_payments r on r.month = p.month
    and r.payment = p.payment and r.balance = p.balance
  where not private.is_reference_mortgage_unit(p.family_unit_id)
  group by p.family_unit_id having count(*) >= 10
)
delete from public.family_mortgage_payments p
using reference_payments r, contaminated c
where p.family_unit_id = c.family_unit_id and p.month = r.month
  and p.payment = r.payment and p.balance = r.balance;

delete from public.family_mortgages m
where not private.is_reference_mortgage_unit(m.family_unit_id)
  and m.lender = 'ING' and m.first_borrower = 'Carla'
  and m.second_borrower = 'Alba' and m.purchase_price = 218000
  and m.principal = 196200 and m.started_on = '2025-09-18'
  and m.fixed_rate = 2.450 and m.fixed_payment = 641.62
  and m.fixed_until = '2030-09-30' and m.variable_from = '2030-10-01'
  and m.ends_on = '2065-01-01' and m.spread = 0.790;

update public.family_mortgages m set paid_total_to_date = payments.total
from (select family_unit_id, sum(payment) as total
  from public.family_mortgage_payments group by family_unit_id) payments
where m.family_unit_id = payments.family_unit_id
  and m.paid_total_to_date is null;

create function private.seed_reference_family_mortgage(fid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_reference_mortgage_unit(fid) then return; end if;

  insert into public.family_mortgages (
    family_unit_id, lender, first_borrower, second_borrower, purchase_price,
    principal, started_on, fixed_rate, fixed_payment, fixed_until,
    variable_from, ends_on, spread, last_recorded_on, last_recorded_balance,
    current_payment, paid_total_to_date
  ) values (
    fid, 'ING', 'Carla', 'Alba', 218000, 196200, '2025-09-18',
    2.450, 641.62, '2030-09-30', '2030-10-01', '2065-01-01',
    0.790, '2026-10-01', 193274.77, 641.62, 815.21 + 11 * 641.62
  ) on conflict (family_unit_id) do nothing;

  if exists (select 1 from public.family_mortgages m where m.family_unit_id = fid
    and m.lender = 'ING' and m.principal = 196200
    and m.started_on = '2025-09-18') then
    insert into public.family_mortgage_payments (family_unit_id, month, payment, balance)
    select fid, v.month::date, v.payment, v.balance from (values
      ('2025-11-01', 815.21, 195958.96), ('2025-12-01', 641.62, 195717.42),
      ('2026-01-01', 641.62, 195475.39), ('2026-02-01', 641.62, 195232.87),
      ('2026-03-01', 641.62, 194989.85), ('2026-04-01', 641.62, 194746.33),
      ('2026-05-01', 641.62, 194502.32), ('2026-06-01', 641.62, 194257.81),
      ('2026-07-01', 641.62, 194012.80), ('2026-08-01', 641.62, 193767.29),
      ('2026-09-01', 641.62, 193521.28), ('2026-10-01', 641.62, 193274.77)
    ) as v(month, payment, balance)
    on conflict (family_unit_id, month) do nothing;
    update public.family_mortgages
    set paid_total_to_date = 815.21 + 11 * 641.62
    where family_unit_id = fid and paid_total_to_date is null;
  end if;
end;
$$;
revoke all on function private.seed_reference_family_mortgage(uuid) from public;

-- Una hipoteca configurada antes de unirse a otra unidad se copia a la nueva
-- unidad si esta aún no tiene préstamo. Se conserva la unidad privada previa.
create function private.copy_member_private_mortgage(fid uuid, member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare source_unit_id uuid;
declare inserted_count integer;
begin
  if exists (select 1 from public.family_mortgages where family_unit_id = fid) then return; end if;

  select m.family_unit_id into source_unit_id
  from public.family_mortgages m
  join public.family_units u on u.id = m.family_unit_id and u.owner_id = member_id
  where m.family_unit_id <> fid
    and (select count(*) from public.family_unit_members active_member
      where active_member.unit_id = u.id and active_member.status = 'active') = 1
    and not (
      m.lender = 'ING' and m.first_borrower = 'Carla'
      and m.second_borrower = 'Alba' and m.principal = 196200
      and m.started_on = '2025-09-18'
    )
  order by u.created_at desc limit 1;
  if source_unit_id is null then return; end if;

  insert into public.family_mortgages (
    family_unit_id, rate_kind, lender, first_borrower, second_borrower,
    first_share_percent, purchase_price, principal, started_on, fixed_rate,
    fixed_payment, current_payment, fixed_until, variable_from, ends_on,
    spread, last_recorded_on, last_recorded_balance, paid_total_to_date
  ) select fid, rate_kind, lender, first_borrower, second_borrower,
    first_share_percent, purchase_price, principal, started_on, fixed_rate,
    fixed_payment, current_payment, fixed_until, variable_from, ends_on,
    spread, last_recorded_on, last_recorded_balance, paid_total_to_date
  from public.family_mortgages where family_unit_id = source_unit_id
  on conflict (family_unit_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return; end if;

  insert into public.family_mortgage_payments(family_unit_id, month, payment, balance)
  select fid, month, payment, balance
  from public.family_mortgage_payments where family_unit_id = source_unit_id
  on conflict (family_unit_id, month) do nothing;
end;
$$;
revoke all on function private.copy_member_private_mortgage(uuid, uuid) from public;

create function private.seed_reference_family_mortgage_on_join()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    perform private.seed_reference_family_mortgage(new.unit_id);
    if new.user_id is not null then
      perform private.copy_member_private_mortgage(new.unit_id, new.user_id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.seed_reference_family_mortgage_on_join() from public;
create trigger seed_reference_family_mortgage_on_join
  after insert or update of status, email, user_id on public.family_unit_members
  for each row execute function private.seed_reference_family_mortgage_on_join();

do $$
declare unit_row record;
begin
  for unit_row in select id from public.family_units loop
    perform private.seed_reference_family_mortgage(unit_row.id);
  end loop;
end $$;

do $$
declare member_row record;
begin
  for member_row in select unit_id, user_id from public.family_unit_members
    where status = 'active' and user_id is not null
  loop
    perform private.copy_member_private_mortgage(member_row.unit_id, member_row.user_id);
  end loop;
end $$;
