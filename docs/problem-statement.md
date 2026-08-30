# Problem statement (reference copy)

Kept verbatim for reference, as given for this problem. This file is
documentation only — nothing in `js/` reads this file at runtime.

## Prepaid Meter Recharge Advisor

### Background

A family in Dhaka runs on a prepaid electricity meter. Electricity is
priced in slabs that get more expensive the more units the household uses
in a calendar month, and that slab counter goes back to the bottom on the
first of every month. The family does not see this. They recharge
whenever the meter starts beeping, often a big amount late in the month,
and the money disappears faster than they expected because every unit is
being billed at the top slab.

### Problem statement

The family needs a tool that shows where the money actually goes and
tells them when and how much to recharge.

**Use this tariff and no other.** Units 1 to 75 in a month cost 4.63 taka
each, 76 to 200 cost 5.26, 201 to 300 cost 5.63, 301 to 400 cost 5.83, 401
to 600 cost 9.30, and 601 and above cost 10.70. On top of that there is a
demand charge of 42 taka and a meter rent of 40 taka, both taken once a
month on the first recharge of that month, and 5 percent VAT on the
energy amount. The slab counter resets on the first day of each calendar
month and a recharge does not reset it.

### Expected solution

All four are scored. Three of four on both problems unlocks the early
bonus.

1. Create a household with at least six months of daily unit readings and
   its recharge history. The readings must include a light month, a
   heavy summer month and a month where the family recharged a large
   amount in the last week.
2. Rebuild the meter balance day by day using the tariff above. Charge
   each day's units at the slab the month's running total has reached,
   take the demand charge and meter rent on the first recharge of each
   month, add VAT, and show the balance as a line with every recharge
   marked on it.
3. Answer the family's two questions. Given today's balance and their
   usual daily use, on which date does the balance run out. And to last
   until a date the user picks, how much must be recharged today. Break
   that amount into energy, the part caused by being in a higher slab,
   fixed charges and VAT.
4. Compare two recharge habits over the same three months on the same
   consumption: recharging a large amount whenever the balance runs low,
   against recharging at the start of each month. Show which one costs
   less and by how much.

### Bonus features

Only attempt these if the four required items already work.

- Warn the user when the month's running total is close to the next slab
  and show what the next unit will cost after it crosses.
- Let the user paste their real recharge history and compare the
  rebuilt balance against what the meter actually showed.
- Show one month's bill broken into energy, demand charge, meter rent
  and VAT.

### Constraints

- Use the tariff and the charges exactly as written in the problem. Real
  published tariffs change and will not be used for checking.
- The slab counter resets on the first day of the calendar month, not on
  a recharge. Getting this backwards will produce the wrong number
  everywhere.
- The comparison in the last item must run on identical consumption.
  Changing the usage between the two habits proves nothing.

### Clarifications, judges mark by these

Published rulings that settle questions in this problem statement. They
are part of the specification, not advice.

- Both recharge habits use identical daily consumption and the same
  calendar month slab counter. Recharge timing cannot create an energy
  rate saving. **R-16**
- "Cost" means the money the meter consumes: energy, VAT and the
  applicable monthly fixed charges. It is not the amount deposited.
  **R-33**
- The two results may legitimately be equal. Any difference can only
  come from how many monthly first-recharge fixed charges occur. A
  fabricated slab saving is a failure. **R-16**
- The two habits: "low balance" recharges the case's amount at the start
  of any day whose balance is below the case's threshold; "monthly"
  recharges the case's amount on the 1st of each month. Both start from
  the case's opening balance and run the three named months. **R-33**

---

See `../README.md` for how this repository satisfies each item, and
`../js/data.js` for the specific household (case `PUB-01`) this build
demonstrates against.
