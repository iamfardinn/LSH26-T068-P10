import { CalendarClock } from 'lucide-react';
import type { RunOutResult } from '../lib/engine';
import { humanDate } from '../lib/dates';

export function RunOutCard({ result, usualDailyUnits }: { result: RunOutResult | null; usualDailyUnits: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
        <CalendarClock size={14} /> When does the money run out?
      </div>
      <div className="font-mono-num mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
        {result ? humanDate(result.date) : 'Not within 10 years'}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {result
          ? `${result.daysFromToday} day(s) from today, at ${usualDailyUnits} units/day — no further recharges assumed, so no extra demand charge or meter rent is added along the way.`
          : `Usual daily use is ${usualDailyUnits} units. If that's 0, the balance never depletes from consumption alone.`}
      </p>
    </div>
  );
}
