'use client';

import { useState, useActionState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/app/actions/auth';
import { PasswordField } from '@/components/auth/PasswordField';
import { TwitchLoginButton } from '@/components/auth/TwitchLoginButton';
import type { AuthActionResult } from '@/app/actions/auth';

function getFieldError(state: AuthActionResult, field: string): string | undefined {
  if (!state || state.success) return undefined;
  return state.fieldErrors?.[field as keyof typeof state.fieldErrors];
}

function getGeneralError(state: AuthActionResult): string | undefined {
  if (!state || state.success) return undefined;
  return state.message;
}

export function AuthForm({ isConfirmed, next }: { isConfirmed?: boolean; next?: string }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loginState, loginAction, loginPending] = useActionState(signInWithEmail, null);
  const [signupState, signupAction, signupPending] = useActionState(signUpWithEmail, null);

  const isLogin = tab === 'login';
  const state = isLogin ? loginState : signupState;
  const formAction = isLogin ? loginAction : signupAction;
  const pending = isLogin ? loginPending : signupPending;

  const showSuccess = !isLogin && signupState?.success === true;

  return (
    <div>
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

      {isConfirmed && (
        <div className="mb-4 rounded-lg border border-success-border bg-success/5 px-4 py-3 text-center" role="alert">
          <p className="text-sm text-success">Tu correo fue confirmado. Ya puedes iniciar sesión.</p>
        </div>
      )}

      {showSuccess ? (
        <div className="rounded-xl border border-success-border bg-success/5 p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/10">
            <svg className="size-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white">Revisa tu correo</p>
          <p className="mt-1 text-sm text-text-muted">
            {signupState?.message || 'Te enviamos un enlace para confirmar tu cuenta.'}
          </p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-purple-primary hover:text-purple-hover transition-colors"
          >
            Volver a iniciar sesión
          </a>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {next && <input type="hidden" name="next" value={next} />}

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
                aria-invalid={getFieldError(state, 'general') ? true : undefined}
                onInput={(e) => { e.currentTarget.setAttribute('data-autofilled', 'true'); }}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/30 transition-colors"
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
              placeholder="tu@email.com"
              aria-invalid={getFieldError(state, 'email') ? true : undefined}
              aria-describedby={getFieldError(state, 'email') ? 'email-error' : undefined}
              onInput={(e) => { e.currentTarget.setAttribute('data-autofilled', 'true'); }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/30 transition-colors"
            />
            {getFieldError(state, 'email') && (
              <div id="email-error" className="mt-1">
                <p className="text-xs text-danger" role="alert">
                  {getFieldError(state, 'email')}
                </p>
                {getFieldError(state, 'email')?.includes('Ya existe') && (
                  <div className="mt-2 flex gap-3">
                    <a
                      href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
                      className="text-xs font-medium text-purple-primary hover:text-purple-hover transition-colors"
                    >
                      Iniciar sesión
                    </a>
                    <span className="text-xs text-text-muted">|</span>
                    <TwitchLoginButton next={next} variant="link" />
                  </div>
                )}
              </div>
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
              error={getFieldError(state, 'password')}
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
                aria-invalid={getFieldError(state, 'confirmPassword') ? true : undefined}
                aria-describedby={getFieldError(state, 'confirmPassword') ? 'confirmPassword-error' : undefined}
                onInput={(e) => { e.currentTarget.setAttribute('data-autofilled', 'true'); }}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/30 transition-colors"
              />
              {getFieldError(state, 'confirmPassword') && (
                <p id="confirmPassword-error" className="mt-1 text-xs text-danger" role="alert">
                  {getFieldError(state, 'confirmPassword')}
                </p>
              )}
            </div>
          )}

          {getGeneralError(state) && (
            <p className="text-sm text-danger" role="alert">{getGeneralError(state)}</p>
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
