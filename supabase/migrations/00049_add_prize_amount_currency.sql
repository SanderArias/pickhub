-- 00049_add_prize_amount_currency.sql
-- Adds monetary value fields to pickem_prize_definitions
-- so creators can specify prize amounts with currency.

-- ============================================================
-- 1. Add amount and currency columns
-- ============================================================
alter table public.pickem_prize_definitions
  add column if not exists amount numeric(12,2),
  add column if not exists currency text;

-- Validate: if amount is present, currency must also be present and amount >= 0
alter table public.pickem_prize_definitions
  drop constraint if exists pickem_prize_definitions_money_check;

alter table public.pickem_prize_definitions
  add constraint pickem_prize_definitions_money_check
  check (
    (amount is null and currency is null)
    or
    (amount is not null and amount >= 0 and currency is not null)
  );

-- ============================================================
-- 2. Recreate save_pickem_prize_configuration with amount/currency
-- ============================================================
create or replace function public.save_pickem_prize_configuration(
  p_event_id uuid,
  p_stacking_policy text,
  p_definitions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_definition   jsonb;
  v_def_id       uuid;
  v_incoming_ids uuid[];
  v_existing_ids uuid[];
  v_to_disable   uuid[];
  v_result       jsonb[];
  v_row          record;
begin
  -- Validate ownership
  if not public.can_manage_pickem(p_event_id) then
    raise exception 'Only the event creator can configure prizes.';
  end if;

  -- Validate stacking policy
  if p_stacking_policy is not null
     and p_stacking_policy not in ('allow_both', 'pass_subscriber_benefit')
  then
    raise exception 'Invalid stacking policy: %', p_stacking_policy;
  end if;

  -- Upsert settings
  insert into public.pickem_prize_settings (event_id, stacking_policy)
  values (p_event_id, p_stacking_policy)
  on conflict (event_id)
  do update set stacking_policy = excluded.stacking_policy;

  -- Collect incoming definition IDs
  select array_agg((d ->> 'id')::uuid)
  into v_incoming_ids
  from jsonb_array_elements(p_definitions) as d
  where d ? 'id' and (d ->> 'id') is not null;

  -- Collect existing active definition IDs for this event
  select array_agg(id) into v_existing_ids
  from public.pickem_prize_definitions
  where event_id = p_event_id and is_active = true;

  -- Disable definitions that are in existing but not in incoming
  if v_existing_ids is not null then
    select array_agg(id) into v_to_disable
    from unnest(v_existing_ids) as id
    where id <> all(coalesce(v_incoming_ids, array[]::uuid[]));

    if v_to_disable is not null then
      update public.pickem_prize_definitions
      set is_active = false
      where id = any(v_to_disable)
        and event_id = p_event_id;
    end if;
  end if;

  -- Upsert each definition
  v_result := array[]::jsonb[];

  for v_definition in select * from jsonb_array_elements(p_definitions)
  loop
    insert into public.pickem_prize_definitions (
      id, event_id, category, rank_position, subscriber_order,
      title, description, sort_order, is_active, amount, currency
    ) values (
      coalesce((v_definition ->> 'id')::uuid, gen_random_uuid()),
      p_event_id,
      v_definition ->> 'category',
      nullif((v_definition ->> 'rankPosition')::text, '')::integer,
      nullif((v_definition ->> 'subscriberOrder')::text, '')::integer,
      v_definition ->> 'title',
      nullif(v_definition ->> 'description', ''),
      coalesce((v_definition ->> 'sortOrder')::integer, 0),
      true,
      nullif((v_definition ->> 'amount')::text, '')::numeric(12,2),
      nullif(v_definition ->> 'currency', '')
    )
    on conflict (id)
    do update set
      category         = excluded.category,
      rank_position    = excluded.rank_position,
      subscriber_order = excluded.subscriber_order,
      title            = excluded.title,
      description      = excluded.description,
      sort_order       = excluded.sort_order,
      is_active        = true,
      amount           = excluded.amount,
      currency         = excluded.currency
    returning id into v_row;

    v_result := v_result || jsonb_build_object(
      'clientId', v_definition ->> 'clientId',
      'id', v_row.id
    );
  end loop;

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

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
