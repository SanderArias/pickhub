import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

const publicRoutes = [
  '/login',
  '/auth',
  '/forgot-password',
  '/update-password',
  '/auth/confirm',
  '/',
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isSafeNextPath(next: string | null): boolean {
  if (!next) return false;
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//')) return false;
  return true;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = request.cookies.getAll();
          return all;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user && pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next');
    const safeNext = next && isSafeNextPath(next) ? next : '/inicio';
    const target = new URL(safeNext, request.url).href;
    console.log('[auth-redirect]', { source: 'proxy', pathname, hasUser: true, userId: user.id, redirectTarget: safeNext, reason: 'authenticated-on-login' });
    console.log('[auth-location]', { source: 'proxy', from: pathname, to: target });
    const redirectResponse = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = new URL('/login', request.url);
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set('next', nextPath);
    const target = loginUrl.href;
    console.log('[auth-redirect]', { source: 'proxy', pathname, hasUser: false, userId: null, redirectTarget: '/login', reason: 'unauthenticated-private' });
    console.log('[auth-location]', { source: 'proxy', from: pathname, to: target });
    const redirectResponse = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
