-- Migration 00033: Creator Twitch subscriber verification
-- Adds encrypted token storage for Twitch OAuth with channel:read:subscriptions scope
-- and subscriber verification tracking on event_participants

-- =====================
-- 1. Creator Twitch connections (separate from user twitch_connections)
-- =====================
create table if not exists creator_twitch_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade unique,
  twitch_user_id text not null,
  twitch_username text,
  twitch_avatar_url text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scopes text[] default '{}',
  subscriber_verification_enabled boolean default false,
  authorized_at timestamptz default now(),
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for lookups by profile
create index if not exists idx_creator_twitch_connections_profile_id
  on creator_twitch_connections(profile_id);

-- RLS
alter table creator_twitch_connections enable row level security;

-- Only the owning profile can see their own connection
create policy "Users can view own creator Twitch connection"
  on creator_twitch_connections for select
  using (auth.uid() = profile_id);

-- Only the owning profile can insert
create policy "Users can insert own creator Twitch connection"
  on creator_twitch_connections for insert
  with check (auth.uid() = profile_id);

-- Only the owning profile can update
create policy "Users can update own creator Twitch connection"
  on creator_twitch_connections for update
  using (auth.uid() = profile_id);

-- No delete policy needed (only disable via revoke)

-- Updated_at trigger
create or replace function update_creator_twitch_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_creator_twitch_connections_updated_at
  on creator_twitch_connections;
create trigger trg_creator_twitch_connections_updated_at
  before update on creator_twitch_connections
  for each row execute function update_creator_twitch_connections_updated_at();

-- =====================
-- 2. Add subscriber verification fields to event_participants
-- =====================
-- Note: is_subscriber (boolean) and subscriber_verified_at (timestamptz)
-- already exist from migration 00002. We add the missing fields.

alter table event_participants
  add column if not exists subscription_tier text,
  add column if not exists subscription_source text default 'twitch',
  add column if not exists subscriber_verification_status text
    check (subscriber_verification_status in ('pending', 'verified_sub', 'verified_non_sub', 'unavailable', 'failed'));

-- =====================
-- 3. Function to check if creator has active sub verification
-- =====================
create or replace function has_active_sub_verification(p_profile_id uuid)
returns boolean as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from creator_twitch_connections
  where profile_id = p_profile_id
    and subscriber_verification_enabled = true
    and revoked_at is null;
  return v_count > 0;
end;
$$ language plpgsql security definer;

-- Grant usage
grant select on table creator_twitch_connections to authenticated;
grant insert on table creator_twitch_connections to authenticated;
grant update on table creator_twitch_connections to authenticated;

grant execute on function has_active_sub_verification to authenticated;
