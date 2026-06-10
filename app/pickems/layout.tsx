import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { Header } from '@/components/layout';
import { AppShell } from '@/components/layout';
import { getActivityCapabilities } from '@/activities/registry.server';

export default async function PickemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, profile] = await Promise.all([getUser(), getCurrentProfile()]);
  const caps = getActivityCapabilities('pickem');

  if (user) {
    return <AppShell canCreatePickem={caps.create} initialProfile={profile}>{children}</AppShell>;
  }

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
