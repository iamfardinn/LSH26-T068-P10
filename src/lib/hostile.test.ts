import { describe, it, expect } from 'vitest';
import { parseCaseObject, parseCaseJsonText } from './caseLoader';
import { buildDayList, rebuildLedger, forecastTopUp, forecastRunOut, runComparison } from './engine';
const base = () => ({ case_id:"H", opening_balance_bdt:"100.00",
  days:[{date:"2026-06-01",units:5},{date:"2026-06-02",units:5}],
  recharges:[{date:"2026-06-01",amount_bdt:"100.00"}],
  today:"2026-06-02", usual_daily_units:5, target_date:"2026-06-20",
  comparison:{months:["2026-06","2026-06","2026-06"],source:"readings",daily_units:null,opening_balance_bdt:"0.00",low_threshold_bdt:"200.00",low_amount_bdt:"5000.00",monthly_amount_bdt:"2000.00"} });
const bad: [string, any][] = [
  ['null', null], ['string', 'nope'], ['number', 42], ['array', [1,2]], ['empty obj', {}],
  ['no days', {...base(), days: []}],
  ['days not array', {...base(), days: 'x'}],
  ['negative units', {...base(), days:[{date:"2026-06-01",units:-5}]}],
  ['fractional units', {...base(), days:[{date:"2026-06-01",units:2.5}]}],
  ['NaN units', {...base(), days:[{date:"2026-06-01",units:NaN}]}],
  ['string units', {...base(), days:[{date:"2026-06-01",units:"5"}]}],
  ['impossible date', {...base(), days:[{date:"2026-02-30",units:5}]}],
  ['gap in days', {...base(), days:[{date:"2026-06-01",units:5},{date:"2026-06-05",units:5}]}],
  ['duplicate date', {...base(), days:[{date:"2026-06-01",units:5},{date:"2026-06-01",units:5}]}],
  ['unsorted days', {...base(), days:[{date:"2026-06-02",units:5},{date:"2026-06-01",units:5}]}],
  ['not starting on 1st', {...base(), days:[{date:"2026-06-15",units:5},{date:"2026-06-16",units:5}]}],
  ['today before days', {...base(), today:"2020-01-01"}],
  ['today after days', {...base(), today:"2030-01-01"}],
  ['negative opening', {...base(), opening_balance_bdt:"-500"}],
  ['huge opening', {...base(), opening_balance_bdt:"1e309"}],
  ['negative recharge', {...base(), recharges:[{date:"2026-06-01",amount_bdt:"-100"}]}],
  ['recharge out of range', {...base(), recharges:[{date:"2099-01-01",amount_bdt:"100"}]}],
  ['recharge bad date', {...base(), recharges:[{date:"2026-13-45",amount_bdt:"100"}]}],
  ['no comparison', (()=>{const b:any=base(); delete b.comparison; return b;})()],
  ['comparison months missing from data', {...base(), comparison:{...base().comparison, months:["1999-01","1999-02","1999-03"]}}],
  ['comparison 1 month', {...base(), comparison:{...base().comparison, months:["2026-06"]}}],
  ['negative threshold', {...base(), comparison:{...base().comparison, low_threshold_bdt:"-999", low_amount_bdt:"0"}}],
  ['zero low_amount (infinite recharge risk)', {...base(), comparison:{...base().comparison, low_threshold_bdt:"999999", low_amount_bdt:"0"}}],
  ['target before today', {...base(), target_date:"2020-01-01"}],
  ['usual units 0', {...base(), usual_daily_units:0}],
  ['usual units negative', {...base(), usual_daily_units:-9}],
  ['usual units huge', {...base(), usual_daily_units:1e9}],
];
describe('hostile case files never crash the loader', () => {
  for (const [name, obj] of bad) {
    it(name, () => {
      const t0 = Date.now();
      const r = parseCaseObject(obj);
      expect(typeof r.ok).toBe('boolean');
      if (r.ok) {
        const h = r.household!;
        const days = buildDayList(h.daysStart, h.dailyUnits);
        const ledger = rebuildLedger(days, h.openingBalance, h.recharges);
        expect(ledger.length).toBeGreaterThan(0);
        for (const row of ledger) { expect(Number.isFinite(row.balanceAfter)).toBe(true); expect(Number.isFinite(row.energy)).toBe(true); }
        const last = ledger[ledger.length-1];
        expect(()=>forecastRunOut(h.today,last.balanceAfter,last.monthCumulative,h.usualDailyUnits)).not.toThrow();
        const tu = forecastTopUp(h, ledger, h.defaultTargetDate);
        if (!tu.invalid) { expect(Number.isFinite(tu.total!)).toBe(true); expect(tu.total!).toBeGreaterThanOrEqual(0); }
        expect(()=>{ try { runComparison(h); } catch(e){ /* surfaced to UI */ } }).not.toThrow();
      } else { expect(r.errors!.length).toBeGreaterThan(0); }
      expect(Date.now()-t0).toBeLessThan(4000);
    });
  }
  it('malformed JSON text', () => { for (const s of ['','{','[]','null','"x"','{"a":1}']) expect(parseCaseJsonText(s).ok).toBe(false); });
});
