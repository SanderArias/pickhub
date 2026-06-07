import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function validateNext(next: string | null, fallback: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return fallback;
}

function recoveryErrorCode(error: { code?: string; message: string }): string {
  const lower = error.message.toLowerCase();
  if (lower.includes('expired')) return 'recovery_expired';
  if (lower.includes('invalid link') || lower.includes('invalid')) return 'recovery_invalid';
  return 'recovery_failed';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = validateNext(searchParams.get('next'), '/update-password');

  if (!token_hash || !type) {
    console.log('[auth-redirect]', { source: 'confirm', pathname: '/auth/confirm', hasUser: false, userId: null, redirectTarget: '/forgot-password?error=missing_params', reason: 'missing-params' });
    return NextResponse.redirect(`${origin}/forgot-password?error=missing_params`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as any,
  });

  if (error) {
    const code = recoveryErrorCode(error);
    console.log('[auth-redirect]', { source: 'confirm', pathname: '/auth/confirm', hasUser: false, userId: null, redirectTarget: `/forgot-password?error=${code}`, reason: 'verify-otp-failed' });
    return NextResponse.redirect(`${origin}/forgot-password?error=${code}`);
  }

  console.log('[auth-redirect]', { source: 'confirm', pathname: '/auth/confirm', hasUser: null, userId: null, redirectTarget: next, reason: 'verify-otp-success' });
  return response;
}
