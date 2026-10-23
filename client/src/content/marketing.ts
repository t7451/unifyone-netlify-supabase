import { GIG_PLAN_CATALOG, formatGigPrice } from "../../../shared/gigPricing";

export const HOME_TITLE = "UnifyOne | Make sense of your gig money";
export const HOME_DESCRIPTION =
  "Track gig earnings, log mileage, and plan for taxes in one place. Start free with UnifyOne, or try the calculators without creating an account.";

const pro = GIG_PLAN_CATALOG.find(plan => plan.slug === "gig-pro")!;
const starter = GIG_PLAN_CATALOG.find(plan => plan.slug === "gig-starter")!;

export const MARKETING_FAQ = [
  {
    q: "What does UnifyOne help me do?",
    a: "Keep a record of your shifts, earnings, expenses, and mileage, then use those records to understand your work and plan for taxes. The free calculators also work without an account.",
  },
  {
    q: "Do I need to connect my gig accounts?",
    a: "You can log your shifts and earnings from the platforms or clients you work with. Tracking work from an app does not mean UnifyOne has a direct connection or partnership with that platform.",
  },
  {
    q: "What is included in the free plan?",
    a: `Gig Starter includes shift tracking, a mileage log, tax calculators, and ${starter.monthlyAIRequests} AI requests per month. You can start without a credit card. Gig Pro is ${formatGigPrice(pro.monthlyPriceCents)} per month or ${formatGigPrice(pro.yearlyPriceCents)} per year.`,
  },
  {
    q: "Does UnifyOne file my taxes?",
    a: "No. The tools help you organize records and estimate what to set aside. Estimates depend on your inputs and circumstances; review your records and filing decisions with a qualified tax professional.",
  },
  {
    q: "Can I use it for more than one kind of gig work?",
    a: "Yes. Keep delivery, rideshare, freelance, and contract work together, with a separate record for each shift or job. You do not need to work for a particular platform to use the tools.",
  },
  {
    q: "What can the AI assistant do?",
    a: `Kai helps explain questions about earnings, expenses, and planning. Starter includes ${starter.monthlyAIRequests} AI requests per month and Pro includes ${pro.monthlyAIRequests}. Check AI answers against your records; they are not a substitute for professional tax advice.`,
  },
];

export const PRICING_FAQ = [
  MARKETING_FAQ[2],
  {
    q: "How does annual billing work?",
    a: `Pro costs ${formatGigPrice(pro.yearlyPriceCents)} for a full year, charged annually. Monthly billing is ${formatGigPrice(pro.monthlyPriceCents)} each month. The comparison cards show the total and billing period before you choose a plan.`,
  },
  {
    q: "What does Pro add?",
    a: `Pro adds unlimited saved history, a year-round tax dashboard, priority support, and ${pro.monthlyAIRequests} AI requests per month. Review the plan details during checkout before subscribing.`,
  },
  {
    q: "Can I try the tools before signing up?",
    a: "Yes. The public tools include earnings, hourly-rate, mileage, and tax calculators. You can explore them without an account, then create one when you want to track your work over time.",
  },
  MARKETING_FAQ[3],
];
