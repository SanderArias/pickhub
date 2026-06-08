-- 00047_rebuild_pickem_prizes.sql
-- Destructive rebuild of the Pick'em prize system.
-- Drops ALL legacy tables/columns and creates the new architecture.

-- ============================================================
-- 1. Drop legacy functions (RPCs)
-- ============================================================
drop function if exists public.batch_save_event_prizes(uuid, jsonb, text);
drop function if exists public.upsert_event_prize(uuid, jsonb);
drop function if exists public.can_manage_pickem(uuid);

-- ============================================================
-- 2. Drop legacy tables (cascade drops dependents)
-- ============================================================
drop table if exists public.prize_winners cascade;
drop table if exists public.event_prizes cascade;

-- ============================================================
-- 3. Drop legacy column from events
-- ============================================================
alter table if exists public.events
  drop column if exists prize_stacking_policy;

-- ============================================================
-- 4. Create updated_at trigger helper (idempotent)
-- ============================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 5. Helper: can_manage_pickem
--    Returns true if auth.uid() owns the event (via creator_profiles chain)
-- ============================================================
create or replace function public.can_manage_pickem(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.creator_profiles cp on cp.id = e.creator_id
    where e.id = target_event_id
      and cp.profile_id = auth.uid()
  );
$$;

-- ============================================================
-- 6. Table: pickem_prize_settings
-- ============================================================
create table public.pickem_prize_settings (
  event_id uuid primary key
    references public.events(id)
    on delete cascade,

  stacking_policy text not null
    default 'allow_both',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pickem_prize_settings_stacking_policy_check
  check (stacking_policy in ('allow_both', 'pass_subscriber_benefit'))
);

create trigger trg_pickem_prize_settings_updated_at
  before update on public.pickem_prize_settings
  for each row
  execute function public.update_updated_at_column();

-- ============================================================
-- 7. Table: pickem_prize_definitions
-- ============================================================
create table public.pickem_prize_definitions (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  category text not null,

  rank_position integer,
  subscriber_order integer,

  title text not null,
  description text,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pickem_prize_definitions_category_check
  check (category in ('general_rank', 'subscriber_benefit')),

  constraint pickem_prize_definitions_shape_check
  check (
    (category = 'general_rank' and rank_position is not null and rank_position > 0 and subscriber_order is null)
    or
    (category = 'subscriber_benefit' and subscriber_order is not null and subscriber_order > 0 and rank_position is null)
  ),

  constraint pickem_prize_definitions_title_check
  check (char_length(trim(title)) > 0)
);

create unique index pickem_prize_definitions_unique_general_rank
  on public.pickem_prize_definitions(event_id, rank_position)
  where category = 'general_rank' and is_active = true;

create unique index pickem_prize_definitions_unique_subscriber_order
  on public.pickem_prize_definitions(event_id, subscriber_order)
  where category = 'subscriber_benefit' and is_active = true;

create index pickem_prize_definitions_event_idx
  on public.pickem_prize_definitions(event_id);

create trigger trg_pickem_prize_definitions_updated_at
  before update on public.pickem_prize_definitions
  for each row
  execute function public.update_updated_at_column();

-- ============================================================
-- 8. Table: pickem_prize_awards
-- ============================================================
create table public.pickem_prize_awards (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  prize_definition_id uuid not null
    references public.pickem_prize_definitions(id)
    on delete restrict,

  profile_id uuid
    references public.profiles(id)
    on delete restrict,

  awarded_rank integer,
  subscriber_rank integer,

  subscriber_verified boolean not null default false,

  assignment_source text not null,
  assignment_status text not null default 'pending',

  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pickem_prize_awards_source_check
  check (assignment_source in ('automatic_ranking', 'automatic_subscriber', 'tiebreaker', 'manual_adjustment')),

  constraint pickem_prize_awards_status_check
  check (assignment_status in ('pending', 'assigned', 'revoked')),

  constraint pickem_prize_awards_assignment_check
  check (
    (assignment_status = 'pending' and profile_id is null and awarded_at is null)
    or
    (assignment_status = 'assigned' and profile_id is not null and awarded_at is not null)
    or
    assignment_status = 'revoked'
  )
);

create unique index pickem_prize_awards_unique_active_definition
  on public.pickem_prize_awards(prize_definition_id)
  where assignment_status in ('pending', 'assigned');

create index pickem_prize_awards_event_idx
  on public.pickem_prize_awards(event_id);

create index pickem_prize_awards_profile_idx
  on public.pickem_prize_awards(profile_id);

create trigger trg_pickem_prize_awards_updated_at
  before update on public.pickem_prize_awards
  for each row
  execute function public.update_updated_at_column();

-- ============================================================
-- 9. RLS
-- ============================================================
alter table public.pickem_prize_settings enable row level security;
alter table public.pickem_prize_definitions enable row level security;
alter table public.pickem_prize_awards enable row level security;

-- pickem_prize_settings: everyone can read (visibility via event status)
create policy "Anyone can read prize settings"
  on public.pickem_prize_settings for select
  using (true);

create policy "Creator can manage prize settings"
  on public.pickem_prize_settings for insert
  with check (public.can_manage_pickem(event_id));

create policy "Creator can update prize settings"
  on public.pickem_prize_settings for update
  using (public.can_manage_pickem(event_id))
  with check (public.can_manage_pickem(event_id));

create policy "Creator can delete prize settings"
  on public.pickem_prize_settings for delete
  using (public.can_manage_pickem(event_id));

-- pickem_prize_definitions: everyone can read
create policy "Anyone can read prize definitions"
  on public.pickem_prize_definitions for select
  using (true);

create policy "Creator can manage prize definitions"
  on public.pickem_prize_definitions for insert
  with check (public.can_manage_pickem(event_id));

create policy "Creator can update prize definitions"
  on public.pickem_prize_definitions for update
  using (public.can_manage_pickem(event_id))
  with check (public.can_manage_pickem(event_id));

create policy "Creator can delete prize definitions"
  on public.pickem_prize_definitions for delete
  using (public.can_manage_pickem(event_id));

-- pickem_prize_awards: everyone can read
create policy "Anyone can read prize awards"
  on public.pickem_prize_awards for select
  using (true);

-- Awards are managed server-side via RPC only (no direct insert/update/delete from client)
create policy "Creator can manage prize awards"
  on public.pickem_prize_awards for insert
  with check (public.can_manage_pickem(event_id));

create policy "Creator can update prize awards"
  on public.pickem_prize_awards for update
  using (public.can_manage_pickem(event_id))
  with check (public.can_manage_pickem(event_id));

create policy "Creator can delete prize awards"
  on public.pickem_prize_awards for delete
  using (public.can_manage_pickem(event_id));

-- ============================================================
-- 10. RPC: save_pickem_prize_configuration
--     Transactional save of settings + definitions
-- ============================================================
create or replace function public.save_pickem_prize_configuration(
  p_event_id        uuid,
  p_stacking_policy text,
  p_definitions     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
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
      title, description, sort_order, is_active
    ) values (
      coalesce((v_definition ->> 'id')::uuid, gen_random_uuid()),
      p_event_id,
      v_definition ->> 'category',
      nullif((v_definition ->> 'rankPosition')::text, '')::integer,
      nullif((v_definition ->> 'subscriberOrder')::text, '')::integer,
      v_definition ->> 'title',
      nullif(v_definition ->> 'description', ''),
      coalesce((v_definition ->> 'sortOrder')::integer, 0),
      true
    )
    on conflict (id)
    do update set
      category         = excluded.category,
      rank_position    = excluded.rank_position,
      subscriber_order = excluded.subscriber_order,
      title            = excluded.title,
      description      = excluded.description,
      sort_order       = excluded.sort_order,
      is_active        = true
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

grant execute on function public.save_pickem_prize_configuration(uuid, text, jsonb) to authenticated;

-- ============================================================
-- 11. RPC: assign_pickem_prizes
--     Auto-assigns prizes for a completed event
-- ============================================================
create or replace function public.assign_pickem_prizes(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_stacking      text;
  v_def           record;
  v_award         record;
  v_profile_id    uuid;
  v_rank          int;
  v_sub_rank      int;
  v_sub_verified  boolean;
  v_assigned      int;
  v_awarded_ids   uuid[] := array[]::uuid[];
  v_skipped_ids   uuid[] := array[]::uuid[];
  v_result        jsonb;
  v_has_ties      boolean;
begin
  -- Only for completed events
  if not exists (select 1 from public.events where id = p_event_id and status = 'completed') then
    return jsonb_build_object('success', false, 'error', 'Event is not completed');
  end if;

  -- Get stacking policy
  select stacking_policy into v_stacking
  from public.pickem_prize_settings
  where event_id = p_event_id;

  -- Check for pending ties
  select count(*) > 0 into v_has_ties
  from (
    select s.total_score
    from public.submissions s
    where s.event_id = p_event_id and s.status = 'scored'
    group by s.total_score
    having count(*) > 1
  ) ties;

  -- ============================================================
  -- GENERAL RANK prizes (category = 'general_rank')
  -- ============================================================
  for v_def in
    select d.id, d.rank_position
    from public.pickem_prize_definitions d
    where d.event_id = p_event_id
      and d.category = 'general_rank'
      and d.is_active = true
    order by d.rank_position
  loop
    -- Check if already assigned (idempotent)
    if exists (
      select 1 from public.pickem_prize_awards
      where prize_definition_id = v_def.id
        and assignment_status in ('pending', 'assigned')
    ) then
      v_awarded_ids := v_awarded_ids || v_def.id;
      continue;
    end if;

    -- Check for ties at this rank
    if v_has_ties then
      -- Try to get the resolved rank from leaderboard (tiebreaker_draws respected)
      select lb.profile_id into v_profile_id
      from public.get_event_leaderboard(p_event_id) lb
      where lb.rank = v_def.rank_position;

      if v_profile_id is null then
        -- Create pending award
        insert into public.pickem_prize_awards (
          event_id, prize_definition_id, assignment_source, assignment_status
        ) values (
          p_event_id, v_def.id, 'automatic_ranking', 'pending'
        )
        on conflict (prize_definition_id)
        where assignment_status in ('pending', 'assigned')
        do nothing;
        v_skipped_ids := v_skipped_ids || v_def.id;
        continue;
      end if;
    else
      -- No ties: direct rank assignment
      select lb.profile_id into v_profile_id
      from public.get_event_leaderboard(p_event_id) lb
      where lb.rank = v_def.rank_position;

      if v_profile_id is null then
        continue;
      end if;
    end if;

    -- Assign
    insert into public.pickem_prize_awards (
      event_id, prize_definition_id, profile_id, awarded_rank,
      assignment_source, assignment_status, awarded_at
    ) values (
      p_event_id, v_def.id, v_profile_id, v_def.rank_position,
      'automatic_ranking', 'assigned', now()
    )
    on conflict (prize_definition_id)
    where assignment_status in ('pending', 'assigned')
    do update set
      profile_id = excluded.profile_id,
      awarded_rank = excluded.awarded_rank,
      assignment_status = 'assigned',
      awarded_at = now();

    v_awarded_ids := v_awarded_ids || v_def.id;
  end loop;

  -- ============================================================
  -- SUBSCRIBER BENEFIT prizes (category = 'subscriber_benefit')
  -- ============================================================
  for v_def in
    select d.id, d.subscriber_order
    from public.pickem_prize_definitions d
    where d.event_id = p_event_id
      and d.category = 'subscriber_benefit'
      and d.is_active = true
    order by d.subscriber_order
  loop
    -- Check if already assigned
    if exists (
      select 1 from public.pickem_prize_awards
      where prize_definition_id = v_def.id
        and assignment_status in ('pending', 'assigned')
    ) then
      v_awarded_ids := v_awarded_ids || v_def.id;
      continue;
    end if;

    -- Build subscriber ranking (verified subs ordered by leaderboard rank)
    v_assigned := 0;
    for v_profile_id, v_rank, v_sub_verified in
      select lb.profile_id, lb.rank,
        coalesce(ep.subscriber_verification_status = 'verified_sub', false)
      from public.get_event_leaderboard(p_event_id) lb
      left join public.event_participants ep
        on ep.event_id = p_event_id and ep.profile_id = lb.profile_id
      order by lb.rank
    loop
      exit when v_assigned >= 1;

      -- Skip non-verified subscribers
      if not v_sub_verified then
        continue;
      end if;

      -- Stacking check: if 'pass_subscriber_benefit', skip if already has a general prize
      if v_stacking = 'pass_subscriber_benefit' then
        if exists (
          select 1 from public.pickem_prize_awards a
          join public.pickem_prize_definitions d on d.id = a.prize_definition_id
          where a.event_id = p_event_id
            and a.profile_id = v_profile_id
            and a.assignment_status = 'assigned'
            and d.category = 'general_rank'
        ) then
          continue;
        end if;
      end if;

      -- Assign
      insert into public.pickem_prize_awards (
        event_id, prize_definition_id, profile_id,
        subscriber_rank, subscriber_verified,
        assignment_source, assignment_status, awarded_at
      ) values (
        p_event_id, v_def.id, v_profile_id,
        v_def.subscriber_order, true,
        'automatic_subscriber', 'assigned', now()
      )
      on conflict (prize_definition_id)
      where assignment_status in ('pending', 'assigned')
      do update set
        profile_id = excluded.profile_id,
        subscriber_rank = excluded.subscriber_rank,
        subscriber_verified = true,
        assignment_status = 'assigned',
        awarded_at = now();

      v_assigned := 1;
    end loop;

    if v_assigned = 0 then
      insert into public.pickem_prize_awards (
        event_id, prize_definition_id, assignment_source, assignment_status
      ) values (
        p_event_id, v_def.id, 'automatic_subscriber', 'pending'
      )
      on conflict (prize_definition_id)
      where assignment_status in ('pending', 'assigned')
      do nothing;
    end if;
  end loop;

  -- Return result
  select jsonb_build_object(
    'success', true,
    'assigned', (select jsonb_agg(to_jsonb(a))
      from public.pickem_prize_awards a
      where a.event_id = p_event_id
        and a.assignment_status = 'assigned'
        and a.prize_definition_id = any(v_awarded_ids)),
    'pending', (select count(*) from public.pickem_prize_awards
      where event_id = p_event_id and assignment_status = 'pending'),
    'hasTies', v_has_ties
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.assign_pickem_prizes(uuid) to authenticated;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
