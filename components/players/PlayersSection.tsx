'use client';

import { useActionState } from 'react';
import { createEventPlayer, deleteEventPlayer } from '@/app/actions/creator';

interface Player {
  id: string;
  name: string;
  seed: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export function PlayersSection({
  eventId,
  players,
  readOnly = false,
}: {
  eventId: string;
  players: Player[];
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createEventPlayer.bind(null, eventId),
    { error: null as string | null },
  );

  return (
    <div>
      {!readOnly && (
        <div className="mb-4">
          <form action={formAction} className="flex gap-2">
            <input
              name="name"
              type="text"
              required
              placeholder="Nombre del jugador"
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </form>
          {state?.error && (
            <p className="mt-1.5 text-xs text-danger">{state.error}</p>
          )}
        </div>
      )}

      {players.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          No hay jugadores agregados. Agrega al menos 2 jugadores para activar las predicciones.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-xs font-medium text-text-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Jugador</th>
                <th className="px-3 py-2 font-medium">Seed</th>
                <th className="px-3 py-2 font-medium">Agregado</th>
                {!readOnly && <th className="w-14 px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <td className="px-3 py-2 text-xs text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-text-primary">{player.name}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {player.seed ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {new Date(player.created_at).toLocaleDateString()}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2">
                      <form
                        action={deleteEventPlayer.bind(null, eventId, player.id)}
                      >
                        <button
                          type="submit"
                          className="text-xs text-text-muted transition-colors hover:text-danger"
                        >
                          Eliminar
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
