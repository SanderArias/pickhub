export function getPredictionConfigurationSummary(
  predictions: Array<{
    template_type?: string | null;
    config?: Record<string, unknown> | null;
    pick_type?: string;
    max_selections?: number | null;
  }>,
): string {
  const active = predictions.filter((p) => p.template_type !== undefined || p.pick_type !== undefined);

  const templatePred = active.find((p) => p.template_type);
  if (templatePred) {
    const positions = (templatePred.config?.positions as number) ?? 8;
    return `Top ${positions} \u00b7 Plantilla PickHub`;
  }

  if (active.length === 0) return 'Sin predicciones';

  if (active.length === 1) {
    const q = active[0];
    if (q.pick_type === 'player' && q.max_selections) {
      return `1 pregunta \u00b7 Top ${q.max_selections}`;
    }
    return '1 pregunta';
  }

  return `${active.length} preguntas`;
}

export type PrizeConfigurationSummary = {
  primary: string;
  secondary?: string;
};

export function getPrizeConfigurationSummary(
  prizes: Array<{
    prize_category?: string | null;
    amount?: number | null;
    currency?: string | null;
  }>,
): PrizeConfigurationSummary {
  const general = prizes.filter((p) => p.prize_category === 'general_ranking' || !p.prize_category);
  const sub = prizes.filter((p) => p.prize_category === 'subscriber_bonus');

  if (prizes.length === 0) {
    return { primary: 'Sin premios configurados' };
  }

  const parts: string[] = [];
  if (general.length > 0) {
    parts.push(`${general.length} ${general.length === 1 ? 'premio general' : 'premios generales'}`);
  }
  if (sub.length > 0) {
    const label = sub.length === 1 ? 'beneficio para subs' : 'beneficios para subs';
    parts.push(`${sub.length} ${label}`);
  }
  const primary = parts.join(' \u00b7 ');

  const withValue = prizes.filter((p) => p.amount !== null && p.amount !== undefined);
  if (withValue.length > 0) {
    const currencies = new Set(withValue.map((p) => p.currency ?? 'USD'));
    if (currencies.size === 1) {
      const total = withValue.reduce((sum, p) => sum + (p.amount ?? 0), 0);
      const currency = [...currencies][0];
      return {
        primary,
        secondary: `Valor estimado: ${currency} ${total.toLocaleString('es-ES')}`,
      };
    }
  }

  return { primary };
}
