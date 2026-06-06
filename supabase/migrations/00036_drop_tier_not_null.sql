-- migration/00036_drop_tier_not_null.sql
--
-- Drop the legacy NOT NULL constraint on event_prizes.tier.
--
-- Migration 00035 widened the CHECK constraint to allow null tier
-- (tier is null or tier in ('subscriber', 'nonsubscriber')) but
-- the column still has NOT NULL from the original definition in 00002.
-- This causes error 23502 ("null value in column tier violates not-null
-- constraint") when inserting prizes without tier.
--
-- The application code stopped sending tier in migration 00034/00035.
-- Existing rows keep their tier values for backward compatibility.

alter table public.event_prizes
  alter column tier drop not null;

notify pgrst, 'reload schema';
