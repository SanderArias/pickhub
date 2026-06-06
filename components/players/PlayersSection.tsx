'use client';

import { useState, useRef, useEffect } from 'react';
import { createEventPlayer, deleteEventPlayer, updateEventPlayerCountry } from '@/app/actions/creator';
import { CountryCombobox } from '@/components/ui/CountryCombobox';

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
  players: initialPlayers,
  readOnly = false,
}: {
  eventId: string;
  players: Player[];
  readOnly?: boolean;
}) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setPlayers(initialPlayers);
      initialized.current = true;
    }
  }, [initialPlayers]);

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticPlayer: Player = {
      id: tempId,
      name: trimmed,
      seed: null,
      image_url: null,
      sort_order: players.length,
      is_active: true,
      created_at: new Date().toISOString(),
      country_code: countryCode || null,
    };

    setPlayers((prev) => [...prev, optimisticPlayer]);
    setName('');
    setCountryCode('');
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set('name', trimmed);
    formData.set('country_code', countryCode);

    try {
      const result = await createEventPlayer(eventId, null, formData);
      if (result.error) {
        setPlayers((prev) => prev.filter((p) => p.id !== tempId));
        setError(result.error);
        setName(trimmed);
      } else if (result.player) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? { ...p, id: result.player!.id, created_at: result.player!.created_at }
              : p,
          ),
        );
      }
    } catch {
      setPlayers((prev) => prev.filter((p) => p.id !== tempId));
      setError('Error al crear jugador.');
      setName(trimmed);
    } finally {
      setSubmitting(false);
      nameRef.current?.focus();
    }
  }

  async function handleDelete(playerId: string) {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    setPlayers((prev) => prev.filter((p) => p.id !== playerId));

    try {
      await deleteEventPlayer(eventId, playerId);
    } catch {
      setPlayers((prev) => [...prev, player]);
    }
  }

  return (
    <div>
      {!readOnly && (
        <div className="mb-4">
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre</label>
              <input
                ref={nameRef}
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del jugador"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">País</label>
              <CountryCombobox
                value={countryCode}
                onChange={(code) => setCountryCode(code ?? '')}
                name="country_code"
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </form>
          {error && (
            <p className="mt-1.5 text-xs text-danger">{error}</p>
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
              {players.map((player, i) => {
                const isOptimistic = player.id.startsWith('temp-');
                return (
                  <tr
                    key={player.id}
                    className={`border-b border-border transition-colors last:border-0 hover:bg-[rgba(255,255,255,0.02)] ${
                      isOptimistic ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-xs text-text-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-text-primary">{player.name}</span>
                      {isOptimistic && (
                        <span className="ml-2 text-xs text-text-muted">Guardando…</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {player.seed ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {isOptimistic ? (
                        <span className="text-xs text-text-muted">—</span>
                      ) : (
                        <CountryCell player={player} eventId={eventId} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {new Date(player.created_at).toLocaleDateString()}
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-2">
                        {!isOptimistic && (
                          <button
                            type="button"
                            onClick={() => handleDelete(player.id)}
                            className="text-xs text-text-muted transition-colors hover:text-danger"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
