import Link from 'next/link';
import Image from 'next/image';

const SIZE_MAP = {
  sm: { icon: 20, text: 'text-sm' },
  md: { icon: 24, text: 'text-base' },
  lg: { icon: 40, text: 'text-xl' },
} as const;

const VARIANT_MAP = {
  purple: '/brand/pickhub-icon-purple.svg',
  neutral: '/brand/pickhub-icon-neutral.svg',
} as const;

export function PickHubLogo({
  variant = 'purple',
  showText = true,
  size = 'md',
  href,
}: {
  variant?: 'purple' | 'neutral';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}) {
  const dims = SIZE_MAP[size];
  const textColor = variant === 'neutral' ? 'text-[#1A1A1A]' : 'text-[#EDEDF1]';

  const content = (
    <span className={`inline-flex items-center gap-2 font-bold ${dims.text} tracking-tight ${textColor}`}>
      <Image
        src={VARIANT_MAP[variant]}
        alt="PickHub"
        width={dims.icon}
        height={dims.icon}
        className="shrink-0"
      />
      {showText && 'PickHub'}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
