export type AuthErrorField = 'email' | 'password' | 'confirmPassword' | 'general';

export type AuthErrorResult = {
  code: string;
  message: string;
  field?: AuthErrorField;
};

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'Cancelaste el inicio de sesión con Twitch.',
  server_error: 'No pudimos completar el inicio de sesión con Twitch. Inténtalo nuevamente.',
  temporarily_unavailable: 'El servicio de Twitch no está disponible momentáneamente. Intenta más tarde.',
  redirect_uri_mismatch: 'No pudimos conectar con Twitch en este momento.',
  invalid_client: 'No pudimos conectar con Twitch en este momento.',
  recovery_expired: 'Este enlace de recuperación ha expirado. Solicita uno nuevo.',
  recovery_invalid: 'El enlace de recuperación no es válido.',
  recovery_failed: 'No pudimos restablecer tu contraseña. Solicita un nuevo enlace.',
  verification_failed: 'No pudimos verificar tu enlace. Inténtalo nuevamente.',
  missing_params: 'El enlace de recuperación es inválido.',
};

export function normalizeAuthError(error: unknown): AuthErrorResult {
  if (!error) {
    return { code: 'unknown', message: 'Ocurrió un error inesperado. Inténtalo nuevamente.' };
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return { code: 'network', message: 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.' };
  }

  const msg = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);

  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return { code: 'invalid_credentials', message: 'El correo o la contraseña son incorrectos.', field: 'general' };
  }

  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return { code: 'email_not_confirmed', message: 'Debes confirmar tu correo antes de iniciar sesión.', field: 'email' };
  }

  if (lower.includes('already registered') || lower.includes('user already registered')) {
    return { code: 'user_exists', message: 'Ya existe una cuenta asociada a este correo.', field: 'email' };
  }

  if (lower.includes('password should be at least') || lower.includes('weak_password')) {
    return { code: 'weak_password', message: 'La contraseña debe tener al menos 8 caracteres.', field: 'password' };
  }

  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('sending rate')) {
    return { code: 'rate_limited', message: 'Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.' };
  }

  if (lower.includes('invalid email') || lower.includes('email invalid')) {
    return { code: 'invalid_email', message: 'Ingresa un correo electrónico válido.', field: 'email' };
  }

  if (lower.includes('same password') || lower.includes('password must be different')) {
    return { code: 'same_password', message: 'La nueva contraseña debe ser diferente a la anterior.', field: 'password' };
  }

  if (lower.includes('expired') || lower.includes('invalid link')) {
    return { code: 'link_expired', message: 'Este enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.' };
  }

  if (lower.includes('unable to exchange') || lower.includes('exchange code')) {
    return { code: 'oauth_exchange_failed', message: 'No pudimos completar el inicio de sesión con Twitch. Inténtalo nuevamente.' };
  }

  if (lower.includes('missing code') || lower.includes('missing_code')) {
    return { code: 'missing_code', message: 'No pudimos completar el inicio de sesión con Twitch. Inténtalo nuevamente.' };
  }

  if (lower.includes('access_denied') || lower.includes('access denied')) {
    return { code: 'access_denied', message: 'Cancelaste el inicio de sesión con Twitch.' };
  }

  return { code: code || 'unknown', message: msg.slice(0, 200) };
}

export function normalizeOAuthError(errorCode: string, errorDescription?: string): AuthErrorResult {
  const message = OAUTH_ERRORS[errorCode];
  if (message) {
    return { code: errorCode, message };
  }
  if (errorDescription) {
    return { code: errorCode, message: errorDescription };
  }
  return { code: errorCode, message: 'Ocurrió un error inesperado al iniciar sesión con Twitch.' };
}
