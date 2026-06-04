import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';

export default async function InicioPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const isCreator = profile.role === 'creator' && profile.creator_profile?.status === 'approved';
  const isAdmin = profile.role === 'admin';

  let pickemCount = 0;
  let activePickems: { id: string; title: string; status: string; created_at: string }[] = [];
  let draftCount = 0;

  if (isCreator) {
    const supabase = await createServerClient();
    const creatorId = profile.creator_profile!.id;

    const { count: total } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    pickemCount = total ?? 0;

    const { data: recent } = await supabase
      .from('events')
      .select('id, title, status, created_at')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(5);

    activePickems = recent ?? [];

    const { count: drafts } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('status', 'draft');

    draftCount = drafts ?? 0;
  }

  const displayName = profile.display_name || user.email?.split('@')[0] || 'Usuario';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Bienvenido de nuevo, {displayName}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Crea dinámicas para tu comunidad, gestiona torneos y premia a tus seguidores.
        </p>
      </div>

      {isCreator || isAdmin ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Pick&apos;ems creados</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{pickemCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Borradores</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{draftCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Estado</p>
              <p className="mt-1 text-2xl font-bold text-purple-primary">
                {isCreator ? 'Activo' : '—'}
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Acciones rápidas</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link
                href="/creator/pickems/new"
                className="rounded-lg border border-purple-border bg-surface p-4 transition-colors hover:border-purple-primary"
              >
                <p className="text-sm font-medium text-purple-primary">Nuevo Pick&apos;em</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Crea una nueva dinámica de predicciones
                </p>
              </Link>
              <Link
                href="/creator/pickems"
                className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
              >
                <p className="text-sm font-medium text-text-primary">Mis Pick&apos;ems</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {isCreator ? 'Gestiona tus dinámicas existentes' : 'Administra la plataforma'}
                </p>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
                >
                  <p className="text-sm font-medium text-text-primary">Panel admin</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Administra creadores y configura la plataforma
                  </p>
                </Link>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Actividad reciente</h2>
            {activePickems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
                <p className="text-sm text-text-muted">
                  Todavía no has creado ningún Pick&apos;em.
                </p>
                <Link
                  href="/creator/pickems/new"
                  className="mt-3 inline-block rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
                >
                  Crear mi primer Pick&apos;em
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activePickems.map((p) => (
                  <Link
                    key={p.id}
                    href={`/creator/pickems/${p.id}`}
                    className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-hover"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text-primary">{p.title}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {p.status === 'draft' ? 'Borrador' : p.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-secondary">
            Aún no tienes acceso como creador.
          </p>
          <Link
            href="/onboarding/creator"
            className="mt-3 inline-block rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Convertirme en creador
          </Link>
        </div>
      )}
    </div>
  );
}
