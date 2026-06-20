import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import {
  getStateTaxGuide,
  HOW_GIG_TAXES_WORK,
  SHARED_DEDUCTIONS,
  type StateTaxGuide as Guide,
} from "@/content/geo/stateTaxGuides";

/** Free calculators every state tax guide links to. */
const RELATED_TOOLS = [
  {
    label: "Tax Set-Aside Calculator",
    href: "/tools/tax-set-aside",
    desc: "How much of each payout to save for taxes",
  },
  {
    label: "Quarterly Tax Estimator",
    href: "/tools/quarterly-tax-estimator",
    desc: "What to send the IRS each quarter",
  },
  {
    label: "Self-Employment Tax Calculator",
    href: "/tools/se-tax-calculator",
    desc: "Estimate the 15.3% SE tax on net earnings",
  },
  {
    label: "IRS Mileage Deduction Calculator",
    href: "/tools/mileage-deduction-calculator",
    desc: "Turn miles into a dollar deduction",
  },
];

/** Authoritative IRS resources shared by every state guide. */
const IRS_RESOURCES = [
  {
    label: "IRS: Self-Employed Individuals Tax Center",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
  {
    label: "IRS: Self-Employment Tax (Social Security and Medicare)",
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
];

function buildJsonLd(guide: Guide) {
  const canonical = `${SITE_URL}/${guide.slug}`;
  return [
    ...buildWebPageJsonLd({
      canonical,
      name: `${guide.title} | UnifyOne`,
      description: guide.metaDescription,
      breadcrumbs: [{ name: guide.title, item: canonical }],
    }),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faqs.map(f => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
}

/**
 * State-level gig-worker tax guide (California / Texas / Florida / New York /
 * Illinois / Washington). Data-driven from stateTaxGuides.ts so every state
 * shares one accurate, AEO-ready layout: WebPage + FAQPage JSON-LD, a visible
 * FAQ that mirrors the schema, the uniform federal mechanics (15.3% SE tax +
 * federal income tax, no withholding), the state-specific income-tax treatment,
 * authoritative IRS and state-tax-agency links, cross-links into the free
 * calculators, and a backlink to the gig-taxes hub.
 */
export default function StateTaxGuide({ slug }: { slug: string }) {
  const guide = getStateTaxGuide(slug);

  if (!guide) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Guide not found</h1>
          <Link href="/tools" className="text-primary hover:underline">
            Browse all free tools →
          </Link>
        </div>
      </div>
    );
  }

  const canonical = `${SITE_URL}/${guide.slug}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title={`${guide.title} | UnifyOne`}
        description={guide.metaDescription}
        canonical={canonical}
        ogType="article"
        jsonLd={buildJsonLd(guide)}
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
            {guide.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {guide.h1}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            {guide.intro}
          </p>
          <Link
            href="/gig-taxes"
            className="text-sm text-primary hover:underline"
          >
            ← Part of the complete Gig Worker Taxes guide
          </Link>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            How gig taxes work for {guide.stateAdjective} workers
          </h2>
          <div className="space-y-4">
            {HOW_GIG_TAXES_WORK.map(({ title, body }, i) => (
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
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">{guide.stateHeading}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            {guide.stateBody.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {guide.hasStateIncomeTax
              ? `Remember: the 15.3% self-employment tax is federal and the same in every state — ${guide.state}'s income tax is an additional layer on top.`
              : `Remember: no ${guide.state} income tax does not mean no taxes — the 15.3% federal self-employment tax and federal income tax still apply in full.`}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            What {guide.stateAdjective} gig workers can deduct
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {SHARED_DEDUCTIONS.map(({ label, desc }) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You can deduct the IRS standard mileage rate <em>or</em> your actual
            vehicle expenses — not both. For most drivers the standard mileage
            rate is simpler and larger. Keep a contemporaneous mileage log
            either way.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Quarterly estimated taxes
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Because no tax is withheld from your payouts, the IRS expects you
              to pay as you go through quarterly estimated payments rather than
              one lump sum in April. If you expect to owe $1,000 or more in
              federal tax for the year, paying quarterly avoids an underpayment
              penalty.
            </p>
            <p>
              Federal estimated payments are generally due around April 15, June
              15, September 15, and January 15 of the following year. You file
              your annual federal return by April 15.
              {guide.hasStateIncomeTax
                ? ` ${guide.state} expects its own state estimated payments on a comparable schedule — see the state resources below for the exact form and due dates.`
                : ` ${guide.state} has no personal income tax, so there are no separate state estimated payments to make.`}
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {guide.faqs.map(({ q, a }) => (
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
            Authoritative resources
          </h2>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Federal (IRS)
          </h3>
          <ul className="space-y-2 mb-6">
            {IRS_RESOURCES.map(({ label, href }) => (
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
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {guide.state} state tax agency
          </h3>
          <ul className="space-y-2">
            {guide.stateResources.map(({ label, href }) => (
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
          <h2 className="text-xl font-semibold mb-4">Free calculators</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {RELATED_TOOLS.map(({ label, href, desc }) => (
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

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Stop guessing what you owe
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your gig earnings, mileage, and tax set-aside
            automatically — so quarterly taxes in {guide.state} are never a
            surprise.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start tracking free →
            </Link>
            <Link
              href="/tools/tax-set-aside"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the tax set-aside calculator
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          This guide is educational information, not tax advice. Federal and
          state tax rules, brackets, and the IRS standard mileage rate change
          yearly — confirm current figures with the IRS, the {guide.state} tax
          agency, or a qualified tax professional for your situation.
        </p>
      </main>
    </div>
  );
}
