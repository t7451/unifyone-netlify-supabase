/**
 * routeSeo.ts — per-route SEO metadata for non-SEO-landing routes.
 *
 * These routes set their real <title>/<meta description> at runtime via React
 * Helmet / the SEO head component, which no-JS crawlers never execute — so the
 * static prerender (vite-plugin-prerender-seo) previously fell back to the
 * homepage's title + description on all of them (duplicate titles, generic
 * descriptions). This registry gives the prerender per-route meta so each
 * static HTML file ships its own accurate, aligned, ≤158-char description and a
 * unique title. Values mirror each page's real on-page meta.
 *
 * Keep every `description` ≤158 characters (Ahrefs/Google snippet limit).
 */
export interface RouteSeo {
  path: string;
  title: string;
  description: string;
  /**
   * Optional pre-hydration body paragraphs. The prerender renders these (plus a
   * unique h1 and an internal-links nav) into the static HTML so crawlers see
   * real per-page content. When omitted, the description is used as the intro.
   */
  body?: string[];
  /**
   * Optional authoritative outbound links rendered (crawler-visible) into the
   * prerendered page — used where genuinely relevant (e.g. IRS pages for tax
   * tools, platform sites for gig tools) to give each page a real outbound
   * link profile and improve E-E-A-T.
   */
  externalLinks?: { label: string; url: string }[];
}

// Reusable authoritative outbound links.
const IRS = {
  mileage: {
    label: "IRS standard mileage rates",
    url: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
  },
  estimated: {
    label: "IRS estimated taxes",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
  },
  seTax: {
    label: "IRS self-employment tax",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
  },
  selfEmployedCenter: {
    label: "IRS Self-Employed Individuals Tax Center",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
};
const PLATFORMS = [
  { label: "DoorDash", url: "https://www.doordash.com" },
  { label: "Uber Eats", url: "https://www.ubereats.com" },
  { label: "Instacart", url: "https://www.instacart.com" },
];

// Authoritative resources for the platform-specific tax guides: the IRS
// self-employed center + estimated taxes, plus the relevant platform site.
const DOORDASH_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "DoorDash", url: "https://www.doordash.com" },
];
const UBER_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Uber", url: "https://www.uber.com" },
];
const INSTACART_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Instacart", url: "https://www.instacart.com" },
];

// ── Gig-tax cluster: state guides, platform comparisons, explainers ──────────
// State tax-agency links for the state-level gig-worker tax guides. Each guide
// pairs the IRS self-employed/estimated/SE-tax links with its state's agency so
// the prerendered page ships an authoritative outbound link profile.
const CA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "California Franchise Tax Board (Form 540-ES)",
    url: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
  },
];
const TX_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Texas Comptroller", url: "https://comptroller.texas.gov/" },
];
const FL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Florida Department of Revenue",
    url: "https://floridarevenue.com/",
  },
];
const NY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "NY Dept. of Taxation and Finance (Form IT-2105)",
    url: "https://www.tax.ny.gov/pit/estimated_tax/default.htm",
  },
];
const IL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Illinois Department of Revenue (Form IL-1040-ES)",
    url: "https://tax.illinois.gov/individuals/estimatedpayments.html",
  },
];
const WA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Washington Department of Revenue",
    url: "https://dor.wa.gov/",
  },
];
const GA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Georgia Department of Revenue (Form 500-ES)",
    url: "https://dor.georgia.gov/500-es-individual-and-fiduciary-estimated-tax-payment-voucher",
  },
];
const PA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Pennsylvania Department of Revenue (Form PA-40 ES)",
    url: "https://www.pa.gov/agencies/revenue/forms-and-publications.html",
  },
];
const NJ_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "NJ Division of Taxation (Form NJ-1040-ES)",
    url: "https://www.nj.gov/treasury/taxation/njit20.shtml",
  },
];
const AZ_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Arizona Department of Revenue (Form 140ES)",
    url: "https://azdor.gov/forms/individual/individual-estimated-tax-payment-form",
  },
];
const OH_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Ohio Department of Taxation (Form IT 1040ES)",
    url: "https://tax.ohio.gov/individual/resources/estimated-payments",
  },
];
const NC_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "North Carolina Department of Revenue (Form NC-40)",
    url: "https://www.ncdor.gov/taxes-forms/individual-income-tax/estimated-income-tax",
  },
];
const MI_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Michigan Department of Treasury (Form MI-1040ES)",
    url: "https://www.michigan.gov/taxes/iit/estimated-payments",
  },
];
const CO_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Colorado Department of Revenue (Form DR 0104EP)",
    url: "https://tax.colorado.gov/individual-income-tax-estimated-payments",
  },
];

// Authoritative resources for the gig platform comparison guides. The IRS
// self-employed center + estimated taxes anchor the (educational, not advice)
// tax framing; the two platform sites being compared give each page a real,
// relevant outbound link profile.
const PLATFORM_LINKS = {
  doordash: { label: "DoorDash", url: "https://www.doordash.com" },
  uberEats: { label: "Uber Eats", url: "https://www.ubereats.com" },
  uber: { label: "Uber", url: "https://www.uber.com" },
  lyft: { label: "Lyft", url: "https://www.lyft.com" },
  instacart: { label: "Instacart", url: "https://www.instacart.com" },
  grubhub: { label: "Grubhub", url: "https://www.grubhub.com" },
  amazonFlex: { label: "Amazon Flex", url: "https://flex.amazon.com" },
  spark: { label: "Walmart Spark", url: "https://drive4spark.walmart.com" },
  shipt: { label: "Shipt", url: "https://www.shipt.com" },
};
const DOORDASH_VS_UBER_EATS_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.uberEats,
];
const INSTACART_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.instacart,
  PLATFORM_LINKS.doordash,
];
const UBER_VS_LYFT_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uber,
  PLATFORM_LINKS.lyft,
];
const DOORDASH_VS_GRUBHUB_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.grubhub,
];
const AMAZON_FLEX_VS_SPARK_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.amazonFlex,
  PLATFORM_LINKS.spark,
];
const INSTACART_VS_SHIPT_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.instacart,
  PLATFORM_LINKS.shipt,
];

// Additional platform-specific tax-guide link bundles (Amazon Flex, Grubhub,
// Lyft, Spark, Shipt) — IRS resources + the relevant platform's driver site.
const AMAZON_FLEX_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Amazon Flex", url: "https://flex.amazon.com" },
];
const GRUBHUB_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Grubhub for Drivers", url: "https://driver.grubhub.com" },
];
const LYFT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Lyft", url: "https://www.lyft.com" },
];
const SPARK_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Spark Driver", url: "https://drive4spark.walmart.com" },
];
const SHIPT_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Shipt", url: "https://www.shipt.com" },
];

// Getting-started ("how to make money on <platform>") guides: the platform's
// own signup/driver page anchors each page's outbound profile, paired with the
// IRS self-employed center so the (educational, not advice) tax framing is
// authoritative. No earnings figures are quoted on these pages.
const DOORDASH_START_LINKS = [
  { label: "Become a Dasher (DoorDash)", url: "https://dasher.doordash.com" },
  PLATFORM_LINKS.doordash,
  IRS.selfEmployedCenter,
];
const UBER_START_LINKS = [
  { label: "Drive with Uber", url: "https://www.uber.com/us/en/drive/" },
  PLATFORM_LINKS.uber,
  IRS.selfEmployedCenter,
];
const INSTACART_START_LINKS = [
  {
    label: "Become an Instacart shopper",
    url: "https://shoppers.instacart.com",
  },
  PLATFORM_LINKS.instacart,
  IRS.selfEmployedCenter,
];
const AMAZON_FLEX_START_LINKS = [
  { label: "Sign up for Amazon Flex", url: "https://flex.amazon.com" },
  PLATFORM_LINKS.amazonFlex,
  IRS.selfEmployedCenter,
];

export const ROUTE_SEO: RouteSeo[] = [
  {
    path: "/amazon-flex-taxes",
    externalLinks: AMAZON_FLEX_TAX_LINKS,
    title:
      "Amazon Flex Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Amazon Flex taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Amazon Flex pays you as an independent contractor, so no taxes are withheld from your delivery blocks. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Amazon issues a 1099-NEC through its tax-document portal. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven during a block, including between stops. Phone use, tolls, parking, and supplies are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/grubhub-taxes",
    externalLinks: GRUBHUB_TAX_LINKS,
    title:
      "Grubhub Taxes: A Driver's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Grubhub taxes work for drivers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "Grubhub pays you as an independent contractor, so nothing is withheld from your delivery pay. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, Grubhub issues a 1099-NEC through its payment processor. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. Phone use, insulated bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/lyft-driver-taxes",
    externalLinks: LYFT_TAX_LINKS,
    title:
      "Lyft Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates | UnifyOne",
    description:
      "Lyft driver taxes explained: the 1099-K vs 1099-NEC, your Annual Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    body: [
      "Lyft treats drivers as independent contractors and withholds no taxes, so you owe income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Lyft may send two forms: a 1099-K for the gross fares riders paid, and a 1099-NEC for bonuses, referrals, and incentives. Your Lyft Annual Summary reconciles both — and you must report all earnings regardless of which forms arrive.",
      "Business mileage at the IRS standard mileage rate is usually the biggest deduction, and because Lyft reports only online miles, your real deductible mileage is often higher. Service fees, phone use, tolls, and rider amenities are deductible too.",
      "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/spark-driver-taxes",
    externalLinks: SPARK_TAX_LINKS,
    title: "Spark Driver Taxes: A Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How Walmart Spark driver taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "The Walmart Spark Driver program pays you as an independent contractor, so no taxes are withheld from your deliveries. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "If you earned $600 or more, the Spark Driver program issues a 1099-NEC through its payment partner. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. Phone use, insulated bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/shipt-shopper-taxes",
    externalLinks: SHIPT_TAX_LINKS,
    title: "Shipt Taxes: A Shopper's Guide to 1099s & Deductions | UnifyOne",
    description:
      "Shipt taxes for shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    body: [
      "Shipt shoppers are independent contractors, so Shipt withholds no taxes from your pay. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings.",
      "Shoppers who earned $600 or more receive a 1099-NEC, usually delivered through Shipt's payment processor by late January. You must report all income whether or not a form arrives.",
      "Because you both shop and drive, track every working mile and deduct it at the IRS standard mileage rate — typically the largest deduction — plus phone use, insulated bags, tolls, and parking. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/california-gig-worker-taxes",
    externalLinks: CA_TAX_LINKS,
    title:
      "California Gig Worker Taxes: SE Tax, State Income Tax & Estimates | UnifyOne",
    description:
      "California gig worker taxes: the 15.3% federal SE tax plus CA state income tax, FTB estimated payments (Form 540-ES), mileage deductions. Not tax advice.",
    body: [
      "Gig platforms pay California workers as independent contractors and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "California also has a progressive state income tax, with rates reaching roughly 13.3% at the very top, that applies to your net gig profit on top of federal tax. Pay California estimates to the Franchise Tax Board using Form 540-ES.",
      "Your biggest deduction is business mileage at the IRS standard mileage rate, alongside the business-use share of your phone, supplies, tolls, and parking. App-based drivers are generally treated as independent contractors under Proposition 22.",
      "Federal and California estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/texas-gig-worker-taxes",
    externalLinks: TX_TAX_LINKS,
    title:
      "Texas Gig Worker Taxes: No State Income Tax, but SE Tax Still Applies | UnifyOne",
    description:
      "Texas gig worker taxes: there's no Texas state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Texas has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Track business mileage and deduct it at the IRS standard mileage rate — usually the largest deduction — along with the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not you get a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/florida-gig-worker-taxes",
    externalLinks: FL_TAX_LINKS,
    title:
      "Florida Gig Worker Taxes: No State Income Tax, Federal & SE Tax Only | UnifyOne",
    description:
      "Florida gig worker taxes: no Florida state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Florida has no personal state income tax, so there's no state income-tax return on your gig earnings and no state estimated payments to make.",
      "Federal taxes still apply the same as everywhere else: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking. You must report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-york-gig-worker-taxes",
    externalLinks: NY_TAX_LINKS,
    title:
      "New York Gig Worker Taxes: State & NYC Income Tax, SE Tax, IT-2105 | UnifyOne",
    description:
      "New York gig worker taxes: the 15.3% federal SE tax plus NY state income tax (and NYC local tax for city residents), estimated via Form IT-2105. Not advice.",
    body: [
      "New York gig platforms pay you as an independent contractor with nothing withheld, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "New York also levies a progressive state income tax on your net gig profit, and New York City residents owe an additional NYC local income tax on the same earnings. Pay state estimates to the Department of Taxation and Finance using Form IT-2105.",
      "Your largest deduction is business mileage at the IRS standard mileage rate, plus the business-use share of your phone, supplies, tolls, and parking — lowering both federal and New York taxable income.",
      "Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/illinois-gig-worker-taxes",
    externalLinks: IL_TAX_LINKS,
    title:
      "Illinois Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Illinois gig worker taxes: a flat state income tax (around 4.95%) plus the 15.3% federal SE tax, with IL-1040-ES estimates. Not tax advice.",
    body: [
      "Illinois gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Illinois has a flat state income tax of roughly 4.95% (confirm the current rate with the Illinois Department of Revenue) that applies to your net gig profit on top of federal tax. Pay state estimates using Form IL-1040-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal and Illinois taxable income.",
      "Federal and Illinois estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/washington-gig-worker-taxes",
    externalLinks: WA_TAX_LINKS,
    title:
      "Washington Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Washington gig worker taxes: no personal state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Washington has no personal state income tax, so you won't file a state income-tax return on your ordinary gig earnings and there are no state income-tax estimates to make.",
      "Federal taxes still apply in full: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/georgia-gig-worker-taxes",
    externalLinks: GA_TAX_LINKS,
    title:
      "Georgia Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Georgia gig worker taxes: a flat state income tax (around 5.39%, phasing down) plus the 15.3% federal SE tax, with Form 500-ES estimates. Not tax advice.",
    body: [
      "Georgia gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Georgia has a flat state income tax — roughly 5.39% in recent years and being phased down under scheduled reductions, so confirm the current rate with the Georgia Department of Revenue — that applies to your net gig profit on top of federal tax. Pay state estimates using Form 500-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal taxable income and Georgia's.",
      "Federal and Georgia estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/pennsylvania-gig-worker-taxes",
    externalLinks: PA_TAX_LINKS,
    title:
      "Pennsylvania Gig Worker Taxes: Flat 3.07% Tax + Federal SE Tax | UnifyOne",
    description:
      "Pennsylvania gig worker taxes: a flat 3.07% state income tax plus the 15.3% federal SE tax, with PA-40 ES estimates and possible local EIT. Not tax advice.",
    body: [
      "Pennsylvania gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Pennsylvania has a flat state income tax of 3.07% that applies to your net gig profit on top of federal tax; confirm the current rate with the Pennsylvania Department of Revenue. Pay state estimates using the PA-40 ES vouchers.",
      "Many Pennsylvania municipalities and school districts also levy a local earned-income tax (EIT), commonly around 1%, that can apply to self-employment net profits — check your local rate with your municipality or its appointed tax collector.",
      "Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-jersey-gig-worker-taxes",
    externalLinks: NJ_TAX_LINKS,
    title:
      "New Jersey Gig Worker Taxes: Progressive State Tax + Federal SE Tax | UnifyOne",
    description:
      "New Jersey gig worker taxes: the 15.3% federal SE tax plus NJ's progressive state income tax, with Form NJ-1040-ES estimates. Not tax advice.",
    body: [
      "New Jersey gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "New Jersey has a progressive state income tax that applies to your net gig profit on top of federal tax; your rate depends on your total income and bracket, so confirm the current brackets with the New Jersey Division of Taxation. Pay state estimates using Form NJ-1040-ES.",
      "New Jersey computes business net profit under its own rules, so the income figure on your state return may differ from your federal Schedule C. Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking.",
      "Federal and New Jersey estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/arizona-gig-worker-taxes",
    externalLinks: AZ_TAX_LINKS,
    title:
      "Arizona Gig Worker Taxes: Flat 2.5% State Tax + Federal SE Tax | UnifyOne",
    description:
      "Arizona gig worker taxes: a flat 2.5% state income tax plus the 15.3% federal SE tax, with Form 140ES estimates and mileage deductions. Not tax advice.",
    body: [
      "Arizona gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Arizona has a flat state income tax of 2.5% — one of the lowest in the country — that applies to your net gig profit on top of federal tax. Confirm the current rate with the Arizona Department of Revenue, and pay state estimates using Form 140ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal taxable income and Arizona's.",
      "Federal and Arizona estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/ohio-gig-worker-taxes",
    externalLinks: OH_TAX_LINKS,
    title:
      "Ohio Gig Worker Taxes: State & Local Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Ohio gig worker taxes: the 15.3% federal SE tax plus Ohio's state income tax and possible city municipal tax, with Form IT 1040ES estimates. Not tax advice.",
    body: [
      "Ohio gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Ohio has a progressive state income tax with an exemption for income below a set threshold, so low earners may owe little or none; above that it applies to your net gig profit on top of federal tax. Confirm current figures with the Ohio Department of Taxation, and pay state estimates using Form IT 1040ES.",
      "Many Ohio cities also levy a local municipal income tax — commonly around 1.5%–3% — that can apply to self-employment net profits, administered separately (often through RITA or CCA). Check your municipality's rate and filing rules.",
      "Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/north-carolina-gig-worker-taxes",
    externalLinks: NC_TAX_LINKS,
    title:
      "North Carolina Gig Worker Taxes: Flat State Tax + Federal SE Tax | UnifyOne",
    description:
      "North Carolina gig worker taxes: a flat state income tax (around 4.5%, declining) plus the 15.3% federal SE tax, with Form NC-40 estimates. Not tax advice.",
    body: [
      "North Carolina gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "North Carolina has a flat state income tax — roughly 4.5% in recent years and declining under scheduled reductions — that applies to your net gig profit on top of federal tax. Confirm the current rate with the North Carolina Department of Revenue, and pay state estimates using Form NC-40.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal taxable income and North Carolina's.",
      "Federal and North Carolina estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/michigan-gig-worker-taxes",
    externalLinks: MI_TAX_LINKS,
    title:
      "Michigan Gig Worker Taxes: Flat State & Local Tax + Federal SE Tax | UnifyOne",
    description:
      "Michigan gig worker taxes: a flat state income tax (around 4.25%) plus possible city tax and the 15.3% federal SE tax, with Form MI-1040ES. Not tax advice.",
    body: [
      "Michigan gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Michigan has a flat state income tax of roughly 4.25% that applies to your net gig profit on top of federal tax. Confirm the current rate with the Michigan Department of Treasury, and pay state estimates using Form MI-1040ES.",
      "Some Michigan cities — including Detroit and Grand Rapids — also levy a local city income tax that can apply to self-employment net profits, filed separately with that city. Check whether the city where you live or work imposes one and at what rate.",
      "Deduct business mileage at the IRS standard mileage rate plus the business-use share of your phone, supplies, tolls, and parking. Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/colorado-gig-worker-taxes",
    externalLinks: CO_TAX_LINKS,
    title:
      "Colorado Gig Worker Taxes: Flat 4.4% State Tax + Federal SE Tax | UnifyOne",
    description:
      "Colorado gig worker taxes: a flat state income tax (around 4.4%) plus the 15.3% federal SE tax, with Form DR 0104EP estimates. Not tax advice.",
    body: [
      "Colorado gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Colorado has a flat state income tax of roughly 4.4%, applied to your federal taxable income with state adjustments, so your net gig profit flows through on top of federal tax. The rate can be adjusted, so confirm the current figure with the Colorado Department of Revenue, and pay state estimates using Form DR 0104EP.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering the federal taxable income Colorado's flat tax is built on.",
      "Federal and Colorado estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/doordash-vs-uber-eats",
    externalLinks: DOORDASH_VS_UBER_EATS_LINKS,
    title: "DoorDash vs Uber Eats: Which Pays More for Drivers? | UnifyOne",
    description:
      "DoorDash vs Uber Eats compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "DoorDash and Uber Eats both pay couriers as independent contractors, so neither withholds taxes and your take-home depends far more on your market and hours than on the app. There's no universal winner — the only number that matters is what you net per hour, which we show you how to compute rather than quoting figures that go stale.",
      "Both apps are per-offer: each delivery shows a base or upfront amount plus promotions and tips before you accept. DoorDash adds Peak Pay and Challenges in busy periods; Uber Eats adds Surge/Boost zones and Quests. Neither deducts the restaurant's commission from your courier pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, DoorDash issues a 1099-NEC if you earn $600 or more in a year. Uber may issue a 1099-NEC for incentives and referrals plus a 1099-K for processed delivery fares, with thresholds that change yearly. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare them honestly, run a few similar shifts on each, track your active hours and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do that math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/instacart-vs-doordash",
    externalLinks: INSTACART_VS_DOORDASH_LINKS,
    title: "Instacart vs DoorDash: Which Is Better for Gig Workers? | UnifyOne",
    description:
      "Instacart vs DoorDash compared on how pay works (batches vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to compute your net pay.",
    body: [
      "Instacart and DoorDash are both independent-contractor gig apps, but the work differs: Instacart full-service shoppers shop a cart and deliver groceries, while DoorDash Dashers pick up and drop off prepared orders. That changes how pay is structured and what your time and mileage look like, so which one is better depends on your market and how you value your time — not on a single pay figure.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance plus tips, and your time includes shopping in-store. DoorDash pays per delivery offer with a base plus promotions and tips, and your time is mostly driving. Because Instacart batches include shopping time, compare them on net pay per active hour rather than per delivery.",
      "Both withhold no taxes and issue a 1099-NEC at $600 or more in earnings; Instacart in-store-only shoppers are W-2 employees instead, while full-service shoppers who also deliver get the 1099-NEC. You owe income tax plus the 15.3% self-employment tax on combined net earnings, and you must report all income even if no form arrives.",
      "To decide, work comparable shifts on each, log your active hours (shopping plus driving for Instacart) and your business miles, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this for you. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/uber-vs-lyft-driver",
    externalLinks: UBER_VS_LYFT_LINKS,
    title: "Uber vs Lyft: Which Is Better for Drivers? | UnifyOne",
    description:
      "Uber vs Lyft for drivers, compared on how pay works, fees, 1099-K vs 1099-NEC, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "Uber and Lyft are the two largest US rideshare platforms, and both pay drivers as independent contractors. The apps are structurally similar — upfront fares, surge-style bonuses, and weekly or instant payouts — so which one nets you more comes down to your local market, the hours you drive, and your vehicle costs rather than the brand.",
      "On both, you see an upfront estimated fare and trip details before accepting and keep 100% of tips, and both raise pay during high demand (Uber surge and promotions; Lyft Personal Power Zones and bonuses). Each takes a service fee out of every fare, which is a deductible business expense itemized on your Uber Tax Summary or Lyft Annual Summary.",
      "Both issue similar tax forms: a 1099-K reporting the gross ride fares processed through the platform, plus a 1099-NEC for incentives, referrals, and bonuses; reporting thresholds change by year. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income regardless of which forms you receive.",
      "To compare your own pay, drive comparable hours on each, log your active time and the business miles you drove (including miles between trips, which are often deductible), subtract fees, mileage, and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/doordash-vs-grubhub",
    externalLinks: DOORDASH_VS_GRUBHUB_LINKS,
    title: "DoorDash vs Grubhub: Which Pays More for Drivers? | UnifyOne",
    description:
      "DoorDash vs Grubhub compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "DoorDash and Grubhub both pay couriers as independent contractors to deliver prepared food, so neither withholds taxes and your take-home depends far more on your market and hours than on the app. There's no universal winner — the only number that matters is what you net per hour, which we show you how to compute rather than quoting figures that go stale.",
      "Both apps are per-offer: each delivery shows an amount plus promotions and tips before you accept. DoorDash shows a guaranteed base plus Peak Pay and Challenges; Grubhub calculates base pay from mileage and time and adds Special Offers and Missions. Neither deducts the restaurant's commission from your courier pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, both treat you as an independent contractor and issue a 1099-NEC if you earn $600 or more in a year — DoorDash through Stripe, Grubhub through its payment processor. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare them honestly, run a few similar shifts on each, track your active hours and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do that math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/amazon-flex-vs-spark",
    externalLinks: AMAZON_FLEX_VS_SPARK_LINKS,
    title: "Amazon Flex vs Spark: Which Delivery Gig Is Better? | UnifyOne",
    description:
      "Amazon Flex vs Walmart Spark compared on how pay works (blocks vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to find your net pay.",
    body: [
      "Amazon Flex and the Walmart Spark Driver program are both independent-contractor delivery gigs, but they're structured differently: Amazon Flex pays for reserved delivery blocks of a set length, while Spark pays per accepted delivery offer. That changes what your time and mileage look like, so which one is better depends on your market and how you value your time — not on a single pay figure.",
      "Amazon Flex shows an estimated total for a block before you reserve it, with tips added afterward on eligible deliveries; Spark shows an estimate plus tips on each offer before you accept. Neither deducts a separate platform commission from your driver pay, and both default to direct deposit, with instant cash-out availability that varies. Because a Flex block is a fixed time commitment, compare the two on net pay per active hour rather than per stop.",
      "On taxes, both pay you as an independent contractor with nothing withheld and issue a 1099-NEC if you earn $600 or more in a year — Amazon through its tax-document portal, Spark through its payment partner. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income whether or not a form arrives.",
      "To decide, work comparable shifts on each, log your active hours and the business miles you drove (including miles between stops), subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this for you. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/instacart-vs-shipt",
    externalLinks: INSTACART_VS_SHIPT_LINKS,
    title: "Instacart vs Shipt: Which Is Better for Shoppers? | UnifyOne",
    description:
      "Instacart vs Shipt compared on how pay works, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay as a shopper.",
    body: [
      "Instacart and Shipt are the two largest grocery-shopping gig apps, and both pay shoppers as independent contractors to shop a cart and deliver it. The work is similar — you shop in-store, then drive the order to the customer — so which one nets you more comes down to your market, the hours you work, and your vehicle costs rather than the brand.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance plus tips; Shipt pays per order with an estimate that factors in the order's effort, plus tips. Because both bundle shopping time into the job, compare them on net pay per active hour rather than per order. Neither deducts customer fees from your shopper pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, both pay you as an independent contractor and issue a 1099-NEC at $600 or more in earnings. One nuance: Instacart in-store-only shoppers are W-2 employees, while full-service shoppers who also deliver get the 1099-NEC; Shipt shoppers who deliver are independent contractors. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income even if no form arrives.",
      "To compare your own pay, work comparable shifts on each, log your active hours (shopping plus driving) and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/1099-nec-vs-1099-k",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated],
    title: "1099-NEC vs 1099-K: What Gig Workers Need to Know | UnifyOne",
    description:
      "1099-NEC vs 1099-K for gig workers: what each form is, who issues which, why thresholds change yearly, and how both flow onto Schedule C. Not tax advice.",
    body: [
      "Gig workers can receive a 1099-NEC, a 1099-K, both, or neither. A 1099-NEC reports nonemployee compensation — money a business paid you directly for your services, such as DoorDash or Instacart delivery earnings. A 1099-K reports the gross amount of payments settled through a third-party platform or card processor, like the fares riders pay through Uber or Lyft. The forms describe how money reached you, not whether it is taxable.",
      "Which form you get depends on how the platform pays you. DoorDash and Instacart generally issue a 1099-NEC; Uber and Lyft often send a 1099-K for gross fares plus a 1099-NEC for incentives and referrals. Their annual tax summaries reconcile the two so you can report each dollar once without double-counting overlapping amounts.",
      "The IRS reporting thresholds that decide whether a platform must issue a form change from year to year, especially for the 1099-K — so confirm the current figures on IRS.gov rather than relying on a number you read online. Critically, a threshold only governs whether a form is sent; it never changes whether income is taxable. If no form arrives, you still owe income tax and the 15.3% self-employment tax on your net profit.",
      "Both forms flow to the same place: gross income goes on Schedule C, where you subtract business expenses like the standard mileage deduction to reach net profit. That net profit carries to Schedule SE for self-employment tax and to Form 1040 for income tax. This page is educational, not tax advice — verify your situation with the IRS or a qualified professional.",
    ],
  },
  {
    path: "/how-to-file-gig-worker-taxes",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated, IRS.seTax],
    title: "How to File Taxes as a Gig Worker: Step-by-Step | UnifyOne",
    description:
      "File gig worker taxes step by step: gather 1099s, total income, complete Schedule C and Schedule SE, finish Form 1040, and set up quarterly payments.",
    body: [
      "Filing as a 1099 gig worker follows a predictable order. Start by gathering every 1099-NEC and 1099-K your platforms issued, plus your own earnings records and mileage log — then total your gross income and report all of it, even amounts under $600 or income that never generated a form.",
      "Report that income and your business deductions on Schedule C to arrive at your net profit. Deductions like business mileage at the IRS standard mileage rate, phone use, supplies, tolls, and platform fees lower the profit you're taxed on, so accurate year-round records matter.",
      "Calculate self-employment tax on Schedule SE — 15.3% (12.4% Social Security + 2.9% Medicare) on your net earnings — then carry your net profit and SE tax to Form 1040, where you deduct half of the self-employment tax. File a state return too if your state has an income tax.",
      "Going forward, the IRS generally expects quarterly estimated payments via Form 1040-ES if you'll owe $1,000 or more, due around April 15, June 15, September 15, and January 15. The annual return is generally due around April 15. You can file with IRS Free File, commercial software, or a tax professional.",
    ],
  },
  {
    path: "/gig-quarterly-taxes",
    externalLinks: [IRS.estimated, IRS.selfEmployedCenter, IRS.seTax],
    title:
      "Quarterly Estimated Taxes for Gig Workers: A Practical Guide | UnifyOne",
    description:
      "How quarterly estimated taxes work for gig workers: who pays, the four due dates, the safe-harbor rule, how to estimate and pay, and the underpayment penalty.",
    body: [
      "Gig platforms like DoorDash, Uber, and Instacart withhold no tax, so independent contractors pay the IRS in four installments through the year instead of once in April. As a general rule you should make estimated payments if you expect to owe $1,000 or more for the year after withholding and credits — and most gig workers do, because gig income carries both income tax and the 15.3% self-employment tax.",
      "Federal estimated taxes are due four times a year, with deadlines that usually fall around April 15, June 15, September 15, and January 15 of the following year. Each date shifts to the next business day when it lands on a weekend or holiday, so confirm the current year's exact dates with the IRS.",
      "To avoid an underpayment penalty, the safe-harbor rule says your payments and withholding should cover at least 90% of this year's tax or 100% of last year's tax — 110% if your prior-year adjusted gross income was over $150,000. Estimate each payment from your net earnings (income after deductions like mileage), then pay via IRS Direct Pay, EFTPS, or by mailing Form 1040-ES.",
      "If you fall short, the IRS charges an underpayment penalty calculated like interest on the amount underpaid for the time it was late, not a flat fine. This guide is educational information, not tax advice — confirm thresholds, due dates, and rates with the IRS or a qualified tax professional.",
    ],
  },
  {
    path: "/gig-worker-tax-deductions",
    externalLinks: [IRS.selfEmployedCenter, IRS.mileage, IRS.seTax],
    title: "Gig Worker Tax Deductions: The Complete Checklist | UnifyOne",
    description:
      "The business expenses gig workers most often miss: mileage, phone, hot bags, tolls, platform fees, health insurance, half of SE tax & home office.",
    body: [
      "Gig workers are taxed on profit, not gross payouts, so every legitimate business expense you track lowers the income you pay tax on. This checklist covers the deductions DoorDash, Uber, Instacart, and other 1099 workers most commonly miss.",
      "Business mileage is usually the largest deduction. You pick one method per vehicle for the year — the IRS standard mileage rate (70¢ per mile for 2025) or the actual-expense method for the business-use share of gas, insurance, repairs, and depreciation. You can't combine them, and the rate changes annually.",
      "Other commonly missed write-offs include the business-use share of your phone and data, hot bags and equipment, tolls and parking paid while working, platform service fees, supplies, the self-employed health insurance deduction, and the deductible half of the 15.3% self-employment tax. A home office is deductible only with a space used regularly and exclusively for the business.",
      "Deductions only count if you can substantiate them. Keep a contemporaneous mileage log noting the date, miles, and purpose of each trip, and save receipts for every expense. This is educational information, not tax advice — confirm current figures with the IRS or a tax professional.",
    ],
  },
  {
    path: "/architecture",
    title: "Architecture | UnifyOne by 1Commerce",
    description:
      "Explore UnifyOne's structural pillars — multi-tenant foundation, payment orchestration, automation mesh, social intelligence, and Kai AI.",
  },
  {
    path: "/the-system",
    title: "The System | UnifyOne",
    description:
      "How UnifyOne works: four sequential build phases, ten integrations, and six features that replace three separate SaaS tools.",
  },
  {
    path: "/pricing",
    title: "Pricing | UnifyOne",
    description:
      "UnifyOne pricing: Starter (free forever), Pro ($19/mo), and Scale ($99/mo). Multi-tenant commerce, AI insights, and every payment rail.",
  },
  {
    path: "/about",
    title: "About | UnifyOne by 1Commerce",
    description:
      "UnifyOne is built by 1Commerce (PNW Enterprises) — AI-powered, multi-tenant commerce infrastructure for gig operators and e-commerce teams.",
  },
  {
    path: "/press",
    title: "Press & Media Kit | UnifyOne by 1Commerce",
    description:
      "UnifyOne press and media kit: download brand logos, copy-paste boilerplate, company facts, and category tags. By 1Commerce LLC (PNW Enterprises).",
    body: [
      "UnifyOne is an AI-powered multi-tenant commerce platform by 1Commerce LLC (PNW Enterprises) of Canby, Oregon. This media kit gives press, software directories, and reviewers everything needed to cover or list us accurately.",
      "Download the brand logo (SVG and transparent PNG) and the boilerplate file with the canonical product name, 60-character, 160-character, and 80-word descriptions, category tags, and brand colors. For anything else, email support@1commerce.online.",
    ],
  },
  {
    path: "/contact",
    title: "Contact | UnifyOne",
    description:
      "Get in touch with the UnifyOne team at 1Commerce — questions on multi-tenant commerce, pricing, integrations, partnerships, and support.",
  },
  {
    path: "/tithes",
    title: "Tithes | UnifyOne",
    description:
      "UnifyOne's Tithes program and transparent pricing — Starter free, Pro $19/mo, Scale $99/mo, all driven by one canonical catalog.",
  },
  {
    path: "/documents",
    title: "Documentation | UnifyOne",
    description:
      "UnifyOne documentation — guides, integrations, case studies, and the full build timeline for the multi-tenant commerce platform.",
  },
  {
    path: "/documents/case-studies",
    title: "Case Studies | UnifyOne",
    description:
      "Detailed case studies of UnifyOne platform features: Cathedral Framework, Kai, multi-tenant architecture, Stripe CAPI bridge, and scroll reveals.",
  },
  {
    path: "/documents/integrations",
    title: "Integration Guides | UnifyOne",
    description:
      "Complete integration guides for UnifyOne — Kai, Claude, n8n, Stripe, PayPal, Square, and Shopify connections for operators.",
  },
  {
    path: "/documents/work-proof",
    title: "Build Timeline & Work Proof | UnifyOne",
    description:
      "Complete timeline of 36 development phases, deliverables, and technical achievements for the UnifyOne platform.",
  },
  {
    path: "/tools",
    title: "Free Tools for Gig Workers & Sellers | UnifyOne",
    description:
      "Free tools for 1099 gig workers: mileage, quarterly tax, earnings consolidation, break-even pricing, and cash-flow tracking. No account required.",
  },
  {
    path: "/blog",
    title: "Blog | UnifyOne by 1Commerce",
    description:
      "UnifyOne blog — multi-tenant commerce, gig-economy earnings, AI automation, and digital retail strategy for operators and e-commerce teams.",
  },
  {
    path: "/blog/gig-worker-shift-intelligence",
    title: "Gig Worker Shift Intelligence | UnifyOne Blog",
    description:
      "How shift intelligence turns DoorDash, Uber Eats, and Instacart history into higher net pay — the data gig workers need to optimize shifts.",
  },
  {
    path: "/tools/mileage-deduction-calculator",
    externalLinks: [IRS.mileage],
    title: "IRS Mileage Deduction Calculator for Gig Workers 2025 | UnifyOne",
    description:
      "Free IRS mileage deduction calculator for gig workers. Enter miles driven to see your $0.70/mile deduction and estimated tax savings at 4 federal brackets.",
    body: [
      "Every mile you drive for DoorDash, Uber Eats, Instacart, Amazon Flex, or any 1099 gig is deductible at the IRS standard mileage rate. This free calculator turns your miles into a dollar deduction and shows the estimated tax it saves across four common federal brackets.",
      "Enter your business miles for the year to see your total deduction and how much it lowers your taxable income. For drivers who want their mileage tracked automatically alongside real earnings, UnifyOne consolidates miles, payouts, and expenses in one place.",
    ],
  },
  {
    path: "/tools/quarterly-tax-estimator",
    externalLinks: [IRS.estimated],
    title: "Quarterly Estimated Tax Calculator — 1099 Self-Employed | UnifyOne",
    description:
      "Free 1099 quarterly tax calculator for gig workers. See your SE tax + income tax and exact quarterly payment amounts with 2026 due dates.",
    body: [
      "1099 gig workers owe taxes four times a year, not just in April. This calculator estimates your self-employment tax and federal income tax from your net earnings, then breaks the total into the four quarterly payments the IRS expects — with the 2026 due dates.",
      "Knowing each quarter's number in advance prevents underpayment penalties and April surprises. UnifyOne can derive these estimates from your live earnings so the amount is always current.",
    ],
  },
  {
    path: "/tools/earnings-consolidator",
    externalLinks: PLATFORMS,
    title:
      "Multi-Platform Gig Earnings Consolidator | True Hourly Rate | UnifyOne",
    description:
      "Free gig earnings calculator. See your true hourly rate after expenses across DoorDash, Uber Eats, Instacart, and more — no account required.",
    body: [
      "Gross pay from gig apps hides what you actually keep. This consolidator combines earnings from DoorDash, Uber Eats, Instacart, and more, subtracts mileage and expenses, and shows your true net hourly rate across every platform.",
      "Seeing real net-per-hour side by side reveals which apps and hours are worth your time. UnifyOne keeps this view live by syncing payouts and costs automatically.",
    ],
  },
  {
    path: "/tools/reseller-break-even",
    externalLinks: [
      { label: "eBay", url: "https://www.ebay.com" },
      { label: "Etsy", url: "https://www.etsy.com/sell" },
      { label: "Amazon Seller", url: "https://sell.amazon.com" },
    ],
    title:
      "Reseller Break-Even & Pricing Calculator — eBay, Etsy, Amazon | UnifyOne",
    description:
      "Free reseller pricing calculator. Enter item cost, fees, shipping, and return rate to find your break-even price and target margin on eBay, Etsy, or Amazon.",
    body: [
      "Marketplace fees, shipping, and returns quietly erode reseller margins. This calculator takes your item cost, platform fees, shipping, and expected return rate and tells you the exact break-even price plus the list price you need for a target margin on eBay, Etsy, or Amazon.",
      "Price above break-even with confidence instead of guessing. UnifyOne helps resellers track costs and margins across every channel from one dashboard.",
    ],
  },
  {
    path: "/tools/cashflow-tracker",
    externalLinks: PLATFORMS,
    title:
      "Gig Payout Timing & Cash-Flow Tracker | DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Free gig cash-flow tool. Model when DoorDash, Uber Eats, Instacart, and Lyft payouts hit your bank and forecast your 30-day income rhythm.",
    body: [
      "Gig pay arrives on different schedules — instant cash-outs, weekly deposits, and platform delays all collide. This tool models when DoorDash, Uber Eats, Instacart, and Lyft payouts actually land in your bank so you can forecast your 30-day income rhythm.",
      "A clear payout timeline makes it easier to cover bills and avoid overdrafts between deposits. UnifyOne extends this with live earnings tracking across every platform.",
    ],
  },
  {
    path: "/tools/se-tax-calculator",
    externalLinks: [IRS.seTax],
    title:
      "Self-Employment Tax Calculator for 1099 Gig Workers 2025 | UnifyOne",
    description:
      "Free self-employment tax calculator for DoorDash, Uber, and Instacart 1099 workers. See your SE tax (Social Security + Medicare) and quarterly estimates.",
    body: [
      "Self-employed gig workers pay the full 15.3% self-employment tax — both halves of Social Security and Medicare — on top of income tax. This calculator breaks down your SE tax from net earnings, shows the deductible employer-equivalent half, and estimates your quarterly payments.",
      "Understanding the SE portion separately from income tax makes your real tax burden clear. UnifyOne keeps the numbers current by computing them from your actual platform earnings.",
    ],
  },
  {
    path: "/tools/gig-hourly-rate",
    externalLinks: PLATFORMS,
    title:
      "Gig Worker Real Hourly Rate Calculator — DoorDash, Uber Eats, Instacart | UnifyOne",
    description:
      "Find your true hourly rate from DoorDash, Uber Eats, Instacart, and Grubhub after vehicle costs and miles. Free gig earnings optimizer — compare platforms.",
    body: [
      "The hourly rate a gig app advertises ignores gas, depreciation, and dead miles. This calculator factors vehicle cost-per-mile and your actual driving into a true hourly rate for DoorDash, Uber Eats, Instacart, and Grubhub.",
      "Comparing real net-per-hour across platforms shows where your time pays best. UnifyOne turns this one-off check into continuous optimization across every app you run.",
    ],
  },
  {
    path: "/tools/tax-set-aside",
    externalLinks: [IRS.selfEmployedCenter],
    title:
      "1099 Tax Set-Aside Calculator — How Much to Save for Gig Taxes | UnifyOne",
    description:
      "Find the exact percentage of each gig payment to set aside for taxes. Free calculator for DoorDash, Uber, and Instacart 1099 workers — SE + federal tax.",
    body: [
      "The safest way to avoid a tax-season shortfall is to set aside a percentage of every gig payment as it arrives. This calculator combines self-employment tax and federal income tax to give you one set-aside percentage for DoorDash, Uber, Instacart, and any 1099 income.",
      "Move that share into a separate account each time you cash out and quarterly taxes take care of themselves. UnifyOne can automate the set-aside from your live earnings.",
    ],
  },
  {
    path: "/gig-income-aggregator",
    externalLinks: PLATFORMS,
    title:
      "Gig Income Aggregator — Consolidate DoorDash, Uber, Instacart Earnings | UnifyOne",
    description:
      "Consolidate DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square income in one dashboard. See true net earnings after expenses and true hourly rate.",
  },
  {
    path: "/1099-tax-management",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated],
    title:
      "1099 Tax Management for Gig Workers — Quarterly Estimates & Deductions | UnifyOne",
    description:
      "Automated 1099 tax management for gig workers: quarterly payments from live earnings, SE tax, mileage deductions, and IRS-ready records.",
  },
  {
    path: "/gig-earnings-optimizer",
    externalLinks: PLATFORMS,
    title:
      "Gig Earnings Optimizer — Maximize Net Pay Across DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Find which gig apps and shifts generate the highest net pay after expenses. UnifyOne compares real net earnings per hour across all platforms.",
  },
  {
    path: "/financial-intelligence-gig-workers",
    title:
      "Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne",
    description:
      "AI-powered financial intelligence for gig workers: real-time earnings analysis, tax forecasting, and net income visibility across all platforms.",
  },
  {
    path: "/gig-route-intelligence",
    externalLinks: PLATFORMS,
    title:
      "Gig Route Intelligence — Optimize Delivery Zones for Higher Net Pay | UnifyOne",
    description:
      "Discover which delivery zones generate your highest net pay per hour. UnifyOne maps your actual earnings history to show where your time is worth most.",
  },
  {
    path: "/gig-taxes",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated, IRS.seTax],
    title: "Gig Worker Taxes: The Complete Guide for 1099 Earners | UnifyOne",
    description:
      "How gig worker taxes work: self-employment tax, 1099-NEC vs 1099-K, deductions, and quarterly payments — plus guides for DoorDash, Uber & Instacart.",
    body: [
      "Driving for DoorDash, Uber, or Instacart makes you an independent contractor — nobody withholds taxes for you. You owe federal and state income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings, and you pay it yourself as you go.",
      "You're taxed on profit, not gross payouts. Deductions — business mileage at the IRS standard mileage rate, phone use, hot bags, tolls, and platform fees — lower the income you're taxed on, so tracking them all year is the single biggest way to cut your bill.",
      "A common rule of thumb is to set aside 25–30% of net earnings for taxes. If you expect to owe $1,000 or more, the IRS expects quarterly estimated payments around April 15, June 15, September 15, and January 15 to avoid an underpayment penalty.",
      "A 1099-NEC reports direct pay for your services; a 1099-K reports payments processed through a platform (like Uber's gross fares). You must report all income whether or not a form arrives. See the platform-specific guides for DoorDash, Uber, and Instacart.",
    ],
  },
  {
    path: "/doordash-taxes",
    externalLinks: DOORDASH_TAX_LINKS,
    title:
      "DoorDash Taxes: A Dasher's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How DoorDash taxes work for Dashers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "DoorDash doesn't withhold taxes from your pay. As a Dasher you're an independent contractor, so you owe federal and state income tax plus the 15.3% self-employment tax on your net earnings.",
      "If you earned $600 or more, DoorDash issues a 1099-NEC through Stripe. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while dashing. Phone use, hot bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty.",
    ],
  },
  {
    path: "/uber-driver-taxes",
    externalLinks: UBER_TAX_LINKS,
    title:
      "Uber Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates | UnifyOne",
    description:
      "Uber driver taxes explained: the 1099-K vs 1099-NEC, your Tax Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    body: [
      "Uber treats drivers as independent contractors and withholds no taxes. You owe income tax plus the 15.3% self-employment tax on your net earnings, whether you drive UberX, Uber Eats, or both.",
      "Uber may send two forms: a 1099-K for the gross fares riders and customers paid, and a 1099-NEC for incentives, referrals, and bonuses. Your Uber Tax Summary reconciles both — and you must report all earnings regardless of which forms arrive.",
      "Business mileage at the IRS standard mileage rate is usually the biggest deduction, and because Uber only reports online miles, your real deductible mileage is often higher. Service fees, phone use, tolls, and rider amenities are deductible too.",
      "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15.",
    ],
  },
  {
    path: "/instacart-taxes",
    externalLinks: INSTACART_TAX_LINKS,
    title:
      "Instacart Taxes: A Shopper's Guide to 1099s & Deductions | UnifyOne",
    description:
      "Instacart taxes for full-service shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    body: [
      "How you're taxed on Instacart depends on your role. Full-service shoppers who shop and deliver are independent contractors responsible for their own taxes; in-store-only shoppers are part-time W-2 employees with taxes withheld.",
      "Full-service shoppers who earned $600 or more receive a 1099-NEC, usually delivered through Stripe by late January. You must report all income even if a form doesn't arrive.",
      "Full-service shoppers can deduct business mileage at the IRS standard mileage rate, plus phone use, insulated bags, and other supplies. A common rule of thumb is to set aside 25–30% of net earnings for self-employment and income tax.",
      "Independent-contractor shoppers generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an underpayment penalty.",
    ],
  },
  {
    path: "/how-to-make-money-on-doordash",
    externalLinks: DOORDASH_START_LINKS,
    title: "How to Make Money on DoorDash: A Beginner's Guide | UnifyOne",
    description:
      "How to make money on DoorDash: requirements, how to sign up, how Dasher pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "DoorDash lets you earn on your own schedule by delivering food and other orders nearby. Dashers are independent contractors who use their own car, bike, or scooter, choose when to work, and accept or decline each delivery offer.",
      "To start you generally need to be at least 18, have a way to deliver, carry a smartphone, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with DoorDash before applying.",
      "Pay is per delivery — base pay plus any active promotions, with 100% of customer tips on top — and there is no guaranteed wage. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings overstate your take-home.",
      "To know what you'd really make, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-driving-for-uber",
    externalLinks: UBER_START_LINKS,
    title: "How to Make Money Driving for Uber: A Beginner's Guide | UnifyOne",
    description:
      "How to make money driving for Uber: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "Driving for Uber lets you earn by giving rides on your own schedule in your own car. Drivers are independent contractors who decide when to go online, where to drive, and which trips to accept in the app.",
      "Rideshare driving typically requires you to be at least 21, have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change, so confirm the current criteria with Uber.",
      "Uber shows an upfront fare before you accept, with surge pricing and promotions during high demand and 100% of tips on top. There's no guaranteed wage, Uber takes a service fee from fares, and you pay for your own gas and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-instacart",
    externalLinks: INSTACART_START_LINKS,
    title: "How to Make Money with Instacart: A Shopper's Guide | UnifyOne",
    description:
      "How to make money with Instacart: requirements, how to sign up, how full-service shopper pay works, and how to compute your real net hourly rate.",
    body: [
      "Instacart lets you earn by shopping for groceries and delivering them on your own schedule. Full-service shoppers are independent contractors who use their own car to shop a customer's order in-store and drive it to the door.",
      "To start as a full-service shopper you generally need to be at least 18, have a car and a smartphone, be able to lift and carry groceries, and pass a background check. Requirements vary by market and change, so confirm the current criteria with Instacart.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance, with 100% of tips on top and no guaranteed wage. Your working time includes shopping in-store, not just driving, and you cover your own fuel and vehicle costs.",
      "To know your real take-home, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-amazon-flex",
    externalLinks: AMAZON_FLEX_START_LINKS,
    title: "How to Make Money with Amazon Flex: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Amazon Flex: requirements, how to sign up, how delivery-block pay works, and how to compute your real net hourly rate.",
    body: [
      "Amazon Flex lets you earn by delivering Amazon packages during scheduled blocks of time in your own vehicle. Drivers are independent contractors who reserve the blocks that fit their schedule and get paid for the block.",
      "To start you generally need to be at least 21, have a qualifying vehicle (often mid-size or larger with adequate cargo space), carry valid insurance, have a compatible smartphone, and pass a background check. Requirements vary by location and change, so confirm them with Amazon Flex.",
      "Amazon Flex pays per block, showing an estimated pay before you reserve it; most package-delivery blocks don't include tips. If a route runs long your effective rate drops, no taxes are withheld, and you cover your own fuel and vehicle costs.",
      "To understand your real earnings, track your actual block time and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/blog/gig-economy-commerce-platform",
    title: "Gig Economy Commerce Platform | UnifyOne Blog",
    description:
      "Why gig-economy operators need a unified commerce platform — consolidating earnings, orders, and analytics across DoorDash, Uber, and more.",
  },
  {
    path: "/blog/multi-tenant-ecommerce-saas",
    title: "Multi-Tenant Ecommerce SaaS | UnifyOne Blog",
    description:
      "What multi-tenant ecommerce SaaS means, how tenant isolation and RBAC work, and how UnifyOne runs many stores from one secure backend.",
  },
  {
    path: "/blog/digital-retail-guide",
    title: "Digital Retail Guide | UnifyOne Blog",
    description:
      "A practical digital retail guide for operators — unifying storefronts, marketplaces, and POS into one multi-tenant commerce system.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | UnifyOne",
    description:
      "UnifyOne Privacy Policy — how 1Commerce LLC collects, uses, and protects your data in compliance with CCPA and GDPR. Last updated March 2026.",
  },
  {
    path: "/terms",
    title: "Terms of Service | UnifyOne",
    description:
      "UnifyOne Terms of Service — usage terms, subscription billing, the Promote & Earn program, data ownership, and liability limits. 1Commerce LLC.",
  },
  {
    path: "/themes",
    title: "Theme Store | UnifyOne — Commerce Themes & Storefront Designs",
    description:
      "Browse free and paid themes for your UnifyOne storefront. Professionally designed for e-commerce and gig worker platforms — preview and install in minutes.",
  },
  {
    path: "/docs-chat",
    title: "Docs Chat | UnifyOne",
    description:
      "Ask questions about UnifyOne documentation — answered instantly by Kai, the built-in Claude-powered AI assistant.",
  },
  {
    path: "/resources",
    title: "Resources | UnifyOne",
    description:
      "Operating excellence resources for gig operators and commerce teams — playbooks, templates, analytics guides, and video walkthroughs. Download free.",
  },
  {
    path: "/sovereign",
    title: "The Sovereign Stack | 1Commerce",
    description:
      "The Sovereign Stack gives gig operators legal protection, financial independence, and resilience. Break free from platform lock-in. Waitlist open.",
  },
  {
    path: "/design-system",
    title: "Design System | UnifyOne",
    description:
      "The UnifyOne design system — Cathedral Framework tokens for color, typography, spacing, and radii, plus the full component library used in the product.",
  },
  {
    path: "/login",
    title: "Sign In | UnifyOne",
    description:
      "Sign in to your UnifyOne workspace — multi-tenant commerce, AI earnings insights, and all your connected stores in one place.",
  },
  {
    path: "/register",
    title: "Create Your Account | UnifyOne",
    description:
      "Start free on UnifyOne — the multi-tenant commerce platform for gig operators and e-commerce teams. No credit card required.",
  },
];
