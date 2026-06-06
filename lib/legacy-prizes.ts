export type NormalizedPrizeRule = {
  sourcePrizeId: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  category: 'general_ranking' | 'subscriber_bonus';
  rank: number;
};

export function isLegacyPrize(prize: {
  prize_category?: string | null;
  eligible_rank_start?: number | null;
  assignment_method?: string | null;
  tier?: string | null;
}): boolean {
  if (prize.prize_category == null) return true;
  if (prize.eligible_rank_start == null || prize.eligible_rank_start < 1) return true;
  if (prize.assignment_method == null) return true;
  return false;
}

export function normalizeLegacyPrize(prize: {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
  tier?: string | null;
  eligibility_type?: string | null;
}): NormalizedPrizeRule[] {
  const isSubLegacy =
    prize.tier === 'subscriber' ||
    prize.eligibility_type === 'subscribers';

  const category = isSubLegacy ? 'subscriber_bonus' : 'general_ranking';
  const count = Math.max(1, prize.quantity);
  const rules: NormalizedPrizeRule[] = [];

  const rankLabels: Record<string, string> = {
    '1': 'Top 1',
    '2': 'Top 2',
    '3': 'Top 3',
    '4': 'Top 4',
    '5': 'Top 5',
  };

  const subLabels: Record<string, string> = {
    '1': 'Mejor suscriptor',
    '2': 'Segundo mejor suscriptor',
    '3': 'Tercer mejor suscriptor',
    '4': 'Cuarto mejor suscriptor',
    '5': 'Quinto mejor suscriptor',
  };

  for (let i = 0; i < count; i++) {
    const rank = i + 1;
    const labels = category === 'subscriber_bonus' ? subLabels : rankLabels;
    const label = labels[String(rank)] ?? `${prize.label} #${rank}`;

    rules.push({
      sourcePrizeId: prize.id,
      label,
      description: prize.description,
      amount: prize.amount,
      currency: prize.currency,
      category,
      rank,
    });
  }

  return rules;
}

export function getMigrationStatus(prizes: Array<{ prize_category?: string | null }>, assignedCount: number): LegacyMigrationStatus {
  const hasLegacy = prizes.some((p) => isLegacyPrize(p));

  if (!hasLegacy) {
    if (assignedCount > 0) return 'migrated';
    if (prizes.length === 0) return 'not_required';
    return 'pending';
  }

  if (assignedCount > 0) return 'migrated';
  return 'pending';
}

export type LegacyMigrationStatus =
  | 'not_required'
  | 'pending'
  | 'migrated'
  | 'review_required'
  | 'failed';
