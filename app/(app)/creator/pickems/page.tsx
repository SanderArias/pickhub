import { getCreatorPickems } from '@/activities/pickem/actions';
import { getActivityCapabilities } from '@/activities/registry.server';
import { PickemsList } from '@/components/pickem/PickemsList';

export default async function PickemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const pickems = await getCreatorPickems();
  const caps = getActivityCapabilities('pickem');
  const { notice } = await searchParams;

  return (
    <PickemsList
      pickems={pickems}
      canCreate={caps.create}
      notice={typeof notice === 'string' ? notice : null}
    />
  );
}
