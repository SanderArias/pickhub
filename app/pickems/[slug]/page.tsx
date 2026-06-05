import { notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getPublicPickem } from '@/app/actions/participant';
import { getLeaderboard, getMyScore } from '@/app/actions/leaderboard';
import { getTiebreakerDraws } from '@/app/actions/tiebreaker';
import { PublicPickemView } from '@/components/pickem/PublicPickemView';
import { createServerClient } from '@/services/supabase';

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

  let participantName: string | undefined;
  if (user) {
    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    participantName = profile?.display_name ?? user.email ?? undefined;
  }

  const [leaderboard, myScore] = await Promise.all([
    getLeaderboard(event.id),
    getMyScore(event.id),
  ]);

  const drawsMap = event.status === 'completed' ? await getTiebreakerDraws(event.id) : {};
  const tiebreakerWinners = Object.entries(drawsMap)
    .filter(([, order]) => order === 1)
    .map(([pid]) => pid);

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
        leaderboard={leaderboard}
        drawsMap={drawsMap}
        tiebreakerWinners={tiebreakerWinners}
        myProfileId={user?.id}
      />
    </div>
  );
}
