import Link from 'next/link';
import { getUser } from '@/app/actions/auth';
import { SITE } from '@/config/site';

export default async function Home() {
  const user = await getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-[#e8e8e8]">{SITE.name}</h1>
      <p className="text-[#555]">{SITE.description}</p>
      {user ? (
        <Link
          href="/dashboard"
          className="rounded-md bg-[#181818] px-5 py-2.5 text-sm font-medium text-[#e8e8e8] transition-colors hover:bg-[#1f1f1f]"
        >
          Ir al dashboard
        </Link>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          Iniciar sesión con Twitch
        </Link>
      )}
    </div>
  );
}
