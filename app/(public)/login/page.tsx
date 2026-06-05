import { redirect } from 'next/navigation';
import { getUser, signInWithTwitch } from '@/app/actions/auth';
import { LoginForm } from './LoginForm';
import { Logo } from '@/components/ui/Logo';

export default async function LoginPage() {
  const user = await getUser();

  if (user) {
    redirect('/inicio');
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size="lg" />
          <p className="mt-2 text-sm text-text-muted">
            Pick’ems para tu comunidad
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold tracking-wider text-text-muted">
              Entrar con Twitch
            </p>
            <form action={signInWithTwitch}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-primary px-4 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
              >
                <TwitchIcon />
                Continuar con Twitch
              </button>
            </form>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-text-muted">o</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wider text-text-muted">
              Entrar como admin / dev
            </p>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function TwitchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}
