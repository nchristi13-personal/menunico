-- menunico schema
-- Apply by pasting into the Supabase SQL Editor and running.
-- Idempotent: safe to re-run.

create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text not null,                -- Madrid | Barcelona | Valencia | Seville | Bilbao
  neighborhood  text,
  address       text,
  cuisine_type  text,                         -- Castellana | Catalana | Mediterránea | Vasca | Valenciana | Andaluza
  price_eur     numeric(4,2),
  created_at    timestamptz default now()
);

create table if not exists public.menus (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  date            date not null,
  primeros        jsonb not null,             -- array of strings
  segundos        jsonb not null,             -- array of strings
  postres         jsonb not null,             -- array of strings
  drink_included  boolean default true,
  bread_included  boolean default true,
  created_at      timestamptz default now(),
  unique (restaurant_id, date)
);

create table if not exists public.favorites (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  created_at     timestamptz default now(),
  unique (user_id, restaurant_id)
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists menus_date_idx          on public.menus (date);
create index if not exists menus_restaurant_id_idx on public.menus (restaurant_id);
create index if not exists favorites_user_id_idx   on public.favorites (user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.restaurants enable row level security;
alter table public.menus       enable row level security;
alter table public.favorites   enable row level security;

-- restaurants: public read, no client writes
drop policy if exists "restaurants_select_all" on public.restaurants;
create policy "restaurants_select_all"
  on public.restaurants
  for select
  to anon, authenticated
  using (true);

-- menus: public read, no client writes
drop policy if exists "menus_select_all" on public.menus;
create policy "menus_select_all"
  on public.menus
  for select
  to anon, authenticated
  using (true);

-- favorites: each authenticated user manages only their own rows
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);
