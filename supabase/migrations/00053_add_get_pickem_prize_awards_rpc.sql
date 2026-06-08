-- 00053_add_get_pickem_prize_awards_rpc.sql
-- Creates a SECURITY DEFINER RPC that returns prize awards for an event,
-- with explicit access control: creator or participant can read.
-- Bypasses RLS so direct table queries from server actions work.

-- ============================================================
-- 1. RPC: get_pickem_prize_awards
--     Returns awards for an event, validated via can_manage_pickem
--     or event_participants membership.
-- ============================================================

create or replace function public.get_pickem_prize_awards(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_awards jsonb;
begin
  -- Access control: only the event creator or a participant may read awards
  if not (
    public.can_manage_pickem(p_event_id)
    or
    exists (
      select 1
      from public.event_participants
      where event_id = p_event_id
        and profile_id = auth.uid()
    )
  ) then
    raise exception 'Acceso denegado: no eres el creador ni participante de este evento.';
  end if;

  select coalesce(jsonb_agg(a order by a.created_at), '[]'::jsonb)
  into v_awards
  from (
    select
      prize_definition_id,
      profile_id,
      awarded_rank,
      subscriber_rank,
      awarded_at,
      assignment_status
    from public.pickem_prize_awards
    where event_id = p_event_id
  ) a;

  return v_awards;
end;
$$;

grant execute on function public.get_pickem_prize_awards(uuid) to authenticated;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
