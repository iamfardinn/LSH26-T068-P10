/**
 * caseLoader.ts
 * -----------------------------------------------------------------------
 * Satisfies README-FIRST.md: "Your app must be able to take the values
 * in [the fixture files], either by loading the file or by typing them
 * in. Judges will test with cases in the same shape after submission
 * closes, some of them not published here."
 *
 * Converts a raw case object in the official P10 fixture shape (see
 * `format_note` in P10_prepaid_meter_public.json — one entry of the
 * `cases` array) into our internal `Household` type. Every numeric
 * field in the fixture is a *string* ("350.00") and has to be parsed;
 * every structural assumption is validated instead of assumed, so a
 * malformed or partially-hidden judge case fails with a clear message
 * instead of silently producing wrong numbers or a blank page.
 * -----------------------------------------------------------------------
 */

import type { Household, Recharge } from './data';
import { addDays } from './dates';

export interface CaseLoadResult {
  ok: boolean;
  household?: Household;
  errors: string[];
  /** Set when the uploaded/pasted JSON was the whole fixture file (an
   *  object with a `cases` array) rather than one case — the caller
   *  should ask the user which case to load, then call
   *  `parseCaseObject()` again on that one entry. */
  needsSelection?: boolean;
  availableCases?: FixtureCaseSummary[];
}

export interface FixtureCaseSummary {
  caseId: string;
  raw: unknown;
}

function toNumber(value: unknown, field: string, errors: string[]): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    errors.push(`"${field}" must be a number (or numeric string), got: ${JSON.stringify(value)}`);
    return NaN;
  }
  return n;
}

function isDateString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Parses one case object (already JSON.parse'd) into a Household.
 * Never throws — collects every problem it finds into `errors` and
 * returns `{ ok: false }` if any are fatal, so the UI can show all of
 * them at once instead of stopping at the first.
 */
export function parseCaseObject(raw: unknown): CaseLoadResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['The pasted/uploaded content is not a JSON object.'] };
  }
  const c = raw as Record<string, unknown>;

  const caseId = typeof c.case_id === 'string' && c.case_id ? c.case_id : 'CUSTOM';

  const openingBalance = toNumber(c.opening_balance_bdt, 'opening_balance_bdt', errors);

  if (!Array.isArray(c.days) || c.days.length === 0) {
    errors.push('"days" must be a non-empty array of {date, units}.');
  }
  const dailyUnits: number[] = [];
  let daysStart = '';
  if (Array.isArray(c.days)) {
    c.days.forEach((d: unknown, i: number) => {
      if (typeof d !== 'object' || d === null) {
        errors.push(`days[${i}] is not an object.`);
        return;
      }
      const day = d as Record<string, unknown>;
      if (i === 0) {
        if (!isDateString(day.date)) {
          errors.push(`days[0].date must be a YYYY-MM-DD string, got: ${JSON.stringify(day.date)}`);
        } else {
          daysStart = day.date;
        }
      } else if (daysStart) {
        // Every day's own date must actually be consecutive from the
        // first one. Without this check, a gap, a duplicate, or an
        // out-of-order date in the source data is silently ignored —
        // the ledger is built purely by array position — and every
        // date after the gap ends up mismatched against its real
        // calendar date, so a recharge dated for the real day 5 can
        // silently land on what the ledger thinks is day 4 or 6.
        const expected = addDays(daysStart, i);
        if (isDateString(day.date) && day.date !== expected) {
          errors.push(
            `days[${i}].date is "${day.date}" but should be ${expected} — "days" must be consecutive calendar days starting from days[0].date, with no gaps, duplicates, or out-of-order entries.`
          );
        }
      }
      const units = typeof day.units === 'number' ? day.units : NaN;
      if (!Number.isFinite(units) || units < 0) {
        errors.push(`days[${i}].units must be a number >= 0, got: ${JSON.stringify(day.units)}`);
      } else {
        dailyUnits.push(units);
      }
    });
  }

  // Computed here (not just at the end) so the recharges loop below can
  // reject a recharge dated outside the loaded days — otherwise such a
  // recharge is silently never applied anywhere, with no error at all.
  let daysEnd = '';
  if (daysStart && dailyUnits.length > 0) {
    daysEnd = addDays(daysStart, dailyUnits.length - 1);
  }

  const recharges: Recharge[] = [];
  if (c.recharges !== undefined) {
    if (!Array.isArray(c.recharges)) {
      errors.push('"recharges" must be an array of {date, amount_bdt} if present.');
    } else {
      c.recharges.forEach((r: unknown, i: number) => {
        if (typeof r !== 'object' || r === null) {
          errors.push(`recharges[${i}] is not an object.`);
          return;
        }
        const rec = r as Record<string, unknown>;
        if (!isDateString(rec.date)) {
          errors.push(`recharges[${i}].date must be a YYYY-MM-DD string, got: ${JSON.stringify(rec.date)}`);
          return;
        }
        if (daysStart && daysEnd && (rec.date < daysStart || rec.date > daysEnd)) {
          // A recharge dated outside the loaded range can never match a
          // ledger row and would previously just vanish with no error —
          // the balance would be silently short by that exact amount.
          errors.push(
            `recharges[${i}].date (${rec.date}) is outside the loaded "days" range (${daysStart} to ${daysEnd}) — it could never be applied.`
          );
          return;
        }
        const amount = toNumber(rec.amount_bdt, `recharges[${i}].amount_bdt`, errors);
        if (Number.isFinite(amount) && amount < 0) {
          // A negative recharge is not "an error the amount is wrong by
          // sign" in the ledger — rebuildLedger only applies a recharge
          // when it's > 0, so a negative one is currently just silently
          // skipped (no balance change, no fixed charge, no error). That
          // silent no-op is worse than rejecting it up front.
          errors.push(`recharges[${i}].amount_bdt must not be negative, got: ${JSON.stringify(rec.amount_bdt)}`);
        } else if (Number.isFinite(amount)) {
          recharges.push({ date: rec.date, amount });
        }
      });
    }
  }

  if (!isDateString(c.today)) errors.push(`"today" must be a YYYY-MM-DD string, got: ${JSON.stringify(c.today)}`);
  if (typeof c.usual_daily_units !== 'number' || c.usual_daily_units < 0) {
    errors.push(`"usual_daily_units" must be a number >= 0, got: ${JSON.stringify(c.usual_daily_units)}`);
  }
  if (!isDateString(c.target_date)) {
    errors.push(`"target_date" must be a YYYY-MM-DD string, got: ${JSON.stringify(c.target_date)}`);
  }

  let comparison: Household['comparison'] = {
    months: [],
    openingBalance: 0,
    lowThreshold: 0,
    lowAmount: 0,
    monthlyAmount: 0,
  };
  if (typeof c.comparison !== 'object' || c.comparison === null) {
    errors.push('"comparison" must be an object.');
  } else {
    const cmp = c.comparison as Record<string, unknown>;
    const months = Array.isArray(cmp.months) ? cmp.months.filter((m): m is string => typeof m === 'string') : [];
    if (months.length === 0) errors.push('"comparison.months" must be a non-empty array of "YYYY-MM" strings.');
    comparison = {
      months,
      openingBalance: toNumber(cmp.opening_balance_bdt, 'comparison.opening_balance_bdt', errors),
      lowThreshold: toNumber(cmp.low_threshold_bdt, 'comparison.low_threshold_bdt', errors),
      lowAmount: toNumber(cmp.low_amount_bdt, 'comparison.low_amount_bdt', errors),
      monthlyAmount: toNumber(cmp.monthly_amount_bdt, 'comparison.monthly_amount_bdt', errors),
      source: typeof cmp.source === 'string' ? cmp.source : 'readings',
      dailyUnits: typeof cmp.daily_units === 'number' ? cmp.daily_units : null,
    };
  }

  if (errors.length > 0) return { ok: false, errors };

  const household: Household = {
    caseId,
    openingBalance,
    daysStart,
    dailyUnits,
    recharges,
    today: c.today as string,
    usualDailyUnits: c.usual_daily_units as number,
    defaultTargetDate: c.target_date as string,
    comparison,
  };

  // One more cross-field check that only makes sense once everything
  // above has already parsed cleanly: "today" has to actually be one of
  // the loaded days, or every downstream calculation silently breaks.
  if (household.today < daysStart || household.today > daysEnd) {
    return {
      ok: false,
      errors: [`"today" (${household.today}) is not within the loaded "days" range (${daysStart} to ${daysEnd}).`],
    };
  }

  return { ok: true, household, errors: [] };
}

/** Convenience wrapper: parses a raw JSON *string* (e.g. from a file or
 *  textarea). Detects the two shapes a judge might reasonably supply:
 *   - a single case object (the historical/expected shape), or
 *   - the whole published fixture file — `{ ..., cases: [ ...many... ] }`
 *     — in which case this returns `needsSelection: true` with every
 *     case's id instead of guessing which one to load. */
export function parseCaseJsonText(text: string): CaseLoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: ['Could not parse as JSON: ' + (e as Error).message] };
  }

  if (typeof raw === 'object' && raw !== null && Array.isArray((raw as Record<string, unknown>).cases)) {
    const cases = (raw as Record<string, unknown>).cases as unknown[];
    if (cases.length === 0) {
      return { ok: false, errors: ['This fixture file\'s "cases" array is empty — nothing to load.'] };
    }
    const availableCases: FixtureCaseSummary[] = cases.map((c, i) => ({
      caseId:
        typeof c === 'object' && c !== null && typeof (c as Record<string, unknown>).case_id === 'string'
          ? ((c as Record<string, unknown>).case_id as string)
          : `case #${i + 1}`,
      raw: c,
    }));
    return { ok: false, errors: [], needsSelection: true, availableCases };
  }

  return parseCaseObject(raw);
}
