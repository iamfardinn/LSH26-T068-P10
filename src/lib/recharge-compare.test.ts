import { describe, it, expect } from 'vitest';
import { parsePastedHistory, buildActualComparison, rebuildLedger } from './engine';

describe('parsePastedHistory', () => {
  it('parses a well-formed line with both recharge and actual balance', () => {
    const r = parsePastedHistory('2026-01-09, 300, 812');
    expect(r.errors).toHaveLength(0);
    expect(r.recharges).toEqual([{ date: '2026-01-09', amount: 300 }]);
    expect(r.actualBalances).toEqual([{ date: '2026-01-09', balance: 812 }]);
  });

  it('allows a blank recharge or blank actual-balance field', () => {
    const r = parsePastedHistory('2026-01-09, 300,\n2026-01-10, , 500');
    expect(r.errors).toHaveLength(0);
    expect(r.recharges).toEqual([{ date: '2026-01-09', amount: 300 }]);
    expect(r.actualBalances).toEqual([{ date: '2026-01-10', balance: 500 }]);
  });

  it('skips blank lines and comment lines', () => {
    const r = parsePastedHistory('\n# my recharges\n2026-01-09, 300,\n\n');
    expect(r.errors).toHaveLength(0);
    expect(r.recharges).toHaveLength(1);
  });

  it('treats a non-date first line as an optional header, not an error', () => {
    const r = parsePastedHistory('date, recharge, actual\n2026-01-09, 300, 812');
    expect(r.errors).toHaveLength(0);
    expect(r.recharges).toHaveLength(1);
  });

  it('reports a malformed date with a clear, line-numbered error', () => {
    const r = parsePastedHistory('2026-01-09, 300\nnot-a-date, 300');
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toMatch(/Line 2/);
  });

  it('reports a line with neither amount nor balance as an error', () => {
    const r = parsePastedHistory('2026-01-09,,');
    expect(r.errors.length).toBe(1);
  });

  it('reports a non-numeric amount without crashing the whole parse', () => {
    const r = parsePastedHistory('2026-01-09, abc\n2026-01-10, 300');
    expect(r.errors.length).toBe(1);
    expect(r.recharges).toEqual([{ date: '2026-01-10', amount: 300 }]);
  });

  it('rejects a negative recharge amount', () => {
    const r = parsePastedHistory('2026-01-09, -50');
    expect(r.errors.length).toBe(1);
  });
});

describe('buildActualComparison', () => {
  it('matches an actual balance to our ledger on the same date and computes the diff', () => {
    const ledger = rebuildLedger([{ date: '2026-01-09', units: 5 }], 1000, []);
    const rows = buildActualComparison(ledger, [{ date: '2026-01-09', balance: 950 }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ourBalance).toBeCloseTo(ledger[0].balanceAfter, 6);
    expect(rows[0].diff).toBeCloseTo(ledger[0].balanceAfter - 950, 6);
  });

  it('reports a date outside the ledger range as NaN rather than silently dropping it', () => {
    const ledger = rebuildLedger([{ date: '2026-01-09', units: 5 }], 1000, []);
    const rows = buildActualComparison(ledger, [{ date: '2099-01-01', balance: 500 }]);
    expect(rows).toHaveLength(1);
    expect(Number.isNaN(rows[0].ourBalance)).toBe(true);
  });

  it('sorts output by date regardless of input order', () => {
    const ledger = rebuildLedger(
      [
        { date: '2026-01-09', units: 5 },
        { date: '2026-01-10', units: 5 },
      ],
      1000,
      []
    );
    const rows = buildActualComparison(ledger, [
      { date: '2026-01-10', balance: 1 },
      { date: '2026-01-09', balance: 2 },
    ]);
    expect(rows.map((r) => r.date)).toEqual(['2026-01-09', '2026-01-10']);
  });
});
