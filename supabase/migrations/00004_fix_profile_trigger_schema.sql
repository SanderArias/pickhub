-- ============================================================================
-- PickHub – Fix profile trigger: schema-qualified references
-- Migration: 00004_fix_profile_trigger_schema
-- ============================================================================
-- The previous migration (00003) replaced handle_new_user() but the trigger
-- failed because:
--   1. search_path = '' hides the public schema — 'profiles' was not found.
--   2. display_name could be an empty string (coalesce fallback to '').
--
-- Fixes:
--   - Schema-qualified function: public.handle_new_user()
--   - search_path = public, auth (finds both public tables and auth.users)
--   - insert into public.profiles (explicit schema)
--   - nullif(..., '') to convert empty display_name to null
--   - on conflict (id) do update set to refresh metadata on re-auth
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(coalesce(
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'user'
    ), ''),
    coalesce(
      new.raw_user_meta_data ->> 'picture',
      new.raw_user_meta_data ->> 'avatar_url'
    )
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

-- ============================================================================
-- Diagnostic: verify the function was created correctly
-- ============================================================================
-- Run this in Supabase SQL Editor to confirm the function exists:
--
--   select
--     proname as function_name,
--     prosrc as body
--   from pg_proc
--   where proname = 'handle_new_user'
--     and pronamespace = 'public'::regnamespace;
--
-- To test the trigger logic manually (dry-run without actual insert):
--
--   do $$
--   declare
--     fake_record auth.users%rowtype;
--   begin
--     fake_record.id := '00000000-0000-0000-0000-000000000000';
--     fake_record.email := null;
--     fake_record.raw_user_meta_data := jsonb_build_object(
--       'preferred_username', 'test_twitch_user',
--       'picture', 'https://example.com/avatar.png'
--     );
--     perform public.handle_new_user();
--   end;
--   $$;
