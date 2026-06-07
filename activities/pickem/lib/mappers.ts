import type { EventRow } from '@/types/database-helpers';
import type { PickemEvent, PickemSettings, PickemPhase, CreatorEvent } from '@/activities/pickem/types';

export function mapEventRowToPickemEvent(row: EventRow): PickemEvent {
  return {
    id: row.id,
    type: 'pickem',
    creatorId: row.creator_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    status: row.status,
    phase: row.status as PickemPhase,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pickem: mapEventRowToPickemSettings(row),
  };
}

export function mapEventRowToPickemSettings(row: EventRow): PickemSettings {
  return {
    twitchChannel: row.twitch_channel,
    predictionsCloseTimezone: row.predictions_close_timezone,
    prizeStackingPolicy: row.prize_stacking_policy,
    scoringConfig: row.scoring_config as Record<string, unknown>,
  };
}

export function mapEventRowToCreatorEvent(
  row: EventRow,
  prizeCount: number,
  submissionCount: number,
): CreatorEvent {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    ends_at: row.ends_at,
    event_config: row.event_config as Record<string, unknown>,
    created_at: row.created_at,
    updated_at: row.updated_at,
    prizeCount,
    submissionCount,
  };
}
