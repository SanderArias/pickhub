const IS_DEV = process.env.NODE_ENV === 'development';

export const perf = {
  start(label: string) {
    if (IS_DEV) console.time(label);
  },
  end(label: string) {
    if (IS_DEV) console.timeEnd(label);
  },
  mark(label: string, detail?: string) {
    if (IS_DEV) {
      const msg = detail ? `${label} — ${detail}` : label;
      console.log(`[performance] ${msg}`);
    }
  },
};
