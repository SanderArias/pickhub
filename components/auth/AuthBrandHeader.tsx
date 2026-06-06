import { PickHubLogo } from '@/components/brand/PickHubLogo';

export function AuthBrandHeader() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <PickHubLogo variant="purple" showText size="lg" />
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-white">
          Dinámicas que conectan a tu comunidad
        </p>
        <p className="text-sm text-text-muted max-w-xs mx-auto">
          Crea, organiza y participa en experiencias interactivas.
        </p>
      </div>
    </div>
  );
}
