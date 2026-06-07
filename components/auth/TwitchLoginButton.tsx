'use client';

import { useTransition } from 'react';
import { signInWithTwitch } from '@/app/actions/auth';

export function TwitchLoginButton({
  next = '/inicio',
  variant = 'outline',
}: {
  next?: string;
  variant?: 'link' | 'outline';
}) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await signInWithTwitch(next);
    });
  };

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs font-medium text-purple-primary hover:text-purple-hover transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-50"
      >
        {pending ? 'Conectando con Twitch…' : 'Continuar con Twitch'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-purple-primary/40 px-4 py-2.5 text-sm font-medium text-purple-primary transition-all hover:bg-purple-primary/10 focus:outline-none focus:ring-2 focus:ring-purple-primary/30 disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
      {pending ? 'Conectando con Twitch…' : 'Continuar con Twitch'}
    </button>
  );
}
