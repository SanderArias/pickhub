import { redirect } from 'next/navigation';
import { getUser, signInWithTwitch } from '@/app/actions/auth';
import { AuthForm } from './LoginForm';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { SocialAuthDivider } from '@/components/auth/SocialAuthDivider';
import { OAuthErrorBanner } from '@/components/auth/OAuthErrorBanner';

function validateNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; next?: string }>;
}) {
  const { confirmed, next: rawNext } = await searchParams;
  const next = validateNext(rawNext) ?? '/inicio';
  const user = await getUser();

  if (user) {
    redirect(next);
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[440px] flex-col gap-8">
        <AuthBrandHeader />

        <OAuthErrorBanner />

        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <AuthForm isConfirmed={confirmed === '1'} next={next} />

          <SocialAuthDivider />

          <form action={signInWithTwitch}>
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-purple-primary/40 px-4 py-2.5 text-sm font-medium text-purple-primary transition-all hover:bg-purple-primary/10 focus:outline-none focus:ring-2 focus:ring-purple-primary/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
              </svg>
              Continuar con Twitch
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted">
          Un solo acceso para participar y crear experiencias.
        </p>
      </div>
    </div>
  );
}
