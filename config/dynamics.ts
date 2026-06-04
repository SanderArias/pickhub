import type { DynamicType } from '@/types';

export interface DynamicDefinition {
  type: DynamicType;
  label: string;
  description: string;
  enabled: boolean;
}

export const DYNAMICS: Record<DynamicType, DynamicDefinition> = {
  pickem: {
    type: 'pickem',
    label: "Pick'em",
    description: 'Predicciones de resultados en torneos',
    enabled: true,
  },
  trivia: {
    type: 'trivia',
    label: 'Trivia',
    description: 'Preguntas y respuestas',
    enabled: true,
  },
  bingo: {
    type: 'bingo',
    label: 'Bingo',
    description: 'Cartones de bingo interactivos',
    enabled: true,
  },
  voting: {
    type: 'voting',
    label: 'Votaciones',
    description: 'Encuestas y votaciones en tiempo real',
    enabled: true,
  },
  fantasy: {
    type: 'fantasy',
    label: 'Fantasy League',
    description: 'Ligas de fantasía',
    enabled: true,
  },
  raffle: {
    type: 'raffle',
    label: 'Sorteos',
    description: 'Rifas y sorteos aleatorios',
    enabled: true,
  },
} as const;
