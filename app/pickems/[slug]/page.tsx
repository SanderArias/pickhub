import { notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getPublicPickem, getParticipantOfficialResults } from '@/app/actions/participant';
import type { Prize } from '@/app/actions/participant';
import { getLeaderboard, getMyScore } from '@/app/actions/leaderboard';
import { getTiebreakerDraws } from '@/app/actions/tiebreaker';
import { PublicPickemView } from '@/components/pickem/PublicPickemView';
import { createServerClient } from '@/services/supabase';
import { getTwitchAccountInfo } from '@/lib/getTwitchAccountInfo';
import type { OfficialResultEntry } from '@/app/actions/results-data';

export default async function PickemPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getUser();
  const result = await getPublicPickem(slug);

  if (!result.event) {
    notFound();
  }

  const event = result.event;
  const isClosed = event.status === 'predictions_closed' || event.status === 'completed';
  const isCompleted = event.status === 'completed';

  let participantName: string | undefined;
  let participantTwitchStatus: 'connected' | 'not_connected' = 'not_connected';
  let wonPrizeIds: string[] = [];
  let officialResults: OfficialResultEntry[] = [];

  if (user) {
    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, twitch_username, twitch_id, twitch_avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    participantName = profile?.display_name ?? user.email ?? undefined;
    const twitchInfo = getTwitchAccountInfo(profile, user);
    participantTwitchStatus = twitchInfo.isConnected ? 'connected' : 'not_connected';

    if (isCompleted) {
      // Fetch prize_winners for this participant
      const prizeIds = result.prizes.map((p: Prize) => p.id);
      if (prizeIds.length > 0) {
        const { data: myWins } = await supabase
          .from('prize_winners')
          .select('event_prize_id')
          .in('event_prize_id', prizeIds)
          .eq('profile_id', user.id);
        wonPrizeIds = (myWins ?? []).map((w: { event_prize_id: string }) => w.event_prize_id);
      }
    }
  }

  if (isCompleted) {
    const participantRows = await getParticipantOfficialResults(event.id);
    officialResults = participantRows.map((r, i) => ({
      position: i + 1,
      player_name: r.player_name,
      country_code: r.country_code,
      seed: r.seed,
      image_url: r.image_url,
    }));
  }

  const [leaderboard, myScore] = await Promise.all([
    getLeaderboard(event.id),
    getMyScore(event.id),
  ]);

  const drawsMap = isCompleted ? await getTiebreakerDraws(event.id) : {};
  const tiebreakerWinners = Object.entries(drawsMap)
    .filter(([, order]) => order === 1)
    .map(([pid]) => pid);

  const myEntry = leaderboard.find((e) => e.profile_id === user?.id) ?? null;
  const isTiebreakerWinner = myEntry ? tiebreakerWinners.includes(myEntry.profile_id) : false;
  const hasResolvedTies = Object.keys(drawsMap).length > 0;

  let enrichedPicks: Array<{
    position: number;
    playerName: string;
    countryCode: string | null;
    officialPosition: number | null;
    hasPresence: boolean;
    hasExactPosition: boolean;
    points: number;
  }> = [];

  if (result.mySubmission && isCompleted) {
    const top8Q = result.predictions.find((q) => q.template_type === 'top8_ordered');
    const top8Answers = top8Q
      ? result.mySubmission.answers
          .filter((a) => a.question_id === top8Q.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];

    if (top8Answers.length > 0) {
      const supabase = await createServerClient();
      const { data: correctResults } = await supabase
        .from('prediction_results')
        .select('option_id, position')
        .eq('event_id', event.id)
        .eq('question_id', top8Q!.id)
        .eq('is_correct', true);

      const officialPositions = new Map<string, number>(
        (correctResults ?? []).map((r) => [r.option_id, r.position]),
      );
      const officialOptionIds = new Set(officialPositions.keys());

      const activePlayers = result.players.filter((p) => p.is_active);
      const playerLookup = new Map(activePlayers.map((p) => [p.id, p.country_code]));
      const optionPlayerLookup = new Map(
        top8Q!.options.map((o) => [o.id, { name: o.label, playerId: o.player_id }]),
      );

      enrichedPicks = top8Answers.map((a) => {
        const opt = optionPlayerLookup.get(a.option_id);
        const countryCode = opt?.playerId ? playerLookup.get(opt.playerId) ?? null : null;
        const officialPos = officialPositions.get(a.option_id) ?? null;
        const hasPresence = officialOptionIds.has(a.option_id);
        const hasExactPosition = officialPos !== null && officialPos === a.position;
        const points = (hasPresence ? 1 : 0) + (hasExactPosition ? 1 : 0);
        return {
          position: a.position ?? 0,
          playerName: opt?.name ?? '—',
          countryCode,
          officialPosition: officialPos,
          hasPresence,
          hasExactPosition,
          points,
        };
      });
    }
  }

  const isTiebreakerLoser = hasResolvedTies && myEntry
    ? tiebreakerWinners.length > 0 && !isTiebreakerWinner
    : false;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <PublicPickemView
        event={result.event}
        players={result.players}
        predictions={result.predictions}
        prizes={result.prizes}
        mySubmission={result.mySubmission}
        myScore={myScore}
        isAuthenticated={!!user}
        isClosed={isClosed}
        participantName={participantName}
        participantTwitchStatus={participantTwitchStatus}
        leaderboard={leaderboard}
        tiebreakerWinners={tiebreakerWinners}
        myProfileId={user?.id}
        myEntry={myEntry}
        wonPrizeIds={wonPrizeIds}
        enrichedPicks={enrichedPicks}
        officialResults={officialResults}
        isTiebreakerWinner={isTiebreakerWinner}
        isTiebreakerLoser={isTiebreakerLoser}
        hasResolvedTies={hasResolvedTies}
      />
    </div>
  );
}
