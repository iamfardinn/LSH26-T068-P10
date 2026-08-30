import type { ReactNode } from 'react';

export function SectionCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{title}</h2>
      {subtitle && <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
