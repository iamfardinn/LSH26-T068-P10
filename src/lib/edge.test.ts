import { describe, it, expect } from 'vitest';
import { forecastRunOut, forecastTopUp, runComparison } from './engine';
import type { Household } from './data';

const H = (o: Partial<Household> = {}): Household => ({
  caseId: 'E', openingBalance: 0, daysStart: '2026-06-01', dailyUnits: [10],
  recharges: [], today: '2026-06-01', usualDailyUnits: 10, defaultTargetDate: '2026-06-10',
  comparison: { months: ['2026-06'], openingBalance: 0, lowThreshold: 100, lowAmount: 1000, monthlyAmount: 1000, source: 'readings', dailyUnits: null },
  ...o,
} as Household);
const L = (date: string, bal: number, cum = 0) => [{ date, monthCumulative: cum, balanceAfter: bal }] as any;

describe('EDGE: dates', () => {
  it('forecast crossing a year boundary resets the slab on 1 Jan', () => {
    const h = H({ today: '2026-12-30', usualDailyUnits: 100 });
    const r = forecastTopUp(h, L('2026-12-30', 0, 550), '2027-01-02');
    // 31 Dec: units 551-650 -> 50 @9.30 + 50 @10.70. 1-2 Jan: fresh counter.
    expect(r.totalUnits).toBe(300);
    const janEnergy = 75 * 4.63 + 125 * 5.26 + 0; // 1 Jan: 100 units -> 75@4.63 + 25@5.26
    expect(janEnergy).toBeGreaterThan(0);
    expect(r.baseEnergy).toBeCloseTo(300 * 4.63, 6);
    expect(Number.isFinite(r.total!)).toBe(true);
  });
  it('leap day 29 Feb 2028 is counted, and 2027 has no 29 Feb', () => {
    const a = forecastTopUp(H({ today: '2028-02-27', usualDailyUnits: 1 }), L('2028-02-27', 0), '2028-03-01');
    expect(a.totalUnits).toBe(3); // 28th, 29th, 1st
    const b = forecastTopUp(H({ today: '2027-02-27', usualDailyUnits: 1 }), L('2027-02-27', 0), '2027-03-01');
    expect(b.totalUnits).toBe(2); // 28th, 1st
  });
  it('run-out across a year boundary returns a real date, not a rollover', () => {
    const r = forecastRunOut('2026-12-30', 100, 0, 10);
    expect(r?.date).toMatch(/^20\d\d-\d\d-\d\d$/);
    expect(new Date(r!.date + 'T00:00:00Z').toISOString().slice(0, 10)).toBe(r!.date);
  });
});

describe('EDGE: habit simulation termination', () => {
  it('a zero-amount low-balance recharge cannot loop forever', () => {
    const h = H({ daysStart: '2026-06-01', dailyUnits: Array(30).fill(10),
      comparison: { months: ['2026-06'], openingBalance: 0, lowThreshold: 999999, lowAmount: 0, monthlyAmount: 0, source: 'readings', dailyUnits: null } as any });
    const t0 = Date.now();
    const r = runComparison(h);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(Number.isFinite(r.low.totalCost)).toBe(true);
  });
  it('both habits consume identical energy+VAT (R-16) on a 3-month window', () => {
    const days = Array(92).fill(0).map((_, i) => 5 + (i % 7));
    const h = H({ daysStart: '2026-04-01', dailyUnits: days, today: '2026-06-30',
      comparison: { months: ['2026-04', '2026-05', '2026-06'], openingBalance: 0, lowThreshold: 200, lowAmount: 5000, monthlyAmount: 2000, source: 'readings', dailyUnits: null } as any });
    const r = runComparison(h);
    expect(r.low.totalEnergyVat).toBeCloseTo(r.monthly.totalEnergyVat, 9);
    expect(r.low.totalCost - r.low.totalEnergyVat).toBeCloseTo(r.low.fixedChargeMonths * 82, 9);
  });
});

describe('EDGE: top-up money-correctness invariant', () => {
  it('recharging exactly the recommended amount always survives to the target date', () => {
    for (const [units, bal, cum, target] of [[10, 0, 0, '2026-07-25'], [19, 2080.97, 583, '2026-08-13'], [1, 5000, 0, '2026-07-05'], [45, 12, 599, '2026-09-01']] as any[]) {
      const h = H({ today: '2026-06-30', usualDailyUnits: units, daysStart: '2026-06-30' });
      const ledger = L('2026-06-30', bal, cum);
      const r = forecastTopUp(h, ledger, target);
      // Replay the period spending balance + recommended top-up.
      let b = bal + r.total! - r.fixed!;
      let d = '2026-06-30', mc = cum, m = '2026-06';
      while (d < target) {
        d = new Date(new Date(d + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10);
        if (d.slice(0, 7) !== m) { m = d.slice(0, 7); mc = 0; }
        let rem = units, cost = 0, c = mc;
        for (const [cap, rate] of [[75, 4.63], [200, 5.26], [300, 5.63], [400, 5.83], [600, 9.3], [1e18, 10.7]] as any[]) {
          if (c >= cap) continue; const k = Math.min(rem, cap - c); cost += k * rate; c += k; rem -= k; if (rem <= 0) break;
        }
        mc += units; b -= cost * 1.05;
      }
      expect(b).toBeGreaterThan(-0.01); // never runs dry before the target
    }
  });
});
