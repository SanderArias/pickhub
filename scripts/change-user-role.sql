-- ============================================================================
-- PickHub – Change user role
-- Usage:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Replace `:user_email` and `:new_role` with your values
--   3. Run
--
-- Valid roles: user, creator, admin
-- ============================================================================

update public.profiles
set role = ':new_role'  -- ← CHANGE THIS: 'user', 'creator', or 'admin'
where id = (
  select id from auth.users
  where email = ':user_email'  -- ← CHANGE THIS
);
