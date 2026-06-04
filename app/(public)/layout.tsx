import { Header } from '@/components/layout';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
