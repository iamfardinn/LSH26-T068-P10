import { describe, it, expect } from 'vitest';
import { energyForUnits, slabIndexAt, vatOn, FIXED_CHARGES } from './tariff';

describe('tariff engine', () => {
  it('slab 1 only: 50 units from a clean month costs 50 * 4.63', () => {
    expect(energyForUnits(0, 50)).toBeCloseTo(50 * 4.63, 9);
  });

  it('exactly on a boundary: units 1-75 all at slab 1, unit 76 at slab 2', () => {
    expect(energyForUnits(0, 75)).toBeCloseTo(75 * 4.63, 9);
    expect(energyForUnits(75, 1)).toBe(1 * 5.26);
  });

  it('a single day can straddle a slab boundary and gets split correctly', () => {
    // month already at 70 units, day uses 10 -> 5 units finish slab 1 (71-75), 5 units start slab 2 (76-80)
    const cost = energyForUnits(70, 10);
    expect(cost).toBeCloseTo(5 * 4.63 + 5 * 5.26, 9);
  });

  it('a day can straddle THREE slab boundaries at once (extreme edge case)', () => {
    // month at 74, day uses 230 units: 1 finishes slab1 (75), 125 fill slab2 (76-200),
    // 100 fill slab3 (201-300), 4 into slab4 (301-304)
    const cost = energyForUnits(74, 230);
    const expected = 1 * 4.63 + 125 * 5.26 + 100 * 5.63 + 4 * 5.83;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('0 units costs 0, regardless of position in the month', () => {
    expect(energyForUnits(0, 0)).toBe(0);
    expect(energyForUnits(550, 0)).toBe(0);
  });

  it('deep into the top (uncapped) slab still prices correctly', () => {
    expect(energyForUnits(700, 50)).toBe(50 * 10.7);
  });

  it('monthSoFar already past every slab boundary still resolves to the top rate', () => {
    expect(energyForUnits(10000, 5)).toBe(5 * 10.7);
  });

  it('negative inputs are rejected loudly, not silently billed as ৳0', () => {
    expect(() => energyForUnits(-1, 5)).toThrow(RangeError);
    expect(() => energyForUnits(5, -1)).toThrow(RangeError);
  });

  it('slabIndexAt finds the right band at every boundary', () => {
    expect(slabIndexAt(1)).toBe(0);
    expect(slabIndexAt(75)).toBe(0);
    expect(slabIndexAt(76)).toBe(1);
    expect(slabIndexAt(200)).toBe(1);
    expect(slabIndexAt(201)).toBe(2);
    expect(slabIndexAt(300)).toBe(2);
    expect(slabIndexAt(301)).toBe(3);
    expect(slabIndexAt(400)).toBe(3);
    expect(slabIndexAt(401)).toBe(4);
    expect(slabIndexAt(600)).toBe(4);
    expect(slabIndexAt(601)).toBe(5);
    expect(slabIndexAt(999999)).toBe(5);
  });

  it('VAT is exactly 5% of the energy amount', () => {
    expect(vatOn(1000)).toBe(50);
    expect(vatOn(0)).toBe(0);
  });

  it('fixed charges are demand (42) + rent (40) = 82', () => {
    expect(FIXED_CHARGES).toBe(82);
  });
});
