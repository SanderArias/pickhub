import { Sidebar } from './Sidebar';
import type { Profile } from '@/lib/auth';

export function AppShell({ children, canCreatePickem, initialProfile }: { children: React.ReactNode; canCreatePickem?: boolean; initialProfile?: Profile | null }) {
  return <Sidebar canCreatePickem={canCreatePickem} initialProfile={initialProfile}>{children}</Sidebar>;
}
