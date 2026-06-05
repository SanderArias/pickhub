-- ============================================================================
-- PickHub – Add template_type, config, and ranking support for predictions
-- Migration: 00022_add_template_and_ranking
-- ============================================================================
-- Adds support for native/ template predictions like "Top 8 ordenado".
-- Templates have their own UI, scoring, and config instead of manual setup.
-- ============================================================================

-- Add columns to prediction_questions
alter table prediction_questions
  add column if not exists template_type text;

alter table prediction_questions
  add column if not exists config jsonb not null default '{}'::jsonb;

-- Allow 'ranking' in question_type check
alter table prediction_questions
  drop constraint if exists prediction_questions_question_type_check;

alter table prediction_questions
  add constraint prediction_questions_question_type_check
  check (question_type in ('single', 'multiple', 'ranking'));

comment on column prediction_questions.template_type is
  'Native template slug (e.g. top8_ordered). When set, the template defines its own UI and scoring.';

comment on column prediction_questions.config is
  'Template-specific configuration (e.g. {"positions":8, "scoring":"exact_position_percentage"})';

-- Add position column to prediction_answers (for ranking/top8)
alter table prediction_answers
  add column if not exists position integer;

comment on column prediction_answers.position is
  'Position in a ranking answer (e.g. 1-8 for top8_ordered). Null for single/multiple.';

-- Add position column to prediction_results (for ranking/top8)
alter table prediction_results
  add column if not exists position integer;

comment on column prediction_results.position is
  'Position in a ranking result (e.g. 1-8 for top8_ordered). Null for single/multiple.';

-- Allow position uniqueness per submission+question for ranking questions
-- (null positions are treated as distinct in PG, so this doesn't affect single/multiple)
alter table prediction_answers
  drop constraint if exists prediction_answers_position_unique;

alter table prediction_answers
  add constraint prediction_answers_position_unique
  unique (submission_id, question_id, position);
