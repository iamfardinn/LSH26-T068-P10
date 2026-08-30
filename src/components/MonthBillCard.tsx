import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import type { LedgerRow } from '../lib/engine';
import { DEMAND_CHARGE, METER_RENT } from '../lib/tariff';
import { humanMonth, monthKey } from '../lib/dates';
import { fmt } from '../lib/format';

export function MonthBillCard({ ledger }: { ledger: LedgerRow[] }) {
  const months = useMemo(() => [...new Set(ledger.map((r) => monthKey(r.date)))], [ledger]);
  const [month, setMonth] = useState(months[Math.max(months.length - 2, 0)]);

  const rows = ledger.filter((r) => monthKey(r.date) === month);
  const energy = rows.reduce((a, r) => a + r.energy, 0);
  const vat = rows.reduce((a, r) => a + r.vat, 0);
  const fixed = rows.reduce((a, r) => a + r.fixedApplied, 0);
  const units = rows.reduce((a, r) => a + r.units, 0);
  const total = energy + vat + fixed;

  const lines: [string, string][] = [
    ['Units used', String(units)],
    ['Energy', fmt(energy)],
    ['Demand charge', fmt(fixed ? DEMAND_CHARGE : 0)],
    ['Meter rent', fmt(fixed ? METER_RENT : 0)],
    ['VAT (5% of energy)', fmt(vat)],
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          <Receipt size={14} /> Choose a month
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2 sm:w-56"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {humanMonth(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <tbody>
            {lines.map(([label, val]) => (
              <tr key={label} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 text-slate-500">{label}</td>
                <td className="font-mono-num px-4 py-2.5 text-right font-semibold text-slate-900">{val}</td>
              </tr>
            ))}
            <tr className="bg-indigo-50">
              <td className="px-4 py-3 font-bold text-indigo-700">Total billed this month</td>
              <td className="font-mono-num px-4 py-3 text-right text-base font-bold text-indigo-700">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
        {fixed === 0 && (
          <p className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            No recharge happened in this month in the historical data, so no demand charge or meter rent was taken.
          </p>
        )}
      </div>
    </div>
  );
}
