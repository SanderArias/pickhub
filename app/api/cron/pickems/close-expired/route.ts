import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { closeExpiredPickems } from '@/activities/pickem/actions/auto-close';
import { pickemRoutes } from '@/activities/pickem/routes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await closeExpiredPickems();

  for (const err of result.errors) {
    revalidatePath(pickemRoutes.creator.detail(err.eventId));
    revalidatePath(pickemRoutes.creator.results(err.eventId));
  }
  revalidatePath(pickemRoutes.api.revalidatePublic);

  return NextResponse.json(result);
}
