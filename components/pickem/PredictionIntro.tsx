export function PredictionIntro({
  hasTop8,
  questionCount,
  playerCount,
}: {
  hasTop8: boolean;
  questionCount: number;
  playerCount: number;
}) {
  if (hasTop8) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-text-primary">
          Arma tu Top {playerCount}
        </h2>
        <p className="text-sm text-text-secondary">
          Ordena los jugadores del puesto 1 al {playerCount} seg&uacute;n tu predicci&oacute;n.
        </p>
        <p className="text-xs text-text-muted">
          Arrastra o pulsa Agregar para completar tu ranking.
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-primary/30 bg-surface px-2 py-1 text-xs">
            <span className="font-semibold text-purple-primary">+1</span>
            <span className="text-text-secondary">Jugador dentro del Top {playerCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-primary/30 bg-surface px-2 py-1 text-xs">
            <span className="font-semibold text-purple-primary">+1</span>
            <span className="text-text-secondary">Posici&oacute;n exacta</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-bold text-text-primary">
        {questionCount} pregunt{questionCount !== 1 ? 'as' : 'a'}
      </h2>
      <p className="text-sm text-text-secondary">
        Selecciona tus respuestas para cada pregunta.
      </p>
    </div>
  );
}
