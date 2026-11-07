import ResourceReview from "@/components/ResourceReview";
import { TAX_REVIEW } from "@/content/resourceReview";
import ReadingLayout from "@/components/ReadingLayout";
import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/1099-nec-vs-1099-k`;

const DESCRIPTION =
  "1099-NEC vs 1099-K for gig workers: what each form is, who issues which, why thresholds change yearly, and how both flow onto Schedule C. Not tax advice.";

const FAQS = [
  {
    q: "What is the difference between a 1099-NEC and a 1099-K?",
    a: "A 1099-NEC reports nonemployee compensation — money a business paid you directly for your services, like DoorDash or Instacart delivery pay. A 1099-K reports the gross amount of payments settled through a third-party payment platform or card processor, like the fares riders pay through Uber or Lyft. They describe how the money reached you, not whether it is taxable — both report income you may owe tax on.",
  },
  {
    q: "Which form will my gig platform send me?",
    a: "It depends on how the platform pays you. DoorDash and Instacart generally issue a 1099-NEC for delivery earnings. Uber and Lyft often issue a 1099-K for the gross fares processed through their app plus a 1099-NEC for incentives, bonuses, and referrals. Some drivers get both, some get one, and some get neither if they fall under the reporting thresholds. Check your platform's tax center for your specific documents.",
  },
  {
    q: "What if the reporting threshold means I don't get a form?",
    a: "Report all business income even if no form arrives. Form-reporting thresholds do not determine taxable income or whether you must file a return. Your net profit, total household income and filing rules determine the tax due.",
  },
  {
    q: "What do I do if I receive both a 1099-NEC and a 1099-K from the same platform?",
    a: "Reconcile forms to statements and your ledger. Uber gross fares and separate incentives are different income categories; deposits can repeat amounts already reported on forms. Request corrections for errors and count each payment once.",
  },
  {
    q: "How do 1099-NEC and 1099-K income flow onto my tax return?",
    a: "For a sole proprietor, gig business receipts generally belong on Schedule C with allowable business expenses. Schedule SE determines self-employment tax when required; Form 1040 determines income tax. Personal transfers and non-business transactions on a 1099-K need separate analysis.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "1099-NEC vs 1099-K: What Gig Workers Need to Know | UnifyOne",
    description: DESCRIPTION,
    breadcrumbs: [{ name: "1099-NEC vs 1099-K", item: CANONICAL }],
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

const COMPARISON = [
  {
    label: "What it reports",
    nec: "Nonemployee compensation — direct pay for services you performed as an independent contractor.",
    k: "Gross payments settled through a third-party platform or payment-card processor.",
  },
  {
    label: "Who typically issues it",
    nec: "The business that paid you (e.g. DoorDash, Instacart) for delivery earnings; platforms also use it for incentives and referrals.",
    k: "The payment settlement entity — the rideshare app or processor (e.g. Uber, Lyft) handling the fares riders pay.",
  },
  {
    label: "Amount shown",
    nec: "The compensation paid to you for the year.",
    k: "Gross transaction volume before platform fees, refunds, or adjustments — often larger than what you kept.",
  },
  {
    label: "Reporting threshold",
    nec: TAX_REVIEW.nec,
    k: TAX_REVIEW.k,
  },
  {
    label: "Where it lands on your return",
    nec: "Gross income on Schedule C, then net profit to Schedule SE and Form 1040.",
    k: "Gross income on Schedule C, then net profit to Schedule SE and Form 1040.",
  },
  {
    label: "Tax owed if no form arrives",
    nec: "You still owe tax on net income — a missing form does not make income tax-free.",
    k: "You still owe tax on net income — a missing form does not make income tax-free.",
  },
];

const IRS_RESOURCES = [
  {
    label: "IRS: About Form 1099-NEC, Nonemployee Compensation",
    href: "https://www.irs.gov/forms-pubs/about-form-1099-nec",
  },
  {
    label: "IRS: Understanding Your Form 1099-K",
    href: "https://www.irs.gov/businesses/understanding-your-form-1099-k",
  },
  {
    label: "IRS: Self-Employed Individuals Tax Center",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
  {
    label: "IRS: Estimated Taxes",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
  },
  {
    label: "IRS: Schedule C (Form 1040), Profit or Loss From Business",
    href: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040",
  },
];

const RELATED_LINKS = [
  { label: "Gig Worker Taxes guide", href: "/gig-taxes" },
  { label: "DoorDash taxes", href: "/doordash-taxes" },
  { label: "Uber driver taxes", href: "/uber-driver-taxes" },
  { label: "Instacart taxes", href: "/instacart-taxes" },
  {
    label: "Quarterly Tax Estimator",
    href: "/tools/quarterly-tax-estimator",
  },
  { label: "Self-Employment Tax Calculator", href: "/tools/se-tax-calculator" },
  { label: "Tax Set-Aside Calculator", href: "/tools/tax-set-aside" },
  {
    label: "Mileage Deduction Calculator",
    href: "/tools/mileage-deduction-calculator",
  },
];

export default function Form1099Explainer() {
  return (
    <ReadingLayout kind="article">
      <PageHead
        title="1099-NEC vs 1099-K: What Gig Workers Need to Know | UnifyOne"
        description={DESCRIPTION}
        canonical={CANONICAL}
        ogType="article"
        jsonLd={jsonLd}
      />

      <div className="reading-content">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Gig Worker Taxes
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            1099-NEC vs 1099-K: What Gig Workers Need to Know
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            If you drive or deliver for gig apps, you may receive a 1099-NEC, a
            1099-K, both, or neither — and the alphabet soup confuses almost
            everyone. The two forms describe how money reached you, not whether
            you owe tax on it. Here is what each form means, who sends which,
            why the reporting thresholds keep changing, and how all of it lands
            on Schedule C for the same sole-proprietor business. Separate
            businesses may need separate schedules.
          </p>
          <p className="mt-4 text-sm">
            <Link
              href="/gig-taxes"
              className="text-primary hover:underline font-medium"
            >
              ← Part of the complete Gig Worker Taxes guide
            </Link>
          </p>
        </header>
        <ResourceReview slug="1099-nec-vs-1099-k" tax />

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            What each form actually is
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-2">
                1099-NEC — Nonemployee Compensation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A 1099-NEC reports money a business paid you directly for
                services you performed as an independent contractor. For gig
                workers, that is your delivery pay — the compensation DoorDash
                or Instacart paid you for completing orders. Platforms also use
                the 1099-NEC for incentives, bonuses, and referral payments.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-2">
                1099-K — Payment Card and Third-Party Network Transactions
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A 1099-K reports the gross amount of payments settled through a
                third-party payment platform or card processor on your behalf.
                For rideshare drivers, that is typically the gross fares riders
                paid through the app. Because it shows gross transaction volume
                before fees and refunds, the 1099-K total is often larger than
                what actually hit your bank account.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            1099-NEC vs 1099-K, side by side
          </h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-semibold w-1/4">
                    <span className="sr-only">Category</span>
                  </th>
                  <th className="p-3 font-semibold">1099-NEC</th>
                  <th className="p-3 font-semibold">1099-K</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(row => (
                  <tr
                    key={row.label}
                    className="border-b last:border-0 align-top"
                  >
                    <th
                      scope="row"
                      className="p-3 font-medium text-left text-muted-foreground"
                    >
                      {row.label}
                    </th>
                    <td className="p-3 text-muted-foreground">{row.nec}</td>
                    <td className="p-3 text-muted-foreground">{row.k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Who issues which form</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The form you receive depends on how the platform pays you, not on
            how much you earned relative to anyone else:
          </p>
          <ul className="space-y-3">
            {[
              {
                platform: "DoorDash & Instacart",
                detail:
                  "Generally issue a 1099-NEC for delivery earnings, because they pay you directly for completing orders.",
              },
              {
                platform: "Uber & Lyft",
                detail:
                  "Often issue a 1099-K for the gross fares processed through the app, plus a separate 1099-NEC for incentives, bonuses, and referrals. Their annual tax summary reconciles both.",
              },
              {
                platform: "Other platforms",
                detail:
                  "Vary. Whether you get a 1099-NEC, a 1099-K, both, or neither comes down to the payment mechanics and the current IRS reporting thresholds. Always check the tax-documents section in your platform account.",
              },
            ].map(({ platform, detail }) => (
              <li key={platform} className="flex gap-3">
                <span className="text-primary font-bold leading-6">•</span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">
                    {platform}:
                  </span>{" "}
                  {detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Reporting thresholds change year to year
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            A reporting threshold is the dollar (and, for some forms,
            transaction) level that decides whether a platform is{" "}
            <em>required</em> to send you a particular form. These thresholds —
            especially for the 1099-K — have been adjusted repeatedly in recent
            years, so any specific number you read online may be out of date.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rather than memorize a figure, confirm the current thresholds
            directly on the IRS pages linked below for the tax year you are
            filing. And remember the key point: the threshold only governs
            whether a <em>form</em> is issued. It never changes whether your
            income is taxable.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-6 mb-10">
          <h2 className="text-xl font-semibold mb-3">
            What to do if you receive both — or neither
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <span className="font-semibold text-foreground">
                If you receive both:
              </span>{" "}
              gross fares and separate incentive pay are distinct categories.
              Deposits may repeat income already on those forms. Use your
              platform's annual tax summary to reconcile the totals so you
              report each dollar once and never double-count.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                If you receive neither:
              </span>{" "}
              you still owe tax on your net income. Falling below a reporting
              threshold means a form was not required — it does not mean the
              income is tax-free. You are responsible for reporting all gig
              earnings whether or not a form arrives.
            </p>
            <p className="font-medium text-foreground">
              Tax forms report payments; your business profit and filing
              circumstances determine the income tax and self-employment tax
              due.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            How both forms flow onto Schedule C
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            For a sole proprietor reporting gig business income, the usual
            sequence is:
          </p>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Add up your gross gig income",
                body: "Combine income from your 1099-NEC, your 1099-K, and any earnings with no form at all. Use platform tax summaries to avoid double-counting when forms overlap.",
              },
              {
                step: "2",
                title: "Report it on Schedule C",
                body: "Schedule C (Profit or Loss From Business) is where gross income and business expenses meet. Subtract deductions like the IRS standard mileage rate, phone use, and supplies to reach your net profit.",
              },
              {
                step: "3",
                title: "Carry net profit to Schedule SE",
                body: TAX_REVIEW.se,
              },
              {
                step: "4",
                title: "Finish on Form 1040",
                body: "Net profit also lands on your Form 1040 for income tax, and half of your SE tax becomes an above-the-line deduction. The form type never changes this path — net profit drives the tax.",
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
          <h2 className="text-xl font-semibold mb-4">
            Related guides and calculators
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {RELATED_LINKS.map(({ label, href }) => (
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

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-10">
          <h2 className="text-lg font-semibold mb-2">
            Keep the records behind your forms
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Use UnifyOne to organize entered work records, CSV imports and
            expenses. Reconcile those records against your platform statements
            and tax forms before filing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get started free →
            </Link>
            <Link
              href="/tools/quarterly-tax-estimator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the free calculator
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground leading-relaxed">
          This page is educational and is not tax, legal, or accounting advice.
          Tax forms, reporting thresholds, and rules change and vary by your
          individual circumstances and state. Verify current details with the
          IRS or a qualified tax professional before filing.
        </p>
      </div>
    </ReadingLayout>
  );
}
