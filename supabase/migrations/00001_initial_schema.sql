-- ============================================================================
-- PickHub – Initial Schema
-- Migration: 00001_initial_schema
-- ============================================================================
-- This migration creates the base schema for PickHub:
--   profiles, creator_profiles, dynamic_types, event_templates, events,
--   event_access_codes, event_participants, pickem_options, submissions,
--   submission_items, official_results, scoring_rules, leaderboards,
--   raffles, raffle_entries, raffle_winners, twitch_connections,
--   receipt_assets.
--
-- It also seeds the dynamic_types lookup table and enables Row Level Security
-- with conservative initial policies.
-- ============================================================================

-- ------------------------------------------------------------------
-- Helper: auto-update updated_at
-- ------------------------------------------------------------------
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- 1. profiles
-- ------------------------------------------------------------------
create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;

create policy "Profiles are visible to authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------------
-- 2. creator_profiles
-- ------------------------------------------------------------------
create table creator_profiles (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null unique references profiles(id) on delete cascade,
  handle      text        not null unique,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_creator_profiles_updated_at
  before update on creator_profiles
  for each row execute function update_updated_at();

-- RLS
alter table creator_profiles enable row level security;

create policy "Creator profiles are visible to authenticated users"
  on creator_profiles for select
  using (auth.role() = 'authenticated');

create policy "Creators can update their own profile"
  on creator_profiles for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- TODO: allow_insert policy once registration flow is defined
-- create policy "Authenticated users can create their creator profile"
--   on creator_profiles for insert
--   with check (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- 3. dynamic_types
-- ------------------------------------------------------------------
create table dynamic_types (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  description text,
  is_enabled  boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- RLS
alter table dynamic_types enable row level security;

create policy "Dynamic types are publicly readable"
  on dynamic_types for select
  using (true);

-- ------------------------------------------------------------------
-- 4. event_templates
-- ------------------------------------------------------------------
create table event_templates (
  id              uuid        primary key default gen_random_uuid(),
  creator_id      uuid        not null references creator_profiles(id) on delete cascade,
  dynamic_type_id uuid        not null references dynamic_types(id) on delete restrict,
  name            text        not null,
  description     text,
  config          jsonb       not null default '{}',
  is_public       boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_event_templates_updated_at
  before update on event_templates
  for each row execute function update_updated_at();

-- RLS
alter table event_templates enable row level security;

create policy "Public templates are readable by authenticated users"
  on event_templates for select
  using (is_public = true or auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

create policy "Creators can insert their own templates"
  on event_templates for insert
  with check (auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

create policy "Creators can update their own templates"
  on event_templates for update
  using (auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

create policy "Creators can delete their own templates"
  on event_templates for delete
  using (auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

-- ------------------------------------------------------------------
-- 5. events
-- ------------------------------------------------------------------
create table events (
  id                uuid        primary key default gen_random_uuid(),
  creator_id        uuid        not null references creator_profiles(id) on delete cascade,
  dynamic_type_id   uuid        not null references dynamic_types(id) on delete restrict,
  template_id       uuid        references event_templates(id) on delete set null,
  title             text        not null,
  slug              text        not null,
  description       text,
  status            text        not null default 'draft'
                                check (status in ('draft', 'published', 'active', 'closed', 'archived')),
  event_config      jsonb       not null default '{}',
  scoring_config    jsonb       not null default '{}',
  starts_at         timestamptz,
  ends_at           timestamptz,
  max_participants  integer,
  is_public         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (creator_id, slug)
);

create trigger trg_events_updated_at
  before update on events
  for each row execute function update_updated_at();

-- RLS
alter table events enable row level security;

create policy "Public events are readable by authenticated users"
  on events for select
  using (is_public = true or auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

create policy "Creators can insert events"
  on events for insert
  with check (auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

create policy "Creators can update their own events"
  on events for update
  using (auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

create policy "Creators can delete their own events"
  on events for delete
  using (auth.uid() = (
    select cp.profile_id from creator_profiles cp where cp.id = creator_id
  ));

-- ------------------------------------------------------------------
-- 6. event_access_codes
-- ------------------------------------------------------------------
create table event_access_codes (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references events(id) on delete cascade,
  code        text        not null,
  max_uses    integer,
  use_count   integer     not null default 0,
  expires_at  timestamptz,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- RLS
alter table event_access_codes enable row level security;

create policy "Access codes are visible to the event creator"
  on event_access_codes for select
  using (auth.uid() = (
    select cp.profile_id from events e
    join creator_profiles cp on cp.id = e.creator_id
    where e.id = event_id
  ));

-- TODO: insert/update/delete policies for event creators

-- ------------------------------------------------------------------
-- 7. event_participants
-- ------------------------------------------------------------------
create table event_participants (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references events(id) on delete cascade,
  profile_id   uuid        not null references profiles(id) on delete cascade,
  status       text        not null default 'registered'
                           check (status in ('registered', 'active', 'disqualified', 'removed')),
  joined_at    timestamptz not null default now(),
  unique (event_id, profile_id)
);

-- RLS
alter table event_participants enable row level security;

create policy "Participants are visible to event participants and creator"
  on event_participants for select
  using (
    auth.uid() = profile_id
    or auth.uid() = (
      select cp.profile_id from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id
    )
  );

create policy "Users can join public events"
  on event_participants for insert
  with check (auth.uid() = profile_id);

-- TODO: allow creator to remove/disqualify participants
-- TODO: allow creator to view all participants

-- ------------------------------------------------------------------
-- 8. pickem_options
-- ------------------------------------------------------------------
create table pickem_options (
  id                uuid        primary key default gen_random_uuid(),
  event_id          uuid        not null references events(id) on delete cascade,
  label             text        not null,
  options           jsonb       not null default '[]',
  correct_option_id uuid,
  points            integer     not null default 1,
  sort_order        integer     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_pickem_options_updated_at
  before update on pickem_options
  for each row execute function update_updated_at();

-- RLS
alter table pickem_options enable row level security;

create policy "Pick'em options are visible to event participants and creator"
  on pickem_options for select
  using (
    auth.uid() in (
      select ep.profile_id from event_participants ep where ep.event_id = pickem_options.event_id
    )
    or auth.uid() = (
      select cp.profile_id from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = pickem_options.event_id
    )
  );

-- TODO: insert/update/delete policies for event creators

-- ------------------------------------------------------------------
-- 9. submissions
-- ------------------------------------------------------------------
create table submissions (
  id             uuid        primary key default gen_random_uuid(),
  event_id       uuid        not null references events(id) on delete cascade,
  participant_id uuid        not null references event_participants(id) on delete cascade,
  status         text        not null default 'draft'
                             check (status in ('draft', 'submitted', 'scored')),
  total_score    integer,
  submitted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_submissions_updated_at
  before update on submissions
  for each row execute function update_updated_at();

-- RLS
alter table submissions enable row level security;

create policy "Users can see their own submissions"
  on submissions for select
  using (auth.uid() = (
    select ep.profile_id from event_participants ep where ep.id = participant_id
  ));

create policy "Creators can see submissions for their events"
  on submissions for select
  using (auth.uid() = (
    select cp.profile_id from events e
    join creator_profiles cp on cp.id = e.creator_id
    where e.id = event_id
  ));

create policy "Users can insert their own submissions"
  on submissions for insert
  with check (auth.uid() = (
    select ep.profile_id from event_participants ep where ep.id = participant_id
  ));

create policy "Users can update their own draft submissions"
  on submissions for update
  using (
    auth.uid() = (select ep.profile_id from event_participants ep where ep.id = participant_id)
    and status = 'draft'
  );

-- ------------------------------------------------------------------
-- 10. submission_items
-- ------------------------------------------------------------------
create table submission_items (
  id                uuid        primary key default gen_random_uuid(),
  submission_id     uuid        not null references submissions(id) on delete cascade,
  pickem_option_id  uuid        not null references pickem_options(id) on delete cascade,
  selected_option_id uuid,
  is_correct        boolean,
  points_earned     integer     default 0,
  created_at        timestamptz not null default now()
);

-- RLS
alter table submission_items enable row level security;

create policy "Submission items follow submission visibility"
  on submission_items for select
  using (exists (
    select 1 from submissions s
    join event_participants ep on ep.id = s.participant_id
    where s.id = submission_id
    and (ep.profile_id = auth.uid() or auth.uid() = (
      select cp.profile_id from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = s.event_id
    ))
  ));

create policy "Users can insert items to their own draft submissions"
  on submission_items for insert
  with check (exists (
    select 1 from submissions s
    join event_participants ep on ep.id = s.participant_id
    where s.id = submission_id
    and ep.profile_id = auth.uid()
    and s.status = 'draft'
  ));

-- ------------------------------------------------------------------
-- 11. official_results
-- ------------------------------------------------------------------
create table official_results (
  id                uuid        primary key default gen_random_uuid(),
  event_id          uuid        not null references events(id) on delete cascade,
  pickem_option_id  uuid        not null references pickem_options(id) on delete cascade,
  correct_option_id uuid        not null,
  is_final          boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_official_results_updated_at
  before update on official_results
  for each row execute function update_updated_at();

-- RLS
alter table official_results enable row level security;

create policy "Official results are visible to event participants and creator"
  on official_results for select
  using (exists (
    select 1 from events e
    left join creator_profiles cp on cp.id = e.creator_id
    left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
    where e.id = event_id
    and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
  ));

-- TODO: insert/update policies limited to event creators

-- ------------------------------------------------------------------
-- 12. scoring_rules
-- ------------------------------------------------------------------
create table scoring_rules (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references events(id) on delete cascade,
  rule_type   text        not null,
  config      jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_scoring_rules_updated_at
  before update on scoring_rules
  for each row execute function update_updated_at();

-- RLS
alter table scoring_rules enable row level security;

create policy "Scoring rules are visible to event participants and creator"
  on scoring_rules for select
  using (exists (
    select 1 from events e
    left join creator_profiles cp on cp.id = e.creator_id
    left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
    where e.id = event_id
    and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
  ));

-- TODO: insert/update/delete policies limited to event creators

-- ------------------------------------------------------------------
-- 13. leaderboards
-- ------------------------------------------------------------------
create table leaderboards (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references events(id) on delete cascade,
  profile_id  uuid        not null references profiles(id) on delete cascade,
  total_score integer     not null default 0,
  rank        integer,
  metadata    jsonb       not null default '{}',
  updated_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

create trigger trg_leaderboards_updated_at
  before update on leaderboards
  for each row execute function update_updated_at();

-- RLS
alter table leaderboards enable row level security;

create policy "Leaderboards are visible to event participants and creator"
  on leaderboards for select
  using (exists (
    select 1 from events e
    left join creator_profiles cp on cp.id = e.creator_id
    left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
    where e.id = event_id
    and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
  ));

-- TODO: insert/update policies (populated by scoring engine)

-- ------------------------------------------------------------------
-- 14. raffles
-- ------------------------------------------------------------------
create table raffles (
  id                 uuid        primary key default gen_random_uuid(),
  event_id           uuid        not null references events(id) on delete cascade,
  prize_description  text        not null,
  prize_image_url    text,
  winner_count       integer     not null default 1,
  draw_at            timestamptz,
  drawn_at           timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger trg_raffles_updated_at
  before update on raffles
  for each row execute function update_updated_at();

-- RLS
alter table raffles enable row level security;

create policy "Raffles are visible to event participants and creator"
  on raffles for select
  using (exists (
    select 1 from events e
    left join creator_profiles cp on cp.id = e.creator_id
    left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
    where e.id = event_id
    and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
  ));

-- TODO: insert/update/delete policies limited to event creators

-- ------------------------------------------------------------------
-- 15. raffle_entries
-- ------------------------------------------------------------------
create table raffle_entries (
  id           uuid        primary key default gen_random_uuid(),
  raffle_id    uuid        not null references raffles(id) on delete cascade,
  profile_id   uuid        not null references profiles(id) on delete cascade,
  ticket_number text,
  created_at   timestamptz not null default now(),
  unique (raffle_id, profile_id)
);

-- RLS
alter table raffle_entries enable row level security;

create policy "Users can see their own raffle entries"
  on raffle_entries for select
  using (auth.uid() = profile_id);

create policy "Creators can see entries for their raffles"
  on raffle_entries for select
  using (exists (
    select 1 from raffles r
    join events e on e.id = r.event_id
    join creator_profiles cp on cp.id = e.creator_id
    where r.id = raffle_id
    and cp.profile_id = auth.uid()
  ));

create policy "Users can enter raffles"
  on raffle_entries for insert
  with check (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- 16. raffle_winners
-- ------------------------------------------------------------------
create table raffle_winners (
  id             uuid        primary key default gen_random_uuid(),
  raffle_id      uuid        not null references raffles(id) on delete cascade,
  profile_id     uuid        not null references profiles(id) on delete cascade,
  prize_position integer     not null,
  claimed_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (raffle_id, prize_position)
);

-- RLS
alter table raffle_winners enable row level security;

create policy "Raffle winners are visible to all event participants and creator"
  on raffle_winners for select
  using (exists (
    select 1 from raffles r
    join events e on e.id = r.event_id
    left join creator_profiles cp on cp.id = e.creator_id
    left join event_participants ep on ep.event_id = e.id and ep.profile_id = auth.uid()
    where r.id = raffle_id
    and (cp.profile_id = auth.uid() or ep.profile_id = auth.uid())
  ));

-- TODO: insert policy (populated by raffle draw process, restricted to creator)

-- ------------------------------------------------------------------
-- 17. twitch_connections
-- ------------------------------------------------------------------
create table twitch_connections (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null unique references profiles(id) on delete cascade,
  access_token       text        not null,
  refresh_token      text,
  token_expires_at   timestamptz,
  twitch_user_id     text        not null,
  twitch_display_name text,
  is_connected       boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger trg_twitch_connections_updated_at
  before update on twitch_connections
  for each row execute function update_updated_at();

-- RLS
alter table twitch_connections enable row level security;

create policy "Users can manage their own Twitch connection"
  on twitch_connections for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own Twitch connection"
  on twitch_connections for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own Twitch connection"
  on twitch_connections for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users can delete their own Twitch connection"
  on twitch_connections for delete
  using (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- 18. receipt_assets
-- ------------------------------------------------------------------
create table receipt_assets (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        references events(id) on delete cascade,
  submission_id uuid        references submissions(id) on delete cascade,
  profile_id    uuid        not null references profiles(id) on delete cascade,
  storage_path  text        not null,
  mime_type     text,
  file_size     integer,
  created_at    timestamptz not null default now()
);

-- RLS
alter table receipt_assets enable row level security;

create policy "Users can see their own receipt assets"
  on receipt_assets for select
  using (auth.uid() = profile_id);

create policy "Creators can see assets for their events"
  on receipt_assets for select
  using (exists (
    select 1 from events e
    join creator_profiles cp on cp.id = e.creator_id
    where e.id = event_id
    and cp.profile_id = auth.uid()
  ));

create policy "Users can upload their own receipt assets"
  on receipt_assets for insert
  with check (auth.uid() = profile_id);

-- ============================================================================
-- Indexes
-- ============================================================================

-- profiles
create index idx_profiles_display_name on profiles (display_name);

-- creator_profiles
create index idx_creator_profiles_handle on creator_profiles (handle);

-- events
create index idx_events_creator_id on events (creator_id);
create index idx_events_dynamic_type_id on events (dynamic_type_id);
create index idx_events_slug on events (slug);
create index idx_events_status on events (status);

-- event_access_codes
create index idx_event_access_codes_event_id on event_access_codes (event_id);
create index idx_event_access_codes_code on event_access_codes (code);

-- event_participants
create index idx_event_participants_event_id on event_participants (event_id);
create index idx_event_participants_profile_id on event_participants (profile_id);

-- pickem_options
create index idx_pickem_options_event_id on pickem_options (event_id);

-- submissions
create index idx_submissions_event_id on submissions (event_id);
create index idx_submissions_participant_id on submissions (participant_id);

-- submission_items
create index idx_submission_items_submission_id on submission_items (submission_id);
create index idx_submission_items_pickem_option_id on submission_items (pickem_option_id);

-- official_results
create index idx_official_results_event_id on official_results (event_id);
create index idx_official_results_pickem_option_id on official_results (pickem_option_id);

-- leaderboards
create index idx_leaderboards_event_id on leaderboards (event_id);
create index idx_leaderboards_profile_id on leaderboards (profile_id);

-- raffles
create index idx_raffles_event_id on raffles (event_id);

-- raffle_entries
create index idx_raffle_entries_raffle_id on raffle_entries (raffle_id);
create index idx_raffle_entries_profile_id on raffle_entries (profile_id);

-- raffle_winners
create index idx_raffle_winners_raffle_id on raffle_winners (raffle_id);

-- twitch_connections
create index idx_twitch_connections_profile_id on twitch_connections (profile_id);

-- receipt_assets
create index idx_receipt_assets_event_id on receipt_assets (event_id);
create index idx_receipt_assets_submission_id on receipt_assets (submission_id);
create index idx_receipt_assets_profile_id on receipt_assets (profile_id);

-- ============================================================================
-- Seed data
-- ============================================================================

insert into dynamic_types (slug, name, description) values
  ('pickem',  'Pick''em',  'Predicciones de resultados en torneos');
