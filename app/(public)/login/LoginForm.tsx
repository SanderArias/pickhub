'use client';

import { useActionState } from 'react';
import { signInWithEmail } from '@/app/actions/auth';

const initialState = { error: null as string | null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithEmail, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
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
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-purple-primary px-4 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
      >
        {pending ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
