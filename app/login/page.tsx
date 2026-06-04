import { redirect } from 'next/navigation';
import { signInWithTwitch, getUser } from '@/app/actions/auth';
import { SITE } from '@/config/site';

export default async function LoginPage() {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-3xl font-bold">{SITE.name}</h1>
        <p className="text-sm text-zinc-500">
          Inicia sesión para participar en las dinámicas
        </p>
        <form action={signInWithTwitch}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <TwitchIcon />
            Continuar con Twitch
          </button>
        </form>
      </div>
    </main>
  );
}

function TwitchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}
