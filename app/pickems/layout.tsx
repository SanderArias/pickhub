import { getUser } from '@/app/actions/auth';
import { Header } from '@/components/layout';
import { AppShell } from '@/components/layout';
import { getActivityCapabilities } from '@/activities/registry.server';

export default async function PickemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const caps = getActivityCapabilities('pickem');

  if (user) {
    return <AppShell canCreatePickem={caps.create}>{children}</AppShell>;
  }

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
