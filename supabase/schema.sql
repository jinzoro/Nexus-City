-- ============================================================================
-- NEXUS social layer — run once in the Supabase SQL editor (Database > SQL).
-- Creates: profiles, per-building chat messages, direct messages (+ RLS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: public identity for each authenticated citizen
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  handle     text not null unique check (char_length(handle) between 3 and 16),
  body       text not null default '#22e6ff',
  visor      text not null default '#ff3dd8',
  built      smallint not null default 0 check (built between 0 and 2),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select using (true);

drop policy if exists "citizens create their profile" on public.profiles;
create policy "citizens create their profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "citizens edit their profile" on public.profiles;
create policy "citizens edit their profile"
  on public.profiles for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- building_messages: one public channel per building ("meet on any floor")
-- ---------------------------------------------------------------------------
create table if not exists public.building_messages (
  id          bigserial primary key,
  building_id text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  handle      text not null,
  body        text not null default '#22e6ff',
  visor       text not null default '#ff3dd8',
  content     text not null check (char_length(content) between 1 and 240),
  created_at  timestamptz not null default now()
);

create index if not exists building_messages_by_building
  on public.building_messages (building_id, created_at desc);

alter table public.building_messages enable row level security;

drop policy if exists "building chatter is public" on public.building_messages;
create policy "building chatter is public"
  on public.building_messages for select using (true);

drop policy if exists "citizens post as themselves" on public.building_messages;
create policy "citizens post as themselves"
  on public.building_messages for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- direct_messages: operator-to-operator signal thread
-- ---------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id            bigserial primary key,
  sender_id     uuid not null references auth.users (id) on delete cascade,
  recipient_id  uuid not null references auth.users (id) on delete cascade,
  sender_handle text not null,
  sender_body   text not null default '#22e6ff',
  content       text not null check (char_length(content) between 1 and 240),
  created_at    timestamptz not null default now()
);

create index if not exists direct_messages_by_pair
  on public.direct_messages (sender_id, recipient_id, created_at);

alter table public.direct_messages enable row level security;

drop policy if exists "participants read their thread" on public.direct_messages;
create policy "participants read their thread"
  on public.direct_messages for select
  using (auth.uid() in (sender_id, recipient_id));

drop policy if exists "citizens send as themselves" on public.direct_messages;
create policy "citizens send as themselves"
  on public.direct_messages for insert with check (auth.uid() = sender_id);

-- ---------------------------------------------------------------------------
-- Realtime: the app uses broadcast + presence channels (no table replication
-- needed), so no extra configuration is required on Authentication >
-- Realtime. Tables above are only used for persistence/history.
-- ---------------------------------------------------------------------------
