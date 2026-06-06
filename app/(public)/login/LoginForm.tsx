'use client';

import { useActionState, useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/app/actions/auth';

export function AuthForm({ isConfirmed }: { isConfirmed?: boolean }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loginState, loginAction, loginPending] = useActionState(signInWithEmail, null);
  const [signupState, signupAction, signupPending] = useActionState(signUpWithEmail, null);

  const isLogin = tab === 'login';
  const state = isLogin ? loginState : signupState;
  const action = isLogin ? loginAction : signupAction;
  const pending = isLogin ? loginPending : signupPending;

  const showSuccess = !isLogin && signupState?.success;

  return (
    <div>
      <div className="mb-6 flex rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => setTab('login')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'login'
              ? 'bg-purple-primary text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setTab('signup')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'signup'
              ? 'bg-purple-primary text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {isConfirmed && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/[0.02] p-3 text-center">
          <p className="text-sm text-green-400">Tu correo fue confirmado. Ya puedes iniciar sesión.</p>
        </div>
      )}

      {showSuccess ? (
        <div className="rounded-lg border border-green-500/20 bg-green-500/[0.02] p-6 text-center">
          <p className="text-sm text-green-400">{signupState.success}</p>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4">
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
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
              />
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
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
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
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
              />
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center rounded-lg bg-purple-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {pending
              ? (isLogin ? 'Iniciando sesión…' : 'Creando cuenta…')
              : (isLogin ? 'Iniciar sesión' : 'Crear cuenta')}
          </button>
        </form>
      )}
    </div>
  );
}
