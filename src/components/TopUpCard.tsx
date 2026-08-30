import { Wallet } from 'lucide-react';
import type { TopUpResult } from '../lib/engine';
import { fmt } from '../lib/format';

export function TopUpCard({
  targetDate,
  minDate,
  onChange,
  result,
}: {
  targetDate: string;
  minDate: string;
  onChange: (v: string) => void;
  result: TopUpResult;
}) {
  const rows = result.invalid
    ? []
    : [
        { label: 'Energy (base, lowest slab)', value: result.baseEnergy!, color: '#14b8a6' },
        { label: 'Extra from higher slabs', value: result.slabPremium!, color: '#f43f5e' },
        { label: 'Fixed charges (demand + rent)', value: result.fixed!, color: '#94a3b8' },
        { label: 'VAT (5% of energy)', value: result.vat!, color: '#4f46e5' },
      ];
  const max = Math.max(...rows.map((r) => r.value), 1);
  const credit = result.balanceCredit ?? 0;
  const fullyCovered = !result.invalid && result.total === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
        <Wallet size={14} /> How much to recharge today, to last until…
      </div>

      <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Pick a date
      </label>
      <input
        type="date"
        value={targetDate}
        min={minDate}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono-num mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2"
      />

      {result.invalid ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {result.reason}
        </div>
      ) : (
        <>
          <div className="font-mono-num mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {fmt(result.total)}
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            What the period actually costs
          </p>
          <div className="mt-2 space-y-2.5">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-3 text-xs">
                <div className="w-[136px] shrink-0 text-slate-500">{r.label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }}
                  />
                </div>
                <div className="font-mono-num w-20 shrink-0 text-right font-semibold text-slate-900">
                  {fmt(r.value)}
                </div>
              </div>
            ))}
          </div>
          {credit > 0 && (
            <div className="mt-3 flex items-center gap-3 border-t border-slate-200 pt-3 text-xs">
              <div className="w-[136px] shrink-0 text-slate-500">Already on your meter</div>
              <div className="flex-1" />
              <div className="font-mono-num w-20 shrink-0 text-right font-semibold text-emerald-600">
                −{fmt(credit)}
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-300 pt-3 text-sm font-bold text-indigo-600">
            <span>Total to recharge today</span>
            <span className="font-mono-num">{fmt(result.total)}</span>
          </div>
          {fullyCovered && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Nothing to recharge — the {fmt(credit)} already on the meter covers this whole period, which is why
              the run-out date above is on or after the date you picked.
            </p>
          )}
          {result.fixed === 0 && !fullyCovered && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              No demand charge or meter rent in this figure — a recharge already happened earlier this month, so
              that fixed charge was already taken.
            </p>
          )}
        </>
      )}
    </div>
  );
}
