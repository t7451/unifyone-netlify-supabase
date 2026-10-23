# Recorded work and profit planning

Workers can now use Earnings (`/money-manager`) to add completed work without
running a timer. Each entry records a source, start/end time, base pay, tips,
bonuses, and optional business miles. Entries cover one minute to 24 hours;
split longer projects into daily records. Do not re-enter work already timed or
imported from CSV. Saving uses an owner-scoped retry reference to prevent an
uncertain network response from creating duplicate work. Only manual completed
entries can be deleted through this flow.

Work history (`/work-history`) combines completed manual/timer entries and
committed statement imports with date, source, and literal source-name filters.
Totals cover the entire filtered result, not only the visible page. Imported
hours remain unknown. Session dates follow the worker's local calendar; imported
statement dates retain their recorded UTC calendar date. Bank/provider activity
is excluded. Only manual work opens the correction form.

Manual completed entries can also be corrected. Editing loads the owned saved
record, including its mileage date and notes. An optimistic version check keeps
a stale browser tab from overwriting a newer correction. A pay-only correction
preserves the stored mileage rate and deduction; changing miles or their date
recalculates that mileage entry. Timer-created records cannot be edited here.

Work insights (`/work-insights`) combines recorded earnings, hours, and miles.
It calculates hourly figures from total earnings and total hours, rather than
averaging individual hourly rates. CSV imports without hours and incomplete
records are shown separately. Periods use a rolling seven days or UTC calendar
month/year. Bank deposits and provider earnings are not added to these totals.

Vehicle cost, additional costs, reserve percentage, and hourly goal are editable
planning assumptions. A reserve is not a tax calculation, transfer, or savings
account. The public `/tools/gig-hourly-rate` calculator uses the same calculation
and supports comparing several sources without saving financial inputs.

## CSV import safety

Imports are committed as one atomic statement, with a 5,000-row and 2 MB
normalized-payload bound. An owner-scoped SHA256 identity uses normalized platform
and row contents, retaining reference metadata and repeated rows. Renaming or
reordering an identical file does not add income again. The server also checks
retained legacy rows; a matching incomplete legacy import requires review before
retrying. Distinct overlapping statements and manual entries are not automatically
reconciled. Confirmed undo removes only the owned batch and its rows; re-import
after undo is allowed. Uncertain browser saves and removals retain the exact
payload or batch reference until the result is confirmed.

## Work expenses

The Work expenses page (`/work-expenses`) records self-reported costs in USD with
a local calendar date and category. Bank transactions are not automatically
converted into expenses. Do not enter a cost again if it has already been
deducted from the earnings you record. Categories organize costs; they do not
establish whether a cost qualifies for a tax deduction.

Expense periods follow the declared local calendar date: seven dates including
today, the current month, or the current year. Timed work keeps rolling seven-day
or UTC month/year timestamps, so date-only expenses cannot match a partial-day
work cutoff exactly. The expense list paginates entries while showing whole-period
totals. Its CSV export contains only the visible rows, as labeled in the UI.

Work insights offers two cost methods. A mileage estimate includes estimated
vehicle costs plus recorded non-vehicle costs. Recorded-expense mode uses saved
costs instead of multiplying miles by a vehicle-cost estimate. Neither method
deducts logged fuel, maintenance, or insurance on top of estimated vehicle costs.
Additional costs entered in the planner must be unlogged costs for that period.
Expenses are applied to the overall result; source comparisons do not allocate
these unassigned expenses between apps or clients. Missing expense records can
overstate the amount left after costs. The public calculator remains a separate,
unsaved planning tool.

## Accountant records

The Pro export offers a supported-year selector and opens a coverage review before
preparing CSV or PDF. Changing years clears stale coverage and downloads. It includes
separate timer/manual work, committed statement earnings, the recorded expense
ledger, and mileage with original stored rates. It identifies unknown import
hours, potential overlaps, and excluded provider/bank activity. Income totals are
bookkeeping subtotals without automatic reconciliation. Mileage deductions are
not subtracted on top of the actual expense ledger. The packet is not a tax
return and the downloads do not include legacy tax projections for unsupported
years. Income uses UTC annual boundaries; expense dates use recorded calendar
years. Mileage belongs to its saved log date, including cross-year sessions.

## Mileage

The shared rate table supports 2023–2026 and identifies both verified 2026
periods. The public mileage calculator requires separate miles for each period.
The source is the [IRS standard mileage rate table](https://www.irs.gov/tax-professionals/standard-mileage-rates).
An eligible deduction is separate from cash savings or actual vehicle costs.
Existing mileage logs retain their saved rates and deduction amounts; these
changes do not recalculate historical records. Shift-only historical estimates
without a mileage log use the recorded UTC date because no local calendar date
was captured.

New manual entries with miles capture the local mileage date explicitly. Split
miles driven in different rate periods into separate records. Current timer
completion sends the local completion date; older API clients without that field
use a UTC fallback. Mileage dates are stored as calendar dates at UTC midnight.

## Database and provider readiness

Apply `drizzle/0059_manual_work_records.sql` and then
`drizzle/0060_mileage_rate_precision.sql` and
`drizzle/0061_work_expenses.sql` through the normal migration process
before deploying this code. The first adds manual-entry metadata and the
owner/reference uniqueness constraint. The second preserves saved rates while
allowing half-cent rates. The third creates the owner-scoped expense ledger.
Validate on a development database first. These
migrations were applied to the configured application database on October 23,
2026, before the main-branch release. All four migrations (0058–0061) ran in one
transaction with bounded lock/statement timeouts. Post-migration checks verified
the tables, indexes, ownership foreign keys, and rate precision; saved mileage
rates and deductions were compared inside the transaction and remained unchanged.

The import-safety release additionally applied the existing prerequisite
`drizzle/0049_earnings_import.sql` and
`drizzle/0062_csv_import_identity.sql` to the configured application database on
October 23, 2026. The original import tables were missing. Both migrations ran in
one transaction; the nullable fingerprint, owner/fingerprint uniqueness and
preservation of existing batch records were verified before commit. Separate
databases need migration 0049 before 0062. No legacy rows were rewritten.

Provider linking has separate prerequisites and migration 0058; see
[CONNECTED_MONEY.md](CONNECTED_MONEY.md). Plaid and Argyle credentials, approvals,
and a real provider connection are still required to validate live linking.
Manual work and the planning tools can be used independently of those providers.
