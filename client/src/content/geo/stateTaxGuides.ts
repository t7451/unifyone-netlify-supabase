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
];

export function getStateTaxGuide(slug: string): StateTaxGuide | undefined {
  return STATE_TAX_GUIDES.find(g => g.slug === slug);
}
