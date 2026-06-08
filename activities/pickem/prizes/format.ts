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
