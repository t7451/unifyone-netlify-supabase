/**
 * stateTaxGuides.ts — content for the state-level gig-worker tax guide cluster
 * (/california-gig-worker-taxes, /texas-gig-worker-taxes, /florida-gig-worker-taxes,
 * /new-york-gig-worker-taxes, /illinois-gig-worker-taxes, /washington-gig-worker-taxes).
 *
 * These pages target high-intent state-specific searches ("california gig worker
 * taxes", "do texas gig workers pay state income tax", "how much to set aside in
 * new york") and are built for AEO/GEO: each ships a WebPage + FAQPage JSON-LD
 * block plus visible Q&A that answer-engines can cite.
 *
 * Accuracy note: federal self-employment tax (15.3% = 12.4% Social Security +
 * 2.9% Medicare) on net earnings is uniform in every state. What changes
 * state-to-state is the STATE income tax — some states levy a progressive or
 * flat income tax, others have none. State facts below are accurate as of the
 * 2025/2026 tax years; rates and thresholds change, so copy stays qualified and
 * links out to each state's tax agency and to the IRS for authoritative current
 * numbers. This is educational information, never tax advice.
 */

export interface StateFaq {
  q: string;
  a: string;
}

export interface ResourceLink {
  label: string;
  href: string;
}

export interface StateTaxGuide {
  /** Route slug, also the prerendered file name. */
  slug: string;
  /** State name, e.g. "California". */
  state: string;
  /** Adjective form, e.g. "California" (used in "California gig workers"). */
  stateAdjective: string;
  /** Eyebrow label above the h1. */
  eyebrow: string;
  /** <title> + WebPage schema name (≤ ~70 chars before the brand suffix). */
  title: string;
  /** Meta description, ≤158 chars. */
  metaDescription: string;
  /** On-page h1. */
  h1: string;
  /** Lead paragraph. */
  intro: string;
  /** Whether the state levies a personal income tax on gig earnings. */
  hasStateIncomeTax: boolean;
  /** Heading for the state-specific treatment section. */
  stateHeading: string;
  /** State-specific treatment paragraphs (income tax or none + where to pay). */
  stateBody: string[];
  /** Authoritative state tax-agency links (rendered alongside the IRS links). */
  stateResources: ResourceLink[];
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: StateFaq[];
}

/** Federal mechanics shared by every state guide (rendered as numbered steps). */
export const HOW_GIG_TAXES_WORK: { title: string; body: string }[] = [
  {
    title: "You're an independent contractor — nothing is withheld",
    body: "Gig platforms pay you as a 1099 contractor, not an employee, so no income or payroll tax comes out of your payouts. You're responsible for setting aside and paying your own taxes.",
  },
  {
    title: "Federal self-employment tax is 15.3%",
    body: "That's 12.4% Social Security + 2.9% Medicare on your net earnings — the employer-plus-employee share that a regular job would split with you. It applies in every state, on top of federal income tax.",
  },
  {
    title: "Federal income tax applies to your net profit",
    body: "After deductions, your net gig profit is added to your other income and taxed at your federal rate. You can deduct half of your self-employment tax when figuring federal income tax.",
  },
  {
    title: "Report all income — even without a 1099",
    body: "You must report every dollar you earn whether or not a platform sends a 1099-NEC or 1099-K. Reporting thresholds for the forms change year to year; your obligation to report does not.",
  },
];

/** Deductions every mileage-based gig worker can usually claim, in every state. */
export const SHARED_DEDUCTIONS: { label: string; desc: string }[] = [
  {
    label: "Business mileage",
    desc: "Every mile driven while online or on a job, deducted at the IRS standard mileage rate. Usually the single largest deduction — keep a contemporaneous log.",
  },
  {
    label: "Phone & data",
    desc: "The business-use percentage of your phone and data plan — you cannot accept jobs without it.",
  },
  {
    label: "Supplies & equipment",
    desc: "Insulated bags, phone mounts, chargers, and other gear bought specifically for the work.",
  },
  {
    label: "Tolls & parking",
    desc: "Tolls and parking paid while working are deductible (ordinary commuting tolls are not).",
  },
];

/** How much to set aside — evergreen rule of thumb, reused across guides. */
export const SET_ASIDE_NO_STATE_TAX =
  "A common rule of thumb is to set aside roughly 20–25% of your net earnings (what's left after mileage and other deductions) to cover the 15.3% self-employment tax plus federal income tax. With no state income tax to add, your set-aside is often a little lower than in states that tax income — but your exact rate depends on your total household income. Use the Tax Set-Aside calculator for a number tailored to your situation.";

export const SET_ASIDE_WITH_STATE_TAX =
  "A common rule of thumb is to set aside roughly 25–30% of your net earnings (what's left after mileage and other deductions) to cover the 15.3% self-employment tax, federal income tax, and state income tax. Your exact rate depends on your total household income and your state bracket. Use the Tax Set-Aside calculator for a number tailored to your situation.";

/** Reusable state tax-agency links. */
const FTB = {
  label: "California Franchise Tax Board (FTB)",
  href: "https://www.ftb.ca.gov/",
};
const FTB_540ES = {
  label: "California FTB: Estimated tax (Form 540-ES)",
  href: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
};
const TX_COMPTROLLER = {
  label: "Texas Comptroller of Public Accounts",
  href: "https://comptroller.texas.gov/",
};
const FL_DOR = {
  label: "Florida Department of Revenue",
  href: "https://floridarevenue.com/",
};
const NY_TAX = {
  label: "New York State Department of Taxation and Finance",
  href: "https://www.tax.ny.gov/",
};
const NY_IT2105 = {
  label: "New York: Estimated tax (Form IT-2105)",
  href: "https://www.tax.ny.gov/pit/estimated_tax/default.htm",
};
const NYC_TAX = {
  label: "New York State: New York City resident income tax",
  href: "https://www.tax.ny.gov/pit/file/nyc_taxes.htm",
};
const IL_DOR = {
  label: "Illinois Department of Revenue",
  href: "https://tax.illinois.gov/",
};
const IL_IL1040ES = {
  label: "Illinois: Estimated payments (Form IL-1040-ES)",
  href: "https://tax.illinois.gov/individuals/estimatedpayments.html",
};
const WA_DOR = {
  label: "Washington State Department of Revenue",
  href: "https://dor.wa.gov/",
};
const GA_DOR = {
  label: "Georgia Department of Revenue",
  href: "https://dor.georgia.gov/",
};
const GA_500ES = {
  label: "Georgia: Estimated tax (Form 500-ES)",
  href: "https://dor.georgia.gov/500-es-individual-and-fiduciary-estimated-tax-payment-voucher",
};
const PA_DOR = {
  label: "Pennsylvania Department of Revenue",
  href: "https://www.pa.gov/agencies/revenue.html",
};
const PA_REV414 = {
  label: "Pennsylvania: Estimated tax (Form REV-414/PA-40 ES)",
  href: "https://www.pa.gov/agencies/revenue/forms-and-publications.html",
};
const NJ_TAX = {
  label: "New Jersey Division of Taxation",
  href: "https://www.nj.gov/treasury/taxation/",
};
const NJ_1040ES = {
  label: "New Jersey: Estimated tax (Form NJ-1040-ES)",
  href: "https://www.nj.gov/treasury/taxation/njit20.shtml",
};
const AZ_DOR = {
  label: "Arizona Department of Revenue",
  href: "https://azdor.gov/",
};
const AZ_140ES = {
  label: "Arizona: Estimated tax (Form 140ES)",
  href: "https://azdor.gov/forms/individual/individual-estimated-tax-payment-form",
};
const OH_TAX = {
  label: "Ohio Department of Taxation",
  href: "https://tax.ohio.gov/",
};
const OH_IT1040ES = {
  label: "Ohio: Estimated tax (Form IT 1040ES)",
  href: "https://tax.ohio.gov/individual/resources/estimated-payments",
};
const NC_DOR = {
  label: "North Carolina Department of Revenue",
  href: "https://www.ncdor.gov/",
};
const NC_NC40 = {
  label: "North Carolina: Estimated tax (Form NC-40)",
  href: "https://www.ncdor.gov/taxes-forms/individual-income-tax/estimated-income-tax",
};
const MI_TREASURY = {
  label: "Michigan Department of Treasury",
  href: "https://www.michigan.gov/treasury",
};
const MI_1040ES = {
  label: "Michigan: Estimated tax (Form MI-1040ES)",
  href: "https://www.michigan.gov/taxes/iit/estimated-payments",
};
const CO_DOR = {
  label: "Colorado Department of Revenue",
  href: "https://tax.colorado.gov/",
};
const CO_DR0104EP = {
  label: "Colorado: Estimated tax (Form DR 0104EP)",
  href: "https://tax.colorado.gov/individual-income-tax-estimated-payments",
};

export const STATE_TAX_GUIDES: StateTaxGuide[] = [
  {
    slug: "california-gig-worker-taxes",
    state: "California",
    stateAdjective: "California",
    eyebrow: "State Gig Tax Guide",
    title: "California Gig Worker Taxes: SE Tax, State Income Tax & Estimates",
    metaDescription:
      "California gig worker taxes: the 15.3% federal SE tax plus CA state income tax, FTB estimated payments (Form 540-ES), mileage deductions. Not tax advice.",
    h1: "California Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in California, gig platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because California has its own income tax, you also owe state income tax on the same net earnings. Here's how it works and how to keep the bill as low as legally possible.",
    hasStateIncomeTax: true,
    stateHeading: "Does California have a state income tax for gig workers?",
    stateBody: [
      "Yes. California levies a progressive personal income tax, with rates that climb across brackets to roughly 13.3% at the very top (the highest top rate of any state). Most gig workers fall well below the top bracket, but your net gig profit is added to your other California income and taxed at your marginal state rate on top of federal and self-employment tax.",
      "California has no separate self-employment tax — the 15.3% SE tax is federal only — but you still report and pay state income tax on your net earnings. Pay California estimated tax to the Franchise Tax Board (FTB) using Form 540-ES, on a schedule that runs alongside your federal estimates.",
      "App-based rideshare and delivery drivers in California are generally treated as independent contractors under Proposition 22, so platforms continue to issue 1099s rather than W-2s. That means no withholding and full responsibility for your own federal and California taxes.",
    ],
    stateResources: [FTB, FTB_540ES],
    faqs: [
      {
        q: "Do California gig workers pay state income tax?",
        a: "Yes. California has a progressive state income tax (with a top rate around 13.3%) that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay California estimates to the Franchise Tax Board using Form 540-ES.",
      },
      {
        q: "How much should I set aside for taxes in California?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Are app-based drivers employees or contractors in California?",
        a: "Under Proposition 22, app-based rideshare and delivery drivers in California are generally treated as independent contractors, not employees. Platforms issue 1099s, withhold nothing, and you're responsible for your own federal and California taxes.",
      },
      {
        q: "How do I pay California estimated taxes as a gig worker?",
        a: "Use California Form 540-ES to pay state estimated income tax to the Franchise Tax Board (FTB), generally four times a year alongside your federal estimates. You can pay online through the FTB's website. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can California gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking. These deductions lower both your federal and your California taxable income.",
      },
    ],
  },
  {
    slug: "texas-gig-worker-taxes",
    state: "Texas",
    stateAdjective: "Texas",
    eyebrow: "State Gig Tax Guide",
    title:
      "Texas Gig Worker Taxes: No State Income Tax, but SE Tax Still Applies",
    metaDescription:
      "Texas gig worker taxes: there's no Texas state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Texas Gig Worker Taxes: What You Actually Owe",
    intro:
      "Good news for Texas gig workers: Texas has no personal state income tax, so you won't file a state income-tax return on your gig earnings. The catch is that federal taxes don't change by state — you still owe federal income tax and the 15.3% self-employment tax on your net earnings, with nothing withheld from your payouts. Here's what that means and how to keep your bill down.",
    hasStateIncomeTax: false,
    stateHeading: "Does Texas have a state income tax for gig workers?",
    stateBody: [
      "No. Texas is one of a handful of states with no personal income tax, so there's no state income-tax return on your gig earnings and no state estimated payments to make. Texas does not have an equivalent of California's FTB or New York's IT-2105 for individual income tax.",
      "That does not make your gig income tax-free. The federal side is identical to every other state: you owe federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare). Because nothing is withheld, you set that money aside yourself and pay the IRS directly.",
      "Texas funds itself largely through sales and property taxes rather than an income tax — but those aren't filed on your gig earnings. For most gig workers in Texas, the only income-tax obligation is federal, paid to the IRS through quarterly estimated payments.",
    ],
    stateResources: [TX_COMPTROLLER],
    faqs: [
      {
        q: "Do Texas gig workers pay state income tax?",
        a: "No. Texas has no personal state income tax, so you don't file a state income-tax return on your gig earnings. You still owe federal income tax and the 15.3% federal self-employment tax on your net earnings, paid to the IRS.",
      },
      {
        q: "How much should I set aside for taxes in Texas?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "If Texas has no income tax, are my gig earnings tax-free?",
        a: "No. The lack of a Texas income tax only removes the state portion. You still owe federal income tax on your net profit and the 15.3% self-employment tax, and you must report all income whether or not you receive a 1099.",
      },
      {
        q: "Do Texas gig workers pay quarterly taxes?",
        a: "Yes — federal ones. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects quarterly estimated payments (around April 15, June 15, September 15, and January 15) to avoid an underpayment penalty. There are no Texas state estimates to make.",
      },
      {
        q: "What can Texas gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — all of which lower your federal taxable income and self-employment tax.",
      },
    ],
  },
  {
    slug: "florida-gig-worker-taxes",
    state: "Florida",
    stateAdjective: "Florida",
    eyebrow: "State Gig Tax Guide",
    title:
      "Florida Gig Worker Taxes: No State Income Tax, Federal & SE Tax Only",
    metaDescription:
      "Florida gig worker taxes: no Florida state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Florida Gig Worker Taxes: What You Actually Owe",
    intro:
      "Florida gig workers catch a break on state taxes: Florida has no personal state income tax, so there's no state return on your gig earnings. But federal taxes apply the same everywhere — you still owe federal income tax and the 15.3% self-employment tax on your net earnings, with nothing withheld. Here's how it works and how to keep what you owe as low as legally possible.",
    hasStateIncomeTax: false,
    stateHeading: "Does Florida have a state income tax for gig workers?",
    stateBody: [
      "No. Florida is one of the states with no personal income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make. The Florida Department of Revenue administers sales and business taxes, not an individual income tax.",
      "Your gig income still isn't tax-free, though. The federal rules are the same as in every other state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare). Because nothing is withheld from your payouts, you set the money aside and pay the IRS directly.",
      "For most Florida gig workers, the only income-tax obligation is federal. You handle it through quarterly estimated payments to the IRS, and you report all income whether or not a platform sends you a 1099.",
    ],
    stateResources: [FL_DOR],
    faqs: [
      {
        q: "Do Florida gig workers pay state income tax?",
        a: "No. Florida has no personal state income tax, so you don't file a state income-tax return on your gig earnings. You still owe federal income tax and the 15.3% federal self-employment tax on your net earnings, paid to the IRS.",
      },
      {
        q: "How much should I set aside for taxes in Florida?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "If Florida has no income tax, are my gig earnings tax-free?",
        a: "No. The absence of a Florida income tax only removes the state portion. You still owe federal income tax on your net profit and the 15.3% self-employment tax, and you must report all income even if you don't get a 1099.",
      },
      {
        q: "Do Florida gig workers pay quarterly taxes?",
        a: "Yes — federal ones. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects quarterly estimated payments (around April 15, June 15, September 15, and January 15) to avoid an underpayment penalty. There are no Florida state estimates to make.",
      },
      {
        q: "What can Florida gig workers deduct?",
        a: "The largest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — all of which reduce your federal taxable income and self-employment tax.",
      },
    ],
  },
  {
    slug: "new-york-gig-worker-taxes",
    state: "New York",
    stateAdjective: "New York",
    eyebrow: "State Gig Tax Guide",
    title: "New York Gig Worker Taxes: State & NYC Income Tax, SE Tax, IT-2105",
    metaDescription:
      "New York gig worker taxes: the 15.3% federal SE tax plus NY state income tax (and NYC local tax for city residents), estimated via Form IT-2105. Not advice.",
    h1: "New York Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in New York, platforms pay you as an independent contractor with nothing withheld. You owe the 15.3% federal self-employment tax and federal income tax — and because New York has its own income tax (with an extra local tax for New York City residents), you also owe state, and possibly city, income tax on your net earnings. Here's how it stacks up.",
    hasStateIncomeTax: true,
    stateHeading: "Does New York have a state income tax for gig workers?",
    stateBody: [
      "Yes. New York levies a progressive state personal income tax that applies to your net gig earnings on top of federal income tax and the 15.3% federal self-employment tax. New York has no separate state self-employment tax — the SE tax is federal only — but your net profit is still subject to state income tax.",
      "If you're a New York City resident, you also owe NYC local personal income tax on the same earnings, administered alongside the state tax. (Yonkers residents face a local surcharge as well.) Suburban and upstate residents outside those cities owe state income tax but not the NYC local tax.",
      "Pay New York estimated income tax to the Department of Taxation and Finance using Form IT-2105, generally on the same quarterly schedule as your federal estimates. City tax for NYC residents is reported and paid through the same New York State return and estimates rather than a separate city filing.",
    ],
    stateResources: [NY_TAX, NY_IT2105, NYC_TAX],
    faqs: [
      {
        q: "Do New York gig workers pay state income tax?",
        a: "Yes. New York has a progressive state income tax that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay New York estimates to the Department of Taxation and Finance using Form IT-2105.",
      },
      {
        q: "How much should I set aside for taxes in New York?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do NYC gig workers pay city income tax too?",
        a: "Yes. New York City residents owe NYC local personal income tax on their gig earnings on top of state and federal tax. It's reported through the same New York State return and estimated payments, so city residents should budget for a higher combined rate than residents outside the city.",
      },
      {
        q: "How do I pay New York estimated taxes as a gig worker?",
        a: "Use New York Form IT-2105 to pay state estimated income tax to the Department of Taxation and Finance, generally four times a year alongside your federal estimates. NYC resident tax is included in the same state filing. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can New York gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — lowering your federal and New York taxable income.",
      },
    ],
  },
  {
    slug: "illinois-gig-worker-taxes",
    state: "Illinois",
    stateAdjective: "Illinois",
    eyebrow: "State Gig Tax Guide",
    title: "Illinois Gig Worker Taxes: Flat State Income Tax + Federal SE Tax",
    metaDescription:
      "Illinois gig worker taxes: a flat state income tax (around 4.95%) plus the 15.3% federal SE tax, with IL-1040-ES estimates. Not tax advice.",
    h1: "Illinois Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Illinois, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Illinois has a flat state income tax, you also owe state income tax on your net earnings. The flat rate at least makes the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Illinois have a state income tax for gig workers?",
    stateBody: [
      "Yes — and unlike California or New York, it's a flat tax. Illinois taxes individual income at a single flat rate of roughly 4.95% (rates can change, so confirm the current figure with the Illinois Department of Revenue). Your net gig profit is taxed at that flat rate on top of federal income tax and the 15.3% federal self-employment tax.",
      "Illinois has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Because the rate is flat, estimating the state portion is straightforward: it's the same percentage regardless of how much you earn.",
      "Pay Illinois estimated income tax to the Department of Revenue using Form IL-1040-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS.",
    ],
    stateResources: [IL_DOR, IL_IL1040ES],
    faqs: [
      {
        q: "Do Illinois gig workers pay state income tax?",
        a: "Yes. Illinois has a flat state income tax of roughly 4.95% (confirm the current rate with the Illinois Department of Revenue) that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form IL-1040-ES.",
      },
      {
        q: "How much should I set aside for taxes in Illinois?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the Illinois income tax rate for gig workers?",
        a: "Illinois uses a single flat individual income tax rate — about 4.95% as of recent tax years. Because it's flat rather than progressive, the same percentage applies to your net gig earnings no matter your income level. Always confirm the current rate with the Illinois Department of Revenue.",
      },
      {
        q: "How do I pay Illinois estimated taxes as a gig worker?",
        a: "Use Illinois Form IL-1040-ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's website. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Illinois gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — which lower your federal taxable income (the flat Illinois tax is based on your federal income with state adjustments).",
      },
    ],
  },
  {
    slug: "washington-gig-worker-taxes",
    state: "Washington",
    stateAdjective: "Washington",
    eyebrow: "State Gig Tax Guide",
    title: "Washington Gig Worker Taxes: No State Income Tax, Federal & SE Tax",
    metaDescription:
      "Washington gig worker taxes: no personal state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Washington Gig Worker Taxes: What You Actually Owe",
    intro:
      "Washington gig workers get a break on state taxes: Washington has no personal state income tax, so there's no state income-tax return on your gig earnings. But the federal rules don't change by state — you still owe federal income tax and the 15.3% self-employment tax on your net earnings, with nothing withheld. Here's how it works and how to keep the bill down.",
    hasStateIncomeTax: false,
    stateHeading: "Does Washington have a state income tax for gig workers?",
    stateBody: [
      "No. Washington has no personal (wage and salary) state income tax, so you won't file a state income-tax return on your ordinary gig earnings and there are no state income-tax estimates to make. The Washington Department of Revenue administers sales and business taxes rather than a personal income tax.",
      "Your gig income still isn't tax-free. The federal side is the same as everywhere else: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare). Because nothing is withheld from your payouts, you set the money aside and pay the IRS directly.",
      "Note that Washington does levy a separate capital gains tax on certain high-value investment gains — but that's unrelated to ordinary gig-work earnings, which face no Washington personal income tax. For most gig workers in Washington, the only income-tax obligation is federal, paid through quarterly estimates to the IRS.",
    ],
    stateResources: [WA_DOR],
    faqs: [
      {
        q: "Do Washington gig workers pay state income tax?",
        a: "No. Washington has no personal state income tax, so you don't file a state income-tax return on your gig earnings. You still owe federal income tax and the 15.3% federal self-employment tax on your net earnings, paid to the IRS.",
      },
      {
        q: "How much should I set aside for taxes in Washington?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "If Washington has no income tax, are my gig earnings tax-free?",
        a: "No. The lack of a Washington personal income tax only removes the state portion. You still owe federal income tax on your net profit and the 15.3% self-employment tax, and you must report all income whether or not you receive a 1099.",
      },
      {
        q: "Do Washington gig workers pay quarterly taxes?",
        a: "Yes — federal ones. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects quarterly estimated payments (around April 15, June 15, September 15, and January 15) to avoid an underpayment penalty. There are no Washington personal income-tax estimates to make.",
      },
      {
        q: "What can Washington gig workers deduct?",
        a: "The largest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — all of which reduce your federal taxable income and self-employment tax.",
      },
    ],
  },
  {
    slug: "georgia-gig-worker-taxes",
    state: "Georgia",
    stateAdjective: "Georgia",
    eyebrow: "State Gig Tax Guide",
    title: "Georgia Gig Worker Taxes: Flat State Income Tax + Federal SE Tax",
    metaDescription:
      "Georgia gig worker taxes: a flat state income tax (around 5.39%, phasing down) plus the 15.3% federal SE tax, with Form 500-ES estimates. Not tax advice.",
    h1: "Georgia Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Georgia, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Georgia levies a flat state income tax, you also owe state income tax on your net earnings. The flat rate keeps the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Georgia have a state income tax for gig workers?",
    stateBody: [
      "Yes. Georgia taxes individual income at a single flat rate — roughly 5.39% in recent tax years, with scheduled annual reductions that are phasing the rate down — so confirm the current figure with the Georgia Department of Revenue. Your net gig profit is taxed at that flat rate on top of federal income tax and the 15.3% federal self-employment tax.",
      "Georgia has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Because the rate is flat rather than progressive, the same percentage applies regardless of how much you earn, which makes estimating the state portion straightforward.",
      "Pay Georgia estimated income tax to the Department of Revenue using Form 500-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS.",
    ],
    stateResources: [GA_DOR, GA_500ES],
    faqs: [
      {
        q: "Do Georgia gig workers pay state income tax?",
        a: "Yes. Georgia has a flat state income tax — about 5.39% in recent years and being phased down — that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form 500-ES. Confirm the current rate with the Georgia Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Georgia?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the Georgia income tax rate for gig workers?",
        a: "Georgia uses a single flat individual income tax rate — roughly 5.39% recently — and that rate is scheduled to step down over the next several years. Because it's flat, the same percentage applies to your net gig earnings no matter your income level. Always confirm the current rate with the Georgia Department of Revenue.",
      },
      {
        q: "How do I pay Georgia estimated taxes as a gig worker?",
        a: "Use Georgia Form 500-ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's Georgia Tax Center. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Georgia gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — which lower your federal taxable income, the starting point Georgia uses with state adjustments.",
      },
    ],
  },
  {
    slug: "pennsylvania-gig-worker-taxes",
    state: "Pennsylvania",
    stateAdjective: "Pennsylvania",
    eyebrow: "State Gig Tax Guide",
    title: "Pennsylvania Gig Worker Taxes: Flat 3.07% Tax + Federal SE Tax",
    metaDescription:
      "Pennsylvania gig worker taxes: a flat 3.07% state income tax plus the 15.3% federal SE tax, with PA-40 ES estimates and possible local EIT. Not tax advice.",
    h1: "Pennsylvania Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Pennsylvania, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Pennsylvania levies a flat state income tax, you also owe state income tax on your net earnings (and possibly a local earned-income tax). Here's how it stacks up.",
    hasStateIncomeTax: true,
    stateHeading: "Does Pennsylvania have a state income tax for gig workers?",
    stateBody: [
      "Yes. Pennsylvania taxes individual income at a flat rate of 3.07% — one of the lowest flat rates in the country — and gig earnings fall under its net-profits class of income. Your net gig profit is taxed at that flat state rate on top of federal income tax and the 15.3% federal self-employment tax. Rates can change, so confirm the current figure with the Pennsylvania Department of Revenue.",
      "Pennsylvania has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Note that many Pennsylvania municipalities and school districts also levy a local earned-income tax (EIT), commonly around 1%, that can apply to self-employment net profits; check your local rate with your municipality or its appointed tax collector.",
      "Pay Pennsylvania estimated income tax to the Department of Revenue using the PA-40 ES estimated payment vouchers (the REV-414 worksheet helps you figure the amount), generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS, and from any local EIT.",
    ],
    stateResources: [PA_DOR, PA_REV414],
    faqs: [
      {
        q: "Do Pennsylvania gig workers pay state income tax?",
        a: "Yes. Pennsylvania has a flat 3.07% state income tax that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using the PA-40 ES vouchers. Confirm the current rate with the Pennsylvania Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Pennsylvania?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Pennsylvania gig workers owe local taxes too?",
        a: "Often, yes. Many Pennsylvania municipalities and school districts levy a local earned-income tax (EIT) — commonly around 1% — that can apply to self-employment net profits on top of the flat 3.07% state tax. Rates and rules vary by locality, so confirm yours with your municipality or its appointed local tax collector.",
      },
      {
        q: "How do I pay Pennsylvania estimated taxes as a gig worker?",
        a: "Use the Pennsylvania PA-40 ES estimated payment vouchers (with the REV-414 worksheet to figure the amount) to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through myPATH. This is separate from your federal estimates to the IRS.",
      },
      {
        q: "What can Pennsylvania gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking. Pennsylvania has its own rules for net-profits expenses, so confirm how each deduction is treated at the state level.",
      },
    ],
  },
  {
    slug: "new-jersey-gig-worker-taxes",
    state: "New Jersey",
    stateAdjective: "New Jersey",
    eyebrow: "State Gig Tax Guide",
    title:
      "New Jersey Gig Worker Taxes: Progressive State Tax + Federal SE Tax",
    metaDescription:
      "New Jersey gig worker taxes: the 15.3% federal SE tax plus NJ's progressive state income tax, with Form NJ-1040-ES estimates. Not tax advice.",
    h1: "New Jersey Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in New Jersey, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because New Jersey has its own income tax, you also owe state income tax on your net earnings. Here's how it works and how to keep the bill as low as legally possible.",
    hasStateIncomeTax: true,
    stateHeading: "Does New Jersey have a state income tax for gig workers?",
    stateBody: [
      "Yes. New Jersey levies a progressive personal income tax, with rates that climb across brackets as income rises. Most gig workers sit in the lower-to-middle brackets, but your net gig profit is added to your other New Jersey income and taxed at your marginal state rate on top of federal income tax and the 15.3% federal self-employment tax. Brackets and rates change, so confirm the current figures with the New Jersey Division of Taxation.",
      "New Jersey has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay state income tax on your net earnings. New Jersey also taxes net profits from a business somewhat differently from federal Schedule C, so the income figure on your state return may not match your federal one exactly.",
      "Pay New Jersey estimated income tax to the Division of Taxation using Form NJ-1040-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS.",
    ],
    stateResources: [NJ_TAX, NJ_1040ES],
    faqs: [
      {
        q: "Do New Jersey gig workers pay state income tax?",
        a: "Yes. New Jersey has a progressive state income tax that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates to the Division of Taxation using Form NJ-1040-ES. Confirm the current brackets with the Division of Taxation.",
      },
      {
        q: "How much should I set aside for taxes in New Jersey?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the New Jersey income tax rate for gig workers?",
        a: "New Jersey uses a progressive income tax, so your rate depends on your total income and bracket rather than a single flat percentage. Most gig workers fall in the lower-to-middle brackets. Always confirm the current brackets and rates with the New Jersey Division of Taxation.",
      },
      {
        q: "How do I pay New Jersey estimated taxes as a gig worker?",
        a: "Use New Jersey Form NJ-1040-ES to pay state estimated income tax to the Division of Taxation, generally four times a year alongside your federal estimates. You can pay online through the state's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can New Jersey gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, along with the business-use share of your phone, supplies, tolls, and parking. New Jersey computes business net profit under its own rules, so how a deduction lowers your state tax can differ from the federal treatment — confirm specifics with the Division of Taxation.",
      },
    ],
  },
  {
    slug: "arizona-gig-worker-taxes",
    state: "Arizona",
    stateAdjective: "Arizona",
    eyebrow: "State Gig Tax Guide",
    title: "Arizona Gig Worker Taxes: Flat 2.5% State Tax + Federal SE Tax",
    metaDescription:
      "Arizona gig worker taxes: a flat 2.5% state income tax plus the 15.3% federal SE tax, with Form 140ES estimates and mileage deductions. Not tax advice.",
    h1: "Arizona Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Arizona, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Arizona levies a flat state income tax, you also owe state income tax on your net earnings. The low flat rate keeps the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Arizona have a state income tax for gig workers?",
    stateBody: [
      "Yes. Arizona taxes individual income at a single flat rate of 2.5% — one of the lowest state income tax rates in the country. Your net gig profit is taxed at that flat rate on top of federal income tax and the 15.3% federal self-employment tax. Rates can change, so confirm the current figure with the Arizona Department of Revenue.",
      "Arizona has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Because the rate is flat rather than progressive, the same percentage applies regardless of how much you earn, which makes the state portion simple to estimate.",
      "Pay Arizona estimated income tax to the Department of Revenue using Form 140ES, generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS.",
    ],
    stateResources: [AZ_DOR, AZ_140ES],
    faqs: [
      {
        q: "Do Arizona gig workers pay state income tax?",
        a: "Yes. Arizona has a flat 2.5% state income tax that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form 140ES. Confirm the current rate with the Arizona Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Arizona?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the Arizona income tax rate for gig workers?",
        a: "Arizona uses a single flat individual income tax rate of 2.5% — among the lowest in the nation. Because it's flat rather than progressive, the same percentage applies to your net gig earnings no matter your income level. Always confirm the current rate with the Arizona Department of Revenue.",
      },
      {
        q: "How do I pay Arizona estimated taxes as a gig worker?",
        a: "Use Arizona Form 140ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through AZTaxes.gov. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Arizona gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — which lower your federal taxable income, the starting point Arizona uses with state adjustments.",
      },
    ],
  },
  {
    slug: "ohio-gig-worker-taxes",
    state: "Ohio",
    stateAdjective: "Ohio",
    eyebrow: "State Gig Tax Guide",
    title: "Ohio Gig Worker Taxes: State & Local Income Tax + Federal SE Tax",
    metaDescription:
      "Ohio gig worker taxes: the 15.3% federal SE tax plus Ohio's state income tax and possible city municipal tax, with Form IT 1040ES estimates. Not tax advice.",
    h1: "Ohio Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Ohio, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Ohio has its own income tax (plus a local municipal income tax in many cities), you also owe state, and possibly city, income tax on your net earnings. Here's how it stacks up.",
    hasStateIncomeTax: true,
    stateHeading: "Does Ohio have a state income tax for gig workers?",
    stateBody: [
      "Yes. Ohio levies a progressive personal income tax, though the brackets are structured so that lower earners may owe little or no state income tax — Ohio exempts income below a set threshold. Above that, your net gig profit is taxed at your marginal Ohio rate on top of federal income tax and the 15.3% federal self-employment tax. Brackets and the exemption threshold change, so confirm current figures with the Ohio Department of Taxation.",
      "Many Ohio cities and villages also levy a local municipal income tax — commonly in the 1.5%–3% range — that can apply to self-employment net profits where you live or work. This local tax is administered separately from the state, often through RITA or CCA or the city directly, so check your municipality's rate and filing rules.",
      "Pay Ohio state estimated income tax to the Department of Taxation using Form IT 1040ES, generally on the same quarterly schedule as your federal estimates. Any municipal estimates are paid separately to your city or its tax administrator. Both are separate from the federal estimates you send the IRS.",
    ],
    stateResources: [OH_TAX, OH_IT1040ES],
    faqs: [
      {
        q: "Do Ohio gig workers pay state income tax?",
        a: "Often, yes — but not always. Ohio has a progressive state income tax with an exemption for income below a set threshold, so very low earners may owe little or none. Above that, it applies to your net gig earnings on top of federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form IT 1040ES.",
      },
      {
        q: "How much should I set aside for taxes in Ohio?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Ohio gig workers owe city income tax too?",
        a: "Often, yes. Many Ohio cities and villages levy a local municipal income tax — commonly around 1.5%–3% — that can apply to self-employment net profits on top of state and federal tax. It's administered separately (frequently through RITA or CCA), so confirm your municipality's rate and filing requirements.",
      },
      {
        q: "How do I pay Ohio estimated taxes as a gig worker?",
        a: "Use Ohio Form IT 1040ES to pay state estimated income tax to the Department of Taxation, generally four times a year alongside your federal estimates, with any local municipal estimates paid separately to your city or its administrator. You can pay the state portion online through the Department of Taxation. This is separate from your federal estimates to the IRS.",
      },
      {
        q: "What can Ohio gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking. These lower your federal taxable income, the starting point Ohio uses with state adjustments; municipal taxes may treat net profits under their own rules.",
      },
    ],
  },
  {
    slug: "north-carolina-gig-worker-taxes",
    state: "North Carolina",
    stateAdjective: "North Carolina",
    eyebrow: "State Gig Tax Guide",
    title: "North Carolina Gig Worker Taxes: Flat State Tax + Federal SE Tax",
    metaDescription:
      "North Carolina gig worker taxes: a flat state income tax (around 4.5%, declining) plus the 15.3% federal SE tax, with Form NC-40 estimates. Not tax advice.",
    h1: "North Carolina Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in North Carolina, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because North Carolina levies a flat state income tax, you also owe state income tax on your net earnings. The flat rate keeps the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading:
      "Does North Carolina have a state income tax for gig workers?",
    stateBody: [
      "Yes. North Carolina taxes individual income at a single flat rate — roughly 4.5% in recent tax years, with scheduled reductions that are gradually lowering the rate — so confirm the current figure with the North Carolina Department of Revenue. Your net gig profit is taxed at that flat rate on top of federal income tax and the 15.3% federal self-employment tax.",
      "North Carolina has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Because the rate is flat rather than progressive, the same percentage applies regardless of how much you earn, which makes estimating the state portion straightforward.",
      "Pay North Carolina estimated income tax to the Department of Revenue using Form NC-40, generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS.",
    ],
    stateResources: [NC_DOR, NC_NC40],
    faqs: [
      {
        q: "Do North Carolina gig workers pay state income tax?",
        a: "Yes. North Carolina has a flat state income tax — about 4.5% in recent years and declining under scheduled reductions — that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form NC-40. Confirm the current rate with the North Carolina Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in North Carolina?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the North Carolina income tax rate for gig workers?",
        a: "North Carolina uses a single flat individual income tax rate — roughly 4.5% recently — and that rate is scheduled to keep declining. Because it's flat, the same percentage applies to your net gig earnings no matter your income level. Always confirm the current rate with the North Carolina Department of Revenue.",
      },
      {
        q: "How do I pay North Carolina estimated taxes as a gig worker?",
        a: "Use North Carolina Form NC-40 to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's website. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can North Carolina gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — which lower your federal taxable income, the starting point North Carolina uses with state adjustments.",
      },
    ],
  },
  {
    slug: "michigan-gig-worker-taxes",
    state: "Michigan",
    stateAdjective: "Michigan",
    eyebrow: "State Gig Tax Guide",
    title: "Michigan Gig Worker Taxes: Flat State & Local Tax + Federal SE Tax",
    metaDescription:
      "Michigan gig worker taxes: a flat state income tax (around 4.25%) plus possible city tax and the 15.3% federal SE tax, with Form MI-1040ES. Not tax advice.",
    h1: "Michigan Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Michigan, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Michigan levies a flat state income tax (with a local city income tax in some cities), you also owe state, and possibly city, income tax on your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Michigan have a state income tax for gig workers?",
    stateBody: [
      "Yes. Michigan taxes individual income at a flat rate of roughly 4.25% (the rate has varied slightly year to year, so confirm the current figure with the Michigan Department of Treasury). Your net gig profit is taxed at that flat state rate on top of federal income tax and the 15.3% federal self-employment tax.",
      "Michigan has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Note that some Michigan cities (such as Detroit, Grand Rapids, and others) also levy a local city income tax that can apply to self-employment net profits; check whether the city where you live or work imposes one and at what rate.",
      "Pay Michigan estimated income tax to the Department of Treasury using Form MI-1040ES, generally on the same quarterly schedule as your federal estimates. Any city estimates are filed separately with that city. Both are separate from the federal estimates you send the IRS.",
    ],
    stateResources: [MI_TREASURY, MI_1040ES],
    faqs: [
      {
        q: "Do Michigan gig workers pay state income tax?",
        a: "Yes. Michigan has a flat state income tax of roughly 4.25% that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form MI-1040ES. Confirm the current rate with the Michigan Department of Treasury.",
      },
      {
        q: "How much should I set aside for taxes in Michigan?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Michigan gig workers owe city income tax too?",
        a: "Sometimes. Several Michigan cities — including Detroit and Grand Rapids — levy a local city income tax that can apply to self-employment net profits on top of the flat state tax. Rates and rules vary by city, so confirm whether the city where you live or work imposes one and at what rate.",
      },
      {
        q: "How do I pay Michigan estimated taxes as a gig worker?",
        a: "Use Michigan Form MI-1040ES to pay state estimated income tax to the Department of Treasury, generally four times a year alongside your federal estimates, with any city estimates filed separately with that city. You can pay the state portion online through Michigan Treasury Online. This is separate from your federal estimates to the IRS.",
      },
      {
        q: "What can Michigan gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking. These lower your federal taxable income, the starting point Michigan uses with state adjustments; city taxes may treat net profits under their own rules.",
      },
    ],
  },
  {
    slug: "colorado-gig-worker-taxes",
    state: "Colorado",
    stateAdjective: "Colorado",
    eyebrow: "State Gig Tax Guide",
    title: "Colorado Gig Worker Taxes: Flat 4.4% State Tax + Federal SE Tax",
    metaDescription:
      "Colorado gig worker taxes: a flat state income tax (around 4.4%) plus the 15.3% federal SE tax, with Form DR 0104EP estimates. Not tax advice.",
    h1: "Colorado Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Colorado, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Colorado levies a flat state income tax, you also owe state income tax on your net earnings. The flat rate keeps the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Colorado have a state income tax for gig workers?",
    stateBody: [
      "Yes. Colorado taxes individual income at a single flat rate of roughly 4.4% (the rate can be adjusted, including temporary reductions, so confirm the current figure with the Colorado Department of Revenue). Colorado's flat tax is applied to your federal taxable income with state adjustments, so your net gig profit flows through to the state calculation on top of federal income tax and the 15.3% federal self-employment tax.",
      "Colorado has no separate state self-employment tax — the 15.3% SE tax is federal only — but you still report and pay the flat state income tax on your net earnings. Because the rate is flat rather than progressive, the same percentage applies regardless of how much you earn, which makes estimating the state portion straightforward.",
      "Pay Colorado estimated income tax to the Department of Revenue using Form DR 0104EP, generally on the same quarterly schedule as your federal estimates. This is separate from the federal estimated payments you send the IRS.",
    ],
    stateResources: [CO_DOR, CO_DR0104EP],
    faqs: [
      {
        q: "Do Colorado gig workers pay state income tax?",
        a: "Yes. Colorado has a flat state income tax of roughly 4.4% that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. You pay state estimates using Form DR 0104EP. Confirm the current rate with the Colorado Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Colorado?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the Colorado income tax rate for gig workers?",
        a: "Colorado uses a single flat individual income tax rate of roughly 4.4%, applied to federal taxable income with state adjustments. The rate can be adjusted (including temporary reductions tied to state revenue), so always confirm the current figure with the Colorado Department of Revenue.",
      },
      {
        q: "How do I pay Colorado estimated taxes as a gig worker?",
        a: "Use Colorado Form DR 0104EP to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through Colorado's Revenue Online portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Colorado gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — which lower your federal taxable income, the starting point Colorado's flat tax is built on.",
      },
    ],
  },
];

export function getStateTaxGuide(slug: string): StateTaxGuide | undefined {
  return STATE_TAX_GUIDES.find(g => g.slug === slug);
}
