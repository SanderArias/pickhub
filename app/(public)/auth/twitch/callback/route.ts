import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';
import { exchangeCodeForToken, getTwitchUser } from '@/lib/twitch-api';
import { encrypt } from '@/lib/twitch-crypto';
import { getAppUrl } from '@/lib/app-url';

const APP_URL = getAppUrl();

function errRedirect(reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/settings?sub_verification=error&reason=${encodeURIComponent(reason)}`, APP_URL));
}

function okRedirect(): NextResponse {
  return NextResponse.redirect(new URL('/settings?sub_verification=activated', APP_URL));
}

const MISSING: string[] = [];
if (!process.env.TWITCH_CLIENT_ID) MISSING.push('TWITCH_CLIENT_ID');
if (!process.env.TWITCH_CLIENT_SECRET) MISSING.push('TWITCH_CLIENT_SECRET');
if (!process.env.TOKEN_ENCRYPTION_KEY) MISSING.push('TOKEN_ENCRYPTION_KEY');
if (!process.env.NEXT_PUBLIC_APP_URL) MISSING.push('NEXT_PUBLIC_APP_URL');

export async function GET(request: Request) {
  if (MISSING.length > 0) {
    const reason = `missing_config: ${MISSING.join(', ')}`;
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback]', reason);
    }
    return errRedirect(reason);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const err = searchParams.get('error');

  if (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] Twitch returned error:', err);
    }
    return errRedirect(`twitch_error: ${err}`);
  }

  if (!code || !state) {
    return errRedirect('missing_params');
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return errRedirect('cookie_error');
  }

  const savedState = cookieStore.get('twitch_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] State mismatch');
    }
    return errRedirect('invalid_state');
  }

  try {
    cookieStore.delete('twitch_oauth_state');
  } catch {
    // non-critical
  }

  let user;
  try {
    const supabase = await createServerClient();
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data?.user) {
      return NextResponse.redirect(new URL('/login', APP_URL));
    }
    user = data.user;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] Auth error:', err);
    }
    return errRedirect('auth_failed');
  }

  let tokenData;
  try {
    tokenData = await exchangeCodeForToken(code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] Token exchange failed:', msg);
    }
    return errRedirect(`token_exchange_failed: ${encodeURIComponent(msg.slice(0, 120))}`);
  }

  let twitchUser;
  try {
    twitchUser = await getTwitchUser(tokenData.access_token);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] Failed to get Twitch user:', err);
    }
    return errRedirect('twitch_user_failed');
  }

  let accessTokenEncrypted: string;
  let refreshTokenEncrypted: string | null = null;
  try {
    accessTokenEncrypted = encrypt(tokenData.access_token);
    if (tokenData.refresh_token) {
      refreshTokenEncrypted = encrypt(tokenData.refresh_token);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] Encryption failed:', err);
    }
    return errRedirect('encryption_failed');
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  try {
    const supabase = await createServerClient();
    const { error: upsertError } = await supabase
      .from('creator_twitch_connections')
      .upsert(
        {
          profile_id: user.id,
          twitch_user_id: twitchUser.id,
          twitch_username: twitchUser.display_name,
          twitch_avatar_url: twitchUser.profile_image_url,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          expires_at: expiresAt,
          scopes: tokenData.scope,
          subscriber_verification_enabled: true,
          authorized_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: 'profile_id' },
      );

    if (upsertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[twitch/callback] DB upsert error:', upsertError);
      }
      return errRedirect('db_upsert');
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch/callback] DB error:', err);
    }
    return errRedirect('db_error');
  }

  return okRedirect();
}
