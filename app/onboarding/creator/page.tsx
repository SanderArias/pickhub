import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCreatorProfile, createCreatorProfile } from '@/app/actions/creator';

export default async function OnboardingCreatorPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const existing = await getCreatorProfile();
  if (existing) redirect('/dashboard');

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">Convertirme en creador</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Crea tu perfil público para empezar a organizar dinámicas
        </p>

        <form action={createCreatorProfile} className="flex flex-col gap-4">
          <div>
            <label htmlFor="handle" className="mb-1 block text-sm font-medium">
              Handle
            </label>
            <input
              id="handle"
              name="handle"
              type="text"
              required
              placeholder="tu_handle"
              pattern="^[a-zA-Z0-9_]{3,}$"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Mínimo 3 caracteres. Letras, números y guiones bajos.
            </p>
          </div>

          <div>
            <label htmlFor="bio" className="mb-1 block text-sm font-medium">
              Bio <span className="text-zinc-400">(opcional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Cuéntale a tu comunidad de qué trata tu canal…"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Crear perfil
          </button>
        </form>
      </div>
    </div>
  );
}
