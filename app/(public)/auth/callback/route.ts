import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/inicio`);
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  console.error('[auth/callback] missing code in searchParams');
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
