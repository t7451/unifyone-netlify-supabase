import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/1099-tax-management`;

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "1099 Tax Management for Gig Workers — Quarterly Estimates & Deductions | UnifyOne",
    description:
      "UnifyOne automates 1099 tax management for gig workers: quarterly estimated payments, SE tax calculation, mileage deductions, and IRS-ready records — all from your live earnings data.",
    breadcrumbs: [{ name: "1099 Tax Management", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What taxes does a 1099 gig worker have to pay?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "1099 gig workers owe self-employment (SE) tax of 15.3% on 92.35% of net earnings (covering Social Security and Medicare), plus federal income tax based on their bracket, plus any applicable state income tax. Unlike W-2 employees, no employer withholds these — gig workers must estimate and pay quarterly.",
        },
      },
      {
        "@type": "Question",
        name: "How do I calculate quarterly estimated taxes as a gig worker?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Multiply your net gig income by 0.9235 to get adjusted net earnings, then multiply by 0.153 for SE tax. Add your estimated federal income tax (based on bracket after the standard deduction and half of SE tax deduction). Divide the total by 4 for each quarterly payment. UnifyOne's quarterly tax estimator calculates this automatically from your live earnings.",
        },
      },
      {
        "@type": "Question",
        name: "What deductions can gig workers take on their 1099 taxes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Key deductions: IRS standard mileage ($0.70/mile in 2025), phone and data plan (business-use percentage), platform fees and commissions, equipment and supplies, health insurance premiums (if self-employed), and half of your SE tax. Mileage is typically the largest single deduction for delivery and rideshare workers.",
        },
      },
      {
        "@type": "Question",
        name: "When are 1099 quarterly tax payments due in 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "2026 quarterly estimated tax due dates: Q1 — April 15, 2026; Q2 — June 15, 2026; Q3 — September 15, 2026; Q4 — January 15, 2027. Missing a payment can trigger IRS underpayment penalties even if you pay the full amount at filing. This is educational information, not tax advice.",
        },
      },
      {
        "@type": "Question",
        name: "How is UnifyOne different from QuickBooks Self-Employed for 1099 taxes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "QuickBooks Self-Employed requires manual income entry and focuses on single-platform workers. UnifyOne automatically aggregates income from DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square — then calculates your quarterly tax position in real time from live multi-platform earnings, not estimates you type in.",
        },
      },
      {
        "@type": "Question",
        name: "When will I get my 1099 from gig platforms?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Platforms generally must send 1099-NEC or 1099-K forms by January 31 for the prior tax year, with electronic copies often posted in your account portal around the same time. You may not receive a form from a platform where your earnings fell below the reporting threshold, but you still must report that income. This is educational information, not tax advice.",
        },
      },
      {
        "@type": "Question",
        name: "What if my 1099 amount looks wrong?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "First reconcile the form against your own payout records — 1099-K figures often include gross volume before platform fees and refunds, so a number that looks high may still be correct. If a genuine error remains, contact the platform that issued it to request a corrected form rather than simply ignoring it. UnifyOne's complete earnings ledger makes this reconciliation straightforward; this is educational information, not tax advice.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to pay taxes quarterly as a 1099 worker?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Generally yes — the IRS expects estimated payments throughout the year if you anticipate owing about $1,000 or more, because no employer withholds tax from gig pay. Skipping the quarterly due dates can trigger underpayment penalties even if you pay in full at filing. UnifyOne shows your running quarterly liability so you know each payment before it's due; this is educational information, not tax advice.",
        },
      },
    ],
  },
];

export default function TaxManagement1099() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="1099 Tax Management for Gig Workers — Quarterly Estimates & Deductions | UnifyOne"
        description="Automated 1099 tax management for gig workers: quarterly payments from live earnings, SE tax, mileage deductions, and IRS-ready records."
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
            Tax Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            1099 Tax Management Built for Gig Workers
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every gig platform pays you gross — no withholding, no W-2, no
            employer handling your taxes. As a 1099 worker, you owe
            self-employment tax, quarterly estimated payments, and you have to
            track your own deductions. UnifyOne manages all of it automatically
            from your live earnings data.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            What 1099 gig workers actually owe
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Self-employment tax",
                value: "15.3%",
                desc: "On 92.35% of net earnings. Covers Social Security (12.4%) and Medicare (2.9%). No employer to split it with.",
              },
              {
                label: "Federal income tax",
                value: "10–37%",
                desc: "Based on your bracket after deductions. The SE tax deduction (half of SE tax) reduces your taxable income.",
              },
              {
                label: "Quarterly payments",
                value: "4×/year",
                desc: "Due April, June, September, January. Miss one and the IRS charges underpayment penalties regardless of your April filing.",
              },
              {
                label: "Mileage deduction",
                value: "$0.70/mile",
                desc: "2025 IRS standard rate. On 15,000 miles, that's $10,500 off your taxable income — your biggest deduction.",
              },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex gap-4 items-start">
                <div className="flex-shrink-0 min-w-[4rem] text-right">
                  <span className="text-lg font-bold text-primary">
                    {value}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            How UnifyOne automates your 1099 tax management
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Live earnings from every platform",
                body: "UnifyOne pulls income from DoorDash, Uber Eats, Instacart, Stripe, PayPal, and Square automatically. Your tax position updates in real time as you earn — not at year end.",
              },
              {
                step: "2",
                title: "Automatic mileage capture",
                body: "Every delivery, pickup, and active mile is captured from your platform data. UnifyOne maintains an IRS-compliant mileage log and applies the $0.70/mile deduction to your YTD tax calculation continuously.",
              },
              {
                step: "3",
                title: "Quarterly payment forecast",
                body: "Kai calculates your current SE tax liability, applies your mileage and expense deductions, and shows you exactly what to pay each quarter — before the due date, not the night before.",
              },
              {
                step: "4",
                title: "IRS-ready records",
                body: "Your mileage log, income summary, and deduction totals are available in IRS-ready format. No scrambling for records in April — everything is logged as you earn.",
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
            2026 quarterly tax due dates
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                quarter: "Q1 2026",
                due: "April 15, 2026",
                period: "Jan 1 – Mar 31",
              },
              {
                quarter: "Q2 2026",
                due: "June 15, 2026",
                period: "Apr 1 – May 31",
              },
              {
                quarter: "Q3 2026",
                due: "September 15, 2026",
                period: "Jun 1 – Aug 31",
              },
              {
                quarter: "Q4 2026",
                due: "January 15, 2027",
                period: "Sep 1 – Dec 31",
              },
            ].map(({ quarter, due, period }) => (
              <div key={quarter} className="rounded-lg border p-4">
                <p className="font-bold text-sm">{quarter}</p>
                <p className="text-primary font-semibold text-sm mt-1">{due}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{period}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            UnifyOne shows your running quarterly liability so you know your
            payment amount before each due date.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "What taxes does a 1099 gig worker have to pay?",
                a: "Self-employment tax (15.3% on 92.35% of net earnings) plus federal income tax based on your bracket. No employer withholds anything — you estimate and pay quarterly.",
              },
              {
                q: "How do I calculate quarterly estimated taxes as a gig worker?",
                a: "Net income × 0.9235 × 0.153 = SE tax. Add estimated income tax (net minus standard deduction minus half SE tax, taxed at your bracket rate). Divide total by 4. UnifyOne's tax estimator does this from your live earnings.",
              },
              {
                q: "What deductions can gig workers take on their 1099 taxes?",
                a: "IRS standard mileage ($0.70/mile in 2025), phone and data (business use %), platform fees, equipment, supplies, health insurance premiums (if self-employed), and half of SE tax. Mileage is usually the largest deduction.",
              },
              {
                q: "When are 1099 quarterly tax payments due in 2026?",
                a: "2026 due dates: Q1 — April 15, 2026; Q2 — June 15, 2026; Q3 — September 15, 2026; Q4 — January 15, 2027. Missing a payment can trigger IRS underpayment penalties even if you pay the full amount at filing. Educational information, not tax advice.",
              },
              {
                q: "How is UnifyOne different from QuickBooks Self-Employed?",
                a: "QuickBooks requires manual income entry and is built for single-platform workers. UnifyOne auto-aggregates income from all your gig platforms and calculates your quarterly tax position from live data — not numbers you type in.",
              },
              {
                q: "When will I get my 1099 from gig platforms?",
                a: "Platforms generally must send 1099-NEC or 1099-K forms by January 31 for the prior year, often posting electronic copies in your account portal around the same time. If your earnings on a platform fell below the reporting threshold you may not get a form, but you still must report the income. Educational information, not tax advice.",
              },
              {
                q: "What if my 1099 amount looks wrong?",
                a: "Reconcile it against your own payout records first — 1099-K totals often show gross volume before fees and refunds, so a high-looking number can still be right. If a real error remains, ask the issuing platform for a corrected form instead of ignoring it. UnifyOne's earnings ledger makes this easy. Educational information, not tax advice.",
              },
              {
                q: "Do I need to pay taxes quarterly as a 1099 worker?",
                a: "Generally yes — the IRS expects estimated payments if you'll owe about $1,000 or more, since no employer withholds from gig pay. Skipping the quarterly due dates can trigger underpayment penalties even if you pay in full in April. UnifyOne shows your running quarterly liability so each payment is known in advance. Educational information, not tax advice.",
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
            Authoritative IRS resources for gig workers
          </h2>
          <ul className="space-y-2">
            {[
              {
                label: "IRS: Estimated Taxes",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
              },
              {
                label:
                  "IRS: Self-Employment Tax (Social Security and Medicare)",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
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

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Related tools and guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Free Quarterly Tax Estimator",
                href: "/tools/quarterly-tax-estimator",
              },
              {
                label: "Self-Employment Tax Calculator",
                href: "/tools/se-tax-calculator",
              },
              {
                label: "Tax Set-Aside Calculator",
                href: "/tools/tax-set-aside",
              },
              {
                label: "IRS Mileage Deduction Calculator",
                href: "/tools/mileage-deduction-calculator",
              },
              {
                label: "Gig Income Aggregator",
                href: "/gig-income-aggregator",
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
            Stop guessing your quarterly tax payments
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect your gig platforms and see your live tax position. Free to
            start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get your tax estimate →
            </Link>
            <Link
              href="/tools/quarterly-tax-estimator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the free calculator
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
