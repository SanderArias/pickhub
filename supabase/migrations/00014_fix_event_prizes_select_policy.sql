-- ============================================================================
-- PickHub – Fix ambiguous column reference in event_prizes SELECT policy
-- Migration: 00014_fix_event_prizes_select_policy
-- ============================================================================
-- The previous SELECT policy used an unqualified event_id in the subquery:
--
--   where e.id = event_id
--
-- After adding LEFT JOIN event_participants ep, which has an event_id column,
-- PostgreSQL resolved event_id as ep.event_id instead of the outer
-- event_prizes.event_id. For creators who are not participants, ep.event_id
-- is NULL, causing the condition to fail silently (RLS returns 0 rows).
--
-- Fix: qualify event_id as event_prizes.event_id to eliminate ambiguity.
-- ============================================================================

do $$ begin
  drop policy if exists "Event prizes are visible to event participants and creator"
    on event_prizes;

  create policy "Event prizes are visible to event participants and creator"
    on event_prizes for select
    using (exists (
      select 1 from events e
      left join creator_profiles cp on cp.id = e.creator_id
      left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
      where e.id = event_prizes.event_id
      and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
    ));
end; $$;
