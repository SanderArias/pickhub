import { getUser } from '@/app/actions/auth';
import { UpdatePasswordForm } from './UpdatePasswordForm';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';

export default async function UpdatePasswordPage(props: { searchParams: Promise<{ success?: string }> }) {
  const { success } = await props.searchParams;

  if (success === '1') {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-[440px] flex-col gap-8">
          <AuthBrandHeader />
          <div className="rounded-xl border border-success-border bg-success/5 p-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/10">
              <svg className="size-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-text-primary">Contraseña actualizada</p>
            <p className="mt-1 text-sm text-text-muted">
              Tu contraseña se cambió correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <a
              href="/login"
              className="mt-4 inline-block rounded-lg bg-purple-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-600"
            >
              Iniciar sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

  const user = await getUser();
  if (!user) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-[440px] flex-col gap-8">
          <AuthBrandHeader />
          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 text-center">
            <h2 className="mb-1 text-base font-semibold text-text-primary">Enlace inválido o expirado</h2>
            <p className="mb-6 text-sm text-text-muted">
              Este enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.
            </p>
            <a
              href="/forgot-password"
              className="inline-block rounded-lg bg-purple-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-600"
            >
              Solicitar nuevo enlace
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[440px] flex-col gap-8">
        <AuthBrandHeader />

        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-text-primary">Crear nueva contraseña</h2>
          <p className="mb-6 text-sm text-text-muted">
            Elige una contraseña segura para tu cuenta.
          </p>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
