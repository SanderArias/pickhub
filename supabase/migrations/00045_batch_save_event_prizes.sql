-- migration/00045_batch_save_event_prizes.sql
--
-- SECURITY DEFINER RPC that handles INSERT / UPDATE / DELETE of prizes
-- in a single database call, bypassing RLS entirely.
--
-- Called from the server action via supabase.rpc('batch_save_event_prizes', ...)
-- The caller's identity is validated via auth.uid() which is available
-- because PostgREST forwards the JWT directly to the function call.

create or replace function public.batch_save_event_prizes(
  p_event_id        uuid,
  p_prizes          jsonb,
  p_stacking_policy text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_creator_id   uuid;
  v_prize        jsonb;
  v_existing_ids uuid[];
  v_incoming_ids uuid[];
  v_to_delete    uuid[];
  v_result       jsonb[];
  v_row          record;
begin
  -- Validate creator ownership (auth.uid() works in RPC context)
  select e.creator_id into strict v_creator_id
  from public.events e
  where e.id = p_event_id;

  if not exists (
    select 1 from public.creator_profiles cp
    where cp.id = v_creator_id
      and cp.profile_id = auth.uid()
  ) then
    raise exception 'Only the event creator can modify prizes.';
  end if;

  -- Collect existing prize IDs for this event
  select array_agg(id) into v_existing_ids
  from public.event_prizes
  where event_id = p_event_id;

  -- Collect incoming prize IDs (those with an id field)
  select array_agg((p ->> 'id')::uuid) into v_incoming_ids
  from jsonb_array_elements(p_prizes) as p
  where p ? 'id' and (p ->> 'id') is not null;

  -- Delete prizes that are in existing_ids but not in incoming_ids
  if v_existing_ids is not null then
    select array_agg(id) into v_to_delete
    from unnest(v_existing_ids) as id
    where id <> all(coalesce(v_incoming_ids, array[]::uuid[]));

    if v_to_delete is not null then
      delete from public.event_prizes
      where id = any(v_to_delete)
        and event_id = p_event_id;
    end if;
  end if;

  -- Upsert each prize and capture { clientId, id } pairs
  v_result := array[]::jsonb[];

  for v_prize in select * from jsonb_array_elements(p_prizes)
  loop
    insert into public.event_prizes (
      id, event_id, label, description, amount, currency, quantity,
      eligibility_type, eligible_rank_start, sort_order,
      assignment_method, prize_category
    ) values (
      coalesce((v_prize ->> 'id')::uuid, gen_random_uuid()),
      p_event_id,
      v_prize ->> 'label',
      nullif(v_prize ->> 'description', ''),
      nullif((v_prize ->> 'amount'), '')::numeric,
      coalesce(v_prize ->> 'currency', 'USD'),
      coalesce((v_prize ->> 'quantity')::integer, 1),
      coalesce(v_prize ->> 'eligibility_type', 'all'),
      coalesce((v_prize ->> 'eligible_rank_start')::integer, 1),
      coalesce((v_prize ->> 'sort_order')::integer, 0),
      coalesce(v_prize ->> 'assignment_method', 'ranking'),
      coalesce(v_prize ->> 'prize_category',
        case when v_prize ->> 'eligibility_type' = 'subscribers' then 'subscriber_bonus' else 'general_ranking' end)
    )
    on conflict (id)
    do update set
      label               = excluded.label,
      description         = excluded.description,
      amount              = excluded.amount,
      currency            = excluded.currency,
      quantity            = excluded.quantity,
      eligibility_type    = excluded.eligibility_type,
      eligible_rank_start = excluded.eligible_rank_start,
      sort_order          = excluded.sort_order,
      assignment_method   = excluded.assignment_method,
      prize_category      = excluded.prize_category
    returning event_prizes.id into v_row;

    v_result := v_result || jsonb_build_object(
      'clientId', v_prize ->> 'clientId',
      'id', v_row.id
    );
  end loop;

  -- Update stacking policy if provided
  if p_stacking_policy is not null then
    update public.events
    set prize_stacking_policy = p_stacking_policy
    where id = p_event_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'savedCount', coalesce(array_length(v_result, 1), 0),
    'saved', coalesce(
      (select jsonb_agg(v) from unnest(v_result) as v),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.batch_save_event_prizes(uuid, jsonb, text) to authenticated;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
