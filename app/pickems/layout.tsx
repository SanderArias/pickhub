import { getUser } from '@/app/actions/auth';
import { Header } from '@/components/layout';
import { AppShell } from '@/components/layout';

export default async function PickemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (user) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
