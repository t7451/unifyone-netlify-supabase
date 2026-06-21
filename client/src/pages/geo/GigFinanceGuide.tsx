import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import {
  getFinanceGuide,
  FINANCE_GUIDES,
  FINANCE_DISCLAIMER,
  type FinanceGuide as Guide,
} from "@/content/geo/financeGuides";

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
 * Gig-worker finance guide (retirement / health insurance / bookkeeping /
 * budgeting). Data-driven from financeGuides.ts so every guide shares one
 * AEO-ready layout: WebPage + FAQPage JSON-LD, an optional key-points grid,
 * content sections, a visible FAQ that mirrors the schema, authoritative
 * resource links, relevant calculators, sibling finance guides, and a
 * not-advice disclaimer.
 */
export default function GigFinanceGuide({ slug }: { slug: string }) {
  const guide = getFinanceGuide(slug);

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
  const siblings = FINANCE_GUIDES.filter(g => g.slug !== guide.slug);

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
          <p className="mt-4 text-sm">
            <Link
              href="/financial-intelligence-gig-workers"
              className="text-primary hover:underline"
            >
              ← Part of Financial Intelligence for Gig Workers
            </Link>
          </p>
        </header>

        {guide.keyPoints && guide.keyPoints.length > 0 && (
          <section className="mb-10">
            <div className="grid sm:grid-cols-2 gap-4">
              {guide.keyPoints.map(({ label, desc }) => (
                <div key={label} className="rounded-lg border p-4">
                  <p className="font-semibold text-sm mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {guide.sections.map(section => (
          <section key={section.heading} className="mb-10">
            <h2 className="text-xl font-semibold mb-4">{section.heading}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {section.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}

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
          <ul className="space-y-2">
            {guide.resources.map(({ label, href }) => (
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
          <h2 className="text-xl font-semibold mb-4">Helpful calculators</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {guide.tools.map(({ label, href }) => (
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
          <h2 className="text-xl font-semibold mb-4">
            More gig finance guides
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {siblings.map(s => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors block"
              >
                {s.navLabel} →
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Run your whole gig business in one place
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your earnings, expenses, mileage, and tax set-aside
            across every platform — so taxes, budgeting, and planning all work
            from one set of numbers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start free →
            </Link>
            <Link
              href="/gig-taxes"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Gig worker taxes guide
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          {FINANCE_DISCLAIMER}
        </p>
      </main>
    </div>
  );
}
