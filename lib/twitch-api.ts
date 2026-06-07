const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_URL = 'https://api.twitch.tv/helix';

function getClientId(): string {
  const id = process.env.TWITCH_CLIENT_ID;
  if (!id) throw new Error('TWITCH_CLIENT_ID is not set');
  return id;
}

function getClientSecret(): string {
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!secret) throw new Error('TWITCH_CLIENT_SECRET is not set');
  return secret;
}

import { getAppUrl } from './app-url';

function getRedirectUri(): string {
  return `${getAppUrl()}/auth/twitch/callback`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
}

function normalizeScopes(scope: unknown): string[] {
  if (Array.isArray(scope)) return scope.filter((s): s is string => typeof s === 'string');
  if (typeof scope === 'string') return scope.split(' ').filter(Boolean);
  return [];
}

interface TokenExchangeError {
  status: number;
  body: string;
  reason: string;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();

  if (process.env.NODE_ENV === 'development') {
    console.log('[twitch-api] Token exchange params:', {
      code: `${code.slice(0, 4)}...${code.slice(-4)}`,
      client_id_set: !!clientId,
      client_secret_set: !!getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      twitch_token_url: TWITCH_TOKEN_URL,
    });
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: getClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    const details: TokenExchangeError = {
      status: res.status,
      body: text,
      reason: 'twitch_api_error',
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('[twitch-api] Token exchange FAILED:', details);
    }

    throw new Error(`Failed to exchange code: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (process.env.NODE_ENV === 'development') {
    console.log('[twitch-api] Token exchange OK:', {
      scope: data.scope,
      expires_in: data.expires_in,
      has_refresh_token: !!data.refresh_token,
    });
  }

  try {
    return {
      ...data,
      scope: normalizeScopes(data.scope),
    };
  } catch {
    throw new Error('Twitch token response parse failed: scope normalization error');
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh token: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    ...data,
    scope: normalizeScopes(data.scope),
  };
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export async function getTwitchUser(accessToken: string): Promise<TwitchUser> {
  const res = await fetch(`${TWITCH_API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': getClientId(),
    },
  });

  if (!res.ok) throw new Error(`Failed to get user: ${res.status}`);
  const data = await res.json();
  return data.data[0] as TwitchUser;
}

interface SubscriptionCheck {
  is_subscriber: boolean;
  tier: string | null;
}

export async function checkSubscription(
  accessToken: string,
  broadcasterId: string,
  userId: string,
): Promise<SubscriptionCheck> {
  const url = new URL(`${TWITCH_API_URL}/subscriptions/user`);
  url.searchParams.set('broadcaster_id', broadcasterId);
  url.searchParams.set('user_id', userId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': getClientId(),
    },
  });

  if (res.status === 404) {
    return { is_subscriber: false, tier: null };
  }

  if (!res.ok) {
    throw new Error(`Failed to check subscription: ${res.status}`);
  }

  const data = await res.json();
  const sub = data.data?.[0];
  return {
    is_subscriber: !!sub,
    tier: sub?.tier ?? null,
  };
}

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'channel:read:subscriptions',
    state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}
