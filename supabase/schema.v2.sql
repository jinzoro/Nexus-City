-- ============================================================================
-- NEXUS social layer v2 — additive migration (run once)
-- Adds profile fields for bio, status, visibility, DM policy, last_seen.
-- Adds account deletion RPC. No data loss.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles: extend with soft privacy + social fields
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists status_text text not null default '',
  add column if not exists visibility text not null default 'online',
  add column if not exists dm_policy text not null default 'all',
  add column if not exists last_seen timestamptz not null default now();

-- Enforce enums via check constraints (safe because defaults already exist)
alter table public.profiles
  drop constraint if exists profiles_visibility_check;
alter table public.profiles
  add constraint profiles_visibility_check
  check (visibility in ('online','ghost'));

alter table public.profiles
  drop constraint if exists profiles_dm_policy_check;
alter table public.profiles
  add constraint profiles_dm_policy_check
  check (dm_policy in ('all','floor','none'));

-- Helpful indexes (cheap, optional)
create index if not exists profiles_handle_lower_idx
  on public.profiles (lower(handle));

-- ---------------------------------------------------------------------------
-- Account self-serve delete support (RPC)
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_user()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'NOT AUTHENTICATED';
  end if;

  -- Delete the social rows; auth user will be removed by a background job
  -- or by a manual call to auth.admin.deleteUser() if you prefer.
  delete from public.profiles where id = uid;
  delete from public.building_messages where user_id = uid;
  delete from public.direct_messages where sender_id = uid or recipient_id = uid;

  -- Best-effort: try to delete the auth user via the service role path.
  -- If Auth could not be reached, the caller will see a silent no-op.
  perform auth.admin.delete_user(uid);
end;
$$;

-- Minimal privileges
grant execute on function public.delete_my_user() to authenticated;
