export function SocialAuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-surface px-3 text-text-muted tracking-wide">
          o continúa con
        </span>
      </div>
    </div>
  );
}
