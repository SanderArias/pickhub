import Link from 'next/link';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';

export default async function CreatorPage() {
  const profile = await requireCreator();
  const creator = profile.creator_profile!;

  const supabase = await createServerClient();
  const { data: activities } = await supabase
    .from('dynamic_types')
    .select('*')
    .eq('is_enabled', true)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">
        &larr; Volver al dashboard
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de creador</h1>
        <Link
          href="/creator/pickems"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
        >
          Mis Pick&apos;ems
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm">
        <p>
          <span className="text-zinc-400">Handle:</span>{' '}
          <span className="font-mono text-zinc-200">{creator.handle}</span>
        </p>
        <p>
          <span className="text-zinc-400">Estado:</span>{' '}
          <span className="font-medium text-green-400">Aprobado</span>
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Actividades disponibles</h2>
        {!activities || activities.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay actividades disponibles en este momento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-zinc-700 bg-zinc-900 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{a.name}</h3>
                    {a.description && (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/creator/pickems/new"
                    className="shrink-0 rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
                  >
                    Crear {a.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
