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
    <header className="flex h-14 items-center justify-between border-b border-[#1a1a1a] bg-[#0a0a0a] px-6">
      <Link href="/" className="font-bold text-[#e8e8e8]">
        {SITE.name}
      </Link>

      <nav className="flex items-center gap-4">
        {loading ? null : user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#555] sm:inline">
              {user.email}
            </span>

            <Link
              href="/dashboard"
              className="text-sm text-[#888] hover:text-[#e8e8e8]"
            >
              Dashboard
            </Link>

            {role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm text-[#888] hover:text-[#e8e8e8]"
              >
                Admin
              </Link>
            )}

            {role === 'creator' && creatorStatus === 'approved' && (
              <Link
                href="/creator"
                className="text-sm text-[#888] hover:text-[#e8e8e8]"
              >
                Creador
              </Link>
            )}

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md bg-[#111] px-3 py-1.5 text-sm text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-[#e8e8e8]"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-[#e8e8e8] px-3 py-1.5 text-sm text-[#0a0a0a] transition-colors hover:bg-white"
          >
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
