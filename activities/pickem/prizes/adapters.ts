import type { PrizeConfiguration, PrizeDefinition, SavePrizeConfigurationPayload } from './types';

// UI-facing model for PrizeSection
export interface PrizeSectionModel {
  generalPrizes: PrizeSectionDraft[];
  subPrizes: PrizeSectionDraft[];
  stackingPolicy: string;
}

export interface PrizeSectionDraft {
  localId: string;
  persistedId: string | null;
  category: 'general_ranking' | 'subscriber_bonus';
  rank: number;
  label: string;
  description: string;
  amount: string;
  currency: string;
}

const STACKING_POLICY_MAP: Record<string, string> = {
  allow_both: 'allow_multiple_prizes',
  pass_subscriber_benefit: 'single_prize_per_participant',
};

const REVERSE_STACKING_POLICY_MAP: Record<string, string> = {
  allow_multiple_prizes: 'allow_both',
  single_prize_per_participant: 'pass_subscriber_benefit',
};

export function mapPrizeConfigurationToSectionModel(config: PrizeConfiguration): PrizeSectionModel {
  const generalPrizes: PrizeSectionDraft[] = config.generalPrizes.map((p) => ({
    localId: `db_${p.id}`,
    persistedId: p.id,
    category: 'general_ranking' as const,
    rank: p.rankPosition ?? 1,
    label: p.title,
    description: p.description ?? '',
    amount: p.amount !== null ? String(p.amount) : '',
    currency: p.currency ?? '',
  }));

  const subPrizes: PrizeSectionDraft[] = config.subscriberBenefits.map((p) => ({
    localId: `db_${p.id}`,
    persistedId: p.id,
    category: 'subscriber_bonus' as const,
    rank: p.subscriberOrder ?? 1,
    label: p.title,
    description: p.description ?? '',
    amount: p.amount !== null ? String(p.amount) : '',
    currency: p.currency ?? '',
  }));

  return {
    generalPrizes,
    subPrizes,
    stackingPolicy: STACKING_POLICY_MAP[config.settings.stackingPolicy] ?? 'allow_multiple_prizes',
  };
}

export interface PrizeSectionSaveState {
  generalPrizes: Array<{
    localId: string;
    persistedId: string | null;
    rank: number;
    label: string;
    description: string;
    amount: string;
    currency: string;
  }>;
  subPrizes: Array<{
    localId: string;
    persistedId: string | null;
    rank: number;
    label: string;
    description: string;
    amount: string;
    currency: string;
  }>;
  stackingPolicy: string;
}

function parseAmount(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function mapSectionStateToSavePayload(
  eventId: string,
  state: PrizeSectionSaveState,
): SavePrizeConfigurationPayload {
  const stackingPolicy = (REVERSE_STACKING_POLICY_MAP[state.stackingPolicy] ?? 'allow_both') as 'allow_both' | 'pass_subscriber_benefit';

  const generalDefs = state.generalPrizes.map((p) => ({
    clientId: p.localId,
    id: p.persistedId ?? undefined,
    category: 'general_rank' as const,
    rankPosition: p.rank,
    subscriberOrder: null,
    title: p.label.trim(),
    description: p.description || null,
    amount: parseAmount(p.amount),
    currency: p.currency.trim() || null,
    sortOrder: p.rank,
  }));

  const subDefs = state.subPrizes.map((p) => ({
    clientId: p.localId,
    id: p.persistedId ?? undefined,
    category: 'subscriber_benefit' as const,
    rankPosition: null,
    subscriberOrder: p.rank,
    title: p.label.trim(),
    description: p.description || null,
    amount: parseAmount(p.amount),
    currency: p.currency.trim() || null,
    sortOrder: 1000 + p.rank,
  }));

  return {
    eventId,
    stackingPolicy,
    definitions: [...generalDefs, ...subDefs],
  };
}
