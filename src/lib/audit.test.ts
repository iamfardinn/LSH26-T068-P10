/**
 * audit.test.ts — Comprehensive P10 QA audit test suite.
 */
import { describe, it, expect } from 'vitest';
import { energyForUnits, vatOn, FIXED_CHARGES, SLABS, VAT_RATE, DEMAND_CHARGE, METER_RENT } from './tariff';
import {
  rebuildLedger,
  forecastRunOut,
  forecastTopUp,
  simulateHabit,
  runComparison,
  buildDayList,
} from './engine';
import { household } from './data';
import { monthKey, addDays } from './dates';
import type { Household } from './data';

// § 1 TARIFF BOUNDARY TESTS

describe('AUDIT: tariff boundaries', () => {
  it('75 units from 0 = 75 * 4.63 = 347.25', () => {
    expect(energyForUnits(0, 75)).toBeCloseTo(347.25, 2);
  });
  it('76 units from 0 = 75*4.63 + 1*5.26 = 352.51', () => {
    expect(energyForUnits(0, 76)).toBeCloseTo(75 * 4.63 + 1 * 5.26, 2);
  });
  it('200 units from 0 = 75*4.63 + 125*5.26', () => {
    expect(energyForUnits(0, 200)).toBeCloseTo(75 * 4.63 + 125 * 5.26, 2);
  });
  it('201 units from 0', () => {
    expect(energyForUnits(0, 201)).toBeCloseTo(75 * 4.63 + 125 * 5.26 + 1 * 5.63, 2);
  });
  it('300 units from 0', () => {
    expect(energyForUnits(0, 300)).toBeCloseTo(75 * 4.63 + 125 * 5.26 + 100 * 5.63, 2);
  });
  it('301 units from 0', () => {
    expect(energyForUnits(0, 301)).toBeCloseTo(75 * 4.63 + 125 * 5.26 + 100 * 5.63 + 1 * 5.83, 2);
  });
  it('400 units from 0', () => {
    expect(energyForUnits(0, 400)).toBeCloseTo(75 * 4.63 + 125 * 5.26 + 100 * 5.63 + 100 * 5.83, 2);
  });
  it('401 units from 0', () => {
    expect(energyForUnits(0, 401)).toBeCloseTo(75 * 4.63 + 125 * 5.26 + 100 * 5.63 + 100 * 5.83 + 1 * 9.30, 2);
  });
  it('600 units from 0', () => {
    expect(energyForUnits(0, 600)).toBeCloseTo(75 * 4.63 + 125 * 5.26 + 100 * 5.63 + 100 * 5.83 + 200 * 9.30, 2);
  });
  it('601 units from 0', () => {
    const expected = 75 * 4.63 + 125 * 5.26 + 100 * 5.63 + 100 * 5.83 + 200 * 9.30 + 1 * 10.70;
    expect(energyForUnits(0, 601)).toBeCloseTo(expected, 2);
  });

  // Marginal rate tests
  it('1 unit from 74 = 4.63', () => expect(energyForUnits(74, 1)).toBeCloseTo(4.63, 2));
  it('1 unit from 75 = 5.26', () => expect(energyForUnits(75, 1)).toBeCloseTo(5.26, 2));
  it('1 unit from 199 = 5.26', () => expect(energyForUnits(199, 1)).toBeCloseTo(5.26, 2));
  it('1 unit from 200 = 5.63', () => expect(energyForUnits(200, 1)).toBeCloseTo(5.63, 2));
  it('1 unit from 299 = 5.63', () => expect(energyForUnits(299, 1)).toBeCloseTo(5.63, 2));
  it('1 unit from 300 = 5.83', () => expect(energyForUnits(300, 1)).toBeCloseTo(5.83, 2));
  it('1 unit from 399 = 5.83', () => expect(energyForUnits(399, 1)).toBeCloseTo(5.83, 2));
  it('1 unit from 400 = 9.30', () => expect(energyForUnits(400, 1)).toBeCloseTo(9.30, 2));
  it('1 unit from 599 = 9.30', () => expect(energyForUnits(599, 1)).toBeCloseTo(9.30, 2));
  it('1 unit from 600 = 10.70', () => expect(energyForUnits(600, 1)).toBeCloseTo(10.70, 2));
  it('0 units = 0', () => expect(energyForUnits(0, 0)).toBe(0));
  it('0 units from 550 = 0', () => expect(energyForUnits(550, 0)).toBe(0));
});

// § 2 MONTHLY RESET TESTS

describe('AUDIT: monthly slab reset', () => {
  it('month ending at 200 units -> next month starts at slab 1', () => {
    const days = [
      { date: '2026-03-01', units: 200 },
      ...Array.from({ length: 30 }, (_, i) => ({
        date: addDays('2026-03-02', i),
        units: 0,
      })),
      { date: '2026-04-01', units: 10 },
    ];
    const ledger = rebuildLedger(days, 50000, []);
    const apr1 = ledger.find((r) => r.date === '2026-04-01')!;
    expect(apr1.monthCumulative).toBe(10);
    expect(apr1.energy).toBeCloseTo(10 * 4.63, 6);
  });

  it('month ending at 600+ units -> next month starts at slab 1', () => {
    const days = [
      { date: '2026-05-01', units: 700 },
      ...Array.from({ length: 30 }, (_, i) => ({
        date: addDays('2026-05-02', i),
        units: 0,
      })),
      { date: '2026-06-01', units: 3 },
    ];
    const ledger = rebuildLedger(days, 100000, []);
    const jun1 = ledger.find((r) => r.date === '2026-06-01')!;
    expect(jun1.monthCumulative).toBe(3);
    expect(jun1.energy).toBeCloseTo(3 * 4.63, 6);
  });
});

// § 3 RECHARGE DOES NOT RESET SLAB COUNTER

describe('AUDIT: recharge does NOT reset slab', () => {
  it('80 units consumed, recharge, 10 more -> still slab 2', () => {
    const days = [
      { date: '2026-01-01', units: 80 },
      { date: '2026-01-02', units: 10 },
    ];
    const recharges = [{ date: '2026-01-02', amount: 5000 }];
    const ledger = rebuildLedger(days, 10000, recharges);
    expect(ledger[1].energy).toBeCloseTo(10 * 5.26, 6);
    expect(ledger[1].monthCumulative).toBe(90);
  });
});

// § 4 FIXED CHARGES

describe('AUDIT: fixed charges', () => {
  it('demand=42, rent=40, total=82', () => {
    expect(DEMAND_CHARGE).toBe(42);
    expect(METER_RENT).toBe(40);
    expect(FIXED_CHARGES).toBe(82);
  });

  it('only first recharge of month gets fixed charge', () => {
    const days = [
      { date: '2026-01-05', units: 5 },
      { date: '2026-01-15', units: 5 },
      { date: '2026-01-25', units: 5 },
    ];
    const recharges = [
      { date: '2026-01-05', amount: 500 },
      { date: '2026-01-15', amount: 500 },
      { date: '2026-01-25', amount: 500 },
    ];
    const ledger = rebuildLedger(days, 0, recharges);
    expect(ledger[0].fixedApplied).toBe(82);
    expect(ledger[1].fixedApplied).toBe(0);
    expect(ledger[2].fixedApplied).toBe(0);
  });

  it('new month = new first recharge', () => {
    const days = [
      { date: '2026-01-15', units: 5 },
      { date: '2026-02-05', units: 5 },
    ];
    const recharges = [
      { date: '2026-01-15', amount: 500 },
      { date: '2026-02-05', amount: 500 },
    ];
    const ledger = rebuildLedger(days, 0, recharges);
    expect(ledger[0].fixedApplied).toBe(82);
    expect(ledger[1].fixedApplied).toBe(82);
  });
});

// § 5 VAT

describe('AUDIT: VAT = 5% of energy only', () => {
  it('VAT_RATE=0.05', () => expect(VAT_RATE).toBe(0.05));
  it('VAT in ledger = 5% of energy, not of fixed', () => {
    const days = [{ date: '2026-01-01', units: 10 }];
    const recharges = [{ date: '2026-01-01', amount: 1000 }];
    const ledger = rebuildLedger(days, 0, recharges);
    expect(ledger[0].vat).toBeCloseTo(ledger[0].energy * 0.05, 8);
  });
});

// § 6 PUB-01 INTEGRATION

describe('AUDIT: PUB-01 integration', () => {
  const days = buildDayList(household.daysStart, household.dailyUnits);
  const ledger = rebuildLedger(days, household.openingBalance, household.recharges);

  it('ledger = 181 rows', () => {
    expect(ledger.length).toBe(181);
  });

  it('Jan total = 128 units', () => {
    const last = ledger.filter(r => r.date.startsWith('2026-01')).pop()!;
    expect(last.monthCumulative).toBe(128);
  });

  it('Feb total = 157 units', () => {
    const last = ledger.filter(r => r.date.startsWith('2026-02')).pop()!;
    expect(last.monthCumulative).toBe(157);
  });

  it('today balance = 2080.97', () => {
    const today = ledger.find(r => r.date === '2026-06-30')!;
    expect(today.balanceAfter).toBeCloseTo(2080.97, 2);
  });

  it('June cumulative = 583', () => {
    const today = ledger.find(r => r.date === '2026-06-30')!;
    expect(today.monthCumulative).toBe(583);
  });

  it('Jan 1: 3 units, energy = 13.89, no fixed', () => {
    expect(ledger[0].energy).toBeCloseTo(3 * 4.63, 2);
    expect(ledger[0].fixedApplied).toBe(0);
    expect(ledger[0].rechargeAmt).toBe(0);
  });

  it('run-out = Jul 20 2026 (20 days)', () => {
    const today = ledger.find(r => r.date === '2026-06-30')!;
    const r = forecastRunOut('2026-06-30', today.balanceAfter, today.monthCumulative, 19);
    expect(r?.date).toBe('2026-07-20');
    expect(r?.daysFromToday).toBe(20);
  });

  it('top-up to Aug 13 = 5436.70, fixed=0', () => {
    const r = forecastTopUp(household, ledger, '2026-08-13');
    expect(r.total).toBeCloseTo(5436.70, 2);
    expect(r.fixed).toBe(0);
    expect(r.baseEnergy).toBeCloseTo(3870.68, 2);
    expect(r.slabPremium).toBeCloseTo(1307.13, 2);
    expect(r.vat).toBeCloseTo(258.89, 2);
  });

  it('breakdown sums to total', () => {
    const r = forecastTopUp(household, ledger, '2026-08-13');
    const sum = r.baseEnergy! + r.slabPremium! + r.vat! + r.fixed!;
    expect(sum).toBeCloseTo(r.total!, 4);
  });

  it('comparison: both habits cost 11815.37', () => {
    const { low, monthly } = runComparison(household);
    expect(low.totalCost).toBeCloseTo(11815.37, 2);
    expect(monthly.totalCost).toBeCloseTo(11815.37, 2);
    expect(low.fixedChargeMonths).toBe(3);
    expect(monthly.fixedChargeMonths).toBe(3);
  });

  it('comparison: energy+VAT identical', () => {
    const { low, monthly } = runComparison(household);
    expect(low.totalEnergyVat).toBeCloseTo(monthly.totalEnergyVat, 4);
  });

  it('comparison: cost diff = fixed charge months diff * 82', () => {
    const { low, monthly } = runComparison(household);
    const diff = Math.abs(low.totalCost - monthly.totalCost);
    const expected = Math.abs(low.fixedChargeMonths - monthly.fixedChargeMonths) * 82;
    expect(diff).toBeCloseTo(expected, 4);
  });
});

// § 7 DATA INTEGRITY — MVP 1

describe('AUDIT: MVP 1 data', () => {
  it('6 calendar months', () => {
    const days = buildDayList(household.daysStart, household.dailyUnits);
    const months = new Set(days.map(d => monthKey(d.date)));
    expect(months.size).toBeGreaterThanOrEqual(6);
  });

  it('18 recharges', () => {
    expect(household.recharges.length).toBe(18);
  });

  it('light month (Jan=128)', () => {
    const days = buildDayList(household.daysStart, household.dailyUnits);
    const jan = days.filter(d => d.date.startsWith('2026-01')).reduce((a, d) => a + d.units, 0);
    expect(jan).toBe(128);
  });

  it('heavy month (May=653)', () => {
    const days = buildDayList(household.daysStart, household.dailyUnits);
    const may = days.filter(d => d.date.startsWith('2026-05')).reduce((a, d) => a + d.units, 0);
    expect(may).toBe(653);
  });

  it('large last-week recharge (May 26, 4300)', () => {
    expect(household.recharges.some(r => r.date === '2026-05-26' && r.amount === 4300)).toBe(true);
  });
});

// § 8 EDGE CASES

describe('AUDIT: edge cases', () => {
  it('zero usage day costs nothing', () => {
    const days = [{ date: '2026-01-01', units: 0 }];
    const ledger = rebuildLedger(days, 500, []);
    expect(ledger[0].energy).toBe(0);
    expect(ledger[0].balanceAfter).toBe(500);
  });

  it('700 units in one day from 0', () => {
    const expected = 75 * 4.63 + 125 * 5.26 + 100 * 5.63 + 100 * 5.83 + 200 * 9.30 + 100 * 10.70;
    expect(energyForUnits(0, 700)).toBeCloseTo(expected, 2);
  });

  it('negative balance is allowed', () => {
    const days = [{ date: '2026-01-01', units: 100 }];
    const ledger = rebuildLedger(days, 0, []);
    expect(ledger[0].balanceAfter).toBeLessThan(0);
  });

  it('target before today is invalid', () => {
    const ledger = [{ date: '2026-06-30', monthCumulative: 100 }] as any;
    const h = { today: '2026-06-30', usualDailyUnits: 19, recharges: [] } as any as Household;
    expect(forecastTopUp(h, ledger, '2026-06-30').invalid).toBe(true);
    expect(forecastTopUp(h, ledger, '2026-01-01').invalid).toBe(true);
  });

  it('depletion with very high usage', () => {
    const r = forecastRunOut('2026-07-01', 100, 0, 50);
    expect(r).not.toBeNull();
    expect(r!.daysFromToday).toBeLessThanOrEqual(2);
  });

  it('depletion with very low usage', () => {
    const r = forecastRunOut('2026-07-01', 10000, 0, 1);
    expect(r).not.toBeNull();
    expect(r!.daysFromToday).toBeGreaterThan(365);
  });
});
