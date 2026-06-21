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
const VA_TAX = {
  label: "Virginia Department of Taxation",
  href: "https://www.tax.virginia.gov/",
};
const VA_760ES = {
  label: "Virginia: Estimated tax (Form 760ES)",
  href: "https://www.tax.virginia.gov/individual-estimated-tax-payments",
};
const MA_DOR = {
  label: "Massachusetts Department of Revenue",
  href: "https://www.mass.gov/orgs/massachusetts-department-of-revenue",
};
const MA_1ES = {
  label: "Massachusetts: Estimated tax (Form 1-ES)",
  href: "https://www.mass.gov/info-details/dor-estimated-tax-payment-vouchers",
};
const MD_COMP = {
  label: "Comptroller of Maryland",
  href: "https://www.marylandtaxes.gov/",
};
const MD_PV = {
  label: "Maryland: Estimated tax (Form PV)",
  href: "https://www.marylandtaxes.gov/individual/income/filing/estimated-tax.php",
};
const MN_DOR = {
  label: "Minnesota Department of Revenue",
  href: "https://www.revenue.state.mn.us/",
};
const MN_M14 = {
  label: "Minnesota: Estimated tax (Form M14)",
  href: "https://www.revenue.state.mn.us/estimated-tax",
};
const MO_DOR = {
  label: "Missouri Department of Revenue",
  href: "https://dor.mo.gov/",
};
const MO_1040ES = {
  label: "Missouri: Estimated tax (Form MO-1040ES)",
  href: "https://dor.mo.gov/taxation/individual/tax-types/income/",
};
const IN_DOR = {
  label: "Indiana Department of Revenue",
  href: "https://www.in.gov/dor/",
};
const IN_ES40 = {
  label: "Indiana: Estimated tax (Form ES-40)",
  href: "https://www.in.gov/dor/individual-income-taxes/",
};
const TN_DOR = {
  label: "Tennessee Department of Revenue",
  href: "https://www.tn.gov/revenue.html",
};
const NV_TAX = {
  label: "Nevada Department of Taxation",
  href: "https://tax.nv.gov/",
};
const WI_DOR = {
  label: "Wisconsin Department of Revenue",
  href: "https://www.revenue.wi.gov/",
};
const WI_1ES = {
  label: "Wisconsin: Estimated tax (Form 1-ES)",
  href: "https://www.revenue.wi.gov/Pages/FAQS/pcs-estimate.aspx",
};
const OR_DOR = {
  label: "Oregon Department of Revenue",
  href: "https://www.oregon.gov/dor/",
};
const OR_ESTIMATED = {
  label: "Oregon: Estimated income tax",
  href: "https://www.oregon.gov/dor/programs/individuals/pages/estimated-payments.aspx",
};
const SC_DOR = {
  label: "South Carolina Department of Revenue",
  href: "https://dor.sc.gov/",
};
const SC_SC1040ES = {
  label: "South Carolina: Estimated tax (SC1040ES)",
  href: "https://dor.sc.gov/forms",
};
const AL_DOR = {
  label: "Alabama Department of Revenue",
  href: "https://www.revenue.alabama.gov/",
};
const AL_40ES = {
  label: "Alabama: Estimated tax (Form 40ES)",
  href: "https://www.revenue.alabama.gov/individual-corporate/",
};
const LA_DOR = {
  label: "Louisiana Department of Revenue",
  href: "https://revenue.louisiana.gov/",
};
const LA_IT540ES = {
  label: "Louisiana: Estimated tax (Form IT-540ES)",
  href: "https://revenue.louisiana.gov/individualincometax",
};
const KY_DOR = {
  label: "Kentucky Department of Revenue",
  href: "https://revenue.ky.gov/",
};
const KY_740ES = {
  label: "Kentucky: Estimated tax (Form 740-ES)",
  href: "https://revenue.ky.gov/Individual/Individual-Income-Tax/Pages/default.aspx",
};
const OK_TAX = {
  label: "Oklahoma Tax Commission",
  href: "https://oklahoma.gov/tax.html",
};
const OK_OW8ES = {
  label: "Oklahoma: Estimated tax (Form OW-8-ES)",
  href: "https://oklahoma.gov/tax/individuals.html",
};
const CT_DRS = {
  label: "Connecticut Department of Revenue Services",
  href: "https://portal.ct.gov/DRS",
};
const CT_1040ES = {
  label: "Connecticut: Estimated tax (Form CT-1040ES)",
  href: "https://portal.ct.gov/DRS/Individuals/Individual-Tax-Page",
};
const UT_TAX = {
  label: "Utah State Tax Commission",
  href: "https://tax.utah.gov/",
};
const UT_TC546 = {
  label: "Utah: Estimated tax prepayment (TC-546)",
  href: "https://incometax.utah.gov/paying/prepayments",
};
const IA_DOR = {
  label: "Iowa Department of Revenue",
  href: "https://revenue.iowa.gov/",
};
const IA_1040ES = {
  label: "Iowa: Estimated tax (IA 1040ES)",
  href: "https://revenue.iowa.gov/taxes/file-my-taxes/estimated-income-tax",
};
const KS_DOR = {
  label: "Kansas Department of Revenue",
  href: "https://www.ksrevenue.gov/",
};
const KS_K40ES = {
  label: "Kansas: Estimated tax (Form K-40ES)",
  href: "https://www.ksrevenue.gov/forms-ii.html",
};
const NM_TRD = {
  label: "New Mexico Taxation and Revenue Department",
  href: "https://www.tax.newmexico.gov/",
};
const NM_PITES = {
  label: "New Mexico: Estimated tax (Form PIT-ES)",
  href: "https://www.tax.newmexico.gov/individuals/file-your-taxes-overview/",
};
const NE_DOR = {
  label: "Nebraska Department of Revenue",
  href: "https://revenue.nebraska.gov/",
};
const NE_1040NES = {
  label: "Nebraska: Estimated tax (Form 1040N-ES)",
  href: "https://revenue.nebraska.gov/about/forms/individual-income-tax-forms",
};
const MS_DOR = {
  label: "Mississippi Department of Revenue",
  href: "https://www.dor.ms.gov/",
};
const MS_80106 = {
  label: "Mississippi: Estimated tax (Form 80-106)",
  href: "https://www.dor.ms.gov/individual/individual-income-tax-forms",
};
const AR_DFA = {
  label: "Arkansas Department of Finance and Administration",
  href: "https://www.dfa.arkansas.gov/income-tax/individual-income-tax/",
};
const AR_1000ES = {
  label: "Arkansas: Estimated tax (Form AR1000ES)",
  href: "https://www.dfa.arkansas.gov/income-tax/individual-income-tax/forms/",
};
const WV_TAX = {
  label: "West Virginia Tax Division",
  href: "https://tax.wv.gov/",
};
const WV_IT140ES = {
  label: "West Virginia: Estimated tax (Form IT-140ES)",
  href: "https://tax.wv.gov/Individuals/Pages/Individuals.aspx",
};
const ID_TAX = {
  label: "Idaho State Tax Commission",
  href: "https://tax.idaho.gov/",
};
const ID_FORM51 = {
  label: "Idaho: Estimated payment (Form 51)",
  href: "https://tax.idaho.gov/taxes/income-tax/individual-income/",
};
const HI_TAX = {
  label: "Hawaii Department of Taxation",
  href: "https://tax.hawaii.gov/",
};
const HI_GET = {
  label: "Hawaii: General Excise Tax (GET)",
  href: "https://tax.hawaii.gov/geninfo/get/",
};
const ME_MRS = {
  label: "Maine Revenue Services",
  href: "https://www.maine.gov/revenue/",
};
const ME_1040ESME = {
  label: "Maine: Estimated tax (Form 1040ES-ME)",
  href: "https://www.maine.gov/revenue/taxes/income-estate-tax/individual-income-tax-1040",
};
const RI_TAX = {
  label: "Rhode Island Division of Taxation",
  href: "https://tax.ri.gov/",
};
const RI_1040ES = {
  label: "Rhode Island: Estimated tax (Form RI-1040ES)",
  href: "https://tax.ri.gov/forms/individual/income",
};
const AK_DOR = {
  label: "Alaska Department of Revenue",
  href: "https://dor.alaska.gov/",
};
const NH_DRA = {
  label: "New Hampshire Department of Revenue Administration",
  href: "https://www.revenue.nh.gov/",
};
const SD_DOR = {
  label: "South Dakota Department of Revenue",
  href: "https://dor.sd.gov/",
};
const WY_DOR = {
  label: "Wyoming Department of Revenue",
  href: "https://revenue.wyo.gov/",
};
const DE_DOR = {
  label: "Delaware Division of Revenue",
  href: "https://revenue.delaware.gov/",
};
const DE_200ES = {
  label: "Delaware: Estimated tax (Form 200-ES)",
  href: "https://revenue.delaware.gov/individual-income-tax/",
};
const MT_DOR = {
  label: "Montana Department of Revenue",
  href: "https://mtrevenue.gov/",
};
const MT_ESTIMATE = {
  label: "Montana: Estimated income tax payments",
  href: "https://mtrevenue.gov/taxes/individual-income-tax/",
};
const ND_TAX = {
  label: "North Dakota Office of State Tax Commissioner",
  href: "https://www.tax.nd.gov/",
};
const ND_1ES = {
  label: "North Dakota: Estimated tax (Form ND-1ES)",
  href: "https://www.tax.nd.gov/individual",
};
const VT_TAX = {
  label: "Vermont Department of Taxes",
  href: "https://tax.vermont.gov/",
};
const VT_IN114 = {
  label: "Vermont: Estimated tax (Form IN-114)",
  href: "https://tax.vermont.gov/individuals/estimated-income-tax",
};
const DC_OTR = {
  label: "DC Office of Tax and Revenue",
  href: "https://otr.cfo.dc.gov/",
};
const DC_D40ES = {
  label: "D.C.: Estimated tax (Form D-40ES)",
  href: "https://otr.cfo.dc.gov/page/individual-income-tax-forms",
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
  {
    slug: "virginia-gig-worker-taxes",
    state: "Virginia",
    stateAdjective: "Virginia",
    eyebrow: "State Gig Tax Guide",
    title: "Virginia Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Virginia gig worker taxes: a progressive state income tax (up to 5.75%) plus the 15.3% federal SE tax, with Form 760ES estimates. Not tax advice.",
    h1: "Virginia Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Virginia, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Virginia also taxes your net earnings under its state income tax. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Virginia have a state income tax for gig workers?",
    stateBody: [
      "Yes. Virginia has a progressive state income tax with a top rate of 5.75% that, because its brackets are compressed, applies to most of a typical gig worker's net profit. That state tax is on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Virginia Department of Taxation.",
      "There is no separate Virginia self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net gig earnings. Deductions that lower your federal taxable income generally flow through to your Virginia return as well.",
      "Pay Virginia estimated income tax to the Department of Taxation using Form 760ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [VA_TAX, VA_760ES],
    faqs: [
      {
        q: "Do Virginia gig workers pay state income tax?",
        a: "Yes. Virginia's progressive income tax (top rate 5.75%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 760ES and confirm current brackets with the Virginia Department of Taxation.",
      },
      {
        q: "How much should I set aside for taxes in Virginia?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Virginia estimated taxes as a gig worker?",
        a: "Use Virginia Form 760ES to pay state estimated income tax to the Department of Taxation, generally four times a year alongside your federal estimates. You can pay online through the department's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Virginia gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies and equipment, tolls, and parking — which lower your federal taxable income, the starting point Virginia uses.",
      },
      {
        q: "When are Virginia gig taxes due?",
        a: "Federal and Virginia estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties at both levels.",
      },
    ],
  },
  {
    slug: "massachusetts-gig-worker-taxes",
    state: "Massachusetts",
    stateAdjective: "Massachusetts",
    eyebrow: "State Gig Tax Guide",
    title: "Massachusetts Gig Worker Taxes: Flat State Tax + Federal SE Tax",
    metaDescription:
      "Massachusetts gig worker taxes: a flat 5% state income tax plus the 15.3% federal SE tax, with Form 1-ES estimates. Not tax advice.",
    h1: "Massachusetts Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Massachusetts, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Massachusetts adds a flat state income tax on your net earnings. The flat rate keeps the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Massachusetts have a state income tax for gig workers?",
    stateBody: [
      "Yes. Massachusetts taxes most individual income at a flat 5% rate, which applies to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. A separate 4% surtax applies only to income above roughly $1 million, so it rarely affects gig workers. Confirm the current rate with the Massachusetts Department of Revenue.",
      "There's no separate Massachusetts self-employment tax — the 15.3% SE tax is federal only — but you report and pay the flat state income tax on your net earnings. Because the rate is flat, the same percentage applies regardless of how much you earn.",
      "Pay Massachusetts estimated income tax to the Department of Revenue using Form 1-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [MA_DOR, MA_1ES],
    faqs: [
      {
        q: "Do Massachusetts gig workers pay state income tax?",
        a: "Yes. Massachusetts has a flat 5% state income tax that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 1-ES and confirm the current rate with the Massachusetts Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Massachusetts?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the Massachusetts income tax rate for gig workers?",
        a: "Massachusetts uses a flat 5% individual income tax rate, so the same percentage applies to your net gig earnings regardless of income level. A 4% surtax applies only above about $1 million. Confirm the current rate with the Massachusetts Department of Revenue.",
      },
      {
        q: "How do I pay Massachusetts estimated taxes as a gig worker?",
        a: "Use Massachusetts Form 1-ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through MassTaxConnect. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Massachusetts gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking, which lower the federal taxable income Massachusetts starts from.",
      },
    ],
  },
  {
    slug: "maryland-gig-worker-taxes",
    state: "Maryland",
    stateAdjective: "Maryland",
    eyebrow: "State Gig Tax Guide",
    title: "Maryland Gig Worker Taxes: State + County Tax & Federal SE Tax",
    metaDescription:
      "Maryland gig worker taxes: state income tax plus a county/local income tax and the 15.3% federal SE tax, with Form PV estimates. Not tax advice.",
    h1: "Maryland Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Maryland, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Maryland adds both a state income tax and a county-level local income tax on your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Maryland have a state income tax for gig workers?",
    stateBody: [
      "Yes — and there are two layers. Maryland levies a progressive state income tax (roughly 2% to 5.75%) on your net gig profit, plus a separate local income tax set by the county (or Baltimore City) where you live, commonly in the ~2.25%–3.2% range. Both apply on top of federal income tax and the 15.3% federal self-employment tax. Confirm current rates with the Comptroller of Maryland.",
      "There's no separate Maryland self-employment tax — the 15.3% SE tax is federal only — but you report and pay both the state and the county income tax on your net earnings, which makes Maryland's combined rate higher than many states.",
      "Pay Maryland estimated income tax to the Comptroller using Form PV, generally on the same quarterly schedule as your federal estimates. The county tax is filed and paid together with your state return. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [MD_COMP, MD_PV],
    faqs: [
      {
        q: "Do Maryland gig workers pay state income tax?",
        a: "Yes — both a progressive state income tax (about 2%–5.75%) and a county/local income tax (commonly ~2.25%–3.2%) apply to your net gig earnings, on top of federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form PV and confirm current rates with the Comptroller of Maryland.",
      },
      {
        q: "How much should I set aside for taxes in Maryland?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Does Maryland have a local income tax for gig workers?",
        a: "Yes. In addition to the state income tax, each Maryland county (and Baltimore City) levies its own local income tax, commonly in the ~2.25%–3.2% range, based on where you live. It's filed with your state return, so factor it into your set-aside. Confirm your county's rate with the Comptroller of Maryland.",
      },
      {
        q: "How do I pay Maryland estimated taxes as a gig worker?",
        a: "Use Maryland Form PV to pay state estimated income tax (which includes your local county tax) to the Comptroller, generally four times a year alongside your federal estimates. You can pay online through the Comptroller's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Maryland gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering the federal taxable income Maryland's state and county taxes build on.",
      },
    ],
  },
  {
    slug: "minnesota-gig-worker-taxes",
    state: "Minnesota",
    stateAdjective: "Minnesota",
    eyebrow: "State Gig Tax Guide",
    title: "Minnesota Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Minnesota gig worker taxes: a progressive state income tax (5.35%–9.85%) plus the 15.3% federal SE tax, with Form M14 estimates. Not tax advice.",
    h1: "Minnesota Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Minnesota, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Minnesota's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Minnesota have a state income tax for gig workers?",
    stateBody: [
      "Yes. Minnesota has a progressive state income tax with rates from about 5.35% up to 9.85%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Your rate rises with total income. Confirm current brackets with the Minnesota Department of Revenue.",
      "There's no separate Minnesota self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings. Because Minnesota's rates are among the higher state rates, build the state piece carefully into your set-aside.",
      "Pay Minnesota estimated income tax to the Department of Revenue using Form M14, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [MN_DOR, MN_M14],
    faqs: [
      {
        q: "Do Minnesota gig workers pay state income tax?",
        a: "Yes. Minnesota's progressive income tax (about 5.35%–9.85%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form M14 and confirm current brackets with the Minnesota Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Minnesota?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Minnesota estimated taxes as a gig worker?",
        a: "Use Minnesota Form M14 to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Minnesota gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking, which lower the federal taxable income Minnesota starts from.",
      },
      {
        q: "When are Minnesota gig taxes due?",
        a: "Federal and Minnesota estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "missouri-gig-worker-taxes",
    state: "Missouri",
    stateAdjective: "Missouri",
    eyebrow: "State Gig Tax Guide",
    title: "Missouri Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Missouri gig worker taxes: a progressive state income tax (top rate around 4.7%, declining) plus the 15.3% federal SE tax, with Form MO-1040ES. Not tax advice.",
    h1: "Missouri Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Missouri, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Missouri's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Missouri have a state income tax for gig workers?",
    stateBody: [
      "Yes. Missouri has a progressive state income tax with a top rate around 4.7% that is being gradually reduced; because the brackets are compressed, most gig workers' net profit is taxed near the top rate. It applies on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the Missouri Department of Revenue.",
      "There's no separate Missouri self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings. Note that Kansas City and St. Louis levy a local earnings tax (about 1%) on people who work in those cities, which can also apply to self-employment earnings.",
      "Pay Missouri estimated income tax to the Department of Revenue using Form MO-1040ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [MO_DOR, MO_1040ES],
    faqs: [
      {
        q: "Do Missouri gig workers pay state income tax?",
        a: "Yes. Missouri's progressive income tax (top rate around 4.7% and declining) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form MO-1040ES and confirm the current rate with the Missouri Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Missouri?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Kansas City or St. Louis gig workers owe a local earnings tax?",
        a: "Yes. Kansas City and St. Louis each impose a roughly 1% local earnings tax on income earned in the city, which can include self-employment earnings. If you work in either city, factor it into your set-aside and confirm the rules with that city's collector of revenue.",
      },
      {
        q: "How do I pay Missouri estimated taxes as a gig worker?",
        a: "Use Missouri Form MO-1040ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Missouri gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering the federal taxable income Missouri starts from.",
      },
    ],
  },
  {
    slug: "indiana-gig-worker-taxes",
    state: "Indiana",
    stateAdjective: "Indiana",
    eyebrow: "State Gig Tax Guide",
    title: "Indiana Gig Worker Taxes: Flat State + County Tax & Federal SE Tax",
    metaDescription:
      "Indiana gig worker taxes: a flat state income tax plus a county income tax and the 15.3% federal SE tax, with Form ES-40 estimates. Not tax advice.",
    h1: "Indiana Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Indiana, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Indiana adds a flat state income tax plus a county income tax on your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Indiana have a state income tax for gig workers?",
    stateBody: [
      "Yes — and there are two layers. Indiana taxes individual income at a low flat state rate (around 3.05% and scheduled to keep declining), plus a county income tax set by the county where you live, which varies by county. Both apply to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current rates with the Indiana Department of Revenue.",
      "There's no separate Indiana self-employment tax — the 15.3% SE tax is federal only — but you report and pay both the flat state tax and your county tax on your net earnings. Because both are flat, the same combined percentage applies regardless of income level.",
      "Pay Indiana estimated income tax to the Department of Revenue using Form ES-40, generally on the same quarterly schedule as your federal estimates. The county tax is reconciled with your state return. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [IN_DOR, IN_ES40],
    faqs: [
      {
        q: "Do Indiana gig workers pay state income tax?",
        a: "Yes — a flat state income tax (around 3.05%, declining) plus a county income tax that varies by county both apply to your net gig earnings, on top of federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form ES-40 and confirm current rates with the Indiana Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Indiana?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Does Indiana have a county income tax for gig workers?",
        a: "Yes. In addition to the flat state income tax, each Indiana county sets its own income tax rate based on where you live, reconciled with your state return. Factor your county's rate into your set-aside and confirm it with the Indiana Department of Revenue.",
      },
      {
        q: "How do I pay Indiana estimated taxes as a gig worker?",
        a: "Use Indiana Form ES-40 to pay state estimated income tax (including county tax) to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through INTIME. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Indiana gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering the federal taxable income Indiana's state and county taxes build on.",
      },
    ],
  },
  {
    slug: "tennessee-gig-worker-taxes",
    state: "Tennessee",
    stateAdjective: "Tennessee",
    eyebrow: "State Gig Tax Guide",
    title: "Tennessee Gig Worker Taxes: No State Income Tax, Federal & SE Tax",
    metaDescription:
      "Tennessee gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Tennessee Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Tennessee, platforms pay you as an independent contractor and withhold nothing. The good news: Tennessee has no personal state income tax. The catch: your federal obligations — income tax plus the 15.3% self-employment tax — apply in full. Here's how it works.",
    hasStateIncomeTax: false,
    stateHeading: "Does Tennessee have a state income tax for gig workers?",
    stateBody: [
      "No. Tennessee does not tax personal income, so you won't file a state income-tax return on your gig earnings and there are no state income-tax estimates to make. The Hall tax on certain investment income was fully repealed, so ordinary gig earnings face no state income tax.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Because there's no state income tax to pay, you only send federal estimated payments to the IRS — but you should still make those quarterly if you expect to owe $1,000 or more for the year.",
    ],
    stateResources: [TN_DOR],
    faqs: [
      {
        q: "Do Tennessee gig workers pay state income tax?",
        a: "No. Tennessee has no personal state income tax, so your gig earnings aren't subject to state income tax and there are no state estimated payments. You still owe federal income tax and the 15.3% federal self-employment tax.",
      },
      {
        q: "How much should I set aside for taxes in Tennessee?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "Is gig income tax-free in Tennessee?",
        a: "No. While Tennessee charges no state income tax, your federal obligations apply in full: federal income tax on your net profit plus the 15.3% self-employment tax. Report all income whether or not a platform sends a 1099.",
      },
      {
        q: "Do Tennessee gig workers pay quarterly taxes?",
        a: "Yes — federal quarterly estimated payments. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects payments around April 15, June 15, September 15, and January 15. There are no Tennessee state estimates to make.",
      },
      {
        q: "What can Tennessee gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking — all of which reduce your federal taxable income.",
      },
    ],
  },
  {
    slug: "nevada-gig-worker-taxes",
    state: "Nevada",
    stateAdjective: "Nevada",
    eyebrow: "State Gig Tax Guide",
    title: "Nevada Gig Worker Taxes: No State Income Tax, Federal & SE Tax",
    metaDescription:
      "Nevada gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Nevada Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Nevada, platforms pay you as an independent contractor and withhold nothing. The good news: Nevada has no personal state income tax. The catch: your federal obligations — income tax plus the 15.3% self-employment tax — apply in full. Here's how it works.",
    hasStateIncomeTax: false,
    stateHeading: "Does Nevada have a state income tax for gig workers?",
    stateBody: [
      "No. Nevada does not levy a personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state income-tax estimates to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Because there's no state income tax to pay, you only send federal estimated payments to the IRS — but you should still make those quarterly if you expect to owe $1,000 or more for the year.",
    ],
    stateResources: [NV_TAX],
    faqs: [
      {
        q: "Do Nevada gig workers pay state income tax?",
        a: "No. Nevada has no personal state income tax, so your gig earnings aren't subject to state income tax and there are no state estimated payments. You still owe federal income tax and the 15.3% federal self-employment tax.",
      },
      {
        q: "How much should I set aside for taxes in Nevada?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "Is gig income tax-free in Nevada?",
        a: "No. While Nevada charges no state income tax, your federal obligations apply in full: federal income tax on your net profit plus the 15.3% self-employment tax. Report all income whether or not a platform sends a 1099.",
      },
      {
        q: "Do Nevada gig workers pay quarterly taxes?",
        a: "Yes — federal quarterly estimated payments. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects payments around April 15, June 15, September 15, and January 15. There are no Nevada state estimates to make.",
      },
      {
        q: "What can Nevada gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking — all of which reduce your federal taxable income.",
      },
    ],
  },
  {
    slug: "wisconsin-gig-worker-taxes",
    state: "Wisconsin",
    stateAdjective: "Wisconsin",
    eyebrow: "State Gig Tax Guide",
    title: "Wisconsin Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Wisconsin gig worker taxes: a progressive state income tax (up to ~7.65%) plus the 15.3% federal SE tax, with Form 1-ES estimates. Not tax advice.",
    h1: "Wisconsin Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Wisconsin, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Wisconsin's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Wisconsin have a state income tax for gig workers?",
    stateBody: [
      "Yes. Wisconsin has a progressive state income tax topping out around 7.65%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Wisconsin Department of Revenue.",
      "There's no separate Wisconsin self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Wisconsin estimated income tax to the Department of Revenue using Form 1-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [WI_DOR, WI_1ES],
    faqs: [
      {
        q: "Do Wisconsin gig workers pay state income tax?",
        a: "Yes. Wisconsin's progressive income tax (up to about 7.65%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 1-ES and confirm current brackets with the Wisconsin Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Wisconsin?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Wisconsin estimated taxes as a gig worker?",
        a: "Use Wisconsin Form 1-ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Wisconsin gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Wisconsin taxable income.",
      },
      {
        q: "When are Wisconsin gig taxes due?",
        a: "Federal and Wisconsin estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "oregon-gig-worker-taxes",
    state: "Oregon",
    stateAdjective: "Oregon",
    eyebrow: "State Gig Tax Guide",
    title: "Oregon Gig Worker Taxes: High State Income Tax + Federal SE Tax",
    metaDescription:
      "Oregon gig worker taxes: a progressive state income tax (up to ~9.9%) plus the 15.3% federal SE tax, and possible Portland-area local taxes. Not tax advice.",
    h1: "Oregon Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Oregon, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Oregon has one of the higher state income taxes in the country, which also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Oregon have a state income tax for gig workers?",
    stateBody: [
      "Yes — and it's relatively high. Oregon's progressive state income tax tops out around 9.9%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Oregon has no statewide sales tax, but the income tax is significant. Confirm current brackets with the Oregon Department of Revenue.",
      "If you live or work in the Portland metro area, you may also owe local income taxes (such as the Metro Supportive Housing Services tax or Multnomah County's Preschool for All tax) above certain income thresholds — check whether they apply to you.",
      "There's no separate Oregon self-employment tax — the 15.3% SE tax is federal only — but you report and pay state (and any applicable local) income tax on your net earnings, generally via Oregon's estimated-payment system alongside your federal estimates.",
    ],
    stateResources: [OR_DOR, OR_ESTIMATED],
    faqs: [
      {
        q: "Do Oregon gig workers pay state income tax?",
        a: "Yes. Oregon's progressive income tax (up to about 9.9%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax — and Portland-area residents may owe local income taxes too. Confirm current rates with the Oregon Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Oregon?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Portland gig workers owe extra local taxes?",
        a: "Possibly. The Portland metro area has local income taxes (such as the Metro SHS and Multnomah County Preschool for All taxes) that apply above certain income thresholds. If you live or work there, check whether they apply and factor them into your set-aside.",
      },
      {
        q: "How do I pay Oregon estimated taxes as a gig worker?",
        a: "Pay Oregon estimated income tax to the Department of Revenue (online or by voucher), generally four times a year alongside your federal estimates. Any applicable Portland-area local taxes are paid separately to those programs. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Oregon gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Oregon taxable income.",
      },
    ],
  },
  {
    slug: "south-carolina-gig-worker-taxes",
    state: "South Carolina",
    stateAdjective: "South Carolina",
    eyebrow: "State Gig Tax Guide",
    title: "South Carolina Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "South Carolina gig worker taxes: a progressive state income tax (top rate ~6.2%, declining) plus the 15.3% federal SE tax, with SC1040ES. Not tax advice.",
    h1: "South Carolina Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in South Carolina, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and South Carolina's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading:
      "Does South Carolina have a state income tax for gig workers?",
    stateBody: [
      "Yes. South Carolina has a progressive state income tax with a top rate around 6.2% that is scheduled to step down over time, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the South Carolina Department of Revenue.",
      "There's no separate South Carolina self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay South Carolina estimated income tax to the Department of Revenue using Form SC1040ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [SC_DOR, SC_SC1040ES],
    faqs: [
      {
        q: "Do South Carolina gig workers pay state income tax?",
        a: "Yes. South Carolina's progressive income tax (top rate around 6.2% and declining) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form SC1040ES and confirm the current rate with the South Carolina Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in South Carolina?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay South Carolina estimated taxes as a gig worker?",
        a: "Use Form SC1040ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through MyDORWAY. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can South Carolina gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and South Carolina taxable income.",
      },
      {
        q: "When are South Carolina gig taxes due?",
        a: "Federal and South Carolina estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "alabama-gig-worker-taxes",
    state: "Alabama",
    stateAdjective: "Alabama",
    eyebrow: "State Gig Tax Guide",
    title: "Alabama Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Alabama gig worker taxes: a progressive state income tax (top 5%) plus the 15.3% federal SE tax, with Form 40ES — and possible city taxes. Not tax advice.",
    h1: "Alabama Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Alabama, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Alabama's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Alabama have a state income tax for gig workers?",
    stateBody: [
      "Yes. Alabama has a progressive state income tax topping out at 5%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Alabama Department of Revenue.",
      "Some Alabama cities also levy a local occupational tax on earnings; whether it reaches self-employment income depends on the locality, so check your city's rules if you work in one of them.",
      "Pay Alabama estimated income tax to the Department of Revenue using Form 40ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [AL_DOR, AL_40ES],
    faqs: [
      {
        q: "Do Alabama gig workers pay state income tax?",
        a: "Yes. Alabama's progressive income tax (top rate 5%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 40ES and confirm current brackets with the Alabama Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Alabama?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Alabama cities have a local tax for gig workers?",
        a: "Some Alabama cities levy a local occupational tax on earnings. Whether it applies to self-employment income depends on the city, so check the rules where you work and factor it into your set-aside if it applies.",
      },
      {
        q: "How do I pay Alabama estimated taxes as a gig worker?",
        a: "Use Alabama Form 40ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through My Alabama Taxes. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Alabama gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Alabama taxable income.",
      },
    ],
  },
  {
    slug: "louisiana-gig-worker-taxes",
    state: "Louisiana",
    stateAdjective: "Louisiana",
    eyebrow: "State Gig Tax Guide",
    title: "Louisiana Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Louisiana gig worker taxes: a state income tax (moving to a flat ~3%) plus the 15.3% federal SE tax, with Form IT-540ES. Not tax advice.",
    h1: "Louisiana Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Louisiana, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Louisiana's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Louisiana have a state income tax for gig workers?",
    stateBody: [
      "Yes. Louisiana has been moving its individual income tax toward a flat rate (around 3% under recent reform), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Because the structure changed recently, confirm the current rate with the Louisiana Department of Revenue.",
      "There's no separate Louisiana self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Louisiana estimated income tax to the Department of Revenue using Form IT-540ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [LA_DOR, LA_IT540ES],
    faqs: [
      {
        q: "Do Louisiana gig workers pay state income tax?",
        a: "Yes. Louisiana's state income tax (recently moving toward a flat rate around 3%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form IT-540ES and confirm the current rate with the Louisiana Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Louisiana?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Louisiana estimated taxes as a gig worker?",
        a: "Use Louisiana Form IT-540ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through Louisiana File Online. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Louisiana gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Louisiana taxable income.",
      },
      {
        q: "When are Louisiana gig taxes due?",
        a: "Federal and Louisiana estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-May for Louisiana. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "kentucky-gig-worker-taxes",
    state: "Kentucky",
    stateAdjective: "Kentucky",
    eyebrow: "State Gig Tax Guide",
    title: "Kentucky Gig Worker Taxes: Flat State Tax + Federal SE Tax",
    metaDescription:
      "Kentucky gig worker taxes: a flat state income tax (~4%, declining) plus the 15.3% federal SE tax and possible local taxes, with Form 740-ES. Not tax advice.",
    h1: "Kentucky Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Kentucky, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Kentucky adds a flat state income tax, plus local taxes in many areas. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Kentucky have a state income tax for gig workers?",
    stateBody: [
      "Yes. Kentucky taxes individual income at a flat rate (around 4% and scheduled to keep declining), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Because it's flat, the same percentage applies regardless of income. Confirm the current rate with the Kentucky Department of Revenue.",
      "Kentucky is notable for local taxes: many counties and cities levy a local occupational license tax (often on net profits from self-employment). If you work in such an area, you may owe a local tax in addition to the state tax — check with the local jurisdiction.",
      "Pay Kentucky estimated income tax to the Department of Revenue using Form 740-ES, generally on the same quarterly schedule as your federal estimates. Local occupational taxes are filed separately with the local jurisdiction.",
    ],
    stateResources: [KY_DOR, KY_740ES],
    faqs: [
      {
        q: "Do Kentucky gig workers pay state income tax?",
        a: "Yes. Kentucky has a flat state income tax (around 4%, declining) that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Many Kentucky localities also levy a local occupational tax. Pay state estimates with Form 740-ES and confirm current rates with the Kentucky Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Kentucky?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "Do Kentucky gig workers owe local taxes?",
        a: "Often, yes. Many Kentucky counties and cities levy a local occupational license tax that can apply to net profits from self-employment. If you work in one, you may owe a local tax on top of the state tax — check with the local jurisdiction and include it in your set-aside.",
      },
      {
        q: "How do I pay Kentucky estimated taxes as a gig worker?",
        a: "Use Kentucky Form 740-ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. Local occupational taxes are filed separately with the local jurisdiction. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Kentucky gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Kentucky taxable income.",
      },
    ],
  },
  {
    slug: "oklahoma-gig-worker-taxes",
    state: "Oklahoma",
    stateAdjective: "Oklahoma",
    eyebrow: "State Gig Tax Guide",
    title: "Oklahoma Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Oklahoma gig worker taxes: a progressive state income tax (top ~4.75%) plus the 15.3% federal SE tax, with Form OW-8-ES estimates. Not tax advice.",
    h1: "Oklahoma Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Oklahoma, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Oklahoma's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Oklahoma have a state income tax for gig workers?",
    stateBody: [
      "Yes. Oklahoma has a progressive state income tax with a top rate around 4.75%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Oklahoma Tax Commission.",
      "There's no separate Oklahoma self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Oklahoma estimated income tax to the Tax Commission using Form OW-8-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [OK_TAX, OK_OW8ES],
    faqs: [
      {
        q: "Do Oklahoma gig workers pay state income tax?",
        a: "Yes. Oklahoma's progressive income tax (top rate around 4.75%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form OW-8-ES and confirm current brackets with the Oklahoma Tax Commission.",
      },
      {
        q: "How much should I set aside for taxes in Oklahoma?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Oklahoma estimated taxes as a gig worker?",
        a: "Use Oklahoma Form OW-8-ES to pay state estimated income tax to the Tax Commission, generally four times a year alongside your federal estimates. You can pay online through OkTAP. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Oklahoma gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Oklahoma taxable income.",
      },
      {
        q: "When are Oklahoma gig taxes due?",
        a: "Federal and Oklahoma estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "connecticut-gig-worker-taxes",
    state: "Connecticut",
    stateAdjective: "Connecticut",
    eyebrow: "State Gig Tax Guide",
    title: "Connecticut Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Connecticut gig worker taxes: a progressive state income tax (up to ~6.99%) plus the 15.3% federal SE tax, with Form CT-1040ES. Not tax advice.",
    h1: "Connecticut Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Connecticut, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Connecticut's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Connecticut have a state income tax for gig workers?",
    stateBody: [
      "Yes. Connecticut has a progressive state income tax topping out around 6.99%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Connecticut Department of Revenue Services.",
      "There's no separate Connecticut self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Connecticut estimated income tax to the Department of Revenue Services using Form CT-1040ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [CT_DRS, CT_1040ES],
    faqs: [
      {
        q: "Do Connecticut gig workers pay state income tax?",
        a: "Yes. Connecticut's progressive income tax (up to about 6.99%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form CT-1040ES and confirm current brackets with the Connecticut Department of Revenue Services.",
      },
      {
        q: "How much should I set aside for taxes in Connecticut?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Connecticut estimated taxes as a gig worker?",
        a: "Use Connecticut Form CT-1040ES to pay state estimated income tax to the Department of Revenue Services, generally four times a year alongside your federal estimates. You can pay online through myconneCT. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Connecticut gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Connecticut taxable income.",
      },
      {
        q: "When are Connecticut gig taxes due?",
        a: "Federal and Connecticut estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "utah-gig-worker-taxes",
    state: "Utah",
    stateAdjective: "Utah",
    eyebrow: "State Gig Tax Guide",
    title: "Utah Gig Worker Taxes: Flat State Income Tax + Federal SE Tax",
    metaDescription:
      "Utah gig worker taxes: a flat state income tax (~4.55%, declining) plus the 15.3% federal SE tax, with Form TC-546 prepayments. Not tax advice.",
    h1: "Utah Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Utah, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and because Utah levies a flat state income tax, you also owe state income tax on your net earnings. The flat rate keeps the state piece easy to estimate. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Utah have a state income tax for gig workers?",
    stateBody: [
      "Yes. Utah taxes individual income at a single flat rate (around 4.55% and being gradually reduced), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Because it's flat, the same percentage applies regardless of income level. Confirm the current rate with the Utah State Tax Commission.",
      "There's no separate Utah self-employment tax — the 15.3% SE tax is federal only — but you report and pay the flat state income tax on your net earnings.",
      "Utah uses a prepayment system rather than quarterly vouchers for many filers; you can make estimated prepayments (Form TC-546) to the Tax Commission to avoid a balance due. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [UT_TAX, UT_TC546],
    faqs: [
      {
        q: "Do Utah gig workers pay state income tax?",
        a: "Yes. Utah has a flat state income tax (around 4.55%, declining) that applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Make prepayments with Form TC-546 and confirm the current rate with the Utah State Tax Commission.",
      },
      {
        q: "How much should I set aside for taxes in Utah?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What is the Utah income tax rate for gig workers?",
        a: "Utah uses a single flat individual income tax rate (around 4.55% recently and scheduled to decline), so the same percentage applies to your net gig earnings no matter your income. Confirm the current rate with the Utah State Tax Commission.",
      },
      {
        q: "How do I pay Utah estimated taxes as a gig worker?",
        a: "Utah uses a prepayment system; make state income-tax prepayments (Form TC-546) to the Tax Commission, generally alongside your federal estimates, to avoid a balance due. You can pay online through Taxpayer Access Point (TAP). This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Utah gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering the federal taxable income Utah builds on.",
      },
    ],
  },
  {
    slug: "iowa-gig-worker-taxes",
    state: "Iowa",
    stateAdjective: "Iowa",
    eyebrow: "State Gig Tax Guide",
    title: "Iowa Gig Worker Taxes: Flat State Income Tax + Federal SE Tax",
    metaDescription:
      "Iowa gig worker taxes: a flat state income tax (~3.8%) plus the 15.3% federal SE tax, with IA 1040ES estimates. Not tax advice.",
    h1: "Iowa Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Iowa, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Iowa, which recently moved to a flat state income tax, also taxes your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Iowa have a state income tax for gig workers?",
    stateBody: [
      "Yes. Iowa has moved to a flat individual income tax (around 3.8%), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Because the structure changed recently, confirm the current rate with the Iowa Department of Revenue.",
      "There's no separate Iowa self-employment tax — the 15.3% SE tax is federal only — but you report and pay the flat state income tax on your net earnings.",
      "Pay Iowa estimated income tax to the Department of Revenue using Form IA 1040ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [IA_DOR, IA_1040ES],
    faqs: [
      {
        q: "Do Iowa gig workers pay state income tax?",
        a: "Yes. Iowa's flat state income tax (around 3.8%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form IA 1040ES and confirm the current rate with the Iowa Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Iowa?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Iowa estimated taxes as a gig worker?",
        a: "Use Iowa Form IA 1040ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through GovConnectIowa. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Iowa gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Iowa taxable income.",
      },
      {
        q: "When are Iowa gig taxes due?",
        a: "Federal Iowa estimated payments are generally due around April 15, June 15, September 15, and January 15; Iowa's annual return is due at the end of April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "kansas-gig-worker-taxes",
    state: "Kansas",
    stateAdjective: "Kansas",
    eyebrow: "State Gig Tax Guide",
    title: "Kansas Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Kansas gig worker taxes: a state income tax (top ~5.58%) plus the 15.3% federal SE tax, with Form K-40ES estimates. Not tax advice.",
    h1: "Kansas Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Kansas, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Kansas's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Kansas have a state income tax for gig workers?",
    stateBody: [
      "Yes. Kansas has a two-bracket state income tax with a top rate around 5.58%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Kansas Department of Revenue.",
      "There's no separate Kansas self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Kansas estimated income tax to the Department of Revenue using Form K-40ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [KS_DOR, KS_K40ES],
    faqs: [
      {
        q: "Do Kansas gig workers pay state income tax?",
        a: "Yes. Kansas's state income tax (top rate around 5.58%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form K-40ES and confirm current brackets with the Kansas Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Kansas?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Kansas estimated taxes as a gig worker?",
        a: "Use Kansas Form K-40ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Kansas gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Kansas taxable income.",
      },
      {
        q: "When are Kansas gig taxes due?",
        a: "Federal and Kansas estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "new-mexico-gig-worker-taxes",
    state: "New Mexico",
    stateAdjective: "New Mexico",
    eyebrow: "State Gig Tax Guide",
    title:
      "New Mexico Gig Worker Taxes: Income Tax, Gross Receipts Tax & SE Tax",
    metaDescription:
      "New Mexico gig worker taxes: state income tax (up to ~5.9%), the 15.3% federal SE tax, and a gross receipts tax on many services. Not tax advice.",
    h1: "New Mexico Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in New Mexico, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax, New Mexico's state income tax — and possibly the state's gross receipts tax on services you perform. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does New Mexico have a state income tax for gig workers?",
    stateBody: [
      "Yes. New Mexico has a progressive state income tax topping out around 5.9%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the New Mexico Taxation and Revenue Department.",
      "New Mexico is unusual: it also has a gross receipts tax (GRT) that can apply to many services performed in the state. Depending on what you do and how platforms are set up, some independent contractors must register for and pay GRT on their receipts — check with the department whether your gig work is taxable or qualifies for a deduction.",
      "Pay New Mexico estimated income tax to the department using Form PIT-ES, generally on the same quarterly schedule as your federal estimates. GRT, if it applies, is reported separately. Both are distinct from the estimates you send the IRS.",
    ],
    stateResources: [NM_TRD, NM_PITES],
    faqs: [
      {
        q: "Do New Mexico gig workers pay state income tax?",
        a: "Yes. New Mexico's progressive income tax (up to about 5.9%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form PIT-ES and confirm current brackets with the Taxation and Revenue Department.",
      },
      {
        q: "Does the New Mexico gross receipts tax apply to gig work?",
        a: "It can. New Mexico's gross receipts tax applies to many services performed in the state, and some independent contractors must register for and pay GRT on their receipts. Whether your specific gig work is taxable (or qualifies for a deduction) depends on the facts — confirm with the New Mexico Taxation and Revenue Department.",
      },
      {
        q: "How much should I set aside for taxes in New Mexico?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What can New Mexico gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and New Mexico taxable income.",
      },
      {
        q: "When are New Mexico gig taxes due?",
        a: "Federal and New Mexico estimated income tax payments are generally due around April 15, June 15, September 15, and January 15. If gross receipts tax applies, it is filed on its own schedule. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "nebraska-gig-worker-taxes",
    state: "Nebraska",
    stateAdjective: "Nebraska",
    eyebrow: "State Gig Tax Guide",
    title: "Nebraska Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Nebraska gig worker taxes: a progressive state income tax (top ~4.55%, declining) plus the 15.3% federal SE tax, with Form 1040N-ES. Not tax advice.",
    h1: "Nebraska Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Nebraska, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Nebraska's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Nebraska have a state income tax for gig workers?",
    stateBody: [
      "Yes. Nebraska has a progressive state income tax with a top rate around 4.55% and scheduled to fall to 3.99%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the Nebraska Department of Revenue.",
      "There's no separate Nebraska self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Nebraska estimated income tax to the Department of Revenue using Form 1040N-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [NE_DOR, NE_1040NES],
    faqs: [
      {
        q: "Do Nebraska gig workers pay state income tax?",
        a: "Yes. Nebraska's progressive income tax (top rate around 4.55% and declining toward 3.99%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 1040N-ES and confirm the current rate with the Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Nebraska?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Nebraska estimated taxes as a gig worker?",
        a: "Use Nebraska Form 1040N-ES to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Nebraska gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Nebraska taxable income.",
      },
      {
        q: "When are Nebraska gig taxes due?",
        a: "Federal and Nebraska estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "mississippi-gig-worker-taxes",
    state: "Mississippi",
    stateAdjective: "Mississippi",
    eyebrow: "State Gig Tax Guide",
    title:
      "Mississippi Gig Worker Taxes: Flat State Income Tax + Federal SE Tax",
    metaDescription:
      "Mississippi gig worker taxes: a flat ~4% state income tax (declining) plus the 15.3% federal SE tax, with Form 80-106. Not tax advice.",
    h1: "Mississippi Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Mississippi, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Mississippi's flat state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Mississippi have a state income tax for gig workers?",
    stateBody: [
      "Yes — for now. Mississippi has a flat state income tax around 4% on taxable income above a threshold (the first slice of income is taxed at 0%), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Under recent legislation the rate is scheduled to decline over time, so confirm the current rate with the Mississippi Department of Revenue.",
      "There's no separate Mississippi self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Mississippi estimated income tax to the Department of Revenue using Form 80-106, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [MS_DOR, MS_80106],
    faqs: [
      {
        q: "Do Mississippi gig workers pay state income tax?",
        a: "Yes. Mississippi's flat income tax (around 4% and scheduled to decline) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 80-106 and confirm the current rate with the Department of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Mississippi?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Mississippi estimated taxes as a gig worker?",
        a: "Use Mississippi Form 80-106 to pay state estimated income tax to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the department's TAP portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Mississippi gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Mississippi taxable income.",
      },
      {
        q: "When are Mississippi gig taxes due?",
        a: "Federal and Mississippi estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "arkansas-gig-worker-taxes",
    state: "Arkansas",
    stateAdjective: "Arkansas",
    eyebrow: "State Gig Tax Guide",
    title: "Arkansas Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Arkansas gig worker taxes: a state income tax (top ~3.9%, declining) plus the 15.3% federal SE tax, with Form AR1000ES. Not tax advice.",
    h1: "Arkansas Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Arkansas, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Arkansas's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Arkansas have a state income tax for gig workers?",
    stateBody: [
      "Yes. Arkansas has a state income tax with a top rate around 3.9% (reduced in recent years), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the Arkansas Department of Finance and Administration.",
      "There's no separate Arkansas self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Arkansas estimated income tax to the Department of Finance and Administration using Form AR1000ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [AR_DFA, AR_1000ES],
    faqs: [
      {
        q: "Do Arkansas gig workers pay state income tax?",
        a: "Yes. Arkansas's income tax (top rate around 3.9% and declining) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form AR1000ES and confirm the current rate with the Department of Finance and Administration.",
      },
      {
        q: "How much should I set aside for taxes in Arkansas?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Arkansas estimated taxes as a gig worker?",
        a: "Use Arkansas Form AR1000ES to pay state estimated income tax to the Department of Finance and Administration, generally four times a year alongside your federal estimates. You can pay online through the state's ATAP portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Arkansas gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Arkansas taxable income.",
      },
      {
        q: "When are Arkansas gig taxes due?",
        a: "Federal and Arkansas estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "west-virginia-gig-worker-taxes",
    state: "West Virginia",
    stateAdjective: "West Virginia",
    eyebrow: "State Gig Tax Guide",
    title: "West Virginia Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "West Virginia gig worker taxes: a progressive state income tax (top ~5%, declining) plus the 15.3% federal SE tax, with Form IT-140ES. Not tax advice.",
    h1: "West Virginia Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in West Virginia, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and West Virginia's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does West Virginia have a state income tax for gig workers?",
    stateBody: [
      "Yes. West Virginia has a progressive state income tax with a top rate around 5% (cut in recent years and subject to further reductions), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the West Virginia Tax Division.",
      "There's no separate West Virginia self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay West Virginia estimated income tax to the Tax Division using Form IT-140ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [WV_TAX, WV_IT140ES],
    faqs: [
      {
        q: "Do West Virginia gig workers pay state income tax?",
        a: "Yes. West Virginia's progressive income tax (top rate around 5% and declining) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form IT-140ES and confirm the current rate with the West Virginia Tax Division.",
      },
      {
        q: "How much should I set aside for taxes in West Virginia?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay West Virginia estimated taxes as a gig worker?",
        a: "Use West Virginia Form IT-140ES to pay state estimated income tax to the Tax Division, generally four times a year alongside your federal estimates. You can pay online through the MyTaxes portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can West Virginia gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and West Virginia taxable income.",
      },
      {
        q: "When are West Virginia gig taxes due?",
        a: "Federal and West Virginia estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "idaho-gig-worker-taxes",
    state: "Idaho",
    stateAdjective: "Idaho",
    eyebrow: "State Gig Tax Guide",
    title: "Idaho Gig Worker Taxes: Flat State Income Tax + Federal SE Tax",
    metaDescription:
      "Idaho gig worker taxes: a flat state income tax (~5.3%) plus the 15.3% federal SE tax, with Form 51 estimated payments. Not tax advice.",
    h1: "Idaho Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Idaho, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Idaho's flat state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Idaho have a state income tax for gig workers?",
    stateBody: [
      "Yes. Idaho has a flat state income tax around 5.3% (reduced in recent years), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the Idaho State Tax Commission.",
      "There's no separate Idaho self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Idaho estimated income tax to the State Tax Commission using Form 51, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [ID_TAX, ID_FORM51],
    faqs: [
      {
        q: "Do Idaho gig workers pay state income tax?",
        a: "Yes. Idaho's flat income tax (around 5.3%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 51 and confirm the current rate with the Idaho State Tax Commission.",
      },
      {
        q: "How much should I set aside for taxes in Idaho?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Idaho estimated taxes as a gig worker?",
        a: "Use Idaho Form 51 to pay estimated state income tax to the State Tax Commission, generally four times a year alongside your federal estimates. You can pay online through the Taxpayer Access Point. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Idaho gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Idaho taxable income.",
      },
      {
        q: "When are Idaho gig taxes due?",
        a: "Federal and Idaho estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "hawaii-gig-worker-taxes",
    state: "Hawaii",
    stateAdjective: "Hawaii",
    eyebrow: "State Gig Tax Guide",
    title: "Hawaii Gig Worker Taxes: Income Tax, General Excise Tax & SE Tax",
    metaDescription:
      "Hawaii gig worker taxes: a progressive income tax (up to 11%), the 15.3% federal SE tax, and a general excise tax on business activity. Not tax advice.",
    h1: "Hawaii Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Hawaii, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax, Hawaii's progressive state income tax — and most likely the state's general excise tax on your business activity. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Hawaii have a state income tax for gig workers?",
    stateBody: [
      "Yes. Hawaii has a progressive state income tax topping out at 11% — one of the highest in the country — applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Hawaii Department of Taxation.",
      "Hawaii also has a general excise tax (GET) on virtually all business activity, typically 4% (4.5% on Oahu with the county surcharge), charged on your gross business income rather than profit. Most independent contractors must register for a GET license and pay GET — this is in addition to income tax, so check the rules that apply to you.",
      "Pay Hawaii estimated income tax to the department using Form N-200V, generally on the same quarterly schedule as your federal estimates. GET is reported on its own periodic schedule. Both are separate from the estimates you send the IRS.",
    ],
    stateResources: [HI_TAX, HI_GET],
    faqs: [
      {
        q: "Do Hawaii gig workers pay state income tax?",
        a: "Yes. Hawaii's progressive income tax (up to 11%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form N-200V and confirm current brackets with the Hawaii Department of Taxation.",
      },
      {
        q: "Does the Hawaii general excise tax apply to gig work?",
        a: "Usually yes. Hawaii's general excise tax (GET) applies to nearly all business activity in the state — typically 4%, or 4.5% on Oahu — and is charged on your gross business income, not just profit. Most independent contractors must register for a GET license and pay GET on top of income tax. Confirm your obligations with the Hawaii Department of Taxation.",
      },
      {
        q: "How much should I set aside for taxes in Hawaii?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "What can Hawaii gig workers deduct?",
        a: "For income tax, the biggest deduction is business mileage at the IRS standard mileage rate, plus the business-use share of your phone, supplies, tolls, and parking. Note that the general excise tax is generally based on gross receipts, so those income-tax deductions don't reduce GET.",
      },
      {
        q: "When are Hawaii gig taxes due?",
        a: "Federal and Hawaii estimated income tax payments are generally due around April 15, June 15, September 15, and January 15. General excise tax is filed periodically (monthly, quarterly, or semiannually) with an annual reconciliation. Paying on time avoids penalties.",
      },
    ],
  },
  {
    slug: "maine-gig-worker-taxes",
    state: "Maine",
    stateAdjective: "Maine",
    eyebrow: "State Gig Tax Guide",
    title: "Maine Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Maine gig worker taxes: a progressive state income tax (up to ~7.15%) plus the 15.3% federal SE tax, with Form 1040ES-ME. Not tax advice.",
    h1: "Maine Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Maine, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Maine's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Maine have a state income tax for gig workers?",
    stateBody: [
      "Yes. Maine has a progressive state income tax topping out around 7.15%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with Maine Revenue Services.",
      "There's no separate Maine self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Maine estimated income tax to Maine Revenue Services using Form 1040ES-ME, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [ME_MRS, ME_1040ESME],
    faqs: [
      {
        q: "Do Maine gig workers pay state income tax?",
        a: "Yes. Maine's progressive income tax (up to about 7.15%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 1040ES-ME and confirm current brackets with Maine Revenue Services.",
      },
      {
        q: "How much should I set aside for taxes in Maine?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Maine estimated taxes as a gig worker?",
        a: "Use Maine Form 1040ES-ME to pay state estimated income tax to Maine Revenue Services, generally four times a year alongside your federal estimates. You can pay online through the Maine Tax Portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Maine gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Maine taxable income.",
      },
      {
        q: "When are Maine gig taxes due?",
        a: "Federal and Maine estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "rhode-island-gig-worker-taxes",
    state: "Rhode Island",
    stateAdjective: "Rhode Island",
    eyebrow: "State Gig Tax Guide",
    title: "Rhode Island Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Rhode Island gig worker taxes: a progressive state income tax (up to ~5.99%) plus the 15.3% federal SE tax, with Form RI-1040ES. Not tax advice.",
    h1: "Rhode Island Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Rhode Island, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Rhode Island's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Rhode Island have a state income tax for gig workers?",
    stateBody: [
      "Yes. Rhode Island has a progressive state income tax topping out around 5.99%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Rhode Island Division of Taxation.",
      "There's no separate Rhode Island self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Rhode Island estimated income tax to the Division of Taxation using Form RI-1040ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [RI_TAX, RI_1040ES],
    faqs: [
      {
        q: "Do Rhode Island gig workers pay state income tax?",
        a: "Yes. Rhode Island's progressive income tax (up to about 5.99%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form RI-1040ES and confirm current brackets with the Rhode Island Division of Taxation.",
      },
      {
        q: "How much should I set aside for taxes in Rhode Island?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Rhode Island estimated taxes as a gig worker?",
        a: "Use Rhode Island Form RI-1040ES to pay state estimated income tax to the Division of Taxation, generally four times a year alongside your federal estimates. You can pay online through the state's tax portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Rhode Island gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Rhode Island taxable income.",
      },
      {
        q: "When are Rhode Island gig taxes due?",
        a: "Federal and Rhode Island estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "alaska-gig-worker-taxes",
    state: "Alaska",
    stateAdjective: "Alaska",
    eyebrow: "State Gig Tax Guide",
    title: "Alaska Gig Worker Taxes: No State Income Tax, Federal & SE Tax",
    metaDescription:
      "Alaska gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Alaska Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Alaska, platforms pay you as an independent contractor and withhold nothing. The good news: Alaska has no personal state income tax — and no statewide sales tax either. The catch: your federal obligations — income tax plus the 15.3% self-employment tax — apply in full. Here's how it works.",
    hasStateIncomeTax: false,
    stateHeading: "Does Alaska have a state income tax for gig workers?",
    stateBody: [
      "No. Alaska does not levy a personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state income-tax estimates to make. Some Alaska boroughs and cities do levy local sales taxes, but those aren't income taxes on your earnings.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Because there's no state income tax to pay, you only send federal estimated payments to the IRS — but you should still make those quarterly if you expect to owe $1,000 or more for the year.",
    ],
    stateResources: [AK_DOR],
    faqs: [
      {
        q: "Do Alaska gig workers pay state income tax?",
        a: "No. Alaska has no personal state income tax, so your gig earnings aren't subject to state income tax and there are no state estimated payments. You still owe federal income tax and the 15.3% federal self-employment tax.",
      },
      {
        q: "How much should I set aside for taxes in Alaska?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "Is gig income tax-free in Alaska?",
        a: "No. While Alaska charges no state income tax, your federal obligations apply in full: federal income tax on your net profit plus the 15.3% self-employment tax. Report all income whether or not a platform sends a 1099.",
      },
      {
        q: "Do Alaska gig workers pay quarterly taxes?",
        a: "Yes — federal quarterly estimated payments. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects payments around April 15, June 15, September 15, and January 15. There are no Alaska state estimates to make.",
      },
      {
        q: "What can Alaska gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking — all of which reduce your federal taxable income.",
      },
    ],
  },
  {
    slug: "new-hampshire-gig-worker-taxes",
    state: "New Hampshire",
    stateAdjective: "New Hampshire",
    eyebrow: "State Gig Tax Guide",
    title: "New Hampshire Gig Worker Taxes: No Income Tax on Earnings + SE Tax",
    metaDescription:
      "New Hampshire gig worker taxes: no income tax on earned income; federal income tax + the 15.3% SE tax still apply. Not tax advice.",
    h1: "New Hampshire Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in New Hampshire, platforms pay you as an independent contractor and withhold nothing. The good news: New Hampshire does not tax earned income, and its old interest & dividends tax was repealed in 2025. The catch: your federal obligations — income tax plus the 15.3% self-employment tax — apply in full. Here's how it works.",
    hasStateIncomeTax: false,
    stateHeading: "Does New Hampshire have a state income tax for gig workers?",
    stateBody: [
      "No. New Hampshire has never taxed earned income (wages or self-employment), and its separate tax on interest and dividends was fully repealed effective 2025. So your gig earnings face no New Hampshire income tax, and there are no state income-tax estimates to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Because there's no state income tax to pay, you only send federal estimated payments to the IRS — but you should still make those quarterly if you expect to owe $1,000 or more for the year.",
    ],
    stateResources: [NH_DRA],
    faqs: [
      {
        q: "Do New Hampshire gig workers pay state income tax?",
        a: "No. New Hampshire doesn't tax earned income, and its interest & dividends tax ended in 2025, so your gig earnings aren't subject to state income tax. You still owe federal income tax and the 15.3% federal self-employment tax.",
      },
      {
        q: "How much should I set aside for taxes in New Hampshire?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "Is gig income tax-free in New Hampshire?",
        a: "Not at the federal level. New Hampshire charges no income tax on your earnings, but your federal obligations apply in full: federal income tax on your net profit plus the 15.3% self-employment tax. Report all income whether or not a platform sends a 1099.",
      },
      {
        q: "Do New Hampshire gig workers pay quarterly taxes?",
        a: "Yes — federal quarterly estimated payments. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects payments around April 15, June 15, September 15, and January 15. There are no New Hampshire state estimates to make.",
      },
      {
        q: "What can New Hampshire gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking — all of which reduce your federal taxable income.",
      },
    ],
  },
  {
    slug: "south-dakota-gig-worker-taxes",
    state: "South Dakota",
    stateAdjective: "South Dakota",
    eyebrow: "State Gig Tax Guide",
    title:
      "South Dakota Gig Worker Taxes: No State Income Tax, Federal & SE Tax",
    metaDescription:
      "South Dakota gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "South Dakota Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in South Dakota, platforms pay you as an independent contractor and withhold nothing. The good news: South Dakota has no personal state income tax. The catch: your federal obligations — income tax plus the 15.3% self-employment tax — apply in full. Here's how it works.",
    hasStateIncomeTax: false,
    stateHeading: "Does South Dakota have a state income tax for gig workers?",
    stateBody: [
      "No. South Dakota does not levy a personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state income-tax estimates to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Because there's no state income tax to pay, you only send federal estimated payments to the IRS — but you should still make those quarterly if you expect to owe $1,000 or more for the year.",
    ],
    stateResources: [SD_DOR],
    faqs: [
      {
        q: "Do South Dakota gig workers pay state income tax?",
        a: "No. South Dakota has no personal state income tax, so your gig earnings aren't subject to state income tax and there are no state estimated payments. You still owe federal income tax and the 15.3% federal self-employment tax.",
      },
      {
        q: "How much should I set aside for taxes in South Dakota?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "Is gig income tax-free in South Dakota?",
        a: "No. While South Dakota charges no state income tax, your federal obligations apply in full: federal income tax on your net profit plus the 15.3% self-employment tax. Report all income whether or not a platform sends a 1099.",
      },
      {
        q: "Do South Dakota gig workers pay quarterly taxes?",
        a: "Yes — federal quarterly estimated payments. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects payments around April 15, June 15, September 15, and January 15. There are no South Dakota state estimates to make.",
      },
      {
        q: "What can South Dakota gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking — all of which reduce your federal taxable income.",
      },
    ],
  },
  {
    slug: "wyoming-gig-worker-taxes",
    state: "Wyoming",
    stateAdjective: "Wyoming",
    eyebrow: "State Gig Tax Guide",
    title: "Wyoming Gig Worker Taxes: No State Income Tax, Federal & SE Tax",
    metaDescription:
      "Wyoming gig worker taxes: no state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    h1: "Wyoming Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Wyoming, platforms pay you as an independent contractor and withhold nothing. The good news: Wyoming has no personal state income tax. The catch: your federal obligations — income tax plus the 15.3% self-employment tax — apply in full. Here's how it works.",
    hasStateIncomeTax: false,
    stateHeading: "Does Wyoming have a state income tax for gig workers?",
    stateBody: [
      "No. Wyoming does not levy a personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state income-tax estimates to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Because there's no state income tax to pay, you only send federal estimated payments to the IRS — but you should still make those quarterly if you expect to owe $1,000 or more for the year.",
    ],
    stateResources: [WY_DOR],
    faqs: [
      {
        q: "Do Wyoming gig workers pay state income tax?",
        a: "No. Wyoming has no personal state income tax, so your gig earnings aren't subject to state income tax and there are no state estimated payments. You still owe federal income tax and the 15.3% federal self-employment tax.",
      },
      {
        q: "How much should I set aside for taxes in Wyoming?",
        a: SET_ASIDE_NO_STATE_TAX,
      },
      {
        q: "Is gig income tax-free in Wyoming?",
        a: "No. While Wyoming charges no state income tax, your federal obligations apply in full: federal income tax on your net profit plus the 15.3% self-employment tax. Report all income whether or not a platform sends a 1099.",
      },
      {
        q: "Do Wyoming gig workers pay quarterly taxes?",
        a: "Yes — federal quarterly estimated payments. If you expect to owe $1,000 or more in federal tax for the year, the IRS generally expects payments around April 15, June 15, September 15, and January 15. There are no Wyoming state estimates to make.",
      },
      {
        q: "What can Wyoming gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working. You can also deduct the business-use share of your phone, supplies, tolls, and parking — all of which reduce your federal taxable income.",
      },
    ],
  },
  {
    slug: "delaware-gig-worker-taxes",
    state: "Delaware",
    stateAdjective: "Delaware",
    eyebrow: "State Gig Tax Guide",
    title: "Delaware Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Delaware gig worker taxes: a progressive state income tax (up to ~6.6%) plus the 15.3% federal SE tax, with Form 200-ES. Not tax advice.",
    h1: "Delaware Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Delaware, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Delaware's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Delaware have a state income tax for gig workers?",
    stateBody: [
      "Yes. Delaware has a progressive state income tax topping out around 6.6%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Delaware Division of Revenue. (Note: the city of Wilmington also levies a local earned-income tax on work performed there.)",
      "There's no separate Delaware self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Delaware estimated income tax to the Division of Revenue using Form 200-ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [DE_DOR, DE_200ES],
    faqs: [
      {
        q: "Do Delaware gig workers pay state income tax?",
        a: "Yes. Delaware's progressive income tax (up to about 6.6%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form 200-ES and confirm current brackets with the Delaware Division of Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Delaware?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Delaware estimated taxes as a gig worker?",
        a: "Use Delaware Form 200-ES to pay state estimated income tax to the Division of Revenue, generally four times a year alongside your federal estimates. You can pay online through the state's portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Delaware gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Delaware taxable income.",
      },
      {
        q: "When are Delaware gig taxes due?",
        a: "Federal and Delaware estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due around the end of April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "montana-gig-worker-taxes",
    state: "Montana",
    stateAdjective: "Montana",
    eyebrow: "State Gig Tax Guide",
    title: "Montana Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Montana gig worker taxes: a state income tax (top ~5.65%, declining) plus the 15.3% federal SE tax, with estimated payments. Not tax advice.",
    h1: "Montana Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Montana, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Montana's state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Montana have a state income tax for gig workers?",
    stateBody: [
      "Yes. Montana has a two-bracket state income tax with a top rate around 5.65% (reduced from 5.9% and scheduled to fall further), applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm the current rate with the Montana Department of Revenue. Montana also has no general sales tax.",
      "There's no separate Montana self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Montana estimated income tax to the Department of Revenue, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [MT_DOR, MT_ESTIMATE],
    faqs: [
      {
        q: "Do Montana gig workers pay state income tax?",
        a: "Yes. Montana's income tax (top rate around 5.65% and declining) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates to the Department of Revenue and confirm the current rate.",
      },
      {
        q: "How much should I set aside for taxes in Montana?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Montana estimated taxes as a gig worker?",
        a: "Make Montana estimated income tax payments to the Department of Revenue, generally four times a year alongside your federal estimates. You can pay online through the state's TransAction Portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Montana gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Montana taxable income.",
      },
      {
        q: "When are Montana gig taxes due?",
        a: "Federal and Montana estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "north-dakota-gig-worker-taxes",
    state: "North Dakota",
    stateAdjective: "North Dakota",
    eyebrow: "State Gig Tax Guide",
    title:
      "North Dakota Gig Worker Taxes: Low State Income Tax + Federal SE Tax",
    metaDescription:
      "North Dakota gig worker taxes: a low state income tax (top ~2.5%) plus the 15.3% federal SE tax, with Form ND-1ES. Not tax advice.",
    h1: "North Dakota Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in North Dakota, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and North Dakota's (low) state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does North Dakota have a state income tax for gig workers?",
    stateBody: [
      "Yes, but it's low. After a 2023 reform, North Dakota has just three brackets — 0%, about 1.95%, and a top rate around 2.5%, among the lowest in the country — applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the North Dakota Office of State Tax Commissioner.",
      "There's no separate North Dakota self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay North Dakota estimated income tax to the Office of State Tax Commissioner using Form ND-1ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [ND_TAX, ND_1ES],
    faqs: [
      {
        q: "Do North Dakota gig workers pay state income tax?",
        a: "Yes, but North Dakota's rates are among the lowest in the nation — three brackets of 0%, ~1.95%, and a top of ~2.5%. That applies on top of federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form ND-1ES.",
      },
      {
        q: "How much should I set aside for taxes in North Dakota?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay North Dakota estimated taxes as a gig worker?",
        a: "Use North Dakota Form ND-1ES to pay state estimated income tax to the Office of State Tax Commissioner, generally four times a year alongside your federal estimates. You can pay online through the ND TAP portal. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can North Dakota gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and North Dakota taxable income.",
      },
      {
        q: "When are North Dakota gig taxes due?",
        a: "Federal and North Dakota estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "vermont-gig-worker-taxes",
    state: "Vermont",
    stateAdjective: "Vermont",
    eyebrow: "State Gig Tax Guide",
    title: "Vermont Gig Worker Taxes: State Income Tax + Federal SE Tax",
    metaDescription:
      "Vermont gig worker taxes: a progressive state income tax (up to ~8.75%) plus the 15.3% federal SE tax, with Form IN-114. Not tax advice.",
    h1: "Vermont Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Vermont, platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and Vermont's progressive state income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading: "Does Vermont have a state income tax for gig workers?",
    stateBody: [
      "Yes. Vermont has a progressive state income tax topping out around 8.75%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. Confirm current brackets with the Vermont Department of Taxes.",
      "There's no separate Vermont self-employment tax — the 15.3% SE tax is federal only — but you report and pay state income tax on your net earnings.",
      "Pay Vermont estimated income tax to the Department of Taxes using Form IN-114, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [VT_TAX, VT_IN114],
    faqs: [
      {
        q: "Do Vermont gig workers pay state income tax?",
        a: "Yes. Vermont's progressive income tax (up to about 8.75%) applies to your net gig earnings in addition to federal income tax and the 15.3% federal self-employment tax. Pay state estimates with Form IN-114 and confirm current brackets with the Vermont Department of Taxes.",
      },
      {
        q: "How much should I set aside for taxes in Vermont?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay Vermont estimated taxes as a gig worker?",
        a: "Use Vermont Form IN-114 to pay state estimated income tax to the Department of Taxes, generally four times a year alongside your federal estimates. You can pay online through myVTax. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Vermont gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and Vermont taxable income.",
      },
      {
        q: "When are Vermont gig taxes due?",
        a: "Federal and Vermont estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
  {
    slug: "washington-dc-gig-worker-taxes",
    state: "Washington, D.C.",
    stateAdjective: "D.C.",
    eyebrow: "State Gig Tax Guide",
    title:
      "Washington D.C. Gig Worker Taxes: Local Income Tax + Federal SE Tax",
    metaDescription:
      "Washington D.C. gig worker taxes: a progressive local income tax (up to ~10.75%) plus the 15.3% federal SE tax, with Form D-40ES. Not tax advice.",
    h1: "Washington D.C. Gig Worker Taxes: The Complete Breakdown",
    intro:
      "If you drive, deliver, or freelance in Washington, D.C., platforms pay you as an independent contractor and withhold nothing. You owe the 15.3% federal self-employment tax and federal income tax — and the District's progressive local income tax also applies to your net earnings. Here's how it works.",
    hasStateIncomeTax: true,
    stateHeading:
      "Does Washington, D.C. have a local income tax for gig workers?",
    stateBody: [
      "Yes. The District of Columbia has a progressive income tax topping out around 10.75%, applied to your net gig profit on top of federal income tax and the 15.3% federal self-employment tax. D.C. taxes residents; confirm current brackets with the D.C. Office of Tax and Revenue.",
      "There's no separate D.C. self-employment tax — the 15.3% SE tax is federal only — but District residents report and pay local income tax on their net earnings.",
      "Pay D.C. estimated income tax to the Office of Tax and Revenue using Form D-40ES, generally on the same quarterly schedule as your federal estimates. This is separate from the estimated payments you send the IRS.",
    ],
    stateResources: [DC_OTR, DC_D40ES],
    faqs: [
      {
        q: "Do Washington, D.C. gig workers pay local income tax?",
        a: "Yes. D.C. residents pay the District's progressive income tax (up to about 10.75%) on their net gig earnings, in addition to federal income tax and the 15.3% federal self-employment tax. Pay estimates with Form D-40ES and confirm current brackets with the D.C. Office of Tax and Revenue.",
      },
      {
        q: "How much should I set aside for taxes in Washington, D.C.?",
        a: SET_ASIDE_WITH_STATE_TAX,
      },
      {
        q: "How do I pay D.C. estimated taxes as a gig worker?",
        a: "Use D.C. Form D-40ES to pay estimated local income tax to the Office of Tax and Revenue, generally four times a year alongside your federal estimates. You can pay online through MyTax.DC.gov. This is separate from your federal estimated payments to the IRS.",
      },
      {
        q: "What can Washington, D.C. gig workers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while working, plus the business-use share of your phone, supplies, tolls, and parking — lowering both your federal and D.C. taxable income.",
      },
      {
        q: "When are Washington, D.C. gig taxes due?",
        a: "Federal and D.C. estimated payments are generally due around April 15, June 15, September 15, and January 15, with annual returns due in mid-April. Paying quarterly avoids underpayment penalties.",
      },
    ],
  },
];

export function getStateTaxGuide(slug: string): StateTaxGuide | undefined {
  return STATE_TAX_GUIDES.find(g => g.slug === slug);
}
