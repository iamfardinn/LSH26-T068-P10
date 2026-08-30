import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SLABS, slabIndexAt } from '../lib/tariff';

export function SlabLadder({ monthCumulative }: { monthCumulative: number }) {
  const idx = slabIndexAt(monthCumulative);
  const boundary = SLABS[idx].upto;
  const remaining = boundary === Infinity ? null : boundary - monthCumulative;
  const nextRate = SLABS[Math.min(idx + 1, SLABS.length - 1)].rate;
  const hot = remaining !== null && remaining <= 30;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {SLABS.map((s, i) => {
          const from = i === 0 ? 1 : SLABS[i - 1].upto + 1;
          const label = s.upto === Infinity ? `${from}+` : `${from}–${s.upto}`;
          const active = i === idx;
          const past = i < idx;
          return (
            <div
              key={i}
              className={`min-w-[92px] flex-1 rounded-lg py-2 text-center font-mono-num text-[11px] font-semibold transition
                ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : past ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}
            >
              {label}
              <div className="text-[10px] font-normal opacity-80">৳{s.rate}</div>
            </div>
          );
        })}
      </div>
      <div
        className={`mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
          hot ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-teal-200 bg-teal-50 text-teal-700'
        }`}
      >
        {hot ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
        <div>
          This month has used <b>{monthCumulative}</b> units
          {remaining !== null ? (
            <>
              {' '}
              — {hot ? 'only ' : ''}
              <b>{remaining}</b> unit{remaining === 1 ? '' : 's'} {hot ? 'left' : 'of headroom'} before crossing into
              the ৳{nextRate}/unit slab.
            </>
          ) : (
            '.'
          )}
        </div>
      </div>
    </div>
  );
}
