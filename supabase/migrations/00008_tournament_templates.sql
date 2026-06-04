-- ============================================================================
-- PickHub – Tournament Templates
-- Migration: 00008_tournament_templates
-- ============================================================================
-- Admins define tournament templates that creators use to bootstrap events.
-- Each template specifies default configuration for a tournament type.
-- ============================================================================

create table tournament_templates (
  id                uuid         primary key default gen_random_uuid(),
  name              text         not null,
  description       text,
  logo_url          text,
  max_participants  integer,
  pickem_close_before interval,
  is_active         boolean      not null default true,
  created_by        uuid         not null references profiles(id),
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create trigger trg_tournament_templates_updated_at
  before update on tournament_templates
  for each row execute function update_updated_at();

comment on column tournament_templates.pickem_close_before is
  'How long before the event starts that picks close (e.g. ''2 hours'', ''1 day'')';

-- RLS
alter table tournament_templates enable row level security;

create policy "Templates are readable by authenticated users"
  on tournament_templates for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert templates"
  on tournament_templates for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update templates"
  on tournament_templates for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete templates"
  on tournament_templates for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Indexes
create index idx_tournament_templates_created_by on tournament_templates (created_by);
create index idx_tournament_templates_active on tournament_templates (is_active);
