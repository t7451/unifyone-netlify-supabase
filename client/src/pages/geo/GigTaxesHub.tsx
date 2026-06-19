import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { PLATFORM_TAX_GUIDES } from "@/content/geo/platformTaxGuides";
import { STATE_TAX_GUIDES } from "@/content/geo/stateTaxGuides";

const CANONICAL = `${SITE_URL}/gig-taxes`;

const TITLE = "Gig Worker Taxes: The Complete Guide | UnifyOne";
const DESCRIPTION =
  "The complete gig worker tax guide: the 15.3% self-employment tax, 1099s, deductions, quarterly estimates, and platform- and state-specific breakdowns. Not tax advice.";

/** Top-level FAQs for the pillar page — also power the FAQPage JSON-LD. */
const FAQS = [
  {
    q: "Do gig workers pay taxes if they don't get a 1099?",
    a: "Yes. You must report all self-employment income whether or not a platform issues a 1099-NEC or 1099-K. The form thresholds change from year to year, but your obligation to report every dollar of net earnings does not.",
  },
  {
    q: "What is the self-employment tax for gig workers?",
    a: "Self-employment tax is 15.3% of your net earnings — 12.4% for Social Security plus 2.9% for Medicare. It applies in every state on top of federal income tax, because as a 1099 contractor you cover both the employer and employee share. You can deduct half of it when figuring federal income tax.",
  },
  {
    q: "How much should gig workers set aside for taxes?",
    a: "A common rule of thumb is to set aside roughly 25–30% of your net earnings (after mileage and other deductions) to cover self-employment tax plus federal and any state income tax. In states with no income tax it can be a little lower. Your exact rate depends on your total household income and state — use the Tax Set-Aside calculator for a tailored number.",
  },
  {
    q: "When are quarterly estimated taxes due?",
    a: "Federal estimated payments are generally due around April 15, June 15, September 15, and January 15 of the following year, with the annual return due April 15. If you expect to owe $1,000 or more, paying quarterly avoids an IRS underpayment penalty. States with their own income tax expect estimates on a comparable schedule.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: TITLE,
    description: DESCRIPTION,
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

/**
 * /gig-taxes — the pillar page for the gig-worker tax cluster. It explains the
 * evergreen mechanics every gig worker faces (no withholding, the 15.3%
 * self-employment tax, report-all-income, quarterly estimates, deductions) and
 * links out to the platform-specific guides, the state-specific guides, and the
 * free calculators. Ships WebPage + FAQPage JSON-LD and a visible FAQ for AEO.
 */
export default function GigTaxesHub() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title={TITLE}
        description={DESCRIPTION}
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
            Gig Worker Taxes
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Gig Worker Taxes: The Complete Guide
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Driving, delivering, or freelancing means the platform pays you as
            an independent contractor and withholds nothing — so you handle your
            own taxes. This guide covers the rules every gig worker shares, then
            links to platform- and state-specific breakdowns. It's educational
            information, not tax advice.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            How gig taxes work, in four points
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Nothing is withheld.</strong>{" "}
              As a 1099 contractor, no income or payroll tax comes out of your
              payouts. You set the money aside and pay it yourself.
            </p>
            <p>
              <strong className="text-foreground">
                Self-employment tax is 15.3%.
              </strong>{" "}
              That's 12.4% Social Security + 2.9% Medicare on your net earnings,
              on top of federal income tax — the same in every state. You can
              deduct half of it when figuring federal income tax.
            </p>
            <p>
              <strong className="text-foreground">
                Deductions lower what you owe.
              </strong>{" "}
              Business mileage at the IRS standard mileage rate is usually the
              largest deduction, alongside the business-use share of your phone,
              supplies, tolls, and parking.
            </p>
            <p>
              <strong className="text-foreground">You pay as you go.</strong>{" "}
              The IRS expects quarterly estimated payments — generally around
              April 15, June 15, September 15, and January 15 — if you'll owe
              $1,000 or more for the year. Report all income, even without a
              1099.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Taxes by platform</h2>
          <p className="text-sm text-muted-foreground mb-4">
            How each platform reports your earnings, the forms you'll get, and
            the deductions that apply.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {PLATFORM_TAX_GUIDES.map(g => (
              <Link
                key={g.slug}
                href={`/${g.slug}`}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium">{g.platform} taxes →</p>
                <p className="text-xs text-muted-foreground mt-1">
                  For {g.workerNoun}: 1099s, deductions, and quarterly
                  estimates.
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Taxes by state</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The 15.3% self-employment tax is federal and uniform — but state
            income tax varies. These guides cover where you pay (or don't) and
            how to file state estimates.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {STATE_TAX_GUIDES.map(g => (
              <Link
                key={g.slug}
                href={`/${g.slug}`}
                className="rounded-lg border p-4 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium">{g.state} gig taxes →</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {g.hasStateIncomeTax
                    ? `${g.state} has a state income tax on top of federal and SE tax.`
                    : `${g.state} has no state income tax — federal and SE tax only.`}
                </p>
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
            automatically — so quarterly taxes are never a surprise.
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
          yearly — confirm current figures with the IRS, your state tax agency,
          or a qualified tax professional for your situation.
        </p>
      </main>
    </div>
  );
}
