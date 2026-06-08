export type PrizeCategory = 'general_rank' | 'subscriber_benefit';

export type PrizeStackingPolicy = 'allow_both' | 'pass_subscriber_benefit';

export interface PrizeDefinition {
  id: string;
  eventId: string;
  category: PrizeCategory;
  rankPosition: number | null;
  subscriberOrder: number | null;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrizeSettings {
  stackingPolicy: PrizeStackingPolicy;
}

export interface PrizeConfiguration {
  settings: PrizeSettings;
  generalPrizes: PrizeDefinition[];
  subscriberBenefits: PrizeDefinition[];
}

export type AwardAssignmentSource = 'automatic_ranking' | 'automatic_subscriber' | 'tiebreaker' | 'manual_adjustment';
export type AwardAssignmentStatus = 'pending' | 'assigned' | 'revoked';

export interface PrizeAward {
  id: string;
  eventId: string;
  prizeDefinitionId: string;
  profileId: string | null;
  awardedRank: number | null;
  subscriberRank: number | null;
  subscriberVerified: boolean;
  assignmentSource: AwardAssignmentSource;
  assignmentStatus: AwardAssignmentStatus;
  awardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavePrizeConfigurationPayload {
  eventId: string;
  stackingPolicy: PrizeStackingPolicy;
  definitions: Array<{
    clientId?: string;
    id?: string;
    category: PrizeCategory;
    rankPosition: number | null;
    subscriberOrder: number | null;
    title: string;
    description: string | null;
    amount: number | null;
    currency: string | null;
    sortOrder: number;
  }>;
}

export type SavePrizeConfigurationResult =
  | {
      success: true;
      savedCount: number;
      saved: Array<{ clientId: string; id: string }>;
    }
  | {
      success: false;
      errorMessage: string;
      errorCode: string | null;
      errorDetails: string | null;
      errorHint: string | null;
      errorOperation: string | null;
    };

export interface AssignPrizesResult {
  success: boolean;
  assigned: number;
  pending: number;
  hasTies: boolean;
  error?: string;
}
