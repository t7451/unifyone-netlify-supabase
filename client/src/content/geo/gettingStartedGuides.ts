/**
 * gettingStartedGuides.ts — content for the "how to make money on <platform>"
 * getting-started cluster (/how-to-make-money-on-doordash,
 * /how-to-make-money-driving-for-uber, /how-to-make-money-with-instacart,
 * /how-to-make-money-with-amazon-flex).
 *
 * These pages target top-of-funnel beginner searches ("how to make money on
 * doordash", "how to start driving for uber") and are built for AEO/GEO: each
 * ships a WebPage + BreadcrumbList + FAQPage JSON-LD block and visible Q&A that
 * answer engines can cite.
 *
 * Accuracy note: platform eligibility (minimum age, vehicle/equipment rules,
 * background-check requirements) and the way pay is structured vary by market
 * and change over time. Copy here states broadly-known, evergreen requirements,
 * always qualified ("requirements vary by market and change — check the
 * platform's current criteria"), and deliberately quotes NO specific dollar or
 * hourly earnings figures. Instead it points to the free calculators so readers
 * compute their own real net pay. This is honest top-of-funnel content, not
 * financial advice and never an income guarantee.
 */

export interface GettingStartedFaq {
  q: string;
  a: string;
}

export interface GettingStartedStep {
  title: string;
  body: string;
}

export interface GettingStartedGuide {
  /** Route slug, also the prerendered file name. */
  slug: string;
  /** Brand name, e.g. "DoorDash". */
  platform: string;
  /** What workers are called, e.g. "Dashers". */
  workerNoun: string;
  /** Short description of the work, e.g. "food delivery". */
  workType: string;
  /** Slug of this platform's tax guide, e.g. "doordash-taxes". */
  taxGuideSlug: string;
  /** Short label for the tax-guide link, e.g. "DoorDash taxes". */
  taxGuideLabel: string;
  /** Eyebrow label above the h1. */
  eyebrow: string;
  /** <title> + WebPage schema name (before the brand suffix). */
  title: string;
  /** Meta description, ≤158 chars. */
  metaDescription: string;
  /** On-page h1. */
  h1: string;
  /** Lead paragraph. */
  intro: string;
  /** "What it is / who it's for" section. */
  whatItIsHeading: string;
  whatItIs: string[];
  /** Eligibility / requirements bullets (broadly known, qualified). */
  requirements: { label: string; desc: string }[];
  /** Step-by-step sign-up list. */
  signupSteps: GettingStartedStep[];
  /** How pay is structured (no dollar figures). */
  payHeading: string;
  payBody: string[];
  /** Tips to earn more. */
  tips: string[];
  /** Honest pros. */
  pros: string[];
  /** Honest cons. */
  cons: string[];
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: GettingStartedFaq[];
}

/**
 * Shared earnings-framing copy. Deliberately quotes NO dollar figures: real net
 * pay depends on market, hours, demand, tips, and vehicle costs, so we send
 * readers to the calculators to compute their own number instead of publishing
 * one that goes stale or misleads.
 */
export const EARNINGS_FRAMING =
  "Be skeptical of any flat hourly figure you see online — what you actually take home depends on your city, the hours you work, demand, tips, and your vehicle costs, and gross pay always overstates it. The honest way to know your real number is to track a few shifts, subtract gas, mileage, and other expenses, and divide by the hours you actually worked. The free Real Hourly Rate calculator and Earnings Consolidator do exactly that math, and if you run more than one app the consolidator compares your true net pay across all of them.";

export const GETTING_STARTED_GUIDES: GettingStartedGuide[] = [
  {
    slug: "how-to-make-money-on-doordash",
    platform: "DoorDash",
    workerNoun: "Dashers",
    workType: "food delivery",
    taxGuideSlug: "doordash-taxes",
    taxGuideLabel: "DoorDash taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money on DoorDash: A Beginner's Guide",
    metaDescription:
      "How to make money on DoorDash: requirements, how to sign up, how Dasher pay works, and how to compute your real net hourly rate. Beginner's guide.",
    h1: "How to Make Money on DoorDash: A Beginner's Guide",
    intro:
      "DoorDash lets you earn on your own schedule by delivering food and other orders to customers nearby. There's no boss, no set hours, and you use your own car, bike, or scooter. This beginner's guide walks through who can do it, how to sign up, how pay actually works, and how to figure out what you'd really take home — without any hype.",
    whatItIsHeading: "What DoorDash is and who it's for",
    whatItIs: [
      "DoorDash is a delivery platform: customers order from restaurants and stores in the app, and Dashers (the drivers) pick up and deliver those orders. You're an independent contractor, not an employee, so you choose when to work and accept or decline each offer.",
      "It suits people who want flexible, on-demand work — a side hustle around another job, a way to fill gaps in your week, or full-time delivery if you treat it like a business. Because you're paid per delivery rather than a guaranteed wage, your results depend heavily on your market and the hours you choose.",
    ],
    requirements: [
      {
        label: "Be at least 18",
        desc: "DoorDash generally requires Dashers to be 18 or older.",
      },
      {
        label: "A way to get around",
        desc: "A car is the most common option; some markets allow bike or scooter delivery. You'll need valid insurance for a vehicle.",
      },
      {
        label: "A smartphone",
        desc: "A reasonably current iPhone or Android phone to run the Dasher app, navigate, and accept offers.",
      },
      {
        label: "A background check",
        desc: "You'll consent to a background check covering your driving and criminal history before you're activated.",
      },
    ],
    signupSteps: [
      {
        title: "Apply in the Dasher app or online",
        body: "Enter your contact details, your city, and the vehicle type you'll use to deliver.",
      },
      {
        title: "Submit your documents",
        body: "Provide a driver's license (for car delivery) and consent to the background check. This step can take a few days to clear.",
      },
      {
        title: "Set up how you get paid",
        body: "Add your bank details for weekly direct deposit, or set up the instant cash-out option if you want faster access (a fee may apply).",
      },
      {
        title: "Get the Dasher gear and go online",
        body: "Once activated, open the app, pick a zone, tap to dash, and start accepting delivery offers when you're ready.",
      },
    ],
    payHeading: "How DoorDash pay works",
    payBody: [
      "DoorDash shows you a guaranteed amount for each delivery before you accept it. That amount combines base pay (which varies with the estimated time, distance, and desirability of the order) plus any active promotions like Peak Pay during busy periods. You keep 100% of customer tips on top of that.",
      "There is no hourly wage or guaranteed minimum for simply being online — you earn per completed delivery. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings are not your take-home. To understand what you really make, you have to subtract those costs.",
    ],
    tips: [
      "Work the busy windows — lunch, dinner, and weekend rushes — when demand and Peak Pay are highest.",
      "Learn which restaurants and zones have short wait times; idle minutes waiting for food lower your real hourly rate.",
      "Decline low-paying, long-distance offers that burn gas and miles for little return.",
      "Track every mile you drive while online — it's both your biggest tax deduction and a key input to your true hourly rate.",
      "Keep your acceptance and completion behavior consistent if you want access to scheduling and program perks in your market.",
    ],
    pros: [
      "Flexible — work whenever you want, no set schedule.",
      "Low barrier to entry and a fast onboarding compared with most jobs.",
      "You see each delivery's guaranteed pay before accepting it.",
      "Weekly deposits with an instant cash-out option.",
    ],
    cons: [
      "No guaranteed wage — slow periods can mean low earnings.",
      "You cover gas, maintenance, and vehicle depreciation yourself.",
      "No taxes are withheld, so you must set money aside and file as self-employed.",
      "Earnings vary a lot by market, time of day, and competition.",
    ],
    faqs: [
      {
        q: "What are the requirements to deliver for DoorDash?",
        a: "You generally need to be at least 18, have a way to deliver (a car in most markets, sometimes a bike or scooter), have a smartphone, and pass a background check. Exact requirements vary by market and change over time, so confirm the current criteria with DoorDash.",
      },
      {
        q: "How much can you make on DoorDash?",
        a: "There's no fixed answer, and you should be wary of any flat figure online. Pay is per delivery plus tips, with no guaranteed wage, and your take-home depends on your market, hours, demand, and vehicle costs. The reliable way to know is to track a few shifts and divide your earnings (after expenses) by the hours you worked — the free Real Hourly Rate calculator does this.",
      },
      {
        q: "Do you need a car to deliver for DoorDash?",
        a: "A car is the most common option, but some markets allow bike or scooter delivery for shorter trips. Availability depends on your city, so check what DoorDash offers where you live.",
      },
      {
        q: "How and when does DoorDash pay you?",
        a: "DoorDash deposits earnings weekly by default, and you can use an instant cash-out option for faster access (a fee may apply). You keep 100% of customer tips.",
      },
      {
        q: "Do you have to pay taxes on DoorDash earnings?",
        a: "Yes. Dashers are independent contractors, so no taxes are withheld and you're responsible for your own income and self-employment taxes. See our DoorDash taxes guide for how it works and what to set aside.",
      },
    ],
  },
  {
    slug: "how-to-make-money-driving-for-uber",
    platform: "Uber",
    workerNoun: "Uber drivers",
    workType: "rideshare",
    taxGuideSlug: "uber-driver-taxes",
    taxGuideLabel: "Uber driver taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money Driving for Uber: A Beginner's Guide",
    metaDescription:
      "How to make money driving for Uber: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    h1: "How to Make Money Driving for Uber: A Beginner's Guide",
    intro:
      "Driving for Uber lets you earn by giving rides on your own schedule using your own car. You decide when to go online, where to drive, and which trips to take. This beginner's guide covers who's eligible, how to sign up, how driver pay is structured, and how to work out what you'd actually keep after costs.",
    whatItIsHeading: "What Uber driving is and who it's for",
    whatItIs: [
      "Uber connects riders who need a trip with nearby drivers. As a driver you're an independent contractor: you use your own vehicle, set your own hours, and accept or decline ride requests in the app. (In many cities you can also deliver with Uber Eats from the same account.)",
      "It fits people who own a qualifying car, enjoy driving, and want flexible income — whether that's a few evenings a week or something closer to full-time. Since pay is per trip rather than a salary, earnings depend a lot on your city, the hours you drive, and demand.",
    ],
    requirements: [
      {
        label: "Meet the minimum age",
        desc: "Rideshare driving typically requires you to be at least 21, and to have held a license for a minimum period. The exact age varies by city.",
      },
      {
        label: "An eligible vehicle",
        desc: "Most markets require a four-door car that meets a model-year and condition standard. Requirements differ by city, and Uber Eats vehicle rules can be looser than rideshare.",
      },
      {
        label: "A valid license and insurance",
        desc: "A current driver's license, vehicle registration, and insurance in your name (or proof you're on the policy).",
      },
      {
        label: "A background and driving-record check",
        desc: "You'll consent to a screening of your driving history and criminal record before you're approved.",
      },
    ],
    signupSteps: [
      {
        title: "Create a driver account",
        body: "Sign up in the Uber Driver app or online with your details and your city.",
      },
      {
        title: "Upload your documents",
        body: "Provide your driver's license, vehicle registration, and proof of insurance, then consent to the background and driving-record check.",
      },
      {
        title: "Pass the vehicle and screening checks",
        body: "Your car may need to meet local requirements (some markets ask for an inspection). Approval can take several days while screening clears.",
      },
      {
        title: "Set up payouts and go online",
        body: "Add your bank details for weekly deposits or set up Instant Pay for faster cash-out, then open the app and toggle online to start receiving ride requests.",
      },
    ],
    payHeading: "How Uber driver pay works",
    payBody: [
      "Uber shows you an upfront fare and trip details before you accept, based largely on the estimated time and distance. During high demand you can earn more through surge pricing and promotions like Quests or Boosts. You keep 100% of any tips riders add.",
      "There's no guaranteed hourly wage for being online — you earn per completed trip. Uber takes a service fee out of fares (a deductible business expense), and because you pay for your own gas, maintenance, and depreciation, your gross fares overstate your real take-home. Subtract those costs to see what you actually make.",
    ],
    tips: [
      "Drive during peak demand — weekday commutes, weekend nights, events, and bad weather — when surge and promotions are most common.",
      "Position yourself near busy pickup areas instead of driving aimlessly between trips, which wastes gas and miles.",
      "Watch your acceptance of long, low-fare trips that leave you far from demand on the return.",
      "Track all the miles you drive while online, including between trips — they're your biggest tax deduction and a key input to your real hourly rate.",
      "Keep your car clean and your rating high; consistent service unlocks rewards and steadier requests.",
    ],
    pros: [
      "Flexible — you choose when and where to drive.",
      "Upfront fares let you see trip pay before accepting.",
      "Surge and promotions can boost pay during busy periods.",
      "Weekly deposits with an Instant Pay cash-out option.",
    ],
    cons: [
      "Higher entry bar than delivery — stricter age and vehicle requirements.",
      "Driving people adds wear, fuel, and insurance considerations.",
      "No guaranteed wage, and pay swings with demand.",
      "No tax withholding — you file and pay as self-employed.",
    ],
    faqs: [
      {
        q: "What are the requirements to drive for Uber?",
        a: "Rideshare driving typically requires you to be at least 21 (and to have held a license for a minimum time), have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change over time, so confirm the current criteria with Uber.",
      },
      {
        q: "How much can you make driving for Uber?",
        a: "There's no single number, and flat hourly figures online are unreliable. You're paid per trip plus tips, with surge during busy times and no guaranteed wage, and your take-home depends on your city, hours, demand, and car costs. Track a few shifts and divide your earnings (after expenses) by hours worked — the free Real Hourly Rate calculator does this for you.",
      },
      {
        q: "What kind of car do you need to drive for Uber?",
        a: "Most markets require a four-door vehicle that meets a model-year and condition standard, though Uber Eats delivery rules can be looser than rideshare. The exact requirements depend on your city, so check what Uber lists where you live.",
      },
      {
        q: "How and when does Uber pay drivers?",
        a: "Uber pays out weekly by default, and you can use Instant Pay to cash out earnings faster (a fee may apply). You keep 100% of rider tips.",
      },
      {
        q: "Do Uber drivers have to pay taxes?",
        a: "Yes. Uber drivers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our Uber driver taxes guide for how the 1099 forms and deductions work.",
      },
    ],
  },
  {
    slug: "how-to-make-money-with-instacart",
    platform: "Instacart",
    workerNoun: "full-service shoppers",
    workType: "grocery shopping and delivery",
    taxGuideSlug: "instacart-taxes",
    taxGuideLabel: "Instacart taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money with Instacart: A Shopper's Guide",
    metaDescription:
      "How to make money with Instacart: requirements, how to sign up, how full-service shopper pay works, and how to compute your real net hourly rate.",
    h1: "How to Make Money with Instacart: A Shopper's Guide",
    intro:
      "Instacart lets you earn by shopping for groceries and delivering them to customers on your own schedule. As a full-service shopper you pick the items in-store and drive them to the door. This guide covers who can do it, how to sign up, how pay is structured, and how to figure out your real take-home — honestly, without quoting figures that don't hold up.",
    whatItIsHeading: "What Instacart shopping is and who it's for",
    whatItIs: [
      "Instacart is a grocery-delivery platform. Full-service shoppers — the role this guide covers — use their own car to shop a customer's order at a store and deliver it. You're an independent contractor, so you choose your hours and accept or decline batches (orders) in the Shopper app.",
      "It suits people who don't mind being on their feet in a store, are comfortable picking produce and finding substitutions, and want flexible work. (There's also a separate in-store-only shopper role that's a part-time employee job and doesn't involve driving; this guide is about full-service shopping.)",
    ],
    requirements: [
      {
        label: "Be at least 18",
        desc: "Full-service shoppers generally must be 18 or older.",
      },
      {
        label: "A car and a way to carry groceries",
        desc: "You shop and deliver, so you need reliable transportation; insulated bags help keep cold items fresh.",
      },
      {
        label: "A smartphone",
        desc: "A recent iPhone or Android phone to run the Shopper app, scan items, and communicate with customers.",
      },
      {
        label: "A background check",
        desc: "You'll consent to a background check, and you should be able to lift and carry grocery loads.",
      },
    ],
    signupSteps: [
      {
        title: "Apply to be a full-service shopper",
        body: "Sign up in the Instacart Shopper app or online with your details and city, choosing the full-service (shop and deliver) role.",
      },
      {
        title: "Clear the background check",
        body: "Consent to and pass the background check. This step can take a few days to process.",
      },
      {
        title: "Complete onboarding",
        body: "Finish any required setup or introductory steps in the app so you understand how shopping, substitutions, and delivery work.",
      },
      {
        title: "Set up payouts and start shopping",
        body: "Add your bank details for weekly deposits (or set up instant cash-out where available), then open the app, accept a batch, and begin.",
      },
    ],
    payHeading: "How Instacart shopper pay works",
    payBody: [
      "Instacart pays per batch — an order or sometimes a couple of orders combined. The platform shows an estimated batch pay before you accept, calculated from factors like the number of items, units, and the distance involved. Customer tips are added on top, and you keep 100% of them.",
      "There's no hourly wage; you earn per completed batch. Importantly, your working time includes the minutes spent shopping in the store, not just driving — so compare batches on net pay per active hour. With no tax withholding and your own fuel and vehicle costs to cover, your real take-home is lower than the gross.",
    ],
    tips: [
      "Shop during busy grocery windows — evenings and weekends — when more batches and tips are available.",
      "Get fast and accurate at finding items and handling substitutions; speed directly raises your pay per hour.",
      "Favor batches with a good pay-to-effort ratio rather than grabbing every order regardless of item count or distance.",
      "Communicate well with customers about substitutions — it protects your ratings and your tips.",
      "Track your driving miles and shopping time so you can calculate your real hourly rate, not just gross batch pay.",
    ],
    pros: [
      "Flexible — accept batches whenever you want to work.",
      "You see estimated batch pay before accepting.",
      "Keep 100% of tips, which can be a big share of earnings.",
      "Shopping indoors can be a plus in bad weather versus pure driving gigs.",
    ],
    cons: [
      "Physically demanding — lots of walking, lifting, and time on your feet.",
      "Shopping time isn't separately paid, so per-batch pay can understate your effort.",
      "No guaranteed wage, and batch availability varies by area and time.",
      "No tax withholding — you handle your own self-employment taxes.",
    ],
    faqs: [
      {
        q: "What are the requirements to shop for Instacart?",
        a: "Full-service shoppers generally need to be at least 18, have a car and a smartphone, be able to lift and carry groceries, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with Instacart.",
      },
      {
        q: "How much can you make with Instacart?",
        a: "There's no fixed figure, and online averages are unreliable. You're paid per batch plus tips, with no guaranteed wage, and your working time includes shopping in-store as well as driving. To know your real number, track your active hours and expenses and divide — the free Real Hourly Rate calculator does the math.",
      },
      {
        q: "What's the difference between full-service and in-store shoppers?",
        a: "Full-service shoppers are independent contractors who shop and deliver using their own car; in-store-only shoppers are part-time employees who shop but don't deliver. This guide covers full-service shopping.",
      },
      {
        q: "How and when does Instacart pay shoppers?",
        a: "Instacart pays out weekly, and instant cash-out is available in many areas for faster access (a fee may apply). You keep 100% of customer tips.",
      },
      {
        q: "Do Instacart shoppers have to pay taxes?",
        a: "Full-service shoppers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our Instacart taxes guide for what to set aside and how to file.",
      },
    ],
  },
  {
    slug: "how-to-make-money-with-amazon-flex",
    platform: "Amazon Flex",
    workerNoun: "Amazon Flex drivers",
    workType: "package delivery",
    taxGuideSlug: "amazon-flex-taxes",
    taxGuideLabel: "Amazon Flex taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money with Amazon Flex: A Beginner's Guide",
    metaDescription:
      "How to make money with Amazon Flex: requirements, how to sign up, how delivery-block pay works, and how to compute your real net hourly rate.",
    h1: "How to Make Money with Amazon Flex: A Beginner's Guide",
    intro:
      "Amazon Flex lets you earn by delivering Amazon packages during scheduled blocks of time using your own vehicle. You reserve the blocks that fit your life and get paid for the block. This beginner's guide explains who's eligible, how to sign up, how block pay works, and how to figure out what you'd really take home after costs.",
    whatItIsHeading: "What Amazon Flex is and who it's for",
    whatItIs: [
      "Amazon Flex is Amazon's self-scheduled delivery program. Drivers reserve delivery blocks (set windows of time), pick up packages from an Amazon station or a local business, and deliver them along a route. You're an independent contractor using your own car.",
      "It fits people who prefer scheduling work in advance over waiting for on-demand requests, who have a vehicle with reasonable cargo space, and who want flexible income around other commitments. Block availability and demand vary by location, so where you live matters a lot.",
    ],
    requirements: [
      {
        label: "Be at least 21",
        desc: "Amazon Flex generally requires drivers to be 21 or older.",
      },
      {
        label: "A qualifying vehicle",
        desc: "Most blocks call for a mid-size or larger vehicle with enough cargo space; some routes have specific vehicle requirements that vary by location.",
      },
      {
        label: "A valid license, insurance, and a smartphone",
        desc: "A current driver's license, auto insurance, and a compatible smartphone to run the Amazon Flex app.",
      },
      {
        label: "A background check",
        desc: "You'll consent to a background check before you're approved to deliver.",
      },
    ],
    signupSteps: [
      {
        title: "Download the Amazon Flex app and apply",
        body: "Get the Amazon Flex app, sign in or create an account, and apply for your area. Availability depends on whether your location is currently onboarding drivers.",
      },
      {
        title: "Submit your documents and background check",
        body: "Provide your driver's license and insurance and consent to the background check. Approval can take some time.",
      },
      {
        title: "Set up payment details",
        body: "Add your bank account so Amazon can deposit your block earnings.",
      },
      {
        title: "Reserve a delivery block and deliver",
        body: "Once approved, open the app, reserve an available block that fits your schedule, pick up your packages at the start time, and follow the app's route to deliver them.",
      },
    ],
    payHeading: "How Amazon Flex pay works",
    payBody: [
      "Amazon Flex pays per block rather than per package. When you browse blocks, the app shows the scheduled length and an estimated pay for that block before you reserve it. Unlike rideshare or restaurant delivery, customer tips are not a standard part of most package-delivery blocks.",
      "The estimate assumes a typical block; if a route runs long, your effective hourly rate drops. There's no separate hourly wage, and because no taxes are withheld and you cover your own fuel and vehicle wear, the block pay overstates your real take-home. Subtract your costs and your actual time to see what you net.",
    ],
    tips: [
      "Reserve blocks during higher-demand periods, and check the app often — desirable blocks can be claimed quickly.",
      "Get familiar with your delivery stations and routes so you finish blocks efficiently rather than running over time.",
      "Factor in the unpaid driving to and from the station when you judge whether a block is worth it.",
      "Track every mile you drive during a block, including between stops — it's your biggest tax deduction and a key input to your real hourly rate.",
      "Keep your delivery standards high; reliable on-time delivery helps your standing in the program.",
    ],
    pros: [
      "Schedule work in advance instead of waiting for on-demand requests.",
      "You see a block's estimated pay before reserving it.",
      "Package delivery can be more predictable than passenger rides.",
      "Flexible — reserve only the blocks you want.",
    ],
    cons: [
      "Block availability is limited and varies a lot by location.",
      "Most blocks don't include tips, unlike food delivery or rideshare.",
      "A block that runs long lowers your real hourly rate.",
      "No tax withholding and you cover your own vehicle costs.",
    ],
    faqs: [
      {
        q: "What are the requirements for Amazon Flex?",
        a: "Amazon Flex generally requires you to be at least 21, have a qualifying vehicle (often mid-size or larger with adequate cargo space), carry valid insurance, have a compatible smartphone, and pass a background check. Requirements vary by location and change over time, so confirm the current criteria with Amazon Flex.",
      },
      {
        q: "How much can you make with Amazon Flex?",
        a: "There's no guaranteed figure, and flat hourly numbers online are unreliable. The app shows an estimated pay per block before you reserve it, but if a route runs long your effective rate drops, and you cover your own fuel and vehicle costs. Track your real time and expenses and divide — the free Real Hourly Rate calculator does this for you.",
      },
      {
        q: "What kind of vehicle do you need for Amazon Flex?",
        a: "Most blocks call for a mid-size or larger vehicle with enough cargo space, though specific requirements vary by location and route. Check what Amazon Flex lists for your area before applying.",
      },
      {
        q: "How does Amazon Flex pay you?",
        a: "Amazon Flex pays per block (a scheduled window of deliveries) and deposits earnings to your bank account. Most package-delivery blocks don't include customer tips, unlike food delivery or rideshare.",
      },
      {
        q: "Do Amazon Flex drivers have to pay taxes?",
        a: "Yes. Amazon Flex drivers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our Amazon Flex taxes guide for what to set aside and how to file.",
      },
    ],
  },
];

export function getGettingStartedGuide(
  slug: string
): GettingStartedGuide | undefined {
  return GETTING_STARTED_GUIDES.find(g => g.slug === slug);
}
