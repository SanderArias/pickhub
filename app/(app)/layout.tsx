import { AppShell } from '@/components/layout';
import { getActivityCapabilities } from '@/activities/registry.server';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caps = getActivityCapabilities('pickem');

  return <AppShell canCreatePickem={caps.create}>{children}</AppShell>;
}
