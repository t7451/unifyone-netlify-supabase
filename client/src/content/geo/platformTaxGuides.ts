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
  /** Platform-specific deductible expenses (merged with shared ones). */
  extraDeductions: { label: string; desc: string }[];
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
];

export function getPlatformTaxGuide(
  slug: string
): PlatformTaxGuide | undefined {
  return PLATFORM_TAX_GUIDES.find(g => g.slug === slug);
}
