-- ============================================================================
-- PickHub – Enable creator_profiles insert policy
-- Migration: 00005_enable_creator_insert_policy
-- ============================================================================
-- Enables the RLS insert policy on creator_profiles (previously a TODO).
-- ============================================================================

do $$ begin
  drop policy if exists "Authenticated users can create their creator profile" on creator_profiles;
  create policy "Authenticated users can create their creator profile"
    on creator_profiles for insert
    with check (auth.uid() = profile_id);
end; $$;
