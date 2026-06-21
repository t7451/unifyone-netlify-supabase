/**
 * financeGuides.ts — content for the "gig worker finance" cluster: money topics
 * beyond taxes (retirement, health insurance, bookkeeping, budgeting on
 * irregular income).
 *
 * These extend the existing "financial intelligence for gig workers" theme and
 * target high-intent, low-competition evergreen searches. Everything is YMYL,
 * so copy stays qualified ("educational, not financial/tax/investment advice"),
 * never asserts year-specific dollar limits as permanent (those change — link
 * the IRS / HealthCare.gov), and points to a professional for specifics.
 */

export interface FinanceFaq {
  q: string;
  a: string;
}

export interface FinanceSection {
  heading: string;
  body: string[];
}

export interface FinanceResourceLink {
  label: string;
  href: string;
}

export interface FinanceGuide {
  /** Route slug, also the prerendered file name. */
  slug: string;
  /** Eyebrow label above the h1. */
  eyebrow: string;
  /** Short label for cross-link cards between finance guides. */
  navLabel: string;
  /** <title> + WebPage schema name (before the brand suffix). */
  title: string;
  /** Meta description, ≤158 chars. */
  metaDescription: string;
  /** On-page h1. */
  h1: string;
  /** Lead paragraph. */
  intro: string;
  /** Optional highlight grid rendered under the intro. */
  keyPoints?: { label: string; desc: string }[];
  /** Main content sections (h2 + paragraphs). */
  sections: FinanceSection[];
  /** Authoritative outbound resources (IRS, HealthCare.gov, CFPB, etc.). */
  resources: FinanceResourceLink[];
  /** Relevant free calculators for this topic. */
  tools: { label: string; href: string }[];
  /** FAQ entries — power both the visible list and the FAQPage JSON-LD. */
  faqs: FinanceFaq[];
}

const IRS_SE_CENTER = {
  label: "IRS: Self-Employed Individuals Tax Center",
  href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
};
const IRS_RETIREMENT = {
  label: "IRS: Retirement plans for the self-employed",
  href: "https://www.irs.gov/retirement-plans/retirement-plans-for-self-employed-people",
};
const IRS_SE_HEALTH = {
  label: "IRS: Self-employed health insurance deduction",
  href: "https://www.irs.gov/instructions/i1040gi",
};
const HEALTHCARE_GOV = {
  label: "HealthCare.gov: Coverage for self-employed people",
  href: "https://www.healthcare.gov/self-employed/coverage/",
};
const IRS_RECORDKEEPING = {
  label: "IRS: Recordkeeping for businesses",
  href: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping",
};
const IRS_SCHEDULE_C = {
  label: "IRS: Schedule C (Profit or Loss From Business)",
  href: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040",
};
const CFPB_BUDGET = {
  label: "CFPB: Budgeting with an irregular income",
  href: "https://www.consumerfinance.gov/about-us/blog/budgeting-when-you-have-an-irregular-income/",
};

const NOT_ADVICE =
  "This is educational information, not financial, tax, or investment advice. Rules and dollar limits change yearly — confirm current details with the IRS, HealthCare.gov, or a qualified professional for your situation.";

export const FINANCE_GUIDES: FinanceGuide[] = [
  {
    slug: "gig-worker-retirement",
    eyebrow: "Gig Finance Guide",
    navLabel: "Retirement accounts",
    title: "Retirement Accounts for Gig Workers: SEP-IRA, Solo 401(k) & IRAs",
    metaDescription:
      "Retirement options for self-employed gig workers: SEP-IRA, Solo 401(k), and Traditional vs Roth IRAs — how each works and how to choose. Not advice.",
    h1: "Retirement Accounts for Gig Workers",
    intro:
      "Gig platforms don't offer a 401(k) match — as an independent contractor, your retirement is entirely on you. The upside: the self-employed have access to some of the most generous tax-advantaged accounts available, often letting you save far more than an employee can. Here are the main options and how to pick one.",
    keyPoints: [
      {
        label: "SEP-IRA",
        desc: "Simplest to open; contribute a percentage of net self-employment income.",
      },
      {
        label: "Solo 401(k)",
        desc: "Highest potential contributions; lets you save as both 'employee' and 'employer'.",
      },
      {
        label: "Traditional IRA",
        desc: "Pre-tax contributions that may lower this year's taxable income.",
      },
      {
        label: "Roth IRA",
        desc: "After-tax contributions that grow and withdraw tax-free in retirement.",
      },
    ],
    sections: [
      {
        heading: "The SEP-IRA",
        body: [
          "A SEP-IRA (Simplified Employee Pension) is the easiest self-employed retirement account to set up — most brokerages open one for free in minutes. You contribute a percentage of your net self-employment earnings, up to an annual IRS cap, and contributions are generally tax-deductible, lowering your taxable income.",
          "It's a strong fit for solo gig workers who want simplicity and flexible, year-to-year contributions (you can skip a lean year). Because the limit is tied to a percentage of net earnings, confirm the current cap and percentage with the IRS before contributing.",
        ],
      },
      {
        heading: "The Solo 401(k)",
        body: [
          "A Solo 401(k) (also called an individual 401(k)) is for self-employed people with no employees. It usually allows the largest total contribution because you contribute both as the 'employee' (an elective deferral) and as the 'employer' (a profit-sharing contribution) — and many providers offer a Roth option for the employee portion.",
          "It takes a bit more paperwork than a SEP-IRA and has an annual deadline to establish it, but for higher-earning gig workers it can shelter substantially more income. Confirm current contribution limits and deadlines with the IRS or your plan provider.",
        ],
      },
      {
        heading: "Traditional vs Roth IRAs",
        body: [
          "Anyone with earned income can also use a Traditional or Roth IRA, on their own or alongside a SEP/Solo 401(k). A Traditional IRA may give you a deduction now and is taxed on withdrawal; a Roth IRA is funded with after-tax dollars and grows tax-free, with qualified withdrawals tax-free in retirement.",
          "IRAs have lower annual limits than SEP-IRAs or Solo 401(k)s, and Roth IRAs have income eligibility limits. They're a good starting point if you're newer to gig work or saving smaller amounts. Check current limits and income phase-outs with the IRS.",
        ],
      },
      {
        heading: "How to choose",
        body: [
          "If you want maximum simplicity, a SEP-IRA is hard to beat. If you're earning more and want to shelter the most income (or want a Roth option), a Solo 401(k) usually wins. If you're just getting started, a Roth IRA is a flexible first account. Many gig workers combine an IRA with a SEP or Solo 401(k).",
          "Whatever you choose, contributing even a small, steady percentage of each payout — alongside your tax set-aside — builds the retirement an employer would otherwise help fund. A tax professional or fee-only advisor can help you pick based on your numbers.",
        ],
      },
    ],
    resources: [IRS_RETIREMENT, IRS_SE_CENTER],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
    ],
    faqs: [
      {
        q: "Can gig workers open a 401(k)?",
        a: "Yes — a Solo 401(k) (individual 401(k)) is designed for self-employed people with no employees. You contribute as both employee and employer, which usually allows the largest total contribution of any self-employed plan. Confirm current limits with the IRS or your plan provider.",
      },
      {
        q: "SEP-IRA or Solo 401(k) — which is better for gig workers?",
        a: "A SEP-IRA is simpler and great for flexible, occasional contributions. A Solo 401(k) usually allows higher total contributions and often a Roth option, but involves more paperwork. Higher earners who want to shelter the most income often prefer the Solo 401(k); confirm limits with the IRS.",
      },
      {
        q: "How much can a gig worker contribute to retirement?",
        a: "Limits depend on the account type and your net self-employment earnings, and the IRS adjusts them annually. SEP-IRAs and Solo 401(k)s allow much more than IRAs. Always check the current year's limits on IRS.gov rather than relying on an older figure.",
      },
      {
        q: "Do retirement contributions lower my gig taxes?",
        a: "Often, yes. Contributions to a SEP-IRA, Traditional IRA, or the pre-tax portion of a Solo 401(k) are generally deductible and can lower your taxable income. Roth contributions are not deductible but grow tax-free. The deduction doesn't reduce the 15.3% self-employment tax, only income tax.",
      },
      {
        q: "When do I have to set up a gig-worker retirement account?",
        a: "Deadlines vary by account: SEP-IRAs can often be opened and funded up to your tax-filing deadline (including extensions), while a Solo 401(k) generally must be established by year-end to defer that year's income. Confirm the current deadlines with the IRS or your provider.",
      },
    ],
  },
  {
    slug: "gig-worker-health-insurance",
    eyebrow: "Gig Finance Guide",
    navLabel: "Health insurance",
    title:
      "Health Insurance for Gig Workers: Options & the Self-Employed Deduction",
    metaDescription:
      "Health insurance options for gig workers: the ACA marketplace and subsidies, spouse/Medicaid coverage, HSAs, and the self-employed health deduction. Not advice.",
    h1: "Health Insurance for Gig Workers",
    intro:
      "Gig platforms classify you as an independent contractor, so they don't provide health insurance — finding your own coverage is part of the job. The good news: self-employed people have several routes to affordable coverage, and a tax break that employees don't get. Here's how to think about it.",
    keyPoints: [
      {
        label: "ACA marketplace",
        desc: "Buy your own plan on HealthCare.gov; income-based subsidies can cut the cost.",
      },
      {
        label: "Spouse or family plan",
        desc: "Joining a spouse's employer plan is often the cheapest option if available.",
      },
      {
        label: "Medicaid",
        desc: "Lower-income gig workers may qualify for free or low-cost coverage.",
      },
      {
        label: "SE health deduction",
        desc: "Self-employed people can often deduct their health premiums.",
      },
    ],
    sections: [
      {
        heading: "The ACA marketplace (HealthCare.gov)",
        body: [
          "For most gig workers without access to a spouse's plan, the Affordable Care Act marketplace is the main option. You buy an individual plan on HealthCare.gov (or your state's exchange), and premium tax credits based on your estimated income can substantially reduce what you pay.",
          "Because your gig income is variable, estimate your annual income carefully when you apply — over- or under-estimating affects your subsidy and can create a reconciliation at tax time. You can update your estimate during the year as your earnings change.",
        ],
      },
      {
        heading: "Spouse's plan, Medicaid, and other routes",
        body: [
          "If you have a spouse or parent with an employer plan, joining it is frequently cheaper than an individual marketplace plan — compare before defaulting to the marketplace. If your income is low enough, you may qualify for Medicaid, which offers free or very low-cost coverage in most states.",
          "Short-term and health-sharing arrangements exist but often cover far less than ACA-compliant plans, so read the fine print. A licensed marketplace assister or broker can help you compare options at no cost.",
        ],
      },
      {
        heading: "The self-employed health insurance deduction",
        body: [
          "Here's the tax advantage employees don't get: if you're self-employed and not eligible for an employer (or spouse's employer) plan, you can often deduct the premiums you pay for medical, dental, and qualifying long-term-care insurance for yourself and your family.",
          "It's an above-the-line deduction, meaning it lowers your taxable income even if you don't itemize — though it doesn't reduce the 15.3% self-employment tax. Pairing a high-deductible marketplace plan with a Health Savings Account (HSA) can add another tax-advantaged way to cover medical costs. Confirm eligibility rules with the IRS.",
        ],
      },
    ],
    resources: [HEALTHCARE_GOV, IRS_SE_HEALTH],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Quarterly Tax Estimator",
        href: "/tools/quarterly-tax-estimator",
      },
    ],
    faqs: [
      {
        q: "How do gig workers get health insurance?",
        a: "Most buy an individual plan through the ACA marketplace at HealthCare.gov (or a state exchange), where income-based subsidies can lower the cost. Others join a spouse's employer plan, qualify for Medicaid, or use an HSA-eligible plan. Gig platforms don't provide coverage to contractors.",
      },
      {
        q: "Can gig workers deduct health insurance premiums?",
        a: "Often, yes. Self-employed people who aren't eligible for an employer or spouse's plan can generally take the self-employed health insurance deduction — an above-the-line deduction for medical, dental, and qualifying long-term-care premiums. It lowers income tax but not the 15.3% self-employment tax. Confirm eligibility with the IRS.",
      },
      {
        q: "Do gig workers qualify for ACA subsidies?",
        a: "Many do. Premium tax credits on the ACA marketplace are based on your estimated annual income, so variable gig earnings can still qualify. Estimate carefully, because a large gap between your estimate and actual income is reconciled when you file. Check eligibility on HealthCare.gov.",
      },
      {
        q: "What's an HSA and can gig workers use one?",
        a: "A Health Savings Account is a tax-advantaged account you can fund if you have a qualifying high-deductible health plan. Contributions are deductible, growth is tax-free, and withdrawals for medical costs are tax-free — a useful option for self-employed people. Confirm current limits and plan eligibility with the IRS.",
      },
      {
        q: "When can gig workers sign up for health insurance?",
        a: "ACA marketplace plans have an annual Open Enrollment window, but losing other coverage or certain life events can trigger a Special Enrollment Period. Medicaid enrollment is open year-round for those who qualify. Check current dates on HealthCare.gov.",
      },
    ],
  },
  {
    slug: "gig-worker-bookkeeping",
    eyebrow: "Gig Finance Guide",
    navLabel: "Bookkeeping",
    title: "Bookkeeping for Gig Workers: Track Income, Expenses & Mileage",
    metaDescription:
      "Simple bookkeeping for gig workers: separate accounts, tracking all income and expenses, mileage logs, and records that survive an audit. Not advice.",
    h1: "Bookkeeping for Gig Workers",
    intro:
      "Good records are what turn a stressful tax season into a quick one — and they're what protect your deductions if the IRS ever asks. As a 1099 contractor you're running a small business, and a few simple bookkeeping habits will save you money and hours. Here's a practical system.",
    keyPoints: [
      {
        label: "Separate account",
        desc: "Run gig income and expenses through a dedicated bank account.",
      },
      {
        label: "Track all income",
        desc: "Record every dollar, even from platforms that send no 1099.",
      },
      {
        label: "Log mileage",
        desc: "A contemporaneous mileage log is your biggest, most-audited deduction.",
      },
      {
        label: "Keep receipts",
        desc: "Save proof for every expense you deduct.",
      },
    ],
    sections: [
      {
        heading: "Separate your business money",
        body: [
          "Open a dedicated bank account (and ideally a card) just for gig work. Route every payout in and pay every work expense out of it. This single habit makes your bookkeeping almost automatic — your statement becomes your ledger — and cleanly separates business from personal in case of an audit.",
          "You don't need an LLC or a business account to do this; a separate personal checking account works fine when you're starting out.",
        ],
      },
      {
        heading: "Track every dollar of income",
        body: [
          "Record income from every platform, including any that don't send you a 1099 (you're required to report all of it). Most apps provide weekly summaries and a year-end earnings statement — save them. A simple spreadsheet or a gig-focused app that connects to your account is enough for most people.",
          "Reconcile monthly so nothing slips through, and so you always know your true net for quarterly estimated taxes.",
        ],
      },
      {
        heading: "Track expenses and mileage",
        body: [
          "Capture every deductible expense — phone, supplies, tolls, parking, equipment, platform fees — and keep the receipt. A photo in a dedicated folder or an expense app is fine; the key is having proof tied to a date and purpose.",
          "Mileage is usually a gig worker's largest deduction, and it's also the most scrutinized, so keep a contemporaneous log: the date, miles, and business purpose of each trip, captured at the time (an auto-tracking mileage app makes this painless). Reconstructed, estimated mileage is what gets disallowed.",
        ],
      },
      {
        heading: "Keep records long enough",
        body: [
          "Hold onto your income records, expense receipts, and mileage logs for at least several years — the IRS generally recommends keeping business records for three years, longer in some situations. Digital copies are acceptable.",
          "With clean books, filing your Schedule C and calculating quarterly estimates becomes a matter of reading totals you already have, instead of a year-end scramble.",
        ],
      },
    ],
    resources: [IRS_RECORDKEEPING, IRS_SCHEDULE_C],
    tools: [
      {
        label: "Mileage Deduction Calculator",
        href: "/tools/mileage-deduction-calculator",
      },
      {
        label: "Earnings Consolidator",
        href: "/tools/earnings-consolidator",
      },
    ],
    faqs: [
      {
        q: "Do gig workers need to do bookkeeping?",
        a: "Yes. As a 1099 contractor you're running a business, and you must report all income and substantiate every deduction. Simple bookkeeping — a separate account, tracked income and expenses, and a mileage log — saves money at tax time and protects your deductions if you're audited.",
      },
      {
        q: "What's the best way to track gig income and expenses?",
        a: "Run everything through a dedicated bank account so your statement doubles as a ledger, then record income and expenses in a spreadsheet or a gig-focused app and reconcile monthly. Save year-end earnings summaries from each platform and keep receipts for deductions.",
      },
      {
        q: "How should gig workers track mileage?",
        a: "Keep a contemporaneous log with the date, miles, and business purpose of each trip — ideally via an auto-tracking mileage app. Mileage is usually the biggest deduction and the most audited, and estimated or reconstructed mileage is what tends to get disallowed.",
      },
      {
        q: "Do I need an LLC or business bank account to do gig bookkeeping?",
        a: "No. You can keep clean books with an ordinary separate personal checking account. An LLC or formal business account can help as you grow, but it isn't required to track income, expenses, and mileage or to deduct business costs on Schedule C.",
      },
      {
        q: "How long should gig workers keep tax records?",
        a: "Generally at least three years, and longer in certain situations — the IRS publishes the specifics. Digital copies of income records, receipts, and mileage logs are acceptable, so a well-organized folder system is enough.",
      },
    ],
  },
  {
    slug: "gig-worker-budgeting",
    eyebrow: "Gig Finance Guide",
    navLabel: "Budgeting irregular income",
    title: "Budgeting on Irregular Gig Income: Smooth Pay & Build a Buffer",
    metaDescription:
      "How to budget on irregular gig income: pay yourself a steady amount, budget from a low baseline, separate your tax set-aside, and build a buffer. Not advice.",
    h1: "Budgeting on an Irregular Gig Income",
    intro:
      "The hardest part of gig work often isn't earning — it's that the money arrives unevenly. A great week and a slow week need to fund the same rent. The fix is a system that smooths the bumps so a slow stretch doesn't become a crisis. Here's how gig workers budget irregular income.",
    keyPoints: [
      {
        label: "Pay yourself",
        desc: "Move a steady 'salary' to checking; let earnings pool in a buffer.",
      },
      {
        label: "Budget from a low month",
        desc: "Base your essentials on a conservative baseline, not a great week.",
      },
      {
        label: "Separate taxes",
        desc: "Move your tax set-aside out the moment you're paid.",
      },
      {
        label: "Build a buffer",
        desc: "A one-month cushion turns slow weeks into non-events.",
      },
    ],
    sections: [
      {
        heading: "Pay yourself a steady amount",
        body: [
          "Instead of spending whatever lands each week, let your earnings pool in a holding account and transfer yourself a fixed, modest 'paycheck' to your spending account on a set schedule. Good weeks build the holding account; slow weeks draw from it. You get the stability of a salary on top of variable income.",
          "Set the paycheck amount based on what your essentials actually require, not your best week.",
        ],
      },
      {
        heading: "Budget from a conservative baseline",
        body: [
          "Look back over several months and find a low-but-typical month — budget your needs (housing, food, utilities, minimum debt payments) against that figure. When you earn more, the extra goes to taxes, your buffer, retirement, and goals rather than lifestyle creep.",
          "This 'budget low, save the surplus' approach is the core of managing irregular income, and it's exactly what the CFPB recommends for variable earners.",
        ],
      },
      {
        heading: "Separate taxes before you spend",
        body: [
          "Because nothing is withheld from gig pay, the fastest way to avoid a tax-time shock is to move your set-aside (commonly 25–30% of net, depending on your situation) into a separate account the moment you're paid. Treat it as money that was never yours.",
          "That account funds your quarterly estimated payments, so they never compete with rent. Use the Tax Set-Aside calculator to dial in your percentage.",
        ],
      },
      {
        heading: "Build a buffer, then goals",
        body: [
          "Aim first for a small starter buffer, then work toward roughly a month of expenses in your holding account — enough that a slow week or a vehicle repair is an inconvenience, not an emergency. After that, direct surplus to a larger emergency fund, retirement, and your goals.",
          "A buffer is what lets you decline a bad-paying shift or take a day off without panic — the practical freedom gig work is supposed to provide.",
        ],
      },
    ],
    resources: [CFPB_BUDGET, IRS_SE_CENTER],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Payout & Cash-Flow Tracker",
        href: "/tools/cashflow-tracker",
      },
    ],
    faqs: [
      {
        q: "How do you budget with an irregular gig income?",
        a: "Let earnings pool in a holding account and pay yourself a steady, modest amount on a set schedule. Budget your essentials against a conservative (low-but-typical) month, move your tax set-aside out immediately, and send any surplus to a buffer, retirement, and goals.",
      },
      {
        q: "How much should gig workers keep as a buffer?",
        a: "A common target is a small starter cushion first, then about one month of expenses in your holding account, and eventually a larger emergency fund. The buffer is what smooths slow weeks and unexpected costs so they don't derail your essentials.",
      },
      {
        q: "How do I handle taxes when budgeting gig income?",
        a: "Move your tax set-aside — often around 25–30% of net earnings, depending on your situation — into a separate account the moment you're paid, and use it for quarterly estimated payments. Treating tax money as never-yours keeps it from competing with rent. The Tax Set-Aside calculator helps set your rate.",
      },
      {
        q: "Should gig workers pay themselves a salary?",
        a: "Effectively, yes. Routing earnings through a holding account and transferring yourself a fixed amount on a schedule gives you salary-like stability on top of variable pay — good weeks build the account, slow weeks draw from it.",
      },
      {
        q: "How do I deal with slow gig weeks?",
        a: "Plan for them in advance: budget from a low baseline, keep a buffer of about a month of expenses, and avoid scaling up fixed costs after a great week. With a cushion in place, a slow week draws from savings instead of becoming an emergency.",
      },
    ],
  },
];

export const FINANCE_DISCLAIMER = NOT_ADVICE;

export function getFinanceGuide(slug: string): FinanceGuide | undefined {
  return FINANCE_GUIDES.find(g => g.slug === slug);
}
