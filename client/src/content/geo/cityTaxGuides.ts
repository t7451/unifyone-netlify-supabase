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

export const CITY_TAX_GUIDES: CityTaxGuide[] = [
  {
    slug: "new-york-city-gig-worker-taxes",
    city: "New York City",
    state: "New York",
    cityAdjective: "New York City",
    eyebrow: "City Gig Tax Guide",
    title: "New York City Gig Worker Taxes: NYC Income Tax, UBT & Estimates",
    metaDescription:
      "New York City gig worker taxes: local filing rules, business-tax exceptions and payment guidance. Reviewed November 7, 2026.",
    h1: "New York City Gig Worker Taxes",
    intro:
      "Independent work in New York City can involve local personal or business taxes as well as state and federal taxes. Residence, business location and the type of income determine which rules apply. This guide separates those obligations for sole proprietors.",
    localTaxName: "NYC personal income tax",
    localHeading: "Does New York City have a local tax for gig workers?",
    localBody: [
      "NYC personal income tax applies to city residents and is reported through the New York State return. Working in the city does not by itself make a nonresident subject to NYC resident income tax. New York State sourcing rules still apply.",
      "NYC Unincorporated Business Tax (UBT) is separate: it can apply to a business carried on in the city by a resident or nonresident. The rate is 4% of allocated taxable business income, subject to exemptions and credits. A filing obligation can exist even when a credit eliminates the tax; check the NYC-202 instructions rather than assuming it concerns only high earners.",
      "For 2026, self-employed individuals may also owe MCTMT if net earnings allocated to either district zone exceed $150,000. That threshold is determined separately for each individual and zone, even on a joint return. It is not the NYC resident income tax or UBT.",
    ],
    stateGuideSlug: "new-york-gig-worker-taxes",
    stateGuideLabel: "New York gig worker taxes",
    localResources: [
      {
        label: "NY State: NYC, Yonkers and 2026 MCTMT",
        href: "https://www.tax.ny.gov/pit/file/nyc_yonkers_residents.htm",
      },
      {
        label: "NYC: Unincorporated Business Tax",
        href: "https://www.nyc.gov/site/finance/business/business-unincorporated-business-tax-ubt.page",
      },
    ],
    faqs: [
      {
        q: "What local taxes can apply in New York City?",
        a: "NYC personal income tax applies to city residents and is reported through the New York State return. Working in the city does not by itself make a nonresident subject to NYC resident income tax. New York State sourcing rules still apply.",
      },
      {
        q: "What separate business filing should I check?",
        a: "NYC Unincorporated Business Tax (UBT) is separate: it can apply to a business carried on in the city by a resident or nonresident. The rate is 4% of allocated taxable business income, subject to exemptions and credits. A filing obligation can exist even when a credit eliminates the tax; check the NYC-202 instructions rather than assuming it concerns only high earners.",
      },
      {
        q: "What other local rules matter?",
        a: "For 2026, self-employed individuals may also owe MCTMT if net earnings allocated to either district zone exceed $150,000. That threshold is determined separately for each individual and zone, even on a joint return. It is not the NYC resident income tax or UBT.",
      },
      {
        q: "How much should I reserve for taxes?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do federal deductions reduce every local tax?",
        a: "No. Local tax bases, allowed deductions, exemptions and apportionment can differ. Gross-receipts taxes are especially different from taxes on net income; use each jurisdiction's instructions.",
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
      "Philadelphia gig worker taxes: local filing rules, business-tax exceptions and payment guidance. Reviewed November 7, 2026.",
    h1: "Philadelphia Gig Worker Taxes",
    intro:
      "Independent work in Philadelphia can involve local personal or business taxes as well as state and federal taxes. Residence, business location and the type of income determine which rules apply. This guide separates those obligations for sole proprietors.",
    localTaxName: "Net Profits Tax",
    localHeading: "Does Philadelphia have a local tax for gig workers?",
    localBody: [
      "Philadelphia Net Profits Tax (NPT) applies to net profits of unincorporated businesses. Residents generally report net profits wherever earned, while nonresidents report Philadelphia business activity under the city's allocation rules. Employee wages follow Wage/Earnings Tax rules instead.",
      "Businesses operating in Philadelphia must also evaluate Business Income & Receipts Tax (BIRT). The former $100,000 exemption ended beginning with tax year 2025; being below $100,000 no longer supplies that filing exemption. BIRT has gross-receipts and net-income components, so a federal expense deduction does not reduce both bases.",
      "NPT and BIRT have separate filings, credits and payment rules. The city allows an NPT credit based on 60% of the BIRT net-income tax, subject to its instructions. Special 2026 estimated-BIRT relief is available to qualifying first-time filers who had no BIRT filing requirement in 2022, 2023 and 2024; it does not erase the annual tax.",
    ],
    stateGuideSlug: "pennsylvania-gig-worker-taxes",
    stateGuideLabel: "Pennsylvania gig worker taxes",
    localResources: [
      {
        label: "Philadelphia: NPT filing and payment",
        href: "https://www.phila.gov/services/payments-assistance-taxes/taxes/business-taxes/business-taxes-by-type/net-profits-tax/",
      },
      {
        label: "Philadelphia: BIRT and exemption repeal",
        href: "https://www.phila.gov/services/business-self-employment/business-taxes/business-income-receipts-tax-birt/",
      },
      {
        label: "Philadelphia: transition and NPT credit",
        href: "https://www.phila.gov/2025-07-22-key-philadelphia-tax-policy-changes-you-need-to-know-now/",
      },
    ],
    faqs: [
      {
        q: "What local taxes can apply in Philadelphia?",
        a: "Philadelphia Net Profits Tax (NPT) applies to net profits of unincorporated businesses. Residents generally report net profits wherever earned, while nonresidents report Philadelphia business activity under the city's allocation rules. Employee wages follow Wage/Earnings Tax rules instead.",
      },
      {
        q: "What separate business filing should I check?",
        a: "Businesses operating in Philadelphia must also evaluate Business Income & Receipts Tax (BIRT). The former $100,000 exemption ended beginning with tax year 2025; being below $100,000 no longer supplies that filing exemption. BIRT has gross-receipts and net-income components, so a federal expense deduction does not reduce both bases.",
      },
      {
        q: "What other local rules matter?",
        a: "NPT and BIRT have separate filings, credits and payment rules. The city allows an NPT credit based on 60% of the BIRT net-income tax, subject to its instructions. Special 2026 estimated-BIRT relief is available to qualifying first-time filers who had no BIRT filing requirement in 2022, 2023 and 2024; it does not erase the annual tax.",
      },
      {
        q: "How much should I reserve for taxes?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do federal deductions reduce every local tax?",
        a: "No. Local tax bases, allowed deductions, exemptions and apportionment can differ. Gross-receipts taxes are especially different from taxes on net income; use each jurisdiction's instructions.",
      },
    ],
  },
  {
    slug: "portland-gig-worker-taxes",
    city: "Portland",
    state: "Oregon",
    cityAdjective: "Portland",
    eyebrow: "City Gig Tax Guide",
    title: "Portland Gig Worker Taxes: Business, Metro & Multnomah Taxes",
    metaDescription:
      "Portland gig worker taxes: local filing rules, business-tax exceptions and payment guidance. Reviewed November 7, 2026.",
    h1: "Portland, Oregon Gig Worker Taxes",
    intro:
      "Independent work in Portland can involve local personal or business taxes as well as state and federal taxes. Residence, business location and the type of income determine which rules apply. This guide separates those obligations for sole proprietors.",
    localTaxName: "Metro SHS & Multnomah PFA taxes",
    localHeading: "Does Portland have local taxes for gig workers?",
    localBody: [
      "Portland-area tax boundaries are different for the city, Multnomah County and Metro. For 2026, the Metro SHS personal tax is 1% above $128,000 of taxable income for single filers or $205,000 for joint-category filers. Multnomah PFA remains 1.5% above $125,000/$200,000, plus another 1.5% above $250,000/$400,000. Use the city's filing-status definitions and sourcing rules.",
      "Lower personal income does not automatically exempt a gig business from local filings. Portland Business License Tax and Multnomah County Business Income Tax require separate review. Their 2026 gross-receipts exemptions generally cover receipts below $75,000 for the city and below $100,000 for the county, counting business receipts everywhere. Exempt businesses generally still register and file to claim the exemption.",
      "Sole proprietors are not subject to the Metro SHS business tax; the personal-tax rules apply instead. Oregon's TriMet self-employment tax and Portland Arts Tax may also matter. For SHS/PFA, the estimated-payment liability threshold rises to $5,000 in 2026; check both current- and prior-year tests and any withholding.",
    ],
    stateGuideSlug: "oregon-gig-worker-taxes",
    stateGuideLabel: "Oregon gig worker taxes",
    localResources: [
      {
        label: "Portland: SHS/PFA rates, thresholds and estimates",
        href: "https://www.portland.gov/revenue/personal-tax",
      },
      {
        label: "Portland: business taxes and 2026 exemptions",
        href: "https://www.portland.gov/revenue/business-tax",
      },
      {
        label: "Oregon: transit self-employment taxes",
        href: "https://www.oregon.gov/dor/programs/businesses/pages/self-employment.aspx",
      },
    ],
    faqs: [
      {
        q: "What local taxes can apply in Portland?",
        a: "Portland-area tax boundaries are different for the city, Multnomah County and Metro. For 2026, the Metro SHS personal tax is 1% above $128,000 of taxable income for single filers or $205,000 for joint-category filers. Multnomah PFA remains 1.5% above $125,000/$200,000, plus another 1.5% above $250,000/$400,000. Use the city's filing-status definitions and sourcing rules.",
      },
      {
        q: "What separate business filing should I check?",
        a: "Lower personal income does not automatically exempt a gig business from local filings. Portland Business License Tax and Multnomah County Business Income Tax require separate review. Their 2026 gross-receipts exemptions generally cover receipts below $75,000 for the city and below $100,000 for the county, counting business receipts everywhere. Exempt businesses generally still register and file to claim the exemption.",
      },
      {
        q: "What other local rules matter?",
        a: "Sole proprietors are not subject to the Metro SHS business tax; the personal-tax rules apply instead. Oregon's TriMet self-employment tax and Portland Arts Tax may also matter. For SHS/PFA, the estimated-payment liability threshold rises to $5,000 in 2026; check both current- and prior-year tests and any withholding.",
      },
      {
        q: "How much should I reserve for taxes?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do federal deductions reduce every local tax?",
        a: "No. Local tax bases, allowed deductions, exemptions and apportionment can differ. Gross-receipts taxes are especially different from taxes on net income; use each jurisdiction's instructions.",
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
      "Detroit gig worker taxes: local filing rules, business-tax exceptions and payment guidance. Reviewed November 7, 2026.",
    h1: "Detroit Gig Worker Taxes",
    intro:
      "Independent work in Detroit can involve local personal or business taxes as well as state and federal taxes. Residence, business location and the type of income determine which rules apply. This guide separates those obligations for sole proprietors.",
    localTaxName: "Detroit city income tax",
    localHeading: "Does Detroit have a city income tax for gig workers?",
    localBody: [
      "Detroit taxes resident taxable income at 2.4% and nonresident Detroit-source taxable income at 1.2%. Business income is included under the city's rules, with exemptions and allocation; do not simply apply the resident rate to every nonresident payout.",
      "Michigan Treasury administers Detroit individual returns. Form 5118 is for full-year residents, 5119 for nonresidents, and 5120 for part-year residents. A mailing address alone is not sufficient to determine whether you live or work within Detroit's boundaries.",
      "Keep records of work inside and outside the city and review the Detroit estimated-tax instructions separately from Michigan and federal requirements. A federal deduction is not automatically an allowable Detroit deduction.",
    ],
    stateGuideSlug: "michigan-gig-worker-taxes",
    stateGuideLabel: "Michigan gig worker taxes",
    localResources: [
      {
        label: "Michigan Treasury: Detroit filing requirements",
        href: "https://www.michigan.gov/taxes/citytax/detroit/individual/filing",
      },
      {
        label: "Detroit: 2026 rate guide",
        href: "https://www.michigan.gov/taxes/-/media/Project/Websites/taxes/Forms/City-Withholding/TY2026/5469_ty2026.pdf",
      },
    ],
    faqs: [
      {
        q: "What local taxes can apply in Detroit?",
        a: "Detroit taxes resident taxable income at 2.4% and nonresident Detroit-source taxable income at 1.2%. Business income is included under the city's rules, with exemptions and allocation; do not simply apply the resident rate to every nonresident payout.",
      },
      {
        q: "What separate business filing should I check?",
        a: "Michigan Treasury administers Detroit individual returns. Form 5118 is for full-year residents, 5119 for nonresidents, and 5120 for part-year residents. A mailing address alone is not sufficient to determine whether you live or work within Detroit's boundaries.",
      },
      {
        q: "What other local rules matter?",
        a: "Keep records of work inside and outside the city and review the Detroit estimated-tax instructions separately from Michigan and federal requirements. A federal deduction is not automatically an allowable Detroit deduction.",
      },
      {
        q: "How much should I reserve for taxes?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do federal deductions reduce every local tax?",
        a: "No. Local tax bases, allowed deductions, exemptions and apportionment can differ. Gross-receipts taxes are especially different from taxes on net income; use each jurisdiction's instructions.",
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
      "Kansas City gig worker taxes: local filing rules, business-tax exceptions and payment guidance. Reviewed November 7, 2026.",
    h1: "Kansas City Gig Worker Taxes",
    intro:
      "Independent work in Kansas City can involve local personal or business taxes as well as state and federal taxes. Residence, business location and the type of income determine which rules apply. This guide separates those obligations for sole proprietors.",
    localTaxName: "earnings tax (E-Tax)",
    localHeading: "Does Kansas City have a local tax for gig workers?",
    localBody: [
      "Kansas City, Missouri levies a 1% earnings tax. Residents and nonresidents doing business in the city must evaluate the earnings tax on business net profits. For nonresidents, allocation determines the city-taxable share; keep records of work performed inside and outside city limits.",
      "Kansas City uses Form RD-108/108B for business net profits, including sole proprietors. Its rideshare guide requires the annual return even when there is a loss. Use the allocation instructions for work outside the city. Kansas City, Kansas is a different jurisdiction.",
      "The city tax is separate from state income tax and federal taxes. Crossing the Missouri–Kansas border can also create state sourcing or credit questions; a Kansas address does not automatically remove Kansas City, Missouri obligations.",
    ],
    stateGuideSlug: "missouri-gig-worker-taxes",
    stateGuideLabel: "Missouri gig worker taxes",
    localResources: [
      {
        label: "Kansas City: rideshare driver tax guide",
        href: "https://www.kcmo.gov/city-hall/departments/finance/tax-home/tax-guide-for-ride-sharing-drivers",
      },
      {
        label: "Kansas City: nonresident business tax guide",
        href: "https://www.kcmo.gov/city-hall/departments/finance/tax-home/tax-guides/tax-guide-for-non-resident-businesses",
      },
    ],
    faqs: [
      {
        q: "What local taxes can apply in Kansas City?",
        a: "Kansas City, Missouri levies a 1% earnings tax. Residents and nonresidents doing business in the city must evaluate the earnings tax on business net profits. For nonresidents, allocation determines the city-taxable share; keep records of work performed inside and outside city limits.",
      },
      {
        q: "What separate business filing should I check?",
        a: "Kansas City uses Form RD-108/108B for business net profits, including sole proprietors. Its rideshare guide requires the annual return even when there is a loss. Use the allocation instructions for work outside the city. Kansas City, Kansas is a different jurisdiction.",
      },
      {
        q: "What other local rules matter?",
        a: "The city tax is separate from state income tax and federal taxes. Crossing the Missouri–Kansas border can also create state sourcing or credit questions; a Kansas address does not automatically remove Kansas City, Missouri obligations.",
      },
      {
        q: "How much should I reserve for taxes?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do federal deductions reduce every local tax?",
        a: "No. Local tax bases, allowed deductions, exemptions and apportionment can differ. Gross-receipts taxes are especially different from taxes on net income; use each jurisdiction's instructions.",
      },
    ],
  },
];

export function getCityTaxGuide(slug: string): CityTaxGuide | undefined {
  return CITY_TAX_GUIDES.find(g => g.slug === slug);
}
