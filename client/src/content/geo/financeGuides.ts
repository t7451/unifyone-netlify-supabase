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
const CFPB_EMERGENCY = {
  label: "CFPB: Start Small, Save Up (emergency savings)",
  href: "https://www.consumerfinance.gov/start-small-save-up/",
};
const FTC_DEBT = {
  label: "FTC: Getting out of debt",
  href: "https://consumer.ftc.gov/articles/getting-out-debt",
};
const IRS_SEP = {
  label: "IRS: SEP plans (Simplified Employee Pension)",
  href: "https://www.irs.gov/retirement-plans/plan-sponsor/simplified-employee-pension-plan-sep",
};
const IRS_SOLO_401K = {
  label: "IRS: One-participant 401(k) plans",
  href: "https://www.irs.gov/retirement-plans/one-participant-401k-plans",
};
const IRS_BIZ_STRUCTURES = {
  label: "IRS: Business structures",
  href: "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures",
};
const SBA_STRUCTURE = {
  label: "SBA: Choose a business structure",
  href: "https://www.sba.gov/business-guide/launch-your-business/choose-business-structure",
};
const IRS_ESTIMATED_TAXES = {
  label: "IRS: Estimated taxes",
  href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
};
const IRS_WITHHOLDING_ESTIMATOR = {
  label: "IRS: Tax Withholding Estimator",
  href: "https://www.irs.gov/individuals/tax-withholding-estimator",
};
const IRS_FORM_W4 = {
  label: "IRS: About Form W-4 (Employee's Withholding Certificate)",
  href: "https://www.irs.gov/forms-pubs/about-form-w-4",
};
const IRS_SE_TAX = {
  label: "IRS: Self-Employment Tax (Social Security and Medicare)",
  href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
};
const IRS_HOME_OFFICE = {
  label: "IRS: Home office deduction",
  href: "https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction",
};
const IRS_GIG_CENTER = {
  label: "IRS: Gig Economy Tax Center",
  href: "https://www.irs.gov/businesses/gig-economy-tax-center",
};
const IRS_ROTH = {
  label: "IRS: Roth IRAs",
  href: "https://www.irs.gov/retirement-plans/roth-iras",
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
  {
    slug: "gig-worker-emergency-fund",
    eyebrow: "Gig Finance Guide",
    navLabel: "Emergency fund",
    title: "Emergency Funds for Gig Workers: How Much to Save & Where",
    metaDescription:
      "Why gig workers need a bigger emergency fund, how much to save on irregular income, where to keep it, and how to build one fast. Not advice.",
    h1: "Emergency Funds for Gig Workers",
    intro:
      "Without an employer's paid sick leave, severance, or steady paycheck, gig workers feel emergencies harder — a car repair can take out both your transportation and your income at once. That's exactly why an emergency fund matters more for the self-employed, and why it pays to build one a little bigger than the standard advice. Here's how.",
    keyPoints: [
      {
        label: "Aim higher",
        desc: "3–6 months is the usual rule; variable income often warrants the higher end.",
      },
      {
        label: "Buffer first",
        desc: "Build a one-month income buffer before the full fund.",
      },
      {
        label: "Keep it liquid",
        desc: "A separate high-yield savings account — safe, accessible, not invested.",
      },
      {
        label: "Don't raid taxes",
        desc: "Your tax set-aside is not your emergency fund — keep them separate.",
      },
    ],
    sections: [
      {
        heading: "Why gig workers need a bigger cushion",
        body: [
          "Employees often have a paycheck through a short illness, plus unemployment if they're laid off. As an independent contractor you usually have neither — if you can't work, the income simply stops. On top of that, your tools of the trade (often a vehicle) can be the very thing that breaks.",
          "Because a single event can hit your income and your expenses simultaneously, most gig workers benefit from targeting the higher end of the usual emergency-fund range rather than the minimum.",
        ],
      },
      {
        heading: "How much should you save?",
        body: [
          "The common rule of thumb is three to six months of essential expenses. For irregular income, lean toward the larger end — closer to six months — especially if you rely on one platform, drive a high-mileage vehicle, or support a family on your gig income.",
          "Base the target on your essential expenses (housing, food, utilities, insurance, minimum debt payments), not your total spending. Knowing that number is also the foundation of budgeting on irregular income.",
        ],
      },
      {
        heading: "Where to keep it",
        body: [
          "An emergency fund should be safe and liquid, not invested for growth. A separate high-yield savings account — ideally at a different bank from your daily checking, so it's a little harder to dip into — is the standard home for it. You want it accessible within a day or two, without market risk.",
          "Keep it distinct from both your spending account and your tax set-aside account. Mixing them is how 'emergencies' quietly become quarterly tax payments you forgot to plan for.",
        ],
      },
      {
        heading: "How to build it without a steady paycheck",
        body: [
          "Start with a small, concrete milestone — a few hundred dollars — then a one-month income buffer, then the full fund. On variable income, the most reliable method is to save a percentage of every payout rather than a fixed monthly amount, so good weeks contribute more.",
          "Funnel windfalls (a strong week, a tax refund, a referral bonus) straight to the fund, and once it's full, redirect that same percentage toward retirement or other goals. Automating a transfer the day you're paid keeps it from competing with spending.",
        ],
      },
    ],
    resources: [CFPB_EMERGENCY, IRS_SE_CENTER],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Payout & Cash-Flow Tracker",
        href: "/tools/cashflow-tracker",
      },
    ],
    faqs: [
      {
        q: "How much emergency fund should a gig worker have?",
        a: "Most guidance says three to six months of essential expenses; gig workers with variable income often aim for the higher end (closer to six months), especially if they rely on one platform or a single vehicle. Base the target on essentials — housing, food, utilities, insurance, minimum debt payments — not total spending.",
      },
      {
        q: "Why do gig workers need a bigger emergency fund than employees?",
        a: "Independent contractors usually have no paid sick leave, severance, or unemployment cushion, and their income stops entirely if they can't work. A single event — like a car breakdown — can knock out both your earning ability and your budget at once, so a larger cushion is prudent.",
      },
      {
        q: "Where should I keep my emergency fund?",
        a: "In a safe, liquid place — typically a separate high-yield savings account, ideally at a different bank from your checking so it's harder to dip into. Keep it out of investments (no market risk) and separate from your tax set-aside account.",
      },
      {
        q: "Is my tax set-aside the same as an emergency fund?",
        a: "No. Your tax set-aside is money you already owe the IRS and state for quarterly estimates — it isn't savings. Keep it in its own account, separate from your emergency fund, so a real emergency doesn't accidentally spend money earmarked for taxes.",
      },
      {
        q: "How do I build an emergency fund on irregular income?",
        a: "Save a percentage of every payout rather than a fixed monthly amount, so strong weeks contribute more. Start with a small milestone, then a one-month buffer, then the full fund, and route windfalls straight in. Automating the transfer on payday keeps it from competing with spending.",
      },
    ],
  },
  {
    slug: "gig-worker-debt-payoff",
    eyebrow: "Gig Finance Guide",
    navLabel: "Paying off debt",
    title: "Paying Off Debt on a Gig Income: Avalanche, Snowball & Cash Flow",
    metaDescription:
      "How gig workers pay off debt on irregular income: budget from a low baseline, choose avalanche vs snowball, and use surplus weeks. Not advice.",
    h1: "Paying Off Debt on a Gig Income",
    intro:
      "Paying down debt is hard enough with a steady paycheck; doing it on income that swings week to week takes a system. The good news is that the same habits that smooth irregular income — budgeting from a low baseline and saving the surplus — are exactly what let you attack debt without missing a tax payment or a rent check. Here's how to approach it.",
    keyPoints: [
      {
        label: "Stabilize first",
        desc: "A small buffer keeps a slow week from creating new debt.",
      },
      {
        label: "Avalanche",
        desc: "Pay highest-interest debt first to minimize total interest.",
      },
      {
        label: "Snowball",
        desc: "Pay smallest balance first for quick, motivating wins.",
      },
      {
        label: "Attack with surplus",
        desc: "Throw strong-week earnings at debt, not lifestyle creep.",
      },
    ],
    sections: [
      {
        heading: "Stabilize before you accelerate",
        body: [
          "Before throwing everything at debt, build a small starter buffer (even a few hundred dollars) so a slow week or a surprise expense doesn't put you right back on a credit card. Paying off debt only to re-borrow during the next dry spell is the trap irregular income sets.",
          "Keep making at least the minimum payment on every debt no matter what — that protects your credit while you work the plan.",
        ],
      },
      {
        heading: "Avalanche vs snowball",
        body: [
          "The avalanche method pays minimums on everything and directs extra money to the highest-interest debt first. It saves the most money mathematically and is usually best for expensive credit-card debt.",
          "The snowball method instead targets the smallest balance first for a quick payoff and a motivation boost, then rolls that payment into the next-smallest. It can cost a little more interest but keeps many people going. Both work — pick the one you'll actually stick with.",
        ],
      },
      {
        heading: "Use a percentage, and attack with surplus weeks",
        body: [
          "On variable income, commit a percentage of each payout to debt rather than a fixed monthly sum, so strong weeks pay down more. Budget your essentials from a conservative, low-but-typical month; when you out-earn that baseline, the surplus goes to debt instead of lifestyle creep.",
          "Direct windfalls — a great week, a referral bonus, a tax refund — straight at the target balance. That's where irregular income becomes an advantage: the upside weeks accelerate your payoff.",
        ],
      },
      {
        heading: "Don't sacrifice taxes to pay debt",
        body: [
          "It's tempting to throw your tax set-aside at a credit card, but unpaid federal taxes carry penalties and interest and can't be discharged easily — falling behind on estimates just trades one debt for a worse one. Keep moving your set-aside (commonly 25–30% of net) out on payday before you budget for debt.",
          "If debt is overwhelming, a non-profit credit counselor (look for NFCC-affiliated agencies) can help you build a plan. This is educational information, not financial advice.",
        ],
      },
    ],
    resources: [FTC_DEBT, CFPB_BUDGET],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Payout & Cash-Flow Tracker",
        href: "/tools/cashflow-tracker",
      },
    ],
    faqs: [
      {
        q: "How do gig workers pay off debt on irregular income?",
        a: "Build a small buffer first so slow weeks don't create new debt, keep paying every minimum, then commit a percentage of each payout to debt (so strong weeks pay more). Budget essentials from a low baseline and aim surplus and windfalls at the target balance.",
      },
      {
        q: "Avalanche or snowball — which is better for gig workers?",
        a: "The avalanche method (highest interest first) saves the most money; the snowball method (smallest balance first) gives quicker motivating wins. Both work on variable income — choose the one you'll stick with, and fund it with a percentage of each payout rather than a fixed monthly amount.",
      },
      {
        q: "Should I pay off debt or build an emergency fund first?",
        a: "Usually a little of both: build a small starter buffer first so an unexpected cost doesn't send you back into debt, then focus on high-interest debt while maintaining minimums. Once high-interest debt is gone, finish building a full emergency fund.",
      },
      {
        q: "Should I use my tax set-aside to pay off debt?",
        a: "No. Unpaid federal taxes carry penalties and interest and are hard to discharge, so raiding your set-aside just creates a worse debt. Move your tax set-aside (often 25–30% of net) into a separate account on payday and budget debt payments from what's left.",
      },
      {
        q: "Where can gig workers get help with overwhelming debt?",
        a: "A non-profit credit counseling agency (such as those affiliated with the NFCC) can help you build a repayment plan, and the FTC publishes guidance on getting out of debt. Be cautious with for-profit 'debt settlement' offers. This is educational information, not financial advice.",
      },
    ],
  },
  {
    slug: "sep-ira-vs-solo-401k",
    eyebrow: "Gig Finance Guide",
    navLabel: "SEP-IRA vs Solo 401(k)",
    title: "SEP-IRA vs Solo 401(k): Which Is Better for Gig Workers?",
    metaDescription:
      "SEP-IRA vs Solo 401(k) for self-employed gig workers: contributions, Roth options, paperwork, and deadlines compared — and how to choose. Not advice.",
    h1: "SEP-IRA vs Solo 401(k) for Gig Workers",
    intro:
      "Two of the most powerful retirement accounts for the self-employed are the SEP-IRA and the Solo 401(k). Both let gig workers shelter far more than a regular IRA, but they differ on contribution limits, Roth options, paperwork, and deadlines. Here's a head-to-head to help you pick — and it pairs with our broader gig-worker retirement guide.",
    keyPoints: [
      {
        label: "SEP-IRA",
        desc: "Simplest to open and fund; employer-style contribution only.",
      },
      {
        label: "Solo 401(k)",
        desc: "Highest potential total; employee + employer contributions.",
      },
      {
        label: "Roth option",
        desc: "Solo 401(k)s often allow Roth; SEP-IRAs traditionally don't.",
      },
      {
        label: "Deadlines differ",
        desc: "A Solo 401(k) usually must be opened by year-end; SEP-IRAs are more flexible.",
      },
    ],
    sections: [
      {
        heading: "How the SEP-IRA works",
        body: [
          "A SEP-IRA is the simplest self-employed plan: most brokerages open one free in minutes, and contributions are a percentage of your net self-employment earnings up to an annual IRS cap, generally tax-deductible. There's only an 'employer' contribution — no separate employee deferral.",
          "Its big advantages are simplicity and flexibility: you can vary or skip contributions year to year, and you can typically open and fund it up to your tax-filing deadline (including extensions). That makes it ideal if your income is unpredictable or you decide to contribute after year-end.",
        ],
      },
      {
        heading: "How the Solo 401(k) works",
        body: [
          "A Solo 401(k) (one-participant 401(k)) is for self-employed people with no employees. You contribute in two roles: as the 'employee' (an elective deferral up to the annual limit) and as the 'employer' (a profit-sharing percentage). Combining both usually allows a larger total contribution than a SEP-IRA at the same income — especially at low-to-moderate earnings.",
          "Many providers also offer a Roth option on the employee portion, letting you lock in tax-free growth. The trade-offs: a bit more setup and paperwork, an annual filing once the balance is large, and a stricter deadline to establish the plan.",
        ],
      },
      {
        heading: "Head-to-head",
        body: [
          "Contributions: the Solo 401(k) usually wins, because the employee deferral lets you reach a high contribution at a lower income than a SEP-IRA's percentage-only formula. Simplicity: the SEP-IRA wins — less paperwork and no plan document. Roth: the Solo 401(k) typically offers it; the SEP-IRA traditionally doesn't.",
          "Deadlines: SEP-IRAs are more forgiving (often fundable up to the extended filing deadline), while a Solo 401(k) generally must be established by December 31 to defer that year's income. Exact limits and deadlines change yearly — confirm them with the IRS or your provider.",
        ],
      },
      {
        heading: "How to choose",
        body: [
          "If you want maximum simplicity or you're deciding after year-end, the SEP-IRA is hard to beat. If you want to contribute the most possible (especially at moderate income), want a Roth option, and don't mind a little paperwork, the Solo 401(k) usually wins.",
          "Note you generally can't max both at the same time on the same income, and having employees changes the picture. A tax professional or fee-only advisor can run the numbers for your situation. This is educational information, not investment advice.",
        ],
      },
    ],
    resources: [IRS_SEP, IRS_SOLO_401K, IRS_RETIREMENT],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
    ],
    faqs: [
      {
        q: "Is a SEP-IRA or Solo 401(k) better for gig workers?",
        a: "It depends. A Solo 401(k) usually allows higher total contributions (employee + employer) and often a Roth option, making it great for higher savers who don't mind paperwork. A SEP-IRA is simpler, more flexible, and can be opened after year-end — ideal for unpredictable income. Confirm current limits with the IRS.",
      },
      {
        q: "Can a gig worker contribute more to a Solo 401(k) than a SEP-IRA?",
        a: "Often yes, especially at low-to-moderate income, because a Solo 401(k) adds an employee elective deferral on top of the employer profit-sharing contribution, while a SEP-IRA is employer-contribution only. At high income the gap narrows. Check the current year's IRS limits.",
      },
      {
        q: "Does a SEP-IRA or Solo 401(k) have a Roth option?",
        a: "Solo 401(k)s commonly offer a Roth option on the employee deferral, letting contributions grow tax-free. SEP-IRAs traditionally have not offered Roth treatment, though rules evolve — confirm what your provider supports and the current IRS guidance.",
      },
      {
        q: "What are the deadlines to open each account?",
        a: "A SEP-IRA can typically be opened and funded up to your tax-filing deadline (including extensions), while a Solo 401(k) generally must be established by December 31 to defer that year's income (funding can come later). Always confirm current deadlines with the IRS or your provider.",
      },
      {
        q: "Can I have both a SEP-IRA and a Solo 401(k)?",
        a: "You can have both accounts, but you generally can't max out both on the same self-employment income because of combined limits, and contributing to both adds complexity. Most gig workers pick one primary plan. A tax professional can help you optimize.",
      },
    ],
  },
  {
    slug: "llc-vs-sole-proprietorship",
    eyebrow: "Gig Finance Guide",
    navLabel: "LLC vs sole prop",
    title: "LLC vs Sole Proprietorship for Gig Workers: Do You Need an LLC?",
    metaDescription:
      "LLC vs sole proprietorship for gig workers: liability, taxes, cost, and when an LLC is worth it (and the S-corp question). Not advice.",
    h1: "LLC vs Sole Proprietorship for Gig Workers",
    intro:
      '"Should I form an LLC?" is one of the most common questions gig workers ask — and the honest answer is usually "maybe, but not for the reason you think." An LLC mainly changes your liability exposure, not your taxes (at least by default). Here\'s what actually differs, so you can decide with eyes open. This is educational information, not legal or tax advice.',
    keyPoints: [
      {
        label: "Sole prop = default",
        desc: "Do nothing and you're already a sole proprietor.",
      },
      {
        label: "LLC = liability",
        desc: "Its main benefit is separating business and personal liability.",
      },
      {
        label: "Same taxes by default",
        desc: "A single-member LLC is taxed the same as a sole proprietor.",
      },
      {
        label: "S-corp is separate",
        desc: "Tax savings come from an S-corp election, not the LLC itself.",
      },
    ],
    sections: [
      {
        heading: "You're already a sole proprietor",
        body: [
          "If you drive, deliver, or freelance without forming anything, you're automatically a sole proprietor. You report income and expenses on Schedule C, pay self-employment tax, and can deduct all the same business expenses (mileage, phone, supplies). You don't need an LLC to claim deductions or run a legitimate business.",
          "A sole proprietorship costs nothing to start and has the least paperwork — which is why most gig workers operate as one, at least at first.",
        ],
      },
      {
        heading: "What an LLC actually changes",
        body: [
          "A limited liability company is a legal structure (formed at the state level) that separates your business from you personally. Its core benefit is liability protection: if the business is sued or owes a debt, your personal assets are generally shielded — provided you keep business and personal finances truly separate.",
          "An LLC can also add credibility and makes a clean business bank account natural. But it isn't a magic tax shield, and it adds a state filing fee (sometimes annual), some paperwork, and recordkeeping discipline.",
        ],
      },
      {
        heading: "Taxes: usually no difference by default",
        body: [
          "This is the part that surprises people: by default, a single-member LLC is a 'disregarded entity,' meaning the IRS taxes it exactly like a sole proprietorship — same Schedule C, same self-employment tax. Forming an LLC, by itself, does not lower your federal income tax.",
          "Where tax savings can appear is a separate step: an LLC (or sole proprietor) can elect to be taxed as an S-corporation, which may reduce self-employment tax on part of the profit by splitting it into salary and distributions. That only makes sense above a certain profit level and adds payroll, filings, and cost — so it's a decision to make with a tax professional.",
        ],
      },
      {
        heading: "When an LLC (or S-corp) makes sense",
        body: [
          "Consider an LLC if you have meaningful liability exposure (clients in their homes, employees or subcontractors, significant assets to protect) or you simply want the separation and credibility. For a solo driver with modest earnings, the liability benefit may be limited and good insurance might address the real risk.",
          "Consider the S-corp election only once your net profit is consistently high enough that the self-employment-tax savings clearly outweigh the added payroll and accounting costs. Talk to an attorney about the structure and a tax professional about the election before you file — this is educational information, not legal or tax advice.",
        ],
      },
    ],
    resources: [IRS_BIZ_STRUCTURES, SBA_STRUCTURE],
    tools: [
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
      {
        label: "Quarterly Tax Estimator",
        href: "/tools/quarterly-tax-estimator",
      },
    ],
    faqs: [
      {
        q: "Do gig workers need an LLC?",
        a: "Usually not to start. Without forming anything you're a sole proprietor, which lets you deduct expenses and run a legitimate business. An LLC mainly adds liability protection — worth considering if you have real exposure or assets to protect, but it isn't required to claim deductions.",
      },
      {
        q: "Does forming an LLC lower my gig taxes?",
        a: "By default, no. A single-member LLC is a 'disregarded entity' taxed exactly like a sole proprietorship — same Schedule C and self-employment tax. Tax savings only come from a separate S-corporation election, which makes sense only above a certain profit level and adds cost and payroll.",
      },
      {
        q: "What's the difference between an LLC and a sole proprietorship?",
        a: "A sole proprietorship is the automatic default with no setup and no liability separation. An LLC is a state-registered structure that legally separates your business from you, protecting personal assets if the business is sued or owes a debt — but by default it's taxed the same way.",
      },
      {
        q: "What is an S-corp election and should a gig worker make one?",
        a: "An S-corp election changes how your business is taxed, potentially reducing self-employment tax by splitting profit into salary and distributions. It adds payroll, filings, and cost, so it generally only pays off once net profit is consistently high. Decide with a tax professional.",
      },
      {
        q: "Can I deduct business expenses without an LLC?",
        a: "Yes. Sole proprietors deduct the same business expenses — mileage, phone, supplies, platform fees — on Schedule C without any LLC. Deductions come from having legitimate business expenses and records, not from your legal structure.",
      },
    ],
  },
  {
    slug: "gig-worker-w2-job-taxes",
    eyebrow: "Gig Finance Guide",
    navLabel: "Gig + a W-2 job",
    title: "Gig Work Plus a W-2 Job: How to Handle Taxes on Both",
    metaDescription:
      "Have a W-2 job and gig income? How to report gig income on Schedule C, owe SE tax, and use W-2 withholding instead of quarterly estimates. Not advice.",
    h1: "Taxes When You Have a W-2 Job and Gig Income",
    intro:
      "Plenty of gig workers also hold a regular W-2 job — driving or freelancing on the side of a 9-to-5. The income tax part feels familiar because your employer withholds, but the gig side adds a self-employment layer most people don't expect. Here's how the two fit together so neither one surprises you at tax time. This is educational information, not tax advice.",
    keyPoints: [
      {
        label: "Still file Schedule C",
        desc: "Side-gig income goes on Schedule C even if it's small.",
      },
      {
        label: "SE tax on gig net",
        desc: "You owe the 15.3% self-employment tax on net gig earnings.",
      },
      {
        label: "Withhold more at work",
        desc: "Extra W-2 withholding can replace separate quarterly estimates.",
      },
      {
        label: "Income stacks",
        desc: "Both incomes add together to set your income-tax bracket.",
      },
    ],
    sections: [
      {
        heading: "Your gig income still gets reported (and still owes SE tax)",
        body: [
          "Having a W-2 job doesn't make your side income tax-free. You report gig (1099) earnings on Schedule C as a business, deduct your related expenses (mileage, supplies, platform fees), and the net profit flows to your return on top of your W-2 wages. You must report it even if a platform never sends a 1099.",
          "On that net gig profit you also owe self-employment tax — roughly 15.3% for Social Security and Medicare — calculated on Schedule SE. Your W-2 job already has the employee half of those taxes withheld from your paycheck, but your gig profit is separate and isn't covered by that withholding, so plan for it.",
        ],
      },
      {
        heading: "Use W-2 withholding instead of quarterly estimates",
        body: [
          "Because you don't owe enough through the year, the IRS expects gig workers to make quarterly estimated payments — but with a W-2 job you often have an easier option. Instead of sending separate estimated payments, you can increase the withholding from your paycheck to cover the extra tax your gig income creates.",
          "You do this by filing a new Form W-4 with your employer (there's a line for extra withholding), ideally after running the IRS Tax Withholding Estimator to size the increase. Withholding is treated as paid evenly across the year, which can also help you sidestep underpayment penalties that estimated payments are more prone to. Confirm the current rules with the IRS.",
        ],
      },
      {
        heading: "How the two incomes stack",
        body: [
          "For income tax, your W-2 wages and your net gig profit are added together to determine your total taxable income and which brackets apply. That means a side gig can push some of your income into a higher marginal bracket, so the tax on those gig dollars may be higher than you'd guess from your day-job rate alone.",
          "Self-employment tax is separate from income tax and applies only to the gig net, not your W-2 wages. You also get an above-the-line deduction for half of the self-employment tax. Looking at both layers together is the only way to estimate the real cost of the side income.",
        ],
      },
      {
        heading: "The Social Security wage base interaction",
        body: [
          "Social Security tax applies only up to an annual wage base, and the Social Security tax already withheld from your W-2 paycheck counts toward that yearly maximum. If your W-2 wages are high, part or all of the Social Security portion of your self-employment tax may be reduced because you've already hit the cap through your job.",
          "The Medicare portion has no wage cap, so it always applies to your gig net. Schedule SE handles this coordination, and the wage-base figure changes yearly — confirm the current amount with the IRS rather than assuming last year's number. A tax professional can help you model it.",
        ],
      },
    ],
    resources: [IRS_WITHHOLDING_ESTIMATOR, IRS_FORM_W4, IRS_SCHEDULE_C],
    tools: [
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
      {
        label: "Quarterly Tax Estimator",
        href: "/tools/quarterly-tax-estimator",
      },
    ],
    faqs: [
      {
        q: "Do I have to report gig income if I already have a W-2 job?",
        a: "Yes. A W-2 job doesn't exempt your side income — you report gig (1099) earnings on Schedule C, deduct related expenses, and the net profit is added to your W-2 wages on your return. You must report it even if no 1099 arrives, and you owe self-employment tax on the net.",
      },
      {
        q: "Do I owe self-employment tax on side gig income if I have a regular job?",
        a: "Generally yes. The roughly 15.3% self-employment tax applies to your net gig profit regardless of your W-2 job, and it's separate from the Social Security and Medicare already withheld from your paycheck. Schedule SE calculates it; you also deduct half of it. Confirm specifics with the IRS.",
      },
      {
        q: "Can I avoid quarterly estimated taxes by adjusting my W-2 withholding?",
        a: "Often, yes. Instead of sending separate estimated payments, you can file a new Form W-4 to withhold extra from your paycheck to cover the tax on your gig income. Withholding counts as paid evenly across the year, which can help avoid penalties. The IRS Tax Withholding Estimator helps size it.",
      },
      {
        q: "How does gig income affect my tax bracket if I also have a W-2?",
        a: "Your W-2 wages and net gig profit are added together to set your total taxable income, so side income can push part of your earnings into a higher marginal bracket. That means gig dollars may be taxed at a higher rate than your day-job income alone would suggest.",
      },
      {
        q: "Does my W-2 Social Security tax count toward the self-employment tax cap?",
        a: "Yes. Social Security tax applies only up to an annual wage base, and the Social Security tax already withheld from your W-2 wages counts toward that maximum, potentially reducing the Social Security portion of your self-employment tax. The Medicare portion has no cap. Confirm the current wage base with the IRS.",
      },
    ],
  },
  {
    slug: "multi-state-gig-taxes",
    eyebrow: "Gig Finance Guide",
    navLabel: "Multi-state gig work",
    title: "Multi-State Gig Taxes: Working Across State Lines",
    metaDescription:
      "Gig work across state lines or moving mid-year: resident vs nonresident state tax, the credit for taxes paid to other states, and part-year rules. Not advice.",
    h1: "Multi-State Taxes for Gig Workers",
    intro:
      "If you drive, deliver, or freelance across state lines — or you moved partway through the year — your gig income can touch more than one state's tax system. It sounds alarming, but the rules are designed so you're rarely taxed twice on the same dollar. Here's how multi-state taxation generally works for gig workers. This is educational information, not tax advice.",
    keyPoints: [
      {
        label: "Resident state",
        desc: "Your home state usually taxes all of your income.",
      },
      {
        label: "Nonresident states",
        desc: "States where you physically earn may tax that income too.",
      },
      {
        label: "Credit prevents double tax",
        desc: "A credit for taxes paid to other states usually offsets the overlap.",
      },
      {
        label: "Moving = part-year",
        desc: "Relocating mid-year usually means part-year returns in both states.",
      },
    ],
    sections: [
      {
        heading: "Your resident state taxes everything",
        body: [
          "As a general rule, the state you live in (your state of residence) can tax all of your income, no matter where you earned it. So if you live in one state but pick up gig work in a neighboring one, your home state still expects to see that income on its return.",
          "A handful of states have no personal income tax, which simplifies things if you live in one of them. But residency is about where your true home is, not just where you sleep on a given night — and states have their own definitions, so check the rules where you live.",
        ],
      },
      {
        heading: "Nonresident states can tax what you earn there",
        body: [
          "Separately, a state where you physically perform gig work but don't live (a nonresident state) can often tax the income you earned within its borders. For gig workers this typically tracks where the work physically happens — the miles you drove or deliveries you made inside that state — rather than where the platform is headquartered.",
          "States set their own thresholds for when a nonresident must file, so a little work across a border might or might not trigger a return. Each state's Department of Revenue publishes its filing rules; confirm them rather than assuming.",
        ],
      },
      {
        heading: "The credit for taxes paid to other states",
        body: [
          "If both your resident state and a nonresident state tax the same income, you're usually not taxed twice. Your resident state typically gives you a credit for income taxes you paid to the other state, offsetting the overlap so the same dollars aren't fully taxed by both.",
          "The credit is generally limited to your resident state's tax on that income, so if the nonresident state's rate is higher you may not recover all of it. The mechanics vary by state, which is one reason multi-state filers often work with a tax professional.",
        ],
      },
      {
        heading: "Moving mid-year and the reciprocity caveat",
        body: [
          "If you move from one state to another during the year, you're usually a part-year resident of each. That generally means filing a part-year return in both states, splitting your income based on when you earned it as a resident of each — keep good records of your move date and income timing.",
          "You may have heard of reciprocity agreements that let residents skip filing in a neighboring work state. Those agreements mostly apply to W-2 wages, and often do not cover self-employment or gig (1099) income, so don't assume one protects your gig earnings. Confirm with both states' Departments of Revenue.",
        ],
      },
    ],
    resources: [
      {
        label: "State Departments of Revenue (verify your states' rules)",
        href: "https://www.irs.gov/businesses/small-businesses-self-employed/state-government-websites",
      },
      IRS_SE_CENTER,
    ],
    tools: [
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
    ],
    faqs: [
      {
        q: "Which state do I pay gig taxes to if I work across state lines?",
        a: "Generally your resident (home) state taxes all of your income, and a nonresident state can also tax income you physically earned within its borders. A credit for taxes paid to other states usually prevents the same dollars from being fully taxed twice. Confirm each state's rules with its Department of Revenue.",
      },
      {
        q: "Do I get taxed twice on gig income earned in another state?",
        a: "Usually not. When both your resident state and a nonresident state tax the same income, your resident state typically grants a credit for taxes paid to the other state, offsetting the overlap. The credit is generally capped at your home state's tax on that income, so a higher out-of-state rate may not be fully recovered.",
      },
      {
        q: "What happens to my gig taxes if I move to another state mid-year?",
        a: "Moving during the year usually makes you a part-year resident of each state, meaning you file a part-year return in both and split your income based on when you earned it as a resident of each. Keep records of your move date and income timing, and confirm the rules with both states.",
      },
      {
        q: "Do state reciprocity agreements cover gig income?",
        a: "Often not. Reciprocity agreements that let residents avoid filing in a neighboring work state mostly apply to W-2 wages, and frequently exclude self-employment or 1099 gig income. Don't assume an agreement protects your gig earnings — verify with both states' Departments of Revenue.",
      },
      {
        q: "Do I have to file a nonresident return for a little gig work in another state?",
        a: "It depends on that state's filing thresholds, which vary. A small amount of work across a border may or may not require a nonresident return. Because each state sets its own rules, check the relevant Department of Revenue, and consider a tax professional for multi-state situations.",
      },
    ],
  },
  {
    slug: "new-gig-worker-tax-checklist",
    eyebrow: "Gig Finance Guide",
    navLabel: "First-year tax checklist",
    title: "New Gig Worker Tax Checklist: Your First Year of 1099 Income",
    metaDescription:
      "New to gig work? A first-year tax checklist: report all income, set aside 25–30%, log mileage from day one, and learn the quarterly schedule. Not advice.",
    h1: "First-Year Tax Checklist for New Gig Workers",
    intro:
      "Your first year of gig work is when good habits (or expensive mistakes) get set. Nothing is withheld from your pay, no one hands you a system, and the IRS now treats you as a small business. This checklist covers the handful of things to do from day one so your first tax season is a non-event instead of a shock. This is educational information, not tax advice.",
    keyPoints: [
      {
        label: "Report all income",
        desc: "Every dollar counts, even if no 1099 ever arrives.",
      },
      {
        label: "Set aside 25–30%",
        desc: "Move a chunk of every payout to a separate tax account.",
      },
      {
        label: "Track mileage now",
        desc: "Start a contemporaneous mileage log on your very first trip.",
      },
      {
        label: "Learn the quarters",
        desc: "Estimated taxes may be due four times a year, not just in April.",
      },
    ],
    sections: [
      {
        heading: "Report all income and separate your money",
        body: [
          "Start from the rule that catches new gig workers off guard: you must report all of your gig income, even from a platform that never sends you a 1099. The form is just paperwork — the obligation to report is on you regardless. Save every year-end earnings summary your apps provide.",
          "Open a separate bank account for gig work on day one and route payouts through it. Your statement becomes an effortless ledger, business and personal money stay cleanly divided, and it's where your tax set-aside will live. You don't need an LLC or a business account — a plain second checking account is enough to start.",
        ],
      },
      {
        heading: "Set aside money from your very first payout",
        body: [
          "Because nothing is withheld, the single most important habit is to set aside a portion of every payment for taxes — commonly around 25–30% of your net earnings, depending on your tax bracket and state. Move it into your separate account the moment you're paid and treat it as money that was never yours.",
          "Doing this from day one is what prevents the classic first-year surprise: a tax bill you have no cash for. If you skip it all year and spend the full payouts, you can owe income tax plus the roughly 15.3% self-employment tax all at once. Use the Tax Set-Aside calculator to dial in your percentage.",
        ],
      },
      {
        heading: "Start a mileage log immediately",
        body: [
          "Mileage is usually a gig worker's largest deduction, but only if you can substantiate it. Begin a contemporaneous mileage log on your first trip — the date, miles, and business purpose, recorded at the time, ideally with an auto-tracking app. Mileage you reconstruct from memory at tax time is exactly what gets disallowed.",
          "Keep receipts for other deductible costs too (phone, supplies, tolls, parking, platform fees). A photo in a dedicated folder is fine. Good records from the start turn deductions from a guess into documented numbers you can defend.",
        ],
      },
      {
        heading: "Learn the quarterly schedule and what you'll file",
        body: [
          "The IRS generally expects taxes to be paid as you earn, so if you'll owe roughly $1,000 or more for the year, you may need to make quarterly estimated payments rather than paying it all in April. There are typically four payment dates spread through the year — learn them early so a deadline doesn't catch you out. Confirm the current schedule and threshold with the IRS.",
          "At tax time you'll file a Schedule C (your business profit and loss) and a Schedule SE (self-employment tax) along with your regular return. None of this is hard once your records are clean — which is why the set-aside, the separate account, and the mileage log on this list matter most. A tax professional can help in year one.",
        ],
      },
    ],
    resources: [IRS_ESTIMATED_TAXES, IRS_SCHEDULE_C, IRS_SE_CENTER],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Mileage Deduction Calculator",
        href: "/tools/mileage-deduction-calculator",
      },
    ],
    faqs: [
      {
        q: "What should a new gig worker do about taxes first?",
        a: "From day one: report all income (even with no 1099), open a separate bank account for gig money, set aside about 25–30% of net for taxes on every payout, start a contemporaneous mileage log, and learn the quarterly estimated-tax schedule. These habits prevent a first-year tax surprise.",
      },
      {
        q: "Do I have to report gig income if I don't get a 1099?",
        a: "Yes. You must report all gig income regardless of whether a platform sends a 1099 — the form is just paperwork, and the reporting obligation is yours. Save each platform's year-end earnings summary and report the total on Schedule C.",
      },
      {
        q: "How much should a first-year gig worker set aside for taxes?",
        a: "A common starting point is around 25–30% of your net earnings, set aside from every payout, though the right figure depends on your tax bracket and state. Moving it into a separate account the moment you're paid is what prevents owing a lump sum you can't cover at tax time.",
      },
      {
        q: "Do new gig workers have to pay quarterly estimated taxes?",
        a: "Often, yes. If you expect to owe roughly $1,000 or more for the year, the IRS generally expects quarterly estimated payments rather than paying everything in April, with about four payment dates through the year. Confirm the current threshold and schedule with the IRS.",
      },
      {
        q: "What tax forms does a first-year gig worker file?",
        a: "Most gig workers file a Schedule C to report business profit or loss and a Schedule SE to calculate self-employment tax, alongside their regular tax return. Clean records — a mileage log, receipts, and a separate account — make filling them out straightforward.",
      },
    ],
  },
  {
    slug: "self-employment-tax-explained",
    eyebrow: "Gig Finance Guide",
    navLabel: "Self-employment tax explained",
    title: "Self-Employment Tax Explained: What Gig Workers Pay and Why",
    metaDescription:
      "Self-employment tax explained: the 15.3% rate, how it's figured on 92.35% of net, the deductible half, and the Social Security wage cap. Not advice.",
    h1: "Self-Employment Tax Explained",
    intro:
      "Self-employment tax is the part of gig taxes that surprises people most — it's separate from income tax and it isn't withheld from your pay. It's also the reason a 1099 gig can owe more tax than a W-2 job at the same income. Here's exactly what it is, how it's calculated, and the breaks that soften it.",
    keyPoints: [
      {
        label: "15.3% combined",
        desc: "12.4% Social Security + 2.9% Medicare — the employer and employee halves you now cover both of.",
      },
      {
        label: "On 92.35% of net",
        desc: "SE tax applies to about 92.35% of your net self-employment profit, not your gross.",
      },
      {
        label: "Half is deductible",
        desc: "You deduct half of your SE tax from income (above the line), which lowers income tax.",
      },
      {
        label: "Social Security cap",
        desc: "The 12.4% Social Security portion only applies up to an annual wage base; Medicare has no cap.",
      },
    ],
    sections: [
      {
        heading: "What self-employment tax is",
        body: [
          "When you're an employee, you and your employer each pay half of Social Security and Medicare taxes (FICA). When you're self-employed, you're both — so you pay the whole 15.3% yourself, as self-employment (SE) tax. It funds the same Social Security and Medicare benefits.",
          "SE tax is on top of regular federal and state income tax. That's why setting aside only enough for income tax leaves gig workers short: the 15.3% SE tax is a separate, additional bill.",
        ],
      },
      {
        heading: "How it's calculated",
        body: [
          "SE tax is figured on roughly 92.35% of your net self-employment earnings (your profit after deductions), not your gross income — so deductions like mileage lower it. The rate is 15.3%: 12.4% for Social Security plus 2.9% for Medicare.",
          "Because it's based on net profit, every legitimate business deduction you track reduces both your income tax and your SE tax base. Confirm the current figures and the exact computation with the IRS.",
        ],
      },
      {
        heading: "The deduction for half",
        body: [
          "You get to deduct one-half of your self-employment tax as an above-the-line deduction — it lowers your taxable income (income tax) even if you don't itemize. It does not reduce the SE tax itself, but it softens the overall hit.",
          "This is the self-employed version of the employer's half being a business cost rather than personal income, and it applies automatically when you file Schedule SE.",
        ],
      },
      {
        heading: "The Social Security cap and Additional Medicare",
        body: [
          "The 12.4% Social Security portion only applies up to an annual Social Security wage base; earnings above that aren't subject to the Social Security part (but the 2.9% Medicare part has no cap). High earners may also owe an Additional Medicare Tax above certain thresholds.",
          "These thresholds change yearly, so check the current wage base and Additional Medicare rules on IRS.gov. This is educational information, not tax advice.",
        ],
      },
    ],
    resources: [IRS_SE_TAX, IRS_SE_CENTER],
    tools: [
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
    ],
    faqs: [
      {
        q: "What is self-employment tax?",
        a: "It's the 15.3% tax (12.4% Social Security + 2.9% Medicare) that self-employed people pay to fund Social Security and Medicare — covering both the employer and employee halves a W-2 worker would split. It's separate from, and on top of, income tax.",
      },
      {
        q: "How much is self-employment tax for gig workers?",
        a: "The rate is 15.3%, applied to about 92.35% of your net self-employment profit (not gross). Deductions reduce the profit it's figured on, so tracking expenses like mileage lowers your SE tax. Confirm current details with the IRS.",
      },
      {
        q: "Can I lower my self-employment tax?",
        a: "You lower the base it's calculated on by claiming every legitimate business deduction (mileage, supplies, fees), which reduces net profit. Retirement contributions reduce income tax but generally not SE tax. You also deduct half of the SE tax from income.",
      },
      {
        q: "Do I pay self-employment tax on top of income tax?",
        a: "Yes. SE tax and income tax are separate. A common gig-worker mistake is setting aside only for income tax and being surprised by the additional 15.3% SE tax — which is why a 25–30% set-aside on net is a common rule of thumb.",
      },
      {
        q: "Is there a cap on self-employment tax?",
        a: "The 12.4% Social Security portion only applies up to an annual Social Security wage base; the 2.9% Medicare portion has no cap, and high earners may owe an Additional Medicare Tax. The wage base changes yearly — check the current figure with the IRS.",
      },
    ],
  },
  {
    slug: "gig-worker-home-office-deduction",
    eyebrow: "Gig Finance Guide",
    navLabel: "Home office deduction",
    title: "The Home Office Deduction for Gig Workers: Who Qualifies",
    metaDescription:
      "The home office deduction for gig workers: the regular-and-exclusive-use test, simplified vs actual method, and why drivers often don't qualify. Not advice.",
    h1: "The Home Office Deduction for Gig Workers",
    intro:
      "The home office deduction is valuable for desk-based gig workers — freelancers, online sellers, virtual assistants — but it's also one of the most misunderstood. It has a strict test, two calculation methods, and it doesn't fit every kind of gig work. Here's who qualifies and how it works.",
    keyPoints: [
      {
        label: "Regular & exclusive",
        desc: "The space must be used regularly AND exclusively for your business — not a kitchen table.",
      },
      {
        label: "Two methods",
        desc: "The simplified method (a set rate per square foot) or the actual-expense method.",
      },
      {
        label: "Not for most drivers",
        desc: "Rideshare/delivery drivers usually have no qualifying home office; freelancers and sellers often do.",
      },
      {
        label: "Income tax only",
        desc: "It reduces income tax, not the 15.3% self-employment tax.",
      },
    ],
    sections: [
      {
        heading: "The regular-and-exclusive-use test",
        body: [
          "To deduct a home office you generally must use a specific area of your home both regularly and exclusively for your business, and it must be your principal place of business. 'Exclusively' is strict — a spare room used only for work qualifies; the corner of a living room you also relax in does not.",
          "If you're self-employed and meet the test, you can take the deduction on Schedule C even though employees generally cannot. Confirm the current rules with the IRS (Publication 587).",
        ],
      },
      {
        heading: "Simplified vs actual-expense method",
        body: [
          "The simplified method multiplies your office's square footage by a set IRS rate, up to a cap — easy, with no need to track individual home costs. The actual-expense method deducts the business-use percentage of real costs (rent or mortgage interest, utilities, insurance, repairs), which can be larger but requires records.",
          "You can choose whichever gives the better result, and the current simplified rate and cap are on IRS.gov.",
        ],
      },
      {
        heading:
          "Why most drivers don't qualify (but sellers and freelancers might)",
        body: [
          "Rideshare and delivery drivers usually can't claim a home office — their work happens in the car, not a dedicated room — though a space used exclusively to manage the business might qualify in some cases. Their big deduction is mileage instead.",
          "Desk-based gig workers — freelancers, online sellers who store and pack inventory, tutors, designers — are the ones who most often qualify, since they genuinely use a dedicated space to do the work.",
        ],
      },
      {
        heading: "What it saves (and doesn't)",
        body: [
          "The home office deduction lowers your taxable income, reducing income tax. Like most deductions, it reduces the net profit that self-employment tax is figured on too, but it isn't a separate SE-tax break.",
          "Keep simple records — square footage and, for the actual method, your home expenses — and confirm eligibility with the IRS. This is educational information, not tax advice.",
        ],
      },
    ],
    resources: [IRS_HOME_OFFICE, IRS_SE_CENTER],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
    ],
    faqs: [
      {
        q: "Can gig workers claim the home office deduction?",
        a: "Self-employed gig workers can if they use a part of their home regularly and exclusively for their business, and it's their principal place of business. Freelancers and online sellers often qualify; rideshare and delivery drivers usually don't, since their work happens in the vehicle.",
      },
      {
        q: "What is the regular-and-exclusive-use test?",
        a: "The space must be used regularly for business and exclusively for business — nothing else. A dedicated room or a clearly defined area used only for work can qualify; a shared space like a dining table does not. Confirm specifics with IRS Publication 587.",
      },
      {
        q: "Simplified or actual-expense method — which is better?",
        a: "The simplified method uses a set rate per square foot (up to a cap) with minimal recordkeeping; the actual-expense method deducts the business-use share of real home costs and can be larger but needs records. Pick whichever gives the bigger deduction for your situation.",
      },
      {
        q: "Do delivery and rideshare drivers get a home office deduction?",
        a: "Usually not — their work is done in the car, so there's typically no qualifying home office. Their primary deduction is business mileage. A space used exclusively to run the business might qualify in limited cases; confirm with the IRS.",
      },
      {
        q: "Does the home office deduction reduce self-employment tax?",
        a: "It reduces your net business profit, which is the base both income tax and self-employment tax are figured on, so it lowers both indirectly. It is not a separate credit against the 15.3% SE tax. It mainly benefits your income tax.",
      },
    ],
  },
  {
    slug: "gig-worker-tax-mistakes",
    eyebrow: "Gig Finance Guide",
    navLabel: "Common tax mistakes",
    title: "Common Gig Worker Tax Mistakes (and How to Avoid Them)",
    metaDescription:
      "Common gig worker tax mistakes: skipping the set-aside, no mileage log, missing quarterly estimates, and not reporting sub-threshold income. Not advice.",
    h1: "Common Gig Worker Tax Mistakes (and How to Avoid Them)",
    intro:
      "Most gig-worker tax pain comes from a handful of avoidable mistakes — and they're far cheaper to prevent than to fix. Here are the ones that cost gig workers the most, and the simple habit that heads each one off.",
    keyPoints: [
      {
        label: "No set-aside",
        desc: "Spending all of every payout, then facing a bill with nothing saved.",
      },
      {
        label: "No mileage log",
        desc: "Losing the single biggest deduction by not tracking miles as you go.",
      },
      {
        label: "Skipping quarterlies",
        desc: "Waiting until April and getting hit with an underpayment penalty.",
      },
      {
        label: "Underreporting",
        desc: "Assuming income with no 1099 isn't taxable — all income must be reported.",
      },
    ],
    sections: [
      {
        heading: "Not setting money aside for taxes",
        body: [
          "Because nothing is withheld, the most common and painful mistake is spending everything you earn and having nothing set aside when taxes are due. The fix is mechanical: move roughly 25–30% of each payout's net into a separate account the moment you're paid, and treat it as money that was never yours.",
          "Remember the bill includes both income tax and the 15.3% self-employment tax, which is why setting aside for income tax alone falls short.",
        ],
      },
      {
        heading: "Not tracking mileage and expenses",
        body: [
          "Mileage is usually a gig worker's largest deduction, and it's the most commonly lost — because reconstructed, estimated mileage is exactly what gets disallowed in an audit. Keep a contemporaneous log (date, miles, purpose), ideally with an auto-tracking app, and save receipts for other expenses.",
          "Under-tracking deductions means you overpay both income tax and SE tax, since both are figured on your net profit.",
        ],
      },
      {
        heading: "Skipping quarterly estimated taxes",
        body: [
          "If you expect to owe about $1,000 or more for the year, the IRS generally expects quarterly estimated payments. Waiting until April can trigger an underpayment penalty even if you pay in full then. Paying as you go from your set-aside account avoids it.",
          "Mark the quarterly dates and pay from the money you've already set aside, so estimates never compete with rent.",
        ],
      },
      {
        heading: "Underreporting income and mixing finances",
        body: [
          "You must report all income, including from platforms that don't send a 1099 (and the 1099-K threshold has changed, so forms may or may not arrive). Leaving income off your return is a serious mistake. Equally common: running business and personal money through one account, which makes deductions hard to prove.",
          "Open a separate account and report everything — clean records are the cheapest insurance you can buy. Confirm current rules with the IRS. This is educational information, not tax advice.",
        ],
      },
    ],
    resources: [IRS_GIG_CENTER, IRS_SE_CENTER],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Quarterly Tax Estimator",
        href: "/tools/quarterly-tax-estimator",
      },
    ],
    faqs: [
      {
        q: "What's the most common gig worker tax mistake?",
        a: "Not setting money aside. Because nothing is withheld, gig workers who spend every payout get a nasty surprise at tax time. Moving ~25–30% of each payout's net into a separate account as you earn is the simplest fix.",
      },
      {
        q: "Do I have to report gig income if I didn't get a 1099?",
        a: "Yes. All income is reportable whether or not a 1099-NEC or 1099-K arrives. The 1099-K threshold has changed in recent years, so forms may or may not be issued — but your obligation to report doesn't depend on receiving one.",
      },
      {
        q: "What happens if I skip quarterly estimated taxes?",
        a: "If you owe about $1,000 or more for the year and didn't pay enough during it, the IRS can charge an underpayment penalty even if you pay in full in April. Paying quarterly from your set-aside avoids it. Confirm the current threshold with the IRS.",
      },
      {
        q: "Why is a mileage log so important?",
        a: "Mileage is usually the biggest deduction, and estimated or reconstructed mileage is what tends to get disallowed. A contemporaneous log (date, miles, purpose) protects the deduction and lowers both your income tax and self-employment tax.",
      },
      {
        q: "Should I keep a separate bank account for gig work?",
        a: "It's strongly recommended. A dedicated account makes your statement double as a ledger, cleanly separates business from personal in case of an audit, and makes it far easier to substantiate deductions. You don't need an LLC to do it.",
      },
    ],
  },
  {
    slug: "gig-worker-roth-ira",
    eyebrow: "Gig Finance Guide",
    navLabel: "Roth IRA",
    title: "Roth IRAs for Gig Workers: Tax-Free Retirement Savings",
    metaDescription:
      "Roth IRAs for gig workers: after-tax contributions, tax-free growth, income limits, and how a Roth fits with a SEP-IRA or Solo 401(k). Not advice.",
    h1: "Roth IRAs for Gig Workers",
    intro:
      "A Roth IRA is one of the simplest and most flexible ways for a gig worker to save for retirement — and its tax-free growth is especially valuable in your lower-earning years. It also pairs well with the bigger self-employed accounts. Here's how a Roth works and when it fits.",
    keyPoints: [
      {
        label: "After-tax in, tax-free out",
        desc: "You contribute money you've already paid tax on; qualified withdrawals in retirement are tax-free.",
      },
      {
        label: "Great in low years",
        desc: "Funding a Roth when your income (and tax rate) is lower locks in tax-free growth cheaply.",
      },
      {
        label: "Income limits apply",
        desc: "High earners may be limited or phased out of direct Roth contributions.",
      },
      {
        label: "Stacks with SEP/Solo",
        desc: "You can use a Roth IRA alongside a SEP-IRA or Solo 401(k) for more total savings.",
      },
    ],
    sections: [
      {
        heading: "How a Roth IRA works",
        body: [
          "You contribute after-tax dollars to a Roth IRA, the money grows tax-free, and qualified withdrawals in retirement are completely tax-free. Unlike a Traditional IRA, you get no deduction now — you pay the tax up front in exchange for never paying it on the growth.",
          "Anyone with earned income can generally open one at a brokerage in minutes, and contributions are capped at an annual limit the IRS sets.",
        ],
      },
      {
        heading: "Why it fits gig workers",
        body: [
          "Gig income is variable, and a Roth shines in lower-income years: paying tax on the contribution now, while your rate is low, is a bargain compared with deferring it. You can also withdraw your own contributions (not earnings) without penalty in a pinch — useful flexibility for irregular income, though it's best left to grow.",
          "It's a great first retirement account if you're newer to gig work or saving smaller amounts, before layering on a SEP-IRA or Solo 401(k).",
        ],
      },
      {
        heading: "Limits and eligibility",
        body: [
          "Roth IRAs have an annual contribution limit (lower than SEP-IRAs or Solo 401(k)s), and your ability to contribute directly phases out above certain income levels. Both the contribution limit and the income phase-outs change yearly, so confirm the current figures with the IRS before contributing.",
          "Contributions don't reduce your taxable income (so they don't lower this year's income or self-employment tax), but the long-run tax-free growth is the trade-off.",
        ],
      },
      {
        heading: "Roth IRA vs SEP-IRA or Solo 401(k)",
        body: [
          "A Roth IRA is simple and flexible but has the smallest limit. A SEP-IRA or Solo 401(k) lets higher earners shelter much more, and many Solo 401(k)s offer a Roth option on the employee portion — combining high limits with tax-free growth.",
          "Many gig workers use a Roth IRA alongside a SEP or Solo 401(k). See our retirement and SEP-IRA-vs-Solo-401(k) guides to choose, and a fee-only advisor can help with your numbers. This is educational information, not investment advice.",
        ],
      },
    ],
    resources: [IRS_ROTH, IRS_RETIREMENT],
    tools: [
      { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
      {
        label: "Self-Employment Tax Calculator",
        href: "/tools/se-tax-calculator",
      },
    ],
    faqs: [
      {
        q: "Can gig workers contribute to a Roth IRA?",
        a: "Yes, as long as you have earned income and your income is within the IRS limits. Self-employment income counts as earned income. A Roth IRA is one of the easiest retirement accounts for gig workers to open and fund.",
      },
      {
        q: "Why is a Roth IRA good for gig workers?",
        a: "Its tax-free growth is especially valuable in lower-earning years, when paying tax on the contribution now is cheap. It's flexible (you can withdraw your own contributions without penalty if needed) and a great starter account before adding a SEP-IRA or Solo 401(k).",
      },
      {
        q: "What are the Roth IRA contribution and income limits?",
        a: "There's an annual contribution cap (smaller than SEP-IRA or Solo 401(k) limits), and the ability to contribute directly phases out above certain income levels. Both change yearly, so check the current figures on IRS.gov before contributing.",
      },
      {
        q: "Roth IRA or SEP-IRA / Solo 401(k) — which should a gig worker use?",
        a: "A Roth IRA is simple and flexible but has the lowest limit; a SEP-IRA or Solo 401(k) lets you save much more, and some Solo 401(k)s offer a Roth option. Many gig workers use a Roth IRA alongside a SEP or Solo 401(k). See our retirement guides to compare.",
      },
      {
        q: "Do Roth IRA contributions lower my gig taxes?",
        a: "No. Roth contributions are after-tax, so they don't reduce this year's income tax or self-employment tax. The benefit is tax-free growth and tax-free qualified withdrawals in retirement, not an up-front deduction.",
      },
    ],
  },
];

export const FINANCE_DISCLAIMER = NOT_ADVICE;

export function getFinanceGuide(slug: string): FinanceGuide | undefined {
  return FINANCE_GUIDES.find(g => g.slug === slug);
}
