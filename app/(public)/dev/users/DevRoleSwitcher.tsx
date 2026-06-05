'use client';

import { useActionState } from 'react';
import { devSetRole } from '@/app/actions/dev';

export function DevRoleSwitcher({ currentRole }: { currentRole: string }) {
  const [state, formAction, pending] = useActionState(devSetRole, { error: null as string | null });

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Cambiar rol</h2>

      <form action={formAction} className="flex flex-col gap-3">
        <select
          name="role"
          defaultValue={currentRole}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary"
        >
          <option value="user">user</option>
          <option value="creator">creator</option>
          <option value="admin">admin</option>
        </select>

        {state?.error && <p className="text-xs text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
        >
          {pending ? 'Cambiando…' : 'Cambiar rol'}
        </button>
      </form>
    </div>
  );
}
