export const TAX_TOOL_SOURCES = [
  {
    label: "IRS: 2026 Form 1040-ES, worksheets, brackets and deadlines",
    url: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf",
  },
  {
    label: "IRS: self-employment tax",
    url: "https://www.irs.gov/taxtopics/tc554",
  },
  {
    label: "IRS: Additional Medicare Tax",
    url: "https://www.irs.gov/taxtopics/tc560",
  },
  {
    label: "SSA: annual Social Security wage bases",
    url: "https://www.ssa.gov/oact/cola/cbb.html",
  },
];
export const TAX_TOOL_FAQS = [
  {
    q: "Which tax year and situations are supported?",
    a: "This is a 2026 U.S. federal planning estimate for Single or Married Filing Jointly, with one self-employed person in the household. It uses ordinary-income brackets and the basic standard deduction. It is not a filing engine. Dependents, itemizers, other filing statuses, two self-employed spouses, special SE methods, capital gains, qualified dividends, AMT and NIIT need a separate calculation.",
  },
  {
    q: "Are QBI, tips and tax credits calculated automatically?",
    a: "No. Determine eligibility and the allowed amounts using IRS worksheets. Enter eligible income adjustments, additional deductions (including allowed QBI or Schedule 1-A deductions) and credits separately. Leaving these at zero can overestimate tax. A qualified-tip deduction does not reduce business profit or self-employment tax.",
  },
  {
    q: "Should I subtract mileage again?",
    a: "No. Enter annual net business profit after all eligible business deductions, including mileage if used. This tool does not subtract mileage again. Standard mileage and actual vehicle costs are alternative deduction methods; do not count the same expense twice.",
  },
  {
    q: "Does an equal installment guarantee no penalty?",
    a: "No. The general comparison is 90% of current-year tax versus 100% of eligible prior-year tax, or 110% when prior-year AGI exceeds $150,000 for these filing statuses. Prior-year tax must be determined using Form 1040-ES and cover a full 12-month return. Payment timing, withholding, uneven income, relief and exceptions matter. The displayed annual balance is not a catch-up payment instruction.",
  },
  {
    q: "Does a reserve percentage apply to gross payouts?",
    a: "The reserve percentage uses annual net profit, not gross deposits. The reserve covers the modeled household federal balance after withholding and payments plus your entered state/local reserve. It is not an incremental tax rate on one gig payout. Divide by remaining expected profit separately if saving partway through the year.",
  },
];
export const TAX_TOOLS = {
  "tax-set-aside": {
    title: "2026 Tax Set-Aside Calculator",
    description:
      "Plan a 2026 tax reserve using net business profit, household income, withholding and a separately entered state/local reserve.",
  },
  "quarterly-tax-estimator": {
    title: "2026 Quarterly Tax Estimator",
    description:
      "Compare modeled federal estimated-payment targets, withholding and eligible prior-year tax using 2026 rules and due dates.",
  },
  "se-tax-calculator": {
    title: "2026 Self-Employment Tax Calculator",
    description:
      "Estimate 2026 Social Security, Medicare and Additional Medicare Tax with wage-base coordination and the regular SE tax deduction.",
  },
} as const;
