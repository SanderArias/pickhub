-- 00059_add_prediction_scores_event_score_index.sql
-- Performance: composite index for leaderboard queries that filter by event_id
-- and order by total_score descending. The RPC get_event_leaderboard does:
--   WHERE ps.event_id = p_event_id
--   GROUP BY ps.profile_id
--   ORDER BY s.total_score DESC
-- A composite index (event_id, total_score DESC) allows PostgreSQL to filter
-- by event_id and return rows already in the required order, avoiding a
-- separate sort pass on large result sets.

create index if not exists idx_prediction_scores_event_score
  on public.prediction_scores (event_id, total_score desc);

comment on index idx_prediction_scores_event_score is
  'Supports get_event_leaderboard: filter by event_id, order by total_score desc';
