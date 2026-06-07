export type EventStatus = 'draft' | 'open' | 'predictions_closed' | 'completed';

export type StatusTone = 'purple' | 'warning' | 'success';

export interface StatusConfig {
  dot: string;
  title: string;
  description: string;
}

export type SubmissionStatusTone = 'success' | 'warning';

export interface SubmittedStatusConfig {
  label: string;
  description: string;
  contextualMessage: string;
  tone: SubmissionStatusTone;
}

export const SUBMITTED_PREDICTION_STATUS_CONFIG: Record<string, SubmittedStatusConfig> = {
  open: {
    label: 'Predicción enviada',
    description: 'Tu Top 8 quedó registrado correctamente.',
    contextualMessage: "El Pick'em continúa abierto hasta que el creador cierre las predicciones.",
    tone: 'success',
  },
  predictions_closed: {
    label: 'Predicción enviada',
    description: 'Tu Top 8 quedó registrado correctamente.',
    contextualMessage: 'Las predicciones ya están cerradas. Tu selección quedó bloqueada.',
    tone: 'warning',
  },
  completed: {
    label: 'Resultados disponibles',
    description: 'Tu predicción ya fue puntuada.',
    contextualMessage: 'Consulta tus puntos, tu posición y la clasificación final.',
    tone: 'success',
  },
};

export const EVENT_STATUS_CONFIG: Record<EventStatus, StatusConfig> = {
  draft: {
    dot: 'bg-purple-primary',
    title: 'Borrador',
    description: 'Configura tu Pick\'em antes de publicarlo.',
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
    description: 'La clasificación final y los premios ya están disponibles.',
  },
};
