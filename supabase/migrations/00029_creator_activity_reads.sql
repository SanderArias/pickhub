-- ============================================================================
-- PickHub – Creator activity read tracking
-- Migration: 00029_creator_activity_reads
-- ============================================================================
-- Tracks when a creator last visited their activity feed so the sidebar badge
-- can show unread activity counts and the activity page can highlight newly
-- submitted participations.
-- ============================================================================

create table if not exists creator_activity_reads (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null references profiles(id) on delete cascade,
  last_seen_at       timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique(profile_id)
);

alter table creator_activity_reads enable row level security;

-- RLS: users can read their own record
create policy "Users can read own activity read marker"
  on creator_activity_reads for select
  using (auth.uid() = profile_id);

-- RLS: users can insert their own record
create policy "Users can insert own activity read marker"
  on creator_activity_reads for insert
  with check (auth.uid() = profile_id);

-- RLS: users can update their own record
create policy "Users can update own activity read marker"
  on creator_activity_reads for update
  using (auth.uid() = profile_id);

grant select, insert, update on public.creator_activity_reads to authenticated;
