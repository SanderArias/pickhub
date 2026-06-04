-- ============================================================================
-- PickHub – Fix Twitch OAuth profile trigger
-- Migration: 00003_fix_twitch_profile_trigger
-- ============================================================================
-- Replaces handle_new_user() to handle Twitch OAuth metadata keys.
--
-- Twitch sends:
--   raw_user_meta_data->>'preferred_username' (display name)
--   raw_user_meta_data->>'picture'           (avatar)
--   email may be null (Twitch doesn't always share it)
--
-- The original trigger assumed email + full_name + avatar_url, which fails
-- when email is null or metadata keys differ.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'user'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'picture',
      new.raw_user_meta_data ->> 'avatar_url'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
