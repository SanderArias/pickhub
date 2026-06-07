import type { ActivityType } from '@/activities/registry';

export type ActivityLifecycleStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'archived';

export type ActivitySummary = {
  id: string;
  type: ActivityType;
  creatorId: string;
  title: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityDetail = ActivitySummary & {
  eventConfig: Record<string, unknown>;
  isPublic: boolean;
  maxParticipants: number | null;
};

export type CreatorActivityListItem = ActivitySummary & {
  prizeCount: number;
  submissionCount: number;
};
