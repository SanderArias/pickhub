-- ============================================================================
-- PickHub – Pick'em v1: Twitch Auth & Prize Tiers
-- Migration: 00002_pickem_twitch_rewards
-- ============================================================================
-- Adjusts the schema for the real MVP scope:
--   1. UNIQUE(event_id, participant_id) on submissions.
--   2. is_subscriber + subscriber_verified_at on event_participants.
--   3. scopes column on twitch_connections.
--   4. event_prizes table (subscriber / non-subscriber prize tiers).
--   5. prize_winners table (assignments after scoring).
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. UNIQUE constraint on submissions
-- ------------------------------------------------------------------
-- Ensures one submission per participant per event (prevents duplicates).
-- Cleanup uses ORDER BY id LIMIT 1 instead of min(uuid), which PG does not support.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'submissions_event_participant_unique'
      and conrelid = 'submissions'::regclass
  ) then
    alter table submissions
      add constraint submissions_event_participant_unique
      unique (event_id, participant_id);
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 2. Subscriber tracking on event_participants
-- ------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'event_participants' and column_name = 'is_subscriber'
  ) then
    alter table event_participants add column is_subscriber boolean;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'event_participants' and column_name = 'subscriber_verified_at'
  ) then
    alter table event_participants add column subscriber_verified_at timestamptz;
  end if;
end;
$$;

comment on column event_participants.is_subscriber is
  'Whether the participant was a Twitch subscriber of the creator''s channel at verification time.';

comment on column event_participants.subscriber_verified_at is
  'Timestamp of the last subscriber-status check via Twitch API.';

-- ------------------------------------------------------------------
-- 3. OAuth scopes on twitch_connections
-- ------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'twitch_connections' and column_name = 'scopes'
  ) then
    alter table twitch_connections
      add column scopes jsonb not null default '[]'::jsonb;
  end if;
end;
$$;

comment on column twitch_connections.scopes is
  'Twitch OAuth scopes granted by the user during authorization.';

-- ------------------------------------------------------------------
-- 4. event_prizes table
-- ------------------------------------------------------------------

create table if not exists event_prizes (
  id          uuid             primary key default gen_random_uuid(),
  event_id    uuid             not null references events(id) on delete cascade,
  tier        text             not null check (tier in ('subscriber', 'nonsubscriber')),
  label       text             not null,
  description text,
  amount      numeric(10,2),
  currency    text             default 'USD',
  quantity    integer          not null default 1,
  created_at  timestamptz      not null default now(),
  unique (event_id, tier)
);

comment on table event_prizes is
  'Prize tiers configured by the creator for an event. One row per tier.';

comment on column event_prizes.tier is
  'Which audience tier the prize is for: subscriber or nonsubscriber.';

comment on column event_prizes.amount is
  'Monetary value of the prize (optional, e.g. for gift cards).';

comment on column event_prizes.quantity is
  'How many winners this tier has (default 1).';

-- RLS
alter table event_prizes enable row level security;

do $$ begin
  drop policy if exists "Event prizes are visible to event participants and creator" on event_prizes;
  create policy "Event prizes are visible to event participants and creator"
    on event_prizes for select
    using (exists (
      select 1 from events e
      left join creator_profiles cp on cp.id = e.creator_id
      left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
      where e.id = event_id
      and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
    ));
end; $$;

do $$ begin
  drop policy if exists "Creators can insert prizes for their events" on event_prizes;
  create policy "Creators can insert prizes for their events"
    on event_prizes for insert
    with check (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id
      and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creators can update prizes for their events" on event_prizes;
  create policy "Creators can update prizes for their events"
    on event_prizes for update
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id
      and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creators can delete prizes for their events" on event_prizes;
  create policy "Creators can delete prizes for their events"
    on event_prizes for delete
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id
      and cp.profile_id = auth.uid()
    ));
end; $$;

-- ------------------------------------------------------------------
-- 5. prize_winners table
-- ------------------------------------------------------------------

create table if not exists prize_winners (
  id             uuid        primary key default gen_random_uuid(),
  event_prize_id uuid        not null references event_prizes(id) on delete cascade,
  profile_id     uuid        not null references profiles(id) on delete cascade,
  rank_achieved  integer,
  claimed_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (event_prize_id, profile_id)
);

comment on table prize_winners is
  'Records which participant won which prize tier after scoring.';

comment on column prize_winners.rank_achieved is
  'The participant''s final rank in the event leaderboard when assigned.';

comment on column prize_winners.claimed_at is
  'Timestamp when the winner claimed their prize (null = not yet claimed).';

-- RLS
alter table prize_winners enable row level security;

do $$ begin
  drop policy if exists "Prize winners are visible to event participants and creator" on prize_winners;
  create policy "Prize winners are visible to event participants and creator"
    on prize_winners for select
    using (exists (
      select 1 from event_prizes epz
      join events e on e.id = epz.event_id
      left join creator_profiles cp on cp.id = e.creator_id
      left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
      where epz.id = event_prize_id
      and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
    ));
end; $$;

do $$ begin
  drop policy if exists "Creators can assign prize winners" on prize_winners;
  create policy "Creators can assign prize winners"
    on prize_winners for insert
    with check (exists (
      select 1 from event_prizes epz
      join events e on e.id = epz.event_id
      join creator_profiles cp on cp.id = e.creator_id
      where epz.id = event_prize_id
      and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creators can update prize winners" on prize_winners;
  create policy "Creators can update prize winners"
    on prize_winners for update
    using (exists (
      select 1 from event_prizes epz
      join events e on e.id = epz.event_id
      join creator_profiles cp on cp.id = e.creator_id
      where epz.id = event_prize_id
      and cp.profile_id = auth.uid()
    ));
end; $$;

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------

create index if not exists idx_event_prizes_event_id on event_prizes (event_id);
create index if not exists idx_prize_winners_event_prize_id on prize_winners (event_prize_id);
create index if not exists idx_prize_winners_profile_id on prize_winners (profile_id);
