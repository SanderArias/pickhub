import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export async function createClient() {
  const cookieStore = await cookies();

  const cookieNames = cookieStore.getAll().map((c) => c.name);
  const hasAuthCookie = cookieNames.some((n) => n.startsWith('sb-') || n.startsWith('supabase-'));
  if (hasAuthCookie) {
    // no-op: just tracing
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          return all;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookie writes are ignored.
            // Session refresh is handled by middleware on navigation.
          }
        },
      },
    },
  );
}
