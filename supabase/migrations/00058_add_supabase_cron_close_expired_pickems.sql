-- 00058_add_supabase_cron_close_expired_pickems.sql
-- Replaces Vercel Cron with Supabase pg_cron for automatic Pick'em closure.
-- The existing /api/cron route is kept as a manual fallback.
--
-- Schema notes (from events table):
--   ends_at (timestamptz, nullable)  → null = manual close, set = auto close UTC
--   predictions_close_timezone (text) → user-selected IANA zone (not used in cron)
--   status (text) → 'draft','open','predictions_closed','tiebreaker_pending','completed','archived'
--   updated_at → auto-managed by trg_events_updated_at trigger

-- 1. Function to close expired Pick'ems
create or replace function public.close_expired_pickems()
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_count integer;
  v_ids  uuid[];
begin
  with updated as (
    update events
    set status = 'predictions_closed'
    where status = 'open'
      and ends_at is not null
      and ends_at <= now()
    returning id
  )
  select
    count(*),
    array_agg(id order by id)
  into v_count, v_ids
  from updated;

  return jsonb_build_object(
    'closed_count', coalesce(v_count, 0),
    'event_ids',    coalesce(to_jsonb(v_ids), '[]'::jsonb)
  );
end;
$$;

-- 2. Revoke direct execution from non-super users
revoke all on function public.close_expired_pickems()
from public, anon, authenticated;

-- 3. Create pg_cron extension if not present
create extension if not exists pg_cron;

-- 4. Remove previous schedule (only if it exists)
do $$
declare
  v_job_id bigint;
begin
  select jobid
  into v_job_id
  from cron.job
  where jobname = 'close-expired-pickems'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

-- 5. Schedule every 5 minutes
select cron.schedule(
  'close-expired-pickems',
  '*/5 * * * *',
  $$
    select public.close_expired_pickems();
  $$
);

notify pgrst, 'reload schema';
