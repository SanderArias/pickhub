-- ============================================================================
-- PickHub – Refine event statuses for lifecycle phases
-- Migration: 00023_refine_event_statuses
-- ============================================================================
-- Separates configuration (draft) from operational phases (open,
-- predictions_closed, completed) so the dashboard can render appropriately
-- per phase instead of mixing everything in one screen.
-- ============================================================================

alter table events
  drop constraint if exists events_status_check;

alter table events
  add constraint events_status_check
  check (status in ('draft', 'open', 'predictions_closed', 'completed', 'archived'));

comment on column events.status is
  'Lifecycle: draft → open → predictions_closed → completed. archived is terminal.';
