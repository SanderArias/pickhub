export function ActionButton({
  children,
  disabled,
  onClick,
  type,
  variant,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'submit' | 'button';
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const base = 'rounded-md px-4 py-2 text-sm font-medium transition-colors';

  const styles: Record<string, string> = {
    primary: 'bg-[#e8e8e8] text-[#0a0a0a] hover:bg-white',
    secondary: 'bg-[#181818] text-[#e8e8e8] border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#1f1f1f]',
    ghost: 'bg-transparent text-[#888] hover:text-[#e8e8e8] hover:bg-[#181818]',
  };

  const disabledStyle = disabled
    ? 'cursor-not-allowed bg-[#111] text-[#444] border border-[#1f1f1f]'
    : styles[variant ?? 'primary'];

  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${disabledStyle}`}
    >
      {children}
    </button>
  );
}
