import { describe, it, expect } from 'vitest';
import { parseCaseObject, parseCaseJsonText } from './caseLoader';

function validCase(overrides: Record<string, unknown> = {}) {
  return {
    case_id: 'TEST-01',
    opening_balance_bdt: '350.00',
    days: [
      { date: '2026-01-01', units: 5 },
      { date: '2026-01-02', units: 6 },
    ],
    recharges: [{ date: '2026-01-01', amount_bdt: '500.00' }],
    today: '2026-01-02',
    usual_daily_units: 10,
    target_date: '2026-02-01',
    comparison: {
      months: ['2026-01'],
      source: 'readings',
      daily_units: null,
      opening_balance_bdt: '0.00',
      low_threshold_bdt: '100.00',
      low_amount_bdt: '2000.00',
      monthly_amount_bdt: '2000.00',
    },
    ...overrides,
  };
}

describe('parseCaseObject', () => {
  it('parses a well-formed case matching the official fixture shape', () => {
    const r = parseCaseObject(validCase());
    expect(r.ok).toBe(true);
    expect(r.household?.caseId).toBe('TEST-01');
    expect(r.household?.openingBalance).toBe(350);
    expect(r.household?.dailyUnits).toEqual([5, 6]);
    expect(r.household?.recharges).toEqual([{ date: '2026-01-01', amount: 500 }]);
    expect(r.household?.comparison.lowThreshold).toBe(100);
  });

  it('rejects non-object input instead of throwing', () => {
    const r = parseCaseObject('not an object');
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects a case with no days array', () => {
    const bad = validCase();
    delete (bad as Record<string, unknown>).days;
    const r = parseCaseObject(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('"days"'))).toBe(true);
  });

  it('rejects a non-numeric opening_balance_bdt', () => {
    const r = parseCaseObject(validCase({ opening_balance_bdt: 'not-a-number' }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('opening_balance_bdt'))).toBe(true);
  });

  it('rejects "today" that falls outside the loaded days range', () => {
    const r = parseCaseObject(validCase({ today: '2026-06-30' }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('is not within the loaded'))).toBe(true);
  });

  it('collects multiple errors at once instead of stopping at the first', () => {
    const r = parseCaseObject(
      validCase({ opening_balance_bdt: 'bad', usual_daily_units: 'bad', target_date: 'not-a-date' })
    );
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('accepts a case with no recharges at all', () => {
    const r = parseCaseObject(validCase({ recharges: [] }));
    expect(r.ok).toBe(true);
    expect(r.household?.recharges).toEqual([]);
  });

  it('parses the comparison.source / daily_units synthetic-mode fields through', () => {
    const r = parseCaseObject(
      validCase({ comparison: { ...validCase().comparison, source: 'fixed', daily_units: 12 } })
    );
    expect(r.ok).toBe(true);
    expect(r.household?.comparison.source).toBe('fixed');
    expect(r.household?.comparison.dailyUnits).toBe(12);
  });
});

describe('parseCaseJsonText', () => {
  it('parses a valid JSON string end-to-end', () => {
    const r = parseCaseJsonText(JSON.stringify(validCase()));
    expect(r.ok).toBe(true);
  });

  it('reports invalid JSON without throwing', () => {
    const r = parseCaseJsonText('{not valid json');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Could not parse as JSON/);
  });
});
