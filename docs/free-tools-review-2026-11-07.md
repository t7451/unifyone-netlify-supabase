# Free tools review — November 7, 2026

## Scope and corrections

- Three tax tools now share a 2026 model: tax reserve, quarterly estimates and SE tax. Removed duplicate 2025 bracket tables and the optional second mileage deduction from already-net profit.
- 2026 ordinary-income rate schedules and standard deductions come from [IRS Form 1040-ES](https://www.irs.gov/pub/irs-pdf/f1040es.pdf). The Social Security wage base is $184,500, corroborated by [SSA](https://www.ssa.gov/oact/cola/cbb.html).
- Own W-2 Social Security wages reduce only that owner's remaining wage base. Joint household Medicare wages affect Additional Medicare Tax, not the owner's Social Security base. The deductible half excludes Additional Medicare Tax. See [IRS SE tax](https://www.irs.gov/taxtopics/tc554) and [Additional Medicare Tax](https://www.irs.gov/taxtopics/tc560).
- Annual estimated-payment comparison follows the general 1040-ES worksheet, including credits, withholding, the $1,000 balance test and optional eligible prior-year tax. Payments already made reduce remaining annual balances; they do not rewrite the baseline schedule or determine a payment due today.
- Reserve denominator is net profit, never gross platform payouts. State/local reserve is a separately calculated dollar input rather than a misleading flat rate applied to federal profit.
- Mileage calculator retains verified date-specific rates: 72.5 cents January–June and 76 cents July–December 2026. Added clarity on avoiding duplicate vehicle deductions. [IRS rate table](https://www.irs.gov/tax-professionals/standard-mileage-rates), [business car rules](https://www.irs.gov/taxtopics/tc510).
- Work-profit calculator retains editable actual-cost and reserve assumptions, not asserted IRS rates or universal costs. Earnings consolidator now describes operating profit before taxes and requires shared costs/hours to be counted once.
- Reseller calculator replaces incomplete fee presets with explicit percentage fees, fixed fees, extra fee base, expected unrecovered return costs and item-cost ROI. Selling revenue includes retained buyer shipping and excludes remitted sales tax. [eBay fees](https://www.ebay.com/help/selling/fees-credits-invoices/fee-tables?id=4822), [Etsy fee components](https://help.etsy.com/hc/en-us/articles/360035902374-Etsy-Fee-Basics), [Amazon pricing](https://sell.amazon.com/pricing).
- Cash-flow planner accepts expected daily deposits after payout fees. Removed unsupported fixed platform arrival days and instant-pay prices. Average month is explicitly weekly deposits × 52 ÷ 12, not a dated 30-day forecast. [Uber deposit processing](https://help.uber.com/driving-and-delivering/article/direct-deposit-late-or-missing?nodeId=38e1f3a9-139a-4cd9-90f3-daaa9158710b).
- Tool directory, page metadata and crawler summaries match the revised scope. RoutePulse's route/traffic service has no tax formula change.

## Deliberate limits

The tax model supports Single and Married Filing Jointly with one self-employed person and ordinary income. It does not determine eligibility for QBI, qualified tips, credits or other deductions: permitted amounts are explicit manual inputs. Other filing statuses, dependents, itemizing, losses, two self-employed spouses, preferential capital gains, AMT, NIIT, foreign-income exclusions, special SE methods and special estimated-tax exceptions need the IRS worksheets or a preparer. Basic standard deductions are automatic; other allowed deductions are not. Results are planning estimates, never exact filing liabilities or penalty guarantees.

No state/local liability, marketplace account fee, bank arrival time, or actual vehicle cost is inferred. Prior-year safe-harbor eligibility must be confirmed by the user. Unknown future tax years do not silently inherit 2026 figures.

## Validation

Independent reference tests cover all federal bracket boundaries, Social Security wage coordination, SE threshold, Additional Medicare Tax, credits, prior-year/withholding comparisons, zero and invalid inputs, reseller fee bases/rounding/ROI and wraparound cash-flow gaps. Existing mileage, work-profit, RoutePulse and Chime preservation tests are retained. Final build, suite and deployment results are recorded in the PR.

Drew's Chime placement data, copy, original section, source date and renderer are unchanged. The shared article layout change only removes the obsolete calculator-specific 2025 notice; it does not alter the sponsored article.
