import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/inicio';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const twitchIdentity = user.identities?.find((id) => id.provider === 'twitch');

        if (twitchIdentity) {
          // Sync Twitch data into profile via the database function
          await supabase.rpc('sync_twitch_from_auth', { profile_id: user.id });

          // Also upsert into twitch_connections for full audit trail
          const twitchUsername =
            twitchIdentity.identity_data?.preferred_username ??
            twitchIdentity.identity_data?.name ??
            null;
          const twitchUserId = twitchIdentity.id;

          await supabase
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

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  console.error('[auth/callback] missing code in searchParams');
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
