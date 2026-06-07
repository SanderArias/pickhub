-- ============================================================================
-- Fix sync_twitch_from_auth provider guard
-- Migration: 00034_fix_twitch_sync_provider_guard
-- ============================================================================
-- The previous RPC wrapped the sync inside an app_metadata provider guard
-- (checking raw_app_meta_data->'providers' ? 'twitch').  This guard failed
-- for users who signed up with email and linked Twitch later: Supabase does
-- not always update raw_app_meta_data when a new identity is linked, so the
-- sync was silently skipped even though auth.identities had the Twitch entry.
--
-- Fix: remove the app_metadata guard.  Sync whenever auth.identities has a
-- Twitch identity for the profile_id.  Fall back to raw_user_meta_data for
-- users whose identity data lives there (e.g. sign-up-time metadata).
-- ============================================================================

create or replace function sync_twitch_from_auth(profile_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  _identity auth.identities;
  _twitch_name text;
  _twitch_id_val text;
  _twitch_avatar_val text;
begin
  -- 1. Read Twitch identity from auth.identities (most reliable source)
  select * into _identity
  from auth.identities
  where user_id = profile_id and provider = 'twitch';

  if found then
    _twitch_name := coalesce(
      _identity.identity_data ->> 'preferred_username',
      _identity.identity_data ->> 'user_name',
      _identity.identity_data ->> 'name',
      _identity.identity_data ->> 'full_name'
    );
    _twitch_id_val := coalesce(
      _identity.identity_data ->> 'provider_id',
      _identity.identity_data ->> 'sub',
      _identity.id::text
    );
    _twitch_avatar_val := coalesce(
      _identity.identity_data ->> 'avatar_url',
      _identity.identity_data ->> 'picture'
    );
  else
    -- 2. Fall back to the raw user row (covers sign-up-time metadata only)
    declare
      _user auth.users;
    begin
      select * into _user from auth.users where id = profile_id;
      if not found then return; end if;

      _twitch_name := coalesce(
        _user.raw_user_meta_data ->> 'preferred_username',
        _user.raw_user_meta_data ->> 'user_name',
        _user.raw_user_meta_data ->> 'name',
        _user.raw_user_meta_data ->> 'full_name'
      );
      _twitch_id_val := coalesce(
        _user.raw_user_meta_data ->> 'provider_id',
        _user.raw_user_meta_data ->> 'sub'
      );
      _twitch_avatar_val := coalesce(
        _user.raw_user_meta_data ->> 'avatar_url',
        _user.raw_user_meta_data ->> 'picture'
      );
    end;
  end if;

  -- 3. Persist to profiles (only if we found usable data)
  if _twitch_name is not null or _twitch_avatar_val is not null then
    update profiles
    set
      display_name      = coalesce(profiles.display_name, _twitch_name),
      twitch_username   = coalesce(_twitch_name, profiles.twitch_username),
      twitch_id         = coalesce(_twitch_id_val, profiles.twitch_id),
      twitch_avatar_url = coalesce(_twitch_avatar_val, profiles.twitch_avatar_url),
      avatar_url        = coalesce(_twitch_avatar_val, profiles.avatar_url)
    where id = profile_id;
  end if;
end;
$$;
