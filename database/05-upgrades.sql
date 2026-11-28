-- RaastaShare backend, part 5: live updates, chat, ratings, photo proof and
-- cancelling before pickup. Run in Supabase > SQL Editor, in an empty query
-- tab, AFTER 04-name-limit.sql. Safe to run again.
--
-- What it does, in plain words:
--   * Live updates: every open screen hears about new and changed trips,
--     parcels, deliveries, messages and ratings straight away.
--   * Chat: the sender and carrier of a delivery can message each other.
--     Only those two (and the admin) can read the messages.
--   * Ratings: after a delivery, the sender rates the carrier and the
--     carrier rates the sender, 1 to 5 stars, once each. Everyone signed in
--     can see ratings (they show on the Matches page).
--   * Photo proof: the carrier can add a photo at pickup and at drop-off.
--     Photos are private: only the two people on the delivery and the admin
--     can see them. Each photo is at most 2 MB.
--   * Cancel before pickup: once both have accepted but before the parcel is
--     picked up, either person can cancel. The server refunds the held money
--     to the sender and puts the parcel back into matching.
--
-- Until this file is run, the app still works; chat, ratings, photos and
-- cancelling simply say they are not switched on yet.

-- ---- Small helpers -----------------------------------------------------------
-- Is the signed-in person the carrier of this delivery?
create or replace function public.drives(delivery text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.deliveries d join public.journeys j on j.id = d.journey_id
    where d.id = delivery and j.carrier_id = auth.uid()
  );
$$;

-- The signed-in person's name.
create or replace function public.my_name() returns text
language sql stable security definer set search_path = '' as $$
  select name from public.profiles where id = auth.uid();
$$;

-- ---- Chat --------------------------------------------------------------------
create table if not exists messages (
  id text primary key,
  delivery_id text not null references deliveries(id) on delete cascade,
  author_id uuid not null default auth.uid() references profiles(id),
  author_name text not null check (char_length(author_name) <= 60),
  author_role text not null check (author_role in ('sender', 'carrier')),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table messages enable row level security;
revoke all on messages from anon;
grant select, insert on messages to authenticated;

drop policy if exists "People on the delivery or admin read messages" on messages;
create policy "People on the delivery or admin read messages" on messages for select to authenticated
  using (public.takes_part_in(delivery_id) or public.is_admin());
-- You write only as yourself, with your own name and role, on your own delivery.
drop policy if exists "People on the delivery write messages" on messages;
create policy "People on the delivery write messages" on messages for insert to authenticated
  with check (
    author_id = auth.uid() and author_name = public.my_name()
    and ((author_role = 'sender' and public.sends(delivery_id))
         or (author_role = 'carrier' and public.drives(delivery_id)))
  );

-- ---- Ratings -------------------------------------------------------------------
create table if not exists ratings (
  id text primary key,
  delivery_id text not null references deliveries(id) on delete cascade,
  rater_id uuid not null default auth.uid() references profiles(id),
  rater_role text not null check (rater_role in ('sender', 'carrier')),
  rater_name text not null check (char_length(rater_name) <= 60),
  rated_name text not null check (char_length(rated_name) <= 60),
  stars integer not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now(),
  unique (delivery_id, rater_role)
);
alter table ratings enable row level security;
revoke all on ratings from anon;
grant select, insert on ratings to authenticated;

-- May the signed-in person rate this delivery, in this role, naming this person?
-- Only once it is delivered, and only the other person on it.
create or replace function public.may_rate(delivery text, role text, rated text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.deliveries d
    join public.shipments s on s.id = d.shipment_id
    join public.journeys j on j.id = d.journey_id
    where d.id = delivery and d.status = 'Delivered'
      and ((role = 'sender' and s.sender_id = auth.uid() and rated = j.carrier_name)
           or (role = 'carrier' and j.carrier_id = auth.uid() and rated = s.sender_name))
  );
$$;

drop policy if exists "Signed-in people see ratings" on ratings;
create policy "Signed-in people see ratings" on ratings for select to authenticated
  using (true);
drop policy if exists "People on a delivered delivery rate each other" on ratings;
create policy "People on a delivered delivery rate each other" on ratings for insert to authenticated
  with check (
    rater_id = auth.uid() and rater_name = public.my_name()
    and public.may_rate(delivery_id, rater_role, rated_name)
  );

-- ---- Photo proof -----------------------------------------------------------------
-- A private storage bucket. Files are named "<delivery id>/<pickup|dropoff>-<time>.jpg".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parcel-photos', 'parcel-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "People on the delivery or admin see its photos" on storage.objects;
create policy "People on the delivery or admin see its photos" on storage.objects for select to authenticated
  using (bucket_id = 'parcel-photos'
         and (public.takes_part_in((storage.foldername(name))[1]) or public.is_admin()));
drop policy if exists "The carrier adds photos" on storage.objects;
create policy "The carrier adds photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'parcel-photos' and public.drives((storage.foldername(name))[1]));

-- ---- Guarding the delivery steps (03-codes-and-timers.sql, plus one line) -----
-- New: only the server (cancel_delivery below) or the admin marks a delivery
-- "Cancelled", because cancelling also refunds the money.
create or replace function public.guard_delivery() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  is_sender boolean;
  is_carrier boolean;
begin
  if coalesce(current_setting('raastashare.server_change', true), '') = 'on' or public.is_admin()
     or auth.uid() is null then
    return new;
  end if;
  select s.sender_id = auth.uid(), j.carrier_id = auth.uid() into is_sender, is_carrier
  from public.shipments s, public.journeys j
  where s.id = new.shipment_id and j.id = new.journey_id;

  if tg_op = 'UPDATE' then
    if new.sender_accepted is distinct from old.sender_accepted and not coalesce(is_sender, false) then
      raise exception 'Only the sender can accept for the sender';
    end if;
    if new.carrier_accepted is distinct from old.carrier_accepted and not coalesce(is_carrier, false) then
      raise exception 'Only the carrier can accept for the carrier';
    end if;
    if new.wrong_attempts is distinct from old.wrong_attempts
       or new.wrong_pickup_attempts is distinct from old.wrong_pickup_attempts then
      raise exception 'Wrong-code counts are kept by the server';
    end if;
    if new.status is distinct from old.status and new.status in ('In transit', 'Delivered', 'Cancelled') then
      raise exception 'Pickup, delivery and cancelling are done by the server';
    end if;
    if new.escrow is distinct from old.escrow and new.escrow in ('Released to carrier', 'Refunded to sender') then
      raise exception 'Only the admin or a correct delivery code moves the money';
    end if;
    if new.status = 'Awaiting pickup' and old.status is distinct from 'Awaiting pickup'
       and not (new.sender_accepted and new.carrier_accepted) then
      raise exception 'Both people must accept first';
    end if;
  else
    if new.status <> 'Awaiting acceptance' or new.escrow <> 'Not paid yet' then
      raise exception 'A new request starts as awaiting acceptance';
    end if;
  end if;
  return new;
end;
$$;

-- ---- Cancel before pickup ------------------------------------------------------
-- Either person on the delivery, while it is "Awaiting pickup". Returns
-- { "outcome": "ok" } or { "error": "..." }.
create or replace function public.cancel_delivery(delivery text, reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d public.deliveries;
  who text;
begin
  select * into d from public.deliveries where id = delivery for update;
  if not found then return jsonb_build_object('error', 'This delivery no longer exists.'); end if;
  if public.sends(d.id) then who := 'sender';
  elsif public.drives(d.id) then who := 'carrier';
  else return jsonb_build_object('error', 'Only the sender or the carrier can cancel this delivery.');
  end if;
  if d.status <> 'Awaiting pickup' then
    return jsonb_build_object('error', 'It can only be cancelled before pickup. Reload the page to see the latest.');
  end if;

  perform set_config('raastashare.server_change', 'on', true);
  update public.deliveries
  set status = 'Cancelled', escrow = 'Refunded to sender',
      extra = extra || jsonb_build_object('cancelledBy', who, 'cancelReason', left(coalesce(reason, ''), 200))
  where id = d.id;
  -- The parcel goes back to matching, without this carrier.
  update public.shipments
  set rejected_journey_ids = array_append(rejected_journey_ids, d.journey_id)
  where id = d.shipment_id and not (d.journey_id = any (rejected_journey_ids));
  update public.shipments
  set status = case when public.another_trip_fits(id) then 'Carriers found' else 'Unmatched – Retrying' end
  where id = d.shipment_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
revoke all on function public.cancel_delivery(text, text) from public, anon;
grant execute on function public.cancel_delivery(text, text) to authenticated;

-- ---- Live updates ------------------------------------------------------------------
-- Add the tables to Supabase's live-updates list (once). Each person still
-- only hears about rows the rules above let them see.
do $$
declare
  t text;
begin
  foreach t in array array['journeys', 'shipments', 'deliveries', 'messages', 'ratings'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
