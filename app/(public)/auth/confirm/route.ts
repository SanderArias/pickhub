import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/services/supabase';
import { getAppUrl } from '@/lib/app-url';

const APP_URL = getAppUrl();

function safeNextUrl(next: string | null): string {
  if (!next) return '/update-password';
  try {
    const parsed = new URL(next, APP_URL);
    if (parsed.origin === APP_URL || parsed.origin === 'http://localhost:3000') {
      return parsed.pathname + parsed.search;
    }
  } catch {
    // not a full URL, treat as path
  }
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/update-password';
}

function recoveryErrorCode(error: { code?: string; message: string }): string {
  const lower = error.message.toLowerCase();
  if (lower.includes('expired')) return 'recovery_expired';
  if (lower.includes('invalid link') || lower.includes('invalid')) return 'recovery_invalid';
  return 'recovery_failed';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeNextUrl(searchParams.get('next'));

  if (!token_hash || !type) {
    console.error('[auth/confirm] missing token_hash or type');
    return NextResponse.redirect(`${APP_URL}/login?error=missing_params`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });

  if (error) {
    console.error('[auth/confirm] verifyOtp failed:', error.code, error.message);
    if (type === 'recovery') {
      return NextResponse.redirect(`${APP_URL}/login?error=${recoveryErrorCode(error)}`);
    }
    return NextResponse.redirect(`${APP_URL}/login?error=verification_failed`);
  }

  return NextResponse.redirect(`${APP_URL}${next}`);
}
