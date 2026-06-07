import { getCreatorPickems } from '@/app/actions/creator';
import { PickemsList } from '@/components/pickem/PickemsList';

export default async function PickemsPage() {
  const pickems = await getCreatorPickems();

  return <PickemsList pickems={pickems} />;
}
