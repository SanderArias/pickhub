import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return <Sidebar>{children}</Sidebar>;
}
