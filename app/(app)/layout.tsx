import { AppShell } from '@/components/layout';
import { getActivityCapabilities } from '@/activities/registry.server';
import { getCurrentProfile } from '@/lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caps = getActivityCapabilities('pickem');
  const profile = await getCurrentProfile();

  return <AppShell canCreatePickem={caps.create} initialProfile={profile}>{children}</AppShell>;
}
