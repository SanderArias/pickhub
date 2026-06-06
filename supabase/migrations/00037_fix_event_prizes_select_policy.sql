-- migration/00037_fix_event_prizes_select_policy.sql
--
-- Root cause: the existing SELECT policy on event_prizes requires
-- auth.uid() to match either the event creator or an existing participant.
-- A newly authenticated user who hasn't yet participated in the event
-- sees NO prizes, even though the event has them configured.
--
-- This fix drops the restrictive policy and replaces it with one that
-- allows reading prizes for any event in a publicly visible status,
-- regardless of whether the requesting user is a participant or creator.
--
-- The previous policy also blocked unauthenticated users entirely.
-- The new policy lets anon (unauthenticated) users read prizes too,
-- which is safe because we only query prizes for events in visible
-- statuses at the application level.

-- Drop the old restrictive policy
drop policy if exists "Event prizes are visible to event participants and creator" on event_prizes;

-- Allow anyone (including anon) to read prizes for publicly visible events
create policy "Anyone can view prizes for visible events"
  on event_prizes for select
  using (
    exists (
      select 1 from public.events
      where events.id = event_prizes.event_id
        and events.status in ('open', 'predictions_closed', 'completed', 'archived')
    )
  );

notify pgrst, 'reload schema';
