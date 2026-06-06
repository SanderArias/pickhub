'use client';

import { useState } from 'react';
import { linkTwitchAccount } from '@/app/actions/auth';

export function TwitchConnectionCard({
  hasTwitch,
  twitchUsername,
  avatarUrl,
}: {
  hasTwitch: boolean;
  twitchUsername: string | null;
  avatarUrl: string | null;
}) {
  const [pending, setPending] = useState(false);

  async function handleLink() {
    setPending(true);
    await linkTwitchAccount();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-text-primary">
            {hasTwitch ? 'Twitch conectado' : 'Conexión Twitch'}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            {hasTwitch
              ? 'Tu cuenta de Twitch está enlazada a PickHub.'
              : 'Conecta tu cuenta de Twitch para acceder al modo creador.'}
          </p>
          {hasTwitch && (
            <div className="mt-4 rounded-lg bg-bg px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Cuenta Twitch
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                )}
                {twitchUsername ? (
                  <span className="text-sm font-medium text-text-primary">
                    {twitchUsername}
                  </span>
                ) : (
                  <span className="text-sm text-text-muted">
                    Cuenta de Twitch conectada
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {!hasTwitch && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleLink}
              disabled={pending}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
            >
              {pending ? 'Conectando…' : 'Conectar Twitch'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
