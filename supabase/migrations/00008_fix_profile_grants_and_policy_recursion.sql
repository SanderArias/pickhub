-- ============================================================================
-- PickHub – Fix profile grants and remove recursive policy
-- Migration: 00008_fix_profile_grants_and_policy_recursion
-- ============================================================================
-- RLS controls which rows each user can read/modify.
-- GRANT is required for the base SQL privilege so that RLS policies can work.
-- Without GRANT, the role cannot even access the table, resulting in 42501.
-- ============================================================================

-- ------------------------------------------------------------------
-- Remove self-referential policy (if it was created during debugging)
-- ------------------------------------------------------------------
drop policy if exists "Admins can read all profiles" on public.profiles;

-- ------------------------------------------------------------------
-- Base SQL grants for profiles
-- ------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

-- ------------------------------------------------------------------
-- Base SQL grants for creator_profiles
-- ------------------------------------------------------------------
grant select, insert, update on public.creator_profiles to authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
comment on schema public is
  E'PickHub public schema. RLS controls row-level access; GRANT enables the base SQL privilege. '
  'Self-referential policies on profiles cause infinite recursion and must be avoided.';
