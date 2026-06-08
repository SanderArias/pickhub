-- migration/00041_fix_event_prizes_rls_insert.sql
--
-- Root cause:
--   The INSERT / UPDATE / DELETE policies on event_prizes (from migration
--   00002) used inline subqueries against events that were blocked by RLS
--   on the events table itself. Migration 00039 replaced them with a
--   SECURITY DEFINER helper (is_event_creator), but if that migration was
--   not applied, the old broken policies remain active, causing 42501.
--
--   This migration idempotently:
--     1. Drops ALL existing policies on event_prizes.
--     2. Recreates is_event_creator() with explicit schema qualification
--        and robust auth chain checking.
--     3. Creates permissive INSERT / UPDATE / DELETE policies using the
--        SECURITY DEFINER helper.
--     4. Recreates the SELECT policy from 00037 for completeness.
--
-- Identity chain (verified by audit):
--   auth.uid()                              ← auth.users.id from JWT
--   profiles.id      = auth.users.id         ← FK: profiles(id) → auth.users(id)
--   creator_profiles.profile_id = profiles.id ← FK: creator_profiles(profile_id) → profiles(id)
--   creator_profiles.id                     ← PK, stored in events.creator_id
--   events.creator_id = creator_profiles.id  ← FK: events(creator_id) → creator_profiles(id)
--   event_prizes.event_id = events.id        ← FK: event_prizes(event_id) → events(id)
--
-- The SECURITY DEFINER function bypasses RLS on events so the ownership
-- subquery is never blocked by the events SELECT policy.

-- ══════════════════════════════════════════════════════════════════════
-- Step 1: Drop ALL existing policies on event_prizes (idempotent)
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists "Event prizes are visible to event participants and creator" on event_prizes;
drop policy if exists "Anyone can view prizes for visible events" on event_prizes;
drop policy if exists "Creators can insert prizes for their events" on event_prizes;
drop policy if exists "Creators can update prizes for their events" on event_prizes;
drop policy if exists "Creators can delete prizes for their events" on event_prizes;

-- ══════════════════════════════════════════════════════════════════════
-- Step 2: Recreate is_event_creator helper (SECURITY DEFINER)
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.is_event_creator(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.events e
    join public.creator_profiles cp on cp.id = e.creator_id
    where e.id = p_event_id
      and cp.profile_id = auth.uid()
  );
$$;

grant execute on function public.is_event_creator(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Step 3: SELECT policy — anyone can view prizes for visible events
-- ══════════════════════════════════════════════════════════════════════

create policy "Anyone can view prizes for visible events"
  on event_prizes for select
  using (
    exists (
      select 1 from public.events
      where events.id = event_prizes.event_id
        and events.status in ('open', 'predictions_closed', 'completed', 'archived')
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- Step 4: INSERT policy — only the event creator can insert prizes
-- ══════════════════════════════════════════════════════════════════════

create policy "Creators can insert prizes for their events"
  on event_prizes for insert
  to authenticated
  with check (public.is_event_creator(event_id));

-- ══════════════════════════════════════════════════════════════════════
-- Step 5: UPDATE policy — only the event creator can update prizes
-- ══════════════════════════════════════════════════════════════════════

create policy "Creators can update prizes for their events"
  on event_prizes for update
  to authenticated
  using (public.is_event_creator(event_id))
  with check (public.is_event_creator(event_id));

-- ══════════════════════════════════════════════════════════════════════
-- Step 6: DELETE policy — only the event creator can delete prizes
-- ══════════════════════════════════════════════════════════════════════

create policy "Creators can delete prizes for their events"
  on event_prizes for delete
  to authenticated
  using (public.is_event_creator(event_id));

-- ══════════════════════════════════════════════════════════════════════
-- Step 7: Reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════════════════

notify pgrst, 'reload schema';
