import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';
import { getAppUrl } from '@/lib/app-url';

const TWITCH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';

function validateConfig(): string | null {
  if (!process.env.TWITCH_CLIENT_ID) return 'TWITCH_CLIENT_ID no configurado';
  if (!process.env.TWITCH_CLIENT_SECRET) return 'TWITCH_CLIENT_SECRET no configurado';

  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) return 'TOKEN_ENCRYPTION_KEY no configurado';
  if (key.length < 16) return 'TOKEN_ENCRYPTION_KEY debe tener al menos 16 caracteres';

  if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL && process.env.NODE_ENV !== 'development') {
    return 'APP_URL no configurado';
  }

  return null;
}

function getAppOrigin(): string {
  return getAppUrl();
}

function redirectToSettings(reason: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/settings?sub_verification=error&reason=${encodeURIComponent(reason)}`, getAppUrl()),
  );
}

export async function GET() {
  const configError = validateConfig();
  if (configError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/sub-verification] Config error:', configError);
    }
    return redirectToSettings(`missing_config: ${configError}`);
  }

  try {
    const supabase = await createServerClient();
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data?.user) {
      return NextResponse.redirect(new URL('/login', getAppUrl()));
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/sub-verification] Auth error:', err);
    }
    return redirectToSettings('auth_failed');
  }

  let state: string;
  try {
    state = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cookieStore = await cookies();
    cookieStore.set('twitch_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/sub-verification] State/cookie error:', err);
    }
    return redirectToSettings('state_failed');
  }

  const callbackUrl = `${getAppOrigin()}/auth/twitch/callback`;
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'channel:read:subscriptions',
    state,
  });

  const twitchUrl = `${TWITCH_AUTHORIZE_URL}?${params.toString()}`;

  if (process.env.NODE_ENV === 'development') {
    console.log('[twitch/sub-verification] Redirecting to Twitch OAuth');
    console.log('[twitch/sub-verification] Redirect URI:', callbackUrl);
  }

  return NextResponse.redirect(twitchUrl);
}
