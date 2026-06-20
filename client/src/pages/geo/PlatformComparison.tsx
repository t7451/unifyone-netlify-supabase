import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import {
  getPlatformComparison,
  type PlatformComparison as Comparison,
} from "@/content/geo/platformComparisons";

/**
 * The two calculators every comparison drives the reader to so they can compute
 * their real net pay on each platform instead of relying on advertised numbers.
 */
const NET_PAY_TOOLS = [
  {
    label: "Real Hourly Rate Calculator",
    href: "/tools/gig-hourly-rate",
    desc: "Your true hourly rate after vehicle cost and miles — per platform.",
  },
  {
    label: "Earnings Consolidator",
    href: "/tools/earnings-consolidator",
    desc: "Combine both platforms and see net pay per hour side by side.",
  },
];

/** Steps for computing your own apples-to-apples net pay across two platforms. */
const HOW_TO_COMPARE = [
  {
    title: "Work comparable shifts on each",
    body: "Run both platforms during similar days, times, and zones — pay structure and demand swing by market and hour, so the same conditions make the comparison fair.",
  },
  {
    title: "Track active hours and miles per platform",
    body: "Log the time you were actually working and every business mile you drove on each app. Most platforms underreport mileage, so keep your own log.",
  },
  {
    title: "Subtract mileage and expenses",
    body: "Take out vehicle cost (mileage at the IRS standard rate or actual costs), platform service fees where they apply, and supplies — that's your net, not your gross.",
  },
  {
    title: "Divide net by hours, then compare",
    body: "Net earnings ÷ active hours = your real hourly rate on that platform. Do it for both and you'll know which one pays you more — not the internet.",
  },
];

function buildJsonLd(comparison: Comparison) {
  const canonical = `${SITE_URL}/${comparison.slug}`;
  return [
    ...buildWebPageJsonLd({
      canonical,
      name: `${comparison.title} | UnifyOne`,
      description: comparison.metaDescription,
      breadcrumbs: [{ name: comparison.title, item: canonical }],
    }),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: comparison.faqs.map(f => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
}

/**
 * Gig platform comparison page (DoorDash vs Uber Eats / Instacart vs DoorDash /
 * Uber vs Lyft). Data-driven from platformComparisons.ts so all three share one
 * accurate, AEO-ready layout: WebPage + FAQPage JSON-LD, a structural
 * comparison table, a "compute your own net pay" section that drives to the free
 * calculators, a visible FAQ mirroring the schema, IRS links, and a backlink to
 * the gig-taxes pillar. Deliberately no fabricated earnings figures.
 */
export default function PlatformComparison({ slug }: { slug: string }) {
  const comparison = getPlatformComparison(slug);

  if (!comparison) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Comparison not found</h1>
          <Link href="/tools" className="text-primary hover:underline">
            Browse all free tools →
          </Link>
        </div>
      </div>
    );
  }

  const canonical = `${SITE_URL}/${comparison.slug}`;
  const { platformA, platformB } = comparison;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title={`${comparison.title} | UnifyOne`}
        description={comparison.metaDescription}
        canonical={canonical}
        ogType="article"
        jsonLd={buildJsonLd(comparison)}
      />

      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Home
          </Link>
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Free Tools
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            {comparison.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {comparison.h1}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {comparison.intro}
          </p>
          <p className="mt-4 text-sm">
            <Link href="/gig-taxes" className="text-primary hover:underline">
              ← Part of the complete Gig Worker Taxes guide
            </Link>
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10">
          <h2 className="text-xl font-semibold mb-2">
            The honest answer on which pays more
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            There's no universal winner. Both {platformA} and {platformB} pay
            independent contractors, and your net pay depends on your market,
            the hours you work, current promotions, and your vehicle costs — not
            the brand. So instead of quoting earnings that go stale, we compare
            the structure of each platform below and show you exactly how to
            compute your own real hourly rate on both.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            {platformA} vs {platformB}, side by side
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {platformA} compared with {platformB} across pay structure,
                fees, tax forms, mileage, scheduling, and payout speed.
              </caption>
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th scope="col" className="p-3 font-semibold">
                    Dimension
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    {platformA}
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    {platformB}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.dimensions.map(dim => (
                  <tr
                    key={dim.aspect}
                    className="border-b last:border-0 align-top"
                  >
                    <th
                      scope="row"
                      className="p-3 font-medium text-left whitespace-nowrap"
                    >
                      {dim.aspect}
                    </th>
                    <td className="p-3 text-muted-foreground">{dim.a}</td>
                    <td className="p-3 text-muted-foreground">{dim.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Platform features, fees, and promotions change often and vary by
            market — treat this as a structural overview and confirm current
            details in each app. No earnings figures are shown because real net
            pay is specific to you.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            How to compare your own net pay
          </h2>
          <p className="text-sm text-muted-foreground">
            The only number that matters is what <em>you</em> net per hour.
            Here's how to measure it on each platform in four steps:
          </p>
          <div className="space-y-4">
            {HOW_TO_COMPARE.map(({ title, body }, i) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold mb-1">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {NET_PAY_TOOLS.map(({ label, href, desc }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium">{label} →</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {comparison.faqs.map(({ q, a }) => (
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
            Taxes when you drive for both
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Running two platforms means combining income from both at tax time.
            All of these platforms pay you as an independent contractor and
            withhold nothing, so you owe federal and state income tax plus the
            15.3% self-employment tax on your combined net earnings. Delivery
            apps issue a 1099-NEC; rideshare on Uber and Lyft also issues a
            1099-K for processed fares. You must report all income whether or
            not a form arrives. See the{" "}
            <Link href="/gig-taxes" className="text-primary hover:underline">
              complete Gig Worker Taxes guide
            </Link>{" "}
            for how it all fits together.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Authoritative IRS resources
          </h2>
          <ul className="space-y-2">
            {[
              {
                label: "IRS: Self-Employed Individuals Tax Center",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
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

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            See which platform actually pays you more
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne consolidates your {platformA} and {platformB} earnings,
            mileage, and expenses automatically — so your real net hourly rate
            on each is always one glance away.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start tracking free →
            </Link>
            <Link
              href="/tools/gig-hourly-rate"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the real hourly rate calculator
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          This comparison is educational information, not financial or tax
          advice. Platform pay structures, fees, promotions, and tax thresholds
          change over time and vary by market — confirm current details in each
          app and with the IRS or a qualified professional for your situation.
        </p>
      </main>
    </div>
  );
}
