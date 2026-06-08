/**
 * Returns a human-readable target label for a prize.
 * General prizes → "Top N"
 * Subscriber benefits → "Mejor suscriptor" / "N.º mejor suscriptor"
 * Returns null when insufficient data is available.
 */
export function getPrizeTargetLabel(
  rankPosition: number | null,
  subscriberOrder: number | null,
  category: string | null | undefined,
): string | null {
  if (category === 'general_ranking' && rankPosition != null) {
    return `Top ${rankPosition}`;
  }
  if (category === 'subscriber_bonus' && subscriberOrder != null) {
    if (subscriberOrder === 1) return 'Mejor suscriptor';
    return `${subscriberOrder}.º mejor suscriptor`;
  }
  return null;
}

export function formatPrizeAmount(
  amount: number | null,
  currency: string | null,
  locale = 'es-DO',
): string | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const cur = currency ?? 'USD';
  if (cur.length !== 3) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-ES')} ${cur}`;
  }
}
