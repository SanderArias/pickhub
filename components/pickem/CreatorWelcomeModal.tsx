'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient as createBrowserClient } from '@/services/supabase/client';
import { useUser } from '@/hooks/useUser';

const STORAGE_KEY = 'pickhub_creator_welcome_seen';

export function CreatorWelcomeModal() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

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
        if (data.role === 'creator' && cp?.status === 'approved') {
          setOpen(true);
        }
      });
  }, [user]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-bold text-text-primary">
          Bienvenido al modo creador de PickHub
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Ya puedes crear Pick’ems, configurar predicciones y compartir dinámicas con tu comunidad.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/creator/pickems/new"
            onClick={handleClose}
            className="rounded-lg border border-purple-primary px-4 py-2 text-center text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Empezar creando un Pick’em
          </Link>
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
