-- RaastaShare backend, part 3: codes made and checked on the server, and
-- the timed rules. Run in Supabase > SQL Editor, in an empty query tab,
-- AFTER 02-sign-in-and-rules.sql. Safe to run again.
--
-- What it does, in plain words:
--   * When both people accept, the SERVER makes the pickup and delivery
--     codes. Only the sender (and the admin) can read them. The carrier's
--     phone never receives them.
--   * The carrier types a code; the server checks it (enter_code). Three
--     wrong codes freeze the payment for the admin, as before.
--   * Nobody but the server or the admin can mark a parcel picked up or
--     delivered, release the money, change the wrong-code counts, or accept
--     on the other person's behalf.
--   * Every 5 minutes the server tidies up: a request the carrier left
--     before both accepted ends as declined, and a parcel still unmatched
--     after 2 hours is flagged for the admin.

-- ---- Codes: only the sender and the admin can read them -----------------
drop policy if exists "People on the delivery or admin see codes" on delivery_codes;
drop policy if exists "People on the delivery add codes" on delivery_codes;
drop policy if exists "People on the delivery change codes" on delivery_codes;
drop policy if exists "People on the delivery remove codes" on delivery_codes;
drop policy if exists "Sender or admin sees codes" on delivery_codes;
revoke insert, update, delete on delivery_codes from authenticated;

create or replace function public.sends(delivery text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.deliveries d join public.shipments s on s.id = d.shipment_id
    where d.id = delivery and s.sender_id = auth.uid()
  );
$$;

create policy "Sender or admin sees codes" on delivery_codes for select to authenticated
  using (public.sends(delivery_id) or public.is_admin());

-- A random 4-digit code, as text ("1000" to "9999").
create or replace function public.new_code() returns text
language sql volatile set search_path = '' as $$
  select (1000 + floor(random() * 9000))::int::text;
$$;

-- ---- Guarding the delivery steps ----------------------------------------
-- Runs before every change to a delivery. The code check (enter_code) and
-- the timed tidy-up switch the guard off for their own changes.
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
    if new.status is distinct from old.status and new.status in ('In transit', 'Delivered') then
      raise exception 'Pickup and delivery are confirmed by entering the code';
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
drop trigger if exists guard_delivery on deliveries;
create trigger guard_delivery before insert or update on deliveries
  for each row execute function public.guard_delivery();

-- When a delivery becomes "Awaiting pickup" (both accepted), make its codes.
create or replace function public.make_codes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pickup text := public.new_code();
  drop_code text := public.new_code();
begin
  if new.status = 'Awaiting pickup' and not exists (
       select 1 from public.delivery_codes where delivery_id = new.id) then
    while drop_code = pickup loop drop_code := public.new_code(); end loop;
    insert into public.delivery_codes (delivery_id, pickup_otp, delivery_otp)
    values (new.id, pickup, drop_code);
  end if;
  return new;
end;
$$;
drop trigger if exists make_codes on deliveries;
create trigger make_codes after insert or update on deliveries
  for each row execute function public.make_codes();

-- ---- The carrier enters a code -------------------------------------------
-- kind is 'pickup' or 'delivery'. Returns what happened:
--   { "outcome": "ok" | "wrong" | "frozen", "triesLeft": n }
-- or { "error": "..." } when this person may not enter a code now.
create or replace function public.enter_code(delivery text, kind text, code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d public.deliveries;
  carrier uuid;
  right_code text;
  tries int;
  max_tries constant int := 3;
begin
  select * into d from public.deliveries where id = delivery for update;
  if not found then return jsonb_build_object('error', 'This delivery no longer exists.'); end if;
  select carrier_id into carrier from public.journeys where id = d.journey_id;
  if carrier is distinct from auth.uid() then
    return jsonb_build_object('error', 'Only the carrier enters this code.');
  end if;
  if (kind = 'pickup' and d.status <> 'Awaiting pickup')
     or (kind = 'delivery' and d.status <> 'In transit') or kind not in ('pickup', 'delivery') then
    return jsonb_build_object('error', 'This step is already done. Reload the page to see the latest.');
  end if;

  select case when kind = 'pickup' then pickup_otp else delivery_otp end into right_code
  from public.delivery_codes where delivery_id = d.id;

  perform set_config('raastashare.server_change', 'on', true);

  if code = right_code then
    if kind = 'pickup' then
      update public.deliveries set status = 'In transit' where id = d.id;
    else
      update public.deliveries set status = 'Delivered', escrow = 'Released to carrier', delivered_at = now()
      where id = d.id;
      update public.shipments set status = 'Delivered' where id = d.shipment_id;
    end if;
    return jsonb_build_object('outcome', 'ok', 'triesLeft', max_tries);
  end if;

  tries := case when kind = 'pickup' then d.wrong_pickup_attempts else d.wrong_attempts end + 1;
  if kind = 'pickup' then
    update public.deliveries set wrong_pickup_attempts = tries where id = d.id;
  else
    update public.deliveries set wrong_attempts = tries where id = d.id;
  end if;
  if tries >= max_tries then
    update public.deliveries
    set status = 'Disputed', escrow = 'Frozen',
        dispute_reason = max_tries || ' wrong ' || kind || ' codes were entered'
    where id = d.id;
    update public.shipments set status = 'Disputed' where id = d.shipment_id;
    return jsonb_build_object('outcome', 'frozen', 'triesLeft', 0);
  end if;
  return jsonb_build_object('outcome', 'wrong', 'triesLeft', max_tries - tries);
end;
$$;
revoke all on function public.enter_code(text, text, text) from public, anon;
grant execute on function public.enter_code(text, text, text) to authenticated;

-- ---- The timed rules -------------------------------------------------------
-- Times such as "2026-11-28T08:00" are Pakistan time.
create or replace function public.pk_time(value text) returns timestamptz
language sql immutable set search_path = '' as $$
  select (value::timestamp) at time zone 'Asia/Karachi';
$$;

-- Is another open trip still free for this parcel? (Same route, leaves in
-- time, enough space left, not a carrier it already lost.) The app's full
-- check also looks at the vehicle type; the Matches page still does that.
create or replace function public.another_trip_fits(parcel text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.shipments s
    join public.journeys j on j.origin = s.origin and j.destination = s.destination
    where s.id = parcel
      and j.status = 'Open'
      and public.pk_time(j.departure) > now()
      and public.pk_time(j.departure) < public.pk_time(s.deadline)
      and not (j.id = any (s.rejected_journey_ids))
      and j.spare_kg - coalesce((
        select sum(s2.weight_kg) from public.deliveries d2 join public.shipments s2 on s2.id = d2.shipment_id
        where d2.journey_id = j.id
          and d2.status in ('Awaiting pickup', 'In transit', 'Delivered', 'Disputed')), 0) >= s.weight_kg
  );
$$;

create or replace function public.tidy_up() returns void
language plpgsql security definer set search_path = '' as $$
declare
  late record;
begin
  perform set_config('raastashare.server_change', 'on', true);
  -- 1. Requests whose carrier left before both accepted: declined, and that
  --    carrier is not offered again.
  for late in
    select d.id, d.shipment_id, d.journey_id
    from public.deliveries d join public.journeys j on j.id = d.journey_id
    where d.status = 'Awaiting acceptance' and public.pk_time(j.departure) <= now()
  loop
    update public.deliveries set status = 'Declined by carrier', expired = true where id = late.id;
    update public.shipments
    set rejected_journey_ids = array_append(rejected_journey_ids, late.journey_id)
    where id = late.shipment_id and not (late.journey_id = any (rejected_journey_ids));
    update public.shipments
    set status = case when public.another_trip_fits(id) then 'Carriers found' else 'Unmatched – Retrying' end
    where id = late.shipment_id and status in ('Carriers found', 'Unmatched – Retrying');
  end loop;
  -- 2. "Carriers found" whose carriers have all left: back to retrying.
  update public.shipments set status = 'Unmatched – Retrying'
  where status = 'Carriers found' and not public.another_trip_fits(id)
    and not exists (select 1 from public.deliveries d where d.shipment_id = shipments.id
                    and d.status not in ('Declined by carrier'));
  -- 3. Still unmatched after 2 hours: flagged for the admin.
  update public.shipments set status = 'Flagged for admin review'
  where status = 'Unmatched – Retrying' and created_at < now() - interval '2 hours';
end;
$$;
revoke all on function public.tidy_up() from public, anon, authenticated;

-- Run tidy_up every 5 minutes (pg_cron is included with Supabase).
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'raastashare-tidy-up';
  perform cron.schedule('raastashare-tidy-up', '*/5 * * * *', 'select public.tidy_up()');
end;
$$;
