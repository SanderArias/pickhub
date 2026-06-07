'use client';

import { useState, useEffect } from 'react';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  server_error: 'El inicio de sesi\u00f3n con Twitch fall\u00f3 temporalmente. Intenta de nuevo.',
  access_denied: 'Inicio de sesi\u00f3n cancelado. No otorgaste permiso a la aplicaci\u00f3n.',
  redirect_uri_mismatch: 'Error de configuraci\u00f3n: la URL de redirecci\u00f3n no coincide. Contacta al soporte.',
  invalid_client: 'Error de configuraci\u00f3n de autenticaci\u00f3n. Contacta al soporte.',
  temporarily_unavailable: 'El servicio de Twitch no est\u00e1 disponible moment\u00e1neamente. Intenta m\u00e1s tarde.',
};

function getError(): { code: string; description: string } | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashErr = hashParams.get('error');
  if (hashErr) {
    return { code: hashErr, description: hashParams.get('error_description') ?? '' };
  }
  const qs = new URLSearchParams(window.location.search);
  const queryErr = qs.get('error');
  if (queryErr && queryErr !== 'missing_code') {
    return { code: queryErr, description: qs.get('error_description') ?? '' };
  }
  return null;
}

export function OAuthErrorBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const error = getError();
  if (!error) return null;

  const message = OAUTH_ERROR_MESSAGES[error.code]
    || error.description
    || 'Ocurri\u00f3 un error inesperado al iniciar sesi\u00f3n con Twitch.';

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
      <p className="font-medium">Error de autenticaci&oacute;n</p>
      <p className="mt-0.5 text-xs text-danger/80">{message}</p>
    </div>
  );
}
