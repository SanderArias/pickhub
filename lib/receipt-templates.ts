export type ReceiptTemplate = 'classic' | 'gradient';

export const RECEIPT_TEMPLATES: { value: ReceiptTemplate; label: string; description: string }[] = [
  { value: 'classic', label: 'Clásico negro', description: 'Diseño limpio, sobrio y de alto contraste.' },
  { value: 'gradient', label: 'Degradado', description: 'Diseño llamativo con morado, azul y turquesa.' },
];

export const ALLOWED_RECEIPT_TEMPLATES = ['classic', 'gradient'] as const;

export function isValidReceiptTemplate(value: string): value is ReceiptTemplate {
  return ALLOWED_RECEIPT_TEMPLATES.includes(value as ReceiptTemplate);
}

export function getPredictionSubtitle(
  templateType: string | null,
  config?: { positions?: number } | null,
  maxSelections?: number | null,
  optionsLength?: number,
): string | undefined {
  if (templateType !== 'top8_ordered') return undefined;
  const topN = config?.positions ?? maxSelections ?? optionsLength ?? 0;
  if (topN === 8) return 'FINALISTAS';
  if (topN > 0) return `TOP ${topN}`;
  return undefined;
}
