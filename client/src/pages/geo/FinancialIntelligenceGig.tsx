import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/financial-intelligence-gig-workers`;

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne",
    description:
      "UnifyOne gives gig workers financial intelligence: AI analysis of earnings patterns, expense trends, tax exposure, and income forecasts across every platform — powered by Kai.",
    breadcrumbs: [
      { name: "Financial Intelligence for Gig Workers", item: CANONICAL },
    ],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is financial intelligence for gig workers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Financial intelligence for gig workers means having a complete, real-time picture of your income, expenses, tax liability, and net earnings — across every platform simultaneously. It goes beyond seeing what you earned to understanding why, when, and where you earn best, and what it actually costs to earn it.",
        },
      },
      {
        "@type": "Question",
        name: "How does AI help gig workers manage finances?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AI can analyze patterns across thousands of earnings data points that would be impossible to track manually. For gig workers, this means identifying which platforms, shifts, and zones maximize net earnings; forecasting quarterly tax liability in real time; flagging expense categories that are eroding profit; and alerting you when your effective hourly rate drops below a target threshold.",
        },
      },
      {
        "@type": "Question",
        name: "Why do gig workers need financial intelligence tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Gig workers operate like small businesses but without a finance team. They face variable income, no employer tax withholding, platform fee changes, fuel cost volatility, and the need to track mileage for IRS compliance. Without real-time financial visibility, gig workers routinely underpay quarterly taxes, overestimate their net earnings, and miss deductions worth thousands of dollars.",
        },
      },
      {
        "@type": "Question",
        name: "What is Kai in UnifyOne?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kai is UnifyOne's AI financial intelligence layer. It aggregates earnings from all connected gig platforms, calculates real net income after mileage deductions and fees, forecasts quarterly tax payments, and identifies your highest-value earning patterns — all in real time, without manual data entry.",
        },
      },
      {
        "@type": "Question",
        name: "How do I budget with irregular gig income?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A common approach is to budget from a baseline — your typical low-earning week or a trailing average — rather than your best weeks, then route surplus from strong weeks into a buffer that smooths the slow ones. Building your monthly plan around net pay after taxes and vehicle costs, not gross deposits, keeps the budget realistic. This is educational information, not financial advice.",
        },
      },
      {
        "@type": "Question",
        name: "How much should I save for taxes as a gig worker?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Many gig workers set aside roughly 25–30% of their net earnings to cover self-employment tax (15.3% on 92.35% of net) plus federal and any state income tax, though your exact rate depends on your bracket, deductions, and state. Moving that share into a separate account as you earn — instead of at year end — helps avoid a shortfall at the quarterly due dates. This is educational information, not tax advice.",
        },
      },
      {
        "@type": "Question",
        name: "How do I track business expenses for gig work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Keep a contemporaneous record of every deductible cost — business miles, phone and data (business-use percentage), platform fees, hot bags, and supplies — and retain receipts in case the IRS asks. A continuous mileage log matters most, since miles driven while working are typically deductible but your personal commute is not. UnifyOne logs these from your live platform data; this is educational information, not tax advice.",
        },
      },
    ],
  },
];

export default function FinancialIntelligenceGig() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Financial Intelligence for Gig Workers — AI-Powered Earnings Analytics | UnifyOne"
        description="AI-powered financial intelligence for gig workers: real-time earnings analysis, tax forecasting, and net income visibility across all platforms."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Financial Intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Financial Intelligence for Independent Gig Workers
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            W-2 employees get a pay stub that shows gross, deductions, and net.
            Gig workers get a deposit and a number — with no context, no tax
            withholding, and no picture of what they actually earned. UnifyOne's
            AI gives gig workers the same financial clarity that employees take
            for granted.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            What Kai — UnifyOne's AI — does for your finances
          </h2>
          <div className="space-y-4">
            {[
              {
                icon: "📊",
                title: "Real-time net income calculation",
                body: "Kai subtracts IRS mileage deductions, estimated fuel costs, and platform fees from every payout to show you true net earnings — not the gross figure gig apps report.",
              },
              {
                icon: "🧾",
                title: "Live quarterly tax forecast",
                body: "Kai calculates your SE tax and estimated income tax liability in real time as earnings accumulate. You know your quarterly payment before the due date — not the night before.",
              },
              {
                icon: "📈",
                title: "Platform earnings comparison",
                body: "Kai compares your net earnings per hour across every connected platform so you can see which app actually pays more in your specific market and time windows.",
              },
              {
                icon: "⚠️",
                title: "Earnings pattern alerts",
                body: "Kai flags when your effective hourly rate drops below a threshold, when a platform's offer-to-earnings ratio shifts, or when your tax exposure accelerates past a target.",
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 text-2xl">{icon}</div>
                <div>
                  <p className="font-semibold mb-1">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Financial metrics gig workers need but rarely have
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                label: "True net hourly rate",
                desc: "After fuel, mileage deduction, and fees — per platform",
              },
              {
                label: "YTD tax liability",
                desc: "SE tax + income tax estimate, updated in real time",
              },
              {
                label: "Effective expense ratio",
                desc: "What % of gross goes to vehicle costs",
              },
              {
                label: "Earnings velocity",
                desc: "Pace vs. prior week, month, quarter",
              },
              {
                label: "Deduction capture rate",
                desc: "How much of your mileage deduction you're capturing",
              },
              {
                label: "Cross-platform net delta",
                desc: "Which app pays more net/hour in your zone",
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "What is financial intelligence for gig workers?",
                a: "A real-time picture of your income, expenses, tax liability, and net earnings across every platform simultaneously — going beyond what you earned to understanding why, when, and where you earn best.",
              },
              {
                q: "How does AI help gig workers manage finances?",
                a: "AI identifies patterns across earnings data to show which platforms and shifts maximize net income, forecasts quarterly taxes in real time, flags expense trends, and alerts when your effective hourly rate drops.",
              },
              {
                q: "Why do gig workers need financial intelligence tools?",
                a: "Gig workers operate like small businesses without a finance team: variable income, no tax withholding, fuel volatility, and IRS mileage tracking requirements. Without real-time visibility, workers routinely underpay quarterly taxes and miss deductions worth thousands.",
              },
              {
                q: "What is Kai in UnifyOne?",
                a: "Kai is UnifyOne's AI financial intelligence layer. It aggregates earnings from all connected gig platforms, calculates real net income after mileage and fees, forecasts quarterly taxes, and identifies your highest-value earning patterns in real time.",
              },
              {
                q: "How do I budget with irregular gig income?",
                a: "Budget from a baseline — a typical slow week or trailing average — rather than your best weeks, and move surplus from strong weeks into a buffer that smooths the slow ones. Build the plan around net pay after taxes and vehicle costs, not gross deposits. Educational information, not financial advice.",
              },
              {
                q: "How much should I save for taxes as a gig worker?",
                a: "Many gig workers set aside about 25–30% of net earnings to cover SE tax (15.3% on 92.35% of net) plus income tax, though your exact rate depends on your bracket, deductions, and state. Moving that share into a separate account as you earn helps avoid a shortfall at quarterly due dates. Educational information, not tax advice.",
              },
              {
                q: "How do I track business expenses for gig work?",
                a: "Keep a contemporaneous record of every deductible cost — business miles, phone and data (business-use %), platform fees, and supplies — and retain receipts. The mileage log matters most: miles driven while working are typically deductible, but your personal commute is not. UnifyOne logs these from live platform data. Educational information, not tax advice.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b pb-6 last:border-0">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Authoritative resources for gig worker finances
          </h2>
          <ul className="space-y-2">
            {[
              {
                label:
                  "IRS: Self-Employment Tax (Social Security and Medicare)",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
              },
              {
                label: "IRS: Estimated Taxes",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
              },
              {
                label: "IRS: Standard Mileage Rates",
                href: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
              },
            ].map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Related tools and guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Gig Income Aggregator",
                href: "/gig-income-aggregator",
              },
              {
                label: "Gig Earnings Optimizer",
                href: "/gig-earnings-optimizer",
              },
              {
                label: "1099 Tax Management",
                href: "/1099-tax-management",
              },
              {
                label: "Free Tax Estimator",
                href: "/tools/quarterly-tax-estimator",
              },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors block"
              >
                {label} →
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Gig finance guides</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Retirement accounts (SEP-IRA, Solo 401k)",
                href: "/gig-worker-retirement",
              },
              {
                label: "Health insurance for gig workers",
                href: "/gig-worker-health-insurance",
              },
              {
                label: "Bookkeeping for gig workers",
                href: "/gig-worker-bookkeeping",
              },
              {
                label: "Budgeting on irregular income",
                href: "/gig-worker-budgeting",
              },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors block"
              >
                {label} →
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            Get the financial clarity your gig income deserves
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect your platforms and let Kai show you what you actually
            earned. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect your platforms →
            </Link>
            <Link
              href="/gig-income-aggregator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              See income aggregation
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
