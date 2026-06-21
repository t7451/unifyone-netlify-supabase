import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/gig-quarterly-taxes`;

/** The questions gig workers (and answer engines) ask about estimated taxes. */
const FAQS = [
  {
    q: "Do gig workers have to pay quarterly taxes?",
    a: "Generally yes. Gig platforms withhold nothing, so if you expect to owe $1,000 or more in tax for the year after subtracting any withholding and credits, the IRS expects estimated payments four times a year. Paying quarterly is how you cover the income tax plus 15.3% self-employment tax you owe as an independent contractor.",
  },
  {
    q: "How much should I pay each quarter?",
    a: "A practical approach is to estimate your full-year tax (self-employment tax plus federal income tax on your net earnings), divide by four, and pay roughly a quarter each period. Many gig workers set aside 25–30% of net earnings as they go. The quarterly tax estimator turns your net earnings into a per-quarter number.",
  },
  {
    q: "What happens if I miss a quarterly payment?",
    a: "The IRS can charge an underpayment penalty, calculated like interest on the amount you underpaid for the time it was late. It is not a flat fine — the longer the shortfall sits, the more it accrues. If you miss a deadline, paying as soon as you can limits the penalty. Meeting a safe-harbor threshold avoids it entirely.",
  },
  {
    q: "What is the safe-harbor rule for estimated taxes?",
    a: "You generally avoid an underpayment penalty if your payments and withholding cover at least 90% of this year's tax, or 100% of last year's tax (110% if your prior-year adjusted gross income was over $150,000). Last year's figure is a fixed, knowable target, which makes it a popular safe harbor for gig workers with variable income.",
  },
  {
    q: "When are quarterly estimated taxes due?",
    a: "For most years the four federal deadlines fall around April 15, June 15, September 15, and January 15 of the following year. When a date lands on a weekend or holiday it shifts to the next business day, so confirm the exact dates for the current year on the IRS estimated taxes page.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Quarterly Estimated Taxes for Gig Workers: A Practical Guide | UnifyOne",
    description:
      "How quarterly estimated taxes work for gig workers: who must pay, the four due dates, the safe-harbor rule, how to estimate and pay, and the underpayment penalty.",
    breadcrumbs: [
      { name: "Quarterly Estimated Taxes for Gig Workers", item: CANONICAL },
    ],
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

/** The four federal estimated-tax periods and their usual deadlines. */
const QUARTERS = [
  {
    label: "Q1",
    period: "Jan 1 – Mar 31",
    due: "~April 15",
  },
  {
    label: "Q2",
    period: "Apr 1 – May 31",
    due: "~June 15",
  },
  {
    label: "Q3",
    period: "Jun 1 – Aug 31",
    due: "~September 15",
  },
  {
    label: "Q4",
    period: "Sep 1 – Dec 31",
    due: "~January 15 (next year)",
  },
];

const IRS_LINKS = [
  {
    label: "IRS: Estimated Taxes",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
  },
  {
    label: "IRS: Pay your taxes (Direct Pay & EFTPS)",
    href: "https://www.irs.gov/payments",
  },
  {
    label: "IRS Form 1040-ES (Estimated Tax for Individuals)",
    href: "https://www.irs.gov/forms-pubs/about-form-1040-es",
  },
  {
    label: "IRS: Underpayment of Estimated Tax",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/underpayment-of-estimated-tax-by-individuals-penalty",
  },
  {
    label: "IRS: Self-Employed Individuals Tax Center",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
];

const TOOLS = [
  {
    label: "Quarterly Tax Estimator",
    href: "/tools/quarterly-tax-estimator",
    desc: "Your Q1–Q4 estimated payment amounts",
  },
  {
    label: "Tax Set-Aside Calculator",
    href: "/tools/tax-set-aside",
    desc: "What percent of each payout to save",
  },
];

/**
 * Deep-dive spoke in the gig-tax cluster covering quarterly estimated taxes:
 * who must pay, the four due dates, the safe-harbor rule, how to estimate each
 * payment, how to pay (IRS Direct Pay / EFTPS / 1040-ES), and the underpayment
 * penalty — with FAQPage structured data for answer engines.
 */
export default function GigQuarterlyTaxes() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Quarterly Estimated Taxes for Gig Workers: A Practical Guide | UnifyOne"
        description="How quarterly estimated taxes work for gig workers: who pays, the four due dates, the safe-harbor rule, how to estimate and pay, and the underpayment penalty."
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
            Quarterly Estimated Taxes for Gig Workers: A Practical Guide
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            When you drive for DoorDash, Uber, or Instacart, no employer
            withholds tax from your pay — so the IRS asks you to pay it in four
            installments across the year instead of all at once in April. This
            guide explains who has to pay, when each payment is due, how much to
            send, how to actually pay it, and what the penalty is if you fall
            short.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/gig-taxes" className="text-primary hover:underline">
              ← Part of the complete Gig Worker Taxes guide
            </Link>
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Who has to pay quarterly taxes?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            As a general rule, you should make estimated payments if you expect
            to owe <strong>$1,000 or more</strong> in tax for the year after
            subtracting any withholding and refundable credits. Most gig workers
            cross that line quickly, because gig income carries both federal
            income tax and the <strong>15.3% self-employment tax</strong> (12.4%
            Social Security + 2.9% Medicare) with nothing withheld up front.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            If gig work is a side hustle and your W-2 job already withholds
            enough to cover the extra tax, you may not need separate quarterly
            payments — you can also raise your W-2 withholding instead. The
            threshold and the details are set by the IRS, so confirm your
            situation against the links below or with a tax professional.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">The four due dates</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Federal estimated taxes are due four times a year. The dates below
            are the usual deadlines — each one{" "}
            <strong>shifts to the next business day</strong> when it falls on a
            weekend or holiday, so check the current year's exact dates with the
            IRS.
          </p>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Quarter</th>
                  <th className="px-4 py-2 font-semibold">Income earned</th>
                  <th className="px-4 py-2 font-semibold">Payment due</th>
                </tr>
              </thead>
              <tbody>
                {QUARTERS.map(({ label, period, due }) => (
                  <tr key={label} className="border-t">
                    <td className="px-4 py-2 font-medium">{label}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {period}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            The safe-harbor rule (how to avoid a penalty)
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            You generally avoid an underpayment penalty if your payments and
            withholding for the year add up to at least:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-3 list-disc pl-5">
            <li>
              <strong>90% of this year's total tax</strong>, or
            </li>
            <li>
              <strong>100% of last year's total tax</strong> — whichever is
              smaller.
            </li>
            <li>
              If your prior-year adjusted gross income was over{" "}
              <strong>$150,000</strong>, the second figure rises to{" "}
              <strong>110% of last year's tax</strong>.
            </li>
          </ul>
          <p className="text-muted-foreground text-sm leading-relaxed">
            For gig workers with bumpy, hard-to-predict income, the prior-year
            safe harbor is often easiest: last year's tax is a fixed, knowable
            number, so paying that amount in four equal installments protects
            you from a penalty even if you earn much more this year.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            How to estimate each payment
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            Quarterly taxes are based on your <strong>net earnings</strong> —
            gross payouts minus deductible business expenses like mileage — not
            your gross pay. A straightforward way to estimate each payment:
          </p>
          <ol className="space-y-2 text-sm text-muted-foreground mb-3 list-decimal pl-5">
            <li>
              Project your net earnings (income after deductions) for the full
              year.
            </li>
            <li>
              Estimate your total tax on that profit — self-employment tax plus
              federal income tax at your bracket.
            </li>
            <li>Divide the total by four to get each quarter's payment.</li>
            <li>
              Adjust along the way if your earnings rise or fall, or if you
              cross into a new bracket.
            </li>
          </ol>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Setting aside <strong>25–30% of each payout</strong> as you earn is
            a common shortcut that usually covers self-employment plus income
            tax. The free calculators below do the arithmetic for you.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">How to actually pay</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            You have a few options, all of which credit the same quarterly
            estimate:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>
              <strong>IRS Direct Pay</strong> — pay directly from a bank account
              on the IRS site, free, no enrollment required. Choose "Estimated
              Tax" as the reason.
            </li>
            <li>
              <strong>EFTPS</strong> (Electronic Federal Tax Payment System) — a
              free government system you enroll in once; useful if you want to
              schedule payments in advance.
            </li>
            <li>
              <strong>By mail with Form 1040-ES</strong> — each Form 1040-ES
              packet includes payment vouchers you mail with a check.
            </li>
          </ul>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            Don't forget <strong>state estimated taxes</strong> if your state
            has an income tax — those are paid separately to your state, often
            on a similar schedule.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            What is the underpayment penalty?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            If you pay too little (and miss the safe harbor), the IRS charges an
            underpayment penalty. It works like interest: it's calculated on the
            amount you underpaid, for the period it stayed unpaid, at a rate the
            IRS sets and updates. It is not a flat fine — paying as soon as
            possible reduces it, and hitting a safe-harbor threshold avoids it
            altogether. See the IRS underpayment penalty page below for the
            current rate and the Form 2210 details.
          </p>
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
            {IRS_LINKS.map(({ label, href }) => (
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
            Never get surprised by a quarterly payment
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your earnings, mileage, and tax set-aside across
            every platform automatically — so each quarter's number is ready
            before the deadline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start tracking free →
            </Link>
            <Link
              href="/tools/quarterly-tax-estimator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the quarterly tax estimator
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          This guide is educational information, not tax advice. The $1,000
          threshold, safe-harbor percentages, due dates, and the underpayment
          penalty rate are set by the IRS and can change — confirm current
          figures with the IRS or a qualified tax professional for your
          situation.
        </p>
      </main>
    </div>
  );
}
