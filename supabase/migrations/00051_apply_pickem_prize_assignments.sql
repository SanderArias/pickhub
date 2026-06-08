-- ============================================================================
-- PickHub – SECURITY DEFINER RPC for batch-applying prize assignments
-- Migration: 00051_apply_pickem_prize_assignments
-- ============================================================================
-- Replaces direct INSERT/UPDATE on pickem_prize_awards from server actions
-- (which fail because the authenticated role lacks base table privileges for
--  mutation, and the RLS policies cannot be evaluated when auth.uid() is not
--  available in the server-action execution context).
--
-- The function runs as SECURITY DEFINER so table privileges are bypassed,
-- while still validating the caller's identity via can_manage_pickem().
--
-- Usage from server action:
--   supabase.rpc('apply_pickem_prize_assignments', {
--     p_event_id: '...',
--     p_assignments: [
--       { prize_definition_id: '...', assignment_source: 'automatic_ranking',
--         assignment_status: 'assigned', profile_id: '...',
--         awarded_rank: 1, awarded_at: '2025-01-01T00:00:00Z' },
--       ...
--     ]
--   })
--
-- Each assignment is upserted by prize_definition_id (INSERT if no row
-- exists, UPDATE if one does). This avoids the partial unique-index issue
-- that broke PostgREST ON CONFLICT for rows with assignment_status =
-- 'revoked' (which is excluded from the index).
-- ============================================================================

create or replace function public.apply_pickem_prize_assignments(
  p_event_id    uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_assignment jsonb;
  v_def_id uuid;
  v_source text;
  v_status text;
  v_profile_id uuid;
  v_awarded_rank int;
  v_awarded_at timestamptz;
  v_existing_id uuid;
begin
  -- Verify caller is the event creator
  if not public.can_manage_pickem(p_event_id) then
    raise exception 'No tienes permiso para asignar premios de este evento.';
  end if;

  for v_assignment in select * from jsonb_array_elements(p_assignments)
  loop
    v_def_id       := (v_assignment->>'prize_definition_id')::uuid;
    v_source       := v_assignment->>'assignment_source';
    v_status       := v_assignment->>'assignment_status';
    v_profile_id   := nullif(v_assignment->>'profile_id', '')::uuid;
    v_awarded_rank := nullif(v_assignment->>'awarded_rank', '')::int;
    v_awarded_at   := nullif(v_assignment->>'awarded_at', '')::timestamptz;

    -- Check for existing row by prize_definition_id
    select id into v_existing_id
    from public.pickem_prize_awards
    where prize_definition_id = v_def_id
    limit 1;

    if v_existing_id is not null then
      update public.pickem_prize_awards
      set
        assignment_status = v_status,
        assignment_source = v_source,
        profile_id        = v_profile_id,
        awarded_rank      = v_awarded_rank,
        awarded_at        = v_awarded_at
      where id = v_existing_id;
    else
      insert into public.pickem_prize_awards (
        event_id, prize_definition_id, profile_id,
        awarded_rank, assignment_source, assignment_status,
        awarded_at
      ) values (
        p_event_id, v_def_id, v_profile_id,
        v_awarded_rank, v_source, v_status,
        v_awarded_at
      );
    end if;
  end loop;
end;
$$;

-- Grant execute to authenticated users (called from server actions)
grant execute on function public.apply_pickem_prize_assignments(uuid, jsonb) to authenticated;
