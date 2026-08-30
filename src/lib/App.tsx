import { useMemo, useState } from 'react';
import { Home, CalendarRange, Wallet2, Banknote } from 'lucide-react';
import { household as sampleHousehold, type Household } from './lib/data';
import { buildDayList, rebuildLedger, forecastRunOut, forecastTopUp, runComparison } from './lib/engine';
import { addDays, humanMonth, monthKey } from './lib/dates';
import { fmt } from './lib/format';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StatCard } from './components/StatCard';
import { SectionCard } from './components/SectionCard';
import { BalanceChart } from './components/BalanceChart';
import { SlabLadder } from './components/SlabLadder';
import { RunOutCard } from './components/RunOutCard';
import { TopUpCard } from './components/TopUpCard';
import { MonthBillCard } from './components/MonthBillCard';
import { HabitComparisonCard } from './components/HabitComparisonCard';
import { CaseLoaderCard } from './components/CaseLoaderCard';
import { RechargeCompareCard } from './components/RechargeCompareCard';

function App() {
  // The active household: the bundled sample (PUB-01) by default, or
  // whatever a judge/user loads via file upload or pasted JSON. Every
  // section below reads from this one piece of state, so loading a new
  // case re-renders the entire page against it.
  const [household, setHousehold] = useState<Household>(sampleHousehold);
  const [loadGeneration, setLoadGeneration] = useState(0); // bumped on every load/reset so stale per-case UI state always clears, even if two loaded cases share a case_id
  const isCustomCase = household !== sampleHousehold;

  function loadHousehold(h: Household) {
    setHousehold(h);
    setTargetDate(h.defaultTargetDate); // stale date from a previous case would otherwise just show an error until re-picked
    setLoadGeneration((g) => g + 1);
  }

  // The full day-by-day rebuild (item 2) runs once per household — every
  // other section reads from this same ledger, so there is exactly one
  // source of truth for "what happened on day X" across the whole page.
  const ledger = useMemo(() => {
    const days = buildDayList(household.daysStart, household.dailyUnits);
    return rebuildLedger(days, household.openingBalance, household.recharges);
  }, [household]);

  const todayRow = ledger.find((r) => r.date === household.today)!;

  const runOut = useMemo(
    () => forecastRunOut(household.today, todayRow.balanceAfter, todayRow.monthCumulative, household.usualDailyUnits),
    [household, todayRow]
  );

  const [targetDate, setTargetDate] = useState(household.defaultTargetDate);
  const minTargetDate = addDays(household.today, 1);
  const topUp = useMemo(() => forecastTopUp(household, ledger, targetDate), [household, ledger, targetDate]);

  const comparisonResult = useMemo(() => {
    try {
      return { ok: true as const, data: runComparison(household) };
    } catch (e) {
      // A structurally-valid case can still reference comparison months
      // its own `days` array doesn't cover. That must not take down the
      // whole page (the top-level ErrorBoundary would otherwise catch
      // this and blank every other section too) — just this one card.
      return { ok: false as const, error: (e as Error).message };
    }
  }, [household]);

  const totalRecharged = household.recharges.reduce((a, r) => a + r.amount, 0);
  const periodLabel = `${humanMonth(monthKey(household.daysStart))} – ${humanMonth(monthKey(household.today))}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Where the money actually goes.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-[15px]">
            One Dhaka household, six months of real daily readings, rebuilt unit-by-unit against the real slab
            tariff — so recharging late in the month at the top slab stops being a surprise.
          </p>
        </div>

        {/* Stat strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Household" value={`Case ${household.caseId}`} icon={Home} />
          <StatCard label="Period" value={periodLabel} icon={CalendarRange} />
          <StatCard label="Balance today" value={fmt(todayRow.balanceAfter)} icon={Wallet2} tone="indigo" />
          <StatCard label="Total recharged" value={fmt(totalRecharged)} icon={Banknote} tone="emerald" />
        </div>

        {/* Case loader — accepts a judge's own test case via file or paste */}
        <SectionCard
          className="mt-6"
          title="Load a different case"
          subtitle="This tool isn't hard-wired to one household — upload or paste any case in the published fixture's JSON shape and every section below recalculates against it."
        >
          <CaseLoaderCard
            onLoad={loadHousehold}
            onReset={() => loadHousehold(sampleHousehold)}
            activeCaseId={household.caseId}
            isCustom={isCustomCase}
          />
        </SectionCard>

        {/* Item 1 + 2: household + rebuild */}
        <SectionCard
          className="mt-6"
          title="Balance, rebuilt day by day"
          subtitle={
            <>
              {!isCustomCase && (
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                    ● Jan / Feb — light usage
                  </span>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                    ● May / Jun — heavy summer load
                  </span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    ▲ 26 May — ৳4,300 recharge in the last week of the month
                  </span>
                </div>
              )}
              <p className={isCustomCase ? '' : 'mt-3'}>
                Every day's units are charged at the slab the month's running total has already reached. The slab
                counter resets to zero on the 1st of every month — a recharge never resets it. Demand charge (৳42)
                and meter rent (৳40) are taken once, on the first recharge of each month, and 5% VAT applies to the
                energy amount.
              </p>
            </>
          }
        >
          <BalanceChart ledger={ledger} />
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" /> Meter balance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Recharge event
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-300" /> Heavy summer months shaded
            </span>
          </div>
        </SectionCard>

        {/* Bonus: slab position */}
        <SectionCard
          className="mt-6"
          title="Where this month sits on the slab ladder"
          subtitle="The running total for the current calendar month, and what the next unit costs once it crosses into the next slab."
        >
          <SlabLadder monthCumulative={todayRow.monthCumulative} />
        </SectionCard>

        {/* Item 3 */}
        <SectionCard
          className="mt-6"
          title="The family's two questions"
          subtitle={`Based on today's balance and their usual daily use of ${household.usualDailyUnits} units.`}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RunOutCard result={runOut} usualDailyUnits={household.usualDailyUnits} />
            <TopUpCard targetDate={targetDate} minDate={minTargetDate} onChange={setTargetDate} result={topUp} />
          </div>
        </SectionCard>

        {/* Bonus: month bill */}
        <SectionCard className="mt-6" title="One month's bill, broken down">
          <MonthBillCard ledger={ledger} />
        </SectionCard>

        {/* Item 4 */}
        <SectionCard
          className="mt-6"
          title="Two recharge habits, same three months, same electricity use"
          subtitle="Both starting from ৳0. Energy, VAT and slab progression are identical for both — the only thing that can differ is how many months each habit actually triggers a fresh demand charge + meter rent."
        >
          {comparisonResult.ok ? (
            <HabitComparisonCard
              low={comparisonResult.data.low}
              monthly={comparisonResult.data.monthly}
              monthCount={comparisonResult.data.months.length}
            />
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
              <div className="font-semibold">Couldn't run this comparison for the loaded case.</div>
              <p className="mt-1 text-xs leading-relaxed">{comparisonResult.error}</p>
            </div>
          )}
        </SectionCard>

        {/* Bonus: paste real recharge history and compare */}
        <SectionCard
          className="mt-6"
          title="Check against your real meter"
          subtitle="Paste your real recharge history and/or what the meter actually showed on given dates, and see how it compares to the rebuilt balance above."
        >
          <RechargeCompareCard key={loadGeneration} household={household} defaultLedger={ledger} />
        </SectionCard>
      </main>

      <Footer />
    </div>
  );
}

export default App;
