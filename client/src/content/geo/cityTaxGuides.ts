/**
 * cityTaxGuides.ts — content for the city/local gig-worker tax guide cluster
 * (/new-york-city-gig-worker-taxes, /philadelphia-gig-worker-taxes, …).
 *
 * These extend the state cluster downward to the handful of U.S. cities that
 * levy a LOCAL tax actually reaching a self-employed gig worker's net earnings
 * — not just an employee wage tax. Local rates and thresholds change yearly and
 * the resident-vs-works-in-city rules are nuanced, so copy here states evergreen
 * structure (this tax exists, it's on top of federal + state, who it applies to,
 * where to pay) and links the city/state agency for current numbers. Always
 * qualified, never tax advice.
 */

export interface CityFaq {
  q: string;
  a: string;
}

export interface ResourceLink {
  label: string;
  href: string;
}

export interface CityTaxGuide {
  /** Route slug, also the prerendered file name. */
  slug: string;
  /** City name, e.g. "Philadelphia". */
  city: string;
  /** State the city is in, e.g. "Pennsylvania". */
  state: string;
  /** Adjective form used in "<x> gig workers", e.g. "Philadelphia". */
  cityAdjective: string;
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
  /** Short name of the local tax, e.g. "Net Profits Tax". */
  localTaxName: string;
  /** Heading for the local-tax treatment section. */
  localHeading: string;
  /** Local-tax treatment paragraphs (what it is, who owes it, where to pay). */
  localBody: string[];
  /** Slug of the parent state guide to cross-link. */
  stateGuideSlug: string;
  /** Label for the parent state guide cross-link. */
  stateGuideLabel: string;
  /** Authoritative city/state tax-agency links (rendered with the IRS links). */
  localResources: ResourceLink[];
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: CityFaq[];
}

// ---- Reusable city / state revenue-agency links -------------------------

const NYC_DOF = {
  label: "NYC Department of Finance",
  href: "https://www.nyc.gov/site/finance/index.page",
};
const NYS_TAX = {
  label: "New York State Department of Taxation and Finance",
  href: "https://www.tax.ny.gov/",
};
const PHILLY_REV = {
  label: "Philadelphia Department of Revenue",
  href: "https://www.phila.gov/departments/department-of-revenue/",
};
const PA_REV = {
  label: "Pennsylvania Department of Revenue",
  href: "https://www.revenue.pa.gov/",
};
const PORTLAND_REV = {
  label: "City of Portland Revenue Division (Metro SHS & Multnomah PFA)",
  href: "https://www.portland.gov/revenue/personal-tax",
};
const OR_DOR = {
  label: "Oregon Department of Revenue",
  href: "https://www.oregon.gov/dor/",
};
const DETROIT_TAX = {
  label: "Michigan Treasury: Detroit city income tax",
  href: "https://www.michigan.gov/taxes/city-taxes/detroit",
};
const MI_TREASURY = {
  label: "Michigan Department of Treasury",
  href: "https://www.michigan.gov/taxes",
};
const KCMO_ETAX = {
  label: "Kansas City, MO: Earnings Tax (E-Tax)",
  href: "https://www.kcmo.gov/city-hall/departments/finance/earnings-tax",
};
const MO_DOR = {
  label: "Missouri Department of Revenue",
  href: "https://dor.mo.gov/",
};

export const CITY_TAX_GUIDES: CityTaxGuide[] = [
  {
    slug: "new-york-city-gig-worker-taxes",
    city: "New York City",
    state: "New York",
    cityAdjective: "New York City",
    eyebrow: "City Gig Tax Guide",
    title: "New York City Gig Worker Taxes: NYC Income Tax, UBT & Estimates",
    metaDescription:
      "New York City gig worker taxes: the NYC resident income tax (and possible UBT) on top of New York State and the 15.3% federal SE tax. Not tax advice.",
    h1: "New York City Gig Worker Taxes",
    intro:
      "Gig work in New York City can carry three layers of income tax — federal, New York State, and New York City itself. On top of the 15.3% federal self-employment tax that every gig worker owes, NYC residents pay a city income tax, and higher earners may even meet a separate business tax. Here's who owes what, and how to keep it straight.",
    localTaxName: "NYC personal income tax",
    localHeading: "Does New York City have a local tax for gig workers?",
    localBody: [
      "Yes — if you live in New York City. NYC levies its own personal income tax on city residents, on top of New York State income tax and the federal 15.3% self-employment tax. Your net gig profit is added to your other income and taxed at your NYC resident rate, and you pay it through your New York State return, which calculates the city tax for residents.",
      "If you live outside the five boroughs but drive or deliver in the city, you generally do not owe NYC's personal income tax — New York City does not tax nonresidents' income (the old commuter tax was repealed). You would still owe New York State tax as a nonresident on income earned in the state.",
      "Higher-earning self-employed New Yorkers should also watch for the NYC Unincorporated Business Tax (UBT), which can apply to a sole proprietor's net business income carried on in the city above a threshold (a credit offsets it for many filers). Whether it reaches app-based drivers and where the thresholds fall are nuanced — confirm your situation with the NYC Department of Finance or a tax professional.",
    ],
    stateGuideSlug: "new-york-gig-worker-taxes",
    stateGuideLabel: "New York gig worker taxes",
    localResources: [NYC_DOF, NYS_TAX],
    faqs: [
      {
        q: "Do New York City gig workers pay a city income tax?",
        a: "If you're a NYC resident, yes — the city's personal income tax applies to your net gig earnings on top of New York State and federal tax, and you pay it through your New York State return. Nonresidents who only work in the city generally do not owe NYC's personal income tax.",
      },
      {
        q: "Does NYC tax gig workers who don't live in the city?",
        a: "Generally no. New York City does not tax nonresidents' income — the old commuter tax was repealed — so if you live outside the five boroughs you typically owe no NYC personal income tax, though you would still owe New York State tax as a nonresident on income earned in the state.",
      },
      {
        q: "What is the NYC Unincorporated Business Tax (UBT)?",
        a: "The UBT is a New York City tax on unincorporated businesses (including sole proprietors) carrying on business in the city, applying to net business income above a threshold, with a credit that offsets it for many filers. Whether it applies to your gig work is nuanced — confirm with the NYC Department of Finance.",
      },
      {
        q: "How do NYC residents pay the city income tax?",
        a: "For most residents the New York City personal income tax is calculated and paid as part of your New York State income tax return — there's no separate city return for it. The Unincorporated Business Tax, if it applies to you, is filed separately with the city.",
      },
      {
        q: "How much should I set aside for taxes in New York City?",
        a: "Beyond the common 25–30% set-aside for federal income tax and the 15.3% self-employment tax, NYC residents owe additional New York State and New York City income tax, so many set aside somewhat more. Your exact rate depends on your bracket — use the Tax Set-Aside calculator and confirm with the city and state.",
      },
    ],
  },
  {
    slug: "philadelphia-gig-worker-taxes",
    city: "Philadelphia",
    state: "Pennsylvania",
    cityAdjective: "Philadelphia",
    eyebrow: "City Gig Tax Guide",
    title: "Philadelphia Gig Worker Taxes: Net Profits Tax, BIRT & Estimates",
    metaDescription:
      "Philadelphia gig worker taxes: the Net Profits Tax on self-employed profit (plus BIRT), on top of PA state and the 15.3% federal SE tax. Not tax advice.",
    h1: "Philadelphia Gig Worker Taxes",
    intro:
      "Philadelphia is one of the few U.S. cities that taxes self-employed people directly — so as a gig worker here you face a city tax most independent contractors never deal with, on top of Pennsylvania state tax and the federal 15.3% self-employment tax. Here's how the city's Net Profits Tax and Business Income & Receipts Tax work for gig workers.",
    localTaxName: "Net Profits Tax",
    localHeading: "Does Philadelphia have a local tax for gig workers?",
    localBody: [
      "Yes. Philadelphia is unusual in taxing self-employed people directly through the Net Profits Tax (NPT). The city's better-known Wage Tax is withheld from employees' paychecks — but as a gig worker you're not an employee, so instead you owe NPT on your net business profit. Residents owe NPT on all their net profit; nonresidents owe it on the profit from work done in Philadelphia.",
      "Many self-employed Philadelphians also have to file the Business Income & Receipts Tax (BIRT), the city's tax on doing business in Philadelphia, though there's a filing exclusion for businesses under a gross-receipts threshold. These city taxes are on top of Pennsylvania's flat state income tax and the federal 15.3% self-employment tax.",
      "Rates, the BIRT exclusion amount, and filing rules change, so confirm the current figures and whether BIRT applies to you with the Philadelphia Department of Revenue or a tax professional. You file and pay these with the city, separately from your state and federal returns.",
    ],
    stateGuideSlug: "pennsylvania-gig-worker-taxes",
    stateGuideLabel: "Pennsylvania gig worker taxes",
    localResources: [PHILLY_REV, PA_REV],
    faqs: [
      {
        q: "Do Philadelphia gig workers pay the Wage Tax?",
        a: "No — the Philadelphia Wage Tax is withheld from employees' paychecks. As a self-employed gig worker you instead owe the Net Profits Tax (NPT) on your net business profit, and possibly the Business Income & Receipts Tax (BIRT).",
      },
      {
        q: "What is the Philadelphia Net Profits Tax?",
        a: "The NPT is a Philadelphia tax on the net profits of self-employed individuals and unincorporated businesses. Residents owe it on all their net profit; nonresidents owe it on profit from work performed in Philadelphia. It's separate from, and on top of, Pennsylvania state income tax.",
      },
      {
        q: "Do I have to file BIRT as a gig worker in Philadelphia?",
        a: "Often yes if you're doing business in the city, but Philadelphia provides a filing exclusion for businesses with gross receipts under a set threshold. The threshold and rules change, so confirm whether BIRT applies to you with the Philadelphia Department of Revenue.",
      },
      {
        q: "Are Philadelphia city taxes on top of Pennsylvania state tax?",
        a: "Yes. The Net Profits Tax and BIRT are city taxes that apply in addition to Pennsylvania's flat state income tax and the federal income and 15.3% self-employment taxes. Gig workers in Philadelphia can face all of these layers.",
      },
      {
        q: "How much should I set aside for taxes in Philadelphia?",
        a: "Beyond the common 25–30% for federal income tax and the 15.3% self-employment tax, factor in Pennsylvania's flat state tax and the city's Net Profits Tax (and BIRT if it applies), so many set aside more. Use the Tax Set-Aside calculator and confirm current city rates with the Department of Revenue.",
      },
    ],
  },
  {
    slug: "portland-gig-worker-taxes",
    city: "Portland",
    state: "Oregon",
    cityAdjective: "Portland",
    eyebrow: "City Gig Tax Guide",
    title: "Portland, OR Gig Worker Taxes: Metro & Multnomah Local Taxes",
    metaDescription:
      "Portland, OR gig worker taxes: the Metro SHS and Multnomah Preschool for All income taxes above thresholds, on top of Oregon and federal tax. Not advice.",
    h1: "Portland, Oregon Gig Worker Taxes",
    intro:
      "Gig workers in the Portland area can face two local personal income taxes that most of the country has never heard of — the Metro Supportive Housing Services tax and Multnomah County's Preschool for All tax — on top of Oregon's state income tax and the federal 15.3% self-employment tax. The good news: both only kick in above income thresholds. Here's how they work.",
    localTaxName: "Metro SHS & Multnomah PFA taxes",
    localHeading: "Does Portland have local taxes for gig workers?",
    localBody: [
      "Yes — the Portland area has two local personal income taxes beyond Oregon's state income tax. The Metro Supportive Housing Services (SHS) tax funds homeless services across the Portland metro area, and Multnomah County's Preschool for All (PFA) tax funds preschool. Both apply to your income, including net gig earnings, if you live in the jurisdiction (or earn income sourced there).",
      "Crucially, both taxes only apply to income above set thresholds — they're aimed at higher earners, so a gig worker with income below the threshold generally owes neither, and above it the tax applies only to the portion over the threshold. The thresholds and rates change, so check whether your income reaches them.",
      "These local taxes stack on top of Oregon's state income tax (one of the higher state rates) and the federal 15.3% self-employment tax. They're administered by the City of Portland's Revenue Division, which collects both the Metro and Multnomah County taxes — confirm current thresholds, rates, and filing with them or a tax professional.",
    ],
    stateGuideSlug: "oregon-gig-worker-taxes",
    stateGuideLabel: "Oregon gig worker taxes",
    localResources: [PORTLAND_REV, OR_DOR],
    faqs: [
      {
        q: "What local income taxes does Portland have?",
        a: "Two: the Metro Supportive Housing Services (SHS) tax across the Portland metro area, and Multnomah County's Preschool for All (PFA) tax. Both are personal income taxes that apply to net gig earnings above set thresholds, on top of Oregon state income tax and federal tax.",
      },
      {
        q: "Do all Portland gig workers owe these local taxes?",
        a: "No. Both the Metro SHS and Multnomah PFA taxes only apply to income above set thresholds aimed at higher earners, so a gig worker with income below the threshold generally owes neither. Above the threshold, only the portion over it is taxed. Confirm the current thresholds with the Portland Revenue Division.",
      },
      {
        q: "Who administers the Metro and Preschool for All taxes?",
        a: "The City of Portland's Revenue Division administers and collects both the Metro Supportive Housing Services tax and the Multnomah County Preschool for All tax, separately from your Oregon state return. They're the place to confirm thresholds, rates, and filing requirements.",
      },
      {
        q: "Are these on top of Oregon state income tax?",
        a: "Yes. The Metro SHS and Multnomah PFA taxes are local taxes that apply in addition to Oregon's state income tax (one of the higher state rates) and the federal income and 15.3% self-employment taxes.",
      },
      {
        q: "How much should I set aside for taxes in Portland?",
        a: "Beyond the common 25–30% for federal income tax and the 15.3% self-employment tax, Oregon's state income tax is relatively high, and high earners may owe the Metro and Multnomah local taxes too. Use the Tax Set-Aside calculator and confirm current rates and thresholds with the state and the Portland Revenue Division.",
      },
    ],
  },
  {
    slug: "detroit-gig-worker-taxes",
    city: "Detroit",
    state: "Michigan",
    cityAdjective: "Detroit",
    eyebrow: "City Gig Tax Guide",
    title: "Detroit Gig Worker Taxes: City Income Tax & Quarterly Estimates",
    metaDescription:
      "Detroit gig worker taxes: the Detroit city income tax for residents and on work done in the city, on top of Michigan and the 15.3% SE tax. Not tax advice.",
    h1: "Detroit Gig Worker Taxes",
    intro:
      "Detroit is one of the Michigan cities that levies its own income tax, and it reaches gig earnings. On top of Michigan's flat state income tax and the federal 15.3% self-employment tax, gig workers who live in or work in Detroit owe a city income tax too. Here's who owes it and how it's paid.",
    localTaxName: "Detroit city income tax",
    localHeading: "Does Detroit have a city income tax for gig workers?",
    localBody: [
      "Yes. Detroit levies a city income tax that applies to gig earnings. If you live in Detroit, it applies to all of your net self-employment profit; if you live elsewhere but do gig work in the city, it applies to the income you earn from work performed in Detroit. Residents and nonresidents are taxed at different rates.",
      "This city tax is on top of Michigan's flat state income tax and the federal 15.3% self-employment tax. The Detroit city income tax is administered through the Michigan Department of Treasury, and self-employed workers file a Detroit return reporting their net profit.",
      "Rates and rules change, and apportioning income for work done partly inside and partly outside the city can be involved, so confirm the current rates and filing requirements with the Michigan Department of Treasury or a tax professional.",
    ],
    stateGuideSlug: "michigan-gig-worker-taxes",
    stateGuideLabel: "Michigan gig worker taxes",
    localResources: [DETROIT_TAX, MI_TREASURY],
    faqs: [
      {
        q: "Do Detroit gig workers pay a city income tax?",
        a: "Yes. Detroit residents owe the city income tax on all of their net self-employment profit, and nonresidents owe it on income earned from work performed in Detroit. Residents and nonresidents are taxed at different rates, on top of Michigan state and federal tax.",
      },
      {
        q: "How do I pay Detroit city income tax as a gig worker?",
        a: "You file a Detroit city income tax return reporting your net self-employment profit. The tax is administered through the Michigan Department of Treasury, and because nothing is withheld from gig payouts you may also need to make estimated payments. Confirm the current forms and schedule with Treasury.",
      },
      {
        q: "What if I live outside Detroit but deliver in the city?",
        a: "Detroit's nonresident city income tax applies to income you earn from work performed within the city, generally at a lower rate than the resident tax. Apportioning income between work done inside and outside Detroit can be involved — confirm the rules with the Michigan Department of Treasury.",
      },
      {
        q: "Is the Detroit tax on top of Michigan state tax?",
        a: "Yes. The Detroit city income tax applies in addition to Michigan's flat state income tax and the federal income and 15.3% self-employment taxes. Gig workers tied to Detroit can face all three layers.",
      },
      {
        q: "How much should I set aside for taxes in Detroit?",
        a: "Beyond the common 25–30% for federal income tax and the 15.3% self-employment tax, add Michigan's flat state income tax and the Detroit city income tax, so many set aside a bit more. Use the Tax Set-Aside calculator and confirm current city rates with the Michigan Department of Treasury.",
      },
    ],
  },
  {
    slug: "kansas-city-gig-worker-taxes",
    city: "Kansas City",
    state: "Missouri",
    cityAdjective: "Kansas City",
    eyebrow: "City Gig Tax Guide",
    title: "Kansas City Gig Worker Taxes: The 1% Earnings Tax Explained",
    metaDescription:
      "Kansas City, MO gig worker taxes: the 1% earnings tax (E-Tax) on net business earnings, on top of Missouri and the 15.3% federal SE tax. Not tax advice.",
    h1: "Kansas City Gig Worker Taxes",
    intro:
      "Kansas City, Missouri charges a 1% earnings tax — the 'E-Tax' — that catches gig workers in a way many don't expect, since it applies to self-employment earnings, not just employee wages. It sits on top of Missouri state income tax and the federal 15.3% self-employment tax. Here's who owes it and how to handle it.",
    localTaxName: "earnings tax (E-Tax)",
    localHeading: "Does Kansas City have a local tax for gig workers?",
    localBody: [
      "Yes. Kansas City, Missouri levies a 1% earnings tax — often called the 'E-Tax' — that applies to gig earnings. For residents it applies to all earnings, including the net profit of a self-employed gig worker; for nonresidents it applies to earnings from work performed within the city. Self-employed workers report it on the city's profits return.",
      "The earnings tax is on top of Missouri's state income tax and the federal 15.3% self-employment tax. It's administered by the Kansas City Revenue Division, separately from your state and federal filings, and because nothing is withheld from gig payouts you're responsible for paying it yourself.",
      "The 1% rate is long-standing, but filing details and the exact definition of taxable earnings can change, so confirm current requirements with the Kansas City Revenue Division or a tax professional. (St. Louis, Missouri has a similar 1% earnings tax if you work there instead.)",
    ],
    stateGuideSlug: "missouri-gig-worker-taxes",
    stateGuideLabel: "Missouri gig worker taxes",
    localResources: [KCMO_ETAX, MO_DOR],
    faqs: [
      {
        q: "What is the Kansas City earnings tax?",
        a: "It's a 1% local tax (the 'E-Tax') on earnings in Kansas City, Missouri. Residents pay it on all earnings — including a self-employed gig worker's net profit — and nonresidents pay it on earnings from work performed in the city. It's on top of Missouri state income tax and federal tax.",
      },
      {
        q: "Do self-employed gig workers pay the KC earnings tax?",
        a: "Yes. The earnings tax reaches self-employment income: residents owe 1% on their net business profit, and nonresidents owe 1% on profit from work performed in Kansas City. Self-employed workers report it on the city's profits return rather than having it withheld.",
      },
      {
        q: "What if I work in Kansas City but live elsewhere?",
        a: "Nonresidents owe the 1% earnings tax on earnings from work performed within Kansas City. If you split your gig work between the city and elsewhere, only the city-sourced portion is subject — confirm how to apportion it with the Kansas City Revenue Division.",
      },
      {
        q: "Is the earnings tax on top of Missouri state tax?",
        a: "Yes. The 1% earnings tax is a city tax that applies in addition to Missouri's state income tax and the federal income and 15.3% self-employment taxes. Gig workers in Kansas City can face all three.",
      },
      {
        q: "How much should I set aside for taxes in Kansas City?",
        a: "Beyond the common 25–30% for federal income tax and the 15.3% self-employment tax, add Missouri's state income tax and the 1% Kansas City earnings tax. Use the Tax Set-Aside calculator for a tailored figure and confirm the current city requirements with the Revenue Division.",
      },
    ],
  },
];

export function getCityTaxGuide(slug: string): CityTaxGuide | undefined {
  return CITY_TAX_GUIDES.find(g => g.slug === slug);
}
