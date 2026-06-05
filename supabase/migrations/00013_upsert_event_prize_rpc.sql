-- ============================================================================
-- PickHub – SECURITY DEFINER RPC for upserting event prizes
-- Migration: 00013_upsert_event_prize_rpc
-- ============================================================================
-- Bypasses RLS issues with INSERT ... ON CONFLICT on event_prizes from
-- PostgREST (server actions). The function runs as SECURITY DEFINER so
-- the underlying table RLS policies are not evaluated, while still
-- validating the caller's identity via auth.uid().
--
-- Usage from server action:
--   supabase.rpc('upsert_event_prize', {
--     p_event_id, p_tier, p_label, p_description, p_amount, p_currency, p_quantity
--   })
-- ============================================================================

create or replace function public.upsert_event_prize(
  p_event_id    uuid,
  p_tier        text,
  p_label       text,
  p_description text default null,
  p_amount      numeric default null,
  p_currency    text default 'USD',
  p_quantity    integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_creator_id uuid;
  v_result jsonb;
begin
  -- Validate tier
  if p_tier not in ('subscriber', 'nonsubscriber') then
    raise exception 'Tipo de premio inválido: %', p_tier;
  end if;

  -- Validate label
  if p_label is null or trim(p_label) = '' then
    raise exception 'La etiqueta del premio es obligatoria.';
  end if;

  -- Verify caller is the event creator
  select e.creator_id into strict v_creator_id
  from public.events e
  where e.id = p_event_id;

  if not exists (
    select 1 from public.creator_profiles cp
    where cp.id = v_creator_id
      and cp.profile_id = auth.uid()
  ) then
    raise exception 'No tienes permiso para modificar premios de este evento.';
  end if;

  -- Upsert: insert or update on conflict (event_id, tier)
  insert into public.event_prizes (event_id, tier, label, description, amount, currency, quantity)
  values (p_event_id, p_tier, p_label, nullif(p_description, ''), p_amount, p_currency, p_quantity)
  on conflict (event_id, tier)
  do update set
    label       = excluded.label,
    description = excluded.description,
    amount      = excluded.amount,
    currency    = excluded.currency,
    quantity    = excluded.quantity
  returning to_jsonb(event_prizes.*) into v_result;

  return v_result;
end;
$$;

-- Grant execute to authenticated users (called from server actions)
grant execute on function public.upsert_event_prize(uuid, text, text, text, numeric, text, integer) to authenticated;
