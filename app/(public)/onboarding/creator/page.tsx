import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCreatorProfile, createCreatorProfile } from '@/app/actions/creator';
import { Logo } from '@/components/ui/Logo';

export default async function OnboardingCreatorPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const existing = await getCreatorProfile();
  if (existing) redirect('/inicio');

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-bold text-text-primary">Solicitar acceso al modo creador</h1>
          <p className="mt-1 text-sm text-text-muted">
            Crea tu perfil público para empezar a crear Pick’ems y dinámicas para tu comunidad
          </p>
        </div>

        <form action={createCreatorProfile} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
          <div>
            <label htmlFor="handle" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Handle
            </label>
            <input
              id="handle"
              name="handle"
              type="text"
              required
              placeholder="tu_handle"
              pattern="^[a-zA-Z0-9_]{3,}$"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
            <p className="mt-1 text-xs text-text-muted">
              Mínimo 3 caracteres. Letras, números y guiones bajos.
            </p>
          </div>

          <div>
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Bio <span className="text-text-muted">(opcional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Cuéntale a tu comunidad de qué trata tu canal…"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg border border-purple-primary px-4 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Crear perfil
          </button>
        </form>
      </div>
    </div>
  );
}
