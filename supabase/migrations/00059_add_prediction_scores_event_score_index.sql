-- 00059_add_prediction_scores_event_score_index.sql
--
-- Performance: covering index for leaderboard queries on prediction_scores.
-- The RPC get_event_leaderboard (migration 00017) does:
--
--   select
--     ps.profile_id,
--     sum(ps.correct_count)::bigint as correct_answers,
--     sum(ps.total_points)::bigint as total_score
--   from prediction_scores ps
--   where ps.event_id = p_event_id
--   group by ps.profile_id
--   order by sum(ps.total_points) desc;
--
-- Existing indexes cover event_id filtering and profile_id grouping
-- (idx_prediction_scores_event_profile on event_id, profile_id). This
-- index adds total_points and correct_count as included columns so that
-- the aggregation (sum) for the leaderboard can be served via index-only
-- scans, avoiding heap lookups.
--
-- The server action at app/actions/leaderboard.ts:88-92 also benefits:
--   select correct_count, total_points
--   from prediction_scores
--   where event_id = ? and profile_id = ?
-- Both columns are available in the index without heap access.
--
-- Note: total_score is NOT a column in prediction_scores. It is an alias
-- for sum(ps.total_points)::bigint computed inside the RPC.
--
-- Existing indexes on prediction_scores (migration 00010):
--   idx_prediction_scores_event_id        (event_id)
--   idx_prediction_scores_profile_id      (profile_id)
--   idx_prediction_scores_event_profile   (event_id, profile_id)
--   unique constraint                     (event_id, profile_id, question_id)
--
-- This index does NOT duplicate any existing one because the INCLUDE
-- columns make it a covering index, a distinct physical structure.

create index if not exists idx_prediction_scores_event_profile_cover
  on public.prediction_scores (event_id, profile_id)
  include (total_points, correct_count);

comment on index public.idx_prediction_scores_event_profile_cover is
  'Covering index for get_event_leaderboard: filter by event_id, group by profile_id, aggregate total_points and correct_count via index-only scans';
