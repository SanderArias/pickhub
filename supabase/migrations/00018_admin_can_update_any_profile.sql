-- ============================================================================
-- PickHub – RLS: allow admins to update any profile / creator_profile
-- Migration: 00018_admin_can_update_any_profile
-- ============================================================================
-- Bug fix: The existing UPDATE policies on profiles and creator_profiles
-- only allow the row owner to make changes. Admin actions like approve,
-- reject, suspend, and reactivate were silently blocked by RLS (0 rows
-- updated, no error thrown).
--
-- These new policies add an admin exception via a subquery on profiles,
-- which works because the SELECT policy allows all authenticated users
-- to read profiles (avoiding infinite recursion).
-- ============================================================================

-- ------------------------------------------------------------------
-- profiles: admins can update any row
-- ------------------------------------------------------------------
do $$ begin
  drop policy if exists "Admins can update any profile" on profiles;
  create policy "Admins can update any profile"
    on profiles for update
    using (auth.uid() in (select id from profiles where role = 'admin'));
end; $$;

-- ------------------------------------------------------------------
-- creator_profiles: admins can update any row
-- ------------------------------------------------------------------
do $$ begin
  drop policy if exists "Admins can update any creator profile" on creator_profiles;
  create policy "Admins can update any creator profile"
    on creator_profiles for update
    using (auth.uid() in (select id from profiles where role = 'admin'));
end; $$;
