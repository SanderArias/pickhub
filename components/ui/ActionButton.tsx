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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors';

  const styles: Record<string, string> = {
    primary: 'border border-purple-primary text-purple-primary bg-transparent hover:bg-purple-primary hover:text-white',
    secondary: 'bg-surface-hover text-text-primary border border-border hover:border-border-hover',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
    danger: 'text-danger border border-danger-border bg-transparent hover:bg-danger-border',
  };

  const disabledStyle = disabled
    ? 'cursor-not-allowed bg-surface text-text-muted border border-border'
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
