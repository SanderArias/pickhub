import Link from 'next/link';

export function Logo({ size = 'sm', href }: { size?: 'sm' | 'lg'; href?: string }) {
  const iconSize = size === 'lg' ? 10 : 6;
  const textSize = size === 'lg' ? 'text-xl' : 'text-base';

  const content = (
    <span className={`inline-flex items-center gap-2 font-bold ${textSize} tracking-tight text-[#EDEDF1]`}>
      <svg
        width={iconSize * 4}
        height={iconSize * 4}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        style={{ width: iconSize * 4, height: iconSize * 4 }}
      >
        <rect width="40" height="40" rx="10" fill="#A000FF" />
        <path
          d="M14 12L24 20L14 28"
          stroke="#EDEDF1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      PickHub
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
