# Resource library research review — November 7, 2026

Scope: `/resources` and its ten directly listed guides. This is an editorial
review of U.S. federal guidance and repository-backed product claims, not a
professional tax opinion or an audit of every page linked from those guides.
Other state, city, platform and SEO clusters are not marked reviewed by this batch.

## Coverage and corrections

| Guide                        | Review result                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/gig-taxes`                 | Qualify independent-contractor scope, SE-tax calculation and estimated-payment rules; add dated 2026 notes and qualified-tip guidance.                                                                 |
| `/1099-nec-vs-1099-k`        | State 2025 vs 2026 NEC thresholds, distinguish TPSO and payment-card reporting, explain reconciliation and business vs personal transactions.                                                          |
| `/doordash-taxes`            | Replace Stripe-only retrieval instructions with current Dasher-app navigation; distinguish the platform's 2025 help text from federal 2026 reporting rules.                                            |
| `/uber-driver-taxes`         | Link official document retrieval, qualify withholding, remove blanket deductibility of online miles and penalty guarantees.                                                                            |
| `/gig-worker-bookkeeping`    | Separate bank records from a ledger, qualify account suitability, remove unsupported audit-frequency claims and blanket three-year retention.                                                          |
| `/gig-worker-budgeting`      | Treat buffers and reserve percentages as adjustable assumptions; account for cash availability, duplicate transfers and predictable costs.                                                             |
| `/gig-worker-emergency-fund` | Replace universal targets and access promises with individual planning; explain deposit insurance, withdrawal conditions and payment-app limitations.                                                  |
| `/gig-worker-retirement`     | Correct spouse/employee eligibility, shared deferral limits, Roth SEP availability, IRA eligibility and contribution-year limits; avoid universal deadline advice.                                     |
| `/gig-income-aggregator`     | Replace unsupported every-platform API sync, automatic mileage and competitor claims with manual/CSV workflow; separate cash costs, deductions and reserves. Visible FAQ and schema now use one array. |
| `/the-system`                | Retain the workflow supported by current implementation; add explicit review date.                                                                                                                     |

The library and reviewed guides carry a fixed editorial review date. Finance
and platform prerender summaries derive from their content data to reduce drift.
No automatic future-date or annual freshness claim is made.

### Drew's Chime placement — preserved by request

The original `CHIME_PLACEMENT` object is unchanged: the same two supplied
paragraphs, “Sponsored mention” disclosure, `Chime.com | Sourced on Oct-23, 2026`
source line and zero links. The entire “How to build it without a steady paycheck”
section is retained exactly, with the placement after its original editorial
paragraphs. The static SEO summary includes the same disclosure, paragraphs and
source line. The new review date covers editorial guidance and does not claim to
reverify sponsored product terms.

## Official sources checked

- [IRS NEC FAQ](https://www.irs.gov/faqs/small-business-self-employed-other-business/form-1099-nec-and-independent-contractors): $600 for 2025; $2,000 for 2026 payments. [Information-return guidance](https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return) explains backup-withholding reporting.
- [IRS 1099-K overview](https://www.irs.gov/businesses/understanding-your-form-1099-k): TPSO threshold exceeds both $20,000 and 200 transactions; payment-card reporting has no minimum; forms can arrive below the threshold.
- [IRS mileage table](https://www.irs.gov/tax-professionals/standard-mileage-rates): 72.5 cents January–June 2026; 76 cents July–December. This matches existing `shared/mileageRates.ts`; the public mileage calculator already supports both periods and was not changed.
- [IRS car expenses](https://www.irs.gov/taxtopics/tc510) and [Publication 463](https://www.irs.gov/publications/p463): expense-method eligibility, records and personal/commuting exclusions. The publication currently labels its edition 2025; use the separate current rate table for 2026 amounts.
- [IRS SE tax](https://www.irs.gov/taxtopics/tc554), [estimated taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes) and [2026 Form 1040-ES](https://www.irs.gov/pub/irs-pdf/f1040es.pdf): filing/calculation thresholds, withholding, safe harbors and payment timing.
- [IRS tip reporting](https://www.irs.gov/businesses/small-businesses-self-employed/tip-recordkeeping-and-reporting) and [gig-worker changes](https://www.irs.gov/newsroom/the-working-families-tax-cuts-what-gig-economy-workers-should-know): qualified-tip deduction does not eliminate SE tax or income reporting.
- [DoorDash help](https://help.doordash.com/en-us/dashers/article/common-dasher-tax-questions): app retrieval instructions; page still discusses the 2025/$600 cycle. Do not treat its older threshold as the 2026 federal rule or promise 2027 document delivery before platform confirmation.
- [Uber help](https://help.uber.com/driving-and-delivering/article/access-1099-tax-form?nodeId=711e7793-2c57-4e48-94d5-537f2637dd2a): Tax Information / Tax Forms retrieval; date-specific examples concern 2025 forms delivered in 2026.
- [IRS recordkeeping](https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping) and [retention](https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records): supporting evidence and exceptions to the common retention period.
- [IRS self-employed retirement](https://www.irs.gov/retirement-plans/retirement-plans-for-self-employed-people), [one-participant 401(k)](https://www.irs.gov/retirement-plans/one-participant-401k-plans), [IRA limits](https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-ira-contribution-limits), [2026 limits](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500) and [Publication 560](https://www.irs.gov/publications/p560): eligibility and contribution rules. Publication 560 currently labels its edition 2025; 2026 dollar amounts use the separate IRS announcement.
- [CFPB emergency savings](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) and [cash-flow toolkit](https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/): contextual targets, cash flow and accessible savings. Weekly review and example transfer routines are editorial suggestions, not mandatory agency rules.
- [FDIC deposit insurance](https://www.fdic.gov/resources/deposit-insurance), [NCUA share insurance](https://ncua.gov/consumers/share-insurance-coverage) and [CFPB payment apps](https://www.consumerfinance.gov/ask-cfpb/is-the-money-i-keep-in-my-payment-app-safe-en-2135/): verify institution/coverage; do not assume app balances are insured. FDIC direct web extraction returned 403; official indexed text was available.

## Product evidence

Checked at base commit `957f3c6`:

- `server/routers/moneyManager/earningsImport.repo.ts`: atomic CSV batch persistence and source labels.
- `server/routers/workHistory/repo.ts`: distinct manual, timed and imported records.
- `server/routers/workInsights/service.ts` and `shared/workProfit.ts`: records-based profitability, vehicle costs and user-selected reserve assumptions.
- `client/src/pages/MoneyManager.tsx`, `client/src/pages/WorkInsights.tsx`, `client/src/content/marketing.ts`: exposed workflow and limitations.

The production `/resources` route rendered the ten-card library in Chrome.
The search extractor returned an error and an unrelated title; that extraction
was not treated as proof of a live browser failure. No real account records,
payments, messages or tax filings were changed during this review.

## Maintenance

Recheck year-specific tax values before the next tax year and whenever IRS or
platform guidance changes. Review all ten articles before advancing the library's
review date. The date does not extend to linked guides outside this inventory.

## Validation

- Netlify deploy preview built successfully for `a10b900`.
- Chrome: all ten guide destinations render the review date at 390px width,
  without document-level horizontal overflow. The library filter, empty-search
  result and clear action work. Desktop library and emergency article checked
  at 1440px; the 1099 comparison also fits a 320px viewport.
- Chime preview text equals production text exactly; one sponsored block, zero
  links, original section heading. Raw preview HTML contains one disclosure and
  one original source line, so non-JavaScript output also retains the placement.
- Library plus ten guide URLs returned HTTP 200 with route-specific titles.
- Changed-file ESLint, formatting, robots/sitemap source sync and JSON-LD source
  gates passed. Targeted tests: 42 passed, including the sponsored-placement
  regression and existing mileage/profit calculations.
- GitHub's required `test` job did not execute: its annotation says the account
  is locked due to a billing issue. This is not a passing CI result; do not
  bypass the required check or treat preview deployment as production publication.
