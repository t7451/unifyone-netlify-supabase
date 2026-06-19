/**
 * routeSeo.ts — per-route SEO metadata for non-SEO-landing routes.
 *
 * These routes set their real <title>/<meta description> at runtime via React
 * Helmet / the SEO head component, which no-JS crawlers never execute — so the
 * static prerender (vite-plugin-prerender-seo) previously fell back to the
 * homepage's title + description on all of them (duplicate titles, generic
 * descriptions). This registry gives the prerender per-route meta so each
 * static HTML file ships its own accurate, aligned, ≤158-char description and a
 * unique title. Values mirror each page's real on-page meta.
 *
 * Keep every `description` ≤158 characters (Ahrefs/Google snippet limit).
 */
export interface RouteSeo {
  path: string;
  title: string;
  description: string;
  /**
   * Optional pre-hydration body paragraphs. The prerender renders these (plus a
   * unique h1 and an internal-links nav) into the static HTML so crawlers see
   * real per-page content. When omitted, the description is used as the intro.
   */
  body?: string[];
  /**
   * Optional authoritative outbound links rendered (crawler-visible) into the
   * prerendered page — used where genuinely relevant (e.g. IRS pages for tax
   * tools, platform sites for gig tools) to give each page a real outbound
   * link profile and improve E-E-A-T.
   */
  externalLinks?: { label: string; url: string }[];
}

// Reusable authoritative outbound links.
const IRS = {
  mileage: {
    label: "IRS standard mileage rates",
    url: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
  },
  estimated: {
    label: "IRS estimated taxes",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
  },
  seTax: {
    label: "IRS self-employment tax",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
  },
  selfEmployedCenter: {
    label: "IRS Self-Employed Individuals Tax Center",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
};
const PLATFORMS = [
  { label: "DoorDash", url: "https://www.doordash.com" },
  { label: "Uber Eats", url: "https://www.ubereats.com" },
  { label: "Instacart", url: "https://www.instacart.com" },
];

// Authoritative resources for the platform-specific tax guides: the IRS
// self-employed center + estimated taxes, plus the relevant platform site.
const DOORDASH_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "DoorDash", url: "https://www.doordash.com" },
];
const UBER_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Uber", url: "https://www.uber.com" },
];
const INSTACART_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.mileage,
  { label: "Instacart", url: "https://www.instacart.com" },
];

// State tax-agency links for the state-level gig-worker tax guides. Each guide
// pairs the IRS self-employed/estimated/SE-tax links with its state's agency so
// the prerendered page ships an authoritative outbound link profile.
const CA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "California Franchise Tax Board (Form 540-ES)",
    url: "https://www.ftb.ca.gov/pay/estimated-tax-payments.html",
  },
];
const TX_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  { label: "Texas Comptroller", url: "https://comptroller.texas.gov/" },
];
const FL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Florida Department of Revenue",
    url: "https://floridarevenue.com/",
  },
];
const NY_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "NY Dept. of Taxation and Finance (Form IT-2105)",
    url: "https://www.tax.ny.gov/pit/estimated_tax/default.htm",
  },
];
const IL_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Illinois Department of Revenue (Form IL-1040-ES)",
    url: "https://tax.illinois.gov/individuals/estimatedpayments.html",
  },
];
const WA_TAX_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  IRS.seTax,
  {
    label: "Washington Department of Revenue",
    url: "https://dor.wa.gov/",
  },
];

export const ROUTE_SEO: RouteSeo[] = [
  {
    path: "/architecture",
    title: "Architecture | UnifyOne by 1Commerce",
    description:
      "Explore UnifyOne's structural pillars — multi-tenant foundation, payment orchestration, automation mesh, social intelligence, and Kai AI.",
  },
  {
    path: "/the-system",
    title: "The System | UnifyOne",
    description:
      "How UnifyOne works: four sequential build phases, ten integrations, and six features that replace three separate SaaS tools.",
  },
  {
    path: "/pricing",
    title: "Pricing | UnifyOne",
    description:
      "UnifyOne pricing: Starter (free forever), Pro ($19/mo), and Scale ($99/mo). Multi-tenant commerce, AI insights, and every payment rail.",
  },
  {
    path: "/about",
    title: "About | UnifyOne by 1Commerce",
    description:
      "UnifyOne is built by 1Commerce (PNW Enterprises) — AI-powered, multi-tenant commerce infrastructure for gig operators and e-commerce teams.",
  },
  {
    path: "/press",
    title: "Press & Media Kit | UnifyOne by 1Commerce",
    description:
      "UnifyOne press and media kit: download brand logos, copy-paste boilerplate, company facts, and category tags. By 1Commerce LLC (PNW Enterprises).",
    body: [
      "UnifyOne is an AI-powered multi-tenant commerce platform by 1Commerce LLC (PNW Enterprises) of Canby, Oregon. This media kit gives press, software directories, and reviewers everything needed to cover or list us accurately.",
      "Download the brand logo (SVG and transparent PNG) and the boilerplate file with the canonical product name, 60-character, 160-character, and 80-word descriptions, category tags, and brand colors. For anything else, email support@1commerce.online.",
    ],
  },
  {
    path: "/contact",
    title: "Contact | UnifyOne",
    description:
      "Get in touch with the UnifyOne team at 1Commerce — questions on multi-tenant commerce, pricing, integrations, partnerships, and support.",
  },
  {
    path: "/tithes",
    title: "Tithes | UnifyOne",
    description:
      "UnifyOne's Tithes program and transparent pricing — Starter free, Pro $19/mo, Scale $99/mo, all driven by one canonical catalog.",
  },
  {
    path: "/documents",
    title: "Documentation | UnifyOne",
    description:
      "UnifyOne documentation — guides, integrations, case studies, and the full build timeline for the multi-tenant commerce platform.",
  },
  {
    path: "/documents/case-studies",
    title: "Case Studies | UnifyOne",
    description:
      "Detailed case studies of UnifyOne platform features: Cathedral Framework, Kai, multi-tenant architecture, Stripe CAPI bridge, and scroll reveals.",
  },
  {
    path: "/documents/integrations",
    title: "Integration Guides | UnifyOne",
    description:
      "Complete integration guides for UnifyOne — Kai, Claude, n8n, Stripe, PayPal, Square, and Shopify connections for operators.",
  },
  {
    path: "/documents/work-proof",
    title: "Build Timeline & Work Proof | UnifyOne",
    description:
      "Complete timeline of 36 development phases, deliverables, and technical achievements for the UnifyOne platform.",
  },
  {
    path: "/tools",
    title: "Free Tools for Gig Workers & Sellers | UnifyOne",
    description:
      "Free tools for 1099 gig workers: mileage, quarterly tax, earnings consolidation, break-even pricing, and cash-flow tracking. No account required.",
  },
  {
    path: "/blog",
    title: "Blog | UnifyOne by 1Commerce",
    description:
      "UnifyOne blog — multi-tenant commerce, gig-economy earnings, AI automation, and digital retail strategy for operators and e-commerce teams.",
  },
  {
    path: "/blog/gig-worker-shift-intelligence",
    title: "Gig Worker Shift Intelligence | UnifyOne Blog",
    description:
      "How shift intelligence turns DoorDash, Uber Eats, and Instacart history into higher net pay — the data gig workers need to optimize shifts.",
  },
  {
    path: "/tools/mileage-deduction-calculator",
    externalLinks: [IRS.mileage],
    title: "IRS Mileage Deduction Calculator for Gig Workers 2025 | UnifyOne",
    description:
      "Free IRS mileage deduction calculator for gig workers. Enter miles driven to see your $0.70/mile deduction and estimated tax savings at 4 federal brackets.",
    body: [
      "Every mile you drive for DoorDash, Uber Eats, Instacart, Amazon Flex, or any 1099 gig is deductible at the IRS standard mileage rate. This free calculator turns your miles into a dollar deduction and shows the estimated tax it saves across four common federal brackets.",
      "Enter your business miles for the year to see your total deduction and how much it lowers your taxable income. For drivers who want their mileage tracked automatically alongside real earnings, UnifyOne consolidates miles, payouts, and expenses in one place.",
    ],
  },
  {
    path: "/tools/quarterly-tax-estimator",
    externalLinks: [IRS.estimated],
    title: "Quarterly Estimated Tax Calculator — 1099 Self-Employed | UnifyOne",
    description:
      "Free 1099 quarterly tax calculator for gig workers. See your SE tax + income tax and exact quarterly payment amounts with 2026 due dates.",
    body: [
      "1099 gig workers owe taxes four times a year, not just in April. This calculator estimates your self-employment tax and federal income tax from your net earnings, then breaks the total into the four quarterly payments the IRS expects — with the 2026 due dates.",
      "Knowing each quarter's number in advance prevents underpayment penalties and April surprises. UnifyOne can derive these estimates from your live earnings so the amount is always current.",
    ],
  },
  {
    path: "/tools/earnings-consolidator",
    externalLinks: PLATFORMS,
    title:
      "Multi-Platform Gig Earnings Consolidator | True Hourly Rate | UnifyOne",
    description:
      "Free gig earnings calculator. See your true hourly rate after expenses across DoorDash, Uber Eats, Instacart, and more — no account required.",
    body: [
      "Gross pay from gig apps hides what you actually keep. This consolidator combines earnings from DoorDash, Uber Eats, Instacart, and more, subtracts mileage and expenses, and shows your true net hourly rate across every platform.",
      "Seeing real net-per-hour side by side reveals which apps and hours are worth your time. UnifyOne keeps this view live by syncing payouts and costs automatically.",
    ],
  },
  {
    path: "/tools/reseller-break-even",
    externalLinks: [
      { label: "eBay", url: "https://www.ebay.com" },
      { label: "Etsy", url: "https://www.etsy.com/sell" },
      { label: "Amazon Seller", url: "https://sell.amazon.com" },
    ],
    title:
      "Reseller Break-Even & Pricing Calculator — eBay, Etsy, Amazon | UnifyOne",
    description:
      "Free reseller pricing calculator. Enter item cost, fees, shipping, and return rate to find your break-even price and target margin on eBay, Etsy, or Amazon.",
    body: [
      "Marketplace fees, shipping, and returns quietly erode reseller margins. This calculator takes your item cost, platform fees, shipping, and expected return rate and tells you the exact break-even price plus the list price you need for a target margin on eBay, Etsy, or Amazon.",
      "Price above break-even with confidence instead of guessing. UnifyOne helps resellers track costs and margins across every channel from one dashboard.",
    ],
  },
  {
    path: "/tools/cashflow-tracker",
    externalLinks: PLATFORMS,
    title:
      "Gig Payout Timing & Cash-Flow Tracker | DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Free gig cash-flow tool. Model when DoorDash, Uber Eats, Instacart, and Lyft payouts hit your bank and forecast your 30-day income rhythm.",
    body: [
      "Gig pay arrives on different schedules — instant cash-outs, weekly deposits, and platform delays all collide. This tool models when DoorDash, Uber Eats, Instacart, and Lyft payouts actually land in your bank so you can forecast your 30-day income rhythm.",
      "A clear payout timeline makes it easier to cover bills and avoid overdrafts between deposits. UnifyOne extends this with live earnings tracking across every platform.",
    ],
  },
  {
    path: "/tools/se-tax-calculator",
    externalLinks: [IRS.seTax],
    title:
      "Self-Employment Tax Calculator for 1099 Gig Workers 2025 | UnifyOne",
    description:
      "Free self-employment tax calculator for DoorDash, Uber, and Instacart 1099 workers. See your SE tax (Social Security + Medicare) and quarterly estimates.",
    body: [
      "Self-employed gig workers pay the full 15.3% self-employment tax — both halves of Social Security and Medicare — on top of income tax. This calculator breaks down your SE tax from net earnings, shows the deductible employer-equivalent half, and estimates your quarterly payments.",
      "Understanding the SE portion separately from income tax makes your real tax burden clear. UnifyOne keeps the numbers current by computing them from your actual platform earnings.",
    ],
  },
  {
    path: "/tools/gig-hourly-rate",
    externalLinks: PLATFORMS,
    title:
      "Gig Worker Real Hourly Rate Calculator — DoorDash, Uber Eats, Instacart | UnifyOne",
    description:
      "Find your true hourly rate from DoorDash, Uber Eats, Instacart, and Grubhub after vehicle costs and miles. Free gig earnings optimizer — compare platforms.",
    body: [
      "The hourly rate a gig app advertises ignores gas, depreciation, and dead miles. This calculator factors vehicle cost-per-mile and your actual driving into a true hourly rate for DoorDash, Uber Eats, Instacart, and Grubhub.",
      "Comparing real net-per-hour across platforms shows where your time pays best. UnifyOne turns this one-off check into continuous optimization across every app you run.",
    ],
  },
  {
    path: "/tools/tax-set-aside",
    externalLinks: [IRS.selfEmployedCenter],
    title:
      "1099 Tax Set-Aside Calculator — How Much to Save for Gig Taxes | UnifyOne",
    description:
      "Find the exact percentage of each gig payment to set aside for taxes. Free calculator for DoorDash, Uber, and Instacart 1099 workers — SE + federal tax.",
    body: [
      "The safest way to avoid a tax-season shortfall is to set aside a percentage of every gig payment as it arrives. This calculator combines self-employment tax and federal income tax to give you one set-aside percentage for DoorDash, Uber, Instacart, and any 1099 income.",
      "Move that share into a separate account each time you cash out and quarterly taxes take care of themselves. UnifyOne can automate the set-aside from your live earnings.",
    ],
  },
  {
    path: "/gig-income-aggregator",
    externalLinks: PLATFORMS,
    title:
      "Gig Income Aggregator — Consolidate DoorDash, Uber, Instacart Earnings | UnifyOne",
    description:
      "Consolidate DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square income in one dashboard. See true net earnings after expenses and true hourly rate.",
  },
  {
    path: "/1099-tax-management",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated],
    title:
      "1099 Tax Management for Gig Workers — Quarterly Estimates & Deductions | UnifyOne",
    description:
      "Automated 1099 tax management for gig workers: quarterly payments from live earnings, SE tax, mileage deductions, and IRS-ready records.",
  },
  {
    path: "/gig-earnings-optimizer",
    externalLinks: PLATFORMS,
    title:
      "Gig Earnings Optimizer — Maximize Net Pay Across DoorDash, Uber, Instacart | UnifyOne",
    description:
      "Find which gig apps and shifts generate the highest net pay after expenses. UnifyOne compares real net earnings per hour across all platforms.",
  },
  {
    path: "/financial-intelligence-gig-workers",
    title:
      "Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne",
    description:
      "AI-powered financial intelligence for gig workers: real-time earnings analysis, tax forecasting, and net income visibility across all platforms.",
  },
  {
    path: "/gig-route-intelligence",
    externalLinks: PLATFORMS,
    title:
      "Gig Route Intelligence — Optimize Delivery Zones for Higher Net Pay | UnifyOne",
    description:
      "Discover which delivery zones generate your highest net pay per hour. UnifyOne maps your actual earnings history to show where your time is worth most.",
  },
  {
    path: "/doordash-taxes",
    externalLinks: DOORDASH_TAX_LINKS,
    title:
      "DoorDash Taxes: A Dasher's Guide to 1099 Filing & Deductions | UnifyOne",
    description:
      "How DoorDash taxes work for Dashers: the 1099-NEC, self-employment tax, what to set aside, mileage deductions, and quarterly payments. Not tax advice.",
    body: [
      "DoorDash doesn't withhold taxes from your pay. As a Dasher you're an independent contractor, so you owe federal and state income tax plus the 15.3% self-employment tax on your net earnings.",
      "If you earned $600 or more, DoorDash issues a 1099-NEC through Stripe. Below that you may not get a form — but you still have to report all income to the IRS.",
      "Your largest deduction is business mileage at the IRS standard mileage rate for every mile driven while dashing. Phone use, hot bags, tolls, and parking are deductible too. A common rule of thumb is to set aside 25–30% of net earnings for taxes.",
      "Independent contractors generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an IRS underpayment penalty.",
    ],
  },
  {
    path: "/uber-driver-taxes",
    externalLinks: UBER_TAX_LINKS,
    title:
      "Uber Driver Taxes: 1099-K vs 1099-NEC, Deductions & Estimates | UnifyOne",
    description:
      "Uber driver taxes explained: the 1099-K vs 1099-NEC, your Tax Summary, self-employment tax, mileage deductions, and quarterly estimates. Not tax advice.",
    body: [
      "Uber treats drivers as independent contractors and withholds no taxes. You owe income tax plus the 15.3% self-employment tax on your net earnings, whether you drive UberX, Uber Eats, or both.",
      "Uber may send two forms: a 1099-K for the gross fares riders and customers paid, and a 1099-NEC for incentives, referrals, and bonuses. Your Uber Tax Summary reconciles both — and you must report all earnings regardless of which forms arrive.",
      "Business mileage at the IRS standard mileage rate is usually the biggest deduction, and because Uber only reports online miles, your real deductible mileage is often higher. Service fees, phone use, tolls, and rider amenities are deductible too.",
      "If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments — around April 15, June 15, September 15, and January 15.",
    ],
  },
  {
    path: "/instacart-taxes",
    externalLinks: INSTACART_TAX_LINKS,
    title:
      "Instacart Taxes: A Shopper's Guide to 1099s & Deductions | UnifyOne",
    description:
      "Instacart taxes for full-service shoppers: the 1099-NEC, self-employment tax, mileage and supply deductions, and quarterly payments. Not tax advice.",
    body: [
      "How you're taxed on Instacart depends on your role. Full-service shoppers who shop and deliver are independent contractors responsible for their own taxes; in-store-only shoppers are part-time W-2 employees with taxes withheld.",
      "Full-service shoppers who earned $600 or more receive a 1099-NEC, usually delivered through Stripe by late January. You must report all income even if a form doesn't arrive.",
      "Full-service shoppers can deduct business mileage at the IRS standard mileage rate, plus phone use, insulated bags, and other supplies. A common rule of thumb is to set aside 25–30% of net earnings for self-employment and income tax.",
      "Independent-contractor shoppers generally pay estimated taxes four times a year — around April 15, June 15, September 15, and January 15 — to avoid an underpayment penalty.",
    ],
  },
  {
    path: "/gig-taxes",
    externalLinks: [
      IRS.selfEmployedCenter,
      IRS.estimated,
      IRS.seTax,
      IRS.mileage,
    ],
    title: "Gig Worker Taxes: The Complete Guide | UnifyOne",
    description:
      "The complete gig worker tax guide: the 15.3% self-employment tax, 1099s, deductions, quarterly estimates, plus platform and state breakdowns. Not tax advice.",
    body: [
      "Gig platforms pay you as an independent contractor and withhold nothing, so you handle your own taxes. You owe federal income tax plus the 15.3% self-employment tax (12.4% Social Security + 2.9% Medicare) on your net earnings, in every state.",
      "Your biggest deduction is business mileage at the IRS standard mileage rate, alongside the business-use share of your phone, supplies, tolls, and parking. You must report all income whether or not a platform sends a 1099-NEC or 1099-K.",
      "Because nothing is withheld, the IRS expects quarterly estimated payments — generally around April 15, June 15, September 15, and January 15 — if you'll owe $1,000 or more for the year, to avoid an underpayment penalty.",
      "From here, see the platform-specific guides (DoorDash, Uber, Instacart) and the state-specific guides (California, Texas, Florida, New York, Illinois, Washington) for how the rules apply to you. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/california-gig-worker-taxes",
    externalLinks: CA_TAX_LINKS,
    title:
      "California Gig Worker Taxes: SE Tax, State Income Tax & Estimates | UnifyOne",
    description:
      "California gig worker taxes: the 15.3% federal SE tax plus CA state income tax, FTB estimated payments (Form 540-ES), mileage deductions. Not tax advice.",
    body: [
      "Gig platforms pay California workers as independent contractors and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "California also has a progressive state income tax, with rates reaching roughly 13.3% at the very top, that applies to your net gig profit on top of federal tax. Pay California estimates to the Franchise Tax Board using Form 540-ES.",
      "Your biggest deduction is business mileage at the IRS standard mileage rate, alongside the business-use share of your phone, supplies, tolls, and parking. App-based drivers are generally treated as independent contractors under Proposition 22.",
      "Federal and California estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/texas-gig-worker-taxes",
    externalLinks: TX_TAX_LINKS,
    title:
      "Texas Gig Worker Taxes: No State Income Tax, but SE Tax Still Applies | UnifyOne",
    description:
      "Texas gig worker taxes: there's no Texas state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Texas has no personal state income tax, so you won't file a state income-tax return on your gig earnings and there are no state estimated payments to make.",
      "Your gig income is not tax-free, though. The federal rules are the same in every state: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Track business mileage and deduct it at the IRS standard mileage rate — usually the largest deduction — along with the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not you get a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/florida-gig-worker-taxes",
    externalLinks: FL_TAX_LINKS,
    title:
      "Florida Gig Worker Taxes: No State Income Tax, Federal & SE Tax Only | UnifyOne",
    description:
      "Florida gig worker taxes: no Florida state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Florida has no personal state income tax, so there's no state income-tax return on your gig earnings and no state estimated payments to make.",
      "Federal taxes still apply the same as everywhere else: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking. You must report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-york-gig-worker-taxes",
    externalLinks: NY_TAX_LINKS,
    title:
      "New York Gig Worker Taxes: State & NYC Income Tax, SE Tax, IT-2105 | UnifyOne",
    description:
      "New York gig worker taxes: the 15.3% federal SE tax plus NY state income tax (and NYC local tax for city residents), estimated via Form IT-2105. Not advice.",
    body: [
      "New York gig platforms pay you as an independent contractor with nothing withheld, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "New York also levies a progressive state income tax on your net gig profit, and New York City residents owe an additional NYC local income tax on the same earnings. Pay state estimates to the Department of Taxation and Finance using Form IT-2105.",
      "Your largest deduction is business mileage at the IRS standard mileage rate, plus the business-use share of your phone, supplies, tolls, and parking — lowering both federal and New York taxable income.",
      "Federal and state estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/illinois-gig-worker-taxes",
    externalLinks: IL_TAX_LINKS,
    title:
      "Illinois Gig Worker Taxes: Flat State Income Tax + Federal SE Tax | UnifyOne",
    description:
      "Illinois gig worker taxes: a flat state income tax (around 4.95%) plus the 15.3% federal SE tax, with IL-1040-ES estimates. Not tax advice.",
    body: [
      "Illinois gig platforms pay you as an independent contractor and withhold nothing, so you owe the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare) and federal income tax on your net earnings.",
      "Illinois has a flat state income tax of roughly 4.95% (confirm the current rate with the Illinois Department of Revenue) that applies to your net gig profit on top of federal tax. Pay state estimates using Form IL-1040-ES.",
      "Deduct business mileage at the IRS standard mileage rate — usually the biggest deduction — plus the business-use share of your phone, supplies, tolls, and parking, lowering your federal and Illinois taxable income.",
      "Federal and Illinois estimates are generally due around April 15, June 15, September 15, and January 15. Report all income whether or not a platform issues a 1099. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/washington-gig-worker-taxes",
    externalLinks: WA_TAX_LINKS,
    title:
      "Washington Gig Worker Taxes: No State Income Tax, Federal & SE Tax | UnifyOne",
    description:
      "Washington gig worker taxes: no personal state income tax, but you still owe federal income tax plus the 15.3% self-employment tax. Not tax advice.",
    body: [
      "Washington has no personal state income tax, so you won't file a state income-tax return on your ordinary gig earnings and there are no state income-tax estimates to make.",
      "Federal taxes still apply in full: federal income tax on your net profit plus the 15.3% federal self-employment tax (12.4% Social Security + 2.9% Medicare), with nothing withheld from your payouts.",
      "Deduct business mileage at the IRS standard mileage rate — typically your largest deduction — plus the business-use share of your phone, supplies, tolls, and parking. Report all income whether or not a platform sends a 1099.",
      "If you expect to owe $1,000 or more in federal tax, the IRS generally expects quarterly estimated payments around April 15, June 15, September 15, and January 15. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/blog/gig-economy-commerce-platform",
    title: "Gig Economy Commerce Platform | UnifyOne Blog",
    description:
      "Why gig-economy operators need a unified commerce platform — consolidating earnings, orders, and analytics across DoorDash, Uber, and more.",
  },
  {
    path: "/blog/multi-tenant-ecommerce-saas",
    title: "Multi-Tenant Ecommerce SaaS | UnifyOne Blog",
    description:
      "What multi-tenant ecommerce SaaS means, how tenant isolation and RBAC work, and how UnifyOne runs many stores from one secure backend.",
  },
  {
    path: "/blog/digital-retail-guide",
    title: "Digital Retail Guide | UnifyOne Blog",
    description:
      "A practical digital retail guide for operators — unifying storefronts, marketplaces, and POS into one multi-tenant commerce system.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | UnifyOne",
    description:
      "UnifyOne Privacy Policy — how 1Commerce LLC collects, uses, and protects your data in compliance with CCPA and GDPR. Last updated March 2026.",
  },
  {
    path: "/terms",
    title: "Terms of Service | UnifyOne",
    description:
      "UnifyOne Terms of Service — usage terms, subscription billing, the Promote & Earn program, data ownership, and liability limits. 1Commerce LLC.",
  },
  {
    path: "/themes",
    title: "Theme Store | UnifyOne — Commerce Themes & Storefront Designs",
    description:
      "Browse free and paid themes for your UnifyOne storefront. Professionally designed for e-commerce and gig worker platforms — preview and install in minutes.",
  },
  {
    path: "/docs-chat",
    title: "Docs Chat | UnifyOne",
    description:
      "Ask questions about UnifyOne documentation — answered instantly by Kai, the built-in Claude-powered AI assistant.",
  },
  {
    path: "/resources",
    title: "Resources | UnifyOne",
    description:
      "Operating excellence resources for gig operators and commerce teams — playbooks, templates, analytics guides, and video walkthroughs. Download free.",
  },
  {
    path: "/sovereign",
    title: "The Sovereign Stack | 1Commerce",
    description:
      "The Sovereign Stack gives gig operators legal protection, financial independence, and resilience. Break free from platform lock-in. Waitlist open.",
  },
  {
    path: "/design-system",
    title: "Design System | UnifyOne",
    description:
      "The UnifyOne design system — Cathedral Framework tokens for color, typography, spacing, and radii, plus the full component library used in the product.",
  },
  {
    path: "/login",
    title: "Sign In | UnifyOne",
    description:
      "Sign in to your UnifyOne workspace — multi-tenant commerce, AI earnings insights, and all your connected stores in one place.",
  },
  {
    path: "/register",
    title: "Create Your Account | UnifyOne",
    description:
      "Start free on UnifyOne — the multi-tenant commerce platform for gig operators and e-commerce teams. No credit card required.",
  },
];
