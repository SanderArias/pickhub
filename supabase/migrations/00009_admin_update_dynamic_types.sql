-- ============================================================================
-- PickHub – Allow admins to update dynamic_types (activities)
-- Migration: 00009_admin_update_dynamic_types
-- ============================================================================

drop policy if exists "Admins can update dynamic types" on dynamic_types;

create policy "Admins can update dynamic types"
  on dynamic_types for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
