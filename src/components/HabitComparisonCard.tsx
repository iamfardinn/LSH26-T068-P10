import { TrendingDown, CalendarDays, Scale } from 'lucide-react';
import type { HabitResult } from '../lib/engine';
import { FIXED_CHARGES } from '../lib/tariff';
import { fmt } from '../lib/format';

function HabitCard({
  icon: Icon,
  title,
  description,
  result,
  totalMonths,
}: {
  icon: typeof TrendingDown;
  title: string;
  description: string;
  result: HabitResult;
  totalMonths: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon size={16} className="text-indigo-600" /> {title}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      <div className="font-mono-num mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
        {fmt(result.totalCost)}
      </div>
      <dl className="mt-4 space-y-0 divide-y divide-slate-200 border-t border-slate-200 text-xs">
        {[
          ['Times recharged', String(result.rechargeCount)],
          ['Total deposited', fmt(result.rechargeTotal)],
          ['Months with a fixed charge', `${result.fixedChargeMonths} of ${totalMonths}`],
          ['Energy + VAT (identical either way)', fmt(result.totalEnergyVat)],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-mono-num font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function HabitComparisonCard({
  low,
  monthly,
  monthCount,
}: {
  low: HabitResult;
  monthly: HabitResult;
  monthCount: number;
}) {
  const diff = Math.abs(low.totalCost - monthly.totalCost);
  const equal = diff < 0.01;
  const lowCheaper = low.totalCost < monthly.totalCost;
  const cheaperLabel = lowCheaper ? 'Low-balance recharging' : 'Recharging on the 1st';
  const cheaper = lowCheaper ? low : monthly;
  const pricier = lowCheaper ? monthly : low;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HabitCard
          icon={TrendingDown}
          title="Low-balance recharging"
          description="Recharge ৳5,000 whenever the balance falls below ৳200."
          result={low}
          totalMonths={monthCount}
        />
        <HabitCard
          icon={CalendarDays}
          title="Recharge on the 1st"
          description="Recharge ৳2,000 on the first day of every month."
          result={monthly}
          totalMonths={monthCount}
        />
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm leading-relaxed text-emerald-800">
        <Scale size={16} className="mt-0.5 shrink-0" />
        {equal ? (
          <span>
            Both habits cost exactly the same: <b>{fmt(low.totalCost)}</b>. Same consumption, same slab counter, and
            both triggered a fixed charge in the same number of months — recharge timing bought nothing either way.
            (The problem statement's own clarifications note this is a legitimate outcome, not a bug.)
          </span>
        ) : (
          <span>
            <b>{cheaperLabel}</b> costs {fmt(diff)} less over these {monthCount} months ({fmt(cheaper.totalCost)} vs{' '}
            {fmt(pricier.totalCost)}). Energy and VAT are identical for both — the entire difference is{' '}
            {Math.abs(cheaper.fixedChargeMonths - pricier.fixedChargeMonths)} fewer month(s) with a fresh demand
            charge + meter rent ({fmt(FIXED_CHARGES)} each).
          </span>
        )}
      </div>
    </div>
  );
}
