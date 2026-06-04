-- Grant base SQL privileges for the Creator Pick'em flow.
-- These grants do NOT disable RLS.
-- RLS continues to control which rows each user can read/write.
-- They are required so that Server Actions using Supabase Auth can operate on these tables.

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_prizes to authenticated;
grant select on public.dynamic_types to authenticated;
grant select on public.creator_profiles to authenticated;
