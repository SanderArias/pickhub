'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient as createBrowserClient } from '@/services/supabase/client';
import { signOut } from '@/app/actions/auth';
import { Logo } from '@/components/ui/Logo';
import { CreatorWelcomeModal } from '@/components/pickem/CreatorWelcomeModal';

function formatBadgeCount(count: number): string | undefined {
  if (count <= 0) return undefined;
  if (count > 9) return '+9';
  return String(count);
}

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  placeholder?: boolean;
  badge?: number | string | boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface ProfileData {
  role: string;
  creator_status: string | null;
  display_name: string | null;
  avatar_url: string | null;
  creator_profile_id: string | null;
  twitch_username: string | null;
}

function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function useProfile(user: ReturnType<typeof useUser>['user']) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createBrowserClient();
    supabase
      .from('profiles')
      .select('role, display_name, avatar_url, twitch_username, creator_profile:creator_profiles(id, status)')
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
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          creator_profile_id: cp?.id ?? null,
          twitch_username: data.twitch_username ?? null,
        });
      });
  }, [user]);

  return profile;
}

function useGroups(profile: ProfileData | null, pathname: string) {
  const [attentionCount, setAttentionCount] = useState(0);

  useEffect(() => {
    if (!profile || !(profile.role === 'creator' && profile.creator_status === 'approved')) return;
    const supabase = createBrowserClient();
    (async () => {
      // 1. Get creator's events
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', profile.creator_profile_id ?? '');
      const eventIds = (events ?? []).map((e) => e.id);
      if (eventIds.length === 0) {
        setAttentionCount(0);
        return;
      }

      // 2. Get user's last_seen_at (RLS restricts to own record)
      const { data: readMarker } = await supabase
        .from('creator_activity_reads')
        .select('last_seen_at')
        .maybeSingle();

      // 3. Count unread submissions (after last_seen_at, or all if never visited)
      let query = supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds);

      if (readMarker?.last_seen_at) {
        query = query.gt('submitted_at', readMarker.last_seen_at);
      }

      const { count } = await query;
      if (count !== null) setAttentionCount(count);
    })();
  }, [profile, pathname]);

  const groups: NavGroup[] = [];

  const isCreator = !!profile && profile.role === 'creator' && profile.creator_status === 'approved';
  const isAdmin = !!profile && profile.role === 'admin';

  groups.push({
    label: 'General',
    items: [
      { label: 'Inicio', href: '/inicio', exact: true },
      { label: 'Explorar', href: '#', placeholder: true },
    ],
  });

  groups.push({
    label: 'Participación',
    items: [
      { label: 'Mis participaciones', href: '/participaciones' },
    ],
  });

  if (isCreator) {
    groups.push({
      label: 'Creador',
      items: [
        { label: 'Dashboard', href: '/creator/dashboard', exact: true },
        { label: "Pick'ems", href: '/creator/pickems' },
        {
          label: 'Actividad',
          href: '/creator/activity',
          badge: formatBadgeCount(attentionCount),
        },
      ],
    });
  }

  if (isAdmin) {
    groups.push({
      label: 'Admin',
      items: [
        { label: 'Panel admin', href: '/admin', exact: true },
        { label: 'Actividades', href: '/admin/activities' },
      ],
    });
  }

  return groups;
}

// ============================================================================
// Sub-components
// ============================================================================

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = isActive(pathname, item.href, item.exact ?? false);

  if (item.placeholder) {
    return (
      <span className="flex cursor-not-allowed items-center rounded-lg px-3 py-2 text-sm text-text-secondary opacity-30">
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-purple-surface font-medium text-text-primary'
          : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-purple-primary" />
      )}
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full ${
            typeof item.badge === 'number' || typeof item.badge === 'string'
              ? 'min-w-[18px] bg-purple-primary px-1.5 py-0.5 text-[10px] font-bold text-white'
              : 'size-2 bg-green-500'
          }`}
        >
          {typeof item.badge === 'number' || typeof item.badge === 'string' ? item.badge : ''}
        </span>
      )}
    </Link>
  );
}

function NavGroups({
  groups,
  pathname,
  onNav,
}: {
  groups: NavGroup[];
  pathname: string;
  onNav?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/50">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={onNav} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserSection({
  profile,
  email,
  onNav,
}: {
  profile: ProfileData;
  email: string;
  onNav?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const displayName = profile.display_name ?? profile.twitch_username ?? email.split('@')[0] ?? 'Usuario';

  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = profile.role === 'admin'
    ? 'Admin'
    : profile.creator_status === 'approved'
      ? 'Creador'
      : profile.role === 'creator'
        ? 'Creador (pendiente)'
        : 'Usuario';

  const isCreator = profile.role === 'creator' && profile.creator_status === 'approved';

  const handleNav = (cb?: () => void) => {
    setOpen(false);
    cb?.();
  };

  return (
    <div ref={ref} className="relative shrink-0 border-t border-border px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
          open
            ? 'border border-purple-primary/40 bg-purple-surface'
            : 'border border-transparent hover:bg-white/[0.03]'
        }`}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-primary/20 text-xs font-bold text-purple-primary">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {displayName}
          </p>
          <p className={`truncate text-[11px] ${open ? 'text-purple-primary' : 'text-text-muted'}`}>
            {roleLabel}
          </p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-surface p-1 shadow-xl">
          {isCreator && (
            <Link
              href="/creator"
              onClick={() => handleNav(onNav)}
              className="flex items-center rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-white/[0.05]"
            >
              Perfil de creador
            </Link>
          )}
          <Link
            href="/settings"
            onClick={() => handleNav(onNav)}
            className="flex items-center rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-white/[0.05]"
          >
            Configuración
          </Link>
          <div className="my-1 h-px bg-border" />
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SidebarContent — standalone nav, reused in desktop + mobile
// ============================================================================

function SidebarContent({
  pathname,
  groups,
  profile,
  email,
  onNav,
}: {
  pathname: string;
  groups: NavGroup[];
  profile: ProfileData | null;
  email: string;
  onNav?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#080808]">
      <div className="shrink-0 px-5 pt-7 pb-6">
        <Logo href="/inicio" />
      </div>
      <NavGroups groups={groups} pathname={pathname} onNav={onNav} />
      {profile && <UserSection profile={profile} email={email} onNav={onNav} />}
    </div>
  );
}

// ============================================================================
// Desktop sidebar
// ============================================================================

function DesktopSidebar({
  pathname,
  groups,
  profile,
  email,
}: {
  pathname: string;
  groups: NavGroup[];
  profile: ProfileData | null;
  email: string;
}) {
  return (
    <aside className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:w-60 md:flex-col md:border-r md:border-border">
      <SidebarContent pathname={pathname} groups={groups} profile={profile} email={email} />
    </aside>
  );
}

// ============================================================================
// Mobile drawer
// ============================================================================

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-[#080808] transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  );
}

// ============================================================================
// Mobile header
// ============================================================================

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-[#080808]/95 px-4 backdrop-blur md:hidden">
      <Logo href="/inicio" />
      <button
        type="button"
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
        aria-label="Abrir menú"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>
  );
}

// ============================================================================
// Main Sidebar export
// ============================================================================

export function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const profile = useProfile(user);
  const groups = useGroups(profile, pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isLoading = loading;
  const showUi = !loading && !!user;

  return (
    <>
      {/* Desktop sidebar */}
      {showUi && (
        <DesktopSidebar pathname={pathname} groups={groups} profile={profile} email={user.email ?? ''} />
      )}

      {/* Mobile header */}
      {showUi && <MobileHeader onMenuClick={() => setDrawerOpen(true)} />}

      {/* Mobile drawer */}
      {showUi && (
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <SidebarContent
            pathname={pathname}
            groups={groups}
            profile={profile}
            email={user.email ?? ''}
            onNav={() => setDrawerOpen(false)}
          />
        </MobileDrawer>
      )}

      {/* Main content */}
      <div className={`flex min-h-screen flex-col bg-bg ${showUi ? 'md:ml-60 pt-14 md:pt-0' : ''}`}>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>

      <CreatorWelcomeModal />
    </>
  );
}
