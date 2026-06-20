import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/how-to-file-gig-worker-taxes`;

/**
 * The ordered filing walkthrough. Rendered both as visible numbered steps and
 * as HowTo structured data for answer engines.
 */
const STEPS = [
  {
    title: "Gather your forms and your own records",
    body: "Collect every 1099-NEC and 1099-K your platforms issued (DoorDash, Uber, Instacart, and others deliver these by late January, often through Stripe). Just as important, pull your own records: total earnings from each app's earnings tab and your mileage log. Your records — not the forms — are the complete picture, because you must report income even when no form arrives.",
  },
  {
    title: "Total your gross income",
    body: "Add up everything you earned across every platform for the year, including tips and incentives. Report all of it, even income under $600 or any amount that didn't generate a 1099. The IRS expects your gross self-employment income whether or not a form was filed for it.",
  },
  {
    title: "Report income and expenses on Schedule C",
    body: "Schedule C (Profit or Loss From Business) is where you list your gross income and subtract your business deductions — the standard mileage rate for business miles, the business-use share of your phone, hot bags and supplies, tolls, parking, and platform service fees. Income minus deductions gives your net profit, the number the rest of your return is built on.",
  },
  {
    title: "Calculate self-employment tax on Schedule SE",
    body: "Self-employment tax is 15.3% of your net earnings — 12.4% for Social Security plus 2.9% for Medicare — covering both the employee and employer halves an employer would otherwise split with you. Schedule SE computes this from your Schedule C net profit.",
  },
  {
    title: "Carry the totals to Form 1040 and deduct half of SE tax",
    body: "Your Schedule C net profit and your Schedule SE self-employment tax both flow onto your Form 1040. You can deduct one-half of your self-employment tax as an above-the-line adjustment, which lowers the income your federal income tax is calculated on.",
  },
  {
    title: "Set up quarterly estimated payments going forward",
    body: "Because nobody withholds taxes for you, the IRS generally expects estimated payments four times a year if you'll owe $1,000 or more — typically around April 15, June 15, September 15, and the following January 15. Use Form 1040-ES to estimate and pay each quarter so you avoid an underpayment penalty next year.",
  },
  {
    title: "File your state return if your state has income tax",
    body: "Most states with an income tax want you to report the same self-employment income on a state return, and some expect their own quarterly estimates. A handful of states have no income tax at all. Check your state's department of revenue for forms, thresholds, and deadlines.",
  },
];

/** The core federal forms a gig worker touches. */
const FORMS = [
  {
    name: "Schedule C",
    desc: "Profit or Loss From Business — report gross income and deductions to get net profit.",
  },
  {
    name: "Schedule SE",
    desc: "Self-Employment Tax — calculate the 15.3% Social Security + Medicare tax on net earnings.",
  },
  {
    name: "Form 1040",
    desc: "Your individual income tax return, where Schedule C and Schedule SE totals land.",
  },
  {
    name: "Form 1040-ES",
    desc: "Estimated Tax for Individuals — used to figure and pay quarterly estimated taxes.",
  },
];

/** Step-by-step filing questions answer engines get asked. */
const FAQS = [
  {
    q: "Which forms do gig workers file?",
    a: "Most gig workers report income and expenses on Schedule C, calculate self-employment tax on Schedule SE, and file both with Form 1040. Quarterly estimated payments use Form 1040-ES. Your platforms may send you a 1099-NEC and/or 1099-K to start from, but you report your total income regardless of which forms arrive.",
  },
  {
    q: "Do I have to file if I made under $600 or didn't get a 1099?",
    a: "Yes. The $600 threshold only governs whether a platform must send you a 1099 — it does not change your obligation to report income. You generally must report all self-employment income, and if your net earnings from self-employment are $400 or more you owe self-employment tax and must file a return.",
  },
  {
    q: "When is the filing deadline?",
    a: "The annual federal return is generally due around April 15 (the date shifts when the 15th falls on a weekend or holiday). Quarterly estimated payments follow their own schedule — roughly April 15, June 15, September 15, and the following January 15. Confirm the exact dates for the tax year with the IRS.",
  },
  {
    q: "How do I file — free or paid?",
    a: "You have options. IRS Free File offers free guided software to those who qualify by income, and Free File Fillable Forms are available to everyone. Commercial tax software can walk you through Schedule C and Schedule SE, and a qualified tax professional can prepare and file for you. Choose what fits your comfort level and budget.",
  },
  {
    q: "What's the difference between income tax and self-employment tax?",
    a: "They are two separate taxes on the same earnings. Self-employment tax is a flat 15.3% (Social Security + Medicare) calculated on Schedule SE, and half of it is deductible. Federal income tax is calculated on your taxable income using the tax brackets. As a gig worker you typically owe both, plus any state income tax.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "How to File Taxes as a Gig Worker: Step-by-Step | UnifyOne",
    description:
      "A step-by-step guide to filing taxes as a gig worker: gather 1099s, total income, file Schedule C and Schedule SE, complete Form 1040, and pay quarterly.",
    breadcrumbs: [{ name: "How to File Gig Worker Taxes", item: CANONICAL }],
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
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to File Taxes as a Gig Worker",
    description:
      "Step-by-step process for filing federal taxes as a 1099 gig worker, from gathering forms to paying quarterly estimates.",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  },
];

/**
 * Step-by-step spoke in the gig-tax topic cluster. Walks a 1099 gig worker
 * through the actual filing process in order — gather forms, total income,
 * Schedule C, Schedule SE, Form 1040, quarterly 1040-ES, and the state return —
 * with FAQPage + HowTo structured data and links back to the pillar guide and
 * the free calculators.
 */
export default function HowToFileGigTaxes() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="How to File Taxes as a Gig Worker: Step-by-Step | UnifyOne"
        description="Step-by-step guide to filing gig worker taxes: gather 1099s, total income, file Schedule C & Schedule SE, complete Form 1040, and pay quarterly estimates."
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
            How to File Taxes as a Gig Worker: Step-by-Step
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            Filing as a 1099 gig worker has a few more moving parts than a
            simple W-2 return, but it follows a predictable order. This guide
            walks you through it step by step — from gathering your forms to
            handling quarterly payments — so you know exactly what to file and
            in what sequence.
          </p>
          <Link
            href="/gig-taxes"
            className="text-sm text-primary hover:underline"
          >
            ← Part of the complete Gig Worker Taxes guide
          </Link>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-6">
            The filing process, step by step
          </h2>
          <div className="space-y-6">
            {STEPS.map(({ title, body }, i) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold mb-1">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">The key forms at a glance</h2>
          <ul className="space-y-3">
            {FORMS.map(({ name, desc }) => (
              <li key={name} className="flex gap-3">
                <span className="font-semibold text-sm whitespace-nowrap">
                  {name}
                </span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Where to file: free and paid options
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You don't have to do this by hand. IRS Free File offers free guided
            software if you qualify by income, and Free File Fillable Forms are
            open to everyone. Commercial tax software can walk you through
            Schedule C and Schedule SE, and a qualified tax professional can
            prepare and file the whole return for you. Pick whatever matches
            your comfort level and budget — there's no single right choice.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Estimate the numbers before you file
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            These free calculators help you check your self-employment tax,
            mileage deduction, and quarterly payments before they go on a form.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Self-Employment Tax Calculator",
                href: "/tools/se-tax-calculator",
                desc: "The 15.3% SE tax for Schedule SE",
              },
              {
                label: "Quarterly Tax Estimator",
                href: "/tools/quarterly-tax-estimator",
                desc: "Your Form 1040-ES payment amounts",
              },
              {
                label: "Mileage Deduction Calculator",
                href: "/tools/mileage-deduction-calculator",
                desc: "Turn miles into a Schedule C deduction",
              },
              {
                label: "Tax Set-Aside Calculator",
                href: "/tools/tax-set-aside",
                desc: "What percent of each payout to save",
              },
            ].map(({ label, href, desc }) => (
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
                label: "IRS: Schedule C (Profit or Loss From Business)",
                href: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040",
              },
              {
                label: "IRS: Schedule SE (Self-Employment Tax)",
                href: "https://www.irs.gov/forms-pubs/about-schedule-se-form-1040",
              },
              {
                label: "IRS: Estimated Taxes",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
              },
              {
                label: "IRS Free File",
                href: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free",
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
          <h2 className="text-xl font-semibold mb-4">Keep reading</h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/gig-taxes"
                className="text-sm text-primary hover:underline"
              >
                Gig Worker Taxes: the complete guide →
              </Link>
            </li>
            <li>
              <Link
                href="/gig-quarterly-taxes"
                className="text-sm text-primary hover:underline"
              >
                Quarterly estimated taxes for gig workers →
              </Link>
            </li>
            <li>
              <Link
                href="/tools"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                All free gig-worker tools →
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Make next year's filing easier
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your earnings, mileage, and tax set-aside across
            every platform all year — so when filing season arrives, your
            Schedule C numbers are already in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start tracking free →
            </Link>
            <Link
              href="/tools/se-tax-calculator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the SE tax calculator
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          This guide is educational information, not tax advice. Tax forms,
          thresholds, rates, and deadlines change yearly and vary by situation
          and state — confirm the current rules with the IRS, your state's
          department of revenue, or a qualified tax professional before you
          file.
        </p>
      </main>
    </div>
  );
}
