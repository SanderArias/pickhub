-- ============================================================================
-- Migration: 00027_tiebreaker_draws
-- Description: Table to store tiebreaker draw results for completed events.
--   When participants have the same total_score, the creator can perform
--   a random draw to determine final ranking order.
-- ============================================================================

create table if not exists tiebreaker_draws (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references events(id) on delete cascade,
  profile_id  uuid        not null references profiles(id) on delete cascade,
  draw_order  integer     not null,
  created_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

alter table tiebreaker_draws enable row level security;

-- Everyone can see tiebreaker draws (needed for leaderboard display)
create policy "Anyone can view tiebreaker draws"
  on tiebreaker_draws for select
  using (true);

-- Only creators of the event can insert/update draws
create policy "Creators can manage tiebreaker draws"
  on tiebreaker_draws for insert
  with check (
    exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id
      and cp.profile_id = auth.uid()
    )
  );

create policy "Creators can update tiebreaker draws"
  on tiebreaker_draws for update
  using (
    exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id
      and cp.profile_id = auth.uid()
    )
  );

-- Grant access
grant select on tiebreaker_draws to authenticated, anon;
grant insert, update on tiebreaker_draws to authenticated;
