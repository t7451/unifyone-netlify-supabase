import { TAX_REVIEW } from "../resourceReview";

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

/** Shared federal rules are kept in one dated source. */
export const HOW_GIG_TAXES_WORK = [
  {
    title: "Check your worker status",
    body: "This guide covers independent-contractor business income. Contractors generally receive payments without withholding, but backup withholding and other exceptions exist. Employee wages follow different rules.",
  },
  { title: "Calculate self-employment tax", body: TAX_REVIEW.se },
  {
    title: "Calculate income tax separately",
    body: "Business profit feeds into your income-tax return alongside other income. Deductions, credits and filing status affect the result. The deductible portion of self-employment tax is not a deduction of the entire tax.",
  },
  {
    title: "Reconcile income even without a form",
    body: "A 1099 is an information return, not a tax calculation. Use payout and transaction records to report business income without double-counting amounts appearing on multiple forms.",
  },
];
export const SHARED_DEDUCTIONS = [
  { label: "Eligible business mileage", desc: TAX_REVIEW.mileage },
  {
    label: "Phone and data",
    desc: "Only the documented business-use share, excluding personal use.",
  },
  {
    label: "Business supplies and equipment",
    desc: "Ordinary and necessary business costs; equipment may require depreciation or another permitted cost-recovery method.",
  },
  {
    label: "Business tolls and parking",
    desc: "Qualifying business charges may be deductible separately from standard mileage. Personal and commuting costs do not qualify.",
  },
];
export const SET_ASIDE_NO_STATE_TAX = TAX_REVIEW.reserve;
export const SET_ASIDE_WITH_STATE_TAX = TAX_REVIEW.reserve;

export const STATE_TAX_GUIDES: StateTaxGuide[] = [
  {
    slug: "california-gig-worker-taxes",
    state: "California",
    stateAdjective: "California",
    eyebrow: "State Gig Tax Guide",
    title: "California Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "California gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "California Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in California. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does California have a state income tax for gig workers?",
    stateBody: [
      "California taxes residents and California-source business income under graduated personal income-tax rules. Calculate California taxable income with its own adjustments; do not simply multiply federal Schedule C profit by a top marginal rate.",
      "California uses Form 540-ES. Its regular 2026 installment percentages are 30%, 40%, 0% and 30%, due April 15, June 15, September 15, 2026, and January 15, 2027. Check filing-status thresholds, high-income rules and relief before paying.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "California: official treatment and filing guidance",
        href: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
      },
    ],
    faqs: [
      {
        q: "How does California tax gig earnings?",
        a: "California taxes residents and California-source business income under graduated personal income-tax rules. Calculate California taxable income with its own adjustments; do not simply multiply federal Schedule C profit by a top marginal rate.",
      },
      {
        q: "Do I need estimated payments in California?",
        a: "California uses Form 540-ES. Its regular 2026 installment percentages are 30%, 40%, 0% and 30%, due April 15, June 15, September 15, 2026, and January 15, 2027. Check filing-status thresholds, high-income rules and relief before paying.",
      },
      {
        q: "How much should I set aside in California?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "texas-gig-worker-taxes",
    state: "Texas",
    stateAdjective: "Texas",
    eyebrow: "State Gig Tax Guide",
    title: "Texas Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Texas gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Texas Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Texas. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Texas have a state income tax for gig workers?",
    stateBody: [
      "Texas has no individual income tax. Business structure still matters: an ordinary sole proprietorship is generally outside franchise tax, but a single-member LLC can be a taxable entity even when disregarded federally. Check franchise reporting and sales-tax obligations for your activity.",
      "There are no Texas personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Texas: official treatment and filing guidance",
        href: "https://comptroller.texas.gov/taxes/franchise/faq/taxable-entities.php",
      },
    ],
    faqs: [
      {
        q: "How does Texas tax gig earnings?",
        a: "Texas has no individual income tax. Business structure still matters: an ordinary sole proprietorship is generally outside franchise tax, but a single-member LLC can be a taxable entity even when disregarded federally. Check franchise reporting and sales-tax obligations for your activity.",
      },
      {
        q: "Do I need estimated payments in Texas?",
        a: "There are no Texas personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Texas?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "florida-gig-worker-taxes",
    state: "Florida",
    stateAdjective: "Florida",
    eyebrow: "State Gig Tax Guide",
    title: "Florida Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Florida gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Florida Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Florida. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Florida have a state income tax for gig workers?",
    stateBody: [
      "Florida imposes no personal income tax. That does not exempt a business from sales tax, licensing or other applicable business requirements. Employee wages, independent-contractor work and a business operating through a corporation can have different reporting rules.",
      "There are no Florida personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Florida: official treatment and filing guidance",
        href: "https://www.floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1466",
      },
    ],
    faqs: [
      {
        q: "How does Florida tax gig earnings?",
        a: "Florida imposes no personal income tax. That does not exempt a business from sales tax, licensing or other applicable business requirements. Employee wages, independent-contractor work and a business operating through a corporation can have different reporting rules.",
      },
      {
        q: "Do I need estimated payments in Florida?",
        a: "There are no Florida personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Florida?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "new-york-gig-worker-taxes",
    state: "New York",
    stateAdjective: "New York",
    eyebrow: "State Gig Tax Guide",
    title: "New York Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "New York gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "New York Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in New York. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does New York have a state income tax for gig workers?",
    stateBody: [
      "New York taxes resident income and New York-source nonresident income. NYC resident income tax and Yonkers taxes can add another layer. For 2026, MCTMT can apply when an individual's net self-employment earnings attributable to either district zone exceed $150,000; the former $50,000 threshold applies to 2025 and earlier.",
      "Use the 2026 IT-2105 instructions to calculate New York State, NYC, Yonkers and any applicable MCTMT estimates. NYC unincorporated business tax is a separate city filing, not part of IT-2105.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "New York: official treatment and filing guidance",
        href: "https://www.tax.ny.gov/pit/file/nyc_yonkers_residents.htm",
      },
      {
        label: "New York: 2026 IT-2105 instructions",
        href: "https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf",
      },
    ],
    faqs: [
      {
        q: "How does New York tax gig earnings?",
        a: "New York taxes resident income and New York-source nonresident income. NYC resident income tax and Yonkers taxes can add another layer. For 2026, MCTMT can apply when an individual's net self-employment earnings attributable to either district zone exceed $150,000; the former $50,000 threshold applies to 2025 and earlier.",
      },
      {
        q: "Do I need estimated payments in New York?",
        a: "Use the 2026 IT-2105 instructions to calculate New York State, NYC, Yonkers and any applicable MCTMT estimates. NYC unincorporated business tax is a separate city filing, not part of IT-2105.",
      },
      {
        q: "How much should I set aside in New York?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "illinois-gig-worker-taxes",
    state: "Illinois",
    stateAdjective: "Illinois",
    eyebrow: "State Gig Tax Guide",
    title: "Illinois Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Illinois gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Illinois Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Illinois. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Illinois have a state income tax for gig workers?",
    stateBody: [
      "Illinois has a 4.95% individual income-tax rate. Apply it to Illinois net income after the state's modifications and exemptions, rather than to gross app deposits. A flat statutory rate does not mean every worker owes that percentage of each payout.",
      "Check Illinois's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Illinois: official treatment and filing guidance",
        href: "https://tax.illinois.gov/research/taxrates/income.html",
      },
    ],
    faqs: [
      {
        q: "How does Illinois tax gig earnings?",
        a: "Illinois has a 4.95% individual income-tax rate. Apply it to Illinois net income after the state's modifications and exemptions, rather than to gross app deposits. A flat statutory rate does not mean every worker owes that percentage of each payout.",
      },
      {
        q: "Do I need estimated payments in Illinois?",
        a: "Check Illinois's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Illinois?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "washington-gig-worker-taxes",
    state: "Washington",
    stateAdjective: "Washington",
    eyebrow: "State Gig Tax Guide",
    title: "Washington Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Washington gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Washington Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Washington. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Washington have a state income tax for gig workers?",
    stateBody: [
      "Washington has no personal income tax on ordinary gig earnings, but business and occupation (B&O) tax can apply to gross business receipts. Business expenses generally do not reduce the B&O base. Registration, small-business credits, sales tax and city business taxes depend on your activity and location.",
      "There are no Washington personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Washington: official treatment and filing guidance",
        href: "https://dor.wa.gov/taxes-rates/business-occupation-tax",
      },
    ],
    faqs: [
      {
        q: "How does Washington tax gig earnings?",
        a: "Washington has no personal income tax on ordinary gig earnings, but business and occupation (B&O) tax can apply to gross business receipts. Business expenses generally do not reduce the B&O base. Registration, small-business credits, sales tax and city business taxes depend on your activity and location.",
      },
      {
        q: "Do I need estimated payments in Washington?",
        a: "There are no Washington personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Washington?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "georgia-gig-worker-taxes",
    state: "Georgia",
    stateAdjective: "Georgia",
    eyebrow: "State Gig Tax Guide",
    title: "Georgia Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Georgia gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Georgia Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Georgia. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Georgia have a state income tax for gig workers?",
    stateBody: [
      "For tax year 2026, Georgia's individual income-tax rate is 4.99%. Calculate taxable income using Georgia deductions and adjustments. The state does not simply adopt every new federal deduction, including all of the federal tipped-income provisions.",
      "Check Georgia's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Georgia: official treatment and filing guidance",
        href: "https://dor.georgia.gov/taxes/important-tax-updates",
      },
    ],
    faqs: [
      {
        q: "How does Georgia tax gig earnings?",
        a: "For tax year 2026, Georgia's individual income-tax rate is 4.99%. Calculate taxable income using Georgia deductions and adjustments. The state does not simply adopt every new federal deduction, including all of the federal tipped-income provisions.",
      },
      {
        q: "Do I need estimated payments in Georgia?",
        a: "Check Georgia's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Georgia?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "pennsylvania-gig-worker-taxes",
    state: "Pennsylvania",
    stateAdjective: "Pennsylvania",
    eyebrow: "State Gig Tax Guide",
    title: "Pennsylvania Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Pennsylvania gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Pennsylvania Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Pennsylvania. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Pennsylvania have a state income tax for gig workers?",
    stateBody: [
      "Pennsylvania taxes net profits under its own personal income-tax rules; its categories and deductions do not simply mirror federal taxable income. Many municipalities also tax earned income or net profits. Philadelphia has separate NPT and BIRT requirements, including the loss of the former BIRT exemption.",
      "Use Pennsylvania's estimated-payment instructions and PA-40 ES forms. The state threshold differs from the federal $1,000 test: the current guide identifies $9,500 of taxable income not subject to employer withholding. Local payments go to the applicable local collector.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Pennsylvania: official treatment and filing guidance",
        href: "https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/income-subject-withholding-estimated-payments-penalties-interest-other-additions",
      },
    ],
    faqs: [
      {
        q: "How does Pennsylvania tax gig earnings?",
        a: "Pennsylvania taxes net profits under its own personal income-tax rules; its categories and deductions do not simply mirror federal taxable income. Many municipalities also tax earned income or net profits. Philadelphia has separate NPT and BIRT requirements, including the loss of the former BIRT exemption.",
      },
      {
        q: "Do I need estimated payments in Pennsylvania?",
        a: "Use Pennsylvania's estimated-payment instructions and PA-40 ES forms. The state threshold differs from the federal $1,000 test: the current guide identifies $9,500 of taxable income not subject to employer withholding. Local payments go to the applicable local collector.",
      },
      {
        q: "How much should I set aside in Pennsylvania?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "new-jersey-gig-worker-taxes",
    state: "New Jersey",
    stateAdjective: "New Jersey",
    eyebrow: "State Gig Tax Guide",
    title: "New Jersey Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "New Jersey gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "New Jersey Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in New Jersey. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does New Jersey have a state income tax for gig workers?",
    stateBody: [
      "New Jersey taxes business net profits under its Gross Income Tax rules. State deductions and income categories can differ from federal Schedule C and federal adjusted gross income; keep records supporting both calculations.",
      "Use NJ-1040-ES for estimated payments when required. The 2026 instructions use an expected balance over $400 after withholding and credits; exceptions and higher-income safe-harbor rules also matter.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "New Jersey: official treatment and filing guidance",
        href: "https://www.nj.gov/treasury/taxation/njit15.shtml",
      },
      {
        label: "New Jersey: 2026 estimated-payment instructions",
        href: "https://www.nj.gov/www.nj.gov/treasury/taxation/pdf/current/1040esi.pdf",
      },
    ],
    faqs: [
      {
        q: "How does New Jersey tax gig earnings?",
        a: "New Jersey taxes business net profits under its Gross Income Tax rules. State deductions and income categories can differ from federal Schedule C and federal adjusted gross income; keep records supporting both calculations.",
      },
      {
        q: "Do I need estimated payments in New Jersey?",
        a: "Use NJ-1040-ES for estimated payments when required. The 2026 instructions use an expected balance over $400 after withholding and credits; exceptions and higher-income safe-harbor rules also matter.",
      },
      {
        q: "How much should I set aside in New Jersey?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "arizona-gig-worker-taxes",
    state: "Arizona",
    stateAdjective: "Arizona",
    eyebrow: "State Gig Tax Guide",
    title: "Arizona Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Arizona gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Arizona Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Arizona. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Arizona have a state income tax for gig workers?",
    stateBody: [
      "Arizona's 2026 individual estimated-tax instructions use a 2.5% rate. The rate applies to taxable income after Arizona adjustments, not to gross receipts. Estimated-payment requirements depend on Arizona gross income in both the prior and current year.",
      "For 2026, Arizona generally requires estimates when both 2025 and 2026 Arizona gross income exceed $75,000 ($150,000 married filing jointly). See Form 140ES for the calculation and exceptions; do not substitute the federal threshold.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Arizona: official treatment and filing guidance",
        href: "https://azdor.gov/individuals/individual-estimated-tax-payments",
      },
      {
        label: "Arizona: 2026 Form 140ES booklet",
        href: "https://azdor.gov/sites/default/files/document/FORMS_INDIVIDUAL_2026_140ESBooklet.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Arizona tax gig earnings?",
        a: "Arizona's 2026 individual estimated-tax instructions use a 2.5% rate. The rate applies to taxable income after Arizona adjustments, not to gross receipts. Estimated-payment requirements depend on Arizona gross income in both the prior and current year.",
      },
      {
        q: "Do I need estimated payments in Arizona?",
        a: "For 2026, Arizona generally requires estimates when both 2025 and 2026 Arizona gross income exceed $75,000 ($150,000 married filing jointly). See Form 140ES for the calculation and exceptions; do not substitute the federal threshold.",
      },
      {
        q: "How much should I set aside in Arizona?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "ohio-gig-worker-taxes",
    state: "Ohio",
    stateAdjective: "Ohio",
    eyebrow: "State Gig Tax Guide",
    title: "Ohio Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Ohio gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Ohio Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Ohio. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Ohio have a state income tax for gig workers?",
    stateBody: [
      "Ohio treats qualifying business income differently from nonbusiness income. Its business income deduction can exclude up to $250,000 ($125,000 married filing separately); Ohio law taxes remaining taxable business income at 3%. Eligibility and the return's business-income schedule matter.",
      "Check the applicable-year Ohio IT 1040 instructions before estimating. A state business-income deduction does not automatically eliminate municipal net-profits taxes or school-district taxes. Confirm separate local filing and payment requirements.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Ohio: business-income deduction — section 5747.01(A)(28)",
        href: "https://codes.ohio.gov/ohio-revised-code/section-5747.01",
      },
      {
        label: "Ohio: business-income tax rate — section 5747.02(A)(4)",
        href: "https://codes.ohio.gov/ohio-revised-code/section-5747.02",
      },
    ],
    faqs: [
      {
        q: "How does Ohio tax gig earnings?",
        a: "Ohio treats qualifying business income differently from nonbusiness income. Its business income deduction can exclude up to $250,000 ($125,000 married filing separately); Ohio law taxes remaining taxable business income at 3%. Eligibility and the return's business-income schedule matter.",
      },
      {
        q: "Do I need estimated payments in Ohio?",
        a: "Check the applicable-year Ohio IT 1040 instructions before estimating. A state business-income deduction does not automatically eliminate municipal net-profits taxes or school-district taxes. Confirm separate local filing and payment requirements.",
      },
      {
        q: "How much should I set aside in Ohio?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "north-carolina-gig-worker-taxes",
    state: "North Carolina",
    stateAdjective: "North Carolina",
    eyebrow: "State Gig Tax Guide",
    title: "North Carolina Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "North Carolina gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "North Carolina Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in North Carolina. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading:
      "Does North Carolina have a state income tax for gig workers?",
    stateBody: [
      "North Carolina's individual income-tax rate for tax year 2026 is 3.99%, compared with 4.25% for 2025. Apply the correct year's rate to North Carolina taxable income after state adjustments and deductions. Future triggered reductions are not the 2026 rate.",
      "Check North Carolina's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "North Carolina: official treatment and filing guidance",
        href: "https://www.ncdor.gov/taxes-forms/individual-income-tax/tax-rate-schedules",
      },
    ],
    faqs: [
      {
        q: "How does North Carolina tax gig earnings?",
        a: "North Carolina's individual income-tax rate for tax year 2026 is 3.99%, compared with 4.25% for 2025. Apply the correct year's rate to North Carolina taxable income after state adjustments and deductions. Future triggered reductions are not the 2026 rate.",
      },
      {
        q: "Do I need estimated payments in North Carolina?",
        a: "Check North Carolina's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in North Carolina?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "michigan-gig-worker-taxes",
    state: "Michigan",
    stateAdjective: "Michigan",
    eyebrow: "State Gig Tax Guide",
    title: "Michigan Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Michigan gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Michigan Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Michigan. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Michigan have a state income tax for gig workers?",
    stateBody: [
      "Michigan confirmed a 4.25% individual income-tax rate for 2026. State taxable income and credits determine the actual bill. City income taxes can also apply where you live or work; Detroit has its own resident, nonresident and part-year returns administered by Michigan Treasury.",
      "Check Michigan's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Michigan: official treatment and filing guidance",
        href: "https://www.michigan.gov/treasury/news/2026/04/15/state-individual-income-tax-rate-for-2026-tax-year-determined",
      },
    ],
    faqs: [
      {
        q: "How does Michigan tax gig earnings?",
        a: "Michigan confirmed a 4.25% individual income-tax rate for 2026. State taxable income and credits determine the actual bill. City income taxes can also apply where you live or work; Detroit has its own resident, nonresident and part-year returns administered by Michigan Treasury.",
      },
      {
        q: "Do I need estimated payments in Michigan?",
        a: "Check Michigan's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Michigan?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "colorado-gig-worker-taxes",
    state: "Colorado",
    stateAdjective: "Colorado",
    eyebrow: "State Gig Tax Guide",
    title: "Colorado Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Colorado gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Colorado Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Colorado. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Colorado have a state income tax for gig workers?",
    stateBody: [
      "Colorado starts with federal taxable income and then applies Colorado additions and subtractions. The income-tax rate can vary by tax year, so use the year-specific state worksheet rather than assuming a prior temporary reduction continues. New federal deductions may require a Colorado addback.",
      "Check Colorado's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Colorado: official treatment and filing guidance",
        href: "https://tax.colorado.gov/individual-income-tax-guide",
      },
    ],
    faqs: [
      {
        q: "How does Colorado tax gig earnings?",
        a: "Colorado starts with federal taxable income and then applies Colorado additions and subtractions. The income-tax rate can vary by tax year, so use the year-specific state worksheet rather than assuming a prior temporary reduction continues. New federal deductions may require a Colorado addback.",
      },
      {
        q: "Do I need estimated payments in Colorado?",
        a: "Check Colorado's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Colorado?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "virginia-gig-worker-taxes",
    state: "Virginia",
    stateAdjective: "Virginia",
    eyebrow: "State Gig Tax Guide",
    title: "Virginia Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Virginia gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Virginia Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Virginia. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Virginia have a state income tax for gig workers?",
    stateBody: [
      "Virginia taxes business income through its individual income-tax system, with state adjustments and deductions. Local business licenses or gross-receipts taxes are separate questions; a federal Schedule C deduction does not establish local treatment.",
      "Virginia's regular first estimated installment is May 1, followed by June 15, September 15 and January 15 of the following year. The state generally requires estimates when the expected balance after withholding and credits exceeds $1,000. Check Form 760ES and exceptions.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Virginia: official treatment and filing guidance",
        href: "https://www.tax.virginia.gov/individual-estimated-tax-payments",
      },
    ],
    faqs: [
      {
        q: "How does Virginia tax gig earnings?",
        a: "Virginia taxes business income through its individual income-tax system, with state adjustments and deductions. Local business licenses or gross-receipts taxes are separate questions; a federal Schedule C deduction does not establish local treatment.",
      },
      {
        q: "Do I need estimated payments in Virginia?",
        a: "Virginia's regular first estimated installment is May 1, followed by June 15, September 15 and January 15 of the following year. The state generally requires estimates when the expected balance after withholding and credits exceeds $1,000. Check Form 760ES and exceptions.",
      },
      {
        q: "How much should I set aside in Virginia?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "massachusetts-gig-worker-taxes",
    state: "Massachusetts",
    stateAdjective: "Massachusetts",
    eyebrow: "State Gig Tax Guide",
    title: "Massachusetts Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Massachusetts gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Massachusetts Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Massachusetts. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Massachusetts have a state income tax for gig workers?",
    stateBody: [
      "Massachusetts has its own personal income-tax calculation and a high-income surtax with a year-specific threshold. Include your other household income when testing the surtax; gig income alone does not determine eligibility.",
      "Massachusetts generally requires estimates when tax due on income not subject to withholding exceeds $400. Its usual current-year payment standard is 80%, rather than the federal 90%; prior-year exceptions and surtax rules also matter.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Massachusetts: official treatment and filing guidance",
        href: "https://www.mass.gov/info-details/personal-income-and-fiduciary-estimated-tax-payments",
      },
    ],
    faqs: [
      {
        q: "How does Massachusetts tax gig earnings?",
        a: "Massachusetts has its own personal income-tax calculation and a high-income surtax with a year-specific threshold. Include your other household income when testing the surtax; gig income alone does not determine eligibility.",
      },
      {
        q: "Do I need estimated payments in Massachusetts?",
        a: "Massachusetts generally requires estimates when tax due on income not subject to withholding exceeds $400. Its usual current-year payment standard is 80%, rather than the federal 90%; prior-year exceptions and surtax rules also matter.",
      },
      {
        q: "How much should I set aside in Massachusetts?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "maryland-gig-worker-taxes",
    state: "Maryland",
    stateAdjective: "Maryland",
    eyebrow: "State Gig Tax Guide",
    title: "Maryland Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Maryland gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Maryland Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Maryland. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Maryland have a state income tax for gig workers?",
    stateBody: [
      "Maryland has graduated state income-tax rates reaching 6.5%, plus local income tax. The old 5.75% maximum is no longer a complete description. Use the 2026 state worksheet and the correct county or Baltimore City table; some local rates vary by income.",
      "Maryland Form PV and its worksheet cover state and applicable local estimates. Nonresidents have separate sourcing and special nonresident-tax rules. Do not add a guessed county percentage to federal profit.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Maryland: official treatment and filing guidance",
        href: "https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/forms/worksheets/2026-pv-worksheet.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Maryland tax gig earnings?",
        a: "Maryland has graduated state income-tax rates reaching 6.5%, plus local income tax. The old 5.75% maximum is no longer a complete description. Use the 2026 state worksheet and the correct county or Baltimore City table; some local rates vary by income.",
      },
      {
        q: "Do I need estimated payments in Maryland?",
        a: "Maryland Form PV and its worksheet cover state and applicable local estimates. Nonresidents have separate sourcing and special nonresident-tax rules. Do not add a guessed county percentage to federal profit.",
      },
      {
        q: "How much should I set aside in Maryland?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "minnesota-gig-worker-taxes",
    state: "Minnesota",
    stateAdjective: "Minnesota",
    eyebrow: "State Gig Tax Guide",
    title: "Minnesota Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Minnesota gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Minnesota Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Minnesota. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Minnesota have a state income tax for gig workers?",
    stateBody: [
      "Minnesota taxes business profit through its individual income-tax system after state adjustments. Filing status, other income and credits affect the amount due; use the current state instructions rather than a single percentage of gross payouts.",
      "Minnesota provides an estimated-tax worksheet and online payment vouchers. Payment exceptions consider withholding and refundable credits as well as estimates. Check its current-year and prior-year safe harbors, including the higher-income rule.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Minnesota: official treatment and filing guidance",
        href: "https://www.revenue.state.mn.us/estimated-tax",
      },
    ],
    faqs: [
      {
        q: "How does Minnesota tax gig earnings?",
        a: "Minnesota taxes business profit through its individual income-tax system after state adjustments. Filing status, other income and credits affect the amount due; use the current state instructions rather than a single percentage of gross payouts.",
      },
      {
        q: "Do I need estimated payments in Minnesota?",
        a: "Minnesota provides an estimated-tax worksheet and online payment vouchers. Payment exceptions consider withholding and refundable credits as well as estimates. Check its current-year and prior-year safe harbors, including the higher-income rule.",
      },
      {
        q: "How much should I set aside in Minnesota?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "missouri-gig-worker-taxes",
    state: "Missouri",
    stateAdjective: "Missouri",
    eyebrow: "State Gig Tax Guide",
    title: "Missouri Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Missouri gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Missouri Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Missouri. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Missouri have a state income tax for gig workers?",
    stateBody: [
      "Missouri's 2026 estimated-tax schedule has graduated rates with a 4.7% top rate. Deductions and bracket thresholds mean this is not a flat tax on every dollar of profit. Kansas City and St. Louis earnings taxes may create separate local obligations.",
      "Check Missouri's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Missouri: official treatment and filing guidance",
        href: "https://dor.mo.gov/forms/MO-1040ES_2026.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Missouri tax gig earnings?",
        a: "Missouri's 2026 estimated-tax schedule has graduated rates with a 4.7% top rate. Deductions and bracket thresholds mean this is not a flat tax on every dollar of profit. Kansas City and St. Louis earnings taxes may create separate local obligations.",
      },
      {
        q: "Do I need estimated payments in Missouri?",
        a: "Check Missouri's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Missouri?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "indiana-gig-worker-taxes",
    state: "Indiana",
    stateAdjective: "Indiana",
    eyebrow: "State Gig Tax Guide",
    title: "Indiana Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Indiana gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Indiana Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Indiana. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Indiana have a state income tax for gig workers?",
    stateBody: [
      "Indiana's individual adjusted gross income-tax rate is 2.95% for 2026. County income tax can also apply. Determine the county under Indiana's residence and employment rules and use the applicable-year county table, rather than assuming the state rate is the entire bill.",
      "Check Indiana's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Indiana: official treatment and filing guidance",
        href: "https://www.in.gov/dor/resources/tax-rates-and-reports/rates-fees-and-penalties/",
      },
    ],
    faqs: [
      {
        q: "How does Indiana tax gig earnings?",
        a: "Indiana's individual adjusted gross income-tax rate is 2.95% for 2026. County income tax can also apply. Determine the county under Indiana's residence and employment rules and use the applicable-year county table, rather than assuming the state rate is the entire bill.",
      },
      {
        q: "Do I need estimated payments in Indiana?",
        a: "Check Indiana's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Indiana?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "tennessee-gig-worker-taxes",
    state: "Tennessee",
    stateAdjective: "Tennessee",
    eyebrow: "State Gig Tax Guide",
    title: "Tennessee Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Tennessee gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Tennessee Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Tennessee. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Tennessee have a state income tax for gig workers?",
    stateBody: [
      "Tennessee has no personal income tax on gig earnings. A separate gross-receipts business tax and local licensing can still apply: the general business-tax threshold is $100,000 per jurisdiction, while some smaller in-state businesses need a minimal activity license. Exempt activities and entity-level taxes require separate review.",
      "There are no Tennessee personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Tennessee: official treatment and filing guidance",
        href: "https://www.tn.gov/revenue/taxes/business-tax/registration-and-licensing.html",
      },
    ],
    faqs: [
      {
        q: "How does Tennessee tax gig earnings?",
        a: "Tennessee has no personal income tax on gig earnings. A separate gross-receipts business tax and local licensing can still apply: the general business-tax threshold is $100,000 per jurisdiction, while some smaller in-state businesses need a minimal activity license. Exempt activities and entity-level taxes require separate review.",
      },
      {
        q: "Do I need estimated payments in Tennessee?",
        a: "There are no Tennessee personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Tennessee?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "nevada-gig-worker-taxes",
    state: "Nevada",
    stateAdjective: "Nevada",
    eyebrow: "State Gig Tax Guide",
    title: "Nevada Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Nevada gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Nevada Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Nevada. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Nevada have a state income tax for gig workers?",
    stateBody: [
      "Nevada has no individual income tax. Its Commerce Tax generally concerns businesses above $4 million of Nevada gross revenue in the fiscal year. Smaller operations should still check licensing, sales tax and other activity-specific obligations instead of treating no income tax as a complete business-tax exemption.",
      "There are no Nevada personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Nevada: official treatment and filing guidance",
        href: "https://tax.nv.gov/about-nevada-department-of-taxation/income-tax-in-nevada/",
      },
    ],
    faqs: [
      {
        q: "How does Nevada tax gig earnings?",
        a: "Nevada has no individual income tax. Its Commerce Tax generally concerns businesses above $4 million of Nevada gross revenue in the fiscal year. Smaller operations should still check licensing, sales tax and other activity-specific obligations instead of treating no income tax as a complete business-tax exemption.",
      },
      {
        q: "Do I need estimated payments in Nevada?",
        a: "There are no Nevada personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Nevada?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "wisconsin-gig-worker-taxes",
    state: "Wisconsin",
    stateAdjective: "Wisconsin",
    eyebrow: "State Gig Tax Guide",
    title: "Wisconsin Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Wisconsin gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Wisconsin Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Wisconsin. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Wisconsin have a state income tax for gig workers?",
    stateBody: [
      "Wisconsin taxes individual business income under state rules. Use the state return's adjustments, deductions and credits to calculate taxable income; federal profit is a starting record, not a complete Wisconsin tax calculation.",
      "Check Wisconsin's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Wisconsin: official treatment and filing guidance",
        href: "https://www.revenue.wi.gov/Pages/FAQS/pcs-estpay.aspx",
      },
    ],
    faqs: [
      {
        q: "How does Wisconsin tax gig earnings?",
        a: "Wisconsin taxes individual business income under state rules. Use the state return's adjustments, deductions and credits to calculate taxable income; federal profit is a starting record, not a complete Wisconsin tax calculation.",
      },
      {
        q: "Do I need estimated payments in Wisconsin?",
        a: "Check Wisconsin's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Wisconsin?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "oregon-gig-worker-taxes",
    state: "Oregon",
    stateAdjective: "Oregon",
    eyebrow: "State Gig Tax Guide",
    title: "Oregon Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Oregon gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Oregon Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Oregon. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Oregon have a state income tax for gig workers?",
    stateBody: [
      "Oregon has individual income tax and separate transit self-employment taxes for business or services in or delivered to the TriMet or Lane Transit districts. The transit rule generally applies above $400 of net self-employment earnings in the district. It is distinct from the statewide transit tax on wages.",
      "Check Oregon individual estimated-tax requirements separately from transit returns. Portland-area business taxes and Metro SHS or Multnomah PFA personal taxes can also apply. Their boundaries, exemptions and filing rules differ.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Oregon: official treatment and filing guidance",
        href: "https://www.oregon.gov/dor/programs/businesses/pages/self-employment.aspx",
      },
      {
        label: "Portland: business tax registration and exemptions",
        href: "https://www.portland.gov/revenue/business-tax",
      },
    ],
    faqs: [
      {
        q: "How does Oregon tax gig earnings?",
        a: "Oregon has individual income tax and separate transit self-employment taxes for business or services in or delivered to the TriMet or Lane Transit districts. The transit rule generally applies above $400 of net self-employment earnings in the district. It is distinct from the statewide transit tax on wages.",
      },
      {
        q: "Do I need estimated payments in Oregon?",
        a: "Check Oregon individual estimated-tax requirements separately from transit returns. Portland-area business taxes and Metro SHS or Multnomah PFA personal taxes can also apply. Their boundaries, exemptions and filing rules differ.",
      },
      {
        q: "How much should I set aside in Oregon?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "south-carolina-gig-worker-taxes",
    state: "South Carolina",
    stateAdjective: "South Carolina",
    eyebrow: "State Gig Tax Guide",
    title: "South Carolina Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "South Carolina gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "South Carolina Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in South Carolina. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading:
      "Does South Carolina have a state income tax for gig workers?",
    stateBody: [
      "South Carolina changed its individual income-tax structure for 2026. The rates are 1.99% below $30,000 of taxable income and a 5.21% formula above that level. The state now starts with federal AGI and uses a South Carolina Income Adjusted Deduction, so copying federal taxable income is not sufficient.",
      "Check South Carolina's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "South Carolina: official treatment and filing guidance",
        href: "https://www.dor.sc.gov/iit",
      },
    ],
    faqs: [
      {
        q: "How does South Carolina tax gig earnings?",
        a: "South Carolina changed its individual income-tax structure for 2026. The rates are 1.99% below $30,000 of taxable income and a 5.21% formula above that level. The state now starts with federal AGI and uses a South Carolina Income Adjusted Deduction, so copying federal taxable income is not sufficient.",
      },
      {
        q: "Do I need estimated payments in South Carolina?",
        a: "Check South Carolina's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in South Carolina?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "alabama-gig-worker-taxes",
    state: "Alabama",
    stateAdjective: "Alabama",
    eyebrow: "State Gig Tax Guide",
    title: "Alabama Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Alabama gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Alabama Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Alabama. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Alabama have a state income tax for gig workers?",
    stateBody: [
      "Alabama taxes individual business income under its own income-tax rules. Compute the state return with applicable deductions, exemptions and credits. Local occupational or business-license obligations depend on the jurisdiction and are separate from federal self-employment tax.",
      "Check Alabama's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Alabama: official treatment and filing guidance",
        href: "https://www.revenue.alabama.gov/individual-corporate/individual-income-estimated-taxes/",
      },
    ],
    faqs: [
      {
        q: "How does Alabama tax gig earnings?",
        a: "Alabama taxes individual business income under its own income-tax rules. Compute the state return with applicable deductions, exemptions and credits. Local occupational or business-license obligations depend on the jurisdiction and are separate from federal self-employment tax.",
      },
      {
        q: "Do I need estimated payments in Alabama?",
        a: "Check Alabama's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Alabama?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "louisiana-gig-worker-taxes",
    state: "Louisiana",
    stateAdjective: "Louisiana",
    eyebrow: "State Gig Tax Guide",
    title: "Louisiana Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Louisiana gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Louisiana Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Louisiana. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Louisiana have a state income tax for gig workers?",
    stateBody: [
      "Louisiana uses a flat 3% individual income-tax rate for tax years beginning in 2025 and later, including 2026. The former graduated brackets have been repealed. Apply the rate to Louisiana taxable income after the state's deductions and adjustments.",
      "Check Louisiana's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Louisiana: official treatment and filing guidance",
        href: "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/income-tax-reform/what-are-the-individual-income-tax-rates-and-brackets/",
      },
    ],
    faqs: [
      {
        q: "How does Louisiana tax gig earnings?",
        a: "Louisiana uses a flat 3% individual income-tax rate for tax years beginning in 2025 and later, including 2026. The former graduated brackets have been repealed. Apply the rate to Louisiana taxable income after the state's deductions and adjustments.",
      },
      {
        q: "Do I need estimated payments in Louisiana?",
        a: "Check Louisiana's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Louisiana?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "kentucky-gig-worker-taxes",
    state: "Kentucky",
    stateAdjective: "Kentucky",
    eyebrow: "State Gig Tax Guide",
    title: "Kentucky Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Kentucky gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Kentucky Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Kentucky. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Kentucky have a state income tax for gig workers?",
    stateBody: [
      "Kentucky's individual income-tax rate is 3.5% for 2026. State taxable income is calculated after Kentucky deductions and adjustments. County and city occupational license taxes can apply to business net profits separately; check the jurisdiction where you operate.",
      "Check Kentucky's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Kentucky: official treatment and filing guidance",
        href: "https://revenue.ky.gov/Forms/INSTR_41A725%28I%29%20%282025%29.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Kentucky tax gig earnings?",
        a: "Kentucky's individual income-tax rate is 3.5% for 2026. State taxable income is calculated after Kentucky deductions and adjustments. County and city occupational license taxes can apply to business net profits separately; check the jurisdiction where you operate.",
      },
      {
        q: "Do I need estimated payments in Kentucky?",
        a: "Check Kentucky's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Kentucky?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "oklahoma-gig-worker-taxes",
    state: "Oklahoma",
    stateAdjective: "Oklahoma",
    eyebrow: "State Gig Tax Guide",
    title: "Oklahoma Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Oklahoma gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Oklahoma Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Oklahoma. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Oklahoma have a state income tax for gig workers?",
    stateBody: [
      "Oklahoma reduced its individual income-tax rates for tax year 2026, with a top rate of 4.5%. Use the 2026 brackets and the applicable deductions, rather than the former 4.75% top rate or a flat percentage of your app deposits.",
      "Check Oklahoma's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Oklahoma: official treatment and filing guidance",
        href: "https://oklahoma.gov/content/dam/ok/en/tax/documents/resources/reports/annual-reports/otc/AR-2026.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Oklahoma tax gig earnings?",
        a: "Oklahoma reduced its individual income-tax rates for tax year 2026, with a top rate of 4.5%. Use the 2026 brackets and the applicable deductions, rather than the former 4.75% top rate or a flat percentage of your app deposits.",
      },
      {
        q: "Do I need estimated payments in Oklahoma?",
        a: "Check Oklahoma's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Oklahoma?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "connecticut-gig-worker-taxes",
    state: "Connecticut",
    stateAdjective: "Connecticut",
    eyebrow: "State Gig Tax Guide",
    title: "Connecticut Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Connecticut gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Connecticut Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Connecticut. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Connecticut have a state income tax for gig workers?",
    stateBody: [
      "Connecticut taxes individual business income under its resident and nonresident income-tax rules. State modifications, filing status and credits can change the result from your federal return. Keep records for Connecticut-source work if you also work across state lines.",
      "Use CT-1040ES or myconneCT for required estimates. The state provides prior-year and current-year payment tests and an annualized method for uneven income. Check the exceptions before assuming four payments of an arbitrary percentage will prevent interest.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Connecticut: official treatment and filing guidance",
        href: "https://portal.ct.gov/drs/individuals/resident-income-tax/tax-information",
      },
    ],
    faqs: [
      {
        q: "How does Connecticut tax gig earnings?",
        a: "Connecticut taxes individual business income under its resident and nonresident income-tax rules. State modifications, filing status and credits can change the result from your federal return. Keep records for Connecticut-source work if you also work across state lines.",
      },
      {
        q: "Do I need estimated payments in Connecticut?",
        a: "Use CT-1040ES or myconneCT for required estimates. The state provides prior-year and current-year payment tests and an annualized method for uneven income. Check the exceptions before assuming four payments of an arbitrary percentage will prevent interest.",
      },
      {
        q: "How much should I set aside in Connecticut?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "utah-gig-worker-taxes",
    state: "Utah",
    stateAdjective: "Utah",
    eyebrow: "State Gig Tax Guide",
    title: "Utah Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Utah gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Utah Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Utah. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Utah have a state income tax for gig workers?",
    stateBody: [
      "Utah's 2026 income-tax rate is 4.45%. Compute Utah taxable income and credits under state rules. Utah does not require quarterly estimated individual income-tax payments; voluntary prepayments and the payment required when extending a return are different matters.",
      "Utah individuals may make voluntary payments, but there is no quarterly individual estimated-tax requirement. An extension gives more time to file, not an automatic extension to pay. Federal estimated-payment requirements still apply.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Utah: official treatment and filing guidance",
        href: "https://tax.utah.gov/forms-pubs/pub-14/",
      },
      {
        label:
          "Utah: individual return instructions (2025 edition; payment rules)",
        href: "https://files.tax.utah.gov/tax/forms/current/tc-40inst.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Utah tax gig earnings?",
        a: "Utah's 2026 income-tax rate is 4.45%. Compute Utah taxable income and credits under state rules. Utah does not require quarterly estimated individual income-tax payments; voluntary prepayments and the payment required when extending a return are different matters.",
      },
      {
        q: "Do I need estimated payments in Utah?",
        a: "Utah individuals may make voluntary payments, but there is no quarterly individual estimated-tax requirement. An extension gives more time to file, not an automatic extension to pay. Federal estimated-payment requirements still apply.",
      },
      {
        q: "How much should I set aside in Utah?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "iowa-gig-worker-taxes",
    state: "Iowa",
    stateAdjective: "Iowa",
    eyebrow: "State Gig Tax Guide",
    title: "Iowa Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Iowa gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Iowa Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Iowa. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Iowa have a state income tax for gig workers?",
    stateBody: [
      "Iowa confirmed a flat 3.8% individual income-tax rate for 2026. It applies to taxable income after Iowa adjustments and deductions. School-district surtax and credits can affect the return; the flat rate alone is not your total effective tax rate.",
      "Check Iowa's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Iowa: official treatment and filing guidance",
        href: "https://revenue.iowa.gov/press-release/2025-10-21/idr-announces-2026-individual-income-tax-and-interest-rates",
      },
    ],
    faqs: [
      {
        q: "How does Iowa tax gig earnings?",
        a: "Iowa confirmed a flat 3.8% individual income-tax rate for 2026. It applies to taxable income after Iowa adjustments and deductions. School-district surtax and credits can affect the return; the flat rate alone is not your total effective tax rate.",
      },
      {
        q: "Do I need estimated payments in Iowa?",
        a: "Check Iowa's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Iowa?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "kansas-gig-worker-taxes",
    state: "Kansas",
    stateAdjective: "Kansas",
    eyebrow: "State Gig Tax Guide",
    title: "Kansas Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Kansas gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Kansas Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Kansas. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Kansas have a state income tax for gig workers?",
    stateBody: [
      "Kansas taxes individual business income under its state income-tax rules. The Department of Revenue announced that the revenue trigger did not produce an income-tax rate reduction for 2026. Use the applicable-year K-40 instructions and deductions, rather than assuming a proposed or contingent reduction took effect.",
      "Check Kansas's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Kansas: official treatment and filing guidance",
        href: "https://www.ksrevenue.gov/taxnotices/notice25-06.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Kansas tax gig earnings?",
        a: "Kansas taxes individual business income under its state income-tax rules. The Department of Revenue announced that the revenue trigger did not produce an income-tax rate reduction for 2026. Use the applicable-year K-40 instructions and deductions, rather than assuming a proposed or contingent reduction took effect.",
      },
      {
        q: "Do I need estimated payments in Kansas?",
        a: "Check Kansas's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Kansas?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "new-mexico-gig-worker-taxes",
    state: "New Mexico",
    stateAdjective: "New Mexico",
    eyebrow: "State Gig Tax Guide",
    title: "New Mexico Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "New Mexico gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "New Mexico Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in New Mexico. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does New Mexico have a state income tax for gig workers?",
    stateBody: [
      "New Mexico has personal income tax and a separate gross receipts tax (GRT). GRT can apply to receipts from services, including independent-contractor work, with activity-specific exemptions and deductions. A platform collecting sales-related tax does not by itself establish that all your GRT obligations are covered.",
      "Calculate New Mexico personal income-tax estimates separately from any GRT returns. Confirm the applicable location, reporting schedule and deductions for GRT with Taxation and Revenue.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "New Mexico: official treatment and filing guidance",
        href: "https://www.tax.newmexico.gov/individuals/estimated-payments/",
      },
      {
        label: "New Mexico: gross receipts tax",
        href: "https://www.tax.newmexico.gov/businesses/gross-receipts-overview/",
      },
    ],
    faqs: [
      {
        q: "How does New Mexico tax gig earnings?",
        a: "New Mexico has personal income tax and a separate gross receipts tax (GRT). GRT can apply to receipts from services, including independent-contractor work, with activity-specific exemptions and deductions. A platform collecting sales-related tax does not by itself establish that all your GRT obligations are covered.",
      },
      {
        q: "Do I need estimated payments in New Mexico?",
        a: "Calculate New Mexico personal income-tax estimates separately from any GRT returns. Confirm the applicable location, reporting schedule and deductions for GRT with Taxation and Revenue.",
      },
      {
        q: "How much should I set aside in New Mexico?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "nebraska-gig-worker-taxes",
    state: "Nebraska",
    stateAdjective: "Nebraska",
    eyebrow: "State Gig Tax Guide",
    title: "Nebraska Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Nebraska gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Nebraska Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Nebraska. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Nebraska have a state income tax for gig workers?",
    stateBody: [
      "Nebraska's 2026 estimated-tax schedule uses a 4.55% rate for its upper two brackets. The scheduled 3.99% rate is not the 2026 rate. State adjustments, filing status, deductions and credits determine taxable income and the final bill.",
      "Check Nebraska's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Nebraska: official treatment and filing guidance",
        href: "https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/2025/f_1040N-ES.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Nebraska tax gig earnings?",
        a: "Nebraska's 2026 estimated-tax schedule uses a 4.55% rate for its upper two brackets. The scheduled 3.99% rate is not the 2026 rate. State adjustments, filing status, deductions and credits determine taxable income and the final bill.",
      },
      {
        q: "Do I need estimated payments in Nebraska?",
        a: "Check Nebraska's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Nebraska?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "mississippi-gig-worker-taxes",
    state: "Mississippi",
    stateAdjective: "Mississippi",
    eyebrow: "State Gig Tax Guide",
    title: "Mississippi Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Mississippi gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Mississippi Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Mississippi. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Mississippi have a state income tax for gig workers?",
    stateBody: [
      "For tax year 2026, Mississippi taxes the first $10,000 of taxable income at 0% and the excess at 4%. This differs from the 4.4% rate on excess income for 2025 returns filed in 2026. Use taxable income after state deductions, not gross business receipts.",
      "Check Mississippi's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Mississippi: official treatment and filing guidance",
        href: "https://www.dor.ms.gov/general-information",
      },
    ],
    faqs: [
      {
        q: "How does Mississippi tax gig earnings?",
        a: "For tax year 2026, Mississippi taxes the first $10,000 of taxable income at 0% and the excess at 4%. This differs from the 4.4% rate on excess income for 2025 returns filed in 2026. Use taxable income after state deductions, not gross business receipts.",
      },
      {
        q: "Do I need estimated payments in Mississippi?",
        a: "Check Mississippi's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Mississippi?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "arkansas-gig-worker-taxes",
    state: "Arkansas",
    stateAdjective: "Arkansas",
    eyebrow: "State Gig Tax Guide",
    title: "Arkansas Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Arkansas gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Arkansas Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Arkansas. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Arkansas have a state income tax for gig workers?",
    stateBody: [
      "Arkansas taxes individual business income using state-specific adjustments and tax tables. Choose the table and forms for the year the income was earned; a filing season in 2026 usually concerns 2025 income and is not a statement of all 2026 rules.",
      "Check Arkansas's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Arkansas: official treatment and filing guidance",
        href: "https://www.dfa.arkansas.gov/office/taxes/income-tax-administration/individual-income-tax/forms/",
      },
    ],
    faqs: [
      {
        q: "How does Arkansas tax gig earnings?",
        a: "Arkansas taxes individual business income using state-specific adjustments and tax tables. Choose the table and forms for the year the income was earned; a filing season in 2026 usually concerns 2025 income and is not a statement of all 2026 rules.",
      },
      {
        q: "Do I need estimated payments in Arkansas?",
        a: "Check Arkansas's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Arkansas?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "west-virginia-gig-worker-taxes",
    state: "West Virginia",
    stateAdjective: "West Virginia",
    eyebrow: "State Gig Tax Guide",
    title: "West Virginia Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "West Virginia gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "West Virginia Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in West Virginia. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does West Virginia have a state income tax for gig workers?",
    stateBody: [
      "West Virginia enacted a further income-tax reduction retroactive to January 1, 2026. Its 2026 marginal rates run from 2.11% to 4.58%. Use the updated state schedule and credits instead of the older roughly 5% top-rate description.",
      "Check West Virginia's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "West Virginia: official treatment and filing guidance",
        href: "https://tax.wv.gov/Individuals/Pages/PersonalIncomeTaxReductionBill.aspx/",
      },
    ],
    faqs: [
      {
        q: "How does West Virginia tax gig earnings?",
        a: "West Virginia enacted a further income-tax reduction retroactive to January 1, 2026. Its 2026 marginal rates run from 2.11% to 4.58%. Use the updated state schedule and credits instead of the older roughly 5% top-rate description.",
      },
      {
        q: "Do I need estimated payments in West Virginia?",
        a: "Check West Virginia's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in West Virginia?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "idaho-gig-worker-taxes",
    state: "Idaho",
    stateAdjective: "Idaho",
    eyebrow: "State Gig Tax Guide",
    title: "Idaho Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Idaho gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Idaho Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Idaho. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Idaho have a state income tax for gig workers?",
    stateBody: [
      "Idaho taxes individual business income, but does not require individuals to make estimated tax payments. You can make voluntary payments online or with Form 51 to reduce the balance due. The absence of state installments does not remove federal estimated-payment requirements.",
      "Idaho Form 51 is a voluntary payment option for individuals, not a quarterly mandate. Check the annual return and extension payment rules separately, and continue to evaluate federal estimates.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Idaho: official treatment and filing guidance",
        href: "https://tax.idaho.gov/taxes/income-tax/withholding/help/",
      },
    ],
    faqs: [
      {
        q: "How does Idaho tax gig earnings?",
        a: "Idaho taxes individual business income, but does not require individuals to make estimated tax payments. You can make voluntary payments online or with Form 51 to reduce the balance due. The absence of state installments does not remove federal estimated-payment requirements.",
      },
      {
        q: "Do I need estimated payments in Idaho?",
        a: "Idaho Form 51 is a voluntary payment option for individuals, not a quarterly mandate. Check the annual return and extension payment rules separately, and continue to evaluate federal estimates.",
      },
      {
        q: "How much should I set aside in Idaho?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "hawaii-gig-worker-taxes",
    state: "Hawaii",
    stateAdjective: "Hawaii",
    eyebrow: "State Gig Tax Guide",
    title: "Hawaii Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Hawaii gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Hawaii Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Hawaii. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Hawaii have a state income tax for gig workers?",
    stateBody: [
      "Hawaii has individual income tax and a General Excise Tax (GET) on gross business receipts, including most services. GET is imposed on the business, not simply a retail sales tax paid by the customer. Expenses generally do not reduce its gross-receipts base; county surcharges are not limited to Oahu.",
      "Check Hawaii individual estimated-tax requirements separately from GET registration, periodic G-45 returns and the annual G-49 reconciliation. The applicable GET classification, rate and county surcharge depend on the activity and location.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Hawaii: official treatment and filing guidance",
        href: "https://tax.hawaii.gov/get/",
      },
    ],
    faqs: [
      {
        q: "How does Hawaii tax gig earnings?",
        a: "Hawaii has individual income tax and a General Excise Tax (GET) on gross business receipts, including most services. GET is imposed on the business, not simply a retail sales tax paid by the customer. Expenses generally do not reduce its gross-receipts base; county surcharges are not limited to Oahu.",
      },
      {
        q: "Do I need estimated payments in Hawaii?",
        a: "Check Hawaii individual estimated-tax requirements separately from GET registration, periodic G-45 returns and the annual G-49 reconciliation. The applicable GET classification, rate and county surcharge depend on the activity and location.",
      },
      {
        q: "How much should I set aside in Hawaii?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "maine-gig-worker-taxes",
    state: "Maine",
    stateAdjective: "Maine",
    eyebrow: "State Gig Tax Guide",
    title: "Maine Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Maine gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Maine Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Maine. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Maine have a state income tax for gig workers?",
    stateBody: [
      "Maine's 2026 regular income-tax rates range from 5.8% to 7.15%. A new 2% surcharge also applies above high-income thresholds: $1 million single, $750,000 married filing separately, or $1.5 million jointly/head of household. Use the revised 2026 schedule, not just the older 7.15% maximum description.",
      "Check Maine's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Maine: official treatment and filing guidance",
        href: "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/2026-05/ind_tax_rate_sched_2026_rev.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Maine tax gig earnings?",
        a: "Maine's 2026 regular income-tax rates range from 5.8% to 7.15%. A new 2% surcharge also applies above high-income thresholds: $1 million single, $750,000 married filing separately, or $1.5 million jointly/head of household. Use the revised 2026 schedule, not just the older 7.15% maximum description.",
      },
      {
        q: "Do I need estimated payments in Maine?",
        a: "Check Maine's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Maine?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "rhode-island-gig-worker-taxes",
    state: "Rhode Island",
    stateAdjective: "Rhode Island",
    eyebrow: "State Gig Tax Guide",
    title: "Rhode Island Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Rhode Island gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Rhode Island Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Rhode Island. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Rhode Island have a state income tax for gig workers?",
    stateBody: [
      "Rhode Island taxes individual business income using the state's deductions, adjustments and rate schedule. The Division of Taxation publishes year-specific inflation adjustments, so use the 2026 schedule for estimates on 2026 income.",
      "Check Rhode Island's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Rhode Island: official treatment and filing guidance",
        href: "https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-11/ADV_2025_22_Inflation_Adjustments.pdf",
      },
    ],
    faqs: [
      {
        q: "How does Rhode Island tax gig earnings?",
        a: "Rhode Island taxes individual business income using the state's deductions, adjustments and rate schedule. The Division of Taxation publishes year-specific inflation adjustments, so use the 2026 schedule for estimates on 2026 income.",
      },
      {
        q: "Do I need estimated payments in Rhode Island?",
        a: "Check Rhode Island's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Rhode Island?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "alaska-gig-worker-taxes",
    state: "Alaska",
    stateAdjective: "Alaska",
    eyebrow: "State Gig Tax Guide",
    title: "Alaska Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Alaska gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Alaska Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Alaska. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Alaska have a state income tax for gig workers?",
    stateBody: [
      "Alaska has no personal state income tax and no statewide sales tax. Local municipalities can impose sales taxes with their own registration and filing rules. Check where you conduct business instead of assuming no state income tax eliminates local business obligations.",
      "There are no Alaska personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Alaska: official treatment and filing guidance",
        href: "https://www.commerce.alaska.gov/web/dcra/officeofthestateassessor/alaskataxfacts",
      },
    ],
    faqs: [
      {
        q: "How does Alaska tax gig earnings?",
        a: "Alaska has no personal state income tax and no statewide sales tax. Local municipalities can impose sales taxes with their own registration and filing rules. Check where you conduct business instead of assuming no state income tax eliminates local business obligations.",
      },
      {
        q: "Do I need estimated payments in Alaska?",
        a: "There are no Alaska personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Alaska?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "new-hampshire-gig-worker-taxes",
    state: "New Hampshire",
    stateAdjective: "New Hampshire",
    eyebrow: "State Gig Tax Guide",
    title: "New Hampshire Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "New Hampshire gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "New Hampshire Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in New Hampshire. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does New Hampshire have a state income tax for gig workers?",
    stateBody: [
      "New Hampshire does not levy a general personal tax on earned income, but sole proprietors can be subject to Business Profits Tax (BPT) and Business Enterprise Tax (BET). The BPT gross-business-income filing threshold is more than $109,000 for periods beginning in 2025 and later; BET has a separate test.",
      "Evaluate BPT and BET filing, deductions and estimated payments separately. The repeal of the Interest and Dividends Tax does not repeal these business taxes or guarantee that a gig business owes only federal tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "New Hampshire: official treatment and filing guidance",
        href: "https://www.revenue.nh.gov/taxes-glance/business-taxes",
      },
    ],
    faqs: [
      {
        q: "How does New Hampshire tax gig earnings?",
        a: "New Hampshire does not levy a general personal tax on earned income, but sole proprietors can be subject to Business Profits Tax (BPT) and Business Enterprise Tax (BET). The BPT gross-business-income filing threshold is more than $109,000 for periods beginning in 2025 and later; BET has a separate test.",
      },
      {
        q: "Do I need estimated payments in New Hampshire?",
        a: "Evaluate BPT and BET filing, deductions and estimated payments separately. The repeal of the Interest and Dividends Tax does not repeal these business taxes or guarantee that a gig business owes only federal tax.",
      },
      {
        q: "How much should I set aside in New Hampshire?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "south-dakota-gig-worker-taxes",
    state: "South Dakota",
    stateAdjective: "South Dakota",
    eyebrow: "State Gig Tax Guide",
    title: "South Dakota Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "South Dakota gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "South Dakota Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in South Dakota. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does South Dakota have a state income tax for gig workers?",
    stateBody: [
      "South Dakota has no personal income tax. Its sales and use tax can apply broadly to goods and services, and municipal tax may also apply. An in-state physical business presence can require licensing without the remote-seller threshold.",
      "There are no South Dakota personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "South Dakota: official treatment and filing guidance",
        href: "https://dor.sd.gov/businesses/taxes/sales-use-tax/",
      },
    ],
    faqs: [
      {
        q: "How does South Dakota tax gig earnings?",
        a: "South Dakota has no personal income tax. Its sales and use tax can apply broadly to goods and services, and municipal tax may also apply. An in-state physical business presence can require licensing without the remote-seller threshold.",
      },
      {
        q: "Do I need estimated payments in South Dakota?",
        a: "There are no South Dakota personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in South Dakota?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "wyoming-gig-worker-taxes",
    state: "Wyoming",
    stateAdjective: "Wyoming",
    eyebrow: "State Gig Tax Guide",
    title: "Wyoming Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Wyoming gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Wyoming Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Wyoming. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: false,
    stateHeading: "Does Wyoming have a state income tax for gig workers?",
    stateBody: [
      "Wyoming has no individual income tax. That does not remove applicable sales and use tax, licensing, or taxes owed to another state where you perform work. Federal income and self-employment tax rules still apply according to your profit and circumstances.",
      "There are no Wyoming personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Wyoming: official treatment and filing guidance",
        href: "https://www.wyo.gov/about-wyoming",
      },
    ],
    faqs: [
      {
        q: "How does Wyoming tax gig earnings?",
        a: "Wyoming has no individual income tax. That does not remove applicable sales and use tax, licensing, or taxes owed to another state where you perform work. Federal income and self-employment tax rules still apply according to your profit and circumstances.",
      },
      {
        q: "Do I need estimated payments in Wyoming?",
        a: "There are no Wyoming personal income-tax installments on ordinary gig earnings. Evaluate federal estimates and any separate business-tax filings or payments; these do not disappear merely because the state has no personal income tax.",
      },
      {
        q: "How much should I set aside in Wyoming?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "delaware-gig-worker-taxes",
    state: "Delaware",
    stateAdjective: "Delaware",
    eyebrow: "State Gig Tax Guide",
    title: "Delaware Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Delaware gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Delaware Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Delaware. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Delaware have a state income tax for gig workers?",
    stateBody: [
      "Delaware has personal income tax and a separate gross receipts tax for many business activities. Its lack of a general sales tax does not mean a service business has no business-tax obligations. Gross receipts tax exclusions, rates and filing frequency depend on activity.",
      "Use Delaware's personal estimated-payment instructions separately from business-license and gross-receipts filings. If you operate in Wilmington, also check city earned-income/net-profits tax obligations.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Delaware: official treatment and filing guidance",
        href: "https://revenue.delaware.gov/frequently-asked-questions/gross-receipts-tax-faqs/",
      },
      {
        label: "Delaware: personal income-tax questions",
        href: "https://revenue.delaware.gov/frequently-asked-questions/personal-income-tax-faqs/",
      },
    ],
    faqs: [
      {
        q: "How does Delaware tax gig earnings?",
        a: "Delaware has personal income tax and a separate gross receipts tax for many business activities. Its lack of a general sales tax does not mean a service business has no business-tax obligations. Gross receipts tax exclusions, rates and filing frequency depend on activity.",
      },
      {
        q: "Do I need estimated payments in Delaware?",
        a: "Use Delaware's personal estimated-payment instructions separately from business-license and gross-receipts filings. If you operate in Wilmington, also check city earned-income/net-profits tax obligations.",
      },
      {
        q: "How much should I set aside in Delaware?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "montana-gig-worker-taxes",
    state: "Montana",
    stateAdjective: "Montana",
    eyebrow: "State Gig Tax Guide",
    title: "Montana Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Montana gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Montana Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Montana. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Montana have a state income tax for gig workers?",
    stateBody: [
      "For 2026 ordinary taxable income, Montana uses 4.7% and 5.65% brackets. The lower bracket extends to $47,500 single/separate, $71,250 head of household, and $95,000 jointly/surviving spouse. Long-term capital gains use a separate schedule; the 2027 changes should not be applied to 2026 earnings.",
      "Check Montana's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Montana: official treatment and filing guidance",
        href: "https://revenue.mt.gov/news/recent-news/HB-337",
      },
    ],
    faqs: [
      {
        q: "How does Montana tax gig earnings?",
        a: "For 2026 ordinary taxable income, Montana uses 4.7% and 5.65% brackets. The lower bracket extends to $47,500 single/separate, $71,250 head of household, and $95,000 jointly/surviving spouse. Long-term capital gains use a separate schedule; the 2027 changes should not be applied to 2026 earnings.",
      },
      {
        q: "Do I need estimated payments in Montana?",
        a: "Check Montana's current individual estimated-tax instructions for its own thresholds, payment dates and exceptions. State payments are separate from federal estimates; withholding or credits may reduce what you must pay.",
      },
      {
        q: "How much should I set aside in Montana?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "north-dakota-gig-worker-taxes",
    state: "North Dakota",
    stateAdjective: "North Dakota",
    eyebrow: "State Gig Tax Guide",
    title: "North Dakota Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "North Dakota gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "North Dakota Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in North Dakota. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does North Dakota have a state income tax for gig workers?",
    stateBody: [
      "North Dakota taxes individual business income through its state return, starting from federal taxable income with state adjustments. A zero-rate bracket can reduce or eliminate tax for some filers, but is not a blanket exemption for all gig work or from filing requirements.",
      "Use the 2026 ND-1ES worksheet to check whether estimated payments are required. Apply the state's own prior-year and current-year tests rather than assuming the federal threshold controls.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "North Dakota: official treatment and filing guidance",
        href: "https://www.tax.nd.gov/individual-income-tax",
      },
      {
        label: "North Dakota: 2026 ND-1ES",
        href: "https://www.tax.nd.gov/sites/www/files/documents/forms/software-developer/individual-income-forms/28709-form-nd-1es-2026%20final.pdf",
      },
    ],
    faqs: [
      {
        q: "How does North Dakota tax gig earnings?",
        a: "North Dakota taxes individual business income through its state return, starting from federal taxable income with state adjustments. A zero-rate bracket can reduce or eliminate tax for some filers, but is not a blanket exemption for all gig work or from filing requirements.",
      },
      {
        q: "Do I need estimated payments in North Dakota?",
        a: "Use the 2026 ND-1ES worksheet to check whether estimated payments are required. Apply the state's own prior-year and current-year tests rather than assuming the federal threshold controls.",
      },
      {
        q: "How much should I set aside in North Dakota?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "vermont-gig-worker-taxes",
    state: "Vermont",
    stateAdjective: "Vermont",
    eyebrow: "State Gig Tax Guide",
    title: "Vermont Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Vermont gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Vermont Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Vermont. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading: "Does Vermont have a state income tax for gig workers?",
    stateBody: [
      "Vermont taxes individual business income under its state income-tax rules. Federal law changes do not automatically settle Vermont treatment; use the applicable-year state additions, subtractions and credits. Residents working elsewhere may need both sourcing and credit calculations.",
      "Vermont provides Form IN-114 and myVTax for estimates. Check its current-year and prior-year payment tests and annualized method for uneven income. Other Vermont business taxes remain separate.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Vermont: official treatment and filing guidance",
        href: "https://tax.vermont.gov/individuals/estimated-income-tax",
      },
      {
        label: "Vermont: 2026 legislative changes",
        href: "https://tax.vermont.gov/tax-law-and-guidance/tax-legislation/2026",
      },
    ],
    faqs: [
      {
        q: "How does Vermont tax gig earnings?",
        a: "Vermont taxes individual business income under its state income-tax rules. Federal law changes do not automatically settle Vermont treatment; use the applicable-year state additions, subtractions and credits. Residents working elsewhere may need both sourcing and credit calculations.",
      },
      {
        q: "Do I need estimated payments in Vermont?",
        a: "Vermont provides Form IN-114 and myVTax for estimates. Check its current-year and prior-year payment tests and annualized method for uneven income. Other Vermont business taxes remain separate.",
      },
      {
        q: "How much should I set aside in Vermont?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
  {
    slug: "washington-dc-gig-worker-taxes",
    state: "Washington, D.C.",
    stateAdjective: "D.C.",
    eyebrow: "State Gig Tax Guide",
    title:
      "Washington, D.C. Gig Worker Taxes: Income, Business Tax & Estimates",
    metaDescription:
      "Washington, D.C. gig tax guide: state treatment, business-tax exceptions, federal estimates and deductions. Reviewed November 7, 2026.",
    h1: "Washington, D.C. Gig Worker Taxes",
    intro:
      "This guide covers U.S. gig work carried on as a sole proprietor in Washington, D.C.. Start with business income and documented expenses, then check residence, where the work is performed and any separate business-tax rules. Employee pay and corporate entities need different treatment.",
    hasStateIncomeTax: true,
    stateHeading:
      "Does Washington, D.C. have a local income tax for gig workers?",
    stateBody: [
      "District residents can owe personal income tax, and an unincorporated business operating in D.C. may have a separate D-30 franchise-tax obligation. A personal-services exemption can apply when more than 80% of gross income comes from services rendered by owners/members and capital is not a material income-producing factor; do not assume every gig business qualifies.",
      "Review D-40ES for resident individual estimates and D-30 rules for an unincorporated business. Nonresident personal-income-tax treatment does not by itself settle a business's D.C. franchise-tax obligation.",
      "Keep a record of where work was performed and of any move during the year. Resident, part-year and nonresident rules can change which returns you file. Do not assume employee wage reciprocity also exempts independent-contractor business income.",
    ],
    stateResources: [
      {
        label: "Washington, D.C.: official treatment and filing guidance",
        href: "https://otr.cfo.dc.gov/page/dc-business-franchise-tax-rates",
      },
    ],
    faqs: [
      {
        q: "How does Washington, D.C. tax gig earnings?",
        a: "District residents can owe personal income tax, and an unincorporated business operating in D.C. may have a separate D-30 franchise-tax obligation. A personal-services exemption can apply when more than 80% of gross income comes from services rendered by owners/members and capital is not a material income-producing factor; do not assume every gig business qualifies.",
      },
      {
        q: "Do I need estimated payments in Washington, D.C.?",
        a: "Review D-40ES for resident individual estimates and D-30 rules for an unincorporated business. Nonresident personal-income-tax treatment does not by itself settle a business's D.C. franchise-tax obligation.",
      },
      {
        q: "How much should I set aside in Washington, D.C.?",
        a: "Estimate a reserve using household income, withholding, credits, deductible expenses and the applicable state and local taxes. A fixed percentage of payouts is not a calculated tax bill; revisit it as income changes.",
      },
      {
        q: "Which business expenses can I deduct?",
        a: "Deduct eligible ordinary and necessary business costs, supported by records. For vehicle work, separate business trips from commuting and personal travel; being online is not enough. State deductions and gross-receipts taxes can differ from federal treatment.",
      },
      {
        q: "Does receiving no 1099 mean no tax is due?",
        a: "No. Form-reporting thresholds do not create a tax-free allowance. Reconcile all business income with your records; deductions, filing requirements and self-employment earnings determine the tax treatment.",
      },
    ],
  },
];

export function getStateTaxGuide(slug: string): StateTaxGuide | undefined {
  return STATE_TAX_GUIDES.find(g => g.slug === slug);
}
