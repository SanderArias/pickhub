'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient as createBrowserClient } from '@/services/supabase/client';
import { signOut } from '@/app/actions/auth';
import { Logo } from '@/components/ui/Logo';
import { CreatorWelcomeModal } from '@/components/pickem/CreatorWelcomeModal';

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  placeholder?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function isActiveRoute(href: string, pathname: string): boolean {
  if (pathname === href) return true;

  const hrefSegments = href.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (pathSegments.length <= hrefSegments.length) return false;

  for (let i = 0; i < hrefSegments.length; i++) {
    if (hrefSegments[i] !== pathSegments[i]) return false;
  }

  const nextSegment = pathSegments[hrefSegments.length];
  if (nextSegment === 'new' && !href.endsWith('/new')) return false;

  return true;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : isActiveRoute(item.href, pathname);
  return (
    <Link
      href={item.href}
      className={`relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-purple-surface font-medium text-text-primary before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-purple-primary'
          : 'text-text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-text-primary'
      }`}
    >
      {item.label}
    </Link>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<{
    role: string;
    creator_status: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = createBrowserClient();
    supabase
      .from('profiles')
      .select('role, creator_profile:creator_profiles(status)')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const cp = Array.isArray(data.creator_profile)
          ? data.creator_profile[0]
          : data.creator_profile;
        setProfile({
          role: data.role,
          creator_status: cp?.status ?? null,
        });
      });
  }, [user]);

  const groups: NavGroup[] = [];

  if (profile) {
    const isCreator = profile.role === 'creator' && profile.creator_status === 'approved';
    const isAdmin = profile.role === 'admin';

    // GENERAL — shared for all
    groups.push({
      label: 'General',
      items: [
        { label: 'Inicio', href: '/inicio', exact: true },
        { label: 'Explorar', href: '#', placeholder: true },
      ],
    });

    // PARTICIPACIÓN — shared for all
    groups.push({
      label: 'Participación',
      items: [
        { label: 'Mis participaciones', href: '/participaciones' },
      ],
    });

    // CREADOR — only for creators
    if (isCreator) {
      groups.push({
        label: 'Creador',
        items: [
          { label: "Mis Pick'ems", href: '/creator/pickems' },
          { label: "Crear Pick'em", href: '/creator/pickems/new', exact: true },
        ],
      });
    }

    // COMUNIDAD — only for creators
    if (isCreator) {
      groups.push({
        label: 'Comunidad',
        items: [
          { label: 'Ranking', href: '#', placeholder: true },
        ],
      });
    }

    // CUENTA — shared for all
    groups.push({
      label: 'Cuenta',
      items: [
        { label: 'Perfil', href: isCreator ? '/creator' : '#', placeholder: !isCreator },
        { label: 'Configuración', href: '#', placeholder: true },
      ],
    });

    // ADMIN — only for admins
    if (isAdmin) {
      groups.push({
        label: 'Admin',
        items: [
          { label: 'Panel admin', href: '/admin', exact: true },
          { label: 'Actividades', href: '/admin/activities' },
        ],
      });
    }
  }

  const sidebar = (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-[#080808]">
      <div className="shrink-0 px-5 pt-7 pb-5">
        <Logo href="/inicio" />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
        {!loading &&
          user &&
          groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-xs tracking-wider text-text-muted">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) =>
                  item.placeholder ? (
                    <span
                      key={item.label}
                      className="flex cursor-not-allowed items-center rounded-lg px-3 py-2 text-sm text-text-muted opacity-30"
                    >
                      {item.label}
                    </span>
                  ) : (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ),
                )}
              </div>
            </div>
          ))}
      </nav>

      {!loading && user && (
        <div className="mt-auto shrink-0 border-t border-border px-5 py-4">
          <p className="mb-3 truncate text-xs text-text-muted font-mono">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-lg bg-surface px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-40 hidden h-screen md:block">{sidebar}</div>
      <div className="md:ml-60 flex min-h-screen flex-col bg-bg">
        <main className="mx-auto w-full max-w-5xl px-8 py-10">{children}</main>
      </div>
      <CreatorWelcomeModal />
    </>
  );
}
