-- ============================================================================
-- PickHub – Add 'reopened' status to creator_profiles check constraint
-- Migration: 00021_add_reopened_status
-- ============================================================================
-- 'reopened' means the admin reopened a previously rejected profile so the
-- user can submit a brand-new request. The profile is no longer actionable
-- by the admin – the user must click "Solicitar acceso" again, which moves
-- it back to 'pending'.
-- ============================================================================

alter table creator_profiles
  drop constraint if exists creator_profiles_status_check;

alter table creator_profiles
  add constraint creator_profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended', 'reopened'));

comment on column creator_profiles.status is
  'Estado del perfil de creador: pending, approved, rejected, suspended, reopened';
