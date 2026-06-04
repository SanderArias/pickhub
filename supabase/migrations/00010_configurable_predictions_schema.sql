-- ============================================================================
-- PickHub – Configurable Predictions Schema
-- Migration: 00011_configurable_predictions_schema
-- ============================================================================
-- Replaces the rigid pickem_options/submissions model with a flexible system
-- where creators configure players, questions, and options per event.
--
-- Legacy tables (deprecated, not dropped):
--   pickem_options      → replaced by prediction_questions + prediction_options
--   submissions         → kept as entry entity, answers move to prediction_answers
--   submission_items    → replaced by prediction_answers
--   official_results    → replaced by prediction_results
--   scoring_rules       → replaced by question-level points_per_correct
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. event_players
-- ------------------------------------------------------------------
create table if not exists event_players (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references events(id) on delete cascade,
  name        text        not null,
  seed        integer,
  image_url   text,
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  unique (event_id, name)
);

comment on table event_players is 'Players or teams competing in an event, configured by the creator.';

alter table event_players enable row level security;

-- ------------------------------------------------------------------
-- 2. prediction_questions
-- ------------------------------------------------------------------
create table if not exists prediction_questions (
  id                  uuid        primary key default gen_random_uuid(),
  event_id            uuid        not null references events(id) on delete cascade,
  title               text        not null,
  description         text,
  question_type       text        not null check (question_type in ('single', 'multiple')),
  pick_type           text        not null default 'player' check (pick_type in ('player', 'custom')),
  max_selections      integer,
  points_per_correct  integer     not null default 1,
  sort_order          integer     not null default 0,
  is_active           boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_prediction_questions_updated_at
  before update on prediction_questions
  for each row execute function update_updated_at();

comment on table prediction_questions is
  'A configurable prediction prompt within an event (e.g. "Pick the Top 8").';

alter table prediction_questions enable row level security;

-- ------------------------------------------------------------------
-- 3. prediction_options
-- ------------------------------------------------------------------
create table if not exists prediction_options (
  id          uuid        primary key default gen_random_uuid(),
  question_id uuid        not null references prediction_questions(id) on delete cascade,
  player_id   uuid        references event_players(id) on delete set null,
  label       text        not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  unique (question_id, label)
);

comment on table prediction_options is
  'An answer choice for a prediction question. Links to a player or uses a custom label.';

alter table prediction_options enable row level security;

-- ------------------------------------------------------------------
-- 4. prediction_answers
-- ------------------------------------------------------------------
create table if not exists prediction_answers (
  id              uuid        primary key default gen_random_uuid(),
  submission_id   uuid        not null references submissions(id) on delete cascade,
  question_id     uuid        not null references prediction_questions(id) on delete cascade,
  option_id       uuid        not null references prediction_options(id) on delete cascade,
  selected_order  integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (submission_id, question_id, option_id)
);

create trigger trg_prediction_answers_updated_at
  before update on prediction_answers
  for each row execute function update_updated_at();

comment on table prediction_answers is
  'A user''s selected option within a submission. One row per selected option per question.';

alter table prediction_answers enable row level security;

-- ------------------------------------------------------------------
-- 5. prediction_results
-- ------------------------------------------------------------------
create table if not exists prediction_results (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references events(id) on delete cascade,
  question_id  uuid        not null references prediction_questions(id) on delete cascade,
  option_id    uuid        not null references prediction_options(id) on delete cascade,
  is_correct   boolean     not null default true,
  created_by   uuid        references profiles(id),
  created_at   timestamptz not null default now(),
  unique (question_id, option_id)
);

comment on table prediction_results is
  'Marked by the creator after the event. Flags which options were correct for scoring.';

alter table prediction_results enable row level security;

-- ------------------------------------------------------------------
-- 6. prediction_scores
-- ------------------------------------------------------------------
create table if not exists prediction_scores (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references events(id) on delete cascade,
  profile_id    uuid        not null references profiles(id) on delete cascade,
  submission_id uuid        not null references submissions(id) on delete cascade,
  question_id   uuid        not null references prediction_questions(id) on delete cascade,
  correct_count integer     not null default 0,
  total_points  integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (event_id, profile_id, question_id)
);

create trigger trg_prediction_scores_updated_at
  before update on prediction_scores
  for each row execute function update_updated_at();

comment on table prediction_scores is
  'Cached per-question score for a participant. Recalculated when results are published.';

alter table prediction_scores enable row level security;

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_event_players_event_id on event_players (event_id);
create index if not exists idx_event_players_sort on event_players (event_id, sort_order);

create index if not exists idx_prediction_questions_event_id on prediction_questions (event_id);
create index if not exists idx_prediction_questions_sort on prediction_questions (event_id, sort_order);

create index if not exists idx_prediction_options_question_id on prediction_options (question_id);

create index if not exists idx_prediction_answers_submission_id on prediction_answers (submission_id);
create index if not exists idx_prediction_answers_question_id on prediction_answers (question_id);
create index if not exists idx_prediction_answers_event_profile
  on prediction_answers (submission_id, question_id);

create index if not exists idx_prediction_results_event_id on prediction_results (event_id);
create index if not exists idx_prediction_results_question_id on prediction_results (question_id);

create index if not exists idx_prediction_scores_event_id on prediction_scores (event_id);
create index if not exists idx_prediction_scores_profile_id on prediction_scores (profile_id);
create index if not exists idx_prediction_scores_event_profile
  on prediction_scores (event_id, profile_id);

-- ============================================================================
-- Grants
-- ============================================================================

grant select, insert, update, delete on event_players to authenticated;
grant select, insert, update, delete on prediction_questions to authenticated;
grant select, insert, update, delete on prediction_options to authenticated;
grant select, insert, update, delete on prediction_answers to authenticated;
grant select, insert, update, delete on prediction_results to authenticated;
grant select, insert, update, delete on prediction_scores to authenticated;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- event_players: any authenticated can read; creator of the owning event can write
do $$ begin
  drop policy if exists "Anyone can read event_players" on event_players;
  create policy "Anyone can read event_players"
    on event_players for select
    using (auth.role() = 'authenticated');
end; $$;

do $$ begin
  drop policy if exists "Creator can insert event_players" on event_players;
  create policy "Creator can insert event_players"
    on event_players for insert
    with check (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can update event_players" on event_players;
  create policy "Creator can update event_players"
    on event_players for update
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can delete event_players" on event_players;
  create policy "Creator can delete event_players"
    on event_players for delete
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

-- prediction_questions: any authenticated can read; creator writes
do $$ begin
  drop policy if exists "Anyone can read prediction_questions" on prediction_questions;
  create policy "Anyone can read prediction_questions"
    on prediction_questions for select
    using (auth.role() = 'authenticated');
end; $$;

do $$ begin
  drop policy if exists "Creator can insert prediction_questions" on prediction_questions;
  create policy "Creator can insert prediction_questions"
    on prediction_questions for insert
    with check (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can update prediction_questions" on prediction_questions;
  create policy "Creator can update prediction_questions"
    on prediction_questions for update
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can delete prediction_questions" on prediction_questions;
  create policy "Creator can delete prediction_questions"
    on prediction_questions for delete
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

-- prediction_options: any authenticated can read; creator writes
do $$ begin
  drop policy if exists "Anyone can read prediction_options" on prediction_options;
  create policy "Anyone can read prediction_options"
    on prediction_options for select
    using (auth.role() = 'authenticated');
end; $$;

do $$ begin
  drop policy if exists "Creator can insert prediction_options" on prediction_options;
  create policy "Creator can insert prediction_options"
    on prediction_options for insert
    with check (exists (
      select 1 from prediction_questions pq
      join events e on e.id = pq.event_id
      join creator_profiles cp on cp.id = e.creator_id
      where pq.id = question_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can update prediction_options" on prediction_options;
  create policy "Creator can update prediction_options"
    on prediction_options for update
    using (exists (
      select 1 from prediction_questions pq
      join events e on e.id = pq.event_id
      join creator_profiles cp on cp.id = e.creator_id
      where pq.id = question_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can delete prediction_options" on prediction_options;
  create policy "Creator can delete prediction_options"
    on prediction_options for delete
    using (exists (
      select 1 from prediction_questions pq
      join events e on e.id = pq.event_id
      join creator_profiles cp on cp.id = e.creator_id
      where pq.id = question_id and cp.profile_id = auth.uid()
    ));
end; $$;

-- prediction_answers: submission owner can CRUD
do $$ begin
  drop policy if exists "Submission owner can read prediction_answers" on prediction_answers;
  create policy "Submission owner can read prediction_answers"
    on prediction_answers for select
    using (exists (
      select 1 from submissions s
      join event_participants ep on ep.id = s.participant_id
      where s.id = submission_id and ep.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Submission owner can insert prediction_answers" on prediction_answers;
  create policy "Submission owner can insert prediction_answers"
    on prediction_answers for insert
    with check (exists (
      select 1 from submissions s
      join event_participants ep on ep.id = s.participant_id
      where s.id = submission_id and ep.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Submission owner can update prediction_answers" on prediction_answers;
  create policy "Submission owner can update prediction_answers"
    on prediction_answers for update
    using (exists (
      select 1 from submissions s
      join event_participants ep on ep.id = s.participant_id
      where s.id = submission_id and ep.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Submission owner can delete prediction_answers" on prediction_answers;
  create policy "Submission owner can delete prediction_answers"
    on prediction_answers for delete
    using (exists (
      select 1 from submissions s
      join event_participants ep on ep.id = s.participant_id
      where s.id = submission_id and ep.profile_id = auth.uid()
    ));
end; $$;

-- prediction_results: any authenticated can read; creator writes
do $$ begin
  drop policy if exists "Anyone can read prediction_results" on prediction_results;
  create policy "Anyone can read prediction_results"
    on prediction_results for select
    using (auth.role() = 'authenticated');
end; $$;

do $$ begin
  drop policy if exists "Creator can insert prediction_results" on prediction_results;
  create policy "Creator can insert prediction_results"
    on prediction_results for insert
    with check (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can update prediction_results" on prediction_results;
  create policy "Creator can update prediction_results"
    on prediction_results for update
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

do $$ begin
  drop policy if exists "Creator can delete prediction_results" on prediction_results;
  create policy "Creator can delete prediction_results"
    on prediction_results for delete
    using (exists (
      select 1 from events e
      join creator_profiles cp on cp.id = e.creator_id
      where e.id = event_id and cp.profile_id = auth.uid()
    ));
end; $$;

-- prediction_scores: read own scores or creator of the event
do $$ begin
  drop policy if exists "Users can read their own prediction_scores" on prediction_scores;
  create policy "Users can read their own prediction_scores"
    on prediction_scores for select
    using (
      profile_id = auth.uid()
      or exists (
        select 1 from events e
        join creator_profiles cp on cp.id = e.creator_id
        where e.id = event_id and cp.profile_id = auth.uid()
      )
    );
end; $$;

do $$ begin
  drop policy if exists "System can insert prediction_scores" on prediction_scores;
  create policy "System can insert prediction_scores"
    on prediction_scores for insert
    with check (auth.role() = 'authenticated');
end; $$;

do $$ begin
  drop policy if exists "System can update prediction_scores" on prediction_scores;
  create policy "System can update prediction_scores"
    on prediction_scores for update
    using (auth.role() = 'authenticated');
end; $$;
