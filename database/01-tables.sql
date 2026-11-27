-- RaastaShare backend, part 1: the tables.
-- Already run in Supabase (SQL Editor) on 27 Nov 2026. Kept here as a record.
-- It only creates empty, locked tables.

-- Who each signed-in person is, and their role.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  role text not null check (role in ('sender', 'carrier', 'admin')),
  created_at timestamptz not null default now()
);

-- Carrier trips (today: state.journeys).
create table journeys (
  id text primary key,
  carrier_id uuid references profiles(id),
  carrier_name text not null,
  origin text not null,
  destination text not null,
  departure text not null,          -- same "2026-11-19T08:00" form the app uses now
  vehicle_type text not null,
  spare_kg numeric not null check (spare_kg > 0),
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

-- Parcels (today: state.shipments).
create table shipments (
  id text primary key,
  sender_id uuid references profiles(id),
  sender_name text not null,
  origin text not null,
  destination text not null,
  weight_kg numeric not null check (weight_kg > 0),
  item_type text not null,
  deadline text not null,           -- same form as departure
  status text not null,
  matching_ms integer,
  rejected_journey_ids text[] not null default '{}',
  ai_check jsonb,                   -- the AI parcel check result, if any
  ai_flag text,                     -- 'pending' when the AI said "possibly prohibited"
  created_at timestamptz not null default now()
);

-- A parcel matched to a trip (today: state.deliveries), WITHOUT the codes.
create table deliveries (
  id text primary key,
  shipment_id text not null references shipments(id),
  journey_id text not null references journeys(id),
  price numeric not null,
  sender_accepted boolean not null default false,
  carrier_accepted boolean not null default false,
  wrong_attempts integer not null default 0,
  wrong_pickup_attempts integer not null default 0,
  status text not null,
  escrow text not null,
  dispute_reason text,
  expired boolean not null default false,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

-- Pickup and delivery codes, kept apart so a carrier can never read them.
create table delivery_codes (
  delivery_id text primary key references deliveries(id) on delete cascade,
  pickup_otp text,
  delivery_otp text
);

-- Lock every table. With no rules added yet, the website can read nothing.
-- Step 3 adds the rules that open up exactly what each role may see.
alter table profiles enable row level security;
alter table journeys enable row level security;
alter table shipments enable row level security;
alter table deliveries enable row level security;
alter table delivery_codes enable row level security;
