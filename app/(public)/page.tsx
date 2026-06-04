import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/app/actions/auth';
import { Logo } from '@/components/ui/Logo';

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect('/inicio');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Logo size="lg" />
      <p className="text-sm text-text-muted">Pick&apos;ems para tu comunidad</p>
      <Link
        href="/login"
        className="rounded-lg border border-purple-primary px-5 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
      >
        Iniciar sesión con Twitch
      </Link>
    </div>
  );
}
