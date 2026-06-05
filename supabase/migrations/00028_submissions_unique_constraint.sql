-- Ensure one submission per participant per event
-- event_participants already enforces unique(event_id, profile_id),
-- so unique(event_id, participant_id) here achieves the same.
alter table submissions
  add constraint submissions_event_id_participant_id_unique
  unique (event_id, participant_id);
