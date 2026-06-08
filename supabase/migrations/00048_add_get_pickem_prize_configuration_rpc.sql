-- 00048_add_get_pickem_prize_configuration_rpc.sql
-- Creates a dedicated RPC for reading prize configuration,
-- avoiding PostgREST schema-cache issues with direct table queries.

-- ============================================================
-- 1. Recreate can_manage_pickem (idempotent) to drop dependents
--    if re-running, then recreate it
-- ============================================================
drop function if exists public.can_manage_pickem(uuid) cascade;

create or replace function public.can_manage_pickem(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.creator_profiles cp on cp.id = e.creator_id
    where e.id = target_event_id
      and cp.profile_id = auth.uid()
  );
$$;

-- ============================================================
-- 2. Recreate RLS policies (drop first for idempotency)
-- ============================================================
-- pickem_prize_settings
drop policy if exists "Anyone can read prize settings" on public.pickem_prize_settings;
drop policy if exists "Creator can manage prize settings" on public.pickem_prize_settings;
drop policy if exists "Creator can update prize settings" on public.pickem_prize_settings;
drop policy if exists "Creator can delete prize settings" on public.pickem_prize_settings;

create policy "Anyone can read prize settings"
  on public.pickem_prize_settings for select
  using (true);

create policy "Creator can manage prize settings"
  on public.pickem_prize_settings for insert
  with check (public.can_manage_pickem(event_id));

create policy "Creator can update prize settings"
  on public.pickem_prize_settings for update
  using (public.can_manage_pickem(event_id))
  with check (public.can_manage_pickem(event_id));

create policy "Creator can delete prize settings"
  on public.pickem_prize_settings for delete
  using (public.can_manage_pickem(event_id));

-- pickem_prize_definitions
drop policy if exists "Anyone can read prize definitions" on public.pickem_prize_definitions;
drop policy if exists "Creator can manage prize definitions" on public.pickem_prize_definitions;
drop policy if exists "Creator can update prize definitions" on public.pickem_prize_definitions;
drop policy if exists "Creator can delete prize definitions" on public.pickem_prize_definitions;

create policy "Anyone can read prize definitions"
  on public.pickem_prize_definitions for select
  using (true);

create policy "Creator can manage prize definitions"
  on public.pickem_prize_definitions for insert
  with check (public.can_manage_pickem(event_id));

create policy "Creator can update prize definitions"
  on public.pickem_prize_definitions for update
  using (public.can_manage_pickem(event_id))
  with check (public.can_manage_pickem(event_id));

create policy "Creator can delete prize definitions"
  on public.pickem_prize_definitions for delete
  using (public.can_manage_pickem(event_id));

-- pickem_prize_awards
drop policy if exists "Anyone can read prize awards" on public.pickem_prize_awards;
drop policy if exists "Creator can manage prize awards" on public.pickem_prize_awards;
drop policy if exists "Creator can update prize awards" on public.pickem_prize_awards;
drop policy if exists "Creator can delete prize awards" on public.pickem_prize_awards;

create policy "Anyone can read prize awards"
  on public.pickem_prize_awards for select
  using (true);

create policy "Creator can manage prize awards"
  on public.pickem_prize_awards for insert
  with check (public.can_manage_pickem(event_id));

create policy "Creator can update prize awards"
  on public.pickem_prize_awards for update
  using (public.can_manage_pickem(event_id))
  with check (public.can_manage_pickem(event_id));

create policy "Creator can delete prize awards"
  on public.pickem_prize_awards for delete
  using (public.can_manage_pickem(event_id));

-- ============================================================
-- 3. RPC: get_pickem_prize_configuration
--     Returns prize settings + active definitions for an event
-- ============================================================
create or replace function public.get_pickem_prize_configuration(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_definitions jsonb;
begin
  select to_jsonb(s)
  into v_settings
  from public.pickem_prize_settings s
  where s.event_id = p_event_id;

  select coalesce(jsonb_agg(d order by d.sort_order), '[]'::jsonb)
  into v_definitions
  from (
    select *
    from public.pickem_prize_definitions
    where event_id = p_event_id and is_active = true
  ) d;

  return jsonb_build_object(
    'settings', coalesce(v_settings, '{}'::jsonb),
    'definitions', coalesce(v_definitions, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_pickem_prize_configuration(uuid) to authenticated;
grant execute on function public.get_pickem_prize_configuration(uuid) to anon;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
