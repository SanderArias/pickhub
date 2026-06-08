export type NormalizedPrizeMoney = {
  amount: number | null;
  currency: string | null;
};

export function normalizePrizeMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): NormalizedPrizeMoney {
  const hasAmount =
    amount !== null &&
    amount !== undefined &&
    amount !== '';

  if (!hasAmount) {
    return { amount: null, currency: null };
  }

  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
    throw new Error('El monto del premio no es válido.');
  }

  const normalizedCurrency = currency?.trim().toUpperCase() ?? '';

  if (normalizedCurrency.length !== 3) {
    throw new Error('Selecciona una moneda válida para el premio.');
  }

  return {
    amount: normalizedAmount,
    currency: normalizedCurrency,
  };
}
