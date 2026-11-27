-- RaastaShare backend, part 2: accounts and the rules for who may do what.
-- Run in Supabase > SQL Editor, in a NEW query tab (only this file in it),
-- AFTER 01-tables.sql. Safe to run again: it skips or replaces what exists.
--
-- What it does, in plain words:
--   * A new account automatically gets a profile (name + sender or carrier).
--   * Names are unique, because the app tells people apart by name.
--   * "Admin" is a separate yes/no on the profile. Nobody can make themselves
--     admin from the app; you set it here, in the SQL Editor (see the end).
--   * Signed-in people can SEE all trips, parcels and deliveries (the app
--     needs them for matching, the dashboard and the admin queue).
--   * People can only ADD their own parcels (senders) or trips (carriers),
--     and only CHANGE rows they take part in. The admin can change anything.
--   * Pickup and delivery codes: only the sender and carrier of that delivery
--     (and the admin) can read them. A later step moves the code check to
--     the server so the carrier no longer needs to read them.
--   * Signed-out visitors can read nothing.

-- ---- Owners are filled in by the server, not trusted from the browser ----
alter table journeys alter column carrier_id set default auth.uid();
alter table shipments alter column sender_id set default auth.uid();

-- ---- Matching time can be a fraction of a millisecond (for example 0.4) --
alter table shipments alter column matching_ms type numeric;

-- ---- Room for the few extra fields the app keeps on a record -------------
-- (for example who cancelled a parcel). Anything without its own column
-- is stored here, so nothing the app saves is lost.
alter table journeys add column if not exists extra jsonb not null default '{}';
alter table shipments add column if not exists extra jsonb not null default '{}';
alter table deliveries add column if not exists extra jsonb not null default '{}';

-- ---- Profiles ---------------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('sender', 'carrier'));
alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles drop constraint if exists profiles_name_unique;
alter table profiles add constraint profiles_name_unique unique (name);

-- When someone creates an account, make their profile from the name and
-- role they typed. Any role other than "carrier" becomes "sender".
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    case when new.raw_user_meta_data ->> 'role' = 'carrier' then 'carrier' else 'sender' end
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Small helpers the rules use ------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Is the signed-in person the sender or the carrier of this delivery?
create or replace function public.takes_part_in(delivery text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.deliveries d
    join public.shipments s on s.id = d.shipment_id
    join public.journeys j on j.id = d.journey_id
    where d.id = delivery
      and (s.sender_id = auth.uid() or j.carrier_id = auth.uid())
  );
$$;

-- Is the signed-in person the carrier on any delivery of this parcel?
create or replace function public.carries(shipment text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.deliveries d
    join public.journeys j on j.id = d.journey_id
    where d.shipment_id = shipment and j.carrier_id = auth.uid()
  );
$$;

-- ---- Who may use the tables at all -------------------------------------------
revoke all on profiles, journeys, shipments, deliveries, delivery_codes from anon;
grant select on profiles to authenticated;
grant select, insert, update, delete on journeys, shipments, deliveries, delivery_codes to authenticated;

-- ---- The rules ------------------------------------------------------------------
-- Profiles: you see your own (the admin sees all). Changes only via SQL Editor.
drop policy if exists "See own profile" on profiles;
create policy "See own profile" on profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Trips
drop policy if exists "Signed-in people see trips" on journeys;
create policy "Signed-in people see trips" on journeys for select to authenticated
  using (true);
drop policy if exists "Carriers add their own trips" on journeys;
create policy "Carriers add their own trips" on journeys for insert to authenticated
  with check (carrier_id = auth.uid() and public.my_role() = 'carrier');
drop policy if exists "Carrier or admin changes a trip" on journeys;
create policy "Carrier or admin changes a trip" on journeys for update to authenticated
  using (carrier_id = auth.uid() or public.is_admin());
drop policy if exists "Admin removes trips" on journeys;
create policy "Admin removes trips" on journeys for delete to authenticated
  using (public.is_admin());

-- Parcels
drop policy if exists "Signed-in people see parcels" on shipments;
create policy "Signed-in people see parcels" on shipments for select to authenticated
  using (true);
drop policy if exists "Senders add their own parcels" on shipments;
create policy "Senders add their own parcels" on shipments for insert to authenticated
  with check (sender_id = auth.uid() and public.my_role() = 'sender');
-- The sender, the admin, the carrier on it, or any carrier while the parcel
-- is still looking for one (a new trip can mark it "Carriers found").
drop policy if exists "Who may change a parcel" on shipments;
create policy "Who may change a parcel" on shipments for update to authenticated
  using (
    sender_id = auth.uid() or public.is_admin() or public.carries(id)
    or (public.my_role() = 'carrier'
        and status in ('Unmatched – Retrying', 'Flagged for admin review', 'Carriers found'))
  );
drop policy if exists "Sender or admin removes a parcel" on shipments;
create policy "Sender or admin removes a parcel" on shipments for delete to authenticated
  using (sender_id = auth.uid() or public.is_admin());

-- Deliveries (a parcel matched to a trip)
drop policy if exists "Signed-in people see deliveries" on deliveries;
create policy "Signed-in people see deliveries" on deliveries for select to authenticated
  using (true);
drop policy if exists "Sender or carrier starts a delivery" on deliveries;
create policy "Sender or carrier starts a delivery" on deliveries for insert to authenticated
  with check (
    exists (select 1 from shipments s where s.id = shipment_id and s.sender_id = auth.uid())
    or exists (select 1 from journeys j where j.id = journey_id and j.carrier_id = auth.uid())
  );
drop policy if exists "People on the delivery or admin change it" on deliveries;
create policy "People on the delivery or admin change it" on deliveries for update to authenticated
  using (public.takes_part_in(id) or public.is_admin());
drop policy if exists "People on the delivery or admin remove it" on deliveries;
create policy "People on the delivery or admin remove it" on deliveries for delete to authenticated
  using (public.takes_part_in(id) or public.is_admin());

-- Codes
drop policy if exists "People on the delivery or admin see codes" on delivery_codes;
create policy "People on the delivery or admin see codes" on delivery_codes for select to authenticated
  using (public.takes_part_in(delivery_id) or public.is_admin());
drop policy if exists "People on the delivery add codes" on delivery_codes;
create policy "People on the delivery add codes" on delivery_codes for insert to authenticated
  with check (public.takes_part_in(delivery_id) or public.is_admin());
drop policy if exists "People on the delivery change codes" on delivery_codes;
create policy "People on the delivery change codes" on delivery_codes for update to authenticated
  using (public.takes_part_in(delivery_id) or public.is_admin());
drop policy if exists "People on the delivery remove codes" on delivery_codes;
create policy "People on the delivery remove codes" on delivery_codes for delete to authenticated
  using (public.takes_part_in(delivery_id) or public.is_admin());

-- ---- Making someone the admin ----------------------------------------------------
-- After you create your own account in the app, run this line on its own
-- (with your account's name) to make it the admin:
--   update profiles set is_admin = true where name = 'Your Name';
