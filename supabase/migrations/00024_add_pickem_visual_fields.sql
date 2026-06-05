-- ============================================================================
-- PickHub – Add visual display fields for Pick'em events
-- Migration: 00024_add_pickem_visual_fields
-- ============================================================================
-- Adds columns needed for the prediction receipt/shareable card:
--   events.logo_url         – tournament/event logo
--   events.twitch_channel   – broadcast channel handle
--   event_players.country_code – ISO-2 country code for flag display
-- ============================================================================

alter table events
  add column if not exists logo_url text,
  add column if not exists twitch_channel text;

alter table event_players
  add column if not exists country_code text;

comment on column events.logo_url is 'URL to tournament/event logo image';
comment on column events.twitch_channel is 'Twitch channel handle for broadcast';
comment on column event_players.country_code is 'ISO-3166-1 alpha-2 country code for flag display';

notify pgrst, 'reload schema';
