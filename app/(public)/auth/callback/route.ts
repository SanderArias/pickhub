import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';
import { getAppUrl } from '@/lib/app-url';

const APP_URL = getAppUrl();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/inicio';

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/inicio';

  if (!code) {
    console.error('[auth/callback] missing code');
    return NextResponse.redirect(`${APP_URL}/login?error=missing_code`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_exchange_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const twitchIdentity = user.identities?.find((id) => id.provider === 'twitch');

    if (twitchIdentity) {
      await supabase.rpc('sync_twitch_from_auth', { profile_id: user.id });

      const twitchUsername =
        twitchIdentity.identity_data?.preferred_username ??
        twitchIdentity.identity_data?.name ??
        null;
      const twitchUserId = twitchIdentity.id;

      await (supabase as any)
        .from('twitch_connections')
        .upsert(
          {
            profile_id: user.id,
            twitch_user_id: twitchUserId,
            twitch_display_name: twitchUsername,
            is_connected: true,
          },
          { onConflict: 'profile_id' },
        );
    }
  }

  return NextResponse.redirect(`${APP_URL}${safeNext}`);
}
