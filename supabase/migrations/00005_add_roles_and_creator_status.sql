-- ============================================================================
-- PickHub – Roles and Creator Approval Status
-- Migration: 00005_add_roles_and_creator_status
-- ============================================================================
-- Adds role-based access control to profiles and approval workflow to
-- creator_profiles.
--
-- Roles (profiles.role):
--   user    – Default. Participates in events and makes picks.
--   creator – Can create events once approved.
--   admin   – Platform administrator; manages creators, events, and users.
--
-- Creator status (creator_profiles.status):
--   pending  – Default. Awaiting approval.
--   approved – Can create events.
--   rejected – Application denied by admin.
--   suspended – Temporarily unable to create events.
-- ============================================================================

-- ------------------------------------------------------------------
-- profiles.role
-- ------------------------------------------------------------------
do $$ begin
  alter table profiles
    add column if not exists role text
    not null default 'user';
exception
  when duplicate_column then null;
end; $$;

do $$ begin
  alter table profiles
    add constraint profiles_role_check
    check (role in ('user', 'creator', 'admin'));
exception
  when duplicate_object then null;
end; $$;

-- ------------------------------------------------------------------
-- profiles.is_active
-- ------------------------------------------------------------------
do $$ begin
  alter table profiles
    add column if not exists is_active boolean
    not null default true;
exception
  when duplicate_column then null;
end; $$;

-- ------------------------------------------------------------------
-- creator_profiles.status
-- ------------------------------------------------------------------
do $$ begin
  alter table creator_profiles
    add column if not exists status text
    not null default 'pending';
exception
  when duplicate_column then null;
end; $$;

do $$ begin
  alter table creator_profiles
    add constraint creator_profiles_status_check
    check (status in ('pending', 'approved', 'rejected', 'suspended'));
exception
  when duplicate_object then null;
end; $$;

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists idx_profiles_role
  on profiles (role);

create index if not exists idx_creator_profiles_status
  on creator_profiles (status);

-- ============================================================================
-- Comments
-- ============================================================================
comment on column profiles.role is
  E'User role: user (default, can participate), creator (can create events), admin (platform manager)';

comment on column profiles.is_active is
  'Soft-disable a profile without destroying their data. Default: true';

comment on column creator_profiles.status is
  E'Creator approval state: pending (default), approved, rejected, or suspended';
