export type SerializableActionError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  constraint?: string;
  operation?: string;
};

function extractConstraintName(message: string): string | undefined {
  const m = message.match(/unique constraint "([^"]+)"/);
  return m?.[1] ?? undefined;
}

export function serializeActionError(
  error: unknown,
  operation?: string,
): SerializableActionError {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>;
    const message =
      typeof candidate.message === 'string'
        ? candidate.message
        : 'Error desconocido';
    const code =
      typeof candidate.code === 'string'
        ? candidate.code
        : undefined;
    const details =
      typeof candidate.details === 'string'
        ? candidate.details
        : undefined;
    const hint =
      typeof candidate.hint === 'string'
        ? candidate.hint
        : undefined;
    const constraint =
      typeof candidate.constraint === 'string'
        ? candidate.constraint
        : extractConstraintName(message);
    return { message, code, details, hint, constraint, operation };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      operation,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Error desconocido',
    operation,
  };
}
