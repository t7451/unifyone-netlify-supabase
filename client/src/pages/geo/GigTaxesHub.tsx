import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { PLATFORM_TAX_GUIDES } from "@/content/geo/platformTaxGuides";
import { STATE_TAX_GUIDES } from "@/content/geo/stateTaxGuides";
import { PLATFORM_COMPARISONS } from "@/content/geo/platformComparisons";

/** Standalone explainers/guides in the gig-tax cluster. */
const MORE_GUIDES = [
  { href: "/1099-nec-vs-1099-k", label: "1099-NEC vs 1099-K explained" },
  { href: "/gig-worker-tax-deductions", label: "Tax deductions checklist" },
  {
    href: "/how-to-file-gig-worker-taxes",
    label: "How to file, step by step",
  },
  { href: "/gig-quarterly-taxes", label: "Quarterly estimated taxes" },
];

const CANONICAL = `${SITE_URL}/gig-taxes`;

/** Cross-platform questions answer engines get asked constantly. */
const FAQS = [
  {
    q: "Do gig workers have to pay taxes?",
    a: "Yes. Gig platforms pay you as an independent contractor and withhold nothing, so you're responsible for federal and state income tax plus the 15.3% self-employment tax on your net earnings. You must report all income even if you don't receive a 1099.",
  },
  {
    q: "How much should gig workers set aside for taxes?",
    a: "A common rule of thumb is 25–30% of your net earnings (after deductions like mileage), covering self-employment tax plus federal and state income tax. Your exact rate depends on total household income and your state. The Tax Set-Aside calculator gives a personalized number.",
  },
  {
    q: "What's the difference between a 1099-NEC and a 1099-K?",
    a: "A 1099-NEC reports nonemployee compensation — direct pay for your services, like DoorDash and Instacart earnings or Uber incentives. A 1099-K reports payments processed through a third-party platform, such as Uber's gross rider fares. You owe tax on your net income regardless of which form (or no form) you receive.",
  },
  {
    q: "Do gig workers have to pay quarterly taxes?",
    a: "If you expect to owe $1,000 or more for the year, the IRS generally expects estimated payments four times a year — around April 15, June 15, September 15, and January 15. Paying quarterly avoids an underpayment penalty at filing time.",
  },
  {
    q: "What can gig workers deduct?",
    a: "The largest deduction for most drivers is business mileage at the IRS standard mileage rate. You can also deduct the business-use share of your phone, hot bags and equipment, tolls, parking, and platform service fees. Track expenses all year — you can't reconstruct them in April.",
  },
  {
    q: "What tax forms do gig workers file?",
    a: "Most gig workers report income and expenses on Schedule C and calculate self-employment tax on Schedule SE, filed with their Form 1040. Quarterly estimated payments use Form 1040-ES.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Gig Worker Taxes: The Complete Guide for 1099 Earners | UnifyOne",
    description:
      "How taxes work for gig workers: self-employment tax, 1099-NEC vs 1099-K, deductions, quarterly payments, and platform-specific guides for DoorDash, Uber, and Instacart.",
    breadcrumbs: [{ name: "Gig Worker Taxes", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

const PILLARS = [
  {
    title: "Self-employment tax (15.3%)",
    body: "On top of income tax, you owe 12.4% Social Security + 2.9% Medicare on your net earnings. Employees split this with an employer — you cover both halves, though half is deductible.",
  },
  {
    title: "Income tax on net profit",
    body: "You're taxed on profit, not gross payouts. Deductions like mileage lower the income you're taxed on, which is why tracking them matters so much.",
  },
  {
    title: "Quarterly estimated payments",
    body: "There's no withholding, so the IRS expects you to pay as you earn — four times a year. Skipping quarterly payments can mean an underpayment penalty.",
  },
];

const TOOLS = [
  {
    label: "Tax Set-Aside Calculator",
    href: "/tools/tax-set-aside",
    desc: "What percent of each payout to save",
  },
  {
    label: "Quarterly Tax Estimator",
    href: "/tools/quarterly-tax-estimator",
    desc: "Your Q1–Q4 estimated payments",
  },
  {
    label: "Self-Employment Tax Calculator",
    href: "/tools/se-tax-calculator",
    desc: "The 15.3% SE tax on net earnings",
  },
  {
    label: "Mileage Deduction Calculator",
    href: "/tools/mileage-deduction-calculator",
    desc: "Turn miles into a dollar deduction",
  },
];

/**
 * Pillar page for the gig-tax topic cluster. Links out to the platform-specific
 * spokes (DoorDash / Uber / Instacart) and the free tax calculators, and answers
 * the broad cross-platform questions ("do gig workers pay taxes?", "1099-NEC vs
 * 1099-K?") with FAQPage structured data for answer engines.
 */
export default function GigTaxesHub() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Gig Worker Taxes: The Complete Guide for 1099 Earners | UnifyOne"
        description="How gig worker taxes work: self-employment tax, 1099-NEC vs 1099-K, deductions, and quarterly payments — plus guides for DoorDash, Uber & Instacart."
        canonical={CANONICAL}
        ogType="article"
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
            Gig Tax Guide
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Gig Worker Taxes: The Complete Guide
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Driving for DoorDash, Uber, or Instacart makes you an independent
            contractor — nobody withholds taxes for you. That means you owe
            income tax plus self-employment tax, and you pay it yourself, as you
            go. Here's how gig taxes actually work, what you can deduct, and
            where to go deeper for your platform.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            The three things every gig worker owes
          </h2>
          <div className="space-y-4">
            {PILLARS.map(({ title, body }, i) => (
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
          <h2 className="text-xl font-semibold mb-4">Taxes by platform</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Each platform issues different forms and reports your earnings
            differently. Pick yours for a step-by-step breakdown.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {PLATFORM_TAX_GUIDES.map(g => (
              <Link
                key={g.slug}
                href={`/${g.slug}`}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-semibold">{g.platform} taxes →</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Guide for {g.workerNoun}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Taxes by state</h2>
          <p className="text-muted-foreground text-sm mb-4">
            State income tax varies — some states have none. See how your state
            treats gig income on top of federal self-employment tax.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {STATE_TAX_GUIDES.map(s => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-semibold">{s.state} →</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gig worker taxes
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Compare platforms</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Deciding where to drive? Compare how pay, fees, and tax forms stack
            up — then compute your own net pay.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {PLATFORM_COMPARISONS.map(c => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-semibold">
                  {c.platformA} vs {c.platformB} →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">More tax guides</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {MORE_GUIDES.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium">{label} →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Free tax calculators</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TOOLS.map(({ label, href, desc }) => (
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
            {FAQS.map(({ q, a }) => (
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
            Authoritative IRS resources
          </h2>
          <ul className="space-y-2">
            {[
              {
                label: "IRS: Self-Employed Individuals Tax Center",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
              },
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

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Stop guessing what you owe
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your earnings, mileage, and tax set-aside across
            every platform automatically — so quarterly taxes are never a
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
          This guide is educational information, not tax advice. Tax rules,
          thresholds, and the IRS standard mileage rate change yearly — confirm
          current figures with the IRS or a qualified tax professional for your
          situation.
        </p>
      </main>
    </div>
  );
}
