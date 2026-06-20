import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import {
  getGettingStartedGuide,
  GETTING_STARTED_GUIDES,
  EARNINGS_FRAMING,
  type GettingStartedGuide as Guide,
} from "@/content/geo/gettingStartedGuides";

/** Free calculators every getting-started guide links to. */
const RELATED_TOOLS = [
  {
    label: "Real Hourly Rate Calculator",
    href: "/tools/gig-hourly-rate",
    desc: "Your true net hourly rate after vehicle costs",
  },
  {
    label: "Earnings Consolidator",
    href: "/tools/earnings-consolidator",
    desc: "Compare real net pay across every app you run",
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
 * Getting-started "how to make money on <platform>" guide (DoorDash / Uber /
 * Instacart / Amazon Flex). Data-driven from gettingStartedGuides.ts so all four
 * share one honest, AEO-ready layout: WebPage + FAQPage JSON-LD, a visible FAQ
 * that mirrors the schema, realistic earnings framing that points to the free
 * calculators instead of quoting figures, and cross-links into the matching tax
 * guide and the sibling getting-started guides.
 */
export default function GettingStartedGuide({ slug }: { slug: string }) {
  const guide = getGettingStartedGuide(slug);

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
  const siblings = GETTING_STARTED_GUIDES.filter(g => g.slug !== guide.slug);

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
          <p className="text-lg text-muted-foreground leading-relaxed">
            {guide.intro}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            {guide.whatItIsHeading}
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            {guide.whatItIs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Requirements to get started
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {guide.requirements.map(({ label, desc }) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Requirements vary by market and change over time — always confirm
            the current criteria with {guide.platform} before you apply.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            How to sign up for {guide.platform}
          </h2>
          <div className="space-y-4">
            {guide.signupSteps.map(({ title, body }, i) => (
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
          <h2 className="text-xl font-semibold mb-4">{guide.payHeading}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            {guide.payBody.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-muted/30 p-6 mb-10">
          <h2 className="text-xl font-semibold mb-3">
            What can you realistically earn?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {EARNINGS_FRAMING}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {RELATED_TOOLS.map(({ label, href, desc }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border bg-background p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium">{label} →</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Tips to earn more on {guide.platform}
          </h2>
          <ul className="space-y-3">
            {guide.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 text-primary font-bold">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Pros and cons</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border p-5">
              <p className="font-semibold text-sm mb-3">Pros</p>
              <ul className="space-y-2">
                {guide.pros.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <span className="flex-shrink-0 text-primary">+</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border p-5">
              <p className="font-semibold text-sm mb-3">Cons</p>
              <ul className="space-y-2">
                {guide.cons.map((c, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <span className="flex-shrink-0 text-muted-foreground">
                      −
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
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
            Before you start: know your taxes
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {guide.platform} pays {guide.workerNoun} as independent contractors,
            so no taxes are withheld — you're responsible for your own income
            and self-employment taxes. Understanding this before your first
            payout saves a nasty surprise at tax time.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href={`/${guide.taxGuideSlug}`}
              className="rounded-lg border p-4 hover:bg-muted transition-colors block"
            >
              <p className="text-sm font-medium">{guide.taxGuideLabel} →</p>
              <p className="text-xs text-muted-foreground mt-1">
                1099 forms, deductions, and what to set aside
              </p>
            </Link>
            <Link
              href="/gig-taxes"
              className="rounded-lg border p-4 hover:bg-muted transition-colors block"
            >
              <p className="text-sm font-medium">Gig worker taxes guide →</p>
              <p className="text-xs text-muted-foreground mt-1">
                The complete guide for 1099 earners
              </p>
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Compare other gig platforms
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {siblings.map(s => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium">
                  How to make money with {s.platform} →
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.workType}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Know your real numbers from day one
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your {guide.workType} earnings, mileage, and tax
            set-aside automatically — so you always know your true net pay, not
            just the gross.
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
          This guide is educational information, not financial advice, and is
          not a guarantee of income. Eligibility requirements and how pay works
          vary by market and change over time — confirm current details directly
          with the platform.
        </p>
      </main>
    </div>
  );
}
