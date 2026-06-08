-- Add tiebreaker_pending to the events status check constraint

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('draft', 'open', 'predictions_closed', 'tiebreaker_pending', 'completed', 'archived'));

comment on column public.events.status is 'Event status: draft → open → predictions_closed → (tiebreaker_pending) → completed → archived';
