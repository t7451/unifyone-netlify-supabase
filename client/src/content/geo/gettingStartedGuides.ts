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
  {
    slug: "how-to-make-money-with-lyft",
    platform: "Lyft",
    workerNoun: "Lyft drivers",
    workType: "rideshare",
    taxGuideSlug: "lyft-driver-taxes",
    taxGuideLabel: "Lyft driver taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money with Lyft: A Beginner's Guide",
    metaDescription:
      "How to make money with Lyft: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    h1: "How to Make Money with Lyft: A Beginner's Guide",
    intro:
      "Driving with Lyft lets you earn by giving rides on your own schedule using your own car. You choose when to go online, where to drive, and which ride requests to take. This beginner's guide covers who's eligible, how to sign up, how driver pay is structured, and how to work out what you'd actually keep after costs.",
    whatItIsHeading: "What driving with Lyft is and who it's for",
    whatItIs: [
      "Lyft connects riders who need a trip with nearby drivers. As a driver you're an independent contractor: you use your own vehicle, set your own hours, and accept or decline ride requests in the Lyft Driver app.",
      "It fits people who own a qualifying car, are comfortable driving passengers, and want flexible income — whether that's a few evenings a week or something closer to full-time. Because pay is per ride rather than a salary, earnings depend a lot on your city, the hours you drive, and demand.",
    ],
    requirements: [
      {
        label: "Meet the minimum age",
        desc: "Rideshare driving typically requires you to be at least 21, and to have held a license for a minimum period. The exact age varies by city.",
      },
      {
        label: "An eligible vehicle",
        desc: "Most markets require a four-door car that meets a model-year and condition standard. Requirements differ by city, so check what Lyft lists where you live.",
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
        body: "Sign up in the Lyft Driver app or online with your details and your city.",
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
        body: "Add your bank details for weekly deposits or set up Express Pay for faster cash-out, then open the app and toggle online to start receiving ride requests.",
      },
    ],
    payHeading: "How Lyft driver pay works",
    payBody: [
      "Lyft shows you the trip details and an upfront amount before you accept, based largely on the estimated time and distance. During busy periods you can earn more through Prime Time (higher pay in high-demand areas) and promotions like ride streaks. You keep 100% of any tips riders add.",
      "There's no guaranteed hourly wage for being online — you earn per completed ride. Lyft takes a service fee out of fares (a deductible business expense), and because you pay for your own gas, maintenance, and depreciation, your gross fares overstate your real take-home. Subtract those costs to see what you actually make.",
    ],
    tips: [
      "Drive during peak demand — weekday commutes, weekend nights, events, and bad weather — when Prime Time and promotions are most common.",
      "Position yourself near busy pickup areas instead of driving aimlessly between rides, which wastes gas and miles.",
      "Watch your acceptance of long, low-fare rides that leave you far from demand on the return.",
      "Track all the miles you drive while online, including between rides — they're your biggest tax deduction and a key input to your real hourly rate.",
    ],
    pros: [
      "Flexible — you choose when and where to drive.",
      "Upfront trip information lets you see ride details before accepting.",
      "Prime Time and promotions can boost pay during busy periods.",
      "Weekly deposits with an Express Pay cash-out option.",
    ],
    cons: [
      "Higher entry bar than delivery — stricter age and vehicle requirements.",
      "Driving people adds wear, fuel, and insurance considerations.",
      "No guaranteed wage, and pay swings with demand.",
      "No tax withholding — you file and pay as self-employed.",
    ],
    faqs: [
      {
        q: "What are the requirements to drive for Lyft?",
        a: "Rideshare driving typically requires you to be at least 21 (and to have held a license for a minimum time), have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change over time, so confirm the current criteria with Lyft.",
      },
      {
        q: "How much can you make driving for Lyft?",
        a: "There's no single number, and flat hourly figures online are unreliable. You're paid per ride plus tips, with Prime Time during busy periods and no guaranteed wage, and your take-home depends on your city, hours, demand, and car costs. Track a few shifts and divide your earnings (after expenses) by hours worked — the free Real Hourly Rate calculator does this for you.",
      },
      {
        q: "What kind of car do you need to drive for Lyft?",
        a: "Most markets require a four-door vehicle that meets a model-year and condition standard. The exact requirements depend on your city, so check what Lyft lists where you live before applying.",
      },
      {
        q: "How and when does Lyft pay drivers?",
        a: "Lyft pays out weekly by default, and you can use Express Pay to cash out earnings faster (a fee may apply). You keep 100% of rider tips.",
      },
      {
        q: "Do Lyft drivers have to pay taxes?",
        a: "Yes. Lyft drivers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our Lyft driver taxes guide for how the 1099 forms and deductions work.",
      },
    ],
  },
  {
    slug: "how-to-make-money-delivering-for-grubhub",
    platform: "Grubhub",
    workerNoun: "Grubhub drivers",
    workType: "food delivery",
    taxGuideSlug: "grubhub-taxes",
    taxGuideLabel: "Grubhub taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money Delivering for Grubhub: A Beginner's Guide",
    metaDescription:
      "How to make money delivering for Grubhub: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate.",
    h1: "How to Make Money Delivering for Grubhub: A Beginner's Guide",
    intro:
      "Grubhub lets you earn on your own schedule by delivering food orders to customers nearby. You use your own car, bike, or scooter and choose when to work. This beginner's guide walks through who can do it, how to sign up, how pay actually works, and how to figure out what you'd really take home — without any hype.",
    whatItIsHeading: "What delivering for Grubhub is and who it's for",
    whatItIs: [
      "Grubhub is a food-delivery platform: customers order from restaurants in the app, and Grubhub drivers pick up and deliver those orders. You're an independent contractor, not an employee, so you choose when to work and accept or decline offers.",
      "It suits people who want flexible, on-demand work — a side hustle around another job, a way to fill gaps in your week, or full-time delivery if you treat it like a business. Because you're paid per delivery rather than a guaranteed wage, your results depend heavily on your market and the hours you choose.",
    ],
    requirements: [
      {
        label: "Be at least 18",
        desc: "Grubhub generally requires drivers to be 18 or older.",
      },
      {
        label: "A way to get around",
        desc: "A car is the most common option; some markets allow bike or scooter delivery. You'll need valid insurance for a vehicle.",
      },
      {
        label: "A smartphone",
        desc: "A reasonably current iPhone or Android phone to run the Grubhub for Drivers app, navigate, and accept offers.",
      },
      {
        label: "A background check",
        desc: "You'll consent to a background check before you're activated to deliver.",
      },
    ],
    signupSteps: [
      {
        title: "Apply on the Grubhub for Drivers site or app",
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
        title: "Schedule blocks or go available and deliver",
        body: "Once activated, open the app, schedule a delivery block or toggle available where allowed, and start accepting offers when you're ready.",
      },
    ],
    payHeading: "How Grubhub driver pay works",
    payBody: [
      "Grubhub pays per delivery, combining a base amount (which varies with the estimated mileage, time, and any waiting at the restaurant) plus mission or promotional bonuses where offered. You keep 100% of customer tips on top of that.",
      "There is no hourly wage or guaranteed minimum for simply being available — you earn per completed delivery. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings are not your take-home. To understand what you really make, you have to subtract those costs.",
    ],
    tips: [
      "Work the busy windows — lunch, dinner, and weekend rushes — when demand and bonuses are highest.",
      "Learn which restaurants and zones have short wait times; idle minutes waiting for food lower your real hourly rate.",
      "Decline low-paying, long-distance offers that burn gas and miles for little return.",
      "Track every mile you drive while delivering — it's both your biggest tax deduction and a key input to your true hourly rate.",
    ],
    pros: [
      "Flexible — work whenever you want, with scheduling available in many markets.",
      "Low barrier to entry and a fast onboarding compared with most jobs.",
      "You keep 100% of customer tips.",
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
        q: "What are the requirements to deliver for Grubhub?",
        a: "You generally need to be at least 18, have a way to deliver (a car in most markets, sometimes a bike or scooter), have a smartphone, and pass a background check. Exact requirements vary by market and change over time, so confirm the current criteria with Grubhub.",
      },
      {
        q: "How much can you make delivering for Grubhub?",
        a: "There's no fixed answer, and you should be wary of any flat figure online. Pay is per delivery plus tips, with no guaranteed wage, and your take-home depends on your market, hours, demand, and vehicle costs. The reliable way to know is to track a few shifts and divide your earnings (after expenses) by the hours you worked — the free Real Hourly Rate calculator does this.",
      },
      {
        q: "Do you need a car to deliver for Grubhub?",
        a: "A car is the most common option, but some markets allow bike or scooter delivery for shorter trips. Availability depends on your city, so check what Grubhub offers where you live.",
      },
      {
        q: "How and when does Grubhub pay you?",
        a: "Grubhub deposits earnings weekly by default, and you can use an instant cash-out option for faster access (a fee may apply). You keep 100% of customer tips.",
      },
      {
        q: "Do you have to pay taxes on Grubhub earnings?",
        a: "Yes. Grubhub drivers are independent contractors, so no taxes are withheld and you're responsible for your own income and self-employment taxes. See our Grubhub taxes guide for how it works and what to set aside.",
      },
    ],
  },
  {
    slug: "how-to-make-money-as-a-spark-driver",
    platform: "Spark Driver",
    workerNoun: "Spark drivers",
    workType: "delivery for Walmart",
    taxGuideSlug: "spark-driver-taxes",
    taxGuideLabel: "Spark Driver taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money as a Spark Driver: A Beginner's Guide",
    metaDescription:
      "How to make money as a Spark driver: requirements, how to sign up, how Walmart delivery pay works, and how to compute your real net hourly rate.",
    h1: "How to Make Money as a Spark Driver: A Beginner's Guide",
    intro:
      "The Spark Driver platform lets you earn by delivering orders for Walmart and other businesses on your own schedule using your own car. You accept the offers that fit your day and deliver them along a route. This beginner's guide covers who's eligible, how to sign up, how pay is structured, and how to figure out what you'd really take home after costs.",
    whatItIsHeading: "What the Spark Driver platform is and who it's for",
    whatItIs: [
      "The Spark Driver platform is Walmart's delivery program. Spark drivers pick up customer orders — often groceries and general merchandise — from a Walmart store or other location and deliver them to the door. You're an independent contractor using your own vehicle, accepting or declining offers in the Spark Driver app.",
      "It fits people who have a reliable car, don't mind some loading and lifting, and want flexible income around other commitments. Offer volume and demand vary by location and by the stores near you, so where you live matters a lot.",
    ],
    requirements: [
      {
        label: "Be at least 18",
        desc: "The Spark Driver platform generally requires drivers to be 18 or older.",
      },
      {
        label: "A reliable vehicle",
        desc: "You shop or pick up and deliver, so you need a car with room for orders; some grocery deliveries are large, so cargo space helps.",
      },
      {
        label: "A valid license, insurance, and a smartphone",
        desc: "A current driver's license, auto insurance, and a compatible smartphone to run the Spark Driver app.",
      },
      {
        label: "A background check",
        desc: "You'll consent to a background check before you're approved to deliver.",
      },
    ],
    signupSteps: [
      {
        title: "Apply on the Spark Driver site or app",
        body: "Sign up with your details and city. Availability depends on whether the zones near you are currently onboarding drivers.",
      },
      {
        title: "Submit your documents and background check",
        body: "Provide your driver's license and insurance and consent to the background check. Approval can take some time to clear.",
      },
      {
        title: "Set up how you get paid",
        body: "Connect the platform's payment account so you can receive your earnings, and set up the cash-out option if you want faster access.",
      },
      {
        title: "Accept an offer and deliver",
        body: "Once approved, open the app, review the available offers and their details, accept one that's worth it to you, pick up the order, and follow the route to deliver.",
      },
    ],
    payHeading: "How Spark Driver pay works",
    payBody: [
      "The Spark Driver app shows you the details and an estimated pay for each offer before you accept it, based on factors like distance and the size or type of the order. Some offers are single deliveries and others are batched (multiple orders at once). You keep 100% of customer tips on top.",
      "There's no guaranteed hourly wage — you earn per completed offer. Because no taxes are withheld and you cover your own fuel and vehicle wear, your gross earnings overstate your take-home. Subtract those costs and your actual time to see what you net.",
    ],
    tips: [
      "Check the app during busy windows — grocery and shopping peaks like evenings and weekends — when more offers tend to be available.",
      "Weigh each offer's pay against its distance and how many stops it has before accepting, rather than grabbing every offer.",
      "Get familiar with the stores you pick up from so you load and start your route efficiently.",
      "Track every mile you drive while delivering — it's your biggest tax deduction and a key input to your real hourly rate.",
    ],
    pros: [
      "Flexible — accept only the offers you want, when you want.",
      "You see an offer's estimated pay and details before accepting it.",
      "You keep 100% of customer tips.",
      "Deposits with a cash-out option for faster access.",
    ],
    cons: [
      "No guaranteed wage — offer volume varies by location and time.",
      "You cover gas, maintenance, and vehicle depreciation yourself.",
      "Grocery orders can mean significant loading and lifting.",
      "No tax withholding — you file and pay as self-employed.",
    ],
    faqs: [
      {
        q: "What are the requirements to be a Spark driver?",
        a: "You generally need to be at least 18, have a reliable vehicle, carry valid insurance, have a smartphone, and pass a background check. Requirements vary by location and change over time, so confirm the current criteria on the Spark Driver platform.",
      },
      {
        q: "How much can you make as a Spark driver?",
        a: "There's no fixed answer, and flat figures online are unreliable. You're paid per offer plus tips, with no guaranteed wage, and your take-home depends on your area, hours, demand, and vehicle costs. Track a few shifts and divide your earnings (after expenses) by the hours you worked — the free Real Hourly Rate calculator does this.",
      },
      {
        q: "What do Spark drivers deliver?",
        a: "Spark drivers deliver orders for Walmart and other businesses — often groceries and general merchandise — picked up from a store or location and dropped at the customer's door. The mix of offers depends on the stores near you.",
      },
      {
        q: "How and when does the Spark Driver platform pay you?",
        a: "Earnings are deposited to the platform's connected payment account, with a cash-out option for faster access in many areas (a fee may apply). You keep 100% of customer tips.",
      },
      {
        q: "Do Spark drivers have to pay taxes?",
        a: "Yes. Spark drivers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our Spark Driver taxes guide for what to set aside and how to file.",
      },
    ],
  },
  {
    slug: "how-to-make-money-on-taskrabbit",
    platform: "TaskRabbit",
    workerNoun: "Taskers",
    workType: "task and handyman work",
    taxGuideSlug: "taskrabbit-taxes",
    taxGuideLabel: "TaskRabbit taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money on TaskRabbit: A Beginner's Guide",
    metaDescription:
      "How to make money on TaskRabbit: requirements, how to sign up, how Tasker pay works, and how to compute your real net hourly rate. Beginner's guide.",
    h1: "How to Make Money on TaskRabbit: A Beginner's Guide",
    intro:
      "TaskRabbit lets you earn by doing tasks for clients in your area — things like furniture assembly, moving help, mounting, cleaning, and handyman work. You set your own rates and schedule and choose which jobs to take. This beginner's guide covers who can do it, how to sign up, how pay works, and how to figure out your real take-home — honestly, without quoting figures that don't hold up.",
    whatItIsHeading: "What TaskRabbit is and who it's for",
    whatItIs: [
      "TaskRabbit is a marketplace that connects Taskers with clients who need help with everyday tasks. As a Tasker you're an independent contractor: you list the categories you work in, set your hourly rates, manage your availability, and accept the jobs you want in the app.",
      "It suits people with practical skills — assembly, mounting, moving, cleaning, minor repairs — who want to set their own rates and schedule rather than be paid per quick gig. Because you control your pricing and which jobs you take, your results depend on your skills, your area, and how much you work.",
    ],
    requirements: [
      {
        label: "Be at least 18",
        desc: "TaskRabbit generally requires Taskers to be 18 or older.",
      },
      {
        label: "Skills and any tools the work needs",
        desc: "You bring your own tools and supplies for the task categories you choose, such as a drill for assembly or supplies for cleaning.",
      },
      {
        label: "A smartphone and a way to get to jobs",
        desc: "A reasonably current phone to run the Tasker app and manage jobs, plus reliable transportation to client locations.",
      },
      {
        label: "Registration and a background check",
        desc: "You'll complete the registration steps and consent to a background check, and some markets charge a one-time registration fee.",
      },
    ],
    signupSteps: [
      {
        title: "Apply to become a Tasker",
        body: "Sign up on the TaskRabbit site or app with your details and city, and select the task categories you want to work in.",
      },
      {
        title: "Set your rates and availability",
        body: "Choose your hourly rates for each category and set the hours and areas you're willing to work.",
      },
      {
        title: "Complete registration and the background check",
        body: "Finish the onboarding steps, pay any one-time registration fee for your market, and consent to the background check. This can take a few days to clear.",
      },
      {
        title: "Set up payouts and accept jobs",
        body: "Connect your payment details, then start receiving and accepting job requests that match your categories, rates, and schedule.",
      },
    ],
    payHeading: "How TaskRabbit pay works",
    payBody: [
      "On TaskRabbit you set your own hourly rate for each category, and you're typically paid for the time a job takes. Clients book based on your rates and reviews, and TaskRabbit deducts a service fee from your earnings (which is a deductible business expense). Clients can also add a tip, which you keep.",
      "There's no guaranteed wage — you earn from the jobs you actually complete. Because no taxes are withheld and you cover your own tools, supplies, and travel, your gross earnings overstate your take-home. To know your real number, subtract those costs and the time you spend traveling and preparing.",
    ],
    tips: [
      "Build a strong profile with clear skills, photos of past work, and prompt replies — reviews and responsiveness drive bookings.",
      "Set rates that reflect your skill and local demand rather than racing to the bottom; specialized work often supports higher rates.",
      "Cluster jobs by area and category to cut unpaid travel time between clients.",
      "Track the miles you drive to jobs and the supplies you buy — they're deductions and inputs to your real hourly rate.",
    ],
    pros: [
      "You set your own rates and schedule.",
      "Skilled and specialized work can command higher pay.",
      "You choose which jobs and categories to take.",
      "You keep 100% of any client tips.",
    ],
    cons: [
      "No guaranteed wage, and bookings depend on demand and your reviews.",
      "You supply your own tools, supplies, and transportation.",
      "Some markets charge a one-time registration fee, and a service fee applies.",
      "No tax withholding — you handle your own self-employment taxes.",
    ],
    faqs: [
      {
        q: "What are the requirements to become a Tasker?",
        a: "You generally need to be at least 18, bring the skills and tools for the categories you choose, have a smartphone and a way to reach jobs, complete registration, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with TaskRabbit.",
      },
      {
        q: "How much can you make on TaskRabbit?",
        a: "There's no fixed figure, and online averages are unreliable. You set your own hourly rates and earn from completed jobs, minus a service fee, and your take-home depends on your skills, rates, area, and costs. Track your active hours and expenses and divide — the free Real Hourly Rate calculator does the math.",
      },
      {
        q: "Do you set your own rates on TaskRabbit?",
        a: "Yes. Taskers set their own hourly rate for each task category, and clients book based on those rates and your reviews. TaskRabbit deducts a service fee from your earnings.",
      },
      {
        q: "How and when does TaskRabbit pay you?",
        a: "TaskRabbit pays out your earnings (after its service fee) to your connected payment account once a job is completed and approved. You keep 100% of any client tips.",
      },
      {
        q: "Do Taskers have to pay taxes?",
        a: "Yes. Taskers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our TaskRabbit taxes guide for what to set aside and how to file.",
      },
    ],
  },
  {
    slug: "how-to-make-money-with-rover",
    platform: "Rover",
    workerNoun: "Rover sitters and walkers",
    workType: "pet care",
    taxGuideSlug: "rover-taxes",
    taxGuideLabel: "Rover taxes",
    eyebrow: "Getting Started Guide",
    title: "How to Make Money with Rover: A Beginner's Guide",
    metaDescription:
      "How to make money with Rover: requirements, how to sign up, how sitter and walker pay works, and how to compute your real net hourly rate.",
    h1: "How to Make Money with Rover: A Beginner's Guide",
    intro:
      "Rover lets you earn by caring for pets — boarding, house sitting, drop-in visits, doggy day care, and dog walking — on your own schedule. You set your own rates and services and choose which bookings to accept. This beginner's guide covers who can do it, how to sign up, how pay works, and how to figure out your real take-home — honestly, without quoting figures that don't hold up.",
    whatItIsHeading: "What Rover is and who it's for",
    whatItIs: [
      "Rover is a marketplace that connects pet owners with sitters and walkers. As a sitter you're an independent contractor: you create a profile, list the services you offer (such as boarding, drop-in visits, or walks), set your own prices, and accept or decline booking requests in the app.",
      "It suits animal lovers who are reliable, comfortable handling pets, and want to set their own rates and schedule. Whether you board dogs at home, visit clients' homes, or walk dogs nearby, your results depend on your services, your area, your reviews, and how much you take on.",
    ],
    requirements: [
      {
        label: "Be at least 18",
        desc: "Rover generally requires sitters and walkers to be 18 or older.",
      },
      {
        label: "Comfort and reliability with animals",
        desc: "You should be comfortable handling the pets and services you list; if you board, you need a safe, pet-friendly space at home.",
      },
      {
        label: "A smartphone",
        desc: "A reasonably current phone to run the Rover app, message owners, share updates, and manage bookings.",
      },
      {
        label: "Profile approval and a background check",
        desc: "You'll build a profile for approval and consent to a background check before you can start accepting bookings.",
      },
    ],
    signupSteps: [
      {
        title: "Create your sitter profile",
        body: "Sign up on the Rover site or app, describe your experience with pets, and choose the services you want to offer.",
      },
      {
        title: "Set your services, rates, and availability",
        body: "List services like boarding, house sitting, drop-in visits, day care, or walks, set your own prices, and mark when and where you're available.",
      },
      {
        title: "Submit for approval and the background check",
        body: "Complete your profile for review and consent to the background check. Approval can take a little time to clear.",
      },
      {
        title: "Set up payouts and accept bookings",
        body: "Connect your payment details, then start receiving and accepting booking requests that match your services, rates, and schedule.",
      },
    ],
    payHeading: "How Rover pay works",
    payBody: [
      "On Rover you set your own prices for each service, and owners book based on your rates, reviews, and profile. Rover deducts a service fee from your earnings (which is a deductible business expense), and owners can add a tip on top, which you keep. You're paid out for completed bookings.",
      "There's no guaranteed wage — you earn from the bookings you actually complete. Because no taxes are withheld and you cover your own supplies, travel, and any costs of boarding pets at home, your gross earnings overstate your take-home. To know your real number, subtract those costs and the time each booking really takes.",
    ],
    tips: [
      "Build a strong profile with clear photos, your experience, and prompt replies — reviews and responsiveness drive bookings.",
      "Offer the services that fit your situation well, and price them for your skill and local demand rather than racing to the bottom.",
      "Keep great communication with owners — photo updates and reliability protect your reviews and repeat bookings.",
      "Track the miles you drive to visits or walks and the supplies you buy — they're deductions and inputs to your real hourly rate.",
    ],
    pros: [
      "You set your own services, rates, and schedule.",
      "Repeat clients and good reviews can build steady bookings.",
      "You choose which bookings to accept.",
      "You keep 100% of any owner tips.",
    ],
    cons: [
      "No guaranteed wage, and bookings depend on demand and your reviews.",
      "Pet care is hands-on and can include nights, weekends, and holidays.",
      "A service fee applies, and boarding at home has its own costs.",
      "No tax withholding — you handle your own self-employment taxes.",
    ],
    faqs: [
      {
        q: "What are the requirements to become a Rover sitter?",
        a: "You generally need to be at least 18, be comfortable and reliable with animals (and have a pet-friendly space if you board), have a smartphone, build a profile for approval, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with Rover.",
      },
      {
        q: "How much can you make on Rover?",
        a: "There's no fixed figure, and online averages are unreliable. You set your own prices and earn from completed bookings, minus a service fee, and your take-home depends on your services, rates, area, reviews, and costs. Track your active hours and expenses and divide — the free Real Hourly Rate calculator does the math.",
      },
      {
        q: "What services can you offer on Rover?",
        a: "Common services include overnight boarding, house sitting, drop-in visits, doggy day care, and dog walking. You choose which to offer based on your situation, and you set the price for each.",
      },
      {
        q: "How and when does Rover pay you?",
        a: "Rover pays out your earnings (after its service fee) to your connected payment account after a booking is completed. You keep 100% of any owner tips.",
      },
      {
        q: "Do Rover sitters have to pay taxes?",
        a: "Yes. Rover sitters and walkers are independent contractors, so no taxes are withheld and you owe your own income and self-employment taxes. See our Rover taxes guide for what to set aside and how to file.",
      },
    ],
  },
];

export function getGettingStartedGuide(
  slug: string
): GettingStartedGuide | undefined {
  return GETTING_STARTED_GUIDES.find(g => g.slug === slug);
}
