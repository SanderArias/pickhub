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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e8e8]">Panel de creador</h1>
        <Link
          href="/creator/pickems"
          className="rounded-md bg-[#181818] px-4 py-2 text-sm font-medium text-[#e8e8e8] transition-colors hover:bg-[#1f1f1f]"
        >
          Mis Pick&apos;ems
        </Link>
      </div>

      <div className="rounded-lg border border-[#1f1f1f] bg-[#111] p-4 text-sm">
        <p>
          <span className="text-[#555]">Handle:</span>{' '}
          <span className="font-mono text-[#e8e8e8]">{creator.handle}</span>
        </p>
        <p>
          <span className="text-[#555]">Estado:</span>{' '}
          <span className="font-medium text-emerald-400">Aprobado</span>
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#e8e8e8]">Actividades disponibles</h2>
        {!activities || activities.length === 0 ? (
          <p className="text-sm text-[#555]">
            No hay actividades disponibles en este momento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-[#1f1f1f] bg-[#111] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#e8e8e8]">{a.name}</h3>
                    {a.description && (
                      <p className="mt-0.5 text-sm text-[#888]">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/creator/pickems/new"
                    className="shrink-0 rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
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
