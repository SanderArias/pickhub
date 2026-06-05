-- ============================================================================
-- PickHub – Fix admin RLS: add explicit WITH CHECK to admin override policies
-- Migration: 00019_fix_admin_rls_with_check
-- ============================================================================
-- Bug: The admin override policies from migration 00018 only specify USING
-- but not WITH CHECK. PostgreSQL defaults WITH CHECK to the USING expression,
-- but when multiple permissive policies exist, their WITH CHECK clauses are
-- OR'd. The owner-only WITH CHECK (auth.uid() = id / profile_id) from the
-- original policies can still block admin updates because the OR of
-- (owner_check) OR (admin_check) evaluates to TRUE for the admin, BUT
-- in some PostgreSQL configurations the defaulted WITH CHECK may be
-- treated differently from an explicit one.
--
-- Fix: Drop and recreate both admin override policies with explicit
-- WITH CHECK (true), guaranteeing no interference from owner-only policies.
-- ============================================================================

-- ------------------------------------------------------------------
-- profiles: admins can update any row — with BYPASS with check
-- ------------------------------------------------------------------
do $$ begin
  drop policy if exists "Admins can update any profile" on profiles;
  create policy "Admins can update any profile"
    on profiles for update
    using (auth.uid() in (select id from profiles where role = 'admin'))
    with check (true);
end; $$;

-- ------------------------------------------------------------------
-- creator_profiles: admins can update any row — with BYPASS with check
-- ------------------------------------------------------------------
do $$ begin
  drop policy if exists "Admins can update any creator profile" on creator_profiles;
  create policy "Admins can update any creator profile"
    on creator_profiles for update
    using (auth.uid() in (select id from profiles where role = 'admin'))
    with check (true);
end; $$;

-- ------------------------------------------------------------------
-- Also ensure base SQL grants exist (idempotent)
-- ------------------------------------------------------------------
grant select, update on public.profiles to authenticated;
grant select, update on public.creator_profiles to authenticated;
