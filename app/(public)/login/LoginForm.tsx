'use client';

import { useActionState } from 'react';
import { signInWithEmail } from '@/app/actions/auth';

const initialState = { error: null as string | null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithEmail, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#888]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#888]">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white disabled:opacity-50"
      >
        {pending ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
