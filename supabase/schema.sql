-- menunico schema — Phase 1
-- Apply by pasting into the Supabase SQL Editor and running.
--
-- ⚠️  DESTRUCTIVE: drops existing menunico tables (favorites, menus,
-- restaurants) and recreates them. Safe on a fresh project; wipes all
-- data on a dirty one. There is nothing to migrate yet (pre-launch).

create extension if not exists pgcrypto;

-- ============================================================
-- Drop in dependency order
-- ============================================================
drop table if exists public.favorites   cascade;
drop table if exists public.menus       cascade;
drop table if exists public.restaurants cascade;

-- ============================================================
-- Tables
-- ============================================================

-- restaurants: real metadata from the provided Barcelona spreadsheet,
-- scoped to Ciutat Vella's 4 neighborhoods. Coordinates are geocoded
-- from `address` during seeding via Nominatim.
create table public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  neighborhood  text not null                   -- district name, not sub-neighbourhood
    check (neighborhood in (
      'Ciutat Vella',
      'Eixample',
      'Gràcia',
      'Horta-Guinardó',
      'Les Corts',
      'Nou Barris',
      'Sant Andreu',
      'Sant Martí',
      'Sants-Montjuïc',
      'Sarrià-Sant Gervasi'
    )),
  address       text not null,
  telephone     text not null,
  website       text,                            -- nullable
  latitude      numeric(9,6) not null,           -- WGS84; seed must handle geocoding failures
  longitude     numeric(9,6) not null,
  created_at    timestamptz not null default now()
);

-- menus: LLM-generated daily "menú del día" content (fiction).
-- One menu per (restaurant, date) — enforced by the unique constraint.
-- Typical price: €10–€15.
create table public.menus (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  date            date not null,
  primeros        jsonb not null,                -- array of strings
  segundos        jsonb not null,                -- array of strings
  postres         jsonb not null,                -- array of strings
  drink_included  boolean not null default true,
  bread_included  boolean not null default true,
  price_eur       numeric(4,2) not null,
  created_at      timestamptz not null default now(),
  unique (restaurant_id, date)
);

-- favorites: per-user restaurant favorites.
create table public.favorites (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

-- ============================================================
-- Indexes
-- ============================================================

create index restaurants_neighborhood_idx on public.restaurants (neighborhood);
create index menus_date_idx                on public.menus (date);
create index menus_restaurant_id_idx       on public.menus (restaurant_id);
create index favorites_user_id_idx         on public.favorites (user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.restaurants enable row level security;
alter table public.menus       enable row level security;
alter table public.favorites   enable row level security;

-- restaurants: public read, no client writes
create policy "restaurants_select_all" on public.restaurants
  for select to anon, authenticated using (true);

-- menus: public read, no client writes
create policy "menus_select_all" on public.menus
  for select to anon, authenticated using (true);

-- favorites: each authenticated user manages only their own rows
create policy "favorites_select_own" on public.favorites
  for select to authenticated using (auth.uid() = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);
