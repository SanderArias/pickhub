'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/inicio');
        }
      }}
      className="rounded-lg border border-purple-primary px-6 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary/50"
    >
      Volver atr&aacute;s
    </button>
  );
}
