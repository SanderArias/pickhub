-- migration/00044_fix_event_prizes_rls_public_role.sql
--
-- Root cause:
--   The INSERT / UPDATE / DELETE policies on event_prizes were restricted
--   to authenticated (to authenticated). When the JWT token is expired or
--   the session is lost during the request, PostgREST treats the user as
--   anon. The SELECT policy applies to public (all roles), so reads work.
--   But the INSERT policy (to authenticated) doesn't apply to anon, causing
--   42501 even though the check is true.
--
-- Fix:
--   Remove the to authenticated restriction from INSERT/UPDATE/DELETE
--   policies. The trigger (check_event_prize_owner) already validates
--   ownership using auth.uid(). For anon users, auth.uid() is NULL, so
--   the trigger correctly rejects non-creators. For authenticated users,
--   auth.uid() works normally.

-- ══════════════════════════════════════════════════════════════════════
-- Step 1: Drop existing INSERT/UPDATE/DELETE policies
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists "Authenticated users can insert prizes (trigger validates)" on event_prizes;
drop policy if exists "Authenticated users can update prizes (trigger validates)" on event_prizes;
drop policy if exists "Authenticated users can delete prizes (trigger validates)" on event_prizes;

-- ══════════════════════════════════════════════════════════════════════
-- Step 2: Recreate policies without role restriction (public)
-- ══════════════════════════════════════════════════════════════════════

create policy "Anyone can insert prizes (trigger validates)"
  on event_prizes for insert
  with check (true);

create policy "Anyone can update prizes (trigger validates)"
  on event_prizes for update
  using (true)
  with check (true);

create policy "Anyone can delete prizes (trigger validates)"
  on event_prizes for delete
  using (true);

-- ══════════════════════════════════════════════════════════════════════
-- Step 3: Reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════════════════

notify pgrst, 'reload schema';
