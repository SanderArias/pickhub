'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { signOut } from '@/app/actions/auth';
import { SITE } from '@/config/site';

export function Header() {
  const { user, loading } = useUser();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <Link href="/" className="font-bold">
        {SITE.name}
      </Link>

      <nav className="flex items-center gap-4">
        {loading ? null : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-200"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-800"
          >
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
