import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { AuthForm } from './LoginForm';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { SocialAuthDivider } from '@/components/auth/SocialAuthDivider';
import { OAuthErrorBanner } from '@/components/auth/OAuthErrorBanner';
import { TwitchLoginButton } from '@/components/auth/TwitchLoginButton';

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

          <TwitchLoginButton next={next} variant="outline" />
        </div>

        <p className="text-center text-xs text-text-muted">
          Un solo acceso para participar y crear experiencias.
        </p>
      </div>
    </div>
  );
}
