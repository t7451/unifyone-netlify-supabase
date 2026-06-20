/**
 * platformComparisons.ts — content for the gig platform comparison cluster
 * (/doordash-vs-uber-eats, /instacart-vs-doordash, /uber-vs-lyft-driver).
 *
 * These pages target the highest-intent "which pays more / which is better"
 * searches gig workers run before signing up for a second app, and are built
 * for AEO/GEO: each ships a WebPage + FAQPage JSON-LD block plus a visible
 * comparison table and Q&A that answer engines can cite.
 *
 * CRITICAL ACCURACY NOTE: we deliberately do NOT publish pay-per-hour or
 * earnings figures. Real net pay varies by market, time of day, vehicle cost,
 * promotions, and effort — any number we printed would be misleading and stale.
 * Instead every comparison is framed around HOW pay is structured and HOW a
 * worker computes their OWN net hourly rate, then sends them to the free
 * calculators to do exactly that. Every dimension below is a neutral,
 * structural fact (how offers work, who issues which 1099, payout options),
 * never a dollar claim. Always qualified, never financial or tax advice.
 */

export interface ComparisonFaq {
  q: string;
  a: string;
}

export interface ComparisonDimension {
  /** The thing being compared, e.g. "How pay is structured". */
  aspect: string;
  /** Platform A's structural answer (no dollar figures). */
  a: string;
  /** Platform B's structural answer (no dollar figures). */
  b: string;
}

export interface PlatformComparison {
  /** Route slug, also the prerendered file name. */
  slug: string;
  /** First platform's display name, e.g. "DoorDash". */
  platformA: string;
  /** Second platform's display name, e.g. "Uber Eats". */
  platformB: string;
  /** Eyebrow label above the h1. */
  eyebrow: string;
  /** <title> + WebPage schema name (before the brand suffix). */
  title: string;
  /** Meta description, ≤158 chars. */
  metaDescription: string;
  /** On-page h1. */
  h1: string;
  /** Lead paragraph(s). */
  intro: string;
  /** Comparison rows — render the table from these. */
  dimensions: ComparisonDimension[];
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: ComparisonFaq[];
}

/**
 * Evergreen reminder reused across comparisons: the only way to know which
 * platform pays *you* more is to compute your own net hourly rate on each.
 */
export const COMPARE_YOUR_OWN_PAY_ANSWER =
  "Advertised or anecdotal pay numbers don't tell you what you'll keep, because net pay depends on your market, the time you work, your vehicle's cost per mile, and current promotions. The reliable way to compare two platforms is to run each one for a few comparable shifts, then divide your real earnings (after the miles you drove and your expenses) by the hours you were active. The free Real Hourly Rate and Earnings Consolidator calculators do that math so you can compare apples to apples.";

export const PLATFORM_COMPARISONS: PlatformComparison[] = [
  {
    slug: "doordash-vs-uber-eats",
    platformA: "DoorDash",
    platformB: "Uber Eats",
    eyebrow: "Gig Platform Comparison",
    title: "DoorDash vs Uber Eats: Which Pays More for Drivers?",
    metaDescription:
      "DoorDash vs Uber Eats compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    h1: "DoorDash vs Uber Eats: Which Pays More for Drivers?",
    intro:
      "Both DoorDash and Uber Eats pay couriers as independent contractors, and on both apps your take-home depends far more on your market and hours than on the logo. Rather than quote pay numbers that go stale the moment the market shifts, this guide compares the two on the structural factors that actually drive net pay — then shows you how to measure your own real hourly rate on each so you can decide with your own data.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Per-offer: each delivery shows a guaranteed base pay plus promotions and 100% of tips before you accept it.",
        b: "Per-offer: each delivery shows an upfront fare including promotions and tips before you accept it, and you can sometimes batch nearby orders.",
      },
      {
        aspect: "Promotions / surge",
        a: "Peak Pay adds a per-delivery bonus in busy zones and times; Challenges pay extra for completing a set number of deliveries.",
        b: "Surge and Boost zones add to fares when demand is high; Quests pay a bonus for hitting a delivery count.",
      },
      {
        aspect: "Platform fees / commission",
        a: "You're paid per completed offer; DoorDash's restaurant commission isn't deducted from your courier pay.",
        b: "You're paid per completed offer; Uber's restaurant commission isn't deducted from your courier pay.",
      },
      {
        aspect: "Tax forms issued",
        a: "1099-NEC if you earn $600 or more in a year (delivered through Stripe).",
        b: "1099-NEC for incentives/referrals and a 1099-K for processed delivery fares; thresholds vary by year, and your Uber Tax Summary reconciles both.",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based delivery; you track and deduct every business mile. DoorDash reports limited mileage, so keep your own log.",
        b: "Car-based delivery (bikes/scooters in some cities); track every business mile. Uber reports your online miles, but your real deductible miles are often higher.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "Dash Now when zones are busy, or schedule a dash in advance; higher acceptance can unlock Top Dasher priority.",
        b: "Largely tap-on, tap-off with no required schedule; you go online whenever you want.",
      },
      {
        aspect: "Payout speed",
        a: "Weekly direct deposit by default; instant cash-out options are available, sometimes for a fee.",
        b: "Weekly direct deposit by default; Instant Pay lets you cash out more frequently, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Does DoorDash or Uber Eats pay more for drivers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is pay structured on DoorDash vs Uber Eats?",
        a: "Both are per-offer: you see a base/upfront amount plus promotions and tips before accepting each delivery. DoorDash adds Peak Pay and Challenges in busy periods; Uber Eats adds Surge/Boost zones and Quests. Neither deducts the restaurant's commission from your courier pay.",
      },
      {
        q: "What tax forms do DoorDash and Uber Eats send?",
        a: "Both treat you as an independent contractor with no tax withheld. DoorDash issues a 1099-NEC (through Stripe) if you earn $600 or more. Uber may issue a 1099-NEC for incentives and referrals plus a 1099-K for your processed delivery fares; thresholds change yearly. You must report all income regardless of which forms arrive.",
      },
      {
        q: "Can I drive for both DoorDash and Uber Eats at the same time?",
        a: "Yes — many couriers run both apps to reduce idle time between offers and accept whichever delivery pays better at the moment. Just track mileage and earnings per platform so you can see which one actually nets more in your market, and report income from both.",
      },
      {
        q: "How do I figure out which one nets me more per hour?",
        a: "Work a few comparable shifts on each, log your active hours and the miles you drove, then divide net earnings (after mileage and expenses) by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this so you can compare both platforms side by side.",
      },
    ],
  },
  {
    slug: "instacart-vs-doordash",
    platformA: "Instacart",
    platformB: "DoorDash",
    eyebrow: "Gig Platform Comparison",
    title: "Instacart vs DoorDash: Which Is Better for Gig Workers?",
    metaDescription:
      "Instacart vs DoorDash compared on how pay works (batches vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to compute your net pay.",
    h1: "Instacart vs DoorDash: Which Is Better for Gig Workers?",
    intro:
      "Instacart and DoorDash are both independent-contractor gig apps, but the work is different: Instacart full-service shoppers shop a cart and deliver groceries, while DoorDash Dashers pick up and drop off prepared orders. That changes how pay is structured and what your time and mileage look like. Instead of quoting earnings that shift by market and week, this guide compares the two structurally and shows you how to measure your own net hourly rate on each.",
    dimensions: [
      {
        aspect: "What the work is",
        a: "Full-service shopping: you shop the items in-store, then deliver the order. Time includes shopping plus driving.",
        b: "Delivery only: you pick up a prepared order and drop it off. Time is mostly driving and waiting.",
      },
      {
        aspect: "How pay is structured",
        a: "Per-batch: each batch shows an estimated payment (a base plus factors like item count and distance) and tips before you accept.",
        b: "Per-offer: each delivery shows guaranteed base pay plus promotions and 100% of tips before you accept.",
      },
      {
        aspect: "Promotions / bonuses",
        a: "Peak Boost adds extra pay during busy windows; tips can be a large share of a batch and may adjust after delivery.",
        b: "Peak Pay adds a per-delivery bonus in busy zones; Challenges pay a bonus for completing a set number of deliveries.",
      },
      {
        aspect: "Platform fees / commission",
        a: "You're paid per completed batch; Instacart's customer service/markup fees aren't deducted from your shopper pay.",
        b: "You're paid per completed offer; DoorDash's restaurant commission isn't deducted from your courier pay.",
      },
      {
        aspect: "Tax forms issued",
        a: "Full-service shoppers get a 1099-NEC at $600 or more (in-store-only shoppers are W-2 employees instead).",
        b: "1099-NEC if you earn $600 or more in a year (delivered through Stripe).",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based; deduct business miles. You may also have more time on foot in-store, which isn't mileage but is still working time.",
        b: "Car-based; deduct every business mile. Keep your own log since reported mileage is limited.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "You can browse and claim available batches, and early access to batches can be tied to a shopper rating.",
        b: "Dash Now in busy zones or schedule a dash in advance; higher acceptance can unlock Top Dasher priority.",
      },
      {
        aspect: "Payout speed",
        a: "Weekly direct deposit by default; Instant Cashout is available, sometimes for a fee.",
        b: "Weekly direct deposit by default; instant cash-out options are available, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Is Instacart or DoorDash better for gig workers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is pay different on Instacart vs DoorDash?",
        a: "Instacart pays per batch — an estimated amount based on factors like item count and distance, plus tips — and your time includes shopping in-store. DoorDash pays per delivery offer with a base plus promotions and tips, and your time is mostly driving. Because Instacart batches include shopping time, compare them on net pay per active hour, not per delivery.",
      },
      {
        q: "What tax forms do Instacart and DoorDash send?",
        a: "Both pay you as an independent contractor with nothing withheld, and both issue a 1099-NEC if you earn $600 or more. One nuance: Instacart in-store-only shoppers are W-2 part-time employees, while full-service shoppers (who also deliver) get the 1099-NEC. Report all income whether or not a form arrives.",
      },
      {
        q: "Can I do both Instacart and DoorDash?",
        a: "Yes — many gig workers run both to fill gaps, shopping batches when grocery demand is high and taking delivery offers otherwise. Track mileage and earnings per app so you can see which nets more of your time in your area, and report income from both.",
      },
      {
        q: "How do I compare my real earnings on each?",
        a: "Run a few comparable shifts on each platform, record your active hours (shopping plus driving for Instacart) and the miles you drove, then divide net earnings after expenses by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this so you can compare both directly.",
      },
    ],
  },
  {
    slug: "uber-vs-lyft-driver",
    platformA: "Uber",
    platformB: "Lyft",
    eyebrow: "Gig Platform Comparison",
    title: "Uber vs Lyft: Which Is Better for Drivers?",
    metaDescription:
      "Uber vs Lyft for drivers, compared on how pay works, fees, 1099-K vs 1099-NEC, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    h1: "Uber vs Lyft: Which Is Better for Drivers?",
    intro:
      "Uber and Lyft are the two largest US rideshare platforms, and both pay drivers as independent contractors. The apps are structurally similar — upfront fares, surge-style bonuses, and weekly or instant payouts — so which one nets you more comes down to your local market, the hours you drive, and your vehicle costs. Rather than quote per-hour figures that vary city to city, this guide compares them on the factors that drive net pay and shows you how to measure your own real hourly rate on each.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Upfront fares: you see the estimated fare and trip details before accepting, plus 100% of tips.",
        b: "Upfront fares: you see the estimated fare and trip details before accepting, plus 100% of tips.",
      },
      {
        aspect: "Surge / bonuses",
        a: "Surge pricing and Quest/Boost-style promotions raise pay during high demand.",
        b: "Personal Power Zones and bonus promotions raise pay during high demand.",
      },
      {
        aspect: "Platform fees / commission",
        a: "Uber takes a service fee out of each fare; your Tax Summary breaks the fees out as a deductible business expense.",
        b: "Lyft takes a service fee out of each fare; your Annual Summary breaks the fees out as a deductible business expense.",
      },
      {
        aspect: "Tax forms issued",
        a: "1099-K for processed ride fares plus a 1099-NEC for incentives/referrals; thresholds vary by year, reconciled on your Uber Tax Summary.",
        b: "1099-K for processed ride fares plus a 1099-NEC for incentives/referrals; thresholds vary by year, reconciled on your Lyft Annual Summary.",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based; deduct every business mile. Uber reports your online miles, but miles between trips are often deductible too — keep your own log.",
        b: "Car-based; deduct every business mile. Lyft reports your online miles, but miles between trips are often deductible too — keep your own log.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "Tap on and off whenever you want; no required schedule.",
        b: "Tap on and off whenever you want; no required schedule.",
      },
      {
        aspect: "Payout speed",
        a: "Weekly direct deposit by default; Instant Pay lets you cash out more often, sometimes for a fee.",
        b: "Weekly direct deposit by default; Express Pay lets you cash out more often, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Does Uber or Lyft pay drivers more?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How does pay work on Uber vs Lyft?",
        a: "Both use upfront fares — you see the estimated fare and trip before accepting and keep 100% of tips — and both add surge-style bonuses during high demand. Each takes a service fee out of fares, which is a deductible business expense shown on your tax summary. Because the structures are so similar, your local market and hours usually matter more than the platform.",
      },
      {
        q: "What tax forms do Uber and Lyft drivers get?",
        a: "Both pay drivers as independent contractors with no withholding and issue similar forms: a 1099-K reporting the gross ride fares processed through the platform, and a 1099-NEC for incentives, referrals, and bonuses. Reporting thresholds change by year, and your Uber Tax Summary or Lyft Annual Summary reconciles the forms with your actual earnings. Report all income regardless.",
      },
      {
        q: "Can I drive for both Uber and Lyft?",
        a: "Yes — many drivers run both apps and accept whichever trip pays better or comes first, which cuts idle time. Track your mileage and earnings per platform so you can compare real net pay in your market, and report income from both.",
      },
      {
        q: "How do I know which one nets me more per hour?",
        a: "Drive comparable hours on each, log your active time and the miles you drove, then divide net earnings (after Uber/Lyft fees, mileage, and expenses) by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this math so you can compare both side by side.",
      },
    ],
  },
  {
    slug: "doordash-vs-grubhub",
    platformA: "DoorDash",
    platformB: "Grubhub",
    eyebrow: "Gig Platform Comparison",
    title: "DoorDash vs Grubhub: Which Pays More for Drivers?",
    metaDescription:
      "DoorDash vs Grubhub compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    h1: "DoorDash vs Grubhub: Which Pays More for Drivers?",
    intro:
      "DoorDash and Grubhub both pay couriers as independent contractors to deliver prepared food, and on both apps your take-home depends far more on your market and hours than on the brand. Rather than quote pay numbers that go stale the moment demand shifts, this guide compares the two on the structural factors that actually drive net pay — then shows you how to measure your own real hourly rate on each so you can decide with your own data.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Per-offer: each delivery shows a guaranteed base pay plus promotions and 100% of tips before you accept it.",
        b: "Per-offer: each delivery shows a base pay (calculated from mileage and time) plus promotions and 100% of tips before you accept it.",
      },
      {
        aspect: "Promotions / surge",
        a: "Peak Pay adds a per-delivery bonus in busy zones and times; Challenges pay extra for completing a set number of deliveries.",
        b: "Special Offers and Mission bonuses add extra pay during busy periods or for completing a set number of deliveries.",
      },
      {
        aspect: "Platform fees / commission",
        a: "You're paid per completed offer; DoorDash's restaurant commission isn't deducted from your courier pay.",
        b: "You're paid per completed offer; Grubhub's restaurant commission isn't deducted from your courier pay.",
      },
      {
        aspect: "Tax forms issued",
        a: "1099-NEC if you earn $600 or more in a year (delivered through Stripe).",
        b: "1099-NEC if you earn $600 or more in a year (delivered through its payment processor).",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based delivery; you track and deduct every business mile. DoorDash reports limited mileage, so keep your own log.",
        b: "Car-based delivery (bikes/scooters in some cities); track every business mile. Keep your own log, since reported mileage is limited.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "Dash Now when zones are busy, or schedule a dash in advance; higher acceptance can unlock Top Dasher priority.",
        b: "Schedule blocks in advance or tap on when regions are busy; a higher acceptance/attendance rating can unlock earlier scheduling access.",
      },
      {
        aspect: "Payout speed",
        a: "Weekly direct deposit by default; instant cash-out options are available, sometimes for a fee.",
        b: "Weekly direct deposit by default; Instant Cashout lets you cash out more frequently, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Does DoorDash or Grubhub pay more for drivers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is pay structured on DoorDash vs Grubhub?",
        a: "Both are per-offer: you see an amount plus promotions and tips before accepting each delivery. DoorDash shows a guaranteed base plus Peak Pay and Challenges; Grubhub calculates base pay from mileage and time and adds Special Offers and Missions. Neither deducts the restaurant's commission from your courier pay.",
      },
      {
        q: "What tax forms do DoorDash and Grubhub send?",
        a: "Both treat you as an independent contractor with no tax withheld, and both issue a 1099-NEC if you earn $600 or more in a year (DoorDash through Stripe; Grubhub through its payment processor). You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income regardless of which forms arrive.",
      },
      {
        q: "Can I drive for both DoorDash and Grubhub at the same time?",
        a: "Yes — many couriers run both apps to reduce idle time between offers and accept whichever delivery pays better at the moment. Just track mileage and earnings per platform so you can see which one actually nets more in your market, and report income from both.",
      },
      {
        q: "How do I figure out which one nets me more per hour?",
        a: "Work a few comparable shifts on each, log your active hours and the miles you drove, then divide net earnings (after mileage and expenses) by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this so you can compare both platforms side by side.",
      },
    ],
  },
  {
    slug: "amazon-flex-vs-spark",
    platformA: "Amazon Flex",
    platformB: "Spark",
    eyebrow: "Gig Platform Comparison",
    title: "Amazon Flex vs Spark: Which Delivery Gig Is Better?",
    metaDescription:
      "Amazon Flex vs Walmart Spark compared on how pay works (blocks vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to find your net pay.",
    h1: "Amazon Flex vs Spark: Which Delivery Gig Is Better?",
    intro:
      "Amazon Flex and the Walmart Spark Driver program are both independent-contractor delivery gigs, but they're structured differently: Amazon Flex pays for reserved delivery blocks of a set length, while Spark pays per accepted delivery offer. That changes how your time and mileage look. Instead of quoting earnings that shift by market and week, this guide compares the two structurally and shows you how to measure your own net hourly rate on each.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Per-block: you reserve a delivery block of a set length that shows an estimated total before you accept; tips (for Amazon-store/grocery deliveries) are added after.",
        b: "Per-offer: each delivery or trip shows an estimated payment plus 100% of tips before you accept.",
      },
      {
        aspect: "Promotions / bonuses",
        a: "Surge blocks pay more when demand is high; estimated block pay can rise during busy windows.",
        b: "Incentives and bonus offers add extra pay during busy periods or for completing a set number of trips.",
      },
      {
        aspect: "Platform fees / commission",
        a: "You're paid per completed block; no separate platform commission is deducted from your driver pay.",
        b: "You're paid per completed offer; no separate platform commission is deducted from your driver pay.",
      },
      {
        aspect: "Tax forms issued",
        a: "1099-NEC if you earn $600 or more in a year, delivered through Amazon's tax-document portal.",
        b: "1099-NEC if you earn $600 or more in a year, delivered through its payment partner.",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based; deduct every business mile, including miles between stops on a route. Keep your own log, since reported mileage is limited.",
        b: "Car-based; deduct every business mile, including miles to the store and between stops. Keep your own log, since reported mileage is limited.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "You reserve blocks in advance (or grab same-day blocks when available); you commit to the block's window once accepted.",
        b: "You browse and accept available offers, or schedule reservations where offered; more tap-on, tap-off than fixed blocks.",
      },
      {
        aspect: "Payout speed",
        a: "Direct deposit on a set schedule (typically twice a week); availability of instant options varies.",
        b: "Direct deposit through its payment partner, often available frequently; an instant cash-out option is also offered, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Is Amazon Flex or Spark better for delivery drivers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is pay different on Amazon Flex vs Spark?",
        a: "Amazon Flex pays for reserved blocks of a set length — you see an estimated block total before accepting, and tips on eligible deliveries are added after. Spark pays per accepted offer with an estimate plus tips shown upfront. Because a Flex block is a fixed time commitment and Spark is offer-by-offer, compare them on net pay per active hour rather than per stop.",
      },
      {
        q: "What tax forms do Amazon Flex and Spark send?",
        a: "Both pay you as an independent contractor with nothing withheld, and both issue a 1099-NEC if you earn $600 or more in a year (Amazon through its tax-document portal; Spark through its payment partner). You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income whether or not a form arrives.",
      },
      {
        q: "Can I do both Amazon Flex and Spark?",
        a: "Yes — many drivers run both to fill their schedule, reserving Flex blocks when they want guaranteed hours and taking Spark offers around them. Track mileage and earnings per app so you can see which nets more of your time in your area, and report income from both.",
      },
      {
        q: "How do I compare my real earnings on each?",
        a: "Work a few comparable shifts on each, record your active hours and the miles you drove, then divide net earnings after expenses by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this so you can compare both directly.",
      },
    ],
  },
  {
    slug: "instacart-vs-shipt",
    platformA: "Instacart",
    platformB: "Shipt",
    eyebrow: "Gig Platform Comparison",
    title: "Instacart vs Shipt: Which Is Better for Shoppers?",
    metaDescription:
      "Instacart vs Shipt compared on how pay works, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay as a shopper.",
    h1: "Instacart vs Shipt: Which Is Better for Shoppers?",
    intro:
      "Instacart and Shipt are the two largest grocery-shopping gig apps, and both pay shoppers as independent contractors to shop a cart and deliver it. The work is similar — you shop in-store, then drive the order to the customer — so which one nets you more comes down to your market, the hours you work, and your vehicle costs. Rather than quote per-hour figures that vary city to city, this guide compares them on the factors that drive net pay and shows you how to measure your own real hourly rate on each.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Per-batch: each batch shows an estimated payment (a base plus factors like item count and distance) and tips before you accept.",
        b: "Per-order: each order shows an estimated payment (factoring in the order's effort) plus tips; on some markets pay is shown before you claim it.",
      },
      {
        aspect: "Promotions / bonuses",
        a: "Peak Boost adds extra pay during busy windows; tips can be a large share of a batch and may adjust after delivery.",
        b: "Promo pay and bonuses add extra during busy periods; tips can be a large share of an order and may adjust after delivery.",
      },
      {
        aspect: "Platform fees / commission",
        a: "You're paid per completed batch; Instacart's customer service/markup fees aren't deducted from your shopper pay.",
        b: "You're paid per completed order; Shipt's customer membership/fees aren't deducted from your shopper pay.",
      },
      {
        aspect: "Tax forms issued",
        a: "Full-service shoppers get a 1099-NEC at $600 or more (in-store-only shoppers are W-2 employees instead).",
        b: "1099-NEC if you earn $600 or more in a year, delivered through its payment processor.",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based; deduct business miles. You also spend time on foot in-store, which isn't mileage but is still working time.",
        b: "Car-based; deduct business miles. You also spend time on foot in-store, which isn't mileage but is still working time.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "You browse and claim available batches; early access to batches can be tied to a shopper rating.",
        b: "You can claim open orders or schedule availability windows; a higher shopper rating can unlock earlier access to orders.",
      },
      {
        aspect: "Payout speed",
        a: "Weekly direct deposit by default; Instant Cashout is available, sometimes for a fee.",
        b: "Weekly direct deposit by default; Instant Pay lets you cash out more frequently, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Is Instacart or Shipt better for shoppers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is pay different on Instacart vs Shipt?",
        a: "Both pay you to shop and deliver groceries, and on both your time includes shopping in-store plus driving. Instacart pays per batch — an estimated amount based on factors like item count and distance, plus tips. Shipt pays per order with an estimate that factors in the order's effort, plus tips. Because both bundle shopping time into the job, compare them on net pay per active hour rather than per order.",
      },
      {
        q: "What tax forms do Instacart and Shipt send?",
        a: "Both pay shoppers as independent contractors with nothing withheld, and both issue a 1099-NEC if you earn $600 or more in a year. One nuance: Instacart in-store-only shoppers are W-2 part-time employees, while full-service shoppers (who also deliver) get the 1099-NEC; all Shipt shoppers who deliver are independent contractors. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income whether or not a form arrives.",
      },
      {
        q: "Can I shop for both Instacart and Shipt?",
        a: "Yes — many shoppers run both to fill gaps, claiming batches on one app and orders on the other depending on demand. Track mileage and earnings per app so you can see which nets more of your time in your area, and report income from both.",
      },
      {
        q: "How do I compare my real earnings on each?",
        a: "Work a few comparable shifts on each, record your active hours (shopping plus driving) and the miles you drove, then divide net earnings after expenses by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this so you can compare both directly.",
      },
    ],
  },
];

export function getPlatformComparison(
  slug: string
): PlatformComparison | undefined {
  return PLATFORM_COMPARISONS.find(c => c.slug === slug);
}
