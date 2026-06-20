import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";

const CANONICAL = `${SITE_URL}/tools/quarterly-tax-estimator`;

// 2025 tax constants
const SE_RATE = 0.153;
const SE_INCOME_FACTOR = 0.9235;
const STANDARD_DEDUCTION_SINGLE = 15000;
const STANDARD_DEDUCTION_MFJ = 30000;

// 2025 federal income tax brackets
const BRACKETS_SINGLE = [
  { min: 0, max: 11925, rate: 0.1 },
  { min: 11925, max: 48475, rate: 0.12 },
  { min: 48475, max: 103350, rate: 0.22 },
  { min: 103350, max: 197300, rate: 0.24 },
  { min: 197300, max: 250525, rate: 0.32 },
  { min: 250525, max: 626350, rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

const BRACKETS_MFJ = [
  { min: 0, max: 23850, rate: 0.1 },
  { min: 23850, max: 96950, rate: 0.12 },
  { min: 96950, max: 206700, rate: 0.22 },
  { min: 206700, max: 394600, rate: 0.24 },
  { min: 394600, max: 501050, rate: 0.32 },
  { min: 501050, max: 751600, rate: 0.35 },
  { min: 751600, max: Infinity, rate: 0.37 },
];

// 2026 due dates
const DUE_DATES = [
  "April 15, 2026",
  "June 15, 2026",
  "September 15, 2026",
  "January 15, 2027",
];

function calcIncomeTax(
  taxableIncome: number,
  brackets: typeof BRACKETS_SINGLE
): number {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= b.min) break;
    const taxable = Math.min(taxableIncome, b.max) - b.min;
    tax += taxable * b.rate;
  }
  return Math.max(0, tax);
}

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Quarterly Estimated Tax Calculator for 1099 Self-Employed Workers",
    url: CANONICAL,
    description:
      "Free quarterly estimated tax calculator for 1099 freelancers, gig workers, and self-employed contractors. Calculates SE tax + federal income tax and shows all four quarterly payment amounts with due dates.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: {
      "@type": "Organization",
      name: "1Commerce / UnifyOne",
      url: SITE_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Who needs to pay quarterly estimated taxes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You must pay quarterly estimated taxes if you expect to owe at least $1,000 in federal taxes for the year and your withholding won't cover your liability. This applies to freelancers, gig workers (DoorDash, Uber, Instacart), independent contractors, and anyone with 1099 income.",
        },
      },
      {
        "@type": "Question",
        name: "When are the 2026 quarterly estimated tax due dates?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The 2026 quarterly estimated tax due dates are: Q1 — April 15, 2026; Q2 — June 15, 2026; Q3 — September 15, 2026; Q4 — January 15, 2027.",
        },
      },
      {
        "@type": "Question",
        name: "What is self-employment (SE) tax?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare) on 92.35% of your net self-employment income. As a 1099 worker, you pay both the employer and employee portions. You can deduct half of SE tax from your adjusted gross income.",
        },
      },
      {
        "@type": "Question",
        name: "What happens if I miss a quarterly payment?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The IRS charges an underpayment penalty if you miss a quarterly payment or pay too little. The penalty is calculated on the underpaid amount for each quarter. You can avoid penalties by paying at least 100% of last year's tax liability (110% if your prior year AGI exceeded $150,000) or 90% of this year's expected liability.",
        },
      },
      {
        "@type": "Question",
        name: "Does this calculator include state taxes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This calculator covers federal self-employment tax and federal income tax only. Most states with income tax also require quarterly estimated payments. Check your state's tax authority for state-specific rates and deadlines.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use the Quarterly Estimated Tax Calculator",
    description:
      "Estimate your federal self-employment and income tax and split it into four quarterly estimated payments with their 2026 due dates.",
    totalTime: "PT2M",
    tool: [{ "@type": "HowToTool", name: "Quarterly Tax Estimator" }],
    supply: [
      {
        "@type": "HowToSupply",
        name: "Estimated annual net self-employment income",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Enter your net self-employment income",
        text: "Type your estimated annual net income after business expenses (not gross platform earnings) into the income field.",
      },
      {
        "@type": "HowToStep",
        name: "Add your business miles (optional)",
        text: "Optionally enter the business miles you expect to drive. The tool applies the 2025 IRS rate of $0.70 per mile to reduce your taxable income.",
      },
      {
        "@type": "HowToStep",
        name: "Choose your filing status",
        text: "Select either Single / Head of Household or Married Filing Jointly so the correct standard deduction and federal brackets are applied.",
      },
      {
        "@type": "HowToStep",
        name: "Calculate your quarterly payments",
        text: "Click 'Calculate quarterly payments' to see your self-employment tax, federal income tax, total annual tax, and the four equal quarterly payment amounts due April 15, June 16, September 15, 2026, and January 15, 2027.",
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Free Tools",
        item: `${SITE_URL}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Quarterly Tax Estimator",
        item: CANONICAL,
      },
    ],
  },
];

export default function QuarterlyTaxEstimator() {
  const [income, setIncome] = useState("");
  const [mileage, setMileage] = useState("");
  const [filingStatus, setFilingStatus] = useState<"single" | "mfj">("single");
  const [hasResult, setHasResult] = useState(false);

  const result = useMemo(() => {
    const net = parseFloat(income.replace(/,/g, ""));
    if (!net || net <= 0) return null;

    const mileDeduction = (parseFloat(mileage.replace(/,/g, "")) || 0) * 0.7;
    const netAfterMileage = Math.max(0, net - mileDeduction);

    const seTaxBase = netAfterMileage * SE_INCOME_FACTOR;
    const seTax = seTaxBase * SE_RATE;
    const deductibleSE = seTax / 2;

    const standardDed =
      filingStatus === "single"
        ? STANDARD_DEDUCTION_SINGLE
        : STANDARD_DEDUCTION_MFJ;
    const brackets = filingStatus === "single" ? BRACKETS_SINGLE : BRACKETS_MFJ;
    const agi = Math.max(0, netAfterMileage - deductibleSE);
    const taxableIncome = Math.max(0, agi - standardDed);
    const incomeTax = calcIncomeTax(taxableIncome, brackets);

    const totalTax = seTax + incomeTax;
    const quarterlyPayment = totalTax / 4;
    const effectiveRate = (totalTax / net) * 100;

    return {
      netIncome: net,
      mileDeduction,
      netAfterMileage,
      seTax,
      incomeTax,
      totalTax,
      quarterlyPayment,
      effectiveRate,
    };
  }, [income, mileage, filingStatus]);

  function fmt(n: number) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Quarterly Estimated Tax Calculator — 1099 Self-Employed | UnifyOne"
        description="Free 1099 quarterly tax calculator for gig workers. See your SE tax + income tax and exact quarterly payment amounts with 2026 due dates."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Free Tools
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium">Quarterly Tax Estimator</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-muted-foreground">
            <li>
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                Home
              </Link>
            </li>
            <li>›</li>
            <li>
              <Link
                href="/tools"
                className="hover:text-foreground transition-colors"
              >
                Free Tools
              </Link>
            </li>
            <li>›</li>
            <li className="text-foreground">Quarterly Tax Estimator</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Tax Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Quarterly Estimated Tax Estimator
          </h1>
          <p className="text-lg text-muted-foreground">
            As a 1099 worker, you pay taxes yourself — four times per year. This
            calculator shows your exact quarterly payment amounts so you're
            never caught short before an IRS deadline.
          </p>
        </header>

        {/* Calculator */}
        <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10">
          <div className="space-y-5">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="income"
              >
                Net self-employment income (annual estimate)
              </label>
              <input
                id="income"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 45000"
                value={income}
                onChange={e => {
                  setIncome(e.target.value);
                  setHasResult(false);
                  if (e.target.value)
                    trackToolUsage("quarterly-tax-estimator", "start");
                }}
                className="w-full rounded-md border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Net income after business expenses (not gross platform
                earnings).
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="mileage"
              >
                Business miles driven (optional — reduces taxable income)
              </label>
              <input
                id="mileage"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 12000"
                value={mileage}
                onChange={e => {
                  setMileage(e.target.value);
                  setHasResult(false);
                }}
                className="w-full rounded-md border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                IRS rate: $0.70/mile (2025)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Filing status
              </label>
              <div className="flex gap-3">
                {(["single", "mfj"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setFilingStatus(s);
                      setHasResult(false);
                    }}
                    className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                      filingStatus === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {s === "single"
                      ? "Single / Head of Household"
                      : "Married Filing Jointly"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setHasResult(true);
                if (result)
                  trackToolUsage("quarterly-tax-estimator", "result", {
                    income: result.netIncome,
                  });
              }}
              disabled={!result}
              className="w-full rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Calculate quarterly payments
            </button>

            {hasResult && result && (
              <div className="rounded-lg bg-muted/50 p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Quarterly payments */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    2026 quarterly payments
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {DUE_DATES.map((date, i) => (
                      <div
                        key={date}
                        className="rounded-md bg-background border p-3 text-center"
                      >
                        <p className="text-xs text-muted-foreground">
                          Q{i + 1} — Due
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {date}
                        </p>
                        <p className="text-xl font-bold text-primary">
                          {fmt(result.quarterlyPayment)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Breakdown */}
                <div className="border-t pt-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Breakdown
                  </p>
                  {result.mileDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Mileage deduction
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        −{fmt(result.mileDeduction)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Self-employment tax (15.3%)
                    </span>
                    <span className="font-medium">{fmt(result.seTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Federal income tax
                    </span>
                    <span className="font-medium">{fmt(result.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total annual tax</span>
                    <span>{fmt(result.totalTax)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Effective rate</span>
                    <span>
                      {result.effectiveRate.toFixed(1)}% of gross income
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Get automatic quarterly reminders and real-time tax position
                    tracking across all your platforms.
                  </p>
                  <Link
                    href="/register"
                    onClick={() =>
                      trackToolUsage("quarterly-tax-estimator", "signup_cta")
                    }
                    className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Track taxes automatically →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Context */}
        <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <h2>How quarterly estimated taxes work for 1099 workers</h2>
          <p>
            When you work as an employee, your employer withholds federal income
            tax and FICA taxes from every paycheck. As a 1099 worker — DoorDash
            driver, freelancer, independent contractor — nobody withholds for
            you. You're responsible for estimating your annual tax liability and
            sending the IRS four payments per year.
          </p>
          <p>
            Miss a payment or underpay by more than the safe-harbor threshold
            and the IRS charges a quarterly underpayment penalty on top of what
            you owe. The safe harbor: pay at least 100% of last year's tax
            liability (110% if your prior-year AGI exceeded $150,000) or 90% of
            this year's expected liability.
          </p>

          <h2>Self-employment tax explained</h2>
          <p>
            The biggest surprise for new gig workers:{" "}
            <strong>self-employment tax of 15.3%</strong>. This covers both the
            employer (7.65%) and employee (7.65%) portions of Social Security
            and Medicare. Employees only pay the employee half — their employer
            pays the other half. As a 1099 worker, you pay both. It's calculated
            on 92.35% of your net SE income, and you can deduct half of it from
            your adjusted gross income.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Who needs to pay quarterly estimated taxes?",
                a: "You must pay quarterly estimated taxes if you expect to owe at least $1,000 in federal taxes and your withholding won't cover your liability. This applies to all 1099 gig workers including DoorDash, Uber Eats, and Instacart drivers.",
              },
              {
                q: "When are the 2026 quarterly tax due dates?",
                a: "Q1: April 15, 2026 · Q2: June 15, 2026 · Q3: September 15, 2026 · Q4: January 15, 2027.",
              },
              {
                q: "What is self-employment tax?",
                a: "Self-employment tax is 15.3% on 92.35% of your net SE income. It covers both the employer and employee portions of Social Security and Medicare. You can deduct half of SE tax from your gross income, which reduces your federal income tax.",
              },
              {
                q: "Does this calculator include state taxes?",
                a: "No — this covers federal SE tax and federal income tax only. Most states require separate quarterly payments. Check your state tax authority for state-specific rates and deadlines.",
              },
              {
                q: "How does UnifyOne help with quarterly taxes?",
                a: "UnifyOne tracks your income across all connected gig platforms in real time and generates quarterly payment alerts before each deadline. Your current tax position is always visible in the dashboard — not just at year end.",
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

        {/* IRS Resources */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Authoritative IRS resources
          </h2>
          <ul className="space-y-2">
            {[
              {
                label: "IRS: Estimated Taxes for Individuals",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
              },
              {
                label: "IRS: Self-Employment Tax (SE Tax)",
                href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
              },
              {
                label: "IRS: Standard Mileage Rates",
                href: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
              },
              {
                label: "IRS Form 1040-ES",
                href: "https://www.irs.gov/forms-pubs/about-form-1040-es",
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

        {/* Related Tools */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Related free tools</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Tax Set-Aside Calculator",
                href: "/tools/tax-set-aside",
              },
              {
                label: "Mileage Deduction Calculator",
                href: "/tools/mileage-deduction-calculator",
              },
              {
                label: "Gig Income Aggregator",
                href: "/gig-income-aggregator",
              },
              {
                label: "1099 Tax Management Guide",
                href: "/1099-tax-management",
              },
              {
                label: "Financial Intelligence for Gig Workers",
                href: "/financial-intelligence-gig-workers",
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

        {/* CTA */}
        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            Never miss a quarterly payment
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne monitors your income across every platform and sends
            quarterly tax reminders before each deadline. Free to start.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start for free →
          </Link>
        </section>
      </main>
    </div>
  );
}
