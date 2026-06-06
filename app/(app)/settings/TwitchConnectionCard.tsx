'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { linkTwitchAccount } from '@/app/actions/auth';
import { disableSubVerification, enableSubVerification } from '@/app/actions/twitch-sub-verification';

interface SubVerificationStatus {
  connected: boolean;
  enabled: boolean;
  twitchUsername?: string | null;
  twitchAvatarUrl?: string | null;
  scopes?: string[] | null;
  authorizedAt?: string | null;
  twitchUserId?: string | null;
}

export function TwitchConnectionCard({
  hasTwitch,
  twitchUsername,
  avatarUrl,
  subVerificationStatus,
}: {
  hasTwitch: boolean;
  twitchUsername: string | null;
  avatarUrl: string | null;
  subVerificationStatus: SubVerificationStatus;
}) {
  const router = useRouter();
  const [linkPending, setLinkPending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = useCallback(async () => {
    setLinkPending(true);
    await linkTwitchAccount();
  }, []);

  const handleEnable = useCallback(async () => {
    setActionPending(true);
    setError(null);
    const result = await enableSubVerification();
    setActionPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }, [router]);

  const handleDisable = useCallback(async () => {
    setActionPending(true);
    setError(null);
    const result = await disableSubVerification();
    setActionPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-4">
      {/* Twitch connection card */}
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
                disabled={linkPending}
                className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
              >
                {linkPending ? 'Conectando…' : 'Conectar Twitch'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscriber verification card — only if Twitch is connected */}
      {hasTwitch && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-text-primary">
                Verificación de suscriptores
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                {subVerificationStatus.enabled
                  ? 'PickHub puede detectar automáticamente qué participantes son suscriptores de tu canal.'
                  : 'Permite que PickHub detecte automáticamente qué participantes son suscriptores de tu canal.'}
              </p>

              {subVerificationStatus.enabled && (
                <div className="mt-4 space-y-2 rounded-lg bg-bg px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Verificación de suscriptores activa
                  </div>
                  {subVerificationStatus.twitchUsername && (
                    <p className="text-xs text-text-muted">
                      Canal autorizado: <span className="text-text-primary">{subVerificationStatus.twitchUsername}</span>
                    </p>
                  )}
                  {subVerificationStatus.authorizedAt && (
                    <p className="text-xs text-text-muted">
                      Autorizado: {new Date(subVerificationStatus.authorizedAt).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                  {subVerificationStatus.scopes && subVerificationStatus.scopes.length > 0 && (
                    <p className="text-xs text-text-muted">
                      Permisos: <code className="text-text-primary">{subVerificationStatus.scopes.join(', ')}</code>
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="mt-2 text-xs text-danger">{error}</p>
              )}
            </div>

            <div className="shrink-0">
              {subVerificationStatus.enabled ? (
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={actionPending}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  {actionPending ? 'Desactivando…' : 'Desactivar'}
                </button>
              ) : subVerificationStatus.connected ? (
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={actionPending}
                  className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
                >
                  {actionPending ? 'Activando…' : 'Activar verificación'}
                </button>
              ) : (
                <a
                  href="/auth/twitch/sub-verification"
                  className="inline-flex items-center rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                >
                  Activar verificación
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
