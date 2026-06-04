-- ============================================================================
-- PickHub – SECURITY DEFINER helpers for creator_profiles
-- Migration: 00006_security_definer_creator_functions.sql
-- ============================================================================
-- Bypasses RLS for authenticated users inserting their own creator profile.
-- The RLS policy (00005) would be preferred, but auth.uid() is unreliable
-- in server-action contexts. These functions use SECURITY DEFINER so the
-- insert runs as the table owner, while still requiring authentication.
-- ============================================================================

create or replace function public.create_creator_profile(
  p_profile_id uuid,
  p_handle    text,
  p_bio       text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.creator_profiles (profile_id, handle, bio)
  values (p_profile_id, p_handle, nullif(p_bio, ''));
end;
$$;

create or replace function public.get_creator_profile(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  select row_to_json(cp.*)::jsonb
  into v_result
  from public.creator_profiles cp
  where cp.profile_id = p_profile_id;

  return v_result;
end;
$$;
