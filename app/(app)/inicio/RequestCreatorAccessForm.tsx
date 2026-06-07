'use client';

import { useActionState } from 'react';
import { requestCreatorAccess } from '@/app/actions/creator-profile';

export function RequestCreatorAccessForm() {
  const [state, formAction, pending] = useActionState(requestCreatorAccess, { error: null as string | null });

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="mb-2 text-xs text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
      >
        {pending ? 'Enviando solicitud…' : 'Solicitar acceso'}
      </button>
    </form>
  );
}
