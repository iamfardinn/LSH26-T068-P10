import { Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Zap size={18} strokeWidth={2.5} />
        </span>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-slate-900">Meter Sense</div>
          <div className="text-xs text-slate-500">Prepaid recharge advisor</div>
        </div>
      </div>
    </header>
  );
}
