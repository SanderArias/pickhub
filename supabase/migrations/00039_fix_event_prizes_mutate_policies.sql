-- migration/00039_fix_event_prizes_mutate_policies.sql
--
-- Root cause: the INSERT / UPDATE / DELETE policies on event_prizes use
-- a subquery against events, but the events SELECT RLS policy injects
-- additional conditions (is_public / creator check) that can block the
-- subquery from returning the expected row. When the subquery fails to
-- find the event, the policy rejects the operation with 42501.
--
-- Fix: replace the inline subqueries with a SECURITY DEFINER helper
-- function that bypasses RLS on events, isolating the ownership check
-- from the events SELECT policy. The function is stable (read-only) and
-- safe because it still validates auth.uid() explicitly.
--
-- See also: 00013_upsert_event_prize_rpc.sql (same root cause, worked
-- around via SECURITY DEFINER RPC) and 00037_fix_event_prizes_select_
-- policy.sql (previously fixed SELECT policy).

-- SECURITY DEFINER helper: true if auth.uid() is the creator of event p_event_id
create or replace function public.is_event_creator(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from public.events e
    join public.creator_profiles cp on cp.id = e.creator_id
    where e.id = p_event_id
      and cp.profile_id = auth.uid()
  );
$$;

-- Grant execute to authenticated users (called from RLS policies)
grant execute on function public.is_event_creator(uuid) to authenticated;

-- ------------------------------------------------------------------
-- event_prizes INSERT policy
-- ------------------------------------------------------------------
drop policy if exists "Creators can insert prizes for their events" on event_prizes;

create policy "Creators can insert prizes for their events"
  on event_prizes for insert
  with check (public.is_event_creator(event_id));

-- ------------------------------------------------------------------
-- event_prizes UPDATE policy
-- ------------------------------------------------------------------
drop policy if exists "Creators can update prizes for their events" on event_prizes;

create policy "Creators can update prizes for their events"
  on event_prizes for update
  using (public.is_event_creator(event_id))
  with check (public.is_event_creator(event_id));

-- ------------------------------------------------------------------
-- event_prizes DELETE policy
-- ------------------------------------------------------------------
drop policy if exists "Creators can delete prizes for their events" on event_prizes;

create policy "Creators can delete prizes for their events"
  on event_prizes for delete
  using (public.is_event_creator(event_id));

notify pgrst, 'reload schema';
