import Link from 'next/link';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { Card } from '@/components/ui/Card';

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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Panel de creador</h1>
        <p className="mt-1 text-sm text-text-secondary">Gestiona tus dinámicas y configura tu perfil.</p>
      </div>

      <Card>
        <p>
          <span className="text-text-muted">Handle:</span>{' '}
          <span className="font-mono text-text-primary">{creator.handle}</span>
        </p>
        <p>
          <span className="text-text-muted">Estado:</span>{' '}
          <span className="font-medium text-purple-primary">Aprobado</span>
        </p>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Actividades disponibles</h2>
        {!activities || activities.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay actividades disponibles en este momento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <Card key={a.id} hover>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-text-primary">{a.name}</h3>
                    {a.description && (
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/creator/pickems/new"
                    className="shrink-0 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
                  >
                    Crear {a.name}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
