-- migration/00035_fix_prize_constraints_and_category.sql
--
-- Fixes:
--   1. Drops the legacy UNIQUE (event_id, tier) constraint that was never
--      actually removed by migration 00034 (wrong constraint name).
--   2. Adds prize_category column with proper check constraint.
--   3. Creates a unique index on (event_id, prize_category, eligible_rank_start)
--      so each position is unique per category per event.
--   4. Removes tier from INSERT/UPDATE paths (application code stops sending it).

-- Step 1: Drop the legacy constraint by its actual PostgreSQL auto-generated name.
-- Migration 00034 tried to drop 'event_prizes_tier_key' but the real name is
-- 'event_prizes_event_id_tier_key' because PG names unique constraints as
-- tablename_column1_column2_key when not explicitly named.
alter table public.event_prizes
  drop constraint if exists event_prizes_event_id_tier_key;

-- Also drop the wrong-name version in case it somehow exists.
alter table public.event_prizes
  drop constraint if exists event_prizes_tier_key;

-- Step 2: Drop the unique (event_id, sort_order) constraint added by 00034.
-- We replace it with (event_id, prize_category, eligible_rank_start) which
-- matches the new position-per-category model.
alter table public.event_prizes
  drop constraint if exists event_prizes_event_id_sort_order_key;

-- Step 3: Add prize_category column (optional at first)
alter table public.event_prizes
  add column if not exists prize_category text;

comment on column public.event_prizes.prize_category is
  'Categoría del premio: general_ranking (clasificación general) o subscriber_bonus (beneficio exclusivo para subs)';

-- Step 4: Backfill prize_category from existing eligibility_type
update public.event_prizes
set prize_category = case
  when eligibility_type = 'subscribers' then 'subscriber_bonus'
  else 'general_ranking'
end
where prize_category is null;

-- Step 5: Add check constraint
alter table public.event_prizes
  drop constraint if exists event_prizes_prize_category_check;

alter table public.event_prizes
  add constraint event_prizes_prize_category_check
    check (prize_category in ('general_ranking', 'subscriber_bonus'));

-- Step 6: Make NOT NULL after backfill
alter table public.event_prizes
  alter column prize_category set not null;

-- Step 7: Create unique index for (event_id, prize_category, eligible_rank_start)
-- This prevents duplicate positions within the same category but allows the
-- same rank across different categories (e.g. general_ranking rank 1 and
-- subscriber_bonus rank 1 are both valid).
create unique index if not exists event_prizes_event_category_rank_key
  on public.event_prizes (event_id, prize_category, eligible_rank_start);

-- Step 8: Widen the tier check constraint to allow null (since we stop sending it)
-- so old rows with tier values keep working during transition.
-- (The column is deprecated — we keep it for historical data but stop writing to it.)
alter table public.event_prizes
  drop constraint if exists event_prizes_tier_check;

alter table public.event_prizes
  add constraint event_prizes_tier_check
    check (tier is null or tier in ('subscriber', 'nonsubscriber'));

-- Step 9: Index for querying by category
create index if not exists idx_event_prizes_category
  on public.event_prizes (event_id, prize_category, sort_order);

-- Step 10: Drop the old sort_order index (replaced by idx_event_prizes_category)
drop index if exists idx_event_prizes_sort_order;

-- Step 11: Reload PostgREST schema cache
notify pgrst, 'reload schema';
