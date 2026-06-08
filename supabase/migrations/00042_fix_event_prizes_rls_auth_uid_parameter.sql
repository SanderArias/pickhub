-- migration/00042_fix_event_prizes_rls_auth_uid_parameter.sql
--
-- Root cause (continuation of 00039 and 00041):
--   The INSERT / UPDATE / DELETE policies on event_prizes use a SECURITY
--   DEFINER helper (is_event_creator) that calls auth.uid() internally.
--   When the SECURITY DEFINER function executes, current_setting used by
--   auth.uid() can return NULL because PgBouncer transaction-mode or the
--   definer context switch loses the request.jwt.claim.sub setting.
--
-- Fix:
--   Redesign the helper to ACCEPT auth.uid() as a parameter instead of
--   reading it internally. This way auth.uid() is evaluated in the
--   RLS policy context (user's direct session) BEFORE entering the
--   SECURITY DEFINER function.
--
-- Changes:
--   1. Creates is_event_creator_by_uid(p_event_id, p_user_id) — SECURITY
--      DEFINER but receives user_id from the caller.
--   2. Recreates is_event_creator() as a wrapper that still works for
--      backward compatibility (and for any code that calls it directly).
--   3. Replaces all RLS policies to call
--      public.is_event_creator_by_uid(event_id, auth.uid()).

-- ══════════════════════════════════════════════════════════════════════
-- Step 1: Create the new SECURITY DEFINER helper that takes user_id
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.is_event_creator_by_uid(p_event_id uuid, p_user_id uuid)
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
      and cp.profile_id = p_user_id
  );
$$;

grant execute on function public.is_event_creator_by_uid(uuid, uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Step 2: Recreate is_event_creator as a wrapper for backward compat
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.is_event_creator(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select public.is_event_creator_by_uid(p_event_id, auth.uid());
$$;

-- ══════════════════════════════════════════════════════════════════════
-- Step 3: Drop existing policies to replace them
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists "Event prizes are visible to event participants and creator" on event_prizes;
drop policy if exists "Anyone can view prizes for visible events" on event_prizes;
drop policy if exists "Creators can insert prizes for their events" on event_prizes;
drop policy if exists "Creators can update prizes for their events" on event_prizes;
drop policy if exists "Creators can delete prizes for their events" on event_prizes;

-- ══════════════════════════════════════════════════════════════════════
-- Step 4: SELECT policy — anyone can view prizes for visible events
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
-- Step 5: INSERT policy — pass auth.uid() from outside the definer
-- ══════════════════════════════════════════════════════════════════════

create policy "Creators can insert prizes for their events"
  on event_prizes for insert
  to authenticated
  with check (public.is_event_creator_by_uid(event_id, auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- Step 6: UPDATE policy — pass auth.uid() from outside the definer
-- ══════════════════════════════════════════════════════════════════════

create policy "Creators can update prizes for their events"
  on event_prizes for update
  to authenticated
  using (public.is_event_creator_by_uid(event_id, auth.uid()))
  with check (public.is_event_creator_by_uid(event_id, auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- Step 7: DELETE policy — pass auth.uid() from outside the definer
-- ══════════════════════════════════════════════════════════════════════

create policy "Creators can delete prizes for their events"
  on event_prizes for delete
  to authenticated
  using (public.is_event_creator_by_uid(event_id, auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- Step 8: Reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════════════════

notify pgrst, 'reload schema';
