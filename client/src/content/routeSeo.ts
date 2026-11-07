import { TAX_TOOLS, TAX_TOOL_FAQS, TAX_TOOL_SOURCES } from "./taxTools";
import {
  STATE_TAX_GUIDES,
  HOW_GIG_TAXES_WORK,
  SHARED_DEDUCTIONS,
} from "./geo/stateTaxGuides";
import { CITY_TAX_GUIDES } from "./geo/cityTaxGuides";
import { FINANCE_GUIDES } from "./geo/financeGuides";
import { PLATFORM_TAX_GUIDES } from "./geo/platformTaxGuides";
import {
  TAX_REVIEW,
  TAX_REVIEW_SOURCES,
  RESOURCE_REVIEW_LABEL,
} from "./resourceReview";
import { HOME_TITLE, HOME_DESCRIPTION } from "./marketing";
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

// Authoritative resources for the gig platform comparison guides. The IRS
// self-employed center + estimated taxes anchor the (educational, not advice)
// tax framing; the two platform sites being compared give each page a real,
// relevant outbound link profile.
const PLATFORM_LINKS = {
  doordash: { label: "DoorDash", url: "https://www.doordash.com" },
  uberEats: { label: "Uber Eats", url: "https://www.ubereats.com" },
  uber: { label: "Uber", url: "https://www.uber.com" },
  lyft: { label: "Lyft", url: "https://www.lyft.com" },
  instacart: { label: "Instacart", url: "https://www.instacart.com" },
  grubhub: { label: "Grubhub", url: "https://www.grubhub.com" },
  amazonFlex: { label: "Amazon Flex", url: "https://flex.amazon.com" },
  spark: { label: "Walmart Spark", url: "https://drive4spark.walmart.com" },
  shipt: { label: "Shipt", url: "https://www.shipt.com" },
  taskrabbit: { label: "TaskRabbit", url: "https://www.taskrabbit.com" },
  gopuff: { label: "Gopuff Driver", url: "https://driver.gopuff.com" },
  rover: { label: "Rover", url: "https://www.rover.com" },
  wag: { label: "Wag", url: "https://wagwalking.com" },
  upwork: { label: "Upwork", url: "https://www.upwork.com" },
  fiverr: { label: "Fiverr", url: "https://www.fiverr.com" },
  roadie: { label: "Roadie", url: "https://www.roadie.com" },
  favor: { label: "Favor", url: "https://favordelivery.com" },
};
const DOORDASH_VS_UBER_EATS_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.uberEats,
];
const INSTACART_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.instacart,
  PLATFORM_LINKS.doordash,
];
const UBER_VS_LYFT_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uber,
  PLATFORM_LINKS.lyft,
];
const DOORDASH_VS_GRUBHUB_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.grubhub,
];
const AMAZON_FLEX_VS_SPARK_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.amazonFlex,
  PLATFORM_LINKS.spark,
];
const INSTACART_VS_SHIPT_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.instacart,
  PLATFORM_LINKS.shipt,
];
const UBER_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uber,
  PLATFORM_LINKS.doordash,
];
const UBER_EATS_VS_GRUBHUB_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.uberEats,
  PLATFORM_LINKS.grubhub,
];
const DOORDASH_VS_SPARK_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.doordash,
  PLATFORM_LINKS.spark,
];
const AMAZON_FLEX_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.amazonFlex,
  PLATFORM_LINKS.doordash,
];
const UPWORK_VS_FIVERR_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.upwork,
  PLATFORM_LINKS.fiverr,
];
const GOPUFF_VS_DOORDASH_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.gopuff,
  PLATFORM_LINKS.doordash,
];
const ROVER_VS_WAG_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.rover,
  PLATFORM_LINKS.wag,
];
const LYFT_VS_UBER_EATS_LINKS = [
  IRS.selfEmployedCenter,
  IRS.estimated,
  PLATFORM_LINKS.lyft,
  PLATFORM_LINKS.uberEats,
];

// Getting-started ("how to make money on <platform>") guides: the platform's
// own signup/driver page anchors each page's outbound profile, paired with the
// IRS self-employed center so the (educational, not advice) tax framing is
// authoritative. No earnings figures are quoted on these pages.
const DOORDASH_START_LINKS = [
  { label: "Become a Dasher (DoorDash)", url: "https://dasher.doordash.com" },
  PLATFORM_LINKS.doordash,
  IRS.selfEmployedCenter,
];
const UBER_START_LINKS = [
  { label: "Drive with Uber", url: "https://www.uber.com/us/en/drive/" },
  PLATFORM_LINKS.uber,
  IRS.selfEmployedCenter,
];
const INSTACART_START_LINKS = [
  {
    label: "Become an Instacart shopper",
    url: "https://shoppers.instacart.com",
  },
  PLATFORM_LINKS.instacart,
  IRS.selfEmployedCenter,
];
const AMAZON_FLEX_START_LINKS = [
  { label: "Sign up for Amazon Flex", url: "https://flex.amazon.com" },
  PLATFORM_LINKS.amazonFlex,
  IRS.selfEmployedCenter,
];
const LYFT_START_LINKS = [
  { label: "Drive with Lyft", url: "https://www.lyft.com/drivers" },
  PLATFORM_LINKS.lyft,
  IRS.selfEmployedCenter,
];
const GRUBHUB_START_LINKS = [
  { label: "Become a Grubhub driver", url: "https://driver.grubhub.com" },
  PLATFORM_LINKS.grubhub,
  IRS.selfEmployedCenter,
];
const SPARK_START_LINKS = [
  {
    label: "Join the Spark Driver platform",
    url: "https://drive4spark.walmart.com",
  },
  PLATFORM_LINKS.spark,
  IRS.selfEmployedCenter,
];
const TASKRABBIT_START_LINKS = [
  {
    label: "Become a Tasker (TaskRabbit)",
    url: "https://www.taskrabbit.com/become-a-tasker",
  },
  PLATFORM_LINKS.taskrabbit,
  IRS.selfEmployedCenter,
];
const ROVER_START_LINKS = [
  {
    label: "Become a Rover sitter",
    url: "https://www.rover.com/become-a-sitter/",
  },
  PLATFORM_LINKS.rover,
  IRS.selfEmployedCenter,
];
const SHIPT_START_LINKS = [
  {
    label: "Become a Shipt Shopper",
    url: "https://www.shipt.com/be-a-shopper/",
  },
  PLATFORM_LINKS.shipt,
  IRS.selfEmployedCenter,
];
const GOPUFF_START_LINKS = [
  { label: "Drive with Gopuff", url: "https://driver.gopuff.com" },
  PLATFORM_LINKS.gopuff,
  IRS.selfEmployedCenter,
];
const ROADIE_START_LINKS = [
  { label: "Drive with Roadie", url: "https://www.roadie.com/drivers/" },
  PLATFORM_LINKS.roadie,
  IRS.selfEmployedCenter,
];
const FAVOR_START_LINKS = [
  { label: "Run with Favor", url: "https://favordelivery.com/run-with-favor/" },
  PLATFORM_LINKS.favor,
  IRS.selfEmployedCenter,
];
const WAG_START_LINKS = [
  { label: "Become a Wag walker", url: "https://wagwalking.com/dog-walker" },
  PLATFORM_LINKS.wag,
  IRS.selfEmployedCenter,
];

// Gig finance cluster (money topics beyond taxes): IRS / HealthCare.gov / CFPB.
const HEALTH_LINKS = [
  {
    label: "HealthCare.gov: Coverage for self-employed people",
    url: "https://www.healthcare.gov/self-employed/coverage/",
  },
  IRS.selfEmployedCenter,
];
const DEBT_PAYOFF_LINKS = [
  {
    label: "FTC: Getting out of debt",
    url: "https://consumer.ftc.gov/articles/getting-out-debt",
  },
  IRS.selfEmployedCenter,
];
const SEP_SOLO_LINKS = [
  {
    label: "IRS: One-participant 401(k) plans",
    url: "https://www.irs.gov/retirement-plans/one-participant-401k-plans",
  },
  IRS.selfEmployedCenter,
];
const LLC_SOLEPROP_LINKS = [
  {
    label: "IRS: Business structures",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures",
  },
  IRS.selfEmployedCenter,
];
const W2_GIG_LINKS = [
  {
    label: "IRS: Tax Withholding Estimator",
    url: "https://www.irs.gov/individuals/tax-withholding-estimator",
  },
  IRS.selfEmployedCenter,
];
const MULTI_STATE_LINKS = [
  {
    label: "IRS: State government websites",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/state-government-websites",
  },
  IRS.selfEmployedCenter,
];
const NEW_GIG_CHECKLIST_LINKS = [IRS.estimated, IRS.selfEmployedCenter];
const SE_TAX_EXPLAINED_LINKS = [IRS.seTax, IRS.selfEmployedCenter];
const HOME_OFFICE_LINKS = [
  {
    label: "IRS: Home office deduction",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction",
  },
  IRS.selfEmployedCenter,
];
const TAX_MISTAKES_LINKS = [
  {
    label: "IRS: Gig Economy Tax Center",
    url: "https://www.irs.gov/businesses/gig-economy-tax-center",
  },
  IRS.estimated,
];
const ROTH_IRA_LINKS = [
  {
    label: "IRS: Roth IRAs",
    url: "https://www.irs.gov/retirement-plans/roth-iras",
  },
  IRS.selfEmployedCenter,
];

export const ROUTE_SEO: RouteSeo[] = [
  ...Object.entries(TAX_TOOLS).map(([slug, meta]) => ({
    path: `/tools/${slug}`,
    title: `${meta.title} | UnifyOne`,
    description: meta.description,
    body: [
      "Reviewed November 7, 2026. 2026 planning basis.",
      meta.description,
      ...TAX_TOOL_FAQS.flatMap(({ q, a }) => [q, a]),
    ],
    externalLinks: TAX_TOOL_SOURCES,
  })),
  ...[...STATE_TAX_GUIDES, ...CITY_TAX_GUIDES].map(guide => ({
    path: `/${guide.slug}`,
    title: `${guide.title} | UnifyOne`,
    description: guide.metaDescription,
    body: [
      `Reviewed ${RESOURCE_REVIEW_LABEL}.`,
      guide.intro,
      ...HOW_GIG_TAXES_WORK.map(step => step.body),
      ...("stateBody" in guide ? guide.stateBody : guide.localBody),
      ...SHARED_DEDUCTIONS.map(item => item.desc),
      TAX_REVIEW.nec,
      TAX_REVIEW.k,
      TAX_REVIEW.dates,
      TAX_REVIEW.tips,
      TAX_REVIEW.estimates,
      ...guide.faqs.flatMap(faq => [faq.q, faq.a]),
    ],
    externalLinks: [
      ...TAX_REVIEW_SOURCES,
      ...("stateResources" in guide
        ? guide.stateResources
        : guide.localResources),
    ].map(({ label, href }) => ({ label, url: href })),
  })),
  // Derive reviewed summaries from the same content shown in the guides.
  ...FINANCE_GUIDES.filter(guide =>
    [
      "gig-worker-retirement",
      "gig-worker-bookkeeping",
      "gig-worker-budgeting",
      "gig-worker-emergency-fund",
    ].includes(guide.slug)
  ).map(guide => ({
    path: `/${guide.slug}`,
    title: `${guide.title} | UnifyOne`,
    description: guide.metaDescription,
    body: [
      `Reviewed ${RESOURCE_REVIEW_LABEL}.`,
      guide.intro,
      ...guide.sections.flatMap(section => [
        ...section.body,
        ...(section.sponsoredMention
          ? [
              section.sponsoredMention.label,
              ...section.sponsoredMention.paragraphs,
              section.sponsoredMention.source,
            ]
          : []),
      ]),
    ],
    externalLinks: guide.resources.map(({ label, href }) => ({
      label,
      url: href,
    })),
  })),
  ...PLATFORM_TAX_GUIDES.map(guide => ({
    path: `/${guide.slug}`,
    title: `${guide.title} | UnifyOne`,
    description: guide.metaDescription,
    body: [
      `Reviewed ${RESOURCE_REVIEW_LABEL}. U.S. federal guidance.`,
      guide.intro,
      ...guide.formsBody,
      TAX_REVIEW.nec,
      TAX_REVIEW.k,
      TAX_REVIEW.mileage,
      TAX_REVIEW.dates,
      TAX_REVIEW.tips,
      TAX_REVIEW.se,
      TAX_REVIEW.estimates,
      ...guide.faqs.flatMap(faq => [faq.q, faq.a]),
    ],
    externalLinks: [...TAX_REVIEW_SOURCES, ...(guide.resources ?? [])].map(
      ({ label, href }) => ({
        label,
        url: href,
      })
    ),
  })),

  {
    path: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    body: [
      "Your work is flexible. Your money should feel clear. UnifyOne helps independent workers log earnings, expenses, mileage, and shifts in one place.",
      "Record work from different platforms or clients, review your earnings after expenses, and use the free calculators to plan ahead. Direct connections to gig platforms are not required to log your work.",
      "Start with Gig Starter at no cost or choose Gig Pro for unlimited saved history, a year-round tax dashboard, priority support, and a larger AI allowance. Tax tools provide estimates, not tax filing.",
      "Explore the free calculators without an account, or read the guide library for help with income records, budgeting, and tax planning.",
    ],
  },

  {
    path: "/gig-worker-health-insurance",
    externalLinks: HEALTH_LINKS,
    title:
      "Health Insurance for Gig Workers: Options & the Self-Employed Deduction | UnifyOne",
    description:
      "Health insurance for gig workers: the ACA marketplace and subsidies, spouse/Medicaid coverage, HSAs, and the self-employed health deduction. Not advice.",
    body: [
      "Gig platforms classify you as an independent contractor, so they provide no health insurance — finding your own coverage is part of the job, but the self-employed have several routes and a tax break employees don't get.",
      "Most gig workers buy an individual plan on the ACA marketplace (HealthCare.gov), where income-based subsidies can cut the cost; estimate your variable income carefully. A spouse's employer plan or Medicaid may be cheaper if available.",
      "If you're not eligible for an employer or spouse's plan, you can often take the self-employed health insurance deduction — an above-the-line deduction for premiums that lowers income tax (not the 15.3% SE tax). Pairing a high-deductible plan with an HSA adds more tax-advantaged savings.",
      "Confirm current subsidy and deduction rules with HealthCare.gov and the IRS. This is educational information, not financial or tax advice.",
    ],
  },

  {
    path: "/gig-worker-debt-payoff",
    externalLinks: DEBT_PAYOFF_LINKS,
    title:
      "Paying Off Debt on a Gig Income: Avalanche, Snowball & Cash Flow | UnifyOne",
    description:
      "How gig workers pay off debt on irregular income: budget from a low baseline, choose avalanche vs snowball, and use surplus weeks. Not advice.",
    body: [
      "Paying down debt on income that swings week to week takes a system. Build a small starter buffer first so a slow week doesn't put you right back on a credit card, and keep paying at least the minimum on every debt no matter what.",
      "Choose a method: the avalanche (highest interest first) saves the most money, while the snowball (smallest balance first) gives quicker motivating wins. Both work — pick the one you'll stick with.",
      "On variable income, commit a percentage of each payout to debt rather than a fixed monthly sum, budget essentials from a conservative low-but-typical month, and aim surplus weeks and windfalls at the target balance. Don't raid your tax set-aside — unpaid federal taxes carry penalties and are hard to discharge.",
      "If debt is overwhelming, a non-profit credit counselor can help. This is educational information, not financial advice.",
    ],
  },
  {
    path: "/sep-ira-vs-solo-401k",
    externalLinks: SEP_SOLO_LINKS,
    title:
      "SEP-IRA vs Solo 401(k): Which Is Better for Gig Workers? | UnifyOne",
    description:
      "SEP-IRA vs Solo 401(k) for self-employed gig workers: contributions, Roth options, paperwork, and deadlines compared — and how to choose. Not advice.",
    body: [
      "Both the SEP-IRA and the Solo 401(k) let self-employed gig workers shelter far more than a regular IRA, but they differ on contributions, Roth options, paperwork, and deadlines.",
      "The SEP-IRA is the simplest — free to open in minutes, employer-style percentage contribution only, flexible year to year, and fundable up to your extended filing deadline. The Solo 401(k) adds an employee elective deferral on top of an employer contribution, usually allowing a larger total (especially at moderate income) and often a Roth option.",
      "Trade-offs: the Solo 401(k) needs a bit more paperwork and generally must be established by December 31, while the SEP-IRA is more forgiving on deadlines. You can't max both on the same income, and limits change yearly — confirm them with the IRS.",
      "Pick the SEP-IRA for simplicity, the Solo 401(k) to contribute the most or get a Roth option. This is educational information, not investment advice.",
    ],
  },
  {
    path: "/llc-vs-sole-proprietorship",
    externalLinks: LLC_SOLEPROP_LINKS,
    title:
      "LLC vs Sole Proprietorship for Gig Workers: Do You Need an LLC? | UnifyOne",
    description:
      "LLC vs sole proprietorship for gig workers: liability, taxes, cost, and when an LLC is worth it (and the S-corp question). Not advice.",
    body: [
      "If you drive, deliver, or freelance without forming anything, you're already a sole proprietor: you report on Schedule C, pay self-employment tax, and can deduct the same business expenses. You don't need an LLC to claim deductions.",
      "An LLC is a state-level legal structure whose core benefit is liability protection — separating your personal assets from the business if it's sued or owes a debt. It adds a filing fee and some paperwork, and it adds credibility, but it isn't a tax shield.",
      "By default a single-member LLC is a 'disregarded entity,' taxed exactly like a sole proprietorship — forming one doesn't lower your federal income tax. Tax savings instead come from a separate S-corporation election, which only makes sense above a certain profit level and adds payroll and cost.",
      "Consider an LLC for real liability exposure, and the S-corp election only once profit is consistently high. This is educational information, not legal or tax advice.",
    ],
  },
  {
    path: "/gig-worker-w2-job-taxes",
    externalLinks: W2_GIG_LINKS,
    title: "Gig Work Plus a W-2 Job: How to Handle Taxes on Both | UnifyOne",
    description:
      "Have a W-2 job and gig income? Report gig income on Schedule C, owe self-employment tax, and use extra W-2 withholding to cover it. Not advice.",
    body: [
      "A W-2 job doesn't make your side income tax-free. You report gig (1099) earnings on Schedule C, deduct related expenses, and the net profit is added to your W-2 wages — even if a platform never sends a 1099.",
      "On that net gig profit you also owe self-employment tax (roughly 15.3%) via Schedule SE. Your paycheck already withholds the employee share of Social Security and Medicare on your wages, but your gig profit is separate and isn't covered by it.",
      "Instead of separate quarterly estimates, you can often file a new Form W-4 to withhold extra from your paycheck to cover the gig tax; withholding counts as paid evenly across the year, which helps avoid penalties. The IRS Tax Withholding Estimator helps size it.",
      "Both incomes stack to set your bracket, and W-2 Social Security tax already withheld counts toward the annual wage base. Confirm current figures with the IRS. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/multi-state-gig-taxes",
    externalLinks: MULTI_STATE_LINKS,
    title: "Multi-State Gig Taxes: Working Across State Lines | UnifyOne",
    description:
      "Gig work across state lines or moving mid-year: resident vs nonresident state tax, a credit for taxes paid to other states, and part-year rules. Not advice.",
    body: [
      "If you drive, deliver, or freelance across state lines — or moved partway through the year — your gig income can touch more than one state. The rules are designed so you're rarely taxed twice on the same dollar.",
      "As a general rule, your resident (home) state can tax all of your income wherever earned, while a nonresident state can tax income you physically earned within its borders — for gig workers, typically where the work actually happened.",
      "When both states tax the same income, your resident state usually grants a credit for taxes paid to the other state, offsetting the overlap (generally capped at your home state's tax on that income). Moving mid-year usually means part-year returns in both states.",
      "Reciprocity agreements mostly cover W-2 wages and often exclude gig income, so don't assume one protects you — confirm with each state's Department of Revenue. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/new-gig-worker-tax-checklist",
    externalLinks: NEW_GIG_CHECKLIST_LINKS,
    title:
      "New Gig Worker Tax Checklist: Your First Year of 1099 Income | UnifyOne",
    description:
      "New to gig work? A first-year tax checklist: report all income, set aside 25–30%, log mileage from day one, and learn the quarterly schedule. Not advice.",
    body: [
      "Your first year of gig work is when good habits or expensive mistakes get set. Nothing is withheld, no one hands you a system, and the IRS now treats you as a small business — this checklist covers what to do from day one.",
      "Report all income, even from platforms that send no 1099, and open a separate bank account so your statement doubles as a ledger. From your very first payout, set aside about 25–30% of net for taxes and treat it as money that was never yours.",
      "Start a contemporaneous mileage log immediately — date, miles, and purpose of each trip — since reconstructed mileage is what gets disallowed, and it's usually the biggest deduction. Learn the quarterly estimated-tax schedule and the roughly $1,000-owed threshold.",
      "At tax time you'll file Schedule C and Schedule SE; skipping the set-aside all year is the classic first-year surprise. Confirm current rules with the IRS. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/self-employment-tax-explained",
    externalLinks: SE_TAX_EXPLAINED_LINKS,
    title:
      "Self-Employment Tax Explained: What Gig Workers Pay and Why | UnifyOne",
    description:
      "Self-employment tax explained: the 15.3% rate, how it's figured on 92.35% of net, the deductible half, and the Social Security wage cap. Not advice.",
    body: [
      "Self-employment (SE) tax is the part of gig taxes that surprises people most: it's separate from income tax, it isn't withheld, and it's why a 1099 gig can owe more than a W-2 job at the same pay. As your own employer and employee, you cover the full 15.3% — 12.4% Social Security plus 2.9% Medicare.",
      "SE tax is figured on about 92.35% of your net self-employment profit, not your gross, so every legitimate deduction (like mileage) lowers it. It's on top of regular income tax, which is why setting aside only for income tax leaves gig workers short.",
      "Two things soften it: you deduct one-half of your SE tax above the line (reducing income tax), and the 12.4% Social Security portion only applies up to an annual wage base (Medicare's 2.9% has no cap, and high earners may owe Additional Medicare Tax).",
      "These thresholds change yearly — confirm the current wage base and rules with the IRS. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/gig-worker-home-office-deduction",
    externalLinks: HOME_OFFICE_LINKS,
    title:
      "The Home Office Deduction for Gig Workers: Who Qualifies | UnifyOne",
    description:
      "The home office deduction for gig workers: the regular-and-exclusive-use test, simplified vs actual method, and why drivers often don't qualify. Not advice.",
    body: [
      "The home office deduction is valuable for desk-based gig workers — freelancers, online sellers, tutors — but it has a strict test and doesn't fit every kind of gig work. To qualify you generally must use a specific area of your home both regularly and exclusively for the business, as your principal place of business.",
      "There are two methods: the simplified method (a set IRS rate per square foot, up to a cap, with minimal recordkeeping) and the actual-expense method (the business-use share of rent/mortgage interest, utilities, and insurance). You can pick whichever gives the larger deduction.",
      "Most rideshare and delivery drivers don't qualify — their work happens in the car, and mileage is their big deduction — while desk-based freelancers and sellers who use a dedicated space often do. The deduction lowers the net profit that income tax (and indirectly SE tax) is figured on.",
      "Confirm eligibility and the current simplified rate with the IRS (Publication 587). This is educational information, not tax advice.",
    ],
  },
  {
    path: "/gig-worker-tax-mistakes",
    externalLinks: TAX_MISTAKES_LINKS,
    title: "Common Gig Worker Tax Mistakes (and How to Avoid Them) | UnifyOne",
    description:
      "Common gig worker tax mistakes: skipping the set-aside, no mileage log, missing quarterly estimates, and not reporting sub-threshold income. Not advice.",
    body: [
      "Most gig-worker tax pain comes from a few avoidable mistakes. The biggest: not setting money aside. Because nothing is withheld, move roughly 25–30% of each payout's net into a separate account as you earn — and remember the bill includes both income tax and the 15.3% self-employment tax.",
      "Second: not tracking mileage and expenses. Mileage is usually the largest deduction and the most commonly lost, since reconstructed mileage is what gets disallowed — keep a contemporaneous log and save receipts.",
      "Third: skipping quarterly estimated taxes. If you expect to owe about $1,000 or more, the IRS generally expects quarterly payments, and waiting until April can trigger an underpayment penalty. Fourth: underreporting — all income is reportable whether or not a 1099 arrives — and mixing business and personal money.",
      "Open a separate account, report everything, and pay quarterly from your set-aside. Confirm current rules with the IRS. This is educational information, not tax advice.",
    ],
  },
  {
    path: "/gig-worker-roth-ira",
    externalLinks: ROTH_IRA_LINKS,
    title: "Roth IRAs for Gig Workers: Tax-Free Retirement Savings | UnifyOne",
    description:
      "Roth IRAs for gig workers: after-tax contributions, tax-free growth, income limits, and how a Roth fits with a SEP-IRA or Solo 401(k). Not advice.",
    body: [
      "A Roth IRA is one of the simplest, most flexible ways for a gig worker to save for retirement. You contribute after-tax dollars, the money grows tax-free, and qualified withdrawals in retirement are tax-free — you pay tax now in exchange for never paying it on the growth.",
      "It shines in lower-earning years, when paying tax on the contribution while your rate is low is a bargain. You can also withdraw your own contributions (not earnings) without penalty in a pinch, which suits variable income — though it's best left to grow.",
      "Roth IRAs have an annual contribution cap (smaller than SEP-IRA or Solo 401(k) limits) and income phase-outs for high earners; both change yearly, so confirm current figures with the IRS. Contributions aren't deductible, so they don't lower this year's income or self-employment tax.",
      "Many gig workers use a Roth IRA alongside a SEP-IRA or Solo 401(k) — see our retirement guides to compare. This is educational information, not investment advice.",
    ],
  },
  {
    path: "/uber-vs-doordash",
    externalLinks: UBER_VS_DOORDASH_LINKS,
    title: "Uber vs DoorDash: Which Should You Drive For? | UnifyOne",
    description:
      "Uber (rideshare) vs DoorDash (delivery) compared on pay structure, requirements, 1099 forms, mileage, and scheduling — plus how to compute your net pay.",
    body: [
      "Uber and DoorDash are different jobs: Uber carries passengers, DoorDash carries food. Both pay you as an independent contractor with no taxes withheld, so your take-home depends on your market, hours, and vehicle costs — not the brand.",
      "Uber rideshare usually has a higher bar (often 21+ with a qualifying multi-door vehicle and a stricter inspection); DoorDash is often 18+ with a lower vehicle bar and, in some markets, bike delivery. Both pay per-offer/per-ride with upfront amounts plus 100% of tips.",
      "On taxes, DoorDash issues a 1099-NEC at $600+, while Uber often issues a 1099-K for gross fares plus a 1099-NEC for incentives. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income regardless of forms.",
      "To compare them honestly, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/uber-eats-vs-grubhub",
    externalLinks: UBER_EATS_VS_GRUBHUB_LINKS,
    title: "Uber Eats vs Grubhub: Which Pays More for Drivers? | UnifyOne",
    description:
      "Uber Eats vs Grubhub compared on pay structure, scheduling blocks, 1099 forms, mileage, and payouts — plus how to compute your own net pay.",
    body: [
      "Uber Eats and Grubhub are both food-delivery apps that pay couriers as independent contractors, but they schedule drivers differently: Uber Eats is mostly on-demand, while Grubhub leans on scheduled blocks and a Premier/Pro priority tier.",
      "Both are per-offer with upfront amounts plus 100% of tips. Grubhub rewards higher acceptance and on-time scheduling with earlier block access; Uber Eats uses Surge/Boost zones and Quests during busy periods.",
      "Grubhub issues a 1099-NEC at $600+; Uber Eats often issues a 1099-NEC for incentives plus a 1099-K for processed fares. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, work comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators handle it. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/doordash-vs-spark",
    externalLinks: DOORDASH_VS_SPARK_LINKS,
    title: "DoorDash vs Spark (2026): Which Pays More? | UnifyOne",
    description:
      "DoorDash vs Walmart Spark for 2026: how pay, order types, fees, 1099s, and mileage really compare for drivers — plus calculate your own take-home free.",
    body: [
      "DoorDash and the Walmart Spark Driver program are both per-offer delivery apps that pay you as an independent contractor, but the order mix differs: DoorDash spans restaurants, convenience, and retail, while Spark delivers Walmart and Sam's Club orders (some offers include shopping the order).",
      "Both show pay before you accept and pass through 100% of tips. DoorDash's broad merchant base often means steadier volume; Spark availability is tied to nearby Walmart store zones and slot competition.",
      "Both issue a 1099-NEC if you earned $600 or more — DoorDash via Stripe, Spark via its payment partner. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/amazon-flex-vs-doordash",
    externalLinks: AMAZON_FLEX_VS_DOORDASH_LINKS,
    title: "Amazon Flex vs DoorDash (2026): Which Pays More? | UnifyOne",
    description:
      "Amazon Flex vs DoorDash for 2026: block vs per-offer pay, requirements, 1099s, mileage, and payouts compared — plus calculate your own net hourly rate free.",
    body: [
      "Amazon Flex and DoorDash are both independent-contractor gigs that work very differently: Amazon Flex pays a set amount for a reserved block of package deliveries (tips uncommon), while DoorDash pays per food-delivery offer with tips and lets you log on any time.",
      "Amazon Flex usually requires 21+ and a mid-size or larger vehicle, and you commit to a whole block; DoorDash is often 18+ with a lower vehicle bar and no block commitment. One rewards predictability, the other flexibility.",
      "Both issue a 1099-NEC if you earned $600 or more — Amazon via its tax portal, DoorDash via Stripe. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators handle it. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/upwork-vs-fiverr",
    externalLinks: UPWORK_VS_FIVERR_LINKS,
    title: "Upwork vs Fiverr: Which Is Better for Freelancers? | UnifyOne",
    description:
      "Upwork vs Fiverr compared on how you get work, platform fees, 1099-K forms, payout methods, and who each suits — plus how to compute your own net pay.",
    body: [
      "Upwork and Fiverr are the two largest freelance marketplaces, but they work differently: on Upwork you send proposals and bill clients on hourly or fixed-price contracts, while on Fiverr you publish fixed-price gigs that buyers order directly. Both pay you as a self-employed freelancer with nothing withheld.",
      "Both take a cut before you're paid — Upwork deducts a freelancer service fee from each contract, and Fiverr deducts a flat seller commission (around 20%) from each order, with buyers paying separate service fees on top. Those platform fees are a deductible business expense, so track them.",
      "As third-party settlement platforms, both issue a 1099-K once your processed payments pass the IRS reporting threshold for the year rather than a 1099-NEC. Thresholds have changed recently, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income whether or not a form arrives.",
      "To compare honestly, take comparable projects on each, log the hours you actually worked, subtract platform fees and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/gopuff-vs-doordash",
    externalLinks: GOPUFF_VS_DOORDASH_LINKS,
    title: "Gopuff vs DoorDash (2026): Which Pays More? | UnifyOne",
    description:
      "Gopuff vs DoorDash for 2026: how blocks vs per-offer pay, what you carry, scheduling, 1099s, and mileage compare — plus find your real hourly rate free.",
    body: [
      "Gopuff and DoorDash are both independent-contractor delivery gigs, but the model differs: Gopuff delivers its own convenience and grocery stock from local micro-fulfillment centers, while DoorDash delivers orders from third-party restaurants and stores.",
      "That changes the work: on Gopuff you start each trip at the facility with the order already packed and tend to work scheduled blocks; on DoorDash you drive to the merchant first, sometimes wait, and can log on largely on-demand per offer with tips shown upfront.",
      "Both issue a 1099-NEC if you earn $600 or more in a year — Gopuff via its payment partner, DoorDash via Stripe. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare, run comparable shifts on each, track active hours and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators handle it. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/rover-vs-wag",
    externalLinks: ROVER_VS_WAG_LINKS,
    title: "Rover vs Wag: Which Is Better for Pet Care? | UnifyOne",
    description:
      "Rover vs Wag compared on how clients are found, service types, platform cut, scheduling control, and 1099-K forms — plus how to compute your own net pay.",
    body: [
      "Rover and Wag are the two largest pet-care marketplaces, connecting independent sitters and walkers with owners for dog walking, drop-in visits, boarding, and house sitting. Both pay you as a self-employed contractor with nothing withheld and take a cut of what owners pay.",
      "On Rover you build a profile, set your own services and rates, and owners book you directly, so you tend to build repeat clients and control your calendar. Wag leans more on-demand, surfacing nearby requests you accept as they come in — quicker bookings, but less control over timing and pricing.",
      "As third-party platforms, both issue a 1099-K once your processed payments pass the IRS reporting threshold for the year rather than a 1099-NEC. Thresholds have changed recently, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income whether or not a form arrives.",
      "To compare, take comparable bookings on each, track the time you spent and any travel miles, subtract the platform's fee and supply costs, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/lyft-vs-uber-eats",
    externalLinks: LYFT_VS_UBER_EATS_LINKS,
    title: "Lyft vs Uber Eats: Which Should You Drive For? | UnifyOne",
    description:
      "Lyft (rideshare) vs Uber Eats (food delivery) compared on the work, requirements, 1099 forms, vehicle wear, and scheduling — plus how to compute your net pay.",
    body: [
      "Lyft and Uber Eats are both independent-contractor driving gigs, but they're different jobs: Lyft is rideshare — you carry passengers — while Uber Eats is food delivery, so you carry orders and never have a rider in the car. Both pay you with nothing withheld.",
      "Lyft's requirements are usually stricter (often 21+ with a qualifying multi-door vehicle and a vehicle inspection), and passengers mean more miles and vehicle wear; Uber Eats has a lower bar and, in some markets, bike or scooter delivery. Both show pay before you accept and pass through 100% of tips.",
      "On taxes, each typically issues a 1099-K for the fares the platform processes plus a 1099-NEC for incentives and referrals, reconciled on your Lyft Annual Summary or Uber Tax Summary. Thresholds change yearly, and you owe income tax plus the 15.3% self-employment tax on net earnings — report all income regardless.",
      "To compare, work comparable hours on each, track active time and business miles, subtract mileage and expenses, and divide by hours — the free Real Hourly Rate and Earnings Consolidator calculators do the math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/doordash-vs-uber-eats",
    externalLinks: DOORDASH_VS_UBER_EATS_LINKS,
    title: "DoorDash vs Uber Eats: Which Pays More for Drivers? | UnifyOne",
    description:
      "DoorDash vs Uber Eats compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "DoorDash and Uber Eats both pay couriers as independent contractors, so neither withholds taxes and your take-home depends far more on your market and hours than on the app. There's no universal winner — the only number that matters is what you net per hour, which we show you how to compute rather than quoting figures that go stale.",
      "Both apps are per-offer: each delivery shows a base or upfront amount plus promotions and tips before you accept. DoorDash adds Peak Pay and Challenges in busy periods; Uber Eats adds Surge/Boost zones and Quests. Neither deducts the restaurant's commission from your courier pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, DoorDash issues a 1099-NEC if you earn $600 or more in a year. Uber may issue a 1099-NEC for incentives and referrals plus a 1099-K for processed delivery fares, with thresholds that change yearly. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare them honestly, run a few similar shifts on each, track your active hours and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do that math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/instacart-vs-doordash",
    externalLinks: INSTACART_VS_DOORDASH_LINKS,
    title: "Instacart vs DoorDash: Which Is Better for Gig Workers? | UnifyOne",
    description:
      "Instacart vs DoorDash compared on how pay works (batches vs offers), fees, 1099 forms, mileage, scheduling, and payouts — plus how to compute your net pay.",
    body: [
      "Instacart and DoorDash are both independent-contractor gig apps, but the work differs: Instacart full-service shoppers shop a cart and deliver groceries, while DoorDash Dashers pick up and drop off prepared orders. That changes how pay is structured and what your time and mileage look like, so which one is better depends on your market and how you value your time — not on a single pay figure.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance plus tips, and your time includes shopping in-store. DoorDash pays per delivery offer with a base plus promotions and tips, and your time is mostly driving. Because Instacart batches include shopping time, compare them on net pay per active hour rather than per delivery.",
      "Both withhold no taxes and issue a 1099-NEC at $600 or more in earnings; Instacart in-store-only shoppers are W-2 employees instead, while full-service shoppers who also deliver get the 1099-NEC. You owe income tax plus the 15.3% self-employment tax on combined net earnings, and you must report all income even if no form arrives.",
      "To decide, work comparable shifts on each, log your active hours (shopping plus driving for Instacart) and your business miles, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this for you. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/uber-vs-lyft-driver",
    externalLinks: UBER_VS_LYFT_LINKS,
    title: "Uber vs Lyft (2026): Which Pays More? | UnifyOne",
    description:
      "Uber vs Lyft for drivers in 2026: how pay works, fees, 1099-K vs 1099-NEC, mileage, and payout speed compared — plus find your real hourly rate free.",
    body: [
      "Uber and Lyft are the two largest US rideshare platforms, and both pay drivers as independent contractors. The apps are structurally similar — upfront fares, surge-style bonuses, and weekly or instant payouts — so which one nets you more comes down to your local market, the hours you drive, and your vehicle costs rather than the brand.",
      "On both, you see an upfront estimated fare and trip details before accepting and keep 100% of tips, and both raise pay during high demand (Uber surge and promotions; Lyft Personal Power Zones and bonuses). Each takes a service fee out of every fare, which is a deductible business expense itemized on your Uber Tax Summary or Lyft Annual Summary.",
      "Both issue similar tax forms: a 1099-K reporting the gross ride fares processed through the platform, plus a 1099-NEC for incentives, referrals, and bonuses; reporting thresholds change by year. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income regardless of which forms you receive.",
      "To compare your own pay, drive comparable hours on each, log your active time and the business miles you drove (including miles between trips, which are often deductible), subtract fees, mileage, and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/doordash-vs-grubhub",
    externalLinks: DOORDASH_VS_GRUBHUB_LINKS,
    title: "DoorDash vs Grubhub: Which Pays More for Drivers? | UnifyOne",
    description:
      "DoorDash vs Grubhub compared on how pay is structured, fees, 1099 forms, mileage, scheduling, and payout speed — plus how to compute your own net pay.",
    body: [
      "DoorDash and Grubhub both pay couriers as independent contractors to deliver prepared food, so neither withholds taxes and your take-home depends far more on your market and hours than on the app. There's no universal winner — the only number that matters is what you net per hour, which we show you how to compute rather than quoting figures that go stale.",
      "Both apps are per-offer: each delivery shows an amount plus promotions and tips before you accept. DoorDash shows a guaranteed base plus Peak Pay and Challenges; Grubhub calculates base pay from mileage and time and adds Special Offers and Missions. Neither deducts the restaurant's commission from your courier pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, both treat you as an independent contractor and issue a 1099-NEC if you earn $600 or more in a year — DoorDash through Stripe, Grubhub through its payment processor. You owe income tax plus the 15.3% self-employment tax on net earnings from either, and you must report all income whether or not a form arrives.",
      "To compare them honestly, run a few similar shifts on each, track your active hours and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do that math. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/amazon-flex-vs-spark",
    externalLinks: AMAZON_FLEX_VS_SPARK_LINKS,
    title: "Amazon Flex vs Spark (2026): Which Pays More? | UnifyOne",
    description:
      "Amazon Flex vs Walmart Spark for 2026: blocks vs offers, fees, 1099s, mileage, and scheduling compared for drivers — plus a free take-home pay calculator.",
    body: [
      "Amazon Flex and the Walmart Spark Driver program are both independent-contractor delivery gigs, but they're structured differently: Amazon Flex pays for reserved delivery blocks of a set length, while Spark pays per accepted delivery offer. That changes what your time and mileage look like, so which one is better depends on your market and how you value your time — not on a single pay figure.",
      "Amazon Flex shows an estimated total for a block before you reserve it, with tips added afterward on eligible deliveries; Spark shows an estimate plus tips on each offer before you accept. Neither deducts a separate platform commission from your driver pay, and both default to direct deposit, with instant cash-out availability that varies. Because a Flex block is a fixed time commitment, compare the two on net pay per active hour rather than per stop.",
      "On taxes, both pay you as an independent contractor with nothing withheld and issue a 1099-NEC if you earn $600 or more in a year — Amazon through its tax-document portal, Spark through its payment partner. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income whether or not a form arrives.",
      "To decide, work comparable shifts on each, log your active hours and the business miles you drove (including miles between stops), subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator compute this for you. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/instacart-vs-shipt",
    externalLinks: INSTACART_VS_SHIPT_LINKS,
    title: "Instacart vs Shipt (2026): Which Pays More? | UnifyOne",
    description:
      "Instacart vs Shipt for 2026: how pay works, fees, 1099s, mileage, scheduling, and payout speed compared for shoppers — plus a free net-pay calculator.",
    body: [
      "Instacart and Shipt are the two largest grocery-shopping gig apps, and both pay shoppers as independent contractors to shop a cart and deliver it. The work is similar — you shop in-store, then drive the order to the customer — so which one nets you more comes down to your market, the hours you work, and your vehicle costs rather than the brand.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance plus tips; Shipt pays per order with an estimate that factors in the order's effort, plus tips. Because both bundle shopping time into the job, compare them on net pay per active hour rather than per order. Neither deducts customer fees from your shopper pay, and both default to weekly deposits with faster cash-out options for a possible fee.",
      "On taxes, both pay you as an independent contractor and issue a 1099-NEC at $600 or more in earnings. One nuance: Instacart in-store-only shoppers are W-2 employees, while full-service shoppers who also deliver get the 1099-NEC; Shipt shoppers who deliver are independent contractors. You owe income tax plus the 15.3% self-employment tax on net earnings, and you must report all income even if no form arrives.",
      "To compare your own pay, work comparable shifts on each, log your active hours (shopping plus driving) and the business miles you drove, subtract mileage and expenses, and divide by hours. The free Real Hourly Rate calculator and Earnings Consolidator do this. This is educational information, not financial or tax advice.",
    ],
  },
  {
    path: "/1099-nec-vs-1099-k",
    title: "1099-NEC vs 1099-K: What Gig Workers Need to Know | UnifyOne",
    description:
      "1099-NEC vs 1099-K for gig workers: what each form is, who issues which, why thresholds change yearly, and how both flow onto Schedule C. Not tax advice.",
    body: [
      `Reviewed ${RESOURCE_REVIEW_LABEL}. U.S. federal reporting rules.`,
      TAX_REVIEW.nec,
      TAX_REVIEW.k,
      "Reconcile tax forms, statements and your ledger so each payment is counted once. Sole proprietors generally report gig business income and expenses on Schedule C; personal transfers and other non-business transactions need separate analysis.",
    ],
    externalLinks: TAX_REVIEW_SOURCES.map(({ label, href }) => ({
      label,
      url: href,
    })),
  },
  {
    path: "/how-to-file-gig-worker-taxes",
    externalLinks: [IRS.selfEmployedCenter, IRS.estimated, IRS.seTax],
    title: "How to File Taxes as a Gig Worker: Step-by-Step | UnifyOne",
    description:
      "File gig worker taxes step by step: gather 1099s, total income, complete Schedule C and Schedule SE, finish Form 1040, and set up quarterly payments.",
    body: [
      "Filing as a 1099 gig worker follows a predictable order. Start by gathering every 1099-NEC and 1099-K your platforms issued, plus your own earnings records and mileage log — then total your gross income and report all of it, even amounts under $600 or income that never generated a form.",
      "Report that income and your business deductions on Schedule C to arrive at your net profit. Deductions like business mileage at the IRS standard mileage rate, phone use, supplies, tolls, and platform fees lower the profit you're taxed on, so accurate year-round records matter.",
      "Calculate self-employment tax on Schedule SE — 15.3% (12.4% Social Security + 2.9% Medicare) on your net earnings — then carry your net profit and SE tax to Form 1040, where you deduct half of the self-employment tax. File a state return too if your state has an income tax.",
      "Going forward, the IRS generally expects quarterly estimated payments via Form 1040-ES if you'll owe $1,000 or more, due around April 15, June 15, September 15, and January 15. The annual return is generally due around April 15. You can file with IRS Free File, commercial software, or a tax professional.",
    ],
  },
  {
    path: "/gig-quarterly-taxes",
    externalLinks: [IRS.estimated, IRS.selfEmployedCenter, IRS.seTax],
    title:
      "Quarterly Estimated Taxes for Gig Workers: A Practical Guide | UnifyOne",
    description:
      "How quarterly estimated taxes work for gig workers: who pays, the four due dates, the safe-harbor rule, how to estimate and pay, and the underpayment penalty.",
    body: [
      "Gig platforms like DoorDash, Uber, and Instacart withhold no tax, so independent contractors pay the IRS in four installments through the year instead of once in April. As a general rule you should make estimated payments if you expect to owe $1,000 or more for the year after withholding and credits — and most gig workers do, because gig income carries both income tax and the 15.3% self-employment tax.",
      "Federal estimated taxes are due four times a year, with deadlines that usually fall around April 15, June 15, September 15, and January 15 of the following year. Each date shifts to the next business day when it lands on a weekend or holiday, so confirm the current year's exact dates with the IRS.",
      "To avoid an underpayment penalty, the safe-harbor rule says your payments and withholding should cover at least 90% of this year's tax or 100% of last year's tax — 110% if your prior-year adjusted gross income was over $150,000. Estimate each payment from your net earnings (income after deductions like mileage), then pay via IRS Direct Pay, EFTPS, or by mailing Form 1040-ES.",
      "If you fall short, the IRS charges an underpayment penalty calculated like interest on the amount underpaid for the time it was late, not a flat fine. This guide is educational information, not tax advice — confirm thresholds, due dates, and rates with the IRS or a qualified tax professional.",
    ],
  },
  {
    path: "/gig-worker-tax-deductions",
    externalLinks: [IRS.selfEmployedCenter, IRS.mileage, IRS.seTax],
    title: "Gig Worker Tax Deductions: The Complete Checklist | UnifyOne",
    description:
      "The business expenses gig workers most often miss: mileage, phone, hot bags, tolls, platform fees, health insurance, half of SE tax & home office.",
    body: [
      "Gig workers are taxed on profit, not gross payouts, so every legitimate business expense you track lowers the income you pay tax on. This checklist covers the deductions DoorDash, Uber, Instacart, and other 1099 workers most commonly miss.",
      "Business mileage is usually the largest deduction. You pick one method per vehicle for the year — the IRS standard mileage rate (70¢ per mile for 2025) or the actual-expense method for the business-use share of gas, insurance, repairs, and depreciation. You can't combine them, and the rate changes annually.",
      "Other commonly missed write-offs include the business-use share of your phone and data, hot bags and equipment, tolls and parking paid while working, platform service fees, supplies, the self-employed health insurance deduction, and the deductible half of the 15.3% self-employment tax. A home office is deductible only with a space used regularly and exclusively for the business.",
      "Deductions only count if you can substantiate them. Keep a contemporaneous mileage log noting the date, miles, and purpose of each trip, and save receipts for every expense. This is educational information, not tax advice — confirm current figures with the IRS or a tax professional.",
    ],
  },
  {
    path: "/architecture",
    title: "How UnifyOne is built | UnifyOne",
    description:
      "A plain-language overview of UnifyOne's React application, server API, account boundaries, and separate PostgreSQL data stores.",
  },
  {
    path: "/the-system",
    title: "How UnifyOne works | Work sessions, statements & expenses",
    description:
      "Record a work session, import an earnings statement, log expenses, and compare what you kept per hour. See how UnifyOne handles your gig-work records.",
    body: [
      "Log shifts and jobs, include earnings and expenses, and record mileage to build a useful picture of your working week.",
      "Use the public calculators without an account, then create a free account when you want to track your work over time.",
    ],
  },
  {
    path: "/pricing",
    title: "Pricing | UnifyOne",
    description:
      "Compare UnifyOne plans: free shift tracking, mileage, and calculators, or Pro for $4.99 a month or $49 a year. See billing and AI allowances.",
    body: [
      "Gig Starter includes shift tracking, a mileage log, tax calculators, and 25 AI requests per month. No credit card is required to start.",
      "Gig Pro costs $4.99 per month or $49 per year, charged annually if you choose annual billing. Pro adds unlimited saved history, a year-round tax dashboard, priority support, and 250 AI requests per month.",
    ],
  },
  {
    path: "/about",
    title: "About UnifyOne | Built for independent work",
    description:
      "Meet UnifyOne by 1Commerce: tools to help independent workers keep clearer earnings records, understand expenses, and plan for taxes.",
    body: [
      "UnifyOne is built by 1Commerce in Oregon to help independent workers keep a useful record of shifts, earnings, expenses, and mileage.",
      "Explore the public calculators, begin a free tracking habit, or contact the team with a product question. Tax estimates and AI answers need review; the tools do not file your return.",
    ],
  },
  {
    path: "/press",
    title: "Press & Media Kit | UnifyOne by 1Commerce",
    description:
      "UnifyOne press and media kit: download brand logos, copy-paste boilerplate, company facts, and category tags. By 1Commerce LLC (PNW Enterprises).",
    body: [
      "UnifyOne is an AI-powered earnings & tax app for gig and 1099 workers, built by 1Commerce LLC (PNW Enterprises) of Canby, Oregon. This media kit gives press, software directories, and reviewers everything needed to cover or list us accurately.",
      "Download the brand logo (SVG and transparent PNG) and the boilerplate file with the canonical product name, 60-character, 160-character, and 80-word descriptions, category tags, and brand colors. For anything else, email support@1commerce.online.",
    ],
  },
  {
    path: "/contact",
    title: "Contact & support | UnifyOne",
    description:
      "Contact the UnifyOne team for product questions, account support, feedback, or partnerships. Use the form or email support@1commerce.online.",
    body: [
      "Contact support@1commerce.online or use the contact form for product questions, account help, feedback, and partnerships.",
      "A brief description is enough to start. Please do not include passwords, payment details, or tax documents.",
    ],
  },
  {
    path: "/tithes",
    title: "Tithes | UnifyOne",
    description:
      "UnifyOne's Tithes program and transparent gig-worker pricing — Free forever, or Pro at $4.99/mo ($49/yr) for GigIQ, Tax Autopilot, Money Manager, and Kai.",
  },
  {
    path: "/documents",
    title: "Documentation | UnifyOne",
    description:
      "Start with UnifyOne's free tools and practical guides, then explore workflow examples, technical references, and the project history.",
  },
  {
    path: "/documents/case-studies",
    title: "Workflow examples | UnifyOne",
    description:
      "Illustrative workflows for comparing gig earnings, keeping mileage records, and planning irregular income with UnifyOne's free tools.",
  },
  {
    path: "/documents/integrations",
    title: "Integration Guides | UnifyOne Documentation",
    description:
      "Developer reference examples for UnifyOne API configuration, MCP, webhooks, and n8n. Check account and deployment availability before use.",
  },
  {
    path: "/documents/work-proof",
    title: "Project history | UnifyOne",
    description:
      "The recorded development phases behind UnifyOne, with links to repository commits and releases. A project history, not a live feature-status report.",
  },
  {
    path: "/tools",
    title: "Free calculators for independent work | UnifyOne",
    description:
      "Explore free calculators for gig earnings, mileage, tax planning, pricing, and cash flow. Enter your own numbers to see an estimate.",
    body: [
      "Explore free calculators for earnings, mileage, hourly rates, estimated taxes, tax set-asides, cash flow, and resale pricing.",
      "Enter your own numbers to see an estimate. Tax calculations support planning and do not replace professional advice.",
    ],
  },
  {
    path: "/blog",
    title: "Notes on independent work | UnifyOne",
    description:
      "Read UnifyOne essays on gig-worker earnings, mileage and 1099 tax tracking, and AI-assisted shift intelligence for drivers and freelancers.",
    body: [
      "Ideas and product notes on earnings, expenses, tax planning, and tools for independent work.",
      "Explore the guide library for practical reading on taxes, money between paydays, and getting started with UnifyOne.",
    ],
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
    title: "Business Mileage Deduction Calculator | UnifyOne",
    description:
      "Estimate business mileage deductions with verified IRS rate periods. Separate 2026 miles by date and distinguish deductions from cash savings.",
    body: [
      "Choose a supported tax year and enter eligible business miles for each rate period. Rates can change within a year, so one rate cannot always be applied to a full-year total.",
      "A mileage deduction reduces taxable income; it is not a reimbursement or a measure of actual vehicle costs. Keep dated mileage records and review eligibility and IRS rules before filing.",
    ],
  },
  {
    path: "/tools/earnings-consolidator",
    title:
      "Multi-Platform Gig Earnings Consolidator | True Hourly Rate | UnifyOne",
    description:
      "Compare operating profit before taxes across platforms using earnings, total work hours and actual estimated costs for the same period.",
    body: [
      "Revenue minus actual estimated costs divided by working hours gives operating profit per hour before taxes. Losses remain negative.",
      "Count overlapping hours and shared costs once. Do not subtract fees again from net deposits. IRS mileage deductions are not actual vehicle costs.",
    ],
  },
  {
    path: "/tools/reseller-break-even",
    title: "Reseller Break-Even & Pricing Calculator | UnifyOne",
    description:
      "Estimate a selling price using your actual fee structure, fixed costs and expected return losses. Distinguishes item-cost ROI from profit margin.",
    body: [
      "Enter account-specific percentage and fixed fees, fee bases, shipping, item cost and unrecovered return costs. No universal marketplace fee is assumed.",
      "Calculated seller revenue includes buyer-paid shipping retained by the seller and excludes sales tax. ROI on item cost and profit margin are different. Prices round up to cents.",
    ],
  },
  {
    path: "/tools/cashflow-tracker",
    title: "Payout Timing & Cash-Flow Planner | UnifyOne",
    description:
      "Model a repeating week using your expected bank deposit amounts and arrival days. No platform schedule or instant-pay fee is assumed.",
    body: [
      "Enter expected deposits after payout fees for each weekday using your account settings and bank history. Count instant withdrawals only once.",
      "Weekly totals and a 52-weeks-divided-by-12 monthly average are scenarios, not a dated forecast or available bank balance. Holidays, holds and processing can delay deposits.",
    ],
  },
  {
    path: "/tools/gig-hourly-rate",
    externalLinks: PLATFORMS,
    title: "Work Profit & Hourly Rate Calculator | UnifyOne",
    description:
      "Compare delivery, rideshare and freelance earnings after your estimated business costs and chosen tax reserve. Check your hourly goal using entered figures.",
    body: [
      "Compare income sources using earnings, total working hours, business miles and other costs for the same period. Vehicle cost per mile is your editable estimate, not the IRS mileage deduction.",
      "See operating profit, a chosen planning tax reserve, and earnings needed to meet your after-reserve hourly goal. Results use entered figures; they do not predict future earnings or automatically link accounts.",
    ],
  },
  {
    path: "/gig-income-aggregator",
    title: "Compare Gig Income: Earnings, Costs & Hours | UnifyOne",
    description:
      "Combine gig-work records, reconcile CSV imports, and compare earnings after costs. Understand the difference between cash flow and tax deductions.",
    body: [
      `Reviewed ${RESOURCE_REVIEW_LABEL}.`,
      "Record work sessions manually or with the timer, review earnings CSV imports, and save expenses. Naming a platform does not connect an account or establish automatic synchronization.",
      "Reconcile overlapping sessions, imports and deposits. Include working hours and count costs once. A vehicle-cost estimate is different from a tax mileage deduction, and a chosen tax reserve is not a calculated tax bill.",
    ],
    externalLinks: [IRS.selfEmployedCenter, IRS.mileage],
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
    body: [
      "Gross gig pay isn't take-home pay. The Gig Earnings Optimizer compares real net earnings per hour across DoorDash, Uber Eats, Instacart, and other apps — after fuel, vehicle wear, and the IRS mileage deduction — so you can see which platform actually pays more in your zone.",
      "Deadhead miles — the unpaid distance driven between orders or back from a drop-off — quietly erode per-order pay. Modeling net dollars per hour instead of gross fares surfaces the platforms and shift windows where those empty miles cost you the least.",
      "Because pay, incentives, and demand shift week to week, the best-paying app changes over time. Re-checking net pay by platform regularly — and remembering that bonuses and promotions count as taxable income — helps route your hours to the highest real return.",
    ],
  },
  {
    path: "/financial-intelligence-gig-workers",
    title:
      "Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne",
    description:
      "AI-powered financial intelligence for gig workers: real-time earnings analysis, tax forecasting, and net income visibility across all platforms.",
    body: [
      "Financial intelligence for gig workers means turning raw payout data into real-time net income: what you actually keep across every platform after fuel, the mileage deduction, and fees, rather than the gross totals each app reports.",
      "UnifyOne surfaces a live quarterly tax forecast (self-employment tax plus income tax), a side-by-side platform earnings comparison, your effective expense ratio, and alerts when your earnings pattern shifts — so tax season and slow weeks hold no surprises.",
      "Kai, UnifyOne's AI assistant, helps translate irregular gig income into a workable budget and keeps business expenses categorized as you go, so deductions and set-aside amounts stay accurate without manual bookkeeping.",
    ],
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
    path: "/gig-taxes",
    title: "Gig Worker Taxes: The Complete Guide for 1099 Earners | UnifyOne",
    description:
      "How gig worker taxes work: self-employment tax, 1099-NEC vs 1099-K, deductions, and quarterly payments — plus guides for DoorDash, Uber & Instacart.",
    body: [
      `Reviewed ${RESOURCE_REVIEW_LABEL}. U.S. federal guidance for independent contractors.`,
      TAX_REVIEW.se,
      TAX_REVIEW.nec,
      TAX_REVIEW.k,
      TAX_REVIEW.mileage,
      TAX_REVIEW.estimates,
      TAX_REVIEW.reserve,
      TAX_REVIEW.tips,
    ],
    externalLinks: TAX_REVIEW_SOURCES.map(({ label, href }) => ({
      label,
      url: href,
    })),
  },
  {
    path: "/how-to-make-money-on-doordash",
    externalLinks: DOORDASH_START_LINKS,
    title: "How to Make Money on DoorDash: A Beginner's Guide | UnifyOne",
    description:
      "How to make money on DoorDash: requirements, how to sign up, how Dasher pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "DoorDash lets you earn on your own schedule by delivering food and other orders nearby. Dashers are independent contractors who use their own car, bike, or scooter, choose when to work, and accept or decline each delivery offer.",
      "To start you generally need to be at least 18, have a way to deliver, carry a smartphone, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with DoorDash before applying.",
      "Pay is per delivery — base pay plus any active promotions, with 100% of customer tips on top — and there is no guaranteed wage. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings overstate your take-home.",
      "To know what you'd really make, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-driving-for-uber",
    externalLinks: UBER_START_LINKS,
    title: "How to Make Money Driving for Uber: A Beginner's Guide | UnifyOne",
    description:
      "How to make money driving for Uber: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "Driving for Uber lets you earn by giving rides on your own schedule in your own car. Drivers are independent contractors who decide when to go online, where to drive, and which trips to accept in the app.",
      "Rideshare driving typically requires you to be at least 21, have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change, so confirm the current criteria with Uber.",
      "Uber shows an upfront fare before you accept, with surge pricing and promotions during high demand and 100% of tips on top. There's no guaranteed wage, Uber takes a service fee from fares, and you pay for your own gas and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-instacart",
    externalLinks: INSTACART_START_LINKS,
    title: "How to Make Money with Instacart: A Shopper's Guide | UnifyOne",
    description:
      "How to make money with Instacart: requirements, how to sign up, how full-service shopper pay works, and how to compute your real net hourly rate.",
    body: [
      "Instacart lets you earn by shopping for groceries and delivering them on your own schedule. Full-service shoppers are independent contractors who use their own car to shop a customer's order in-store and drive it to the door.",
      "To start as a full-service shopper you generally need to be at least 18, have a car and a smartphone, be able to lift and carry groceries, and pass a background check. Requirements vary by market and change, so confirm the current criteria with Instacart.",
      "Instacart pays per batch, an estimated amount based on factors like item count and distance, with 100% of tips on top and no guaranteed wage. Your working time includes shopping in-store, not just driving, and you cover your own fuel and vehicle costs.",
      "To know your real take-home, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-amazon-flex",
    externalLinks: AMAZON_FLEX_START_LINKS,
    title: "How to Make Money with Amazon Flex: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Amazon Flex: requirements, how to sign up, how delivery-block pay works, and how to compute your real net hourly rate.",
    body: [
      "Amazon Flex lets you earn by delivering Amazon packages during scheduled blocks of time in your own vehicle. Drivers are independent contractors who reserve the blocks that fit their schedule and get paid for the block.",
      "To start you generally need to be at least 21, have a qualifying vehicle (often mid-size or larger with adequate cargo space), carry valid insurance, have a compatible smartphone, and pass a background check. Requirements vary by location and change, so confirm them with Amazon Flex.",
      "Amazon Flex pays per block, showing an estimated pay before you reserve it; most package-delivery blocks don't include tips. If a route runs long your effective rate drops, no taxes are withheld, and you cover your own fuel and vehicle costs.",
      "To understand your real earnings, track your actual block time and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-lyft",
    externalLinks: LYFT_START_LINKS,
    title: "How to Make Money with Lyft: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Lyft: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "Driving with Lyft lets you earn by giving rides on your own schedule in your own car. Drivers are independent contractors who decide when to go online, where to drive, and which ride requests to accept in the app.",
      "Rideshare driving typically requires you to be at least 21, have an eligible four-door vehicle, carry valid insurance and registration, and pass a background and driving-record check. Requirements vary by city and change, so confirm the current criteria with Lyft.",
      "Lyft shows upfront trip details before you accept, with Prime Time and promotions during busy periods and 100% of tips on top. There's no guaranteed wage, Lyft takes a service fee from fares, and you pay for your own gas and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-delivering-for-grubhub",
    externalLinks: GRUBHUB_START_LINKS,
    title:
      "How to Make Money Delivering for Grubhub: A Beginner's Guide | UnifyOne",
    description:
      "How to make money delivering for Grubhub: requirements, how to sign up, how driver pay works, and how to compute your real net hourly rate.",
    body: [
      "Grubhub lets you earn on your own schedule by delivering food orders to customers nearby. Drivers are independent contractors who use their own car, bike, or scooter, choose when to work, and accept or decline each offer.",
      "To start you generally need to be at least 18, have a way to deliver, carry a smartphone, and pass a background check. Requirements vary by market and change over time, so confirm the current criteria with Grubhub before applying.",
      "Pay is per delivery — a base amount plus any bonuses, with 100% of customer tips on top — and there is no guaranteed wage. Because no taxes are withheld and you cover your own gas and vehicle wear, your gross earnings overstate your take-home.",
      "To know what you'd really make, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-as-a-spark-driver",
    externalLinks: SPARK_START_LINKS,
    title: "How to Make Money as a Spark Driver: A Beginner's Guide | UnifyOne",
    description:
      "How to make money as a Spark driver: requirements, how to sign up, how Walmart delivery pay works, and how to compute your real net hourly rate.",
    body: [
      "The Spark Driver platform lets you earn by delivering orders for Walmart and other businesses in your own car. Drivers are independent contractors who accept or decline offers in the app and deliver them along a route.",
      "To start you generally need to be at least 18, have a reliable vehicle, carry valid insurance, have a smartphone, and pass a background check. Requirements vary by location and change, so confirm the current criteria on the Spark Driver platform.",
      "Each offer shows estimated pay and details before you accept; some are single deliveries and others are batched, with 100% of customer tips on top. There's no guaranteed wage, no taxes are withheld, and you cover your own fuel and vehicle costs.",
      "To understand your real earnings, track a few shifts and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay after costs. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-on-taskrabbit",
    externalLinks: TASKRABBIT_START_LINKS,
    title: "How to Make Money on TaskRabbit: A Beginner's Guide | UnifyOne",
    description:
      "How to make money on TaskRabbit: requirements, how to sign up, how Tasker pay works, and how to compute your real net hourly rate. Beginner's guide.",
    body: [
      "TaskRabbit lets you earn by doing tasks for clients — assembly, moving help, mounting, cleaning, and handyman work. Taskers are independent contractors who list their categories, set their own hourly rates, and accept the jobs they want in the app.",
      "To start you generally need to be at least 18, bring the skills and tools for your categories, have a smartphone and a way to reach jobs, complete registration, and pass a background check. Requirements vary by market and change, so confirm them with TaskRabbit.",
      "You set your own rates and are paid for the time a job takes, minus a TaskRabbit service fee, with any client tips on top. There's no guaranteed wage, no taxes are withheld, and you cover your own tools, supplies, and travel.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-rover",
    externalLinks: ROVER_START_LINKS,
    title: "How to Make Money with Rover: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Rover: requirements, how to sign up, how sitter and walker pay works, and how to compute your real net hourly rate.",
    body: [
      "Rover lets you earn by caring for pets — boarding, house sitting, drop-in visits, day care, and dog walking — on your own schedule. Sitters are independent contractors who list services, set their own prices, and accept or decline bookings in the app.",
      "To start you generally need to be at least 18, be comfortable and reliable with animals (and have a pet-friendly space if you board), have a smartphone, build a profile for approval, and pass a background check. Requirements vary by market and change, so confirm them with Rover.",
      "You set your own prices and are paid for completed bookings, minus a Rover service fee, with any owner tips on top. There's no guaranteed wage, no taxes are withheld, and you cover your own supplies, travel, and any boarding costs.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-shipt",
    externalLinks: SHIPT_START_LINKS,
    title: "How to Make Money with Shipt: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Shipt: requirements, how to sign up as a shopper, how pay and tips work, and how to compute your real net hourly rate.",
    body: [
      "Shipt pays full-service shoppers to shop for and deliver groceries to members on their own schedule. You're an independent contractor who claims orders, shops in-store, and delivers — choosing when and how much you work.",
      "To start you generally need to be at least 18, have a reliable car with a valid license and insurance, have a smartphone, and pass a background check. Requirements vary by market and change, so confirm them with Shipt.",
      "You're paid per completed order (reflecting items, distance, and promotions) and keep 100% of member tips. There's no guaranteed wage, no taxes are withheld, and you cover your own gas, mileage, and phone.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-gopuff",
    externalLinks: GOPUFF_START_LINKS,
    title: "How to Make Money with Gopuff: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Gopuff: requirements, how to sign up to deliver, how driver pay and tips work, and how to compute your real net hourly rate.",
    body: [
      "Gopuff pays drivers to deliver convenience and grocery items from its own micro-fulfillment centers to nearby customers — so there's no in-store shopping, just pre-packed pickups. You're an independent contractor who often works scheduled delivery blocks.",
      "To start you generally need to meet the minimum age (often 21, since deliveries can include alcohol), have a car with a valid license and insurance, have a smartphone, and pass a background check. Requirements vary by market and change, so confirm them with Gopuff.",
      "You're paid per delivery (with scheduled blocks in some markets) and keep your tips. There's no guaranteed wage, no taxes are withheld, and you cover your own gas, mileage, and phone.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-roadie",
    externalLinks: ROADIE_START_LINKS,
    title: "How to Make Money with Roadie: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Roadie: requirements, how to sign up, how gig pay and tips work, and how to compute your real net hourly rate.",
    body: [
      "Roadie (a UPS company) pays drivers to deliver packages and items along routes they choose — from small parcels to big-and-bulky items. You're an independent contractor who browses available gigs and claims the ones that fit your route and vehicle.",
      "To start you generally need to be at least 18, have a vehicle suited to the gigs you take and a valid license, have a smartphone, and create an approved driver account. Requirements vary and change, so confirm them with Roadie.",
      "Each gig shows its pay before you claim it (generally reflecting distance and size), and tips may be added. There's no guaranteed wage, no taxes are withheld, and you cover your own gas, mileage, and handling.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-favor",
    externalLinks: FAVOR_START_LINKS,
    title: "How to Make Money with Favor: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Favor as a Runner: requirements, how to sign up, how pay and tips work, and how to compute your real net hourly rate.",
    body: [
      "Favor is a Texas-based on-demand delivery app (part of H-E-B) that pays its Runners to deliver food and other items. You're an independent contractor who goes online, accepts delivery requests, and is paid per delivery plus tips.",
      "To start you generally need to be at least 18, live in a Texas market Favor serves, have a vehicle (or bike/scooter where allowed) with a valid license and insurance, have a smartphone, and pass a background check. Requirements vary and change, so confirm them with Favor.",
      "You're paid per completed delivery and keep 100% of customer tips, with hourly guarantees on some shifts in busier markets. There's no fixed wage otherwise, no taxes are withheld, and you cover your own gas, mileage, and phone.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/how-to-make-money-with-wag",
    externalLinks: WAG_START_LINKS,
    title: "How to Make Money with Wag: A Beginner's Guide | UnifyOne",
    description:
      "How to make money with Wag: requirements, how to sign up, how dog-walker and sitter pay works, and how to compute your real net hourly rate.",
    body: [
      "Wag connects pet owners with dog walkers and sitters, paying you to walk dogs and provide services like sitting, boarding, and drop-in visits on your own schedule. You're an independent contractor who accepts the bookings you want in the app.",
      "To start you generally need to apply and be approved, pass a background check, be comfortable and reliable with dogs, and have a smartphone — dog walking nearby may need no vehicle. Requirements vary and change, so confirm them with Wag.",
      "You're paid for completed services and keep owner tips; Wag takes a service fee from bookings. There's no guaranteed wage, no taxes are withheld, and you cover your own supplies and any travel.",
      "To know what you'd really make, track your active hours and expenses and use the free Real Hourly Rate calculator and Earnings Consolidator to compute your net pay. This is educational information, not financial advice, and not a guarantee of income.",
    ],
  },
  {
    path: "/blog/gig-economy-commerce-platform",
    title: "One App for Gig-Economy Earnings | UnifyOne Blog",
    description:
      "Why gig workers need one app for their money — consolidating earnings, mileage, and taxes across DoorDash, Uber, Lyft, Instacart, and more.",
  },
  {
    path: "/blog/multi-tenant-ecommerce-saas",
    title: "How UnifyOne Keeps Your Gig Data Secure | UnifyOne Blog",
    description:
      "How UnifyOne isolates each worker's earnings and tax data on a secure backend — the privacy and architecture behind your gig money app.",
  },
  {
    path: "/blog/digital-retail-guide",
    title: "Selling on the Side? Track That Income | UnifyOne Blog",
    description:
      "A practical guide for gig workers who also sell online — unifying marketplace payouts, expenses, and 1099 taxes alongside your gig earnings.",
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
    title: "Themes | UnifyOne — Personalize Your Gig Dashboard",
    description:
      "Browse free and paid themes to personalize your UnifyOne dashboard. Make your gig earnings, mileage, and tax view your own — preview and apply in minutes.",
  },
  {
    path: "/docs-chat",
    title: "Docs Chat | UnifyOne",
    description:
      "Ask questions about UnifyOne documentation — answered instantly by Kai, the built-in Claude-powered AI assistant.",
  },
  {
    path: "/resources",
    title: "Guides for independent work | UnifyOne",
    description:
      "Practical guides for gig and freelance work: income records, mileage, tax planning, budgeting, and getting started with UnifyOne.",
    body: [
      "Browse practical guides about gig worker taxes, income records, budgeting on irregular income, emergency funds, and getting started.",
      `All 10 library guides reviewed ${RESOURCE_REVIEW_LABEL}. U.S. federal tax guidance identifies the applicable tax year; sources and product scope appear in the guides.`,
    ],
  },
  {
    path: "/sovereign",
    title: "The Sovereign Stack | 1Commerce",
    description:
      "The Sovereign Stack gives gig workers legal protection, financial independence, and resilience. Break free from platform lock-in. Waitlist open.",
  },
  {
    path: "/design-system",
    title: "Design System | UnifyOne",
    description:
      "The UnifyOne design system — design tokens for color, typography, spacing, and radii, plus the full component library used across the gig-worker app.",
  },
  {
    path: "/login",
    title: "Sign In | UnifyOne",
    description:
      "Sign in to UnifyOne — your gig earnings, mileage, taxes, and AI insights from every app in one place.",
  },
  {
    path: "/register",
    title: "Create Your Account | UnifyOne",
    description:
      "Start free on UnifyOne — the earnings & tax app for gig and 1099 workers. Track pay, mileage, and quarterly taxes. No credit card required.",
  },
];
