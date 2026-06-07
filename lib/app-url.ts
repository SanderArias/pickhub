export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'getAppUrl: NEXT_PUBLIC_APP_URL no está configurado y no se detectó VERCEL_URL. ' +
    'Configura NEXT_PUBLIC_APP_URL en las variables de entorno de Vercel (Production + Preview).',
  );
}
