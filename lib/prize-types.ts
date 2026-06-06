export type PrizeEligibilityType = 'all' | 'subscribers' | 'non_subscribers';
export type PrizeAssignmentMethod = 'ranking';
export type PrizeStackingPolicy = 'single_prize_per_participant' | 'allow_multiple_prizes';

export interface Prize {
  id: string;
  event_id: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
  eligibility_type: PrizeEligibilityType;
  assignment_method: PrizeAssignmentMethod;
  eligible_rank_start: number;
  sort_order: number;
  prize_category?: string | null;
  created_at: string;
  updated_at: string;
}

export type PrizeCategory = 'general_ranking' | 'subscriber_bonus';

export const ELIGIBILITY_LABELS: Record<PrizeEligibilityType, string> = {
  all: 'Todos los participantes',
  subscribers: 'Solo suscriptores verificados',
  non_subscribers: 'Solo no suscriptores verificados',
};

export const ELIGIBILITY_DESCRIPTIONS: Record<PrizeEligibilityType, string> = {
  all: 'Participan todos, independientemente de su estado de suscripción.',
  subscribers: 'Solo participan usuarios confirmados como suscriptores del canal mediante Twitch.',
  non_subscribers: 'Solo participan usuarios confirmados como no suscriptores.',
};

export const ELIGIBILITY_GROUP_LABELS: Record<PrizeEligibilityType, string> = {
  all: 'participante',
  subscribers: 'suscriptor verificado',
  non_subscribers: 'no suscriptor verificado',
};

export const METHOD_LABELS: Record<PrizeAssignmentMethod, string> = {
  ranking: 'Según clasificación',
};

export const METHOD_DESCRIPTIONS: Record<PrizeAssignmentMethod, string> = {
  ranking: 'El premio se asigna según la posición dentro del grupo elegible.',
};

export const STACKING_LABELS: Record<PrizeStackingPolicy, string> = {
  single_prize_per_participant: 'Máximo un premio por participante',
  allow_multiple_prizes: 'Permitir que un participante gane varios premios',
};

export const STACKING_DESCRIPTIONS: Record<PrizeStackingPolicy, string> = {
  single_prize_per_participant: 'Distribuye las recompensas entre más ganadores. Cuando una persona recibe un premio, queda excluida de los premios procesados posteriormente.',
  allow_multiple_prizes: 'Una misma persona puede recibir varias recompensas si cumple las condiciones de cada premio.',
};

export const CURRENCIES = ['USD', 'DOP', 'EUR'] as const;

export function prizeRangePreview(
  eligibility: PrizeEligibilityType,
  rankStart: number,
  winnerCount: number,
): string {
  const group = ELIGIBILITY_GROUP_LABELS[eligibility];

  if (eligibility === 'all') {
    if (rankStart === 1 && winnerCount === 1) {
      return 'Este premio se asignará al participante mejor clasificado.';
    }
    if (rankStart === 1 && winnerCount > 1) {
      return `Este premio se asignará del 1.º al ${winnerCount}.º participante clasificado.`;
    }
    if (winnerCount === 1) {
      return `Este premio se asignará al ${rankStart}.º participante clasificado.`;
    }
    const end = rankStart + winnerCount - 1;
    return `Este premio se asignará del ${rankStart}.º al ${end}.º participante clasificado.`;
  }

  if (eligibility === 'subscribers' || eligibility === 'non_subscribers') {
    if (rankStart === 1 && winnerCount === 1) {
      return `Este premio se asignará al ${group} mejor clasificado.`;
    }
    if (rankStart === 1 && winnerCount > 1) {
      const groupPlural = group + (group.endsWith('o') ? 's' : 'es');
      return `Este premio se asignará a los ${winnerCount} ${groupPlural} mejor clasificados.`;
    }
    if (winnerCount === 1) {
      return `Este premio se asignará al ${rankStart}.º ${group} mejor clasificado.`;
    }
    const end = rankStart + winnerCount - 1;
    const groupPlural = group.endsWith('o') ? `${group}s` : `${group}es`;
    return `Este premio se asignará al ${rankStart}.º y ${end}.º ${groupPlural} mejor clasificados.`;
  }

  return '';
}
