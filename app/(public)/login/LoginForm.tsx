'use client';

import { useActionState, useState, useRef, useEffect } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/app/actions/auth';
import { PasswordField } from '@/components/auth/PasswordField';

function validateEmail(v: string): string | null {
  if (!v.trim()) return 'El correo es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Introduce un correo válido.';
  return null;
}

function validatePassword(v: string): string | null {
  if (!v) return 'La contraseña es obligatoria.';
  if (v.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return null;
}

export function AuthForm({ isConfirmed }: { isConfirmed?: boolean }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loginState, loginAction, loginPending] = useActionState(signInWithEmail, null);
  const [signupState, signupAction, signupPending] = useActionState(signUpWithEmail, null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const isLogin = tab === 'login';
  const state = isLogin ? loginState : signupState;
  const action = isLogin ? loginAction : signupAction;
  const pending = isLogin ? loginPending : signupPending;

  const showSuccess = !isLogin && signupState?.success;

  // Clear field errors when tab changes
  useEffect(() => {
    setFieldErrors({});
  }, [tab]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') as string) ?? '';
    const password = (formData.get('password') as string) ?? '';
    const username = (formData.get('username') as string) ?? '';
    const confirmPassword = (formData.get('confirmPassword') as string) ?? '';

    const errs: Record<string, string> = {};

    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;

    const passErr = validatePassword(password);
    if (passErr) errs.password = passErr;

    if (!isLogin) {
      if (!username.trim()) errs.username = 'El nombre de usuario es obligatorio.';
      if (!confirmPassword) errs.confirmPassword = 'Confirma tu contraseña.';
      if (password && confirmPassword && password !== confirmPassword) {
        errs.confirmPassword = 'Las contraseñas no coinciden.';
      }
    }

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) return;

    // Use the server action
    action(formData);
  }

  // Map server error to field errors
  const serverError = state?.error;
  const allFieldErrors = { ...fieldErrors };
  if (serverError && !isLogin) {
    if (serverError.toLowerCase().includes('email')) {
      if (!allFieldErrors.email) allFieldErrors.email = serverError;
    } else if (serverError.toLowerCase().includes('contraseña') || serverError.toLowerCase().includes('password')) {
      if (!allFieldErrors.password) allFieldErrors.password = serverError;
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex rounded-lg border border-border bg-bg/50 p-0.5" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'login'}
          onClick={() => setTab('login')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            tab === 'login'
              ? 'bg-purple-primary/15 text-purple-primary shadow-sm border border-purple-primary/20'
              : 'text-text-muted hover:text-text-primary border border-transparent'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'signup'}
          onClick={() => setTab('signup')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            tab === 'signup'
              ? 'bg-purple-primary/15 text-purple-primary shadow-sm border border-purple-primary/20'
              : 'text-text-muted hover:text-text-primary border border-transparent'
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {/* Email confirmed banner */}
      {isConfirmed && (
        <div className="mb-4 rounded-lg border border-success-border bg-success/5 px-4 py-3 text-center" role="alert">
          <p className="text-sm text-success">Tu correo fue confirmado. Ya puedes iniciar sesión.</p>
        </div>
      )}

      {/* Signup success */}
      {showSuccess ? (
        <div className="rounded-xl border border-success-border bg-success/5 p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/10">
            <svg className="size-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white">Revisa tu correo</p>
          <p className="mt-1 text-sm text-text-muted">
            Te enviamos un enlace para confirmar tu cuenta.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-purple-primary hover:text-purple-hover transition-colors"
          >
            Volver a iniciar sesión
          </a>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {tab === 'signup' && (
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Nombre de usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="tunombre"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/30 transition-colors"
              />
              {allFieldErrors.username && (
                <p className="mt-1 text-xs text-danger" role="alert">{allFieldErrors.username}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/30 transition-colors"
            />
            {allFieldErrors.email && (
              <p className="mt-1 text-xs text-danger" role="alert">{allFieldErrors.email}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              {isLogin && (
                <a
                  href="/forgot-password"
                  className="text-xs font-medium text-purple-primary hover:text-purple-hover transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              )}
            </div>
            <PasswordField
              id="password"
              name="password"
              label=""
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'Tu contraseña' : 'Mínimo 8 caracteres'}
              error={allFieldErrors.password}
            />
          </div>

          {tab === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/30 transition-colors"
              />
              {allFieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-danger" role="alert">{allFieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* General server error */}
          {serverError && Object.keys(allFieldErrors).length === 0 && (
            <p className="text-sm text-danger" role="alert">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && (
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
            )}
            {pending
              ? (isLogin ? 'Iniciando sesión…' : 'Creando cuenta…')
              : (isLogin ? 'Iniciar sesión' : 'Crear cuenta')}
          </button>
        </form>
      )}
    </div>
  );
}
