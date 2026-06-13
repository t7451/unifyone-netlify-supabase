import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/gig-income-aggregator`;

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Gig Income Aggregator — Consolidate DoorDash, Uber, Instacart Earnings | UnifyOne",
    description:
      "UnifyOne aggregates income from every gig platform — DoorDash, Uber Eats, Instacart, Stripe, PayPal, Square — into one dashboard. See your true net earnings after fuel, mileage, and fees in real time.",
    breadcrumbs: [{ name: "Gig Income Aggregator", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is a gig income aggregator?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A gig income aggregator connects to multiple gig platforms (DoorDash, Uber Eats, Instacart, etc.) and consolidates all earnings into a single view. It shows total gross income, net income after expenses, and true hourly rate across every platform simultaneously.",
        },
      },
      {
        "@type": "Question",
        name: "How does UnifyOne aggregate gig income?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "UnifyOne connects to your gig platform accounts via API and pulls real earnings data automatically. All income flows into a single ledger. Kai, UnifyOne's AI, calculates your net earnings after fuel costs, IRS mileage deductions, and platform fees — giving you a true picture of what you actually earned.",
        },
      },
      {
        "@type": "Question",
        name: "Which gig platforms does UnifyOne support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "UnifyOne connects to DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square. Earnings from all connected platforms are aggregated automatically without manual data entry.",
        },
      },
      {
        "@type": "Question",
        name: "How is UnifyOne different from Everlance or Empower?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Everlance focuses on mileage tracking; Empower is a personal finance app for employees. UnifyOne is purpose-built for gig workers who earn from multiple platforms simultaneously. It aggregates income, tracks mileage automatically, forecasts quarterly taxes, and uses AI (Kai) to identify which platforms and shifts generate the highest net pay after expenses.",
        },
      },
    ],
  },
];

export default function GigIncomeAggregator() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Gig Income Aggregator — Consolidate DoorDash, Uber, Instacart Earnings | UnifyOne"
        description="UnifyOne aggregates income from every gig platform into one dashboard. See total earnings, net after expenses, and true hourly rate across DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square."
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
            Income Aggregation
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Aggregate All Your Gig Income in One Place
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            If you work DoorDash, Uber Eats, Instacart, or multiple gig
            platforms simultaneously, you already know the problem: each app
            shows you its own earnings in isolation. You have no unified view of
            what you actually earned, what it cost to earn it, or which platform
            is worth your time. UnifyOne fixes that.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            How UnifyOne aggregates your gig income
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Connect your platforms",
                body: "Link DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square in minutes. No developer required — UnifyOne handles every integration.",
              },
              {
                step: "2",
                title: "All earnings flow to one ledger",
                body: "Every payout, from every platform, is pulled automatically and consolidated into a single income view. No manual exports, no spreadsheets.",
              },
              {
                step: "3",
                title: "Kai calculates your true net earnings",
                body: "Gross earnings from gig platforms overstate what you actually earned. Kai subtracts IRS mileage deductions, estimated fuel costs, and platform fees to show your real net income and true hourly rate.",
              },
              {
                step: "4",
                title: "See which platforms actually pay more",
                body: "With all platforms in one view, you can see directly whether DoorDash or Uber Eats generates more per hour after expenses — not just which one pays more gross.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {step}
                </div>
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
            What gig income aggregation tells you
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                label: "Total gross earnings",
                desc: "All platforms combined, YTD and by period",
              },
              {
                label: "Net after mileage deductions",
                desc: "IRS $0.70/mile deducted automatically",
              },
              {
                label: "True hourly rate per platform",
                desc: "After expenses, not just platform gross",
              },
              {
                label: "Quarterly tax position",
                desc: "What you owe the IRS right now, not in April",
              },
              {
                label: "Cross-platform comparison",
                desc: "Which app generates the highest net/hr",
              },
              {
                label: "YTD earnings projection",
                desc: "On pace for how much by year end",
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
                q: "What is a gig income aggregator?",
                a: "A gig income aggregator connects to multiple gig platforms and consolidates all earnings into a single view — total gross, net after expenses, and true hourly rate across every platform simultaneously.",
              },
              {
                q: "Which platforms does UnifyOne connect to?",
                a: "DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square. All earnings are pulled automatically without manual data entry.",
              },
              {
                q: "How is UnifyOne different from Everlance or Empower?",
                a: "Everlance focuses on mileage tracking. Empower is a personal finance app for employees. UnifyOne is purpose-built for multi-platform gig workers — it aggregates income, tracks mileage, forecasts quarterly taxes, and uses AI to identify which platforms and shifts generate the highest net pay.",
              },
              {
                q: "Does UnifyOne show earnings after expenses?",
                a: "Yes. Kai calculates your net income after IRS mileage deductions and estimated fuel costs so you see what you actually earned — not just what the platform shows as gross.",
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

        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            See all your gig income in one place
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect your platforms in minutes. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect your platforms →
            </Link>
            <Link
              href="/tools/quarterly-tax-estimator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the tax estimator
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
