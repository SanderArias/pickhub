'use client';

import { useState, useRef, useEffect, useActionState } from 'react';
import { createEventPlayer, deleteEventPlayer, updateEventPlayerCountry } from '@/app/actions/creator';
import { CountryCombobox } from '@/components/ui/CountryCombobox';
import { COUNTRIES } from '@/lib/countries';

interface Player {
  id: string;
  name: string;
  seed: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  country_code: string | null;
}

function CountryCell({
  player,
  eventId,
}: {
  player: Player;
  eventId: string;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <CountryCombobox
        compact
        defaultValue={player.country_code}
        onChange={async (code) => {
          setSaving(true);
          try {
            await updateEventPlayerCountry(eventId, player.id, code);
          } finally {
            setSaving(false);
          }
        }}
      />
      {saving && (
        <span className="size-3 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
      )}
    </div>
  );
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
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Nombre del jugador"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">País</label>
              <CountryCombobox name="country_code" />
            </div>
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
                <th className="px-3 py-2 font-medium">País</th>
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
                  <td className="px-3 py-2">
                    <CountryCell player={player} eventId={eventId} />
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
