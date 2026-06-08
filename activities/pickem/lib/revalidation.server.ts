import 'server-only';
import { revalidatePath } from 'next/cache';
import { pickemRoutes } from '@/activities/pickem/routes';

export function revalidatePickemPaths(eventId: string) {
  revalidatePath(pickemRoutes.api.revalidate(eventId));
  revalidatePath(pickemRoutes.api.revalidateResults(eventId));
  revalidatePath(pickemRoutes.api.revalidatePublic);
  revalidatePath(pickemRoutes.creator.dashboard);
  revalidatePath('/participaciones');
}
