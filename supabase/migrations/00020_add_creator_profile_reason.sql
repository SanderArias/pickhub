-- ============================================================================
-- PickHub – Add reason column to creator_profiles for rejection/suspension
-- Migration: 00020_add_creator_profile_reason
-- ============================================================================
-- Stores a human-readable reason when an admin rejects or suspends a creator
-- profile. Displayed on the user's /inicio status card.
-- ============================================================================

alter table creator_profiles
  add column if not exists reason text;

comment on column creator_profiles.reason is
  'Motivo visible al usuario cuando su perfil es rechazado o suspendido.';
