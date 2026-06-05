import { PickHubLogo } from '@/components/brand/PickHubLogo';

export function Logo({ size = 'sm', href }: { size?: 'sm' | 'lg'; href?: string }) {
  const mappedSize = size === 'lg' ? 'lg' : 'md';
  return <PickHubLogo variant="purple" showText size={mappedSize} href={href} />;
}
