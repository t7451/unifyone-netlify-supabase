import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/gig-route-intelligence`;

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Gig Route Intelligence — Optimize Delivery Routes for Higher Net Pay | UnifyOne",
    description:
      "UnifyOne analyzes your delivery routes and earnings patterns to identify which zones, order types, and time windows maximize net pay per hour — across DoorDash, Uber Eats, and Instacart.",
    breadcrumbs: [{ name: "Gig Route Intelligence", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is route intelligence for gig delivery drivers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Route intelligence for gig drivers means understanding which delivery zones, order types, and time windows generate the highest net earnings per hour — after fuel costs and mileage deductions. It goes beyond navigation to financial optimization: knowing not just how to get there efficiently, but which orders are worth accepting in the first place.",
        },
      },
      {
        "@type": "Question",
        name: "How can delivery drivers reduce deadhead miles?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Deadhead miles — driving without a paying order — are the primary hidden cost for delivery drivers. Strategies include positioning in high-density restaurant clusters rather than residential areas, using multi-apping to fill gaps between orders, and analyzing your historical pickup zones to find areas with faster re-dispatch. UnifyOne tracks your deadhead ratio by zone so you can see where you're losing money on unpaid miles.",
        },
      },
      {
        "@type": "Question",
        name: "Does UnifyOne replace navigation apps like Google Maps or Circuit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Navigation apps like Google Maps and Circuit optimize turn-by-turn routing. UnifyOne provides financial route intelligence — analyzing which zones and order patterns generate the highest net pay per hour from your actual earnings history. They complement each other: navigation gets you there efficiently, UnifyOne tells you whether 'there' is worth going to.",
        },
      },
      {
        "@type": "Question",
        name: "How do I know which delivery zones pay the most?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The only reliable way is to analyze your own historical earnings by zone. Generic market data doesn't account for your specific vehicle costs, preferred platforms, or local supply and demand. UnifyOne maps your earnings per hour by pickup zone from your actual platform data — showing which areas have consistently generated your highest net pay.",
        },
      },
    ],
  },
];

export default function GigRouteIntelligence() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Gig Route Intelligence — Optimize Delivery Zones for Higher Net Pay | UnifyOne"
        description="Discover which delivery zones generate your highest net pay per hour. UnifyOne maps your actual earnings history to show where your time is worth most."
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
            Route Intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Route Intelligence for Gig Delivery Drivers
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Navigation apps tell you how to get there. They don't tell you
            whether you should go there at all. UnifyOne analyzes your delivery
            earnings by zone, platform, and time window so you know which areas,
            orders, and hours generate the highest net pay after vehicle costs.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            The hidden cost most drivers don't track
          </h2>
          <p className="text-sm text-muted-foreground">
            At $0.70/mile IRS rate and typical fuel costs, a gig driver pays
            roughly $0.20–$0.40 per mile in real vehicle costs. On a 20-mile
            round trip with no order, that's $4–$8 lost before you accept a
            single delivery. Route intelligence means knowing which zones
            minimize dead miles.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {[
              { metric: "Paid miles", note: "Miles with an active order" },
              {
                metric: "Deadhead miles",
                note: "Miles between orders — costs you money",
              },
              {
                metric: "Net $/paid mile",
                note: "The real measure of zone quality",
              },
            ].map(({ metric, note }) => (
              <div
                key={metric}
                className="rounded-lg bg-muted/40 p-3 text-center"
              >
                <p className="font-semibold text-sm">{metric}</p>
                <p className="text-xs text-muted-foreground mt-1">{note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            How UnifyOne builds your route intelligence
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Earnings mapped to your zones",
                body: "UnifyOne aggregates your earnings from DoorDash, Uber Eats, Instacart, and other platforms and maps them to pickup zones from your shift data — showing which areas consistently generate higher net pay.",
              },
              {
                step: "2",
                title: "Time-window analysis",
                body: "Kai analyzes your earnings by day of week and time of day to identify your highest-value windows. Not generic heatmaps — your actual earnings history in your specific market.",
              },
              {
                step: "3",
                title: "Deadhead ratio tracking",
                body: "UnifyOne tracks your paid vs. unpaid miles by zone so you can identify which areas send you on expensive repositioning trips between orders.",
              },
              {
                step: "4",
                title: "Platform comparison by zone",
                body: "Different platforms dominate different neighborhoods. UnifyOne shows which app generates higher net/hour in each of your regular zones so you know which to prioritize where.",
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
                q: "What is route intelligence for gig delivery drivers?",
                a: "Understanding which delivery zones, order types, and time windows generate the highest net earnings per hour — after fuel and mileage costs. It's knowing not just how to get somewhere efficiently, but whether an order is worth accepting.",
              },
              {
                q: "How can delivery drivers reduce deadhead miles?",
                a: "Position in high-density restaurant clusters rather than residential areas, use multi-apping to fill gaps, and analyze your historical zones to find areas with faster re-dispatch. UnifyOne tracks your deadhead ratio by zone from your actual earnings data.",
              },
              {
                q: "Does UnifyOne replace Google Maps or Circuit?",
                a: "No — they're complementary. Navigation apps optimize turn-by-turn routing. UnifyOne provides financial route intelligence: which zones and orders generate the highest net pay from your actual earnings history.",
              },
              {
                q: "How do I know which delivery zones pay the most?",
                a: "Only by analyzing your own earnings history. Generic market data doesn't account for your vehicle costs, preferred platforms, or local conditions. UnifyOne maps your earnings per hour by pickup zone from your actual platform data.",
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
            Authoritative resources for gig delivery drivers
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
                label: "Gig Earnings Optimizer",
                href: "/gig-earnings-optimizer",
              },
              {
                label: "Financial Intelligence for Gig Workers",
                href: "/financial-intelligence-gig-workers",
              },
              {
                label: "Gig Income Aggregator",
                href: "/gig-income-aggregator",
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
            Discover where your earnings actually come from
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect your gig platforms and let Kai map your highest-value zones
            and shifts. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Analyze my earnings →
            </Link>
            <Link
              href="/gig-earnings-optimizer"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              See earnings optimization
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
