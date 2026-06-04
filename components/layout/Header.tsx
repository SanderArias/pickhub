'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { signOut } from '@/app/actions/auth';
import { createClient as createBrowserClient } from '@/services/supabase/client';
import { SITE } from '@/config/site';

export function Header() {
  const { user, loading } = useUser();
  const [role, setRole] = useState<string | null>(null);
  const [creatorStatus, setCreatorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = createBrowserClient();
    supabase
      .from('profiles')
      .select('role, creator_profile:creator_profiles(status)')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRole(data.role);
          const cp = Array.isArray(data.creator_profile)
            ? data.creator_profile[0]
            : data.creator_profile;
          setCreatorStatus(cp?.status ?? null);
        }
      });
  }, [user]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <Link href="/" className="font-bold text-zinc-100">
        {SITE.name}
      </Link>

      <nav className="flex items-center gap-4">
        {loading ? null : user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:inline">
              {user.email}
            </span>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Dashboard
            </Link>

            {role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Admin
              </Link>
            )}

            {role === 'creator' && creatorStatus === 'approved' && (
              <Link
                href="/creator"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Creador
              </Link>
            )}

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900 transition-colors hover:bg-white"
          >
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
