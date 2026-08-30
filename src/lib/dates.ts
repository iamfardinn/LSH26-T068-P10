/**
 * dates.ts
 * -----------------------------------------------------------------------
 * PORTED FROM: js/dates.js. Logic unchanged from the pre-migration build
 * — everything still works in UTC on purpose, for the same reason as
 * before: mixing local-timezone Date math with plain "YYYY-MM-DD"
 * strings is a classic source of off-by-one-day bugs.
 * -----------------------------------------------------------------------
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDateString(d: string): void {
  if (typeof d !== 'string' || !DATE_RE.test(d)) {
    throw new TypeError('Expected a YYYY-MM-DD date string, got: ' + JSON.stringify(d));
  }
}

/** "2026-06-30" -> "2026-06" */
export function monthKey(dateStr: string): string {
  assertDateString(dateStr);
  return dateStr.slice(0, 7);
}

/** Add (or subtract, with a negative n) whole days to a date string. */
export function addDays(dateStr: string, n: number): string {
  assertDateString(dateStr);
  if (!Number.isInteger(n)) throw new TypeError('n must be an integer number of days');
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** True calendar-day difference between two date strings (b - a). */
export function daysBetween(a: string, b: string): number {
  assertDateString(a);
  assertDateString(b);
  const msPerDay = 86400000;
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / msPerDay);
}

/** Human-readable "30 Jun 2026" for display only (never used for calculation). */
export function humanDate(dateStr: string): string {
  assertDateString(dateStr);
  const dt = new Date(dateStr + 'T00:00:00Z');
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function humanMonth(monthStr: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) throw new TypeError('Expected YYYY-MM, got: ' + monthStr);
  const dt = new Date(monthStr + '-01T00:00:00Z');
  return dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Number of calendar days in a "YYYY-MM" month. */
export function daysInMonth(monthStr: string): number {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) throw new TypeError('Expected YYYY-MM, got: ' + monthStr);
  const [y, m] = monthStr.split('-').map(Number);
  // Day 0 of the *next* month is the last day of this one.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Every "YYYY-MM-DD" date in a given "YYYY-MM" month, in order. */
export function allDatesInMonth(monthStr: string): string[] {
  const n = daysInMonth(monthStr);
  const dates: string[] = [];
  for (let d = 1; d <= n; d++) {
    dates.push(`${monthStr}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

export { assertDateString };
