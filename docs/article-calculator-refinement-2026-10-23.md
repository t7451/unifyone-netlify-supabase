# Article and calculator refinement — October 23, 2026

## Delivered

Continues the marketing refresh in draft PR #458. The shared public shell now
covers all 16 geographic/guide templates, four static blog templates, the
SEO landing template, the dynamic article renderer, and eight calculators.
RoutePulse keeps its map layout.

Articles use a readable content width, the cream/green palette, serif headings,
an automatic section outline, and related resources before the footer.
Calculators use consistent cards, mobile form stacking, accessible input names,
visible focus states, and announced results. Older related-post buttons caused
severe phone overflow; ordinary wrapping card links fix that issue.

The email capture describes the optional signup it actually performs. Calculator
copy no longer promises automatic platform imports, reminder delivery, or a
verified mileage log in the places revised in this round.

## Calculation corrections

- Earnings calculators preserve losses rather than silently clipping them to zero.
- Public tax calculators share historical 2025 constants: standard deductions of
  $15,750 single / $31,500 joint, and the $176,100 Social Security wage base.
- Regular self-employment tax applies the $400 net-earnings threshold and wage cap.
- Quarterly estimates show the actual 2025 installment dates, including June 16.
- Mileage already deducted from business profit is explicitly excluded from the
  optional second deduction. Input guards reject non-finite and negative values.
- Tax and mileage tools clearly identify their 2025 basis. They are not upgraded
  to 2026 filing calculations. The simplified tax model assumes no W-2 wages and
  excludes Additional Medicare Tax, QBI, credits, and age-related deductions.
- Hourly-rate mileage is labeled a cost proxy, distinct from actual expenses or
  tax-deduction eligibility.

Sources: [IRS Publication 501](https://www.irs.gov/publications/p501),
[SSA 2025 facts](https://www.ssa.gov/news/en/cola/factsheets/2025.html),
[Schedule SE instructions](https://www.irs.gov/instructions/i1040sse),
[IRS estimated taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes),
and [IRS mileage rates](https://www.irs.gov/tax-professionals/standard-mileage-rates).

## Verification

- 29 representative article/template and calculator routes at 320, 768, and
  1440 pixels: all 87 layout cases have one main, one H1, and no horizontal overflow.
- Section-outline navigation reaches its generated anchor.
- Browser calculation checks: a $100 shift / 4 hours / 200 miles shows -$40 and
  -$10/hour; $300,000 profit shows approximately $29,871 regular SE tax; $400
  profit shows zero SE tax; 10,000 miles yields a $7,000 deduction.
- $45,000 single profit yields approximately $6,358 SE tax, $2,890 federal income
  tax, $9,248 annual federal estimate, and $2,312 per quarter. Set-aside shows
  $20.55 per $100 with no state rate.
- Five regression tests cover revised constants, the SE threshold and cap,
  negative earnings, and invalid numeric inputs.
- Production frontend/server build and SEO gates pass, including 220/220 sitemap
  routes. Changed-file ESLint has no errors and four existing mixed-export warnings.
- The full TypeScript check still reports the same 20 pre-existing RoutePulse
  errors established against the baseline; no reading/calculator errors appear.

Local screenshots and browser case data: `.agent-output/reading-review/`.
The standalone Vite review does not serve backend APIs; transient auth/API toasts
there do not verify production behavior. Dynamic published article data, signed-in
features, lead delivery, physical devices, and production deployment were not
verified. No production merge was performed. GitHub Actions on the prior commit
could not start because the account was locked for billing; hosted checks must be
reassessed separately. Pending Chime placement remains a separate change.

## RoutePulse follow-up

The 20 TypeScript errors recorded above were resolved in the next pass. The
full typecheck now passes. See [the RoutePulse repair report](routepulse-repair-2026-10-23.md)
for validation, basemap recovery, and the separate full-suite test failures.
