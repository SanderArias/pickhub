-- migration/00043_fix_event_prizes_trigger_instead_of_rls.sql
--
-- Root cause:
--   All prior approaches (00039, 00041, 00042) tried to use SECURITY DEFINER
--   functions INSIDE RLS policies. But on Supabase with PgBouncer transaction
--   pooling, auth.uid() (which reads current_setting('request.jwt.claim.sub'))
--   can return NULL when called inside a SECURITY DEFINER function from an
--   RLS WITH CHECK clause, because the session setting is lost during the
--   definer context switch + transaction reuse.
--
-- Fix:
--   Move the ownership check from RLS policies to a BEFORE ROW trigger.
--   PostgreSQL fires BEFORE triggers BEFORE evaluating the RLS WITH CHECK
--   policy, so the trigger runs in the user's direct session context where
--   auth.uid() is available.
--
--   The trigger function uses SECURITY DEFINER to bypass RLS on events
--   (same approach as before), but now it's called from a trigger context
--   instead of an RLS WITH CHECK clause, fixing the auth.uid() issue.
--
-- Changes:
--   1. Drop all RLS policies on event_prizes (INSERT, UPDATE, DELETE).
--   2. Create SECURITY DEFINER trigger function that checks creator ownership.
--   3. Create BEFORE INSERT / UPDATE / DELETE triggers.
--   4. Replace INSERT/UPDATE/DELETE RLS with minimal "authenticated can try"
--      policies so the trigger is the sole authority.
--   5. Keep the existing SELECT policy unchanged.
--
-- Trigger order (PostgreSQL documentation):
--   1. BEFORE ROW INSERT trigger fires
--   2. RLS WITH CHECK is evaluated (must pass)
--   3. Row is inserted / updated / deleted
--   (If the trigger raises an exception, the entire operation is rolled back)

-- ══════════════════════════════════════════════════════════════════════
-- Step 1: Drop existing INSERT/UPDATE/DELETE policies
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists "Creators can insert prizes for their events" on event_prizes;
drop policy if exists "Creators can update prizes for their events" on event_prizes;
drop policy if exists "Creators can delete prizes for their events" on event_prizes;

-- ══════════════════════════════════════════════════════════════════════
-- Step 2: Create trigger function that validates creator ownership
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.check_event_prize_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from public.events e
    join public.creator_profiles cp on cp.id = e.creator_id
    where e.id = new.event_id
      and cp.profile_id = auth.uid()
  ) then
    raise exception 'Only the event creator can modify prizes.';
  end if;
  return new;
end;
$$;

grant execute on function public.check_event_prize_owner() to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Step 3: Create BEFORE triggers for INSERT, UPDATE, DELETE
-- ══════════════════════════════════════════════════════════════════════

drop trigger if exists trg_check_prize_owner_insert on event_prizes;
create trigger trg_check_prize_owner_insert
  before insert on event_prizes
  for each row
  execute function public.check_event_prize_owner();

drop trigger if exists trg_check_prize_owner_update on event_prizes;
create trigger trg_check_prize_owner_update
  before update on event_prizes
  for each row
  execute function public.check_event_prize_owner();

drop trigger if exists trg_check_prize_owner_delete on event_prizes;
create trigger trg_check_prize_owner_delete
  before delete on event_prizes
  for each row
  execute function public.check_event_prize_owner();

-- ══════════════════════════════════════════════════════════════════════
-- Step 4: Minimal RLS policies — allow any authenticated user to try
-- ══════════════════════════════════════════════════════════════════════

create policy "Authenticated users can insert prizes (trigger validates)"
  on event_prizes for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update prizes (trigger validates)"
  on event_prizes for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete prizes (trigger validates)"
  on event_prizes for delete
  to authenticated
  using (true);

-- ══════════════════════════════════════════════════════════════════════
-- Step 5: Reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════════════════

notify pgrst, 'reload schema';
