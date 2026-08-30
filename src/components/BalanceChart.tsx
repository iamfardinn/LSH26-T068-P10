import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import type { LedgerRow } from '../lib/engine';
import { fmt } from '../lib/format';
import { humanDate, monthKey } from '../lib/dates';

const HEAVY_MONTHS = ['2026-05', '2026-06'];
const LIGHT_MONTHS = ['2026-01', '2026-02'];

interface ChartRow extends LedgerRow {
  rechargeMarker: number | null;
}

function monthBounds(ledger: LedgerRow[], months: string[]): { x1: string; x2: string }[] {
  const bounds: { x1: string; x2: string }[] = [];
  for (const m of months) {
    const rows = ledger.filter((r) => monthKey(r.date) === m);
    if (rows.length) bounds.push({ x1: rows[0].date, x2: rows[rows.length - 1].date });
  }
  return bounds;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row: ChartRow = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{humanDate(row.date)}</div>
      <div className="mt-1 text-slate-500">
        Balance <span className="font-mono-num font-semibold text-slate-900">{fmt(row.balanceAfter)}</span>
      </div>
      <div className="text-slate-500">Used {row.units} units</div>
      {row.rechargeAmt > 0 && (
        <div className="mt-1 text-emerald-600">
          Recharged {fmt(row.rechargeAmt)}
          {row.fixedApplied > 0 && ` (+ ${fmt(row.fixedApplied)} demand/rent)`}
        </div>
      )}
    </div>
  );
}

export function BalanceChart({ ledger }: { ledger: LedgerRow[] }) {
  const data: ChartRow[] = ledger.map((r) => ({
    ...r,
    rechargeMarker: r.rechargeAmt > 0 ? r.balanceAfter : null,
  }));

  const heavy = monthBounds(ledger, HEAVY_MONTHS);
  const light = monthBounds(ledger, LIGHT_MONTHS);

  const tickIndices = new Set<number>();
  const step = Math.max(1, Math.floor(data.length / 7));
  for (let i = 0; i < data.length; i += step) tickIndices.add(i);
  tickIndices.add(data.length - 1);

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          {light.map((b, i) => (
            <ReferenceArea key={'l' + i} x1={b.x1} x2={b.x2} fill="#14b8a6" fillOpacity={0.05} strokeOpacity={0} />
          ))}
          {heavy.map((b, i) => (
            <ReferenceArea key={'h' + i} x1={b.x1} x2={b.x2} fill="#f43f5e" fillOpacity={0.055} strokeOpacity={0} />
          ))}
          <XAxis
            dataKey="date"
            ticks={data.filter((_, i) => tickIndices.has(i)).map((d) => d.date)}
            tickFormatter={(d: string) => humanDate(d)}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => '৳' + v.toLocaleString()}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="balanceAfter"
            stroke="#4f46e5"
            strokeWidth={2}
            fill="url(#balanceFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Scatter dataKey="rechargeMarker" fill="#10b981" shape="triangle" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
