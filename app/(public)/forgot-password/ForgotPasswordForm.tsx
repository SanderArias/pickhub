'use client';

import { useActionState } from 'react';
import { resetPasswordForEmail } from '@/app/actions/auth';
import type { AuthActionResult } from '@/app/actions/auth';

function getFieldError(state: AuthActionResult, field: string): string | undefined {
  if (!state || state.success) return undefined;
  return state.fieldErrors?.[field as keyof typeof state.fieldErrors];
}

function getGeneralError(state: AuthActionResult): string | undefined {
  if (!state || state.success) return undefined;
  return state.message;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordForEmail, null);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-success-border bg-success/5 p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/10">
          <svg className="size-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <p className="text-sm text-text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
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
          <p id="email-error" className="mt-1 text-xs text-danger" role="alert">
            {getFieldError(state, 'email')}
          </p>
        )}
      </div>

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
        {pending ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  );
}
