-- ============================================================================
-- PickHub – Add unassigned_no_eligible_winner to prize awards status
-- Migration: 00052_add_unassigned_no_eligible_winner_status
-- ============================================================================
-- 'revoked' was being reused for prizes where no participant was eligible.
-- This conflates two distinct semantics:
--
--   revoked  –  a previously-assigned prize that was explicitly revoked
--   unassigned_no_eligible_winner  –  no participant occupied the target
--                                      rank or no eligible subscriber
--                                      remained
--
-- This migration adds the new status to the check constraint, updates the
-- assignment validation constraint, and refreshes the RPC to set awarded_at
-- = null for the new status.
-- ============================================================================

-- 1. Drop the old status check constraint
alter table public.pickem_prize_awards
  drop constraint if exists pickem_prize_awards_status_check;

-- 2. Add updated status check constraint
alter table public.pickem_prize_awards
  add constraint pickem_prize_awards_status_check
  check (assignment_status in ('pending', 'assigned', 'revoked', 'unassigned_no_eligible_winner'));

-- 3. Drop the old assignment check constraint
alter table public.pickem_prize_awards
  drop constraint if exists pickem_prize_awards_assignment_check;

-- 4. Add updated assignment check constraint
--    awarded_rank must be null for 'pending' and 'unassigned_no_eligible_winner'
--    to prevent ambiguous partial data.
alter table public.pickem_prize_awards
  add constraint pickem_prize_awards_assignment_check
  check (
    (assignment_status = 'pending' and profile_id is null and awarded_rank is null and awarded_at is null)
    or
    (assignment_status = 'assigned' and profile_id is not null and awarded_at is not null)
    or
    (assignment_status = 'revoked')
    or
    (assignment_status = 'unassigned_no_eligible_winner' and profile_id is null and awarded_rank is null and awarded_at is null)
  );

-- 5. Refresh the SECURITY DEFINER RPC so it sets awarded_at = null for the
--    new status (the previous migration 00051 did not know about this status).
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
    v_def_id := (v_assignment->>'prize_definition_id')::uuid;
    v_source := v_assignment->>'assignment_source';
    v_status := v_assignment->>'assignment_status';

    -- Only 'assigned' carries meaningful profile_id, awarded_rank, awarded_at
    if v_status = 'assigned' then
      v_profile_id   := nullif(v_assignment->>'profile_id', '')::uuid;
      v_awarded_rank := nullif(v_assignment->>'awarded_rank', '')::int;
      v_awarded_at   := nullif(v_assignment->>'awarded_at', '')::timestamptz;
    else
      v_profile_id   := null;
      v_awarded_rank := null;
      v_awarded_at   := null;
    end if;

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

-- Re-grant execute (replaces the grant from 00051)
grant execute on function public.apply_pickem_prize_assignments(uuid, jsonb) to authenticated;
