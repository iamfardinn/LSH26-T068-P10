import { describe, it, expect } from 'vitest';
import { household } from './data';
import { buildDayList, rebuildLedger, forecastRunOut, forecastTopUp, runComparison } from './engine';

/**
 * These tests run against the REAL shipped household (case PUB-01), not a
 * synthetic fixture. The expected numbers were independently verified
 * three ways before migration: the pre-migration vanilla-JS engine, a
 * from-scratch Python re-implementation, and a real headless-Chromium
 * screenshot of the running app. If this file ever fails, the migration
 * changed a real, user-visible number.
 */
describe('integration: case PUB-01 (the shipped household)', () => {
  const days = buildDayList(household.daysStart, household.dailyUnits);
  const ledger = rebuildLedger(days, household.openingBalance, household.recharges);
  const todayRow = ledger.find((r) => r.date === household.today)!;

  it('today (30 Jun 2026) balance is ৳2,080.97', () => {
    expect(todayRow.balanceAfter).toBeCloseTo(2080.97, 2);
  });

  it("June's running total (monthCumulative) is 583 units", () => {
    expect(todayRow.monthCumulative).toBe(583);
  });

  it('total recharged across all 18 events is ৳16,800', () => {
    const total = household.recharges.reduce((a, r) => a + r.amount, 0);
    expect(total).toBe(16800);
  });

  it('run-out date is 20 Jul 2026 (20 days from today at 19 units/day)', () => {
    const r = forecastRunOut(household.today, todayRow.balanceAfter, todayRow.monthCumulative, household.usualDailyUnits);
    expect(r?.date).toBe('2026-07-20');
    expect(r?.daysFromToday).toBe(20);
  });

  it('top-up to 13 Aug 2026 is ৳5,436.70 with ৳0 fixed charge (already recharged in June)', () => {
    const r = forecastTopUp(household, ledger, '2026-08-13');
    expect(r.total).toBeCloseTo(5436.7, 2);
    expect(r.fixed).toBe(0);
    expect(r.baseEnergy).toBeCloseTo(3870.68, 2);
    expect(r.slabPremium).toBeCloseTo(1307.13, 2);
    expect(r.vat).toBeCloseTo(258.89, 2);
  });

  it('habit comparison: both habits cost ৳11,815.37 over Apr-Jun 2026', () => {
    const { low, monthly } = runComparison(household);
    expect(low.totalCost).toBeCloseTo(11815.37, 2);
    expect(monthly.totalCost).toBeCloseTo(11815.37, 2);
    expect(low.fixedChargeMonths).toBe(3);
    expect(monthly.fixedChargeMonths).toBe(3);
  });
});
