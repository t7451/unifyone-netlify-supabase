import { TAX_REVIEW } from "../resourceReview";
/**
 * platformTaxGuides.ts — content for the platform-specific gig tax guide
 * cluster (/doordash-taxes, /uber-driver-taxes, /instacart-taxes).
 *
 * These pages target the highest-intent recurring gig-worker searches
 * ("doordash taxes", "how much to set aside for uber taxes", etc.) and are
 * built for AEO/GEO: each ships a FAQPage + WebPage JSON-LD block and visible
 * Q&A that answer-engines can cite.
 *
 * Accuracy note: tax thresholds and the IRS standard mileage rate change every
 * year. Copy here states evergreen rules (you owe SE tax on net earnings; you
 * must report all income whether or not a form is issued) and links out to the
 * IRS for authoritative current numbers. Always qualified, never tax advice.
 */

export interface PlatformFaq {
  q: string;
  a: string;
}

export interface PlatformTaxGuide {
  /** Route slug, also the prerendered file name. */
  slug: string;
  /** Brand name, e.g. "DoorDash". */
  platform: string;
  /** What workers are called, e.g. "Dashers". */
  workerNoun: string;
  /** Short description of the work, e.g. "food delivery". */
  workType: string;
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
  /** Which 1099 form(s) this platform issues and the key nuance. */
  formsHeading: string;
  formsBody: string[];
  /** Platform-specific deductible expenses (merged with the shared mileage-based set). */
  extraDeductions?: { label: string; desc: string }[];
  /**
   * Replaces the deduction grid entirely. Use for non-vehicle platforms
   * (e.g. remote freelance) where the mileage-based SHARED_DEDUCTIONS don't apply.
   */
  deductionsOverride?: { label: string; desc: string }[];
  /**
   * Whether the work is vehicle-based (default true). When false, the page hides
   * the "standard mileage rate vs actual vehicle expenses" note and the mileage
   * angle in the CTA — accurate for desk-based freelancers.
   */
  vehicleBased?: boolean;
  /**
   * When true, the "how it works" framing treats the worker as a self-employed
   * goods seller (income tax + SE tax on net profit after cost of goods) rather
   * than an independent contractor — accurate for marketplace sellers.
   */
  sellerFraming?: boolean;
  /** Platform/processor sources reviewed for document access and reporting. */
  resources?: { label: string; href: string }[];
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: PlatformFaq[];
}

/** Deductions every mileage-based gig worker can usually claim. */
export const SHARED_DEDUCTIONS: { label: string; desc: string }[] = [
  {
    label: "Business mileage",
    desc: "Eligible business miles supported by a trip log; personal travel and ordinary commuting are excluded. Being online alone does not establish deductibility.",
  },
  {
    label: "Phone & data",
    desc: "The business-use percentage of your phone bill — you cannot work without it.",
  },
  {
    label: "Tolls & parking",
    desc: "Eligible business tolls and parking may be deducted separately from standard mileage. Personal and commuting costs do not qualify.",
  },
  {
    label: "Hot bags & equipment",
    desc: "Insulated bags, phone mounts, chargers, and other gear bought for the work.",
  },
];

/** Planning reserve limitations, used across platform guides. */
export const SET_ASIDE_ANSWER = TAX_REVIEW.reserve;

export const PLATFORM_TAX_GUIDES: PlatformTaxGuide[] = [
  {
    slug: "doordash-taxes",
    platform: "DoorDash",
    workerNoun: "Dashers",
    workType: "food delivery",
    eyebrow: "Gig Tax Guide",
    title: "DoorDash Taxes: A Dasher's Guide to 1099 Filing & Deductions",
    metaDescription:
      "How DoorDash taxes work for Dashers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "DoorDash Taxes: What Every Dasher Needs to Know",
    intro:
      "This guide covers U.S. Dashers working as independent contractors. Keep earnings, tip, expense and mileage records, and use the rules for the year the income was earned. Puerto Rico and non-U.S. reporting differ.",
    formsHeading: "Do you get a 1099 from DoorDash?",
    formsBody: [
      "DoorDash uses Form 1099-NEC for eligible U.S. Dashers. Check Earnings → View payout details → Tax documents in the Dasher app. The help page still describes the 2025 $600 threshold; use the IRS 2026 rule below for 2026 payments and confirm year-specific delivery details with DoorDash.",
      "If you earned under the reporting threshold you may not get a form — but you still legally have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Red Card fees & supplies",
        desc: "Any required supplies and on-the-job costs tied to completing orders.",
      },
    ],
    faqs: [
      {
        q: "Does DoorDash take out taxes for me?",
        a: "DoorDash generally does not withhold tax for independent contractors, although backup withholding can apply. Check your payment statements and any withholding shown on your tax form.",
      },
      {
        q: "How much should I set aside for DoorDash taxes?",
        a: "A tax reserve is a planning assumption, not your calculated tax bill. Use household income, withholding, credits, deductible expenses and state rules to estimate what to save; a fixed 25–30% can be too high or too low. Revisit the estimate as earnings change.",
      },
      {
        q: "Do I get a 1099 from DoorDash?",
        a: "The general federal 1099-NEC threshold is $2,000 for 2026 payments ($600 for 2025). Check tax documents in the Dasher app. Report all earnings even without a form; backup withholding and other reporting rules can produce forms below the threshold.",
      },
      {
        q: "What can Dashers deduct?",
        a: "Eligible business mileage or eligible actual vehicle expenses may be deductible under IRS rules. Keep a trip log and exclude personal and commuting miles. Business-use phone costs, supplies, tolls and parking may also qualify.",
      },
      {
        q: "When are DoorDash taxes due?",
        a: "Estimated payments generally apply if you expect to owe at least $1,000 after withholding and refundable credits and do not meet a payment exception. Safe-harbor rules generally compare 90% of current-year tax with 100% of prior-year tax (110% for certain higher-income taxpayers). Timing matters; paying four times does not itself prevent a penalty. See Form 1040-ES for exceptions and uneven-income rules.",
      },
    ],
  },
  {
    slug: "uber-driver-taxes",
    platform: "Uber",
    workerNoun: "Uber drivers",
    workType: "rideshare and delivery",
    eyebrow: "Gig Tax Guide",
    title: "Uber Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates",
    metaDescription:
      "Uber driver taxes explained: the 1099-K vs 1099-NEC, your Tax Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    h1: "Uber Driver Taxes: The Complete Breakdown",
    intro:
      "This guide covers U.S. Uber drivers working as independent contractors. Reconcile gross fares, incentives, tips and fees before estimating profit; bank deposits alone do not show all income and expenses.",
    formsHeading: "1099-K vs 1099-NEC: which one does Uber send?",
    formsBody: [
      "Uber may issue two forms. A 1099-K reports the gross amount riders and Uber Eats customers paid for your trips and deliveries (processed through Uber as a third-party platform). A 1099-NEC reports other income like incentives, referrals, and bonuses.",
      "Download the Uber Tax Summary and available forms from the driver dashboard Tax Information section or the driver app. Compare gross amounts and fees with your own records. Do not add deposits to income already recorded from the same trips.",
    ],
    extraDeductions: [
      {
        label: "Uber service fees & commissions",
        desc: "Fees Uber deducts from fares are a business expense — your Tax Summary breaks them out.",
      },
      {
        label: "Water, mints & rider amenities",
        desc: "Reasonable amenities you provide for passengers are deductible.",
      },
    ],
    faqs: [
      {
        q: "Does Uber withhold taxes from my pay?",
        a: "Uber generally does not withhold tax for U.S. independent contractors, although backup withholding can apply. Check your statements and tax forms for any withholding.",
      },
      {
        q: "What's the difference between the 1099-K and 1099-NEC from Uber?",
        a: "The 1099-K reports the gross fares riders and customers paid for your trips and deliveries. The 1099-NEC reports non-trip income such as incentives, referrals, and bonuses. Your Uber Tax Summary reconciles both with your actual take-home.",
      },
      {
        q: "How much should I set aside for Uber taxes?",
        a: "A tax reserve is a planning assumption, not your calculated tax bill. Use household income, withholding, credits, deductible expenses and state rules to estimate what to save; a fixed 25–30% can be too high or too low. Revisit the estimate as earnings change.",
      },
      {
        q: "What can Uber drivers deduct?",
        a: "Use your own trip log to establish eligible business miles. Uber online-mile totals are supporting information, not proof that every mile is deductible. Eligible platform fees, business-use phone costs, parking and supplies may also qualify.",
      },
      {
        q: "Do Uber drivers have to pay quarterly taxes?",
        a: "Estimated payments generally apply if you expect to owe at least $1,000 after withholding and refundable credits and do not meet a payment exception. Safe-harbor rules generally compare 90% of current-year tax with 100% of prior-year tax (110% for certain higher-income taxpayers). Timing matters; paying four times does not itself prevent a penalty. See Form 1040-ES for exceptions and uneven-income rules.",
      },
    ],
  },
  {
    slug: "instacart-taxes",
    platform: "Instacart",
    workerNoun: "full-service shoppers",
    workType: "grocery shopping and delivery",
    eyebrow: "Gig Tax Guide",
    title: "Instacart Taxes: A Shopper's Guide to 1099s & Deductions",
    metaDescription:
      "Instacart tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Instacart Taxes: A Shopper's Guide",
    intro:
      "This guide covers U.S. independent-contractor work through Instacart. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Instacart",
    formsBody: [
      "Instacart's tax-delivery guidance describes 1099 reporting for independent-contractor shoppers. Stripe's Instacart guide provides tax-document access and correction instructions, but delivery providers and account settings may differ by year. Follow the tax-document instructions in your Shopper account; do not assume an old Stripe invitation is the current delivery route.",
      "The reviewed delivery guidance does not establish every 2026 account workflow. Employee wages, if any, belong on a W-2 and should not be treated as contractor receipts.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & coolers",
        desc: "Cooler bags and equipment you buy to keep groceries fresh are deductible.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Instacart tax documents?",
        a: "Instacart's tax-delivery guidance describes 1099 reporting for independent-contractor shoppers. Stripe's Instacart guide provides tax-document access and correction instructions, but delivery providers and account settings may differ by year. Follow the tax-document instructions in your Shopper account; do not assume an old Stripe invitation is the current delivery route.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Instacart: official document guidance",
        href: "https://support.stripe.com/express/questions/guide-to-1099-tax-forms-for-instacart-shopper?locale=en-US",
      },
    ],
  },
  {
    slug: "amazon-flex-taxes",
    platform: "Amazon Flex",
    workerNoun: "Amazon Flex drivers",
    workType: "package delivery",
    eyebrow: "Gig Tax Guide",
    title: "Amazon Flex Taxes: A Driver's Guide to 1099 Filing & Deductions",
    metaDescription:
      "Amazon Flex tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Amazon Flex Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Amazon Flex. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Amazon Flex",
    formsBody: [
      "Use Amazon Tax Central and the official Flex account support route to locate documents for your delivery earnings. Amazon's publicly readable tax-interview help is general, and the Flex FAQ could not be retrieved during this review; a current 2026 Flex-specific form type and delivery schedule were not independently confirmed.",
      "Confirm the form and tax year shown in your account. Do not use Amazon seller 1099-K instructions as proof of how Flex delivery compensation is reported.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Phone mount & delivery supplies",
        desc: "Phone mounts, chargers, and any supplies you buy to complete delivery blocks.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Amazon Flex tax documents?",
        a: "Use Amazon Tax Central and the official Flex account support route to locate documents for your delivery earnings. Amazon's publicly readable tax-interview help is general, and the Flex FAQ could not be retrieved during this review; a current 2026 Flex-specific form type and delivery schedule were not independently confirmed.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label:
          "Amazon Flex: official document guidance (review limitations explained above)",
        href: "https://taxcentral.amazon.com/tax-interview/help?locale=en_US&nodeId=201588330",
      },
    ],
  },
  {
    slug: "grubhub-taxes",
    platform: "Grubhub",
    workerNoun: "Grubhub drivers",
    workType: "food delivery",
    eyebrow: "Gig Tax Guide",
    title: "Grubhub Taxes: A Driver's Guide to 1099 Filing & Deductions",
    metaDescription:
      "Grubhub tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Grubhub Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Grubhub. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Grubhub",
    formsBody: [
      "Grubhub's driver guidance identifies Form 1099-NEC for delivery compensation. That page still uses a $600 threshold, which matches the general 2025 rule; for 2026 nonemployee compensation use the federal $2,000 rule below. Confirm document availability in your driver account rather than assuming the restaurant merchant 1099-K process applies.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & supplies",
        desc: "Insulated delivery bags, phone mounts, and supplies bought to complete deliveries.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Grubhub tax documents?",
        a: "Grubhub's driver guidance identifies Form 1099-NEC for delivery compensation. That page still uses a $600 threshold, which matches the general 2025 rule; for 2026 nonemployee compensation use the federal $2,000 rule below. Confirm document availability in your driver account rather than assuming the restaurant merchant 1099-K process applies.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Grubhub: official document guidance",
        href: "https://driver.grubhub.com/blog/financial-tips-for-delivery-drivers/",
      },
    ],
  },
  {
    slug: "lyft-driver-taxes",
    platform: "Lyft",
    workerNoun: "Lyft drivers",
    workType: "rideshare",
    eyebrow: "Gig Tax Guide",
    title: "Lyft Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates",
    metaDescription:
      "Lyft tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Lyft Driver Taxes: The Complete Breakdown",
    intro:
      "This guide covers U.S. independent-contractor work through Lyft. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Lyft",
    formsBody: [
      "Lyft provides a Driver Annual Summary and, when applicable, a 1099-K for passenger payments and a 1099-NEC for non-ride earnings. Tax documents are in the Dashboard Tax Center. The reviewed help page describes the 2025 document cycle; confirm the 2026 cycle in your account.",
      "The Annual Summary separates ride payments, non-ride earnings and expenses. Gross rider payments can include platform fees, taxes and toll reimbursements, so they may exceed bank deposits. Online miles are not automatically deductible business miles.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Lyft service fees & commissions",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Water, mints & rider amenities",
        desc: "Reasonable amenities you provide for passengers are deductible.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Lyft tax documents?",
        a: "Lyft provides a Driver Annual Summary and, when applicable, a 1099-K for passenger payments and a 1099-NEC for non-ride earnings. Tax documents are in the Dashboard Tax Center. The reviewed help page describes the 2025 document cycle; confirm the 2026 cycle in your account.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Lyft: official document guidance",
        href: "https://help.lyft.com/hc/en-us/all/articles/115012926967",
      },
    ],
  },
  {
    slug: "spark-driver-taxes",
    platform: "Spark Driver",
    workerNoun: "Spark drivers",
    workType: "delivery for Walmart",
    eyebrow: "Gig Tax Guide",
    title: "Spark Driver Taxes: A Guide to 1099 Filing & Deductions",
    metaDescription:
      "Spark Driver tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Spark Driver Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Spark Driver. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Spark Driver",
    formsBody: [
      "Walmart's 2025 Driver Tax Documents page directs drivers to Account → Tax Documents in the Spark Driver app. It discusses Form 1099-NEC and includes tips in reported earnings. Its $600 eligibility figure concerns 2025; the general federal NEC threshold is $2,000 for 2026 payments.",
      "Use the current app instructions for delivery preferences and corrections. Do not assume a bank or payout provider, rather than Walmart's documented tax workflow, supplies your Spark earnings form.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, hand trucks, phone mounts, and supplies bought to complete Walmart deliveries.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Spark Driver tax documents?",
        a: "Walmart's 2025 Driver Tax Documents page directs drivers to Account → Tax Documents in the Spark Driver app. It discusses Form 1099-NEC and includes tips in reported earnings. Its $600 eligibility figure concerns 2025; the general federal NEC threshold is $2,000 for 2026 payments.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Spark Driver: official document guidance",
        href: "https://sparkdriverapp-walmart.helpdocs.io/l/en/article/d8dorui0f0-2025-tax-filing-faqs-xog",
      },
    ],
  },
  {
    slug: "shipt-shopper-taxes",
    platform: "Shipt",
    workerNoun: "Shipt shoppers",
    workType: "grocery shopping and delivery",
    eyebrow: "Gig Tax Guide",
    title: "Shipt Taxes: A Shopper's Guide to 1099s & Deductions",
    metaDescription:
      "Shipt tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Shipt Taxes: A Shopper's Guide",
    intro:
      "This guide covers U.S. independent-contractor work through Shipt. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Shipt",
    formsBody: [
      "Shipt's Stripe guide identifies Form 1099-NEC and explains Stripe Express access and corrections. Its $600 threshold and January dates describe older filing guidance; the general federal NEC threshold rises to $2,000 for 2026 payments. Confirm the current document cycle with Shipt.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & coolers",
        desc: "Cooler bags and equipment you buy to keep groceries fresh are deductible.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Shipt tax documents?",
        a: "Shipt's Stripe guide identifies Form 1099-NEC and explains Stripe Express access and corrections. Its $600 threshold and January dates describe older filing guidance; the general federal NEC threshold rises to $2,000 for 2026 payments. Confirm the current document cycle with Shipt.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Shipt: official document guidance",
        href: "https://support.stripe.com/express/questions/guide-to-1099-tax-forms-for-shipt-shoppers?locale=en-US",
      },
    ],
  },
  {
    slug: "roadie-taxes",
    platform: "Roadie",
    workerNoun: "Roadie drivers",
    workType: "package and item delivery",
    eyebrow: "Gig Tax Guide",
    title: "Roadie Taxes: A Driver's Guide to 1099 Filing & Deductions",
    metaDescription:
      "Roadie tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Roadie Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Roadie. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Roadie",
    formsBody: [
      "Keep Roadie earnings statements and request the applicable-year tax documents through Roadie support. The reviewed Prop 22 page refers to different forms for adjustments and healthcare stipends and contains older $600 language. It does not establish a single verified 2026 form type for every Roadie payment.",
      "Reconcile delivery pay, tips, reimbursements, adjustments and any stipends by category. An expense reimbursement appearing in reported gross income should be matched to its underlying business expense; do not deduct the same cost twice.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Hauling & delivery supplies",
        desc: "Hand trucks, straps, moving blankets, phone mounts, and supplies bought to complete Roadie gigs.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Roadie tax documents?",
        a: "Keep Roadie earnings statements and request the applicable-year tax documents through Roadie support. The reviewed Prop 22 page refers to different forms for adjustments and healthcare stipends and contains older $600 language. It does not establish a single verified 2026 form type for every Roadie payment.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label:
          "Roadie: official document guidance (review limitations explained above)",
        href: "https://support.roadie.com/support/article/California-Prop-22-What-You-Need-to-Know",
      },
    ],
  },
  {
    slug: "gopuff-taxes",
    platform: "Gopuff",
    workerNoun: "Gopuff drivers",
    workType: "convenience and grocery delivery",
    eyebrow: "Gig Tax Guide",
    title: "Gopuff Taxes: A Driver's Guide to 1099 Filing & Deductions",
    metaDescription:
      "Gopuff tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Gopuff Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Gopuff. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Gopuff",
    formsBody: [
      "Gopuff's 1099 FAQ identifies Form 1099-NEC and delivery through Stripe Express or mail. The reviewed page explicitly covers 2025 earnings and 2026 delivery dates. Its $600 threshold is the older general NEC rule; use $2,000 for 2026 compensation and confirm the next delivery schedule in your account.",
      "This guide concerns U.S. delivery-partner business income. Warehouse or other employee wages follow W-2 rules. Include base pay, tips, promotions and other compensation in your reconciliation.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, coolers, phone mounts, and supplies bought to complete Gopuff deliveries.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Gopuff tax documents?",
        a: "Gopuff's 1099 FAQ identifies Form 1099-NEC and delivery through Stripe Express or mail. The reviewed page explicitly covers 2025 earnings and 2026 delivery dates. Its $600 threshold is the older general NEC rule; use $2,000 for 2026 compensation and confirm the next delivery schedule in your account.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label:
          "Gopuff: official document guidance (review limitations explained above)",
        href: "https://help.gopuff.com/articles/delivery-partner-pay/1099-tax-forms-faq/6772d5950de4af09be98ccb9",
      },
    ],
  },
  {
    slug: "taskrabbit-taxes",
    platform: "TaskRabbit",
    workerNoun: "Taskers",
    workType: "task and handyman work",
    eyebrow: "Gig Tax Guide",
    title: "TaskRabbit Taxes: A Tasker's Guide to 1099-K & Deductions",
    metaDescription:
      "TaskRabbit tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "TaskRabbit Taxes: What Every Tasker Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through TaskRabbit. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for TaskRabbit",
    formsBody: [
      "Taskrabbit identifies Form 1099-K issued through Stripe for eligible Taskers. Its 2025-cycle guide explains Stripe Express delivery. Reconcile the form with Transaction History: the reported amount includes task payouts, expenses, tips and incentives.",
      "Do not assume every customer-facing Taskrabbit charge is your deductible fee. Match expenses and reimbursements to your own transaction records. The federal TPSO test is more than $20,000 AND more than 200 transactions; forms may still be issued below it.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Tools & equipment",
        desc: "Drills, ladders, hand tools, and other equipment you buy to complete tasks are deductible (larger items may be depreciated).",
      },
      {
        label: "Job supplies & materials",
        desc: "Track business inventory and production costs. Use the applicable inventory/cost-of-goods-sold method; do not automatically deduct every unsold purchase immediately.",
      },
      {
        label: "TaskRabbit service fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
    ],
    faqs: [
      {
        q: "Where do I find TaskRabbit tax documents?",
        a: "Taskrabbit identifies Form 1099-K issued through Stripe for eligible Taskers. Its 2025-cycle guide explains Stripe Express delivery. Reconcile the form with Transaction History: the reported amount includes task payouts, expenses, tips and incentives.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "TaskRabbit: official document guidance",
        href: "https://support.taskrabbit.com/hc/en-us/articles/46260426119579-What-Is-a-1099-K-Form",
      },
    ],
  },
  {
    slug: "rover-taxes",
    platform: "Rover",
    workerNoun: "Rover sitters and walkers",
    workType: "pet care",
    eyebrow: "Gig Tax Guide",
    title: "Rover Taxes: A Pet Sitter's Guide to 1099-K & Deductions",
    metaDescription:
      "Rover tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Rover Taxes: What Every Sitter and Walker Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Rover. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Rover",
    formsBody: [
      "Rover's Sitter Tax Hub identifies Form 1099-K and a companion tax summary. Gross reported payments can include Rover fees, sales tax and canceled bookings, so reconcile the summary and booking records before calculating business profit.",
      "Record income from pet-care work even if no form is issued. Only claim business expenses you actually incurred and can support; fees, refunds and cancellations must not be counted twice.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Pet-care supplies",
        desc: "Leashes, treats, waste bags, toys, crates, and cleaning supplies bought for the animals in your care.",
      },
      {
        label: "Rover service fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Home use for boarding",
        desc: "If you board pets in your home, a portion of home expenses may be deductible — the rules are strict, so confirm with a tax professional.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Rover tax documents?",
        a: "Rover's Sitter Tax Hub identifies Form 1099-K and a companion tax summary. Gross reported payments can include Rover fees, sales tax and canceled bookings, so reconcile the summary and booking records before calculating business profit.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Rover: official document guidance",
        href: "https://get.rover.com/sitter/taxes",
      },
    ],
  },
  {
    slug: "upwork-taxes",
    platform: "Upwork",
    workerNoun: "Upwork freelancers",
    workType: "freelance",
    eyebrow: "Gig Tax Guide",
    title: "Upwork Taxes: A Freelancer's Guide to 1099-K & Deductions",
    metaDescription:
      "Upwork tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Upwork Taxes: What Every Freelancer Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Upwork. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Upwork",
    formsBody: [
      "Upwork generally uses Form 1099-K for U.S. marketplace freelancers who meet the applicable reporting rules. Its help page identifies limited 1099-NEC exceptions for work for Upwork or managed services, and W-2 treatment for Upwork Payroll employees.",
      "Use Tax information and Tax forms in your account and reconcile gross earnings with fees and refunds. The reviewed help page describes tax year 2025; federal 2026 rules below should not be confused with a guarantee of a particular account's document delivery.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    vehicleBased: false,
    deductionsOverride: [
      {
        label: "Home office",
        desc: "A qualifying space generally must be used regularly and exclusively for the business. Occasional work at a personal-use desk is not enough.",
      },
      {
        label: "Computer, software & subscriptions",
        desc: "Your computer, design/dev tools, and subscriptions used for client work (larger purchases may be depreciated).",
      },
      {
        label: "Internet & phone",
        desc: "The business-use share of your home internet and phone bills.",
      },
      {
        label: "Upwork service fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Professional development",
        desc: "Courses, certifications, and reference materials that maintain or improve your freelance skills.",
      },
      {
        label: "Equipment & supplies",
        desc: "Desk, monitor, headset, and other equipment bought for your freelance business.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Upwork tax documents?",
        a: "Upwork generally uses Form 1099-K for U.S. marketplace freelancers who meet the applicable reporting rules. Its help page identifies limited 1099-NEC exceptions for work for Upwork or managed services, and W-2 treatment for Upwork Payroll employees.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Upwork: official document guidance",
        href: "https://support.upwork.com/hc/en-us/articles/211063958-Report-income-as-a-U-S-freelancer-on-Upwork",
      },
    ],
  },
  {
    slug: "fiverr-taxes",
    platform: "Fiverr",
    workerNoun: "Fiverr sellers",
    workType: "freelance",
    eyebrow: "Gig Tax Guide",
    title: "Fiverr Taxes: A Seller's Guide to 1099-K & Deductions",
    metaDescription:
      "Fiverr tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Fiverr Taxes: What Every Seller Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Fiverr. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Fiverr",
    formsBody: [
      "Fiverr's U.S. freelancer guidance describes W-9 collection and Form 1099-K where reporting is required. Its Earnings page provides tax-form downloads. A form and an earnings statement are reconciliation records, not a calculation of your taxable profit.",
      "This guide covers U.S. freelancers. VAT/GST or sales taxes charged to customers do not replace your income-tax obligations, and non-U.S. withholding rules should not be applied to a U.S. account.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    vehicleBased: false,
    deductionsOverride: [
      {
        label: "Home office",
        desc: "A qualifying space generally must be used regularly and exclusively for the business. Occasional work at a personal-use desk is not enough.",
      },
      {
        label: "Software & tools",
        desc: "Design, writing, editing, or dev tools and subscriptions used to deliver your gigs (larger purchases may be depreciated).",
      },
      {
        label: "Internet & phone",
        desc: "The business-use share of your home internet and phone bills.",
      },
      {
        label: "Fiverr commission & fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Professional development",
        desc: "Courses and resources that maintain or improve the skills you sell on Fiverr.",
      },
      {
        label: "Equipment & supplies",
        desc: "Computer, microphone, camera, and other equipment bought to produce your gigs.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Fiverr tax documents?",
        a: "Fiverr's U.S. freelancer guidance describes W-9 collection and Form 1099-K where reporting is required. Its Earnings page provides tax-form downloads. A form and an earnings statement are reconciliation records, not a calculation of your taxable profit.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Fiverr: official document guidance",
        href: "https://help.fiverr.com/hc/en-us/articles/9234443621137-Your-earnings-page",
      },
    ],
  },
  {
    slug: "favor-taxes",
    platform: "Favor",
    workerNoun: "Runners",
    workType: "delivery",
    eyebrow: "Gig Tax Guide",
    title: "Favor Taxes: A Runner's Guide to 1099 Filing & Deductions",
    metaDescription:
      "Favor tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Favor Taxes: What Every Runner Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Favor. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Favor",
    formsBody: [
      "Favor's Runner tax page specifies Form 1099-K through Stripe and says it does not issue Runner Forms 1099-NEC or 1099-MISC. The page covers 2025. Use the IRS test below for the federal threshold; the platform page's boundary wording is not a replacement for IRS rules.",
      "Favor bases its earnings subtotal on deposit dates rather than order-completion dates. Reconcile the Runner app's annual earnings with deposits and any tax document, especially across year-end.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, phone mounts, chargers, and supplies bought to complete Favor deliveries.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Favor tax documents?",
        a: "Favor's Runner tax page specifies Form 1099-K through Stripe and says it does not issue Runner Forms 1099-NEC or 1099-MISC. The page covers 2025. Use the IRS test below for the federal threshold; the platform page's boundary wording is not a replacement for IRS rules.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Favor: official document guidance",
        href: "https://favor-runners.zendesk.com/hc/en-us/articles/8704378062866-Taxes",
      },
    ],
  },
  {
    slug: "veho-taxes",
    platform: "Veho",
    workerNoun: "Veho drivers",
    workType: "package delivery",
    eyebrow: "Gig Tax Guide",
    title: "Veho Taxes: A Driver's Guide to 1099 Filing & Deductions",
    metaDescription:
      "Veho tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Veho Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Veho. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Veho",
    formsBody: [
      "Veho's payment provider Routable describes automated 1099 filing for Veho. The reviewed public material does not specify a current 2026 driver form subtype or delivery deadline. Request the applicable-year document through Veho's official driver support instead of assuming all delivery platforms use the same form.",
      "Retain route payments, adjustments and payout statements. A missing 1099 does not remove the obligation to report business income; ask the issuer to correct discrepancies rather than changing your records to match an incorrect form.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, hand trucks, phone mounts, and supplies bought to complete Veho routes.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Veho tax documents?",
        a: "Veho's payment provider Routable describes automated 1099 filing for Veho. The reviewed public material does not specify a current 2026 driver form subtype or delivery deadline. Request the applicable-year document through Veho's official driver support instead of assuming all delivery platforms use the same form.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label:
          "Veho: official document guidance (review limitations explained above)",
        href: "https://www.routable.com/customers/veho-api/",
      },
    ],
  },
  {
    slug: "dolly-taxes",
    platform: "Dolly / Taskrabbit Delivery",
    workerNoun: "Helpers",
    workType: "moving and hauling",
    eyebrow: "Gig Tax Guide",
    title: "Dolly / Taskrabbit Delivery Taxes: Forms & Business Expenses",
    metaDescription:
      "Dolly / Taskrabbit Delivery tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Dolly / Taskrabbit Delivery Taxes",
    intro:
      "This guide covers U.S. independent-contractor work through Dolly / Taskrabbit Delivery. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading:
      "Tax documents and income records for Dolly / Taskrabbit Delivery",
    formsBody: [
      "Dolly has been rebranded as Taskrabbit Delivery. Taskrabbit's 2026 transition guidance says Helpers and Hands continue through the Helper app under new platform terms. The public transition FAQ does not confirm the 2026 tax-form subtype or issuer arrangement.",
      "Keep pre- and post-transition payout records and obtain the forms for each applicable issuer. Do not assume Taskrabbit marketplace Taskers' 1099-K instructions automatically describe Taskrabbit Delivery Helpers' documents.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Moving equipment",
        desc: "Hand trucks, dollies, moving blankets, straps, ramps, and tools bought to complete Dolly jobs (larger items may be depreciated).",
      },
      {
        label: "Vehicle & truck costs",
        desc: "If you use a truck or van, mileage at the IRS standard mileage rate — or actual vehicle expenses — covers the driving you do for jobs.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Dolly / Taskrabbit Delivery tax documents?",
        a: "Dolly has been rebranded as Taskrabbit Delivery. Taskrabbit's 2026 transition guidance says Helpers and Hands continue through the Helper app under new platform terms. The public transition FAQ does not confirm the 2026 tax-form subtype or issuer arrangement.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label:
          "Dolly / Taskrabbit Delivery: official document guidance (review limitations explained above)",
        href: "https://support.taskrabbit.com/hc/en-us/articles/50010835150107-FAQ-Dolly-is-becoming-Taskrabbit-Delivery",
      },
    ],
  },
  {
    slug: "goshare-taxes",
    platform: "GoShare",
    workerNoun: "GoShare drivers",
    workType: "moving and delivery",
    eyebrow: "Gig Tax Guide",
    title: "GoShare Taxes: A Driver's Guide to 1099 Filing & Deductions",
    metaDescription:
      "GoShare tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "GoShare Taxes: What Every Driver Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through GoShare. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for GoShare",
    formsBody: [
      "GoShare's current delivery-professional FAQ identifies Form 1099-K, not 1099-NEC. It also mentions issuance above $600. Treat that as platform guidance requiring confirmation, not the general federal TPSO threshold; platforms can issue forms below the federal minimum.",
      "Confirm the current tax-year form with GoShare and reconcile project payments, tips, fees and any reimbursements. The payment-transfer service used for deposits does not by itself determine the form type.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Moving equipment",
        desc: "Hand trucks, dollies, moving blankets, straps, ramps, and tools bought to complete GoShare jobs (larger items may be depreciated).",
      },
      {
        label: "Truck & van costs",
        desc: "The driving you do in your truck or van for jobs is deductible at the IRS standard mileage rate, or via actual vehicle expenses if that's larger.",
      },
    ],
    faqs: [
      {
        q: "Where do I find GoShare tax documents?",
        a: "GoShare's current delivery-professional FAQ identifies Form 1099-K, not 1099-NEC. It also mentions issuance above $600. Treat that as platform guidance requiring confirmation, not the general federal TPSO threshold; platforms can issue forms below the federal minimum.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "GoShare: official document guidance",
        href: "https://goshare.co/drivers/faq/",
      },
    ],
  },
  {
    slug: "wag-taxes",
    platform: "Wag",
    workerNoun: "Wag walkers and sitters",
    workType: "pet care",
    eyebrow: "Gig Tax Guide",
    title: "Wag Taxes: A Dog Walker's Guide to 1099-K & Deductions",
    metaDescription:
      "Wag tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Wag Taxes: What Every Walker and Sitter Needs to Know",
    intro:
      "This guide covers U.S. independent-contractor work through Wag. Reconcile earnings and expenses for the correct tax year; employee wages and non-U.S. accounts follow different rules.",
    formsHeading: "Tax documents and income records for Wag",
    formsBody: [
      "Wag! provides a tax-document support article for eligible pet caregivers and directs them to verify the information in their Stripe account. The readable guidance reviewed concerns the 2025 cycle; a current 2026 form subtype and delivery schedule were not independently confirmed.",
      "Use Wag! support and the tax document actually issued to identify the reporting form. Reconcile completed services, tips, fees and adjustments; do not infer the form type solely from another pet-care platform.",
      "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
    ],
    extraDeductions: [
      {
        label: "Pet-care supplies",
        desc: "Leashes, treats, waste bags, toys, crates, and cleaning supplies bought for the animals in your care.",
      },
      {
        label: "Wag service fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Home use for boarding",
        desc: "If you board pets in your home, a portion of home expenses may be deductible — the rules are strict, so confirm with a tax professional.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Wag tax documents?",
        a: "Wag! provides a tax-document support article for eligible pet caregivers and directs them to verify the information in their Stripe account. The readable guidance reviewed concerns the 2025 cycle; a current 2026 form subtype and delivery schedule were not independently confirmed.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "A 1099 reporting threshold is not a tax-free allowance. Reconcile income using transaction records and tax forms, deduct only eligible documented business expenses, and avoid adding bank deposits to income already reported from the same work.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label:
          "Wag: official document guidance (review limitations explained above)",
        href: "https://support.wagwalking.com/en_us/when-and-how-will-i-receive-my-1099-tax-documentation-pcg-r1EIb8IN5",
      },
    ],
  },
  {
    slug: "etsy-taxes",
    platform: "Etsy",
    workerNoun: "Etsy sellers",
    workType: "handmade and craft sales",
    eyebrow: "Seller Tax Guide",
    title: "Etsy Taxes: A Seller's Guide to the 1099-K, COGS & Deductions",
    metaDescription:
      "Etsy tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Etsy Taxes: What Every Seller Needs to Know",
    intro:
      "This guide covers U.S. Etsy sellers. Separate business sales from personal-item sales before calculating taxable income. Keep cost, sales, fee and refund records for the year involved.",
    formsHeading: "Tax documents and income records for Etsy",
    formsBody: [
      "Etsy issues Form 1099-K for reportable Etsy Payments activity. The help page explains the 2025 cycle, state thresholds and tax-information matching across shops. Use your payment-account records to reconcile the gross form amount to fees, refunds and business receipts.",
      "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (materials)",
        desc: "Track business inventory and production costs. Use the applicable inventory/cost-of-goods-sold method; do not automatically deduct every unsold purchase immediately.",
      },
      {
        label: "Etsy fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Shipping & postage",
        desc: "Postage, shipping labels, and carrier fees you pay to get orders to buyers.",
      },
      {
        label: "Packaging & supplies",
        desc: "Boxes, mailers, tissue, tape, and other materials used to pack and ship orders.",
      },
      {
        label: "Home studio & storage",
        desc: "The part of your home used regularly and exclusively for making, storing, or shipping your products may qualify.",
      },
      {
        label: "Tools & equipment",
        desc: "Craft tools, a dedicated printer, and equipment bought for the business (larger items may be depreciated).",
      },
    ],
    faqs: [
      {
        q: "Where do I find Etsy tax documents?",
        a: "Etsy issues Form 1099-K for reportable Etsy Payments activity. The help page explains the 2025 cycle, state thresholds and tax-information matching across shops. Use your payment-account records to reconcile the gross form amount to fees, refunds and business receipts.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Etsy: official document guidance",
        href: "https://help.etsy.com/hc/en-us/articles/360000336447-What-Do-I-Need-to-Know-About-My-1099-K-Tax-Form?segment=selling",
      },
      {
        label: "IRS: reporting business and personal-item sales",
        href: "https://www.irs.gov/businesses/what-to-do-with-form-1099-k",
      },
    ],
  },
  {
    slug: "ebay-taxes",
    platform: "eBay",
    workerNoun: "eBay sellers",
    workType: "online reselling",
    eyebrow: "Seller Tax Guide",
    title: "eBay Taxes: A Reseller's Guide to the 1099-K & Deductions",
    metaDescription:
      "eBay tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "eBay Taxes: What Every Seller Needs to Know",
    intro:
      "This guide covers U.S. eBay sellers. Separate business sales from personal-item sales before calculating taxable income. Keep cost, sales, fee and refund records for the year involved.",
    formsHeading: "Tax documents and income records for eBay",
    formsBody: [
      "eBay provides Form 1099-K and a detailed report through Seller Hub or My eBay when applicable. Its current guidance says gross payments are before adjustments such as fees and refunds, but exclude sales tax and canceled transactions. Reconcile the detailed report rather than assuming gross sales equal bank deposits.",
      "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "Track business inventory and production costs. Use the applicable inventory/cost-of-goods-sold method; do not automatically deduct every unsold purchase immediately.",
      },
      {
        label: "eBay & payment fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Shipping & postage",
        desc: "Postage, labels, and carrier fees you pay to ship orders (the portion not reimbursed by the buyer).",
      },
      {
        label: "Packaging & supplies",
        desc: "Boxes, mailers, tape, and packing materials used to ship orders.",
      },
      {
        label: "Home office & storage",
        desc: "A qualifying space generally must be used regularly and exclusively for the business. Occasional work at a personal-use desk is not enough.",
      },
      {
        label: "Sourcing & drop-off mileage",
        desc: "Document eligible business travel. Exclude personal trips and ordinary commuting; app activity alone does not establish a deduction.",
      },
    ],
    faqs: [
      {
        q: "Where do I find eBay tax documents?",
        a: "eBay provides Form 1099-K and a detailed report through Seller Hub or My eBay when applicable. Its current guidance says gross payments are before adjustments such as fees and refunds, but exclude sales tax and canceled transactions. Reconcile the detailed report rather than assuming gross sales equal bank deposits.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "eBay: official document guidance",
        href: "https://www.ebay.com/help/selling/fees-credits-invoices/1099k-faqs?id=4794",
      },
      {
        label: "IRS: reporting business and personal-item sales",
        href: "https://www.irs.gov/businesses/what-to-do-with-form-1099-k",
      },
    ],
  },
  {
    slug: "poshmark-taxes",
    platform: "Poshmark",
    workerNoun: "Poshmark sellers",
    workType: "clothing resale",
    eyebrow: "Seller Tax Guide",
    title: "Poshmark Taxes: A Seller's Guide to the 1099-K & Deductions",
    metaDescription:
      "Poshmark tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Poshmark Taxes: What Every Seller Needs to Know",
    intro:
      "This guide covers U.S. Poshmark sellers. Separate business sales from personal-item sales before calculating taxable income. Keep cost, sales, fee and refund records for the year involved.",
    formsHeading: "Tax documents and income records for Poshmark",
    formsBody: [
      "Poshmark provides available Form 1099-K downloads under its tax-information settings. The current support page covers 2025 forms; follow account instructions for the applicable year and reconcile the form with sales and fee records.",
      "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "Track business inventory and production costs. Use the applicable inventory/cost-of-goods-sold method; do not automatically deduct every unsold purchase immediately.",
      },
      {
        label: "Poshmark commission",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Shipping (if you cover it)",
        desc: "Any postage or upgraded shipping you pay rather than pass to the buyer is deductible.",
      },
      {
        label: "Packaging & supplies",
        desc: "Mailers, boxes, tissue, tape, and packing materials used to ship orders.",
      },
      {
        label: "Home office & storage",
        desc: "A qualifying space generally must be used regularly and exclusively for the business. Occasional work at a personal-use desk is not enough.",
      },
      {
        label: "Sourcing mileage",
        desc: "Document eligible business travel. Exclude personal trips and ordinary commuting; app activity alone does not establish a deduction.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Poshmark tax documents?",
        a: "Poshmark provides available Form 1099-K downloads under its tax-information settings. The current support page covers 2025 forms; follow account instructions for the applicable year and reconcile the form with sales and fee records.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Poshmark: official document guidance",
        href: "https://support.poshmark.com/s/article/How-to-access-1099k?language=en_US",
      },
      {
        label: "IRS: reporting business and personal-item sales",
        href: "https://www.irs.gov/businesses/what-to-do-with-form-1099-k",
      },
    ],
  },
  {
    slug: "mercari-taxes",
    platform: "Mercari",
    workerNoun: "Mercari sellers",
    workType: "online reselling",
    eyebrow: "Seller Tax Guide",
    title: "Mercari Taxes: A Seller's Guide to the 1099-K & Deductions",
    metaDescription:
      "Mercari tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Mercari Taxes: What Every Seller Needs to Know",
    intro:
      "This guide covers U.S. Mercari sellers. Separate business sales from personal-item sales before calculating taxable income. Keep cost, sales, fee and refund records for the year involved.",
    formsHeading: "Tax documents and income records for Mercari",
    formsBody: [
      "Mercari's 1099-K guidance reflects the restored federal threshold and notes that state rules may produce reporting below it. Download the Gross Sales Report to reconcile item prices, shipping, fees, sales taxes and adjustments with your form.",
      "Use Mercari's report for the correct tax year: fee structures and what appears in reporting can change. Marketplace sales-tax collection does not establish your income-tax profit or cover every off-platform sale.",
      "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "Track business inventory and production costs. Use the applicable inventory/cost-of-goods-sold method; do not automatically deduct every unsold purchase immediately.",
      },
      {
        label: "Mercari selling & processing fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Shipping (if you cover it)",
        desc: "Any postage or shipping you pay rather than pass to the buyer is deductible.",
      },
      {
        label: "Packaging & supplies",
        desc: "Boxes, mailers, tape, and packing materials used to ship orders.",
      },
      {
        label: "Home office & storage",
        desc: "A qualifying space generally must be used regularly and exclusively for the business. Occasional work at a personal-use desk is not enough.",
      },
      {
        label: "Sourcing mileage",
        desc: "Document eligible business travel. Exclude personal trips and ordinary commuting; app activity alone does not establish a deduction.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Mercari tax documents?",
        a: "Mercari's 1099-K guidance reflects the restored federal threshold and notes that state rules may produce reporting below it. Download the Gross Sales Report to reconcile item prices, shipping, fees, sales taxes and adjustments with your form.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Mercari: official document guidance",
        href: "https://www.mercari.com/us/help_center/article/163/",
      },
      {
        label: "IRS: reporting business and personal-item sales",
        href: "https://www.irs.gov/businesses/what-to-do-with-form-1099-k",
      },
    ],
  },
  {
    slug: "depop-taxes",
    platform: "Depop",
    workerNoun: "Depop sellers",
    workType: "fashion resale",
    eyebrow: "Seller Tax Guide",
    title: "Depop Taxes: A Seller's Guide to the 1099-K & Deductions",
    metaDescription:
      "Depop tax guide: tax documents, income reconciliation, business deductions and 2026 federal rules. Reviewed November 7, 2026.",
    h1: "Depop Taxes: What Every Seller Needs to Know",
    intro:
      "This guide covers U.S. Depop sellers. Separate business sales from personal-item sales before calculating taxable income. Keep cost, sales, fee and refund records for the year involved.",
    formsHeading: "Tax documents and income records for Depop",
    formsBody: [
      "Depop's U.S. tax-document guide describes Form 1099-K delivery through Stripe Express. Confirm the document year and delivery preference in the official account workflow, then reconcile the form with completed sales, fees, shipping and refunds.",
      "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "Track business inventory and production costs. Use the applicable inventory/cost-of-goods-sold method; do not automatically deduct every unsold purchase immediately.",
      },
      {
        label: "Depop & payment fees",
        desc: "Reconcile fees actually charged to your business and included in the income being reported; do not deduct customer-only charges or subtract the same fee twice.",
      },
      {
        label: "Shipping (if you cover it)",
        desc: "Any postage or shipping you pay rather than pass to the buyer is deductible.",
      },
      {
        label: "Packaging & supplies",
        desc: "Mailers, boxes, tissue, tape, and packing materials used to ship orders.",
      },
      {
        label: "Home office & storage",
        desc: "A qualifying space generally must be used regularly and exclusively for the business. Occasional work at a personal-use desk is not enough.",
      },
      {
        label: "Sourcing mileage",
        desc: "Document eligible business travel. Exclude personal trips and ordinary commuting; app activity alone does not establish a deduction.",
      },
    ],
    faqs: [
      {
        q: "Where do I find Depop tax documents?",
        a: "Depop's U.S. tax-document guide describes Form 1099-K delivery through Stripe Express. Confirm the document year and delivery preference in the official account workflow, then reconcile the form with completed sales, fees, shipping and refunds.",
      },
      {
        q: "Is the amount on a 1099 my taxable profit?",
        a: "Selling a personal item for less than its cost generally creates no taxable gain, and the personal loss is not deductible. A personal item sold at a gain is generally a taxable capital gain. A selling business generally reports profit and eligible expenses on Schedule C and evaluates self-employment tax. Hobby activity has different expense rules; receiving a 1099-K does not determine which category applies.",
      },
      {
        q: "Which expenses can I claim?",
        a: "Only eligible ordinary and necessary business expenses supported by records. Separate personal use, refunds and reimbursements. Inventory or equipment may require cost-of-goods-sold or depreciation treatment rather than an immediate deduction.",
      },
      {
        q: "How much should I set aside?",
        a: "A reserve should reflect household income, withholding, credits and deductible business costs, plus applicable state and local taxes. A fixed 25–30% is a planning assumption that may be too high or too low, not a calculated tax bill.",
      },
      {
        q: "Do I still report income without a 1099?",
        a: "Yes, report taxable income even if no information return arrives. For third-party network payments, the general federal 1099-K threshold is more than $20,000 AND more than 200 transactions. The general 1099-NEC threshold is $2,000 for 2026 compensation, compared with $600 for 2025; state rules, withholding and other exceptions can result in a form below these amounts.",
      },
    ],
    resources: [
      {
        label: "Depop: official document guidance",
        href: "https://depophelp.zendesk.com/hc/en-gb/articles/10607447026193-Receiving-your-1099-K-from-Stripe",
      },
      {
        label: "IRS: reporting business and personal-item sales",
        href: "https://www.irs.gov/businesses/what-to-do-with-form-1099-k",
      },
    ],
  },
];

export function getPlatformTaxGuide(
  slug: string
): PlatformTaxGuide | undefined {
  return PLATFORM_TAX_GUIDES.find(g => g.slug === slug);
}
