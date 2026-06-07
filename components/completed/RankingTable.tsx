import type { RankingEntry } from '@/activities/pickem/actions/results-data';
import { Badge } from './Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildTieScores(entries: RankingEntry[]): Set<number> {
  const tied = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].total_score === entries[i - 1].total_score) tied.add(entries[i].total_score);
    if (i < entries.length - 1 && entries[i].total_score === entries[i + 1].total_score) tied.add(entries[i].total_score);
  }
  return tied;
}

function getDisplayRank(entry: RankingEntry, entries: RankingEntry[], tieScores: Set<number>): number {
  if (!tieScores.has(entry.total_score)) return entry.rank;
  let minRank = entry.rank;
  for (const e of entries) {
    if (e.total_score === entry.total_score && e.rank < minRank) minRank = e.rank;
  }
  return minRank;
}

/* ------------------------------------------------------------------ */
/*  Rank badges                                                        */
/* ------------------------------------------------------------------ */

function RankBadges({ entry }: { entry: RankingEntry }) {
  if (entry.is_tiebreaker_winner) {
    return <Badge type="winner" />;
  }
  if (entry.rank === 1 && entry.prizes.length > 0) {
    return <Badge type="winner" />;
  }
  if (entry.prizes.length > 0) {
    return <Badge type="prized" />;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Desktop row                                                        */
/* ------------------------------------------------------------------ */

function RankingRow({
  entry,
  displayRank,
  isTied,
  isProvisional,
  hasEventPrizes,
  currentProfileId,
}: {
  entry: RankingEntry;
  displayRank: number;
  isTied: boolean;
  isProvisional: boolean;
  hasEventPrizes: boolean;
  currentProfileId?: string | null;
}) {
  const isTop3 = displayRank <= 3;
  const isTiedProvisional = isTied && isProvisional;
  const isMe = entry.profile_id === currentProfileId;

  return (
    <tr
      className={`border-b border-border last:border-b-0 transition-colors ${
        isTiedProvisional ? 'bg-yellow-500/[0.02]' : isMe ? 'bg-purple-primary/[0.03]' : 'hover:bg-surface-hover/50'
      }`}
    >
      {/* Position */}
      <td className="py-2 pr-2 align-middle">
        {isTiedProvisional ? (
          <span
            className="flex size-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400"
            aria-label="Posición pendiente de desempate"
          >
            ?
          </span>
        ) : (
          <span
            className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${
              isTop3 ? 'bg-purple-primary text-white' : 'border border-border text-text-muted'
            }`}
          >
            {displayRank}
          </span>
        )}
      </td>

      {/* Participant */}
      <td className="py-2 px-2 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar name={entry.display_name} url={entry.avatar_url} />
          <span className={`truncate text-sm font-medium ${isMe ? 'text-purple-primary' : 'text-text-primary'}`}>
            {entry.display_name ?? 'Participante'}
            {isMe && <span className="ml-1 text-xs text-purple-primary">(t&uacute;)</span>}
          </span>
          {entry.is_verified_subscriber && (
            <span className="shrink-0 rounded-md border border-purple-primary/30 bg-purple-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-primary leading-tight">
              ★ Sub
            </span>
          )}
        </div>
      </td>

      {/* Puntos */}
      <td className="py-2 px-2 align-middle text-right text-sm font-semibold text-text-primary">
        {entry.total_score}
      </td>

      {/* Premios */}
      <td className="py-2 px-2 align-middle">
        {entry.prizes.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {entry.prizes.map((p, i) => (
              <span key={i} className="text-xs text-purple-primary truncate">{p}</span>
            ))}
          </div>
        ) : isProvisional && hasEventPrizes ? (
          <span className="text-xs text-yellow-400 cursor-default" title="La asignación se definirá después del desempate.">
            Pendiente
          </span>
        ) : (
          <span className="text-xs text-text-muted">&mdash;</span>
        )}
      </td>

      {/* Estado */}
      <td className="py-2 pr-3 pl-2 align-middle text-right whitespace-nowrap">
        <div className="inline-flex flex-wrap gap-1">
          {isTiedProvisional && <Badge type="tie_pending" />}
          {!isProvisional && <RankBadges entry={entry} />}
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop rows builder                                               */
/* ------------------------------------------------------------------ */

function buildDisplayRows(
  entries: RankingEntry[],
  isProvisional: boolean,
  hasEventPrizes: boolean,
  currentProfileId?: string | null,
) {
  const tieScores = buildTieScores(entries);
  const rows: React.ReactNode[] = [];
  let lastScore: number | null = null;

  entries.forEach((entry) => {
    const displayRank = isProvisional ? getDisplayRank(entry, entries, tieScores) : entry.rank;
    const isTied = tieScores.has(entry.total_score);

    if (isProvisional && isTied && entry.total_score !== lastScore) {
      rows.push(
        <tr key={`header-${entry.total_score}`} className="border-0">
          <td colSpan={5} className="pb-1 pt-3">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="h-px flex-1 bg-border" />
              <span className="shrink-0 font-medium">
                Empatados por el {displayRank}.º lugar &middot; {entry.total_score} pts
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </td>
        </tr>,
      );
    }

    rows.push(
      <RankingRow
        key={entry.profile_id}
        entry={entry}
        displayRank={displayRank}
        isTied={isTied}
        isProvisional={isProvisional}
        hasEventPrizes={hasEventPrizes}
        currentProfileId={currentProfileId}
      />,
    );

    lastScore = entry.total_score;
  });

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Mobile card                                                        */
/* ------------------------------------------------------------------ */

function MobileCard({
  entry,
  displayRank,
  isTiedProvisional,
  isProvisional,
  hasEventPrizes,
  currentProfileId,
}: {
  entry: RankingEntry;
  displayRank: number;
  isTiedProvisional: boolean;
  isProvisional: boolean;
  hasEventPrizes: boolean;
  currentProfileId?: string | null;
}) {
  const isMe = entry.profile_id === currentProfileId;

  return (
    <div
      className={`rounded-lg border bg-surface p-3 ${
        isTiedProvisional ? 'border-yellow-500/20' : isMe ? 'border-purple-primary/30' : 'border-border'
      }`}
    >
      {/* Row 1: position + avatar + name + points + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isTiedProvisional ? (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400"
              aria-label="Posición pendiente de desempate"
            >
              ?
            </span>
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-primary text-xs font-bold text-white">
              {displayRank}
            </span>
          )}
          <UserAvatar name={entry.display_name} url={entry.avatar_url} />
          <span className={`truncate text-sm font-medium ${isMe ? 'text-purple-primary' : 'text-text-primary'}`}>
            {entry.display_name ?? 'Participante'}
            {isMe && <span className="ml-1 text-xs text-purple-primary">(t&uacute;)</span>}
          </span>
          {entry.is_verified_subscriber && (
            <span className="shrink-0 rounded-md border border-purple-primary/30 bg-purple-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-primary leading-tight">
              ★ Sub
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isProvisional && <RankBadges entry={entry} />}
          <span className="text-sm font-semibold text-text-primary">
            {entry.total_score} pts
          </span>
        </div>
      </div>

      {/* Row 2: prizes */}
      {entry.prizes.length > 0 ? (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {entry.prizes.map((p, i) => (
            <span key={i} className="text-xs text-purple-primary">{p}</span>
          ))}
        </div>
      ) : isProvisional && hasEventPrizes ? (
        <div className="mt-1.5 text-xs text-yellow-400">Premio pendiente de desempate</div>
      ) : null}

      {/* Badges (provisional) */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {isTiedProvisional && <Badge type="tie_pending" />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile cards builder                                               */
/* ------------------------------------------------------------------ */

function buildMobileCards(
  entries: RankingEntry[],
  isProvisional: boolean,
  hasEventPrizes: boolean,
  currentProfileId?: string | null,
) {
  const tieScores = buildTieScores(entries);
  const cards: React.ReactNode[] = [];
  let lastScore: number | null = null;

  entries.forEach((entry) => {
    const displayRank = isProvisional ? getDisplayRank(entry, entries, tieScores) : entry.rank;
    const isTied = tieScores.has(entry.total_score);
    const isTiedProvisional = isTied && isProvisional;

    if (isProvisional && isTied && entry.total_score !== lastScore) {
      cards.push(
        <div key={`header-${entry.total_score}`} className="text-xs text-text-muted font-medium text-center py-1">
          Empatados por el {displayRank}.º lugar &middot; {entry.total_score} pts
        </div>,
      );
    }

    cards.push(
      <MobileCard
        key={entry.profile_id}
        entry={entry}
        displayRank={displayRank}
        isTiedProvisional={isTiedProvisional}
        isProvisional={isProvisional}
        hasEventPrizes={hasEventPrizes}
        currentProfileId={currentProfileId}
      />,
    );

    lastScore = entry.total_score;
  });

  return cards;
}

/* ------------------------------------------------------------------ */
/*  RankingTable — shared pure presentational component                */
/* ------------------------------------------------------------------ */

interface RankingTableProps {
  entries: RankingEntry[];
  isProvisional?: boolean;
  hasPrizes?: boolean;
  currentProfileId?: string | null;
}

export function RankingTable({
  entries,
  isProvisional = false,
  hasPrizes = false,
  currentProfileId,
}: RankingTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">No hay participantes en la clasificación.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[90px]" />
            <col />
            <col className="w-[100px]" />
            <col className="w-[180px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-2 pr-2 font-medium">Posición</th>
              <th className="py-2 px-2 font-medium">Participante</th>
              <th className="py-2 px-2 font-medium text-right">Puntos</th>
              <th className="py-2 px-2 font-medium">Premio</th>
              <th className="py-2 pr-3 pl-2 font-medium text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {buildDisplayRows(entries, isProvisional, hasPrizes, currentProfileId)}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-2">
        {buildMobileCards(entries, isProvisional, hasPrizes, currentProfileId)}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

export function RankingTableSkeleton() {
  return (
    <div className="flex flex-col gap-3 motion-safe:animate-pulse" aria-label="Cargando clasificación">
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[90px]" />
            <col />
            <col className="w-[100px]" />
            <col className="w-[180px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-2 pr-2 font-medium">Posición</th>
              <th className="py-2 px-2 font-medium">Participante</th>
              <th className="py-2 px-2 font-medium text-right">Puntos</th>
              <th className="py-2 px-2 font-medium">Premio</th>
              <th className="py-2 pr-3 pl-2 font-medium text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2.5 pr-2"><div className="size-7 rounded-full bg-surface-hover" /></td>
                <td className="py-2.5 px-2"><div className="h-4 w-32 rounded bg-surface-hover" /></td>
                <td className="py-2.5 px-2 text-right"><div className="ml-auto h-4 w-10 rounded bg-surface-hover" /></td>
                <td className="py-2.5 px-2"><div className="h-4 w-16 rounded bg-surface-hover" /></td>
                <td className="py-2.5 pr-3 pl-2 text-right"><div className="ml-auto h-4 w-14 rounded bg-surface-hover" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="size-7 rounded-full bg-surface-hover" />
            <div className="flex-1">
              <div className="h-4 w-28 rounded bg-surface-hover" />
            </div>
            <div className="h-4 w-10 rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
