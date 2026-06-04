'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient as createBrowserClient } from '@/services/supabase/client';
import { signOut } from '@/app/actions/auth';
import { SITE } from '@/config/site';

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-[#1a1a1a] text-[#e8e8e8]'
          : 'text-[#555] hover:text-[#e8e8e8]'
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
    groups.push({
      label: 'General',
      items: [{ label: 'Dashboard', href: '/dashboard', exact: true }],
    });

    if (profile.role === 'admin') {
      groups.push({
        label: 'Admin',
        items: [
          { label: 'Panel admin', href: '/admin', exact: true },
          { label: 'Actividades', href: '/admin/activities' },
        ],
      });
    }

    if (profile.role === 'creator' && profile.creator_status === 'approved') {
      groups.push({
        label: 'Creador',
        items: [
          { label: 'Panel creador', href: '/creator', exact: true },
          { label: 'Mis Pick\'ems', href: '/creator/pickems' },
        ],
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-[#1a1a1a] bg-[#0a0a0a] md:flex md:flex-col">
        <div className="px-5 pt-6 pb-4">
          <Link href="/" className="text-base font-bold text-[#e8e8e8]">
            {SITE.name}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-6 px-3 py-2">
          {!loading &&
            user &&
            groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-[#444]">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))}
        </nav>

        {!loading && user && (
          <div className="border-t border-[#1a1a1a] px-5 py-4">
            <p className="mb-3 truncate text-xs text-[#555] font-mono">{user.email}</p>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-md bg-[#111] px-3 py-1.5 text-xs text-[#555] transition-colors hover:bg-[#1a1a1a] hover:text-[#e8e8e8]"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col bg-[#0a0a0a]">
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
