-- recovery/00034_recover_assignment_method.sql
-- Run this in Supabase SQL Editor if migration 00034 was not fully applied.
--
-- Steps:
--   1. Open your Supabase Dashboard SQL Editor
--   2. Select the correct project (kplgohccmlorjwhjpkuh)
--   3. Paste and run this entire script
--   4. Confirm no errors
--   5. After running, notify PostgREST to reload schema cache

-- Step 1: Verify current state
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'event_prizes'
order by ordinal_position;

-- Step 2: Add missing columns idempotently

-- Add assignment_method if missing
alter table event_prizes
  add column if not exists assignment_method text
    check (assignment_method in ('ranking'))
    not null default 'ranking';

-- Add eligibility_type if missing (from migration 00034)
alter table event_prizes
  add column if not exists eligibility_type text
    check (eligibility_type in ('all', 'subscribers', 'non_subscribers'));

-- Add eligible_rank_start if missing
alter table event_prizes
  add column if not exists eligible_rank_start integer
    not null default 1
    check (eligible_rank_start >= 1);

-- Add sort_order if missing
alter table event_prizes
  add column if not exists sort_order integer;

-- Step 3: Backfill existing rows that may have null eligibility_type
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

-- Step 4: Make new columns NOT NULL after backfill
alter table event_prizes
  alter column eligibility_type set not null,
  alter column sort_order set not null;

-- Step 5: Drop old unique constraint if still exists
alter table event_prizes
  drop constraint if exists event_prizes_tier_key;

-- Step 6: Add unique constraint on (event_id, sort_order) for upsert
alter table event_prizes
  add constraint event_prizes_event_id_sort_order_key
    unique (event_id, sort_order);

-- Step 7: Index for ordering
create index if not exists idx_event_prizes_sort_order
  on event_prizes (event_id, sort_order);

-- Step 8: Reload PostgREST schema cache
notify pgrst, 'reload schema';

-- Step 9: Confirm the column is now visible
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'event_prizes'
order by ordinal_position;
