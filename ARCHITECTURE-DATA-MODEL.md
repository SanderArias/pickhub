# Data Model Architecture — PickHub

> **Date:** 2026-06-07
> **Scope:** Complete database schema analysis: table inventory, column-by-column audit of the `events` table, domain classification of every table, assessment of `event_participants` and `event_prizes` for generality, proposed target model, incremental migration strategy, and concrete recommendation.

## Companion Documents

| Document | Focus |
|----------|-------|
| `ARCHITECTURE-AUDIT.md` | Module boundaries, dependency inversion, layering (horizontal slice) |
| **`ARCHITECTURE-DATA-MODEL.md`** (this) | Database schema, table classification, column analysis, target model, migration path (vertical data slice) |

---

## 1. Schema Inventory — All Real Tables

Derived from 40 migration files in `supabase/migrations/`. Tables are organized by the migration that created them. Deprecated/superseded tables are marked and kept for historical data only.

### 1.1 Core Platform Tables

| # | Table | Migration | Primary Purpose | Active? |
|---|-------|-----------|-----------------|---------|
| 1 | `profiles` | 00001 | User profiles (auth.users extension) | ✅ Yes |
| 2 | `creator_profiles` | 00001 | Creator-specific profile extensions | ✅ Yes |
| 3 | `creator_twitch_connections` | 00001 | Twitch integration for creators | ✅ Yes |
| 4 | `twitch_event_subscriptions` | 00001 | Twitch webhook subscriptions | ✅ Yes |
| 5 | `admin_users` | 00001 | Admin user grants | ✅ Yes |
| 6 | `notification_preferences` | 00001 | User notification settings | ✅ Yes |
| 7 | `activity_feed` | 00001 | Platform-wide activity feed | ✅ Yes |

### 1.2 Activity Platform Tables

| # | Table | Migration | Primary Purpose | Active? |
|---|-------|-----------|-----------------|---------|
| 8 | `dynamic_types` | 00001 (column), **00040** (table) | Registry of supported activity types (pickem, trivia, etc.) | ✅ Yes |
| 9 | `event_templates` | 00001 | Pre-defined templates for activity creation | ✅ Yes |
| 10 | `events` | 00001 | Central activity entity (currently Pick'em-only) | ✅ Yes |
| 11 | `event_participants` | 00001 | Participant registrations with eligibility data | ✅ Yes |
| 12 | `event_access_codes` | 00001 | Private access codes per event | ✅ Yes |

### 1.3 Pick'em-Specific Tables

| # | Table | Migration | Primary Purpose | Active? |
|---|-------|-----------|-----------------|---------|
| 13 | `event_players` | 00010 | Pick'em player pool (teams/contestants) | ✅ Yes |
| 14 | `prediction_questions` | 00010 | Questions for Pick'em predictions | ✅ Yes |
| 15 | `prediction_options` | 00010 | Answer options per question | ✅ Yes |
| 16 | `prediction_answers` | 00010 | User selections (one per participant per question) | ✅ Yes |
| 17 | `prediction_results` | 00010 | Correct answers per question | ✅ Yes |
| 18 | `prediction_scores` | 00010 | Scored results per participant per question | ✅ Yes |
| 19 | `submissions` | 00001 | Participant submission records (prediction sets) | ✅ Yes |
| 20 | `event_prizes` | 00002 | Prize definitions per event | ✅ Yes |
| 21 | `prize_winners` | 00002 | Prize-to-participant assignment | ✅ Yes |
| 22 | `tiebreaker_draws` | 00001 | Tiebreaker submissions | ✅ Yes |
| 23 | `receipt_assets` | 00001 | Receipt (certificate) image assets | ✅ Yes |

### 1.4 Deprecated / Historical Tables

| # | Table | Migration | Status | Notes |
|---|-------|-----------|--------|-------|
| 24 | `pickem_options` | 00001 | 🗄 Historical | Superseded by `prediction_options` in 00010. Data preserved. |
| 25 | `submission_items` | 00001 | 🗄 Historical | Superseded by `prediction_answers` in 00010. Data preserved. |
| 26 | `official_results` | 00001 | 🗄 Historical | Superseded by `prediction_results` in 00010. Data preserved. |
| 27 | `scoring_rules` | 00001 | 🗄 Historical | Superseded by `scoring_config` jsonb in 00030. Data preserved. |
| 28 | `leaderboards` | 00001 | 🗄 Historical | Superseded by on-the-fly computation. Data preserved. |
| 29 | `raffles` | 00002 | 🗄 Historical | Prize raffles (unused in app code). Data preserved. |
| 30 | `raffle_entries` | 00002 | 🗄 Historical | Associated entries. Data preserved. |
| 31 | `raffle_winners` | 00002 | 🗄 Historical | Associated winners. Data preserved. |

**Total: 31 tables, 23 active, 8 deprecated.**

---

## 2. Domain Classification of All Active Tables

### 2.1 Modality Assessment

Each table is classified as one of:

| Category | Definition | Migrate? |
|----------|------------|----------|
| **Core** | Platform infrastructure, independent of any activity type | Never migrate |
| **Activity Platform** | Shared by all activity types; must be generic | Migrate for generality |
| **Pick'em-Specific** | Logic and data only meaningful for Pick'em | Keep, may rename |
| **Hybrid** | Mixes generic and Pick'em-specific columns | Split |

### 2.2 Classification Matrix

| Table | Category | Rationale |
|-------|----------|-----------|
| `profiles` | **Core** | User identity, platform-wide |
| `creator_profiles` | **Core** | Creator identity, independent of activity |
| `creator_twitch_connections` | **Core** | Integration connection, not activity-specific |
| `twitch_event_subscriptions` | **Core** | Webhook infrastructure |
| `admin_users` | **Core** | Admin grant |
| `notification_preferences` | **Core** | User settings |
| `activity_feed` | **Core** | Feed entries (already has `activity_type` discriminator) |
| `dynamic_types` | **Activity Platform** | Registry that enables multi-activity — must remain generic |
| `event_templates` | **Activity Platform** | Template system (currently unused in code) |
| `events` | **Hybrid** | Core activity fields + Pick'em-specific columns |
| `event_participants` | **Hybrid** | Generic participation + Pick'em eligibility fields |
| `event_access_codes` | **Activity Platform** | Generic private access (currently Pick'em only but no Pick'em-specific columns) |
| `event_players` | **Pick'em-Specific** | Player pool concept is Pick'em-only |
| `prediction_questions` | **Pick'em-Specific** | Q&A format is Pick'em-specific |
| `prediction_options` | **Pick'em-Specific** | |
| `prediction_answers` | **Pick'em-Specific** | |
| `prediction_results` | **Pick'em-Specific** | |
| `prediction_scores` | **Pick'em-Specific** | |
| `submissions` | **Pick'em-Specific** | Submission = prediction set |
| `event_prizes` | **Hybrid** | Generic prize concept + pickem-rank-specific assignment |
| `prize_winners` | **Hybrid** | Generic winner assignment + pickem-rank-specific logic |
| `tiebreaker_draws` | **Pick'em-Specific** | Tiebreakers are Pick'em-only |
| `receipt_assets` | **Pick'em-Specific** | Receipts are Pick'em-only |

---

## 3. Events Table — Column-by-Column Analysis

Full schema as of migration 00040:

```sql
CREATE TABLE events (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id                uuid NOT NULL REFERENCES creator_profiles(id),
  dynamic_type_id           uuid NOT NULL REFERENCES dynamic_types(id) ON DELETE RESTRICT,
  template_id               uuid REFERENCES event_templates(id) ON DELETE SET NULL,
  title                     text NOT NULL,
  slug                      text NOT NULL,
  description               text,
  status                    text NOT NULL DEFAULT 'draft',
  event_config              jsonb NOT NULL DEFAULT '{}',
  scoring_config            jsonb NOT NULL DEFAULT '{}',
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  max_participants          integer,
  is_public                 boolean NOT NULL DEFAULT true,
  logo_url                  text,
  twitch_channel            text,
  prize_stacking_policy     text,
  predictions_close_timezone text NOT NULL DEFAULT 'America/Santo_Domingo',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id, slug)
);
```

### Column Classification

| Column | General / Pick'em? | Actively Used? | Notes |
|--------|-------------------|----------------|-------|
| `id` | General | ✅ Yes | PK, heavily referenced as FK |
| `creator_id` | General | ✅ Yes | Owner reference |
| `dynamic_type_id` | General | ✅ Written, ❌ Read | Set on create (always picks `pickem` type), never read by app code |
| `template_id` | General | ❌ No | FK exists, never populated or queried |
| `title` | General | ✅ Yes | Core display field |
| `slug` | General | ✅ Yes | URL identifier |
| `description` | General | ✅ Yes | Core display field |
| `status` | **Pick'em** | ✅ Yes | Values include `predictions_closed`, a Pick'em-specific lifecycle phase |
| `event_config` | General | ✅ Written, ❌ Read | Set to `'{}'` default; read in list queries but never destructured |
| `scoring_config` | **Pick'em** | ❌ No | Default `'{}'`, never read or written by app code |
| `starts_at` | General | ❌ No | Schema column, never referenced in code |
| `ends_at` | General | ✅ Yes | Core scheduling field, actively used |
| `max_participants` | General | ❌ No | Written to `tournament_templates`, never to `events` |
| `is_public` | General | ✅ RLS only | Only in SQL policy, never in app code |
| `logo_url` | General | ✅ Yes | Media/display field, reusability confirmed |
| `twitch_channel` | **Pick'em** | ✅ Yes | Twitch integration, specific to Pick'em context |
| `prize_stacking_policy` | **Pick'em** | ✅ Yes | Prize assignment logic, specific to Pick'em scoring |
| `predictions_close_timezone` | **Pick'em** | ✅ Yes | Timezone for prediction deadline, Pick'em-specific |
| `created_at` | General | ✅ Yes | Standard timestamp |
| `updated_at` | General | ✅ Yes | Standard timestamp |

### Summary

**13 general columns** (id, creator_id, dynamic_type_id, template_id, title, slug, description, event_config, starts_at, ends_at, max_participants, is_public, logo_url, created_at, updated_at)

Of those, 5 are unused: `template_id`, `scoring_config`, `starts_at`, `max_participants`, `is_public` (in app code — RLS only).

**5 Pick'em-specific columns** (status with pickem values, twitch_channel, prize_stacking_policy, predictions_close_timezone, scoring_config)

**Verdict: Events is a Pick'em table with a generic name.** The generic columns (15) outnumber the Pick'em-specific ones (5), but the 5 specific columns directly influence business logic, status lifecycle, and RLS. The table cannot be used for a non-Pick'em activity without either extending it with more nullable columns (anti-pattern) or adding conditionals throughout the codebase.

---

## 4. `event_participants` — Generality Assessment

```sql
CREATE TABLE event_participants (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id                      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                          text NOT NULL DEFAULT 'registered',
  predictions_count               integer DEFAULT 0,
  total_score                     numeric,
  rank                            integer,
  tiebreaker_rank                 integer,
  subscriber_verification_status  text DEFAULT 'not_verified',
  subscription_tier               text,
  verified_at                     timestamptz,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, profile_id)
);
```

### Column Classification

| Column | General / Pick'em? | Notes |
|--------|-------------------|-------|
| `id` | General | PK |
| `event_id` | General | FK to activity |
| `profile_id` | General | FK to user |
| `status` | **Pick'em?** | `'registered'` is the only value used; could be generic |
| `predictions_count` | **Pick'em** | Prediction count is Pick'em-specific |
| `total_score` | **Pick'em** | Scoring is Pick'em |
| `rank` | **Pick'em** | Ranking is Pick'em |
| `tiebreaker_rank` | **Pick'em** | Tiebreaker is Pick'em |
| `subscriber_verification_status` | **Pick'em?** | Twitch subscriber verification; technically integration-generic |
| `subscription_tier` | **Pick'em?** | Integration-provided tier |
| `verified_at` | **Pick'em?** | Verification timestamp |

**Verdict: Hybrid.** 4 columns are purely generic (id, event_id, profile_id, status), 4 are Pick'em-specific (predictions_count, total_score, rank, tiebreaker_rank), and 3 are integration-related (subscriber_verification_status, subscription_tier, verified_at) that happen to be used only in Pick'em today but could be general-purpose.

### 4.1 `event_prizes` — Generality Assessment

```sql
CREATE TABLE event_prizes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  image_url       text,
  provider_name   text,
  prize_type      text NOT NULL DEFAULT 'physical',
  prize_value     numeric,
  currency        text DEFAULT 'USD',
  quantity        integer NOT NULL DEFAULT 1,
  rank            integer,
  is_raffle       boolean DEFAULT false,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

**Verdict: Mostly generic.** Only `rank` and `is_raffle` hint at Pick'em-specific assignment. Prize definition (title, description, image, provider, type, value, currency, quantity) is entirely generic. This table could serve any activity type with minor or no changes.

### 4.2 `prize_winners` — Generality Assessment

```sql
CREATE TABLE prize_winners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id        uuid NOT NULL REFERENCES event_prizes(id) ON DELETE CASCADE,
  participant_id  uuid NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  rank            integer,
  is_confirmed    boolean DEFAULT false,
  confirmed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Verdict: Mostly generic.** The `rank` field ties to Pick'em ranking logic, but the concept of "a winner assigned to a prize" is universal. The link to `event_participants` is the tightest coupling.

---

## 5. Status Field Analysis

### 5.1 Current CHECK Constraint (from 00023)

```sql
CHECK (status IN ('draft', 'open', 'predictions_closed', 'completed', 'archived'))
```

### 5.2 Statuses by Category

| Status | General Lifecycle? | Pick'em-Specific? | Actively Used? |
|--------|-------------------|-------------------|----------------|
| `draft` | ✅ Yes | | ✅ Set on create, guarded in editing/publishing |
| `open` | ✅ Yes | | ✅ Set on publish, guarded for predictions submission |
| `predictions_closed` | | ✅ Pick'em | ✅ Set on close, guarded for publishing results |
| `completed` | ✅ Yes | | ✅ Set after scoring, used for display guards |
| `archived` | ✅ Yes | | ❌ Only in config UI, no code path writes it |

### 5.3 Status Lifecycle as Coded

```
draft → open → predictions_closed → completed
                                    └→ archived (manually, no code path)
```

The `predictions_closed` state is the only status that is purely Pick'em. In a general activity model, the equivalent would be "submissions_closed" or simply "active" with a submissions deadline.

### 5.4 Where Status Logic Lives (Code Locations)

| Operation | File(s) |
|-----------|---------|
| Set to `draft` | `activities/pickem/actions/event.ts:174` |
| Set to `open` | `activities/pickem/actions/publishing.ts:64` |
| Guard: must be `draft` to edit | `activities/pickem/actions/event.ts:210` |
| Guard: must be `open` to submit predictions | `app/actions/participant.ts:224` |
| Guard: must be `open` to close predictions | `activities/pickem/actions/publishing.ts:90` |
| Guard: must be `predictions_closed` to publish results | `app/actions/scoring.ts:85` |
| Set to `completed` | `app/actions/scoring.ts:345,526,614` |
| Display/config mapping | `components/pickem/PickemsList.tsx`, `lib/status-config.ts` |
| Dashboard filtering | `app/(app)/creator/dashboard/page.tsx` |

---

## 6. Functions & Triggers Audit

### 6.1 All Functions

| Function | Table(s) Referenced | Purpose | Pick'em-Specific? |
|----------|---------------------|---------|-------------------|
| `get_creator_id_for_event` | `events` | RLS helper: check if user is creator | Activity-generic |
| `update_participant_counts` | `events`, `event_participants` | Maintain participant count | Activity-generic |
| `update_predictions_count` | `event_participants` | Count predictions per participant | ✅ Yes |
| `calculate_and_update_scores` | `prediction_answers`, `prediction_results`, `prediction_scores`, `event_participants` | Score computation | ✅ Yes |
| `assign_prize_winners` | `prize_winners`, `event_participants`, `event_prizes` | Prize assignment after scoring | ✅ Yes |
| `recalculate_all_event_scores` | multiple tables | Admin score recalc | ✅ Yes |
| `create_dynamic_type` | `dynamic_types` | Admin utility | Activity-generic |
| `assign_top_n_prizes` | multiple tables | Top-N prize assignment | ✅ Yes |

**3 activity-generic** (get_creator_id_for_event, update_participant_counts, create_dynamic_type)  
**5 Pick'em-specific**

### 6.2 All Triggers

| Trigger | Table | Function | Pick'em-Specific? |
|---------|-------|----------|-------------------|
| `trg_events_updated_at` | `events` | auto-update timestamp | Activity-generic |
| `trg_event_participants_updated_at` | `event_participants` | auto-update timestamp | Activity-generic |
| `trg_update_participant_counts_on_register` | `event_participants` | update_participant_counts | Activity-generic |
| `trg_update_participant_counts_on_unregister` | `event_participants` | update_participant_counts | Activity-generic |
| `trg_update_predictions_count` | `prediction_answers` | update_predictions_count | ✅ Yes |
| `trg_auto_create_prediction_options` | `prediction_questions` | auto-create options | ✅ Yes |

**4 activity-generic, 2 Pick'em-specific**

### 6.3 RLS Policies Summary

All RLS policies are defined in migration 00001 and reference these patterns:

| Table | Policy Pattern | Pick'em-Specific? |
|-------|---------------|-------------------|
| `events` | Creator owns; public read for `is_public=true` | Activity-generic (except `predictions_closed` status checks) |
| `event_participants` | Creator reads all; participant reads own; participant writes own | Activity-generic |
| `event_players` | Creator CRUD; public read | Pick'em-only table |
| `prediction_questions` | Creator CRUD; participant read for open events | Pick'em-only table |
| `prediction_options` | Creator CRUD; participant read | Pick'em-only table |
| `prediction_answers` | Participant CRUD own; creator read all | Pick'em-only table |
| `submissions` | Participant CRUD own; creator read all | Pick'em-only table |
| `event_prizes` | Creator CRUD; public read | Activity-generic |
| `prize_winners` | Creator CRUD; participant read own | Hybrid |
| `tiebreaker_draws` | Participant CRUD own; creator read all | Pick'em-only table |

**General pattern:** RLS chains through `events.creator_id` for access control. This means any table split (events → activities + pickem_settings) must preserve the `events` view or update RLS to reference `activities.creator_id`.

---

## 7. Index Analysis

From migration 00035 and earlier:

```sql
-- Events
CREATE INDEX idx_events_creator_id ON events(creator_id);         -- Activity-generic
CREATE INDEX idx_events_status ON events(status);                  -- Activity-generic
CREATE INDEX idx_events_slug ON events(slug);                     -- Activity-generic
CREATE INDEX idx_events_created_at ON events(created_at DESC);     -- Activity-generic
CREATE INDEX idx_events_dynamic_type_id ON events(dynamic_type_id); -- Activity-generic

-- Event Participants
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_profile_id ON event_participants(profile_id);
CREATE INDEX idx_event_participants_created_at ON event_participants(created_at DESC);

-- Pick'em tables
CREATE INDEX idx_players_event_id ON event_players(event_id);
CREATE INDEX idx_questions_event_id ON prediction_questions(event_id);
CREATE INDEX idx_answers_participant ON prediction_answers(participant_id);
-- ... etc, all FK-indexed
```

All indexes are standard FK indexes. No special or problematic indexes.

---

## 8. Proposed Target Model

### 8.1 Principles

1. **Single source of truth** — no duplication between old and new tables after migration
2. **Generic core** — activity platform tables have zero Pick'em-specific columns
3. **Modular extensions** — each activity type gets its own settings/extension table(s)
4. **Backward compatibility** — existing queries continue working via views during transition
5. **No data loss** — all historical data preserved, nothing dropped

### 8.2 Target Schema

#### Core Activity Table

```sql
CREATE TABLE activities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  dynamic_type_id   uuid NOT NULL REFERENCES dynamic_types(id) ON DELETE RESTRICT,
  title             text NOT NULL,
  slug              text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'open', 'closed', 'completed', 'archived')),
  logo_url          text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  max_participants  integer,
  is_public         boolean NOT NULL DEFAULT true,
  event_config      jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id, slug)
);
```

Changes from `events`:
- Removed `twitch_channel` → moved to `pickem_settings`
- Removed `prize_stacking_policy` → moved to `pickem_settings`
- Removed `predictions_close_timezone` → moved to `pickem_settings`
- Removed `scoring_config` → moved to `pickem_settings`
- Removed `template_id` → unused, can be re-added as generic FK later
- Normalized `status` to general lifecycle: `draft, open, closed, completed, archived`

#### General Status Definitions

| Status | Meaning | Transitions |
|--------|---------|-------------|
| `draft` | Being created, not visible to public | → `open` |
| `open` | Active, accepting participants/submissions | → `closed`, → `completed` |
| `closed` | Submissions closed, processing results | → `completed` |
| `completed` | Results published, final state | terminal |
| `archived` | Hidden from active views | terminal (from any) |

#### Pick'em Extension Table

```sql
CREATE TABLE pickem_settings (
  activity_id                uuid PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  twitch_channel             text,
  predictions_close_timezone text NOT NULL DEFAULT 'America/Santo_Domingo',
  prize_stacking_policy      text DEFAULT 'single_prize_per_participant',
  scoring_config             jsonb NOT NULL DEFAULT '{}'
);
```

#### Participants Table (Generic)

```sql
CREATE TABLE activity_participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'registered',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, profile_id)
);
```

Changes from `event_participants`:
- Removed `predictions_count`, `total_score`, `rank`, `tiebreaker_rank` → moved to `pickem_participant_scores`
- Removed `subscriber_verification_status`, `subscription_tier`, `verified_at` → moved to a generic `participant_verifications` table (optional, integration-specific)

#### Pick'em Participant Extension

```sql
CREATE TABLE pickem_participant_scores (
  participant_id  uuid PRIMARY KEY REFERENCES activity_participants(id) ON DELETE CASCADE,
  predictions_count integer DEFAULT 0,
  total_score     numeric,
  rank            integer,
  tiebreaker_rank integer
);
```

#### Integration Verification (Generic, Future)

```sql
CREATE TABLE participant_verifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  uuid NOT NULL REFERENCES activity_participants(id) ON DELETE CASCADE,
  integration     text NOT NULL,  -- 'twitch_subscriber', 'discord_role', etc.
  status          text NOT NULL DEFAULT 'pending',
  external_id     text,
  metadata        jsonb,
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_id, integration)
);
```

#### Prizes (Generic Activity Prizes)

```sql
CREATE TABLE activity_prizes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  image_url       text,
  provider_name   text,
  prize_type      text NOT NULL DEFAULT 'physical',
  prize_value     numeric,
  currency        text DEFAULT 'USD',
  quantity        integer NOT NULL DEFAULT 1,
  rank            integer,   -- optional: if awarded by rank
  is_raffle       boolean DEFAULT false,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

#### Prize Winners (Generic)

```sql
CREATE TABLE activity_prize_winners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id        uuid NOT NULL REFERENCES activity_prizes(id) ON DELETE CASCADE,
  participant_id  uuid NOT NULL REFERENCES activity_participants(id) ON DELETE CASCADE,
  rank            integer,
  is_confirmed    boolean DEFAULT false,
  confirmed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

#### Remaining Pick'em-Specific Tables (no changes)

```sql
event_players          → pickem_players         (FK to activities.id)
prediction_questions   → pickem_questions        (FK to activities.id)
prediction_options     → pickem_options          (FK to pickem_questions.id)
prediction_answers     → pickem_answers          (FK to activity_participants.id)
prediction_results     → pickem_results          (FK to pickem_questions.id)
prediction_scores      → pickem_scores           (FK to activity_participants.id + pickem_questions.id)
submissions            → pickem_submissions      (FK to activity_participants.id)
tiebreaker_draws       → pickem_tiebreaker_draws (FK to activity_participants.id)
receipt_assets         → pickem_receipt_assets   (FK to activity_participants.id)
```

### 8.3 Backward Compatibility View

```sql
CREATE VIEW events AS
SELECT
  a.id, a.creator_id, a.dynamic_type_id, a.title, a.slug, a.description,
  CASE
    WHEN a.status = 'closed' AND ps.activity_id IS NOT NULL THEN 'predictions_closed'
    ELSE a.status
  END as status,
  a.event_config, COALESCE(ps.scoring_config, '{}') as scoring_config,
  a.starts_at, a.ends_at, a.max_participants, a.is_public,
  a.logo_url, a.created_at, a.updated_at,
  ps.twitch_channel, ps.prize_stacking_policy, ps.predictions_close_timezone
FROM activities a
LEFT JOIN pickem_settings ps ON ps.activity_id = a.id;
```

This view queries both tables and maps the normalized `closed` status back to `predictions_closed` for backward compatibility.

For **updatable views** (INSERT/UPDATE/DELETE through the view), either:
- Use `INSTEAD OF` triggers on the view to route writes to the correct underlying tables, OR
- Replace direct table writes in app code as part of the migration (recommended)

---

## 9. Migration Strategy

### 9.1 Phase 0: Preparation (No Schema Changes)

**Duration:** Read-only analysis, can be done in parallel with feature work.

**Steps:**
1. Generate `database.types.ts` from the current schema (stop hand-authoring types)
2. Add explicit TypeScript interfaces in `types/activities.ts` as the source of truth
3. Audit all SELECT queries to remove `SELECT *` usage (except for known, stable shapes)
4. Document the current migration plan in this file
5. Confirm backup strategy and rollback plan

**No code changes to actions, components, or pages.** Pure documentation and type generation.

### 9.2 Phase 1: Normalize Status Values (Backward-Compatible)

**Duration:** 1 migration + code updates.

**Steps:**
1. Add new status values `'closed'` to the CHECK constraint (keeping existing values)
2. Update all code paths that set `'predictions_closed'` to set `'closed'` instead
3. Update all guards that check for `'predictions_closed'` to also accept `'closed'`
4. Create a DB function `is_effectively_closed(status text)` for backward compatibility
5. Deploy; all existing rows with `'predictions_closed'` remain valid; new rows use `'closed'`
6. After deployment: migrate existing `'predictions_closed'` → `'closed'` via background update

**Caveat:** This phase is optional if we plan to keep the view in Phase 4 that maps `closed` → `predictions_closed`. If we do Phase 1 first, we simplify Phase 4 but add intermediate work.

**Recommendation:** Skip Phase 1. Keep `predictions_closed` in the view mapping. Do it in one shot in Phase 4.

### 9.3 Phase 2: Extract Pick'em Settings (New Table + Dual Writes)

**Duration:** 1 migration + code updates to write to both locations.

**Steps:**
1. Create `pickem_settings` table
2. Backfill `pickem_settings` from existing `events` rows
3. Add triggers to keep `pickem_settings` in sync with `events` changes
4. Update app code to write to both `events` and `pickem_settings`
5. Add `ON INSERT` trigger on `events` to auto-create `pickem_settings` row
6. Deploy; validate dual-write consistency

**At this point, `events` still has all columns.** `pickem_settings` is a shadow table.

### 9.4 Phase 3: Create `activities` Table (New Table + Dual Writes)

**Duration:** 1 migration + code updates.

**Steps:**
1. Create `activities` table with only general columns
2. Create `activity_participants` table (initially as a shadow of `event_participants`)
3. Backfill both from existing data
4. Add triggers to keep `events` ↔ `activities` in sync (writes to `events` also write to `activities`)
5. Update app code to write to `activities` + `pickem_settings` instead of `events`

**At this point, all new data is written to the new tables.** `events` receives data via trigger sync from `activities`.

### 9.5 Phase 4: Create Backward-Compatible View

**Duration:** 1 migration.

**Steps:**
1. Drop triggers that sync `activities` → `events`
2. Rename `events` to `events_legacy` (preserve data)
3. Create view `events` as `SELECT ... FROM activities LEFT JOIN pickem_settings`
4. Create `INSTEAD OF` triggers on the `events` view for INSERT/UPDATE/DELETE
5. Verify all existing queries work against the view

### 9.6 Phase 5: Migrate All Reads to New Tables

**Duration:** Code-only, no schema changes.

**Steps:**
1. Update all server actions to query `activities` + `pickem_settings` directly
2. Update all components to use new types
3. Remove reliance on backward-compatible view
4. Update RLS to reference `activities.creator_id`

### 9.7 Phase 6: Rename Pick'em Tables (Cleanup)

**Duration:** 1 migration + code updates.

**Steps:**
1. `event_players` → `pickem_players`
2. `prediction_questions` → `pickem_questions`
3. `prediction_options` → `pickem_options`
4. `prediction_answers` → `pickem_answers`
5. `prediction_results` → `pickem_results`
6. `prediction_scores` → `pickem_scores`
7. `submissions` → `pickem_submissions`
8. `tiebreaker_draws` → `pickem_tiebreaker_draws`
9. `receipt_assets` → `pickem_receipt_assets`
10. `event_prizes` → `activity_prizes` (rename FK columns)
11. `prize_winners` → `activity_prize_winners`
12. `event_participants` → remove Pick'em columns → create `pickem_participant_scores`

### 9.8 Phase 7: Drop Backward Compatibility

**Duration:** 1 migration.

**Steps:**
1. Drop `events` view
2. Drop `events_legacy` table (or archive)
3. Update all remaining references
4. Final RLS update to remove legacy policy references

---

## 10. Code Impact by Phase

| Phase | Changes Required | Risk Level |
|-------|-----------------|------------|
| **0** (Documentation) | None | None |
| **1** (Status) | Update status enum in migrations, actions, components, types | Low — additive change |
| **2** (Pick'em Settings) | New table, trigger, dual-write logic in actions | Medium — must ensure consistency |
| **3** (Activities table) | New table, trigger, dual-write logic in all actions (creator, participant, scoring) | High — changes ~10 server action files |
| **4** (View) | Migration only, no code changes if view is transparent | Low |
| **5** (Read migration) | Update ~15 server action files, ~10 components | High — all queries change |
| **6** (Rename) | Update all FK references in actions and types | Medium — mechanical but pervasive |
| **7** (Cleanup) | Drop view and legacy table | Low — after validation |

### 10.1 Files That Would Need Changes

**Server Actions:** `activities/pickem/actions/event.ts`, `activities/pickem/actions/publishing.ts`, `activities/pickem/actions/players.ts`, `activities/pickem/actions/predictions.ts`, `activities/pickem/actions/prizes.ts`, `app/actions/participant.ts`, `app/actions/scoring.ts`, `app/actions/results-data.ts`, `app/actions/tiebreaker.ts`, `app/actions/legacy-migration.ts`

**Components:** `components/pickem/GeneralInfoSection.tsx`, `components/pickem/PublicPickemView.tsx`, `components/pickem/PickemParticipationHero.tsx`, `components/pickem/PickemsList.tsx`, `components/pickem/PickemStatusCard.tsx`, `components/pickem/PrizeSection.tsx`, `components/pickem/LogoUploader.tsx`, `components/pickem/PrizeCarousel.tsx`, `components/completed/*.tsx`

**Pages:** `app/(app)/creator/pickems/[id]/page.tsx`, `app/(app)/creator/pickems/[id]/results/page.tsx`, `app/(app)/creator/dashboard/page.tsx`, `app/(app)/inicio/page.tsx`, `app/(app)/participaciones/page.tsx`, `app/pickems/[slug]/page.tsx`

**Types:** `types/activities.ts` (new), potentially `types/` updates

**Config:** `lib/status-config.ts`, `lib/dashboard-config.ts`

**Total: ~35-40 files** across ~7 phases.

---

## 11. RLS Impact

### 11.1 Current RLS Architecture

All RLS policies ultimately depend on `events.creator_id`:

```sql
-- Current pattern:
CREATE POLICY "Creators can CRUD their own events"
  ON events FOR ALL
  USING (creator_id = get_creator_id_for_event());

-- Which chains through all child tables:
CREATE POLICY "Creator can CRUD event_participants"
  ON event_participants FOR ALL
  USING (
    event_id IN (SELECT id FROM events WHERE creator_id = get_creator_id_for_event())
  );
```

### 11.2 Target RLS Architecture

After migration, RLS should depend on `activities.creator_id`:

```sql
CREATE POLICY "Creators can CRUD their own activities"
  ON activities FOR ALL
  USING (creator_id = get_creator_id_for_event());  -- function refactored to use activities

-- Child tables chain to activities:
CREATE POLICY "Creator can CRUD activity_participants"
  ON activity_participants FOR ALL
  USING (
    activity_id IN (SELECT id FROM activities WHERE creator_id = get_creator_id_for_event())
  );
```

### 11.3 Transition Strategy

| Phase | RLS State |
|-------|-----------|
| 0-2 | Unchanged — `events` is still the primary table |
| 3 | Dual RLS: `events` RLS + `activities` RLS (same policies, duplicated) |
| 4 | View inherits RLS from underlying `activities` table |
| 5 | `events` view dropped; only `activities` RLS remains |
| 6-7 | Clean up old policies on legacy tables |

**Key function update:** `get_creator_id_for_event()` needs to be updated or replaced with `get_creator_id_for_activity()` that queries `activities` instead of `events`.

---

## 12. Recommendation

### 12.1 Assessment

| Factor | Rating | Notes |
|--------|--------|-------|
| Urgency | Low | No second activity type is being built; Pick'em works today |
| Complexity | High | ~35-40 files, 7 phases, heavy cross-cutting changes |
| Risk | Medium-High | Dual-write consistency, RLS transition, FK chain across 10+ child tables |
| Benefit | High | Enables multi-activity platform without further schema churn |
| Current Pain | Low | 6 unused columns, 5 pickem columns in a generic-named table, but no bugs |

### 12.2 Verdict: Prepare But Postpone

**Do NOT migrate now.** The cost/benefit ratio favors deferring until:

1. A **second activity type** (Trivia, Poll, Giveaway) is actively being built, **OR**
2. A **third party** needs to integrate with the activities platform, **OR**
3. The current schema causes a **specific, reproducible bug** tied to the hybrid nature

### 12.3 What To Do Now (Preparatory Work, Low Effort)

These are low-risk, high-value steps that make future migration easier:

| Task | Effort | Value |
|------|--------|-------|
| Generate `database.types.ts` from current schema | 1 session | 🔴 Critical — stop hand-typing types |
| Add `types/activities.ts` with explicit interfaces mirroring the *target* model | 1 session | 🟡 Documents intent, aids refactoring |
| Remove `SELECT *` from server actions | 2-3 sessions | 🟢 Reduces blast radius when schema changes |
| Centralize route constants (`/pickems/` → `ROUTES.pickems.list`) | 1 session | 🟢 Simplifies future route migration |
| Audit `event_participants` queries to isolate Pick'em-specific vs generic | 1 session | 🟡 Informs Phase 3 scope |
| Add `template_type` usage or remove `template_id` column | 0.5 session | 🟢 Housekeeping |

### 12.4 When To Revisit

Migrate when any of these triggers occur:

1. **New activity type development starts** — begin Phase 2 immediately; complete through Phase 4 before the new type's first migration
2. **Schema causes a production bug** — evaluate if migration fixes it; if so, fast-track relevant phases
3. **Major version bump** (e.g., Next.js, Supabase) — opportunity to do schema refactoring alongside other breaking changes
4. **6 months pass without any trigger** — revisit this document; reassess cost/benefit

### 12.5 Phased Timeline (If Triggered)

| Phase | Estimated Effort | Dependencies |
|-------|-----------------|--------------|
| 0 (Prep) | 5 days | None (can start now) |
| 1 (Status) | 2 days | Phase 1 optional (can be merged into Phase 4) |
| 2 (Pick'em Settings) | 3 days | None |
| 3 (Activities table) | 5 days | Phase 2 |
| 4 (View) | 2 days | Phase 3 |
| 5 (Read migration) | 5 days | Phase 4 |
| 6 (Rename) | 3 days | Phase 5 |
| 7 (Cleanup) | 1 day | Phase 6 |
| **Total** | **~26 days** | |

**Note:** Phases 2-7 are ~21 days if done sequentially; some phases (2 and 3) could be done in parallel with additional care.

---

## 13. Appendix

### 13.1 Current Schema DDL (All Active Tables)

For reference, see:
- `supabase/migrations/00001_initial_schema.sql` — foundation
- `supabase/migrations/00002_pickem_twitch_rewards.sql` — prizes
- `supabase/migrations/00010_configurable_predictions_schema.sql` — predictions
- `supabase/migrations/00022_add_template_and_ranking.sql` — templates
- `supabase/migrations/00023_refine_event_statuses.sql` — status
- `supabase/migrations/00024_add_pickem_visual_fields.sql` — logo, twitch
- `supabase/migrations/00025_add_predictions_close_timezone.sql` — timezone
- `supabase/migrations/00030_add_scoring_config.sql` — scoring
- `supabase/migrations/00035_add_prize_stacking.sql` — stacking
- `supabase/migrations/00040_dynamic_types_for_multi_activity.sql` — dynamic types

### 13.2 Discarded Approaches

| Approach | Why Discarded |
|----------|---------------|
| **JSONB-only extension** (store Pick'em columns in `event_config`) | No type safety, no FK enforcement, no indexes on specific fields, poor queryability |
| **EAV (Entity-Attribute-Value)** | Query complexity, no FK constraints, poor DX, overkill for 5 extra columns |
| **PostgreSQL inheritance** (`pickem_events INHERITS events`) | No FK support for inherited tables, no unique constraints across inheritance, poor ORM support |
| **Ignore and keep current schema** | Technical debt; adding a second activity type would require nullable columns on `events` or separate tables anyway |
| **`pg_typeof` discriminator** | Runtime type checking without schema enforcement, worse DX than current |

### 13.3 Key Terms

| Term | Definition |
|------|------------|
| **Activity** | A generic base entity representing any type of user-facing event/interaction on the platform. |
| **Pick'em** | An activity type where participants predict outcomes of matches/events and are scored on accuracy. |
| **Activity Platform** | The set of generic tables and services that support multiple activity types. |
| **Hybrid Table** | A table that contains both generic activity columns and Pick'em-specific columns. |
| **Dynamic Type** | The registry concept; each activity type has a `dynamic_types` entry. |
| **Shadow Table** | A new table that mirrors an existing table during migration, kept in sync via triggers. |
