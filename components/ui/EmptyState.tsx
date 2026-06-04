export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[#1f1f1f] bg-[#111] p-8 text-center">
      <p className="text-sm font-medium text-[#888]">{title}</p>
      {description && <p className="text-xs text-[#555]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
