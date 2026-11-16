-- ============================================================================
-- NEXUS social layer v3 — security hardening (additive, run once AFTER v2)
--
-- Fixes found in the schema audit:
--   1. delete_my_user() had no pinned search_path and called the non-existent
--      auth.admin.delete_user() SQL function, so the auth user survived.
--   2. profiles was world-readable, exposing last_seen / dm_policy / bio for
--      every citizen. The client only ever reads its own row, so reads are now
--      self-only.
--   3. profile UPDATE had no WITH CHECK, so a row's id could be rewritten.
--   4. building_messages / direct_messages trusted client-supplied handle,
--      body and visor columns, allowing impersonation. They are now derived
--      from the author's profile on insert.
--   5. No server-side chat rate limit.
--
-- No data loss, no column changes, safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Account self-delete: pinned search_path + actually remove the auth user
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'NOT AUTHENTICATED';
  end if;

  -- Social rows first, then the auth user (its cascade covers anything left).
  delete from public.building_messages where user_id = uid;
  delete from public.direct_messages where sender_id = uid or recipient_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_user() from public, anon;
grant execute on function public.delete_my_user() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. profiles: reads are self-only (handles for other citizens come over
--    presence and chat, never from a public table scan)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles are public" on public.profiles;
drop policy if exists "citizens read their own profile" on public.profiles;
create policy "citizens read their own profile"
  on public.profiles for select using (auth.uid() = id);

-- UPDATE needs a WITH CHECK or a citizen could rewrite the row id.
drop policy if exists "citizens edit their profile" on public.profiles;
create policy "citizens edit their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Let a citizen remove their own row (the RPC is still the real delete path).
drop policy if exists "citizens delete their profile" on public.profiles;
create policy "citizens delete their profile"
  on public.profiles for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 3. Chat identity is derived server-side, never taken from the client
-- ---------------------------------------------------------------------------
create or replace function public.derive_floor_author()
returns trigger
language plpgsql
as $$
declare
  p record;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'NOT YOUR SIGNAL';
  end if;

  select handle, body, visor into p from public.profiles where id = new.user_id;
  if not found then
    raise exception 'NO CITIZEN PROFILE';
  end if;

  new.handle := p.handle;
  new.body := p.body;
  new.visor := p.visor;
  return new;
end;
$$;

drop trigger if exists a_derive_floor_author on public.building_messages;
create trigger a_derive_floor_author
  before insert on public.building_messages
  for each row execute function public.derive_floor_author();

create or replace function public.derive_dm_author()
returns trigger
language plpgsql
as $$
declare
  p record;
begin
  if auth.uid() is null or new.sender_id <> auth.uid() then
    raise exception 'NOT YOUR SIGNAL';
  end if;

  select handle, body into p from public.profiles where id = new.sender_id;
  if not found then
    raise exception 'NO CITIZEN PROFILE';
  end if;

  new.sender_handle := p.handle;
  new.sender_body := p.body;
  return new;
end;
$$;

drop trigger if exists a_derive_dm_author on public.direct_messages;
create trigger a_derive_dm_author
  before insert on public.direct_messages
  for each row execute function public.derive_dm_author();

-- ---------------------------------------------------------------------------
-- 4. Server-side chat throttles (floor: 12 / 10 s, DMs: 20 / 10 s per sender)
-- ---------------------------------------------------------------------------
create or replace function public.throttle_floor_chat()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.building_messages
    where user_id = new.user_id and created_at > now() - interval '10 seconds'
  ) >= 12 then
    raise exception 'SIGNAL THROTTLED // SLOW DOWN';
  end if;
  return new;
end;
$$;

drop trigger if exists b_throttle_floor_chat on public.building_messages;
create trigger b_throttle_floor_chat
  before insert on public.building_messages
  for each row execute function public.throttle_floor_chat();

create or replace function public.throttle_direct_chat()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.direct_messages
    where sender_id = new.sender_id and created_at > now() - interval '10 seconds'
  ) >= 20 then
    raise exception 'SIGNAL THROTTLED // SLOW DOWN';
  end if;
  return new;
end;
$$;

drop trigger if exists b_throttle_direct_chat on public.direct_messages;
create trigger b_throttle_direct_chat
  before insert on public.direct_messages
  for each row execute function public.throttle_direct_chat();

-- ---------------------------------------------------------------------------
-- Realtime needs no changes: the app uses broadcast + presence channels and
-- only touches these tables for history / persistence.
-- ---------------------------------------------------------------------------
