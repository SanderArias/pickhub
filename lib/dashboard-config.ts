export type ActionType =
  | 'continue_setup'
  | 'register_results'
  | 'resolve_tiebreaker'
  | 'publish_results'
  | 'share_pickem';

export type ActionTone = 'neutral' | 'warning' | 'success' | 'purple';

export interface ActionTypeConfig {
  label: string;
  description: string;
  tone: ActionTone;
  priority: number;
}

export const ACTION_CONFIG: Record<ActionType, ActionTypeConfig> = {
  continue_setup: {
    label: 'Continuar configuración',
    description: 'Borrador incompleto',
    tone: 'neutral',
    priority: 50,
  },
  register_results: {
    label: 'Registrar resultados',
    description: 'Resultados pendientes',
    tone: 'warning',
    priority: 20,
  },
  resolve_tiebreaker: {
    label: 'Resolver desempate',
    description: 'Desempate pendiente',
    tone: 'warning',
    priority: 10,
  },
  publish_results: {
    label: 'Publicar resultados',
    description: 'Listo para publicar',
    tone: 'success',
    priority: 40,
  },
  share_pickem: {
    label: "Compartir Pick'em",
    description: 'Sin participaciones',
    tone: 'purple',
    priority: 30,
  },
};

export interface AttentionItem {
  title: string;
  slug: string;
  actionType: ActionType;
  href: string;
}

export interface MetricDef {
  label: string;
  value: number;
  context: string;
  tone: 'neutral' | 'purple' | 'warning' | 'success';
  href?: string;
}
