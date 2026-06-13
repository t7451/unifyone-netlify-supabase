import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/gig-earnings-optimizer`;

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Gig Earnings Optimizer — Maximize Net Pay Across DoorDash, Uber, Instacart | UnifyOne",
    description:
      "UnifyOne's GigIQ engine analyzes your earnings across every platform to identify which apps, zones, and shifts generate the highest net pay after expenses. Stop leaving money on the table.",
    breadcrumbs: [{ name: "Gig Earnings Optimizer", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I maximize earnings as a gig worker?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The key is optimizing net pay, not gross. Calculate your true hourly rate after fuel, mileage deductions, and platform fees for each app. Identify which platforms, zones, and time slots generate the highest net/hour. Batch orders when possible, avoid long deadhead miles, and time platform switches to match demand surges.",
        },
      },
      {
        "@type": "Question",
        name: "Which gig app pays the most — DoorDash, Uber Eats, or Instacart?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It depends on your specific market, zone, time of day, and vehicle costs. DoorDash often leads on order volume; Instacart can pay more per trip on large grocery orders; Uber Eats may offer better surge pricing in dense urban areas. The only way to know is to compare your actual net earnings per hour across platforms in your specific area — which is exactly what UnifyOne calculates.",
        },
      },
      {
        "@type": "Question",
        name: "What is deadhead mileage and how does it hurt earnings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Deadhead miles are miles driven without a paying order — repositioning, returning to a hotspot, or driving to a new zone. These miles cost you fuel but generate no income. Minimizing deadhead mileage is one of the highest-leverage ways to improve your net earnings per hour as a gig driver.",
        },
      },
      {
        "@type": "Question",
        name: "Should I work multiple gig apps at the same time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Multi-apping (running multiple platforms simultaneously) can increase earnings per hour, but only if managed well. The key is accepting orders that stack efficiently without conflicting pickup times. UnifyOne shows your earnings per hour by platform and time window so you can see which platform combinations work best in your market.",
        },
      },
    ],
  },
];

export default function GigEarningsOptimizer() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Gig Earnings Optimizer — Maximize Net Pay Across DoorDash, Uber, Instacart | UnifyOne"
        description="Find which gig apps and shifts generate the highest net pay after expenses. UnifyOne compares real net earnings per hour across all platforms."
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
            Earnings Optimization
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Optimize Your Gig Earnings Across Every Platform
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every gig platform shows you gross earnings. None of them show you
            net. Without knowing your actual earnings after fuel, mileage, and
            fees — across all platforms simultaneously — you can't optimize
            anything. UnifyOne changes that.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Why gross earnings mislead gig workers
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                platform: "What DoorDash shows you",
                value: "$847 this week",
                reality:
                  "Before 15,000 miles at $0.70 = $10,500/yr deduction, fuel, and wear",
              },
              {
                platform: "What Uber Eats shows you",
                value: "$612 this week",
                reality:
                  "Before service fees, fuel costs, and deadhead miles between orders",
              },
              {
                platform: "What UnifyOne shows you",
                value: "Net $/hour by platform",
                reality:
                  "After all expenses — so you know which app actually pays more in your zone",
              },
              {
                platform: "What Kai tells you",
                value: "Best shift windows",
                reality:
                  "Which time slots generate the highest net earnings per hour historically",
              },
            ].map(({ platform, value, reality }) => (
              <div key={platform} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-1">{platform}</p>
                <p className="font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{reality}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            How UnifyOne optimizes gig earnings
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Cross-platform net earnings comparison",
                body: "UnifyOne connects to all your gig platforms and calculates true net earnings per hour for each — after fuel costs, IRS mileage deductions, and platform fees. You see directly which app pays more in your market.",
              },
              {
                step: "2",
                title: "GigIQ shift intelligence",
                body: "Kai analyzes your historical earnings by platform, day of week, time of day, and zone to identify your highest-earning patterns. Not generic advice — insights from your actual data.",
              },
              {
                step: "3",
                title: "Deadhead mile tracking",
                body: "Every mile costs money. UnifyOne tracks your paid miles vs. deadhead miles by platform so you can see which apps send you on expensive unpaid repositioning trips.",
              },
              {
                step: "4",
                title: "Earnings projection",
                body: "Based on your current pace, UnifyOne projects your YTD earnings and quarterly tax position so you can decide whether to work more or less this week without surprises.",
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
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "How can I maximize earnings as a gig worker?",
                a: "Optimize net pay, not gross. Calculate your true hourly rate after fuel, mileage, and fees for each app. Identify which platforms and shifts generate the highest net/hour in your zone. UnifyOne calculates this automatically from your live earnings data.",
              },
              {
                q: "Which gig app pays the most — DoorDash, Uber Eats, or Instacart?",
                a: "It depends on your specific market, zone, and time of day. The only way to know is to compare your actual net earnings per hour across platforms in your area. UnifyOne shows this directly — no manual calculation required.",
              },
              {
                q: "What is deadhead mileage and how does it hurt earnings?",
                a: "Deadhead miles are unpaid miles driven repositioning between orders. They cost fuel but generate no income. Minimizing deadhead mileage is one of the highest-leverage ways to improve your net hourly earnings.",
              },
              {
                q: "Should I work multiple gig apps at the same time?",
                a: "Multi-apping can increase earnings per hour if managed well — but only if orders don't conflict. UnifyOne shows earnings per hour by platform and time window so you can see which combinations work best in your specific market.",
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
            Authoritative resources for gig worker earnings
          </h2>
          <ul className="space-y-2">
            {[
              {
                label: "IRS: Standard Mileage Rates",
                href: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
              },
              {
                label:
                  "IRS: Self-Employment Tax (Social Security and Medicare)",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
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
                label: "Financial Intelligence for Gig Workers",
                href: "/financial-intelligence-gig-workers",
              },
              {
                label: "Route Intelligence for Gig Drivers",
                href: "/gig-route-intelligence",
              },
              {
                label: "Real Hourly Rate Calculator",
                href: "/tools/gig-hourly-rate",
              },
              {
                label: "Mileage Deduction Calculator",
                href: "/tools/mileage-deduction-calculator",
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
            Find out which platform actually pays you more
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect your platforms and see net earnings per hour across every
            app. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Compare your platforms →
            </Link>
            <Link
              href="/tools/gig-hourly-rate"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the free hourly rate calculator
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
