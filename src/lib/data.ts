/**
 * data.ts
 * -----------------------------------------------------------------------
 * PORTED FROM: js/data.js. Every value below (opening balance, daily
 * units, recharge dates/amounts, today, usual daily units, target date,
 * comparison settings) is copied verbatim from the pre-migration build's
 * case PUB-01 — extracted programmatically (not retyped by hand) to
 * guarantee zero transcription drift during the React/TypeScript
 * migration. This is still the only file to touch for a different
 * household.
 * -----------------------------------------------------------------------
 */

export interface Recharge {
  date: string;
  amount: number;
}

export interface Household {
  caseId: string;
  openingBalance: number;
  daysStart: string;
  dailyUnits: number[];
  recharges: Recharge[];
  today: string;
  usualDailyUnits: number;
  defaultTargetDate: string;
  comparison: {
    months: string[];
    openingBalance: number;
    lowThreshold: number;
    lowAmount: number;
    monthlyAmount: number;
    /** 'readings' (default): use the household's own daily readings for
     *  the comparison months. Anything else + a numeric dailyUnits below:
     *  use that constant instead, for a case that specifies a synthetic
     *  comparison-period consumption rather than reusing real readings. */
    source?: string;
    dailyUnits?: number | null;
  };
}

const DAILY_UNITS: number[] = [3,4,5,5,4,5,6,5,3,3,4,4,4,5,2,5,6,4,5,3,4,4,4,3,4,4,3,5,5,4,4,6,5,4,5,5,6,2,5,5,6,6,7,6,5,7,6,7,5,6,5,7,5,6,6,8,5,4,5,9,8,11,10,8,9,7,12,12,7,9,9,8,6,5,8,10,12,7,11,12,9,7,3,8,9,9,11,8,11,10,13,20,16,18,13,17,16,14,19,11,12,14,17,13,16,14,17,12,14,13,18,15,10,14,13,8,9,9,19,10,27,11,13,19,19,18,31,16,26,24,15,28,20,24,22,23,19,19,12,31,23,19,28,25,23,28,19,27,23,27,14,19,21,16,23,18,11,25,29,21,8,29,31,22,18,14,18,19,22,28,12,12,14,18,25,18,18,21,18,21,14];

if (DAILY_UNITS.length !== 181) {
  // 31 (Jan) + 28 (Feb, 2026 is not a leap year) + 31 + 30 + 31 + 30 = 181
  throw new Error('data.ts: DAILY_UNITS length drifted from the expected 181 days (' + DAILY_UNITS.length + ')');
}

export const household: Household = Object.freeze({
  caseId: "PUB-01",
  openingBalance: 310,
  daysStart: "2026-01-01",
  dailyUnits: DAILY_UNITS,
  recharges: [
  {
    "date": "2026-01-09",
    "amount": 300
  },
  {
    "date": "2026-01-19",
    "amount": 300
  },
  {
    "date": "2026-01-30",
    "amount": 300
  },
  {
    "date": "2026-02-07",
    "amount": 400
  },
  {
    "date": "2026-02-18",
    "amount": 300
  },
  {
    "date": "2026-02-25",
    "amount": 400
  },
  {
    "date": "2026-03-06",
    "amount": 400
  },
  {
    "date": "2026-03-12",
    "amount": 400
  },
  {
    "date": "2026-03-19",
    "amount": 700
  },
  {
    "date": "2026-04-01",
    "amount": 900
  },
  {
    "date": "2026-04-11",
    "amount": 900
  },
  {
    "date": "2026-04-21",
    "amount": 800
  },
  {
    "date": "2026-04-30",
    "amount": 600
  },
  {
    "date": "2026-05-05",
    "amount": 1600
  },
  {
    "date": "2026-05-17",
    "amount": 2000
  },
  {
    "date": "2026-05-26",
    "amount": 4300
  },
  {
    "date": "2026-06-25",
    "amount": 900
  },
  {
    "date": "2026-06-29",
    "amount": 1300
  }
],
  today: "2026-06-30",
  usualDailyUnits: 19,
  defaultTargetDate: "2026-08-13",
  comparison: {
  "months": [
    "2026-04",
    "2026-05",
    "2026-06"
  ],
  "openingBalance": 0,
  "lowThreshold": 200,
  "lowAmount": 5000,
  "monthlyAmount": 2000
},
});
