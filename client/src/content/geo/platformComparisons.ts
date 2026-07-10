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
    title: "Uber vs Lyft (2026): Which Pays More?",
    metaDescription:
      "Uber vs Lyft for drivers in 2026: how pay works, fees, 1099-K vs 1099-NEC, mileage, and payout speed compared — plus find your real hourly rate free.",
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
    title: "Amazon Flex vs Spark (2026): Which Pays More?",
    metaDescription:
      "Amazon Flex vs Walmart Spark for 2026: blocks vs offers, fees, 1099s, mileage, and scheduling compared for drivers — plus a free take-home pay calculator.",
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
    title: "Instacart vs Shipt (2026): Which Pays More?",
    metaDescription:
      "Instacart vs Shipt for 2026: how pay works, fees, 1099s, mileage, scheduling, and payout speed compared for shoppers — plus a free net-pay calculator.",
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
  {
    slug: "uber-vs-doordash",
    platformA: "Uber",
    platformB: "DoorDash",
    eyebrow: "Gig Platform Comparison",
    title: "Uber vs DoorDash: Which Should You Drive For?",
    metaDescription:
      "Uber (rideshare) vs DoorDash (delivery) compared on pay structure, requirements, 1099 forms, mileage, scheduling, and payouts — plus how to compute your net pay.",
    h1: "Uber vs DoorDash: Which Should You Drive For?",
    intro:
      "Uber and DoorDash are the two best-known gig-driving apps, but they're different jobs: Uber (rideshare) carries passengers, while DoorDash carries food. That changes the requirements, the wear on your car, and how pay works — so the better choice depends on your vehicle, your market, and what you're comfortable doing. This guide compares the structural factors, then shows you how to measure your own real hourly rate on each.",
    dimensions: [
      {
        aspect: "What you carry",
        a: "Passengers — you drive people to destinations through UberX and related ride options.",
        b: "Food and goods — you pick up orders from merchants and drop them off; no passengers.",
      },
      {
        aspect: "Requirements",
        a: "Higher bar: typically 21+ with a qualifying multi-door vehicle, more driving experience, and a stricter background and vehicle inspection.",
        b: "Lower bar: typically 18+; in many markets you can deliver by car, and sometimes bike or scooter.",
      },
      {
        aspect: "How pay is structured",
        a: "Per-ride upfront fare shown before you accept, plus 100% of tips and any promotions.",
        b: "Per-offer base pay shown before you accept, plus 100% of tips and any promotions.",
      },
      {
        aspect: "Promotions / surge",
        a: "Surge pricing in busy areas plus Quests and consecutive-trip bonuses.",
        b: "Peak Pay during busy windows plus Challenges.",
      },
      {
        aspect: "Tax forms issued",
        a: "Often a 1099-K for gross fares plus a 1099-NEC for incentives; your Uber Tax Summary reconciles both.",
        b: "A 1099-NEC if you earned $600 or more (issued via Stripe).",
      },
      {
        aspect: "Mileage / expense profile",
        a: "More miles and engine hours with passengers aboard; higher fuel and wear, but typically less waiting.",
        b: "Shorter trips with restaurant wait time; you absorb the miles driven between merchant and customer.",
      },
      {
        aspect: "Scheduling / payout",
        a: "Log on any time; weekly direct deposit with an instant cash-out option (possible fee).",
        b: "Log on any time (subject to market capacity); weekly direct deposit with a fast cash-out option (possible fee).",
      },
    ],
    faqs: [
      {
        q: "Which pays more, Uber or DoorDash?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "Is it easier to start with Uber or DoorDash?",
        a: "DoorDash generally has a lower barrier to entry — often 18+ and, in many markets, the option to deliver by car or even bike. Uber rideshare usually requires being 21+ with a qualifying multi-door vehicle and a stricter vehicle/background check. Requirements vary by market and change, so confirm current criteria with each platform.",
      },
      {
        q: "What tax forms do Uber and DoorDash send?",
        a: "DoorDash issues a 1099-NEC at $600+ in earnings. Uber often issues a 1099-K for your gross fares plus a 1099-NEC for incentives and referrals, reconciled on your Uber Tax Summary. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income regardless of which forms arrive.",
      },
      {
        q: "Can I drive for both Uber and DoorDash?",
        a: "Yes. Both treat you as an independent contractor with no exclusivity, so many drivers run both and switch based on which is busier. Track each separately so you can compare net pay per hour and keep clean records for taxes.",
      },
      {
        q: "What can I deduct driving for Uber or DoorDash?",
        a: "Business mileage at the IRS standard mileage rate is usually the largest deduction on either, plus the business-use share of your phone, tolls, parking, and supplies. Because Uber rideshare often means more miles, careful mileage tracking matters even more. See the gig-tax guides for details.",
      },
    ],
  },
  {
    slug: "uber-eats-vs-grubhub",
    platformA: "Uber Eats",
    platformB: "Grubhub",
    eyebrow: "Gig Platform Comparison",
    title: "Uber Eats vs Grubhub: Which Pays More for Drivers?",
    metaDescription:
      "Uber Eats vs Grubhub compared on pay structure, scheduling blocks, fees, 1099 forms, mileage, and payouts — plus how to compute your own net pay.",
    h1: "Uber Eats vs Grubhub: Which Pays More for Drivers?",
    intro:
      "Uber Eats and Grubhub are both food-delivery apps that pay couriers as independent contractors, but they schedule and prioritize drivers differently. Uber Eats is mostly on-demand, while Grubhub leans on scheduled blocks and a priority tier. The better fit depends on your market and how you like to work — here's the structural comparison plus how to measure your own net pay.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Per-offer: an upfront amount including promotions and 100% of tips, shown before you accept.",
        b: "Per-offer: a base amount plus mileage and 100% of tips, shown before you accept.",
      },
      {
        aspect: "Scheduling model",
        a: "Mostly on-demand — log on and accept offers whenever you want, subject to area capacity.",
        b: "Schedule time blocks in advance (or 'toss' and go on-demand where available); blocks can improve order flow.",
      },
      {
        aspect: "Priority / tiers",
        a: "Offer flow is largely on-demand without a formal acceptance-rate tier.",
        b: "Grubhub's Premier/Pro tiers reward higher acceptance and on-time scheduling with earlier scheduling access.",
      },
      {
        aspect: "Promotions",
        a: "Surge/Boost zones and Quests during busy periods.",
        b: "Special pay and contribution boosts in busy areas and times.",
      },
      {
        aspect: "Tax forms issued",
        a: "Often a 1099-NEC for incentives and a 1099-K for processed delivery fares, with thresholds that change yearly.",
        b: "A 1099-NEC if you earned $600 or more in a year.",
      },
      {
        aspect: "Mileage / expense profile",
        a: "You absorb miles between restaurant and customer; trip lengths vary by market.",
        b: "Similar profile; base pay explicitly factors in distance, but you still track all working miles for taxes.",
      },
      {
        aspect: "Scheduling / payout",
        a: "Weekly direct deposit with an instant cash-out option (possible fee).",
        b: "Weekly direct deposit, plus Instant Cash Out / Instant Pay options (possible fee).",
      },
    ],
    faqs: [
      {
        q: "Which pays more, Uber Eats or Grubhub?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "Does Grubhub require scheduling blocks?",
        a: "Grubhub leans on scheduled blocks and rewards reliability through its Premier/Pro tiers, though many markets also allow 'toss' (on-demand) delivering. Uber Eats is mostly on-demand with no blocks. Scheduling rules vary by market and change over time, so confirm current details with each platform.",
      },
      {
        q: "What tax forms do Uber Eats and Grubhub send?",
        a: "Grubhub issues a 1099-NEC at $600+ in earnings. Uber Eats often issues a 1099-NEC for incentives plus a 1099-K for processed fares. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      },
      {
        q: "Can I deliver for both Uber Eats and Grubhub?",
        a: "Yes. Both are non-exclusive independent-contractor apps, so many couriers run both and multi-app to cut downtime. Track each separately to compare net pay per hour and keep clean tax records.",
      },
      {
        q: "What can Uber Eats and Grubhub drivers deduct?",
        a: "Business mileage at the IRS standard mileage rate is usually the biggest deduction on either, plus the business-use share of your phone, insulated bags, tolls, and parking. See the gig-tax guides for the full checklist.",
      },
    ],
  },
  {
    slug: "doordash-vs-spark",
    platformA: "DoorDash",
    platformB: "Spark Driver",
    eyebrow: "Gig Platform Comparison",
    title: "DoorDash vs Spark (2026): Which Pays More?",
    metaDescription:
      "DoorDash vs Walmart Spark for 2026: how pay, order types, fees, 1099s, and mileage really compare for drivers — plus calculate your own take-home free.",
    h1: "DoorDash vs Spark: Which Delivery Gig Is Better?",
    intro:
      "DoorDash and the Walmart Spark Driver program are both per-offer delivery apps that pay you as an independent contractor, but the order mix differs: DoorDash spans restaurants, convenience, and retail, while Spark delivers Walmart and Sam's Club orders (sometimes including shopping the order). The better fit depends on your local merchant density and how you like to work. Here's the structural comparison plus how to compute your own net pay.",
    dimensions: [
      {
        aspect: "Order types",
        a: "Restaurants, grocery, convenience, and retail through DoorDash's merchant network.",
        b: "Walmart and Sam's Club orders; some offers include shopping the order, others are delivery-only (curbside pickup).",
      },
      {
        aspect: "How pay is structured",
        a: "Per-offer base pay plus 100% of tips and promotions, shown before you accept.",
        b: "Per-offer estimated pay (factoring distance and effort) plus 100% of tips, shown before you accept.",
      },
      {
        aspect: "Promotions",
        a: "Peak Pay during busy windows plus Challenges.",
        b: "Incentives and busy-area bonuses that vary by zone.",
      },
      {
        aspect: "Tax forms issued",
        a: "A 1099-NEC if you earned $600 or more (via Stripe).",
        b: "A 1099-NEC if you earned $600 or more (via its payment partner).",
      },
      {
        aspect: "Coverage / availability",
        a: "Broad merchant base in most markets, so order volume is often steady.",
        b: "Tied to Walmart store zones; availability and slot competition depend on nearby stores.",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Short-to-medium trips with restaurant wait time; you absorb between-stop miles.",
        b: "Often longer routes from a store to customers; shopping offers add in-store time.",
      },
      {
        aspect: "Scheduling / payout",
        a: "Log on any time (subject to capacity); weekly deposit with fast cash-out (possible fee).",
        b: "Reserve or accept zone offers; frequent/instant payout options via its payment partner.",
      },
    ],
    faqs: [
      {
        q: "Which pays more, DoorDash or Spark?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "Does Spark require shopping the order?",
        a: "Some Spark offers are shop-and-deliver (you pick items in the store), while others are delivery-only from curbside pickup. DoorDash is primarily pickup-and-deliver, though it has some shopping orders too. The mix varies by market — confirm current details with each platform.",
      },
      {
        q: "What tax forms do DoorDash and Spark send?",
        a: "Both issue a 1099-NEC if you earned $600 or more — DoorDash via Stripe, Spark via its payment partner. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      },
      {
        q: "Can I drive for both DoorDash and Spark?",
        a: "Yes. Both are non-exclusive independent-contractor programs, so many drivers run both and pick whichever has better offers in their area at the time. Track each separately to compare net pay per hour and for clean tax records.",
      },
      {
        q: "What can DoorDash and Spark drivers deduct?",
        a: "Business mileage at the IRS standard mileage rate is usually the biggest deduction on either, plus the business-use share of your phone, insulated bags, tolls, and parking. See the gig-tax guides for the full checklist.",
      },
    ],
  },
  {
    slug: "amazon-flex-vs-doordash",
    platformA: "Amazon Flex",
    platformB: "DoorDash",
    eyebrow: "Gig Platform Comparison",
    title: "Amazon Flex vs DoorDash (2026): Which Pays More?",
    metaDescription:
      "Amazon Flex vs DoorDash for 2026: block vs per-offer pay, requirements, 1099s, mileage, and payouts compared — plus calculate your own net hourly rate free.",
    h1: "Amazon Flex vs DoorDash: Which Is Better for Drivers?",
    intro:
      "Amazon Flex and DoorDash are both independent-contractor gigs, but they work very differently: Amazon Flex pays a set amount for a reserved delivery block of packages, while DoorDash pays per food-delivery offer with tips. One rewards predictability, the other flexibility. The better fit depends on whether you prefer scheduled, tip-free block pay or on-demand offers with tips — here's the structural comparison and how to measure your own net pay.",
    dimensions: [
      {
        aspect: "How pay is structured",
        a: "Block-based: you see a set payment for a reserved delivery block (e.g., a few hours) before you accept; tips are uncommon for standard package blocks.",
        b: "Per-offer: base pay plus 100% of tips and promotions, shown before you accept each delivery.",
      },
      {
        aspect: "What you deliver",
        a: "Amazon packages (and some grocery/Whole Foods or Fresh in select markets).",
        b: "Food, convenience, grocery, and retail orders from DoorDash merchants.",
      },
      {
        aspect: "Requirements",
        a: "Typically 21+ with a mid-size or larger vehicle and a smartphone; background check.",
        b: "Typically 18+; car (and bike/scooter in some markets); background check.",
      },
      {
        aspect: "Scheduling model",
        a: "Reserve blocks in advance (or grab same-day offers); you commit to the whole block.",
        b: "Log on any time and accept offers; no commitment to a fixed block.",
      },
      {
        aspect: "Tax forms issued",
        a: "A 1099-NEC if you earned $600 or more (via Amazon's tax portal).",
        b: "A 1099-NEC if you earned $600 or more (via Stripe).",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Many stops per block, including miles between the station and stops; predictable route density.",
        b: "Variable trips with restaurant wait time; you absorb between-stop miles.",
      },
      {
        aspect: "Scheduling / payout",
        a: "Pay for completed blocks; deposits typically twice a week.",
        b: "Weekly deposit with a fast cash-out option (possible fee).",
      },
    ],
    faqs: [
      {
        q: "Which pays more, Amazon Flex or DoorDash?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "What's the main difference between Amazon Flex and DoorDash?",
        a: "Amazon Flex pays a set amount for a reserved block of package deliveries (tips uncommon), so earnings are predictable but you commit to the block. DoorDash pays per food-delivery offer with tips and lets you log on any time. Flex usually requires 21+ and a mid-size+ vehicle; DoorDash is often 18+ with a lower vehicle bar. Requirements vary by market and change.",
      },
      {
        q: "What tax forms do Amazon Flex and DoorDash send?",
        a: "Both issue a 1099-NEC if you earned $600 or more — Amazon via its tax portal, DoorDash via Stripe. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      },
      {
        q: "Can I do both Amazon Flex and DoorDash?",
        a: "Yes. Both are non-exclusive independent-contractor gigs. Some drivers reserve Amazon Flex blocks for predictable income and fill gaps with DoorDash offers. Track each separately to compare net pay per hour and keep clean tax records.",
      },
      {
        q: "What can Amazon Flex and DoorDash drivers deduct?",
        a: "Business mileage at the IRS standard mileage rate is usually the largest deduction on either — and because Flex blocks can rack up many miles, careful tracking matters. You can also deduct the business-use share of your phone, supplies, tolls, and parking. See the gig-tax guides for the full checklist.",
      },
    ],
  },
  {
    slug: "upwork-vs-fiverr",
    platformA: "Upwork",
    platformB: "Fiverr",
    eyebrow: "Gig Platform Comparison",
    title: "Upwork vs Fiverr: Which Is Better for Freelancers?",
    metaDescription:
      "Upwork vs Fiverr compared on how you get work, platform fees, 1099-K forms, payout methods, and who each suits — plus how to compute your own net pay.",
    h1: "Upwork vs Fiverr: Which Is Better for Freelancers?",
    intro:
      'Upwork and Fiverr are the two largest freelance marketplaces, but they\'re structured differently: on Upwork you send proposals and bill clients on hourly or fixed-price contracts, while on Fiverr you publish fixed-price "gigs" that buyers order directly. Both are third-party platforms that pay you as a self-employed freelancer with nothing withheld. Rather than quote rates that vary wildly by skill and client, this guide compares the two structurally and shows you how to measure your own net pay on each.',
    dimensions: [
      {
        aspect: "How you get work",
        a: "You browse job posts and send proposals (sometimes spending Connects to bid); clients interview and hire you on hourly or fixed-price contracts.",
        b: 'You publish fixed-scope "gigs" with set packages and prices; buyers find your listing and order directly, often without a back-and-forth first.',
      },
      {
        aspect: "How pay is structured",
        a: "Hourly contracts (tracked via the Upwork app) or fixed-price milestones; funds are protected in escrow and released as work is approved.",
        b: 'Fixed price per gig package plus paid add-ons ("gig extras"); the order amount is held until you deliver and the buyer accepts.',
      },
      {
        aspect: "Platform fees / commission",
        a: "A freelancer service fee is deducted from your earnings on each contract; clients may also pay separate marketplace and processing fees.",
        b: "Fiverr deducts a flat seller commission (around 20%) from each order before you're paid; buyers pay a separate service fee on top of your price.",
      },
      {
        aspect: "Tax forms issued",
        a: "As a third-party settlement platform, Upwork issues a 1099-K once your processed payments pass the IRS threshold for the year; the threshold changes, so report all income regardless.",
        b: "As a third-party platform, Fiverr issues a 1099-K once your processed payments pass the IRS threshold for the year; the threshold changes, so report all income regardless.",
      },
      {
        aspect: "Payout methods",
        a: "Direct deposit/ACH, PayPal, wire, and other options on a security-hold schedule after a contract bills; instant options may carry a fee.",
        b: "PayPal, direct deposit/bank transfer, Payoneer, or a Fiverr card after a clearing period once the order completes; faster withdrawal may carry a fee.",
      },
      {
        aspect: "Who it suits",
        a: "Service providers who want ongoing client relationships, hourly work, and larger or retainer-style projects negotiated through proposals.",
        b: "Providers with a productized, repeatable deliverable who prefer set packages and buyers coming to them rather than bidding on jobs.",
      },
    ],
    faqs: [
      {
        q: "Is Upwork or Fiverr better for freelancers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is getting work different on Upwork vs Fiverr?",
        a: "On Upwork you find client job posts and send proposals (sometimes using Connects to bid), then work hourly or fixed-price contracts with escrow protection. On Fiverr you list fixed-scope gigs with set packages and prices, and buyers order directly. Upwork is more proposal-and-interview; Fiverr is more publish-and-get-ordered.",
      },
      {
        q: "What are the fees on Upwork vs Fiverr?",
        a: "Both take a cut before you're paid. Upwork deducts a freelancer service fee from your contract earnings; Fiverr deducts a flat seller commission of roughly 20% from each order. Buyers also pay separate service fees on both. These platform fees are a deductible business expense, so track them.",
      },
      {
        q: "What tax forms do Upwork and Fiverr send?",
        a: "Both are third-party settlement platforms, so each issues a 1099-K once your processed payments pass the IRS reporting threshold for the year (rather than a 1099-NEC). The threshold has changed in recent years, and you owe income tax plus the 15.3% self-employment tax on your net earnings — you must report all income whether or not a 1099-K arrives.",
      },
      {
        q: "Can I use both Upwork and Fiverr?",
        a: "Yes — many freelancers list on both to widen their pipeline, taking proposal-based contracts on Upwork and selling productized gigs on Fiverr. Track earnings and platform fees per marketplace so you can see which actually nets you more after fees, and report income from both.",
      },
      {
        q: "How do I compare my real earnings on each?",
        a: "Take a few comparable projects on each platform, record the hours you actually worked and subtract the platform's fees and your expenses, then divide net earnings by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this so you can compare both marketplaces side by side.",
      },
    ],
  },
  {
    slug: "gopuff-vs-doordash",
    platformA: "Gopuff",
    platformB: "DoorDash",
    eyebrow: "Gig Platform Comparison",
    title: "Gopuff vs DoorDash (2026): Which Pays More?",
    metaDescription:
      "Gopuff vs DoorDash for 2026: how blocks vs per-offer pay, what you carry, scheduling, 1099s, and mileage compare — plus find your real hourly rate free.",
    h1: "Gopuff vs DoorDash: Which Delivery Gig Is Better?",
    intro:
      "Gopuff and DoorDash are both independent-contractor delivery gigs, but the model differs: Gopuff delivers its own convenience and grocery stock out of local micro-fulfillment centers, while DoorDash delivers orders from third-party restaurants and stores. That changes what you carry, where you start each trip, and how you schedule. Instead of quoting earnings that shift by market and week, this guide compares the two structurally and shows you how to measure your own net hourly rate on each.",
    dimensions: [
      {
        aspect: "What you carry",
        a: "Gopuff's own convenience and grocery items — snacks, drinks, household goods — picked at a Gopuff micro-fulfillment center.",
        b: "Orders from third-party restaurants, convenience, grocery, and retail merchants across DoorDash's network.",
      },
      {
        aspect: "How offers / blocks work",
        a: "You typically schedule or claim time blocks tied to a local facility, then deliver the orders routed to you during that block.",
        b: "Per-offer: each delivery shows a guaranteed base pay plus promotions and 100% of tips before you accept it; you can also Dash Now in busy zones.",
      },
      {
        aspect: "Where you start each trip",
        a: "From the Gopuff micro-fulfillment center, where orders are already packed — no restaurant or store wait.",
        b: "From the merchant: you drive to a restaurant or store, sometimes wait for the order, then deliver to the customer.",
      },
      {
        aspect: "Scheduling / flexibility",
        a: "Lean toward reserved blocks at a facility, so you commit to a window once scheduled; availability depends on the local center.",
        b: "Largely on-demand — Dash Now when zones are busy or schedule a dash in advance; higher acceptance can unlock Top Dasher priority.",
      },
      {
        aspect: "Tax forms issued",
        a: "Pays you as an independent contractor and issues a 1099-NEC if you earn $600 or more in a year (via its payment partner).",
        b: "1099-NEC if you earn $600 or more in a year (delivered through Stripe).",
      },
      {
        aspect: "Mileage / expense profile",
        a: "Car-based; you absorb miles from the facility to each customer and back. Keep your own mileage log, since reported mileage is limited.",
        b: "Car-based delivery (bikes/scooters in some cities); track every business mile. DoorDash reports limited mileage, so keep your own log.",
      },
      {
        aspect: "Payout speed",
        a: "Direct deposit on a set schedule through its payment partner; an instant cash-out option is often available, sometimes for a fee.",
        b: "Weekly direct deposit by default; instant cash-out options are available, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Is Gopuff or DoorDash better for delivery drivers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "What's the main difference between Gopuff and DoorDash?",
        a: "Gopuff delivers its own convenience and grocery stock from a local micro-fulfillment center, so you start each trip at the facility with the order already packed and tend to work scheduled blocks. DoorDash delivers from third-party restaurants and stores per offer, so you drive to the merchant first and can log on largely on-demand.",
      },
      {
        q: "What tax forms do Gopuff and DoorDash send?",
        a: "Both treat you as an independent contractor with no tax withheld, and both issue a 1099-NEC if you earn $600 or more in a year (Gopuff via its payment partner; DoorDash via Stripe). You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income whether or not a form arrives.",
      },
      {
        q: "Can I do both Gopuff and DoorDash?",
        a: "Yes — both are non-exclusive independent-contractor gigs, so many drivers schedule Gopuff blocks for steadier routed orders and fill gaps with on-demand DoorDash offers. Track mileage and earnings per app so you can see which nets more of your time in your area, and report income from both.",
      },
      {
        q: "How do I compare my real earnings on each?",
        a: "Work a few comparable shifts on each, record your active hours and the miles you drove, then divide net earnings after expenses by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this so you can compare both directly.",
      },
    ],
  },
  {
    slug: "rover-vs-wag",
    platformA: "Rover",
    platformB: "Wag",
    eyebrow: "Gig Platform Comparison",
    title: "Rover vs Wag: Which Is Better for Pet Care?",
    metaDescription:
      "Rover vs Wag compared on how clients are found, service types, platform cut, scheduling control, and 1099-K forms — plus how to compute your own net pay.",
    h1: "Rover vs Wag: Which Is Better for Pet Care?",
    intro:
      "Rover and Wag are the two largest pet-care marketplaces, connecting independent sitters and walkers with pet owners for dog walking, drop-in visits, boarding, and house sitting. Both are third-party platforms that pay you as a self-employed contractor with nothing withheld, and both take a cut of what owners pay. Rather than quote rates that vary by city and service, this guide compares the two structurally and shows you how to measure your own net pay on each.",
    dimensions: [
      {
        aspect: "How clients are found",
        a: "You build a profile and set your own services and rates; owners search, message, and book you directly, so much of the work is repeat clients.",
        b: "Wag surfaces nearby on-demand and scheduled requests you can accept; it leans more toward matching you with new bookings as they come in.",
      },
      {
        aspect: "Service types",
        a: "Dog walking, drop-in visits, doggy day care, boarding (in your home), and house sitting — you choose which to offer.",
        b: "Dog walking, drop-in visits, boarding, sitting, and add-ons like training; service mix can vary by market.",
      },
      {
        aspect: "Fees / platform cut",
        a: "Rover deducts a service fee from each booking before you're paid; you keep the rest of the rate you set.",
        b: "Wag deducts a service fee/commission from each booking before you're paid; new-client bookings can carry a different cut.",
      },
      {
        aspect: "Scheduling control",
        a: "You set your own availability, services, and prices, and approve each request — more control over your calendar and which jobs you take.",
        b: "More on-demand: you accept requests as they appear, which can mean faster bookings but less control over timing and pricing.",
      },
      {
        aspect: "Tax forms issued",
        a: "As a third-party platform, Rover issues a 1099-K once your processed payments pass the IRS threshold for the year; the threshold changes, so report all income regardless.",
        b: "As a third-party platform, Wag issues a 1099-K once your processed payments pass the IRS threshold for the year; the threshold changes, so report all income regardless.",
      },
      {
        aspect: "Expense profile",
        a: "Mostly your time plus any travel to clients; track business mileage to walks/sits and supplies like leashes, bags, and treats.",
        b: "Similar — time plus travel between bookings; track business mileage and any supplies you buy for the work.",
      },
    ],
    faqs: [
      {
        q: "Is Rover or Wag better for pet sitters and walkers?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "How is finding clients different on Rover vs Wag?",
        a: "On Rover you build a profile, set your own services and rates, and owners search for and book you directly — so you tend to build repeat clients and control your calendar. Wag leans more on-demand, surfacing nearby requests you accept as they come in, which can mean quicker bookings but less control over timing and pricing.",
      },
      {
        q: "What tax forms do Rover and Wag send?",
        a: "Both are third-party platforms, so each issues a 1099-K once your processed payments pass the IRS reporting threshold for the year (rather than a 1099-NEC). The threshold has changed in recent years, and you owe income tax plus the 15.3% self-employment tax on your net earnings — you must report all income whether or not a 1099-K arrives.",
      },
      {
        q: "Can I list on both Rover and Wag?",
        a: "Yes — many pet-care providers list on both to fill their schedule, taking direct bookings on Rover and accepting on-demand requests on Wag. Track earnings and the platform's cut per app so you can see which actually nets you more after fees, and report income from both.",
      },
      {
        q: "How do I compare my real earnings on each?",
        a: "Take a few comparable bookings on each platform, record the time you spent and your travel miles, subtract the platform's fee and your supply costs, then divide net earnings by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this so you can compare both directly.",
      },
    ],
  },
  {
    slug: "lyft-vs-uber-eats",
    platformA: "Lyft",
    platformB: "Uber Eats",
    eyebrow: "Gig Platform Comparison",
    title: "Lyft vs Uber Eats: Which Should You Drive For?",
    metaDescription:
      "Lyft (rideshare) vs Uber Eats (food delivery) compared on the work, requirements, 1099 forms, vehicle wear, and scheduling — plus how to compute your net pay.",
    h1: "Lyft vs Uber Eats: Which Should You Drive For?",
    intro:
      "Lyft and Uber Eats are both independent-contractor driving gigs, but they're fundamentally different jobs: Lyft is rideshare — you carry passengers — while Uber Eats is food delivery, where you carry orders and never have a rider in the car. That changes the requirements, the wear on your vehicle, and how tax forms arrive. Rather than quote per-hour figures that vary city to city, this guide compares them on the structural factors that drive net pay and shows you how to measure your own real hourly rate on each.",
    dimensions: [
      {
        aspect: "What the work is",
        a: "Rideshare: you drive passengers to their destinations; the job is carrying people, not packages.",
        b: "Food delivery: you pick up orders from restaurants and stores and drop them off — no passengers.",
      },
      {
        aspect: "Typical requirements",
        a: "Higher bar: typically 21+ (or a few years' licensed driving) with a qualifying multi-door vehicle, a background check, and a vehicle inspection.",
        b: "Lower bar: typically 18+; in many markets you can deliver by car, and sometimes by bike or scooter, with no rideshare-grade inspection.",
      },
      {
        aspect: "How pay is structured",
        a: "Upfront fare shown before you accept each ride, plus 100% of tips and surge/bonus promotions during high demand.",
        b: "Per-offer upfront amount shown before you accept each delivery, plus 100% of tips and Surge/Boost or Quest promotions.",
      },
      {
        aspect: "Tax forms issued",
        a: "A 1099-K for ride fares processed through the platform plus a 1099-NEC for incentives and referrals; thresholds vary by year and your Lyft Annual Summary reconciles both.",
        b: "Often a 1099-NEC for incentives and referrals plus a 1099-K for processed delivery fares; thresholds vary by year and your Uber Tax Summary reconciles both.",
      },
      {
        aspect: "Vehicle wear / expense profile",
        a: "Passengers and longer trips mean more miles and engine hours, higher fuel and wear, and more interior wear — but often less waiting.",
        b: "Shorter trips with restaurant wait time and between-stop miles; generally lighter interior wear since you carry food, not people.",
      },
      {
        aspect: "Scheduling / payout",
        a: "Log on any time; weekly direct deposit by default, with Express Pay to cash out more often, sometimes for a fee.",
        b: "Mostly on-demand, subject to area capacity; weekly direct deposit with Instant Pay to cash out more often, sometimes for a fee.",
      },
    ],
    faqs: [
      {
        q: "Which pays more, Lyft or Uber Eats?",
        a: COMPARE_YOUR_OWN_PAY_ANSWER,
      },
      {
        q: "What's the main difference between Lyft and Uber Eats?",
        a: "Lyft is rideshare — you carry passengers — while Uber Eats is food delivery, so you carry orders and never have a rider in the car. Lyft's requirements are usually stricter (often 21+ with a qualifying vehicle and an inspection), and passengers mean more miles and vehicle wear. Uber Eats has a lower bar and, in some markets, bike delivery.",
      },
      {
        q: "What tax forms do Lyft and Uber Eats send?",
        a: "Both pay you as an independent contractor with nothing withheld. Each typically issues a 1099-K for the fares the platform processes plus a 1099-NEC for incentives and referrals, reconciled on your Lyft Annual Summary or Uber Tax Summary. Thresholds change yearly, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income regardless of which forms arrive.",
      },
      {
        q: "Can I drive for both Lyft and Uber Eats?",
        a: "Yes — both are non-exclusive independent-contractor apps, so many drivers run rideshare on Lyft and switch to Uber Eats deliveries when ride demand is slow. Track mileage and earnings per app so you can see which nets more of your time in your area, and report income from both.",
      },
      {
        q: "How do I figure out which one nets me more per hour?",
        a: "Work comparable hours on each, log your active time and the miles you drove, then divide net earnings (after mileage and expenses) by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this math so you can compare both side by side.",
      },
    ],
  },
];

export function getPlatformComparison(
  slug: string
): PlatformComparison | undefined {
  return PLATFORM_COMPARISONS.find(c => c.slug === slug);
}
