-- 00034_flexible_prize_system.sql
-- Description: Flexible multi-prize system replacing fixed subscriber/nonsubscriber tiers.
-- Allows multiple prizes per event with per-prize eligibility, assignment rules, and sorting.

-- Add prize_stacking_policy to events
alter table events
  add column if not exists prize_stacking_policy text
    not null default 'single_prize_per_participant'
    check (prize_stacking_policy in ('single_prize_per_participant', 'allow_multiple_prizes'));

comment on column events.prize_stacking_policy is 'Controls whether a participant can win multiple prizes (allow_multiple_prizes) or at most one (single_prize_per_participant).';

-- Add new columns to event_prizes
alter table event_prizes
  add column if not exists eligibility_type text
    check (eligibility_type in ('all', 'subscribers', 'non_subscribers')),
  add column if not exists assignment_method text
    check (assignment_method in ('ranking'))
    not null default 'ranking',
  add column if not exists eligible_rank_start integer
    not null default 1
    check (eligible_rank_start >= 1),
  add column if not exists sort_order integer;

comment on column event_prizes.eligibility_type is 'Who can win this prize: all participants, only verified subscribers, or only non-subscribers.';
comment on column event_prizes.assignment_method is 'How the winner is selected among eligible participants (ranking = best ranked wins).';
comment on column event_prizes.eligible_rank_start is 'Position within the eligible group to start awarding (1 = best ranked among eligibles).';
comment on column event_prizes.sort_order is 'Processing order for prize assignment. Lower values are assigned first.';

-- Backfill new columns from existing tier data
update event_prizes
set
  eligibility_type = case
    when tier = 'subscriber' then 'subscribers'
    else 'all'
  end,
  assignment_method = 'ranking',
  eligible_rank_start = 1,
  sort_order = case
    when tier = 'subscriber' then 1
    else 2
  end
where eligibility_type is null;

-- Make new columns NOT NULL after backfill
alter table event_prizes
  alter column eligibility_type set not null,
  alter column sort_order set not null;

-- Drop old unique constraint that limited one prize per tier per event
alter table event_prizes
  drop constraint if exists event_prizes_tier_key;

-- Add unique constraint on (event_id, sort_order) for upsert
alter table event_prizes
  add constraint event_prizes_event_id_sort_order_key unique (event_id, sort_order);

-- Index for ordering
create index if not exists idx_event_prizes_sort_order
  on event_prizes (event_id, sort_order);

-- Mark old tier column as deprecated
comment on column event_prizes.tier is '[DEPRECATED] Use eligibility_type instead. Kept for backward compatibility.';

-- Update RPC to support new fields
create or replace function public.upsert_event_prize(
  p_event_id            uuid,
  p_tier                text default null,
  p_label               text default null,
  p_description         text default null,
  p_amount              numeric default null,
  p_currency            text default 'USD',
  p_quantity            integer default 1,
  p_eligibility_type    text default 'all',
  p_assignment_method   text default 'ranking',
  p_eligible_rank_start integer default 1,
  p_sort_order          integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_creator_id uuid;
  v_result jsonb;
  v_tier text;
  v_sort_order integer;
begin
  -- Validate eligibility_type
  if p_eligibility_type not in ('all', 'subscribers', 'non_subscribers') then
    raise exception 'Invalid eligibility_type: %. Must be all, subscribers, or non_subscribers.', p_eligibility_type;
  end if;

  if p_assignment_method != 'ranking' then
    raise exception 'Invalid assignment_method: %. Only ranking is supported.', p_assignment_method;
  end if;

  if p_eligible_rank_start < 1 then
    raise exception 'eligible_rank_start must be >= 1.';
  end if;

  if p_quantity < 1 then
    raise exception 'quantity must be >= 1.';
  end if;

  -- Auto-assign sort_order if not provided
  if p_sort_order is null then
    select coalesce(max(ep.sort_order), 0) + 1 into v_sort_order
    from public.event_prizes ep
    where ep.event_id = p_event_id;
  else
    v_sort_order := p_sort_order;
  end if;

  -- Derive tier for backward compat
  if p_tier is not null then
    if p_tier not in ('subscriber', 'nonsubscriber') then
      raise exception 'Invalid tier: %. Use subscriber or nonsubscriber.', p_tier;
    end if;
    v_tier := p_tier;
  else
    v_tier := case p_eligibility_type
      when 'subscribers' then 'subscriber'
      else 'nonsubscriber'
    end;
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

  -- Upsert using (event_id, sort_order) as conflict target
  insert into public.event_prizes (
    event_id, tier, label, description, amount, currency, quantity,
    eligibility_type, assignment_method, eligible_rank_start, sort_order
  ) values (
    p_event_id, v_tier, p_label, nullif(p_description, ''),
    p_amount, p_currency, p_quantity,
    p_eligibility_type, p_assignment_method, p_eligible_rank_start, v_sort_order
  )
  on conflict (event_id, sort_order)
  do update set
    label               = excluded.label,
    description         = excluded.description,
    amount              = excluded.amount,
    currency            = excluded.currency,
    quantity            = excluded.quantity,
    tier                = excluded.tier,
    eligibility_type    = excluded.eligibility_type,
    assignment_method   = excluded.assignment_method,
    eligible_rank_start = excluded.eligible_rank_start
  returning to_jsonb(event_prizes.*) into v_result;

  return v_result;
end;
$$;

grant execute on function public.upsert_event_prize(uuid, text, text, text, numeric, text, integer, text, text, integer, integer) to authenticated;
