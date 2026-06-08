-- 00055_add_pickem_prize_notifications.sql
-- Creates a notification outbox for prize winner emails,
-- with idempotency guarantee via unique constraint on (award_id, notification_type).
-- All access is through SECURITY DEFINER RPCs only — no direct table access.

-- ============================================================
-- 1. Notification outbox table (RLS enabled, no direct grants)
-- ============================================================
create table if not exists public.pickem_prize_notifications (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  award_id            uuid not null references public.pickem_prize_awards(id) on delete cascade,
  profile_id          uuid not null,
  notification_type   text not null default 'prize_won',
  status              text not null default 'pending'
                      check (status in ('pending', 'processing', 'sent', 'failed')),
  provider_message_id text,
  attempt_count       integer not null default 0,
  last_error          text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Idempotency: never send the same notification twice for the same award
create unique index if not exists idx_pickem_prize_notifications_unique
  on public.pickem_prize_notifications (award_id, notification_type);

create index if not exists idx_pickem_prize_notifications_status
  on public.pickem_prize_notifications (status);

create index if not exists idx_pickem_prize_notifications_event
  on public.pickem_prize_notifications (event_id);

-- RLS enabled — no direct access from client or server actions
alter table public.pickem_prize_notifications enable row level security;

revoke all on public.pickem_prize_notifications from anon, authenticated;

-- Auto-update updated_at
create or replace function public.update_pickem_prize_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_pickem_prize_notifications_updated_at
  before update on public.pickem_prize_notifications
  for each row
  execute function public.update_pickem_prize_notifications_updated_at();

-- ============================================================
-- 2. RPC: create_prize_notifications
--     Creates pending notifications for all assigned awards.
--     Idempotent — unique constraint prevents duplicates.
--     Validates: caller manages the event, event is completed.
-- ============================================================
create or replace function public.create_prize_notifications(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_status text;
  v_inserted int;
  v_result jsonb;
begin
  if not (public.can_manage_pickem(p_event_id)) then
    raise exception 'Acceso denegado.';
  end if;

  select status into v_event_status from public.events where id = p_event_id;
  if v_event_status is distinct from 'completed' then
    raise exception 'El evento debe estar completado para crear notificaciones.';
  end if;

  insert into public.pickem_prize_notifications (event_id, award_id, profile_id, notification_type, status)
  select
    p_event_id,
    a.id,
    a.profile_id,
    'prize_won',
    'pending'
  from public.pickem_prize_awards a
  where a.event_id = p_event_id
    and a.assignment_status = 'assigned'
    and a.profile_id is not null
    and a.awarded_at is not null
    and not exists (
      select 1 from public.pickem_prize_notifications n
      where n.award_id = a.id and n.notification_type = 'prize_won'
    );

  get diagnostics v_inserted = row_count;

  select jsonb_build_object('inserted', v_inserted) into v_result;
  return v_result;
end;
$$;

grant execute on function public.create_prize_notifications(uuid) to authenticated;

-- ============================================================
-- 3. RPC: get_pending_prize_notifications
--     Returns pending/failed notifications with all data needed
--     for sending prize winner emails (including email from auth.users).
--     Validates: caller manages the event, event is completed.
-- ============================================================
create or replace function public.get_pending_prize_notifications(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public, auth'
as $$
declare
  v_event_status text;
  v_result jsonb;
begin
  if not (public.can_manage_pickem(p_event_id)) then
    raise exception 'Acceso denegado.';
  end if;

  select status into v_event_status from public.events where id = p_event_id;
  if v_event_status is distinct from 'completed' then
    raise exception 'El evento debe estar completado.';
  end if;

  select jsonb_build_object(
    'notifications', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'awardId', n.award_id,
        'profileId', n.profile_id,
        'displayName', pr.display_name,
        'email', u.email,
        'eventTitle', e.title,
        'prizeTitle', pd.title,
        'prizeAmount', pd.amount,
        'prizeCurrency', pd.currency,
        'awardedRank', a.awarded_rank,
        'subscriberRank', a.subscriber_rank,
        'attemptCount', n.attempt_count
      )
      order by n.created_at
    ), '[]'::jsonb)
  ) into v_result
  from public.pickem_prize_notifications n
  join public.pickem_prize_awards a on a.id = n.award_id
  join public.pickem_prize_definitions pd on pd.id = a.prize_definition_id
  join public.profiles pr on pr.id = n.profile_id
  join auth.users u on u.id = n.profile_id
  join public.events e on e.id = n.event_id
  where n.event_id = p_event_id
    and n.status in ('pending', 'failed');

  return v_result;
end;
$$;

grant execute on function public.get_pending_prize_notifications(uuid) to authenticated;

-- ============================================================
-- 4. RPC: update_prize_notification_status
--     Updates a single notification's status.
--     Validates the notification belongs to an event the caller can manage.
-- ============================================================
create or replace function public.update_prize_notification_status(
  p_notification_id uuid,
  p_status          text,
  p_last_error      text default null,
  p_provider_message_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_result jsonb;
begin
  select event_id into v_event_id
  from public.pickem_prize_notifications
  where id = p_notification_id;

  if v_event_id is null then
    raise exception 'Notificaci\u00f3n no encontrada.';
  end if;

  if not (public.can_manage_pickem(v_event_id)) then
    raise exception 'Acceso denegado.';
  end if;

  update public.pickem_prize_notifications
  set
    status = p_status,
    last_error = p_last_error,
    provider_message_id = coalesce(p_provider_message_id, provider_message_id),
    attempt_count = attempt_count + 1,
    sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_notification_id;

  select jsonb_build_object('updated', true) into v_result;
  return v_result;
end;
$$;

grant execute on function public.update_prize_notification_status(uuid, text, text, text) to authenticated;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
