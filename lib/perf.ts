const IS_DEV = process.env.NODE_ENV === 'development';

export const perf = {
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!IS_DEV) return fn();
    const startedAt = performance.now();
    try {
      return await fn();
    } finally {
      console.log(`[performance:${label}]`, {
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  },

  measureSync<T>(label: string, fn: () => T): T {
    if (!IS_DEV) return fn();
    const startedAt = performance.now();
    try {
      return fn();
    } finally {
      console.log(`[performance:${label}]`, {
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  },

  mark(label: string, detail?: string) {
    if (IS_DEV) {
      const msg = detail ? `${label} — ${detail}` : label;
      console.log(`[performance] ${msg}`);
    }
  },
};
