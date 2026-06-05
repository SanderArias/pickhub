-- ============================================================================
-- PickHub – Grant privileges for the participant submission flow
-- Migration: 00015_grants_participation_flow
-- ============================================================================
-- Participants need to:
--   1. INSERT into event_participants  (auto-join when submitting)
--   2. SELECT / INSERT on submissions  (create and view own submission)
--
-- prediction_answers already has GRANTs from 00010_configurable_predictions_schema.sql
-- event_participants already has GRANT SELECT from 00012_grant_event_participants_select.sql
-- ============================================================================

grant insert on public.event_participants to authenticated;
grant select, insert on public.submissions to authenticated;
