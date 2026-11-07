/** Review dates are editorial records, never generated from the current clock. */
export const RESOURCE_REVIEW_DATE = "2026-11-07";
export const RESOURCE_REVIEW_LABEL = "November 7, 2026";
export const REVIEWED_RESOURCE_SLUGS = [
  "gig-taxes",
  "1099-nec-vs-1099-k",
  "gig-worker-bookkeeping",
  "gig-worker-budgeting",
  "gig-worker-emergency-fund",
  "gig-worker-retirement",
  "doordash-taxes",
  "uber-driver-taxes",
  "the-system",
  "gig-income-aggregator",
];

export const TAX_REVIEW = {
  dates:
    "For calendar-year 2026, regular federal estimated-payment dates are April 15, June 15 and September 15, 2026, and January 15, 2027. Disaster relief and other exceptions can change your deadlines; check the IRS before paying.",
  nec: "For 2026 payments, the general federal Form 1099-NEC reporting threshold is $2,000, up from $600 for 2025. Backup withholding can require a form below that amount. A reporting threshold is not a tax-free allowance.",
  k: "For third-party network payments, federal Form 1099-K reporting generally requires more than $20,000 AND more than 200 transactions. Payment-card transactions have no minimum threshold. State rules or voluntary reporting can produce a form below the federal threshold.",
  mileage:
    "For eligible business driving in 2026, the IRS standard mileage rate is 72.5 cents per mile from January 1 through June 30 and 76 cents from July 1 through December 31. Separate your miles by date. Commuting and personal trips do not qualify merely because an app is online.",
  se: "Self-employment tax generally applies at $400 or more of net self-employment earnings. The calculation usually starts with 92.35% of net profit. The 15.3% rate combines Social Security (subject to an annual wage base) and Medicare; Additional Medicare Tax can apply at higher incomes.",
  estimates:
    "Estimated payments generally apply if you expect to owe at least $1,000 after withholding and refundable credits and do not meet a payment exception. Safe-harbor rules generally compare 90% of current-year tax with 100% of prior-year tax (110% for certain higher-income taxpayers). Timing matters; paying four times does not itself prevent a penalty. See Form 1040-ES for exceptions and uneven-income rules.",
  reserve:
    "A tax reserve is a planning assumption, not your calculated tax bill. Use household income, withholding, credits, deductible expenses and state rules to estimate what to save; a fixed 25–30% can be too high or too low. Revisit the estimate as earnings change.",
  tips: "Eligible workers may claim a federal deduction for qualified tips for 2025–2028, subject to occupation, income, reporting and other limits. Report the tips first: this does not make all tips tax-free or eliminate self-employment tax. Check the IRS rules before claiming it.",
};

export const TAX_REVIEW_SOURCES = [
  {
    label: "IRS: Form 1040-ES — 2026 dates and payment rules",
    href: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf",
  },
  {
    label: "IRS: 1099-NEC reporting thresholds",
    href: "https://www.irs.gov/faqs/small-business-self-employed-other-business/form-1099-nec-and-independent-contractors",
  },
  {
    label: "IRS: Understanding Form 1099-K",
    href: "https://www.irs.gov/businesses/understanding-your-form-1099-k",
  },
  {
    label: "IRS: Mileage rates by date",
    href: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
  },
  {
    label: "IRS: Business use of a car",
    href: "https://www.irs.gov/taxtopics/tc510",
  },
  {
    label: "IRS: Self-employment tax",
    href: "https://www.irs.gov/taxtopics/tc554",
  },
  {
    label: "IRS: Estimated taxes",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
  },
  {
    label: "IRS: Tip recordkeeping and reporting",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/tip-recordkeeping-and-reporting",
  },
];
