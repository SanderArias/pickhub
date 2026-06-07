import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { getUserParticipations } from '@/app/actions/participant';
import { ParticipacionesClient } from './ParticipacionesClient';

export default async function ParticipacionesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const participations = await getUserParticipations('all');

  const now = new Date();

  const open = participations.filter((p) => {
    if (p.eventStatus === 'predictions_closed' || p.eventStatus === 'completed' || p.eventStatus === 'archived') return false;
    if (p.eventEndsAt && new Date(p.eventEndsAt) <= now) return false;
    return true;
  });

  const closed = participations.filter((p) => {
    if (p.eventStatus === 'predictions_closed' || p.eventStatus === 'completed' || p.eventStatus === 'archived') return true;
    if (p.eventEndsAt && new Date(p.eventEndsAt) <= now) return true;
    return false;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Mis participaciones</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {participations.length} Pick’em{participations.length !== 1 ? 'es' : ''} en los que has participado
        </p>
      </div>

      <ParticipacionesClient open={open} closed={closed} />
    </div>
  );
}
