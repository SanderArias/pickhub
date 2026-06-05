-- ============================================================================
-- PickHub – Admin notifications for creator moderation actions
-- Migration: 00016_admin_notifications
-- ============================================================================
-- Stores internal messages sent to users when admins approve, reject,
-- suspend, or reactivate a creator profile. These are displayed on the
-- user's /inicio page — no email delivery for now.
-- ============================================================================

create table if not exists admin_notifications (
  id                 uuid        primary key default gen_random_uuid(),
  creator_profile_id uuid        not null references creator_profiles(id) on delete cascade,
  type               text        not null check (type in ('approval', 'rejection', 'suspension', 'reactivation')),
  title              text        not null,
  message            text        not null,
  created_at         timestamptz not null default now(),
  read_at            timestamptz
);

alter table admin_notifications enable row level security;

-- RLS: authenticated users can read their own notifications; admin can read all
create policy "Users can read their own admin notifications"
  on admin_notifications for select
  using (
    exists (
      select 1 from creator_profiles cp
      where cp.id = creator_profile_id
      and cp.profile_id = auth.uid()
    )
  );

create policy "Admins can read all admin notifications"
  on admin_notifications for select
  using (auth.uid() in (
    select id from profiles where role = 'admin'
  ));

create policy "Admins can insert admin notifications"
  on admin_notifications for insert
  with check (auth.uid() in (
    select id from profiles where role = 'admin'
  ));

-- GRANTs
grant select on public.admin_notifications to authenticated;
grant insert on public.admin_notifications to authenticated;

-- Seed: create an approval notification for every approved creator that
-- doesn't already have one (existing data migration)
insert into admin_notifications (creator_profile_id, type, title, message)
select
  cp.id,
  'approval',
  'Tu acceso fue aprobado',
  'Ya tienes acceso al modo creador de PickHub. ¡Bienvenido al programa de acceso anticipado!'
from creator_profiles cp
where cp.status = 'approved'
  and not exists (
    select 1 from admin_notifications an
    where an.creator_profile_id = cp.id
    and an.type = 'approval'
  );
