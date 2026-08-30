/**
 * engine.ts
 * -----------------------------------------------------------------------
 * PORTED FROM: js/engine.js. All the actual problem logic (items 2, 3
 * and 4) lives here as pure functions: given data in, they return data
 * out. No DOM, no React, no charting library — that separation is what
 * makes this testable headlessly (see src/lib/*.test.ts) independent of
 * whatever UI framework sits on top of it.
 *
 * This is a like-for-like port of the pre-migration vanilla-JS engine,
 * including the one real bug fix made after the tough-judge review of
 * the original build: forecastTopUp's "already recharged this month"
 * check now uses `<=` instead of `<`, so a recharge landing exactly on
 * "today" is correctly counted (see the dedicated regression test).
 * -----------------------------------------------------------------------
 */

import { energyForUnits, vatOn, FIXED_CHARGES, SLABS } from './tariff';
import { monthKey, addDays, allDatesInMonth } from './dates';
import type { Household, Recharge } from './data';

export interface Day {
  date: string;
  units: number;
}

export interface LedgerRow {
  date: string;
  units: number;
  monthCumulative: number;
  energy: number;
  vat: number;
  rechargeAmt: number;
  fixedApplied: number;
  balanceAfter: number;
}

/** Build {date -> summed amount} from a list of {date, amount}, so two
 *  recharges on the same real-world day are never silently dropped. */
export function sumRechargesByDate(recharges: Recharge[]): Record<string, number> {
  const map: Record<string, number> = Object.create(null);
  for (const r of recharges) {
    map[r.date] = (map[r.date] || 0) + r.amount;
  }
  return map;
}

/** Turn a start date + array of daily units into [{date, units}, ...]. */
export function buildDayList(startDate: string, dailyUnits: number[]): Day[] {
  return dailyUnits.map((units, i) => ({ date: addDays(startDate, i), units }));
}

/**
 * ITEM 2 — rebuild the meter balance day by day.
 *
 * Rules applied exactly as specified:
 *  - the slab counter resets to 0 on the 1st of each calendar month,
 *    and a recharge never resets it (recharge day and slab-reset day
 *    are tracked completely independently here on purpose)
 *  - each day's units are billed against the slab(s) the month's
 *    running total has already reached, splitting across a slab
 *    boundary if one day's usage crosses it
 *  - demand charge + meter rent are deducted once, at the moment of
 *    the FIRST recharge in a calendar month (not every recharge, and
 *    not automatically on the 1st if no recharge happens)
 *  - VAT is 5% of the energy amount only, added every day
 */
export function rebuildLedger(days: Day[], openingBalance: number, recharges: Recharge[]): LedgerRow[] {
  const rechargeByDate = sumRechargesByDate(recharges);
  let balance = openingBalance;
  let monthCumulative = 0;
  let currentMonth: string | null = null;
  const firstRechargeDoneForMonth: Record<string, boolean> = Object.create(null);
  const ledger: LedgerRow[] = [];

  for (const { date, units } of days) {
    const month = monthKey(date);
    if (month !== currentMonth) {
      monthCumulative = 0; // slab counter resets on the 1st, independent of recharges
      currentMonth = month;
    }

    const rechargeAmt = rechargeByDate[date] || 0;
    let fixedApplied = 0;
    if (rechargeAmt > 0) {
      balance += rechargeAmt;
      if (!firstRechargeDoneForMonth[month]) {
        fixedApplied = FIXED_CHARGES;
        balance -= fixedApplied;
        firstRechargeDoneForMonth[month] = true;
      }
    }

    const energy = energyForUnits(monthCumulative, units);
    const vat = vatOn(energy);
    balance -= energy + vat;
    monthCumulative += units;

    ledger.push({ date, units, monthCumulative, energy, vat, rechargeAmt, fixedApplied, balanceAfter: balance });
  }
  return ledger;
}

export interface RunOutResult {
  date: string;
  daysFromToday: number;
}

/**
 * ITEM 3a — "on which date does the balance run out?"
 * Simulates forward from the day after `fromDate` at a constant daily
 * usage, with no further recharges. Returns null if it never runs out
 * within a 10-year simulation window (e.g. dailyUnits <= 0).
 */
export function forecastRunOut(
  fromDate: string,
  startBalance: number,
  startMonthCumulative: number,
  dailyUnits: number
): RunOutResult | null {
  if (!Number.isFinite(dailyUnits) || dailyUnits <= 0) return null;
  if (startBalance <= 0) return { date: fromDate, daysFromToday: 0 };

  let balance = startBalance;
  let monthCumulative = startMonthCumulative;
  let currentMonth = monthKey(fromDate);
  let date = fromDate;
  const MAX_DAYS = 3650;

  for (let i = 0; i < MAX_DAYS; i++) {
    date = addDays(date, 1);
    const month = monthKey(date);
    if (month !== currentMonth) {
      monthCumulative = 0;
      currentMonth = month;
    }
    const energy = energyForUnits(monthCumulative, dailyUnits);
    const vat = vatOn(energy);
    balance -= energy + vat;
    monthCumulative += dailyUnits;
    if (balance <= 0) return { date, daysFromToday: i + 1 };
  }
  return null;
}

export interface TopUpResult {
  invalid: boolean;
  reason?: string;
  baseEnergy?: number;
  slabPremium?: number;
  vat?: number;
  fixed?: number;
  total?: number;
  rechargeIsFirstOfMonth?: boolean;
  totalUnits?: number;
}

/**
 * ITEM 3b — "how much must be recharged today to last until targetDate?"
 * Walks day by day from the day after `today` through `targetDate`
 * (inclusive), summing the true slab-weighted energy cost, then
 * decomposes it into base energy / higher-slab premium / fixed / VAT.
 */
export function forecastTopUp(household: Household, ledger: LedgerRow[], targetDate: string): TopUpResult {
  const today = household.today;
  if (!(targetDate > today)) {
    return { invalid: true, reason: 'Target date must be after today (' + today + ').' };
  }
  const todayRow = ledger[ledger.length - 1];
  const todayMonth = monthKey(today);
  // <= (not <): a recharge that already happened ON today itself still
  // means a NEW hypothetical top-up today would not be the month's first.
  const alreadyRechargedThisMonth = household.recharges.some(
    (r) => monthKey(r.date) === todayMonth && r.date <= today
  );
  const rechargeIsFirstOfMonth = !alreadyRechargedThisMonth;

  let date = today;
  let monthCumulative = todayRow.monthCumulative;
  let currentMonth = todayMonth;
  let totalUnits = 0;
  let actualEnergy = 0;

  while (date < targetDate) {
    date = addDays(date, 1);
    const month = monthKey(date);
    if (month !== currentMonth) {
      monthCumulative = 0;
      currentMonth = month;
    }
    const units = household.usualDailyUnits;
    actualEnergy += energyForUnits(monthCumulative, units);
    monthCumulative += units;
    totalUnits += units;
  }

  const baseEnergy = totalUnits * SLABS[0].rate;
  const slabPremium = actualEnergy - baseEnergy;
  const vat = vatOn(actualEnergy);
  const fixed = rechargeIsFirstOfMonth ? FIXED_CHARGES : 0;
  const total = actualEnergy + vat + fixed;

  return { invalid: false, baseEnergy, slabPremium, vat, fixed, total, rechargeIsFirstOfMonth, totalUnits };
}

export interface HabitParams {
  openingBalance: number;
  threshold: number;
  lowAmount: number;
  monthlyAmount: number;
}

export interface HabitLedgerRow {
  date: string;
  units: number;
  balanceAfter: number;
  recharge: number;
  fixedApplied: number;
}

export interface HabitResult {
  ledger: HabitLedgerRow[];
  totalCost: number;
  totalEnergyVat: number;
  fixedChargeMonths: number;
  rechargeCount: number;
  rechargeTotal: number;
}

/**
 * ITEM 4 — simulate one recharge habit over a fixed set of months on a
 * fixed daily-consumption sequence, and report the *cost* as defined by
 * the problem: energy + VAT + whatever fixed charges were actually
 * triggered. Never the amount deposited (R-33).
 */
export function simulateHabit(days: Day[], type: 'low' | 'monthly', params: HabitParams): HabitResult {
  let balance = params.openingBalance;
  let monthCumulative = 0;
  let currentMonth: string | null = null;
  const firstRechargeDoneForMonth: Record<string, boolean> = Object.create(null);
  let totalEnergyVat = 0;
  let fixedChargeMonths = 0;
  let rechargeCount = 0;
  let rechargeTotal = 0;
  const ledger: HabitLedgerRow[] = [];

  for (const { date, units } of days) {
    const month = monthKey(date);
    if (month !== currentMonth) {
      monthCumulative = 0;
      currentMonth = month;
    }

    let recharge = 0;
    if (type === 'monthly') {
      if (date.slice(8, 10) === '01') recharge = params.monthlyAmount;
    } else {
      if (balance < params.threshold) recharge = params.lowAmount;
    }

    let fixedApplied = 0;
    if (recharge > 0) {
      balance += recharge;
      rechargeCount += 1;
      rechargeTotal += recharge;
      if (!firstRechargeDoneForMonth[month]) {
        fixedApplied = FIXED_CHARGES;
        balance -= fixedApplied;
        firstRechargeDoneForMonth[month] = true;
        fixedChargeMonths += 1;
      }
    }

    const energy = energyForUnits(monthCumulative, units);
    const vat = vatOn(energy);
    balance -= energy + vat;
    monthCumulative += units;
    totalEnergyVat += energy + vat;

    ledger.push({ date, units, balanceAfter: balance, recharge, fixedApplied });
  }

  const totalCost = totalEnergyVat + fixedChargeMonths * FIXED_CHARGES;
  return { ledger, totalCost, totalEnergyVat, fixedChargeMonths, rechargeCount, rechargeTotal };
}

export interface ComparisonResult {
  low: HabitResult;
  monthly: HabitResult;
  months: string[];
  commonDays: Day[];
}

/**
 * Runs item 4 end-to-end for a household: filters its own daily
 * readings down to `comparison.months` and simulates both habits on
 * that identical slice. Throws early (loud, not silent) if any of the
 * requested comparison months has zero matching days.
 *
 * A case's `comparison.source` may be `'readings'` (default: reuse the
 * household's own recorded daily units for those months) or something
 * else paired with a numeric `comparison.dailyUnits` (use that constant
 * units/day for every day of those months instead — for a case that
 * specifies a synthetic comparison period rather than reusing history).
 */
export function runComparison(household: Household): ComparisonResult {
  const { months, openingBalance, lowThreshold, lowAmount, monthlyAmount, source, dailyUnits } = household.comparison;

  let commonDays: Day[];
  if ((source === undefined || source === 'readings') || dailyUnits == null) {
    const allDays = buildDayList(household.daysStart, household.dailyUnits);
    commonDays = allDays.filter((d) => months.includes(monthKey(d.date)));
    for (const m of months) {
      if (!commonDays.some((d) => monthKey(d.date) === m)) {
        throw new Error('runComparison: no readings found for comparison month ' + m);
      }
    }
  } else {
    // Synthetic mode: build every calendar day of each comparison month
    // at a constant daily_units, rather than slicing real readings.
    commonDays = months.flatMap((m) => allDatesInMonth(m).map((date) => ({ date, units: dailyUnits })));
  }

  const low = simulateHabit(commonDays, 'low', {
    openingBalance,
    threshold: lowThreshold,
    lowAmount,
    monthlyAmount,
  });
  const monthly = simulateHabit(commonDays, 'monthly', {
    openingBalance,
    threshold: lowThreshold,
    lowAmount,
    monthlyAmount,
  });
  return { low, monthly, months, commonDays };
}

/* =========================================================================
 * BONUS — "let the user paste their real recharge history and compare the
 * rebuilt balance against what the meter actually showed."
 *
 * Input format, one entry per line, comma-separated:
 *   date, recharge_amount (optional), actual_balance (optional)
 * Either optional field may be left blank, but at least one of the two
 * must be present on a line for it to mean anything. Blank lines and a
 * single optional header line (first line, if it doesn't start with a
 * date) are ignored. Lines that fail to parse are collected as errors
 * and reported back to the caller instead of being silently dropped or
 * crashing the whole paste.
 * ========================================================================= */

export interface PastedRecharge {
  date: string;
  amount: number;
}
export interface ActualBalancePoint {
  date: string;
  balance: number;
}
export interface ParsedHistory {
  recharges: PastedRecharge[];
  actualBalances: ActualBalancePoint[];
  errors: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePastedHistory(text: string): ParsedHistory {
  const recharges: PastedRecharge[] = [];
  const actualBalances: ActualBalancePoint[] = [];
  const errors: string[] = [];

  const rawLines = text.split(/\r?\n/);
  rawLines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (line === '') return; // blank lines are fine, skip silently
    if (line.startsWith('#')) return; // allow a comment line

    const parts = line.split(',').map((p) => p.trim());
    const [date, amountStr, balanceStr] = parts;

    if (i === 0 && !DATE_RE.test(date)) {
      return; // treat a non-date first line as an optional header row
    }
    if (!DATE_RE.test(date)) {
      errors.push(`Line ${i + 1}: "${rawLine}" — expected a date like 2026-05-17, got "${date}".`);
      return;
    }
    const hasAmount = amountStr !== undefined && amountStr !== '';
    const hasBalance = balanceStr !== undefined && balanceStr !== '';
    if (!hasAmount && !hasBalance) {
      errors.push(`Line ${i + 1}: "${rawLine}" — needs a recharge amount, an actual balance, or both.`);
      return;
    }
    if (hasAmount) {
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount < 0) {
        errors.push(`Line ${i + 1}: "${rawLine}" — recharge amount "${amountStr}" is not a valid positive number.`);
      } else {
        recharges.push({ date, amount });
      }
    }
    if (hasBalance) {
      const balance = Number(balanceStr);
      if (!Number.isFinite(balance)) {
        errors.push(`Line ${i + 1}: "${rawLine}" — actual balance "${balanceStr}" is not a valid number.`);
      } else {
        actualBalances.push({ date, balance });
      }
    }
  });

  return { recharges, actualBalances, errors };
}

export interface BalanceDiffRow {
  date: string;
  ourBalance: number;
  actualBalance: number;
  diff: number;
}

/**
 * Matches each pasted "actual balance" checkpoint against our own
 * rebuilt ledger for the same date and reports the difference. A date
 * the pasted history mentions that isn't in the ledger's range is
 * reported as its own row with `ourBalance: NaN` rather than silently
 * skipped, so a typo'd date is visible instead of just missing.
 */
export function buildActualComparison(ledger: LedgerRow[], actualBalances: ActualBalancePoint[]): BalanceDiffRow[] {
  const byDate = new Map(ledger.map((r) => [r.date, r.balanceAfter]));
  return actualBalances
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, balance }) => {
      const ourBalance = byDate.has(date) ? byDate.get(date)! : NaN;
      return { date, ourBalance, actualBalance: balance, diff: ourBalance - balance };
    });
}
