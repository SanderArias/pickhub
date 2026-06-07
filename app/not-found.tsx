import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { BackButton } from '@/components/ui/BackButton';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <section className="w-full max-w-lg text-center">
        <Logo size="lg" />

        <p className="mt-10 text-sm font-medium text-purple-primary">
          Error 404
        </p>

        <h1 className="mt-3 text-4xl font-bold text-text-primary">
          Esta p&aacute;gina no existe
        </h1>

        <p className="mt-4 text-text-secondary">
          El enlace puede ser incorrecto, haber expirado o el contenido pudo ser
          eliminado.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/inicio"
            className="rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary/50"
          >
            Volver al inicio
          </Link>

          <BackButton />
        </div>
      </section>
    </main>
  );
}
