-- ============================================================================
-- Migration: 00026_fix_results_permissions
-- Description: Add missing grants and RLS policies for the scoring flow.
--   - Creator needs to SELECT prediction_answers for all submissions
--   - Creator needs DELETE on prediction_scores to recalculate
--   - Creator needs UPDATE on submissions to set scored status
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. prediction_answers: creator SELECT for scoring
-- ------------------------------------------------------------------
grant select on public.prediction_answers to authenticated;

do $$ begin
  drop policy if exists "Creator can read prediction_answers for scoring" on prediction_answers;
  create policy "Creator can read prediction_answers for scoring"
    on prediction_answers for select
    using (exists (
      select 1 from submissions s
      join events e on e.id = s.event_id
      join creator_profiles cp on cp.id = e.creator_id
      where s.id = submission_id and cp.profile_id = auth.uid()
    ));
end; $$;

-- ------------------------------------------------------------------
-- 2. prediction_scores: creator DELETE for recalculating
-- ------------------------------------------------------------------
do $$ begin
  drop policy if exists "Creator can delete prediction_scores" on prediction_scores;
  create policy "Creator can delete prediction_scores"
    on prediction_scores for delete
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

-- ------------------------------------------------------------------
-- 3. submissions: creator UPDATE for marking scored status
-- ------------------------------------------------------------------
grant update on public.submissions to authenticated;

do $$ begin
  drop policy if exists "Creator can update submissions for scoring" on submissions;
  create policy "Creator can update submissions for scoring"
    on submissions for update
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;
