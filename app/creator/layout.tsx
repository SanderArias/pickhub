import { AppShell } from '@/components/layout';

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
