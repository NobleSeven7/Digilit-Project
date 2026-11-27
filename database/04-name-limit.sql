-- RaastaShare backend, part 4: a maximum length for names.
-- Run in Supabase > SQL Editor, in an empty query tab, AFTER
-- 03-codes-and-timers.sql. Safe to run again.
--
-- What it does, in plain words:
--   * A name can be at most 60 characters, the same limit as the sign-up
--     form (src/components/SignIn.jsx). Before this, the form needed 2 or
--     more characters but had no maximum, so a very long name could be
--     saved and would crowd the Matches and Delivery pages.
--   * The limit applies to the account name and to the copies of it kept
--     on journeys and parcels.

alter table profiles drop constraint if exists profiles_name_length;
alter table profiles add constraint profiles_name_length
  check (char_length(name) between 1 and 60);

alter table journeys drop constraint if exists journeys_carrier_name_length;
alter table journeys add constraint journeys_carrier_name_length
  check (char_length(carrier_name) <= 60);

alter table shipments drop constraint if exists shipments_sender_name_length;
alter table shipments add constraint shipments_sender_name_length
  check (char_length(sender_name) <= 60);
