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
}: {
  eventId: string;
  players: Player[];
}) {
  const [state, formAction, pending] = useActionState(
    createEventPlayer.bind(null, eventId),
    { error: null as string | null },
  );

  return (
    <div>
      <div className="mb-4">
        <form action={formAction} className="flex gap-2">
          <input
            name="name"
            type="text"
            required
            placeholder="Nombre del jugador"
            className="min-w-0 flex-1 rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
        {state?.error && (
          <p className="mt-1.5 text-xs text-red-400">{state.error}</p>
        )}
      </div>

      {players.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#555]">
          No hay jugadores agregados. Agrega al menos 2 jugadores para activar las predicciones.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#1f1f1f]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#0a0a0a] text-xs font-medium uppercase tracking-wider text-[#555]">
                <th className="px-4 py-2.5">Jugador</th>
                <th className="px-4 py-2.5">Seed</th>
                <th className="px-4 py-2.5">Agregado</th>
                <th className="w-16 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.id}
                  className="border-b border-[#1f1f1f] last:border-0"
                >
                  <td className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-medium text-[#555]">
                      {i + 1}
                    </span>
                    <span className="font-medium text-[#e8e8e8]">
                      {player.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#555]">
                    {player.seed ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[#555]">
                    {new Date(player.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <form
                      action={deleteEventPlayer.bind(null, eventId, player.id)}
                    >
                      <button
                        type="submit"
                        className="text-xs text-[#555] transition-colors hover:text-red-400"
                      >
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
