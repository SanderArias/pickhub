export type EventStatus = 'draft' | 'open' | 'predictions_closed' | 'completed';

export type StatusTone = 'purple' | 'warning' | 'success';

export interface StatusConfig {
  dot: string;
  title: string;
  description: string;
}

export const EVENT_STATUS_CONFIG: Record<EventStatus, StatusConfig> = {
  draft: {
    dot: 'bg-purple-primary',
    title: 'Borrador',
    description: 'Configura tu Pick\u2019em antes de publicarlo.',
  },
  open: {
    dot: 'bg-purple-primary',
    title: 'Predicciones abiertas',
    description: 'Los participantes pueden enviar sus predicciones.',
  },
  predictions_closed: {
    dot: 'bg-warning',
    title: 'Predicciones cerradas',
    description: 'Ya no se aceptan nuevas participaciones.',
  },
  completed: {
    dot: 'bg-success',
    title: 'Evento completado',
    description: 'La clasificaci\u00f3n final y los premios ya est\u00e1n disponibles.',
  },
};
