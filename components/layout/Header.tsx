'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <Logo href="/" />
      <nav className="flex items-center gap-4">
        <Link
          href="/login"
          className="rounded-lg border border-purple-primary px-3 py-1.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
        >
          Iniciar sesión
        </Link>
      </nav>
    </header>
  );
}
