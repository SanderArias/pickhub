import { notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getPublicPickem } from '@/app/actions/participant';
import { getLeaderboard, getMyScore } from '@/app/actions/leaderboard';
import { PublicPickemView } from '@/components/pickem/PublicPickemView';
import { LeaderboardSection } from '@/components/pickem/LeaderboardSection';

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

  const [leaderboard, myScore] = await Promise.all([
    getLeaderboard(event.id),
    getMyScore(event.id),
  ]);

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
      />

      {leaderboard.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Clasificaci&oacute;n</h2>
          <LeaderboardSection entries={leaderboard} myProfileId={user?.id} />
        </div>
      )}
    </div>
  );
}
