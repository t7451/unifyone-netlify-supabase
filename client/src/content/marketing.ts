import { GIG_PLAN_CATALOG, formatGigPrice } from "../../../shared/gigPricing";

export const HOME_TITLE = "UnifyOne | Gig earnings, hours & business expenses";
export const HOME_DESCRIPTION =
  "Record delivery, rideshare and freelance work. Import earnings statements, log expenses and mileage, and compare what you kept per hour with UnifyOne.";

const pro = GIG_PLAN_CATALOG.find(plan => plan.slug === "gig-pro")!;
const starter = GIG_PLAN_CATALOG.find(plan => plan.slug === "gig-starter")!;

export const MARKETING_FAQ = [
  {
    q: "What does UnifyOne help me do?",
    a: "Time a session or add a completed job with its pay, hours and miles. You can also import an earnings CSV, save business expenses, and review your records by source and date. Work Insights compares recorded earnings and time after your chosen costs and reserve.",
  },
  {
    q: "Do I need to connect my gig accounts?",
    a: "No. You can use the timer, enter completed work manually, or upload an earnings CSV. Review the import preview before saving it. Naming a platform in your records does not connect your account to that platform.",
  },
  {
    q: "What is included in the free plan?",
    a: `Gig Starter includes shift tracking, a mileage log, tax calculators, and ${starter.monthlyAIRequests} AI requests per month. You can start without a credit card. Gig Pro is ${formatGigPrice(pro.monthlyPriceCents)} per month or ${formatGigPrice(pro.yearlyPriceCents)} per year.`,
  },
  {
    q: "Does UnifyOne file my taxes?",
    a: "No. Calculators provide estimates, and Pro's CSV and PDF exports provide records for your accountant to review. Neither is a tax return or a complete tax calculation. Mileage deductions and recorded vehicle costs are listed separately; your preparer can help choose the appropriate treatment.",
  },
  {
    q: "Can I use it for more than one kind of gig work?",
    a: "Yes. Record delivery runs, rideshare sessions and freelance jobs with the source or client name you choose. Include waiting, travel between jobs and client admin in your working time when relevant; leaving those hours out can overstate your hourly result.",
  },
  {
    q: "What can the AI assistant do?",
    a: `Ask Kai questions about earnings, expenses and planning. Starter includes ${starter.monthlyAIRequests} AI requests per month and Pro includes ${pro.monthlyAIRequests}. Check its answers against your own records before making a decision.`,
  },
  {
    q: "Will a CSV import duplicate earnings I already entered?",
    a: "It can overlap a manually entered or timed work session. Imports keep their own source label, and imported hours are not inferred. Review overlapping payouts before combining income totals. Accountant exports identify these sources separately and do not reconcile the overlaps for you.",
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
    a: `Pro adds unlimited saved history, the year-round tax dashboard, annual accountant records in CSV and PDF, priority support, and ${pro.monthlyAIRequests} AI requests per month. Review the billing period and plan details at checkout.`,
  },
  {
    q: "Can I try the tools before signing up?",
    a: "Yes. The public tools include earnings, hourly-rate, mileage, and tax calculators. You can explore them without an account, then create one when you want to track your work over time.",
  },
  MARKETING_FAQ[3],
];
