'use client';

export function SubscriberTwitchEligibilityNotice() {
  return (
    <p className="text-xs text-text-muted">
      Conecta tu cuenta de Twitch para verificar si eres elegible para los beneficios de suscriptores.{' '}
      <a
        href="/settings"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-purple-primary hover:text-purple-hover transition-colors"
      >
        Conectar Twitch
        <span className="sr-only">, se abre en una pestaña nueva</span>
      </a>
    </p>
  );
}
