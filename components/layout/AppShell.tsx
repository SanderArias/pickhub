import { Sidebar } from './Sidebar';

export function AppShell({ children, canCreatePickem }: { children: React.ReactNode; canCreatePickem?: boolean }) {
  return <Sidebar canCreatePickem={canCreatePickem}>{children}</Sidebar>;
}
