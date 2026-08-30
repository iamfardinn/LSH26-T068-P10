import { useState } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';
import { parsePastedHistory, buildActualComparison, rebuildLedger, buildDayList, type LedgerRow } from '../lib/engine';
import type { Household } from '../lib/data';
import { humanDate } from '../lib/dates';
import { fmt } from '../lib/format';

const TOLERANCE = 1; // taka — a diff within this is treated as "matches"

export function RechargeCompareCard({ household, defaultLedger }: { household: Household; defaultLedger: LedgerRow[] }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<null | {
    errors: string[];
    diffRows: ReturnType<typeof buildActualComparison>;
    usedRecharges: number;
    rebuiltLedger: LedgerRow[] | null;
  }>(null);

  function handleCompare() {
    const parsed = parsePastedHistory(text);
    let rebuiltLedger: LedgerRow[] | null = null;
    let ledgerForDiff = defaultLedger;

    if (parsed.recharges.length > 0) {
      const days = buildDayList(household.daysStart, household.dailyUnits);
      rebuiltLedger = rebuildLedger(days, household.openingBalance, parsed.recharges);
      ledgerForDiff = rebuiltLedger;
    }

    const diffRows = buildActualComparison(ledgerForDiff, parsed.actualBalances);
    setResult({ errors: parsed.errors, diffRows, usedRecharges: parsed.recharges.length, rebuiltLedger });
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-500">
        Paste your real recharge history and/or what the meter actually showed on given dates, one entry per line:{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
          date, recharge_amount, actual_balance
        </code>{' '}
        — either amount can be left blank. If you include recharge amounts, the balance is rebuilt using{' '}
        <i>your</i> recharge history instead of the sample's; any actual-balance entries are then compared against
        that rebuilt balance.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'2026-01-09, 300,\n2026-01-19, 300, 812\n2026-05-26, 4300, 4980'}
        rows={5}
        className="font-mono-num mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-indigo-500 focus:ring-2"
      />
      <button
        type="button"
        onClick={handleCompare}
        disabled={!text.trim()}
        className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ClipboardList size={14} /> Compare
      </button>

      {result && result.errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <div className="font-semibold">Some lines couldn't be read:</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result && result.usedRecharges > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Rebuilt the balance using your {result.usedRecharges} pasted recharge{result.usedRecharges === 1 ? '' : 's'}{' '}
          instead of the sample household's own recharge history.
        </p>
      )}

      {result && result.diffRows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 text-right font-semibold">Our balance</th>
                <th className="px-4 py-2 text-right font-semibold">Actual (meter)</th>
                <th className="px-4 py-2 text-right font-semibold">Difference</th>
              </tr>
            </thead>
            <tbody>
              {result.diffRows.map((row) => {
                const noData = Number.isNaN(row.ourBalance);
                const matches = !noData && Math.abs(row.diff) <= TOLERANCE;
                return (
                  <tr key={row.date} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-700">{humanDate(row.date)}</td>
                    <td className="font-mono-num px-4 py-2.5 text-right text-slate-900">
                      {noData ? '— not in range —' : fmt(row.ourBalance)}
                    </td>
                    <td className="font-mono-num px-4 py-2.5 text-right text-slate-900">{fmt(row.actualBalance)}</td>
                    <td
                      className={`font-mono-num flex items-center justify-end gap-1.5 px-4 py-2.5 text-right font-semibold ${
                        noData ? 'text-slate-400' : matches ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {noData ? null : matches ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {noData ? '—' : fmt(row.diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
