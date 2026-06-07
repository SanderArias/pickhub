import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';

export default async function ForgotPasswordPage() {
  const user = await getUser();
  if (user) redirect('/inicio');

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[440px] flex-col gap-8">
        <AuthBrandHeader />

        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-white">Restablecer contraseña</h2>
          <p className="mb-6 text-sm text-text-muted">
            Te enviaremos un enlace a tu correo para que puedas crear una nueva contraseña.
          </p>
          <ForgotPasswordForm />
        </div>

        <p className="text-center">
          <a href="/login" className="text-sm font-medium text-purple-primary hover:text-purple-hover transition-colors">
            Volver a iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}
