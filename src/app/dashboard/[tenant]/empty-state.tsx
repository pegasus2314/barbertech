import { CARD } from "@/lib/ui";

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={`${CARD} px-6 py-12 text-center`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f6f2] text-neutral-400">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-neutral-900">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>}
    </div>
  );
}
