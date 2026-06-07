import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/inicio';

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/inicio';

  if (!code) {
    console.log('[auth-redirect]', { source: 'callback', pathname: '/auth/callback', hasUser: false, userId: null, redirectTarget: '/login?error=missing_code', reason: 'missing-code' });
    console.log('[auth-location]', { source: 'callback', from: '/auth/callback', to: `${origin}/login?error=missing_code` });
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  console.log('[auth-cookie-debug]', { source: 'callback-before', cookieNames: cookieStore.getAll().map((c) => c.name) });

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  console.log('[auth-cookie-debug]', { source: 'callback-after', cookieNames: cookieStore.getAll().map((c) => c.name) });

  if (error) {
    console.log('[auth-redirect]', { source: 'callback', pathname: '/auth/callback', hasUser: false, userId: null, redirectTarget: '/login?error=oauth_exchange_failed', reason: 'exchange-failed' });
    console.log('[auth-location]', { source: 'callback', from: '/auth/callback', to: `${origin}/login?error=oauth_exchange_failed` });
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
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

  const finalTarget = `${origin}${safeNext}`;
  console.log('[auth-redirect]', { source: 'callback', pathname: '/auth/callback', hasUser: Boolean(user), userId: user?.id ?? null, redirectTarget: safeNext, reason: 'post-oauth-exchange' });
  console.log('[auth-location]', { source: 'callback', from: '/auth/callback', to: finalTarget });
  console.log('[auth-cookie-debug]', { source: 'callback-final', cookieNames: cookieStore.getAll().map((c) => c.name) });
  return NextResponse.redirect(finalTarget);
}
