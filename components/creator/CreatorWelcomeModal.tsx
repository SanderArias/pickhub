'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Profile } from '@/lib/auth';

const STORAGE_KEY = 'pickhub_creator_welcome_seen';

export function CreatorWelcomeModal({ canCreatePickem = true, initialProfile }: { canCreatePickem?: boolean; initialProfile?: Profile }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
    if (!initialProfile) return false;
    return initialProfile.role === 'creator' && initialProfile.creator_profile?.status === 'approved';
  });

  useEffect(() => {
    if (!open) return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      setOpen(false);
    }
  }, [open]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-bold text-text-primary">
          Bienvenido al espacio de creadores
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Ya puedes crear actividades interactivas para tu comunidad. Empieza con tu primer Pick&rsquo;em.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {canCreatePickem && (
            <Link
              href="/creator/pickems/new"
              onClick={handleClose}
              className="rounded-lg border border-purple-primary px-4 py-2 text-center text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Crear un Pick&rsquo;em
            </Link>
          )}
          <Link
            href="/creator"
            onClick={handleClose}
            className="rounded-lg bg-surface px-4 py-2 text-center text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Ir al panel de creador
          </Link>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
