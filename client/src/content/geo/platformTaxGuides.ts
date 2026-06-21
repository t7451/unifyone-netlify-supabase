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
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: PlatformFaq[];
}

/** Deductions every mileage-based gig worker can usually claim. */
export const SHARED_DEDUCTIONS: { label: string; desc: string }[] = [
  {
    label: "Business mileage",
    desc: "Every mile driven while online or on a delivery, at the IRS standard mileage rate. Usually the single largest deduction.",
  },
  {
    label: "Phone & data",
    desc: "The business-use percentage of your phone bill — you cannot work without it.",
  },
  {
    label: "Tolls & parking",
    desc: "Tolls and parking paid while working are fully deductible (commuting tolls are not).",
  },
  {
    label: "Hot bags & equipment",
    desc: "Insulated bags, phone mounts, chargers, and other gear bought for the work.",
  },
];

/** How much to set aside — evergreen rule of thumb, used across all guides. */
export const SET_ASIDE_ANSWER =
  "A common rule of thumb is to set aside 25–30% of your net earnings (what's left after mileage and other deductions) to cover self-employment tax (15.3%) plus federal and state income tax. Your exact rate depends on your total household income and state. Use the Tax Set-Aside calculator to get a number for your situation.";

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
      "DoorDash doesn't withhold taxes from your pay. As a Dasher you're an independent contractor, which means you're responsible for your own federal, state, and self-employment taxes. The good news: mileage and other deductions can dramatically cut what you owe — if you track them. Here's how DoorDash taxes actually work.",
    formsHeading: "Do you get a 1099 from DoorDash?",
    formsBody: [
      "If you earned $600 or more on DoorDash in a year, you'll receive a 1099-NEC (issued through Stripe) reporting your nonemployee compensation. DoorDash emails an invite to set up a Stripe Express account where you retrieve the form.",
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
        a: "No. DoorDash pays Dashers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for DoorDash taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from DoorDash?",
        a: "If you earned $600 or more, DoorDash issues a 1099-NEC through Stripe. Below that you may not receive a form, but you must still report the income to the IRS.",
      },
      {
        q: "What can Dashers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while dashing. You can also deduct the business-use share of your phone, hot bags and equipment, tolls, and parking. Track miles and expenses all year — you can't reconstruct them in April.",
      },
      {
        q: "When are DoorDash taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "Uber treats drivers as independent contractors and withholds no taxes. Whether you drive UberX, Uber Eats, or both, you're responsible for your own income and self-employment taxes — and you'll likely get more than one tax form. Here's how to read them and keep your bill as low as legally possible.",
    formsHeading: "1099-K vs 1099-NEC: which one does Uber send?",
    formsBody: [
      "Uber may issue two forms. A 1099-K reports the gross amount riders and Uber Eats customers paid for your trips and deliveries (processed through Uber as a third-party platform). A 1099-NEC reports other income like incentives, referrals, and bonuses.",
      "Form thresholds change from year to year, so you might not receive a 1099-K in a low-volume year. Either way, your Uber Tax Summary lists your full gross earnings, Uber's fees, and online miles — and you must report all of it regardless of which forms arrive.",
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
        a: "No. Uber drivers are independent contractors, so no tax is withheld. You set aside and pay your own income tax plus the 15.3% self-employment tax.",
      },
      {
        q: "What's the difference between the 1099-K and 1099-NEC from Uber?",
        a: "The 1099-K reports the gross fares riders and customers paid for your trips and deliveries. The 1099-NEC reports non-trip income such as incentives, referrals, and bonuses. Your Uber Tax Summary reconciles both with your actual take-home.",
      },
      {
        q: "How much should I set aside for Uber taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "What can Uber drivers deduct?",
        a: "Business mileage at the IRS standard mileage rate is usually the largest deduction — and Uber only reports your online miles, so your real deductible mileage (including miles between trips) is often higher. You can also deduct Uber's service fees, the business-use share of your phone, tolls, parking, and rider amenities.",
      },
      {
        q: "Do Uber drivers have to pay quarterly taxes?",
        a: "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15 — to avoid an underpayment penalty.",
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
      "Instacart taxes for full-service shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    h1: "Instacart Taxes: A Shopper's Guide",
    intro:
      "How you're taxed on Instacart depends on your role. Full-service shoppers — who shop and deliver — are independent contractors responsible for their own taxes, while in-store-only shoppers are part-time employees with taxes withheld. This guide is for full-service shoppers, who make up most of the platform.",
    formsHeading: "Do Instacart shoppers get a 1099?",
    formsBody: [
      "Full-service shoppers who earned $600 or more receive a 1099-NEC reporting their nonemployee compensation. Instacart delivers these (typically through Stripe) by the end of January.",
      "In-store shoppers are W-2 part-time employees — Instacart withholds their taxes and issues a W-2 instead. If you do both, you may receive both forms. As always, report all income even if a form doesn't arrive.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & coolers",
        desc: "Cooler bags and equipment you buy to keep groceries fresh are deductible.",
      },
    ],
    faqs: [
      {
        q: "Are Instacart shoppers independent contractors?",
        a: "Full-service shoppers are independent contractors and pay their own taxes. In-store-only shoppers are part-time W-2 employees with taxes withheld. This guide covers full-service shoppers.",
      },
      {
        q: "Do I get a 1099 from Instacart?",
        a: "Full-service shoppers who earned $600 or more get a 1099-NEC, usually delivered through Stripe by late January. Below that threshold you may not get a form but must still report the income.",
      },
      {
        q: "How much should I set aside for Instacart taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Can Instacart shoppers deduct mileage?",
        a: "Yes. Full-service shoppers can deduct business mileage at the IRS standard mileage rate for miles driven while working — typically the largest deduction. Track every working mile, since Instacart doesn't report your mileage for you.",
      },
      {
        q: "When do Instacart shoppers pay taxes?",
        a: "Independent-contractor shoppers generally make quarterly estimated payments — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Quarterly payments avoid an IRS underpayment penalty.",
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
      "How Amazon Flex taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Amazon Flex Taxes: What Every Driver Needs to Know",
    intro:
      "Amazon Flex pays you as an independent contractor, so no taxes are withheld from your delivery blocks. You're responsible for your own federal, state, and self-employment taxes — but the miles you drive during a block, including between stops, are deductible if you track them. Here's how Amazon Flex taxes work.",
    formsHeading: "Do you get a 1099 from Amazon Flex?",
    formsBody: [
      "If you earned $600 or more driving for Amazon Flex in a year, you'll receive a 1099-NEC reporting your nonemployee compensation, available through Amazon's tax-document portal.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Phone mount & delivery supplies",
        desc: "Phone mounts, chargers, and any supplies you buy to complete delivery blocks.",
      },
    ],
    faqs: [
      {
        q: "Does Amazon Flex take out taxes for me?",
        a: "No. Amazon Flex pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Amazon Flex taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Amazon Flex?",
        a: "If you earned $600 or more, Amazon issues a 1099-NEC through its tax-document portal. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can Amazon Flex drivers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven during your delivery blocks, including between stops. You can also deduct the business-use share of your phone, tolls, parking, and supplies.",
      },
      {
        q: "When are Amazon Flex taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Grubhub taxes work for drivers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Grubhub Taxes: What Every Driver Needs to Know",
    intro:
      "Grubhub pays you as an independent contractor, so nothing is withheld from your delivery pay. You owe your own federal, state, and self-employment taxes — and tracking your mileage is the single biggest way to lower what you owe. Here's how Grubhub taxes work.",
    formsHeading: "Do you get a 1099 from Grubhub?",
    formsBody: [
      "If you earned $600 or more on Grubhub in a year, you'll receive a 1099-NEC (issued through Grubhub's payment processor) reporting your nonemployee compensation.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & supplies",
        desc: "Insulated delivery bags, phone mounts, and supplies bought to complete deliveries.",
      },
    ],
    faqs: [
      {
        q: "Does Grubhub take out taxes for me?",
        a: "No. Grubhub pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Grubhub taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Grubhub?",
        a: "If you earned $600 or more, Grubhub issues a 1099-NEC through its payment processor. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can Grubhub drivers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. You can also deduct the business-use share of your phone, insulated bags, tolls, and parking.",
      },
      {
        q: "When are Grubhub taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "Lyft driver taxes explained: the 1099-K vs 1099-NEC, your Annual Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    h1: "Lyft Driver Taxes: The Complete Breakdown",
    intro:
      "Lyft treats drivers as independent contractors and withholds no taxes, so you're responsible for your own income and self-employment taxes — and you'll likely receive more than one tax form. Here's how to read them and keep your bill as low as legally possible.",
    formsHeading: "1099-K vs 1099-NEC: which one does Lyft send?",
    formsBody: [
      "Lyft may issue two forms. A 1099-K reports the gross amount riders paid for your rides (processed through Lyft as a third-party platform). A 1099-NEC reports other income like bonuses, referrals, and incentives.",
      "Form thresholds change from year to year, so you might not receive a 1099-K in a low-volume year. Either way, your Lyft Annual Summary lists your gross earnings, Lyft's fees, and online miles — and you must report all of it regardless of which forms arrive.",
    ],
    extraDeductions: [
      {
        label: "Lyft service fees & commissions",
        desc: "Fees Lyft deducts from each fare are a business expense — your Annual Summary breaks them out.",
      },
      {
        label: "Water, mints & rider amenities",
        desc: "Reasonable amenities you provide for passengers are deductible.",
      },
    ],
    faqs: [
      {
        q: "Does Lyft withhold taxes from my pay?",
        a: "No. Lyft drivers are independent contractors, so no tax is withheld. You set aside and pay your own income tax plus the 15.3% self-employment tax.",
      },
      {
        q: "What's the difference between the 1099-K and 1099-NEC from Lyft?",
        a: "The 1099-K reports the gross fares riders paid for your rides. The 1099-NEC reports non-ride income such as bonuses, referrals, and incentives. Your Lyft Annual Summary reconciles both with your actual take-home.",
      },
      {
        q: "How much should I set aside for Lyft taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "What can Lyft drivers deduct?",
        a: "Business mileage at the IRS standard mileage rate is usually the largest deduction — and because Lyft reports only your online miles, your real deductible mileage (including miles between rides) is often higher. You can also deduct Lyft's service fees, the business-use share of your phone, tolls, parking, and rider amenities.",
      },
      {
        q: "Do Lyft drivers have to pay quarterly taxes?",
        a: "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15 — to avoid an underpayment penalty.",
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
      "How Walmart Spark driver taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Spark Driver Taxes: What Every Driver Needs to Know",
    intro:
      "The Walmart Spark Driver program pays you as an independent contractor, so no taxes are withheld from your deliveries. You owe your own federal, state, and self-employment taxes — and your mileage is usually your largest deduction. Here's how Spark Driver taxes work.",
    formsHeading: "Do you get a 1099 from Spark Driver?",
    formsBody: [
      "If you earned $600 or more delivering through the Spark Driver app in a year, you'll receive a 1099-NEC reporting your nonemployee compensation, delivered through the app's payment partner.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, hand trucks, phone mounts, and supplies bought to complete Walmart deliveries.",
      },
    ],
    faqs: [
      {
        q: "Does Spark Driver take out taxes for me?",
        a: "No. The Spark Driver program pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Spark Driver taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Spark Driver?",
        a: "If you earned $600 or more, the Spark Driver program issues a 1099-NEC through its payment partner. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can Spark drivers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. You can also deduct the business-use share of your phone, insulated bags, tolls, and parking.",
      },
      {
        q: "When are Spark Driver taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "Shipt taxes for shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    h1: "Shipt Taxes: A Shopper's Guide",
    intro:
      "Shipt shoppers are independent contractors, so Shipt withholds no taxes from your pay. You owe your own federal, state, and self-employment taxes — and because you both shop and drive, tracking your working miles matters. Here's how Shipt taxes work.",
    formsHeading: "Do Shipt shoppers get a 1099?",
    formsBody: [
      "Shipt shoppers who earned $600 or more in a year receive a 1099-NEC reporting their nonemployee compensation, typically delivered through Shipt's payment processor by the end of January.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & coolers",
        desc: "Cooler bags and equipment you buy to keep groceries fresh are deductible.",
      },
    ],
    faqs: [
      {
        q: "Does Shipt take out taxes for me?",
        a: "No. Shipt pays shoppers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Shipt taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Shipt?",
        a: "Shipt shoppers who earned $600 or more get a 1099-NEC, usually delivered through Shipt's payment processor by late January. Below that threshold you may not get a form but must still report the income.",
      },
      {
        q: "Can Shipt shoppers deduct mileage?",
        a: "Yes. Shipt shoppers can deduct business mileage at the IRS standard mileage rate for miles driven while working — typically the largest deduction. Track every working mile, since Shipt doesn't report your mileage for you.",
      },
      {
        q: "When do Shipt shoppers pay taxes?",
        a: "Independent-contractor shoppers generally make quarterly estimated payments — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Quarterly payments avoid an IRS underpayment penalty.",
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
      "How Roadie taxes work: the 1099, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Roadie Taxes: What Every Driver Needs to Know",
    intro:
      "Roadie (a UPS company) pays its drivers as independent contractors, so no taxes are withheld from your deliveries. You owe your own federal, state, and self-employment taxes — and because you drive your own vehicle, mileage is usually your single largest deduction. Here's how Roadie taxes work.",
    formsHeading: "Do you get a 1099 from Roadie?",
    formsBody: [
      "If you earned enough to meet the reporting threshold, Roadie issues a 1099 (typically a 1099-NEC) through its payment processor reporting your earnings. Roadie emails instructions for retrieving your tax documents.",
      "If you earned below the threshold you may not get a form — but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Hauling & delivery supplies",
        desc: "Hand trucks, straps, moving blankets, phone mounts, and supplies bought to complete Roadie gigs.",
      },
    ],
    faqs: [
      {
        q: "Does Roadie take out taxes for me?",
        a: "No. Roadie pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Roadie taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Roadie?",
        a: "If you meet the reporting threshold, Roadie issues a 1099 (typically a 1099-NEC) through its payment processor. Below that you may not receive a form, but you must still report the income to the IRS.",
      },
      {
        q: "What can Roadie drivers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven to pick up and deliver gigs. You can also deduct the business-use share of your phone, hauling supplies, tolls, and parking.",
      },
      {
        q: "When are Roadie taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Gopuff driver taxes work: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Gopuff Taxes: What Every Driver Needs to Know",
    intro:
      "Gopuff pays its delivery drivers as independent contractors, so no taxes are withheld from your pay. You owe your own federal, state, and self-employment taxes — and the miles you drive from the micro-fulfillment center to customers are deductible if you track them. Here's how Gopuff taxes work.",
    formsHeading: "Do you get a 1099 from Gopuff?",
    formsBody: [
      "If you earned $600 or more delivering for Gopuff in a year, you'll receive a 1099-NEC reporting your nonemployee compensation, delivered through Gopuff's payment partner.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, coolers, phone mounts, and supplies bought to complete Gopuff deliveries.",
      },
    ],
    faqs: [
      {
        q: "Does Gopuff take out taxes for me?",
        a: "No. Gopuff pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Gopuff taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Gopuff?",
        a: "If you earned $600 or more, Gopuff issues a 1099-NEC through its payment partner. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can Gopuff drivers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. You can also deduct the business-use share of your phone, insulated bags, tolls, and parking.",
      },
      {
        q: "When are Gopuff taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How TaskRabbit taxes work for Taskers: the 1099-K, self-employment tax, tool and mileage deductions, and quarterly payments. Not tax advice.",
    h1: "TaskRabbit Taxes: What Every Tasker Needs to Know",
    intro:
      "TaskRabbit treats Taskers as independent contractors, so no taxes are withheld from your earnings. You owe your own federal, state, and self-employment taxes on your net income — and the tools, supplies, and miles you use on the job are deductible. Here's how TaskRabbit taxes work.",
    formsHeading: "Do Taskers get a 1099 from TaskRabbit?",
    formsBody: [
      "TaskRabbit processes client payments as a third-party platform, so it generally reports earnings on a Form 1099-K (rather than a 1099-NEC) when you meet the IRS reporting threshold for that year. The 1099-K shows your gross earnings before TaskRabbit's service fees.",
      "Reporting thresholds for the 1099-K have changed in recent years, so you may not always receive a form. Either way, you must report all of your TaskRabbit income — and you deduct the platform's service fees as a business expense.",
    ],
    extraDeductions: [
      {
        label: "Tools & equipment",
        desc: "Drills, ladders, hand tools, and other equipment you buy to complete tasks are deductible (larger items may be depreciated).",
      },
      {
        label: "Job supplies & materials",
        desc: "Cleaning supplies, hardware, and consumables used on jobs — track materials you don't bill back to the client.",
      },
      {
        label: "TaskRabbit service fees",
        desc: "The fees TaskRabbit deducts from your pay are a deductible business expense.",
      },
    ],
    faqs: [
      {
        q: "Does TaskRabbit take out taxes for me?",
        a: "No. TaskRabbit pays Taskers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for TaskRabbit taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from TaskRabbit?",
        a: "TaskRabbit typically issues a 1099-K (it processes client payments as a third-party platform) when you meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — but you must report all income regardless.",
      },
      {
        q: "What can Taskers deduct?",
        a: "Tools, equipment, and job supplies are major deductions, along with TaskRabbit's service fees and the business-use share of your phone. If you drive to jobs or haul materials, business mileage at the IRS standard mileage rate is deductible too.",
      },
      {
        q: "When are TaskRabbit taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Rover taxes work for sitters and walkers: the 1099-K, self-employment tax, pet-care and mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Rover Taxes: What Every Sitter and Walker Needs to Know",
    intro:
      "Rover treats sitters and walkers as independent contractors, so no taxes are withheld from your earnings. You owe your own federal, state, and self-employment taxes on your net income — and pet supplies, mileage to clients, and even part of your home (if you board) can be deductible. Here's how Rover taxes work.",
    formsHeading: "Do Rover sitters get a 1099?",
    formsBody: [
      "Rover processes payments as a third-party platform, so it generally reports earnings on a Form 1099-K when you meet the IRS reporting threshold for that year. The 1099-K reflects gross earnings before Rover's service fee.",
      "Reporting thresholds for the 1099-K have changed in recent years, so you may not always receive a form. Either way, you must report all of your Rover income — and you deduct Rover's service fee as a business expense.",
    ],
    extraDeductions: [
      {
        label: "Pet-care supplies",
        desc: "Leashes, treats, waste bags, toys, crates, and cleaning supplies bought for the animals in your care.",
      },
      {
        label: "Rover service fees",
        desc: "The percentage Rover takes from each booking is a deductible business expense.",
      },
      {
        label: "Home use for boarding",
        desc: "If you board pets in your home, a portion of home expenses may be deductible — the rules are strict, so confirm with a tax professional.",
      },
    ],
    faqs: [
      {
        q: "Does Rover take out taxes for me?",
        a: "No. Rover pays sitters and walkers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Rover taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Rover?",
        a: "Rover typically issues a 1099-K (it processes payments as a third-party platform) when you meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — but you must report all income regardless.",
      },
      {
        q: "What can Rover sitters and walkers deduct?",
        a: "Pet-care supplies, Rover's service fees, and the business-use share of your phone are common deductions. Mileage driven to walks and client homes is deductible at the IRS standard mileage rate, and if you board pets in your home, part of your home expenses may qualify (the rules are strict — get advice).",
      },
      {
        q: "When are Rover taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Upwork taxes work for freelancers: the 1099-K, self-employment tax, home-office and software deductions, and quarterly payments. Not tax advice.",
    h1: "Upwork Taxes: What Every Freelancer Needs to Know",
    intro:
      "Upwork treats freelancers as independent contractors, so no taxes are withheld from your earnings. You owe your own federal, state, and self-employment taxes on your net income — and because most Upwork work is done from a desk, your biggest deductions are the home office, software, and equipment you use, plus Upwork's own fees. Here's how Upwork taxes work.",
    formsHeading: "Do you get a 1099 from Upwork?",
    formsBody: [
      "Upwork processes client payments as a third-party platform, so it issues US freelancers a Form 1099-K when they meet the IRS reporting threshold for the year. The 1099-K reports your gross earnings before Upwork's service fees are taken out.",
      "Reporting thresholds for the 1099-K have changed in recent years, so you may not always receive a form. Either way, you must report all of your Upwork income — and you deduct Upwork's service fees as a business expense.",
    ],
    vehicleBased: false,
    deductionsOverride: [
      {
        label: "Home office",
        desc: "The portion of rent/mortgage, utilities, and insurance for the part of your home used regularly and exclusively for work — often a freelancer's biggest deduction.",
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
        desc: "The freelancer service fee Upwork deducts from your earnings is a fully deductible business expense.",
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
        q: "Does Upwork take out taxes for me?",
        a: "No. Upwork pays freelancers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Upwork taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Upwork?",
        a: "Upwork issues US freelancers a 1099-K (it processes client payments as a third-party platform) when they meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — but you must report all income regardless.",
      },
      {
        q: "What can Upwork freelancers deduct?",
        a: "Because the work is desk-based, the biggest deductions are usually the home office, your computer and software, internet and phone, and Upwork's service fees. Professional development and equipment count too. Mileage generally doesn't apply unless you travel for client work.",
      },
      {
        q: "When are Upwork taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Fiverr taxes work for sellers: the 1099-K, self-employment tax, home-office and software deductions, and quarterly payments. Not tax advice.",
    h1: "Fiverr Taxes: What Every Seller Needs to Know",
    intro:
      "Fiverr treats sellers as independent contractors, so no taxes are withheld from your earnings. You owe your own federal, state, and self-employment taxes on your net income — and since you deliver gigs from a desk, your biggest deductions are your home office, software, and equipment, plus the commission Fiverr keeps. Here's how Fiverr taxes work.",
    formsHeading: "Do you get a 1099 from Fiverr?",
    formsBody: [
      "Fiverr processes buyer payments as a third-party platform, so it issues US sellers a Form 1099-K when they meet the IRS reporting threshold for the year. The 1099-K reports your gross earnings before Fiverr's commission is deducted.",
      "Reporting thresholds for the 1099-K have changed in recent years, so you may not always receive a form. Either way, you must report all of your Fiverr income — and you deduct Fiverr's commission as a business expense.",
    ],
    vehicleBased: false,
    deductionsOverride: [
      {
        label: "Home office",
        desc: "The portion of rent/mortgage, utilities, and insurance for the part of your home used regularly and exclusively for your gigs — often a seller's biggest deduction.",
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
        desc: "The commission Fiverr keeps from each order is a fully deductible business expense.",
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
        q: "Does Fiverr take out taxes for me?",
        a: "No. Fiverr pays sellers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Fiverr taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Fiverr?",
        a: "Fiverr issues US sellers a 1099-K (it processes buyer payments as a third-party platform) when they meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — but you must report all income regardless.",
      },
      {
        q: "What can Fiverr sellers deduct?",
        a: "Because gigs are delivered from a desk, the biggest deductions are usually the home office, software and tools, internet and phone, and Fiverr's commission. Professional development and equipment count too. Mileage generally doesn't apply unless you travel for the work.",
      },
      {
        q: "When are Fiverr taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Favor taxes work for Runners: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Favor Taxes: What Every Runner Needs to Know",
    intro:
      "Favor pays its Runners as independent contractors, so no taxes are withheld from your deliveries. You owe your own federal, state, and self-employment taxes — and because you drive your own vehicle across Texas, mileage is usually your single largest deduction. Here's how Favor taxes work.",
    formsHeading: "Do you get a 1099 from Favor?",
    formsBody: [
      "If you earned $600 or more running for Favor in a year, you'll receive a 1099-NEC reporting your nonemployee compensation, delivered through Favor's payment processor.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, phone mounts, chargers, and supplies bought to complete Favor deliveries.",
      },
    ],
    faqs: [
      {
        q: "Does Favor take out taxes for me?",
        a: "No. Favor pays Runners as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Favor taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Favor?",
        a: "If you earned $600 or more, Favor issues a 1099-NEC through its payment processor. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can Favor Runners deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering. You can also deduct the business-use share of your phone, insulated bags, tolls, and parking.",
      },
      {
        q: "When are Favor taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Veho taxes work for drivers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Veho Taxes: What Every Driver Needs to Know",
    intro:
      "Veho pays its drivers as independent contractors, so no taxes are withheld from your routes. You owe your own federal, state, and self-employment taxes — and the miles you drive while delivering packages are deductible if you track them. Here's how Veho taxes work.",
    formsHeading: "Do you get a 1099 from Veho?",
    formsBody: [
      "If you earned $600 or more driving for Veho in a year, you'll receive a 1099-NEC reporting your nonemployee compensation, delivered through Veho's payment processor.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
    ],
    extraDeductions: [
      {
        label: "Insulated bags & delivery supplies",
        desc: "Insulated bags, hand trucks, phone mounts, and supplies bought to complete Veho routes.",
      },
    ],
    faqs: [
      {
        q: "Does Veho take out taxes for me?",
        a: "No. Veho pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Veho taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Veho?",
        a: "If you earned $600 or more, Veho issues a 1099-NEC through its payment processor. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can Veho drivers deduct?",
        a: "The biggest deduction is business mileage at the IRS standard mileage rate for every mile driven while delivering packages, including between stops. You can also deduct the business-use share of your phone, tolls, parking, and supplies.",
      },
      {
        q: "When are Veho taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
      },
    ],
  },
  {
    slug: "dolly-taxes",
    platform: "Dolly",
    workerNoun: "Helpers",
    workType: "moving and hauling",
    eyebrow: "Gig Tax Guide",
    title: "Dolly Taxes: A Helper's Guide to 1099 Filing & Deductions",
    metaDescription:
      "How Dolly taxes work for Helpers: the 1099, self-employment tax, what to set aside, equipment and mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Dolly Taxes: What Every Helper Needs to Know",
    intro:
      "Dolly pays its Helpers as independent contractors, so no taxes are withheld from your jobs. You owe your own federal, state, and self-employment taxes — and because you use your own vehicle and moving gear, your mileage and equipment are usually your biggest deductions. Here's how Dolly taxes work.",
    formsHeading: "Do you get a 1099 from Dolly?",
    formsBody: [
      "If you earned enough to meet the reporting threshold, Dolly issues a 1099 through its payment processor reporting your earnings. Dolly emails instructions for retrieving your tax documents.",
      "If you earned below the threshold you may not get a form — but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
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
        q: "Does Dolly take out taxes for me?",
        a: "No. Dolly pays Helpers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Dolly taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Dolly?",
        a: "If you meet the reporting threshold, Dolly issues a 1099 through its payment processor. Below that you may not receive a form, but you must still report the income to the IRS.",
      },
      {
        q: "What can Dolly Helpers deduct?",
        a: "Moving equipment — hand trucks, dollies, blankets, and straps — and the business-use share of your phone are common deductions. Because you drive your own vehicle to jobs, business mileage at the IRS standard mileage rate (or actual vehicle expenses) is usually the largest deduction, along with tolls and parking.",
      },
      {
        q: "When are Dolly taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How GoShare taxes work for drivers: the 1099-NEC, self-employment tax, equipment and mileage deductions, and quarterly payments. Not tax advice.",
    h1: "GoShare Taxes: What Every Driver Needs to Know",
    intro:
      "GoShare pays its drivers as independent contractors, so no taxes are withheld from your jobs. You owe your own federal, state, and self-employment taxes — and because you supply your own truck or van and moving gear, your mileage and equipment are usually your biggest deductions. Here's how GoShare taxes work.",
    formsHeading: "Do you get a 1099 from GoShare?",
    formsBody: [
      "If you earned $600 or more driving for GoShare in a year, you'll receive a 1099-NEC reporting your nonemployee compensation, delivered through GoShare's payment processor.",
      "If you earned less you may not get a form, but you still have to report the income. The IRS expects you to report all earnings whether or not a 1099 was issued.",
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
        q: "Does GoShare take out taxes for me?",
        a: "No. GoShare pays drivers as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for GoShare taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from GoShare?",
        a: "If you earned $600 or more, GoShare issues a 1099-NEC through its payment processor. Below that you may not receive a form, but you must still report the income.",
      },
      {
        q: "What can GoShare drivers deduct?",
        a: "Business mileage at the IRS standard mileage rate (or actual truck/van expenses) for every mile driven to and during jobs is usually the largest deduction. You can also deduct moving equipment like hand trucks and blankets, the business-use share of your phone, tolls, and parking.",
      },
      {
        q: "When are GoShare taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Wag taxes work for walkers and sitters: the 1099-K, self-employment tax, pet-care and mileage deductions, and quarterly payments. Not tax advice.",
    h1: "Wag Taxes: What Every Walker and Sitter Needs to Know",
    intro:
      "Wag treats walkers and sitters as independent contractors, so no taxes are withheld from your earnings. You owe your own federal, state, and self-employment taxes on your net income — and pet supplies, mileage to clients, and even part of your home (if you board) can be deductible. Here's how Wag taxes work.",
    formsHeading: "Do Wag walkers and sitters get a 1099?",
    formsBody: [
      "Wag processes payments as a third-party platform, so it generally reports earnings on a Form 1099-K when you meet the IRS reporting threshold for that year. The 1099-K reflects gross earnings before Wag's service fee.",
      "Reporting thresholds for the 1099-K have changed in recent years, so you may not always receive a form. Either way, you must report all of your Wag income — and you deduct Wag's service fee as a business expense.",
    ],
    extraDeductions: [
      {
        label: "Pet-care supplies",
        desc: "Leashes, treats, waste bags, toys, crates, and cleaning supplies bought for the animals in your care.",
      },
      {
        label: "Wag service fees",
        desc: "The percentage Wag takes from each booking is a deductible business expense.",
      },
      {
        label: "Home use for boarding",
        desc: "If you board pets in your home, a portion of home expenses may be deductible — the rules are strict, so confirm with a tax professional.",
      },
    ],
    faqs: [
      {
        q: "Does Wag take out taxes for me?",
        a: "No. Wag pays walkers and sitters as independent contractors and withholds nothing. You're responsible for setting aside and paying your own income tax and the 15.3% self-employment tax.",
      },
      {
        q: "How much should I set aside for Wag taxes?",
        a: SET_ASIDE_ANSWER,
      },
      {
        q: "Do I get a 1099 from Wag?",
        a: "Wag typically issues a 1099-K (it processes payments as a third-party platform) when you meet the IRS threshold for the year. Thresholds have changed recently, so you may not always get one — but you must report all income regardless.",
      },
      {
        q: "What can Wag walkers and sitters deduct?",
        a: "Pet-care supplies, Wag's service fees, and the business-use share of your phone are common deductions. Mileage driven to walks and client homes is deductible at the IRS standard mileage rate, and if you board pets in your home, part of your home expenses may qualify (the rules are strict — get advice).",
      },
      {
        q: "When are Wag taxes due?",
        a: "Self-employed earners generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — and file an annual return by April 15. Paying quarterly avoids an IRS underpayment penalty.",
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
      "How Etsy seller taxes work: the 1099-K, hobby vs business, deducting materials and fees as a self-employed maker, and quarterly taxes. Not tax advice.",
    h1: "Etsy Taxes: What Every Seller Needs to Know",
    intro:
      "Selling on Etsy can be a hobby, a side hustle, or a full business — and which one you are decides how you're taxed. Etsy doesn't withhold taxes, and the 1099-K it may send reports gross sales, not profit. Here's how Etsy taxes work once you're selling as a business.",
    formsHeading: "Do you get a 1099-K — and is your Etsy income taxable?",
    formsBody: [
      "Etsy processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed in recent years, so you might get a 1099-K for fairly modest sales — or not get one and still owe tax. A 1099-K reports gross sales before fees and refunds, so it's a starting point, not your taxable profit.",
      "Whether you owe tax depends on what you're doing. Casually selling your own used items for less than you paid is generally not taxable (and that loss isn't deductible). But making goods to sell — as most Etsy sellers do — is a business: you report it on Schedule C, deduct your cost of materials and expenses, and owe income tax plus the 15.3% self-employment tax on the net profit. Confirm your situation with the IRS.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (materials)",
        desc: "The materials and supplies that go into the items you make are deducted against your sales as COGS — keep records of what each piece costs you.",
      },
      {
        label: "Etsy fees",
        desc: "Etsy's listing, transaction, payment-processing, and optional Offsite Ads fees are deductible business expenses.",
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
        q: "Does Etsy take out taxes for me?",
        a: "No. Etsy doesn't withhold taxes. If you sell as a business, you're responsible for income tax plus the 15.3% self-employment tax on your net profit (sales minus your cost of materials and expenses).",
      },
      {
        q: "Do I get a 1099-K from Etsy?",
        a: "Etsy issues a 1099-K when your sales reach the IRS reporting threshold for the year (the threshold has changed recently, so you may get one for modest sales). It reports gross sales before fees — report all of your business income whether or not a form arrives.",
      },
      {
        q: "Is selling on Etsy taxable income?",
        a: "If you're running a business — making items to sell for profit — yes, the net profit is taxable and reported on Schedule C. Casually selling your own used possessions for less than you paid generally isn't taxable, and that loss isn't deductible. Confirm your situation with the IRS.",
      },
      {
        q: "What can Etsy sellers deduct?",
        a: "Your cost of materials (COGS), Etsy's fees, shipping and postage, packaging, a qualifying home studio, and tools and equipment. Good records of what each item costs you to make are what make these deductions stick.",
      },
      {
        q: "How much should Etsy sellers set aside for taxes?",
        a: "A common rule of thumb is 25–30% of your net profit (sales minus cost of goods and expenses) for income tax plus the 15.3% self-employment tax — your exact rate depends on your total income and state. Use the Tax Set-Aside calculator for a tailored number.",
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
      "How eBay taxes work for resellers: the 1099-K, hobby vs business, cost of goods, deductible fees and shipping, and quarterly taxes. Not tax advice.",
    h1: "eBay Taxes: What Every Seller Needs to Know",
    intro:
      "How you're taxed on eBay depends on whether you're cleaning out your closet or running a resale business. eBay doesn't withhold taxes, and the 1099-K it may send reports gross sales, not profit. Here's how eBay taxes work once you're selling as a business.",
    formsHeading: "Do you get a 1099-K — and is your eBay income taxable?",
    formsBody: [
      "eBay processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed in recent years, so you might receive a 1099-K for modest sales — or not get one and still owe tax. The 1099-K shows gross sales before fees, shipping, and refunds, so it isn't your taxable profit.",
      "Whether you owe tax depends on what you're doing. Selling your own used personal items for less than you paid is generally not taxable (and the loss isn't deductible). But buying items to resell for profit is a business: you report it on Schedule C, deduct your cost of goods and expenses, and owe income tax plus the 15.3% self-employment tax on the net profit. Confirm your situation with the IRS.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "What you paid for the items you resold is subtracted from your sales as COGS — keep receipts and records of each item's cost.",
      },
      {
        label: "eBay & payment fees",
        desc: "eBay's final-value fees, listing fees, and payment-processing fees are deductible business expenses.",
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
        desc: "The part of your home used regularly and exclusively to store inventory or run the business may qualify.",
      },
      {
        label: "Sourcing & drop-off mileage",
        desc: "Miles driven to source inventory or drop off shipments are deductible at the IRS standard mileage rate.",
      },
    ],
    faqs: [
      {
        q: "Does eBay take out taxes for me?",
        a: "No. eBay doesn't withhold taxes. If you sell as a business, you owe income tax plus the 15.3% self-employment tax on your net profit (sales minus cost of goods and expenses).",
      },
      {
        q: "Do I get a 1099-K from eBay?",
        a: "eBay issues a 1099-K when your sales reach the IRS reporting threshold for the year (the threshold has changed recently). It reports gross sales before fees and shipping — report all of your business income whether or not a form arrives.",
      },
      {
        q: "Is selling on eBay taxable income?",
        a: "Reselling for profit is a taxable business reported on Schedule C. Selling your own used belongings for less than you paid generally isn't taxable, and that loss isn't deductible. A 1099-K alone doesn't make income taxable — but you must report and reconcile it. Confirm with the IRS.",
      },
      {
        q: "What can eBay sellers deduct?",
        a: "Your cost of goods sold (what you paid for the items), eBay and payment fees, shipping and packaging, a qualifying home office or storage space, and sourcing mileage. Records of each item's cost are essential.",
      },
      {
        q: "How much should eBay sellers set aside for taxes?",
        a: "A common rule of thumb is 25–30% of your net profit (sales minus cost of goods and expenses) for income tax plus the 15.3% self-employment tax — your exact rate depends on your total income and state. Use the Tax Set-Aside calculator for a tailored number.",
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
      "How Poshmark taxes work: the 1099-K, hobby vs business, cost of goods, deductible commission and shipping, and quarterly taxes. Not tax advice.",
    h1: "Poshmark Taxes: What Every Seller Needs to Know",
    intro:
      "Whether Poshmark is taxable comes down to whether you're reselling your own closet or running a resale business. Poshmark doesn't withhold taxes, and the 1099-K it may send reports gross sales, not profit. Here's how Poshmark taxes work once you're selling as a business.",
    formsHeading: "Do you get a 1099-K — and is your Poshmark income taxable?",
    formsBody: [
      "Poshmark processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed in recent years, so you might get a 1099-K for modest sales — or not get one and still owe tax. It reports gross sales before Poshmark's commission and shipping, so it isn't your taxable profit.",
      "Whether you owe tax depends on what you're doing. Reselling your own used clothing for less than you paid is generally not taxable (and the loss isn't deductible). But buying to resell for profit is a business: you report it on Schedule C, deduct your cost of goods and expenses, and owe income tax plus the 15.3% self-employment tax on the net profit. Confirm your situation with the IRS.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "What you paid for the clothing you resold is subtracted from your sales as COGS — keep records of each item's cost.",
      },
      {
        label: "Poshmark commission",
        desc: "The commission Poshmark takes from each sale is a deductible business expense.",
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
        desc: "The part of your home used regularly and exclusively to store inventory or run the business may qualify.",
      },
      {
        label: "Sourcing mileage",
        desc: "Miles driven to source inventory (thrift runs, estate sales) are deductible at the IRS standard mileage rate.",
      },
    ],
    faqs: [
      {
        q: "Does Poshmark take out taxes for me?",
        a: "No. Poshmark doesn't withhold income tax. If you sell as a business, you owe income tax plus the 15.3% self-employment tax on your net profit (sales minus cost of goods and expenses).",
      },
      {
        q: "Do I get a 1099-K from Poshmark?",
        a: "Poshmark issues a 1099-K when your sales reach the IRS reporting threshold for the year (the threshold has changed recently). It reports gross sales before commission and shipping — report all of your business income whether or not a form arrives.",
      },
      {
        q: "Is selling on Poshmark taxable income?",
        a: "Reselling for profit is a taxable business on Schedule C. Selling your own used clothing for less than you paid generally isn't taxable, and that loss isn't deductible. A 1099-K alone doesn't make income taxable — but you must report and reconcile it. Confirm with the IRS.",
      },
      {
        q: "What can Poshmark sellers deduct?",
        a: "Your cost of goods (what you paid for items), Poshmark's commission, any shipping you cover, packaging, a qualifying home office or storage, and sourcing mileage. Records of each item's cost are essential.",
      },
      {
        q: "How much should Poshmark sellers set aside for taxes?",
        a: "A common rule of thumb is 25–30% of your net profit (sales minus cost of goods and expenses) for income tax plus the 15.3% self-employment tax — your exact rate depends on your total income and state. Use the Tax Set-Aside calculator for a tailored number.",
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
      "How Mercari taxes work for sellers: the 1099-K, hobby vs business, cost of goods, deductible fees, and quarterly taxes. Not tax advice.",
    h1: "Mercari Taxes: What Every Seller Needs to Know",
    intro:
      "Whether Mercari is taxable depends on whether you're selling off your own things or running a resale business. Mercari doesn't withhold taxes, and the 1099-K it may send reports gross sales, not profit. Here's how Mercari taxes work once you're selling as a business.",
    formsHeading: "Do you get a 1099-K — and is your Mercari income taxable?",
    formsBody: [
      "Mercari processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed in recent years, so you might receive a 1099-K for modest sales — or not get one and still owe tax. It reports gross sales before fees and shipping, so it isn't your taxable profit.",
      "Whether you owe tax depends on what you're doing. Selling your own used items for less than you paid is generally not taxable (and the loss isn't deductible). But buying to resell for profit is a business: you report it on Schedule C, deduct your cost of goods and expenses, and owe income tax plus the 15.3% self-employment tax on the net profit. Confirm your situation with the IRS.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "What you paid for the items you resold is subtracted from your sales as COGS — keep records of each item's cost.",
      },
      {
        label: "Mercari selling & processing fees",
        desc: "Mercari's selling fee and payment-processing fee are deductible business expenses.",
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
        desc: "The part of your home used regularly and exclusively to store inventory or run the business may qualify.",
      },
      {
        label: "Sourcing mileage",
        desc: "Miles driven to source inventory are deductible at the IRS standard mileage rate.",
      },
    ],
    faqs: [
      {
        q: "Does Mercari take out taxes for me?",
        a: "No. Mercari doesn't withhold taxes. If you sell as a business, you owe income tax plus the 15.3% self-employment tax on your net profit (sales minus cost of goods and expenses).",
      },
      {
        q: "Do I get a 1099-K from Mercari?",
        a: "Mercari issues a 1099-K when your sales reach the IRS reporting threshold for the year (the threshold has changed recently). It reports gross sales before fees — report all of your business income whether or not a form arrives.",
      },
      {
        q: "Is selling on Mercari taxable income?",
        a: "Reselling for profit is a taxable business on Schedule C. Selling your own used belongings for less than you paid generally isn't taxable, and that loss isn't deductible. A 1099-K alone doesn't make income taxable — but you must report and reconcile it. Confirm with the IRS.",
      },
      {
        q: "What can Mercari sellers deduct?",
        a: "Your cost of goods (what you paid for items), Mercari's fees, any shipping you cover, packaging, a qualifying home office or storage, and sourcing mileage. Records of each item's cost are essential.",
      },
      {
        q: "How much should Mercari sellers set aside for taxes?",
        a: "A common rule of thumb is 25–30% of your net profit (sales minus cost of goods and expenses) for income tax plus the 15.3% self-employment tax — your exact rate depends on your total income and state. Use the Tax Set-Aside calculator for a tailored number.",
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
      "How Depop taxes work for sellers: the 1099-K, hobby vs business, cost of goods, deductible fees and shipping, and quarterly taxes. Not tax advice.",
    h1: "Depop Taxes: What Every Seller Needs to Know",
    intro:
      "Whether Depop is taxable depends on whether you're clearing out your wardrobe or running a resale business. Depop doesn't withhold taxes, and the 1099-K it may send reports gross sales, not profit. Here's how Depop taxes work once you're selling as a business.",
    formsHeading: "Do you get a 1099-K — and is your Depop income taxable?",
    formsBody: [
      "Depop processes buyer payments, so it issues a Form 1099-K when your sales reach the IRS reporting threshold for the year. That threshold has changed in recent years, so you might get a 1099-K for modest sales — or not get one and still owe tax. It reports gross sales before fees and shipping, so it isn't your taxable profit.",
      "Whether you owe tax depends on what you're doing. Reselling your own used clothing for less than you paid is generally not taxable (and the loss isn't deductible). But buying or sourcing to resell for profit is a business: you report it on Schedule C, deduct your cost of goods and expenses, and owe income tax plus the 15.3% self-employment tax on the net profit. Confirm your situation with the IRS.",
    ],
    vehicleBased: false,
    sellerFraming: true,
    deductionsOverride: [
      {
        label: "Cost of goods sold (COGS)",
        desc: "What you paid for the items you resold is subtracted from your sales as COGS — keep records of each item's cost.",
      },
      {
        label: "Depop & payment fees",
        desc: "Depop's selling fee and payment-processing fee are deductible business expenses.",
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
        desc: "The part of your home used regularly and exclusively to store inventory or run the business may qualify.",
      },
      {
        label: "Sourcing mileage",
        desc: "Miles driven to source inventory (thrift runs, markets) are deductible at the IRS standard mileage rate.",
      },
    ],
    faqs: [
      {
        q: "Does Depop take out taxes for me?",
        a: "No. Depop doesn't withhold taxes. If you sell as a business, you owe income tax plus the 15.3% self-employment tax on your net profit (sales minus cost of goods and expenses).",
      },
      {
        q: "Do I get a 1099-K from Depop?",
        a: "Depop issues a 1099-K when your sales reach the IRS reporting threshold for the year (the threshold has changed recently). It reports gross sales before fees — report all of your business income whether or not a form arrives.",
      },
      {
        q: "Is selling on Depop taxable income?",
        a: "Reselling for profit is a taxable business on Schedule C. Selling your own used clothing for less than you paid generally isn't taxable, and that loss isn't deductible. A 1099-K alone doesn't make income taxable — but you must report and reconcile it. Confirm with the IRS.",
      },
      {
        q: "What can Depop sellers deduct?",
        a: "Your cost of goods (what you paid for items), Depop's fees, any shipping you cover, packaging, a qualifying home office or storage, and sourcing mileage. Records of each item's cost are essential.",
      },
      {
        q: "How much should Depop sellers set aside for taxes?",
        a: "A common rule of thumb is 25–30% of your net profit (sales minus cost of goods and expenses) for income tax plus the 15.3% self-employment tax — your exact rate depends on your total income and state. Use the Tax Set-Aside calculator for a tailored number.",
      },
    ],
  },
];

export function getPlatformTaxGuide(
  slug: string
): PlatformTaxGuide | undefined {
  return PLATFORM_TAX_GUIDES.find(g => g.slug === slug);
}
