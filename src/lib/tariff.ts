/**
 * tariff.ts
 * -----------------------------------------------------------------------
 * PORTED FROM: js/tariff.js (the original vanilla-JS implementation).
 * The computation in this file is unchanged from the original — only the
 * module wrapper (window.Meter namespace -> ES module exports) and type
 * annotations were added during the React/TypeScript migration. Every
 * function name, every branch, every number below is identical to the
 * version already verified against 28 tests and a Python cross-check in
 * the pre-migration build.
 *
 * The fixed prepaid electricity tariff for this problem, and nothing
 * else. Per the problem statement's constraints: "Use the tariff and the
 * charges exactly as written in the problem. Real published tariffs
 * change and will not be used for checking."
 * -----------------------------------------------------------------------
 */

export interface Slab {
  upto: number;
  rate: number;
}

// Slabs are defined by their *upper bound* of cumulative monthly units.
// Units 1-75 @ 4.63, 76-200 @ 5.26, 201-300 @ 5.63, 301-400 @ 5.83,
// 401-600 @ 9.30, 601 and above @ 10.70.
export const SLABS: readonly Slab[] = Object.freeze([
  Object.freeze({ upto: 75, rate: 4.63 }),
  Object.freeze({ upto: 200, rate: 5.26 }),
  Object.freeze({ upto: 300, rate: 5.63 }),
  Object.freeze({ upto: 400, rate: 5.83 }),
  Object.freeze({ upto: 600, rate: 9.3 }),
  Object.freeze({ upto: Infinity, rate: 10.7 }),
]);

export const DEMAND_CHARGE = 42;
export const METER_RENT = 40;
export const FIXED_CHARGES = DEMAND_CHARGE + METER_RENT; // taken once, on the first recharge of the month
export const VAT_RATE = 0.05; // on the energy amount only

/**
 * Cost (before VAT) of consuming `units` more electricity in a month
 * that has already used `monthSoFar` units. Splits the units across
 * slab boundaries correctly if a single day's usage crosses one.
 *
 * Edge cases handled (unchanged from js/tariff.js):
 *  - units === 0            -> returns 0, no slab is touched
 *  - monthSoFar already      -> skips fully-consumed slabs
 *    past a slab's ceiling
 *  - units spanning several  -> each portion billed at its own slab
 *    slab boundaries in one     rate (loop keeps splitting until the
 *    day                        full amount is placed)
 *  - negative / non-finite    -> throws, so a caller bug fails loudly
 *    input                       instead of silently billing ৳0
 */
export function energyForUnits(monthSoFar: number, units: number): number {
  if (!Number.isFinite(monthSoFar) || monthSoFar < 0) {
    throw new RangeError('monthSoFar must be a finite number >= 0, got ' + monthSoFar);
  }
  if (!Number.isFinite(units) || units < 0) {
    throw new RangeError('units must be a finite number >= 0, got ' + units);
  }
  let pos = monthSoFar;
  let remaining = units;
  let cost = 0;
  for (const slab of SLABS) {
    if (pos >= slab.upto) continue; // this slab is already fully behind us
    const capacityLeftInSlab = slab.upto - pos; // Infinity for the top slab
    const take = Math.min(remaining, capacityLeftInSlab);
    cost += take * slab.rate;
    pos += take;
    remaining -= take;
    if (remaining <= 0) break;
  }
  return cost;
}

/** Index (0-based) of the slab a given cumulative-units position sits in. */
export function slabIndexAt(cumulativeUnits: number): number {
  for (let i = 0; i < SLABS.length; i++) {
    if (cumulativeUnits <= SLABS[i].upto) return i;
  }
  return SLABS.length - 1;
}

/** VAT (5%) on a pre-VAT energy amount. */
export function vatOn(energyAmount: number): number {
  return energyAmount * VAT_RATE;
}
