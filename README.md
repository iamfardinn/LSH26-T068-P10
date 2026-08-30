# Meter Sense — Prepaid Meter Recharge Advisor

Solution for **LofiStack Hackathon 2026 — P10**

## Project information

- **Team:** `Unified` 
- **Team ID:** `LSH26-T068`
- **Problem:** `P10 — Prepaid Meter Recharge Advisor`
- **Live application:** [https://meter-sense.netlify.app/](https://meter-sense.netlify.app/) 
- **Demo video:** https://cutt.ly/LSH26_T068

## Solution summary

A family in Dhaka runs on a prepaid electricity meter with slab pricing
that resets every calendar month, and they can't see where the money
actually goes. This app rebuilds their meter balance day by day against
the real tariff, tells them exactly when the balance will run out and
how much to recharge today to reach a chosen date, and shows whether
recharging in large amounts when the balance runs low actually costs
more or less than recharging a fixed amount on the 1st of every month.

## Requirements

| Requirement | Status | Where to verify |
|---|---|---|
| R1 — Household with 6+ months of daily readings and recharge history, including a light month, a heavy summer month, and a large last-week-of-month recharge | Complete | Loads automatically on open (sample case `PUB-01`); visible on the "Balance, rebuilt day by day" chart |
| R2 — Day-by-day balance rebuild: correct slab, monthly reset, fixed charges on first recharge only, VAT, balance line with every recharge marked | Complete | "Balance, rebuilt day by day" section and its chart |
| R3 — The two questions: run-out date given today's balance and usual use; recharge amount to reach a chosen date, broken into energy / higher-slab part / fixed charges / VAT | Complete | "The family's two questions" section |
| R4 — Compare "recharge when low" vs "recharge monthly" over the same three months on identical consumption | Complete | "Two recharge habits, same three months, same electricity use" section |
| Bonus — slab-boundary warning | Complete | "Where this month sits on the slab ladder" section |
| Bonus — paste real recharge history and compare against the actual meter | Complete | "Check against your real meter" section (bottom of page) |
| Bonus — one month's bill broken down | Complete | "One month's bill, broken down" section |

## How to test the application

1. Open the live application — the bundled sample household (case
   `PUB-01`) loads automatically; no login or setup is needed.
2. Scroll through the page top to bottom: household stats, the balance
   chart with every recharge marked, the current slab position, the
   run-out date, the recharge calculator (try changing the date), the
   month-by-month bill, and the habit comparison.
3. To test against a different case (in the same published fixture
   shape), use the "Load a different case" panel near the top: either
   choose a `.json` file or paste the case JSON directly, then click
   "Load this case." Every section on the page recalculates against it.
4. **Expected result:** with the bundled sample data, the balance today
   reads ৳2,080.97, the run-out date reads 20 Jul 2026, the top-up to
   13 Aug 2026 reads ৳5,436.70, and both recharge habits cost exactly
   ৳11,815.37 over Apr–Jun 2026 (a legitimate equal result — see
   `CLARIFICATIONS.md` R-16).

### Test or sample data

The published fixture (`P10_prepaid_meter_public.json`, case `PUB-01`)
is bundled directly in `src/lib/data.ts` and loads automatically — no
upload step needed to see the required four items working. To load a
*different* published or hidden case, use the "Load a different case"
panel described above (file upload or paste). To return to the bundled
sample, click "Reset to sample data (PUB-01)" in that same panel, or
simply reload the page — nothing is persisted to a server, so a reload
always returns to the bundled sample.

## Run locally

### Requirements

- Node.js 18 or newer
- No database, no backend — this is a static single-page app

### Setup

```bash
git clone https://github.com/iamfardinn/LSH26-T068-P10.git
cd lsh26-t068-p10
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

To produce a production build (what actually gets deployed):

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serves that build locally to sanity-check it
```

No `.env` file or secrets are required anywhere in this project.

## Problem-solving approach

- **Understanding the problem:** the tariff, the monthly slab reset,
  and the two recharge habits were each turned into a small, pure
  function first (`src/lib/tariff.ts`, `src/lib/engine.ts`), with no UI
  code at all, so the domain rules could be unit-tested in isolation
  before any screen was built. The trickiest rule — "a recharge does
  not reset the slab counter" — is enforced by tracking the slab
  counter and the recharge/fixed-charge state completely independently
  in `rebuildLedger()`, so there's no code path where fixing one could
  silently affect the other.
- **Chosen solution:** a static React/TypeScript single-page app (no
  backend) — the whole problem is a calculation over data the browser
  can hold entirely in memory, so a server adds risk (another thing
  that can fail or be slow to deploy) without adding anything the
  problem needs.
- **Most important technical decision:** the household is application
  *state*, not a hardcoded constant, with a case loader (file upload or
  paste) that accepts any case in the published fixture's JSON shape.
  README-FIRST.md is explicit that judges will test with hidden cases
  in the same shape after submissions close — a solution that only
  ever works on the one bundled example would fail that test even if
  every calculation were correct.
- **How it was tested:** 57 automated tests (`npm run test`) cover the
  tariff's slab-splitting math at every boundary, the monthly-reset and
  fixed-charge rules, both forecasts, the habit comparison (including
  the "may legitimately be equal" case from R-16), and the case
  loader's input validation. Beyond the automated suite, the full
  six-month ledger for the bundled sample was independently
  recalculated in Python (a from-scratch re-implementation, not a copy
  of the TypeScript logic) and the rendered app was checked in a real
  Chromium browser to confirm the displayed numbers actually matched —
  not just that the code compiled and the tests passed.

## Technology used

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS v4, Recharts, lucide-react
- **Backend:** None — static single-page application
- **Database:** None — the sample case is bundled in source; a loaded case lives only in browser memory for that session
- **Deployment:** Any static host (e.g. Vercel, Netlify, GitHub Pages) serving `npm run build`'s `dist/` output 
- **Other material tools:** Vitest (57 tests), oxlint

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
|---|---|---|---|
| `Tonmoy Sarker Sourav` | `tonmoy-y` | `Build Core Logic` | Push files |
| `Tonmoy Shaha` | `tonmoy6052` | `Testing` | Find Edge Cases |



Commit count alone does not represent contribution.

## AI usage

Claude (Anthropic) was used to write the domain logic (`src/lib/`), the
React UI (`src/components/`), the test suites, and the case-loading /
paste-history features. Every headline calculation was independently
verified three ways (the shipped engine, a separate from-scratch Python
re-implementation, and manual inspection of the rendered app in a real
browser) rather than trusted on the strength of the code alone — see
`evaluation-manifest.json`'s `ai_tools_used` entry for the full account,
and `known_limitations` for the one real bug this process caught and
fixed before submission.

## Major design decisions

- **Decision:** keep all tariff/ledger/forecast/comparison logic in
  `src/lib/` as pure functions with zero DOM or React dependency —
  reason: makes the actual money math unit-testable headlessly,
  independent of whatever UI framework sits on top of it.
- **Decision:** make the household loadable at runtime (file upload or
  paste), not hardcoded — reason: `README-FIRST.md` states judges test
  with hidden cases in the same shape; a hardcoded household would fail
  that regardless of how correct its own numbers were.
- **Decision:** validate every field of an uploaded/pasted case
  explicitly (`src/lib/caseLoader.ts`) instead of assuming the shape —
  reason: a malformed or unusually-shaped hidden case should produce a
  clear error message, not a wrong number or a blank page.

## Known limitations

- The "check against your real meter" comparison flags a mismatch using
  a fixed ৳1 tolerance; it is not user-configurable.
- No automated visual-regression test checks the chart's exact pixel
  output — its correctness was checked by inspecting the rendered SVG
  and real-browser screenshots during development, not an automated
  pixel-diff.
- See `evaluation-manifest.json`'s `known_limitations` for the one real
  bug found and fixed during development (an edge case in the top-up
  calculator's "is this the month's first recharge" check), including
  why it never affected the bundled sample's displayed numbers.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
