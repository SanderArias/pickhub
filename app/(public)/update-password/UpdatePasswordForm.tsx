'use client';

import { useActionState } from 'react';
import { updatePassword } from '@/app/actions/auth';
import { PasswordField } from '@/components/auth/PasswordField';
import type { AuthActionResult } from '@/app/actions/auth';

function getFieldError(state: AuthActionResult, field: string): string | undefined {
  if (!state || state.success) return undefined;
  return state.fieldErrors?.[field as keyof typeof state.fieldErrors];
}

function getGeneralError(state: AuthActionResult): string | undefined {
  if (!state || state.success) return undefined;
  return state.message;
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <PasswordField
        id="password"
        name="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        error={getFieldError(state, 'password')}
      />

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
        {pending ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
