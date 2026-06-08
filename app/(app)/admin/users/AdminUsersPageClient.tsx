'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminUsers, type GetAdminUsersResult } from '@/app/actions/admin';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminUsersPageClient({
  initial,
}: {
  initial: { data?: GetAdminUsersResult; error?: string };
}) {
  const [users, setUsers] = useState<AdminUserRow[]>(initial.data?.users ?? []);
  const [totalCount, setTotalCount] = useState(initial.data?.totalCount ?? 0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.error ?? null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);

    const result = await getAdminUsers(p, pageSize, q);

    if (!mountedRef.current) return;

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setUsers(result.data.users);
      setTotalCount(result.data.totalCount);
    }

    setLoading(false);
  }, [pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  // Page change
  useEffect(() => {
    if (page === 1 && !search) return; // initial load
    loadUsers(search, page);
  }, [page, loadUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o Twitch..."
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 pl-9 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
        />
        <svg
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-amber-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12">
          <svg className="size-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-sm text-text-muted">
            {search ? 'No se encontraron usuarios con ese criterio.' : 'No hay usuarios registrados.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Twitch</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Correo confirmado</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-hover/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar url={u.avatarUrl} name={u.displayName} />
                      <span className="text-sm font-medium text-text-primary">
                        {u.displayName ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {u.email ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ProviderBadge provider={u.provider} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {u.twitchUsername ? (
                      <span className="text-[#9146FF]">{u.twitchUsername}</span>
                    ) : (
                      <span className="text-text-muted">No vinculado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={u.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfirmedBadge confirmedAt={u.emailConfirmedAt} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">
                    {u.lastSignInAt ? formatDate(u.lastSignInAt) : 'Nunca'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            {totalCount} usuario{totalCount !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 text-xs text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type AdminUserRow = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  twitchUsername: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  provider: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
};

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name ?? '?').charAt(0).toUpperCase();

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        onError={() => setImgError(true)}
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-text-muted">
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'bg-purple-500/15 text-purple-400',
    creator: 'bg-blue-500/15 text-blue-400',
    user: 'bg-surface-hover text-text-muted',
  };
  const labels: Record<string, string> = {
    admin: 'Admin',
    creator: 'Creador',
    user: 'Usuario',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight ${styles[role] ?? styles.user}`}>
      {labels[role] ?? role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight ${
        isActive
          ? 'bg-green-500/15 text-green-400'
          : 'bg-red-500/15 text-red-400'
      }`}
    >
      <span className={`size-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Correo',
  twitch: 'Twitch',
  google: 'Google',
  github: 'GitHub',
};

function ProviderBadge({ provider }: { provider: string | null }) {
  const label = provider ? PROVIDER_LABELS[provider] ?? provider : null;
  if (!label) return <span className="text-xs text-text-muted">—</span>;
  const color = provider
    ? ({
        email: 'bg-blue-500/15 text-blue-400',
        twitch: 'bg-purple-500/15 text-purple-400',
        google: 'bg-red-500/15 text-red-400',
        github: 'bg-zinc-500/15 text-zinc-400',
      }[provider] ?? 'bg-surface-hover text-text-muted')
    : 'bg-surface-hover text-text-muted';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight ${color}`}>
      {label}
    </span>
  );
}

function ConfirmedBadge({ confirmedAt }: { confirmedAt: string | null }) {
  if (confirmedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-medium leading-tight text-green-400">
        <span className="size-1.5 rounded-full bg-green-400" />
        Sí
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-medium leading-tight text-red-400">
      <span className="size-1.5 rounded-full bg-red-400" />
      No
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
