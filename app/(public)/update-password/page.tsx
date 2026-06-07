import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { UpdatePasswordForm } from './UpdatePasswordForm';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';

export default async function UpdatePasswordPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[440px] flex-col gap-8">
        <AuthBrandHeader />

        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-white">Crear nueva contraseña</h2>
          <p className="mb-6 text-sm text-text-muted">
            Elige una contraseña segura para tu cuenta.
          </p>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
