import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'default' | 'indigo' | 'emerald';
}) {
  const toneClasses =
    tone === 'indigo'
      ? 'bg-indigo-50 text-indigo-600'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-slate-100 text-slate-500';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses}`}>
          <Icon size={14} strokeWidth={2.5} />
        </span>
      </div>
      <div className="font-mono-num mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{value}</div>
    </div>
  );
}
