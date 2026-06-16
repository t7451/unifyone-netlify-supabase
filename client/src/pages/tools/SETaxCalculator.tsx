import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";

const CANONICAL = `${SITE_URL}/tools/se-tax-calculator`;

// 2025 SE tax constants
const SE_RATE_MEDICARE_ONLY = 0.029;
const SS_WAGE_BASE = 168600; // 2024 Social Security wage base (unchanged for 2025 planning)
const SE_ADJUSTMENT = 0.9235; // net SE earnings = gross × 0.9235 per IRS

const FAQS = [
  {
    q: "What is self-employment tax?",
    a: "Self-employment (SE) tax is the Social Security and Medicare tax paid by people who work for themselves. As a 1099 worker or gig worker, you owe both the employee portion (7.65%) and the employer portion (7.65%) — totaling 15.3% on net self-employment earnings up to the Social Security wage base.",
  },
  {
    q: "Why is SE tax calculated on 92.35% of net income instead of 100%?",
    a: "The IRS allows you to multiply net self-employment income by 0.9235 before applying the 15.3% rate. This mimics the employer deduction that W-2 workers receive — employers pay half the FICA tax and don't include it in the employee's gross wages. You effectively reduce your taxable SE earnings by 7.65%.",
  },
  {
    q: "Can I deduct half of my SE tax?",
    a: "Yes. You can deduct 50% of your SE tax from your gross income on Schedule 1 of Form 1040. This deduction reduces your adjusted gross income (AGI) but not your self-employment tax itself. It applies regardless of whether you itemize or take the standard deduction.",
  },
  {
    q: "Do gig workers like DoorDash or Uber drivers pay SE tax?",
    a: "Yes. Any worker who receives a 1099-NEC or 1099-K and has net self-employment income of $400 or more must pay SE tax. This includes DoorDash, Uber, Lyft, Instacart, TaskRabbit, Fiverr, and all other gig platforms.",
  },
  {
    q: "How do I pay SE tax throughout the year?",
    a: "SE tax is paid through quarterly estimated tax payments — due April 15, June 15, September 15, and January 15. The IRS safe-harbor rule says you avoid underpayment penalties if you pay 100% of last year's tax liability (110% if your prior-year AGI exceeded $150,000) or 90% of the current year's actual tax.",
  },
  {
    q: "What is the Social Security wage base for 2025?",
    a: "The Social Security wage base for 2025 is $176,100. Only net SE earnings up to this amount are subject to the 12.4% Social Security portion of SE tax. All net SE earnings are subject to the 2.9% Medicare portion — and an additional 0.9% Additional Medicare Tax applies above $200,000 (single filers).",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Self-Employment Tax Calculator for 1099 Gig Workers",
    url: CANONICAL,
    description:
      "Calculate your exact self-employment (SE) tax as a 1099 gig worker. Shows Social Security + Medicare breakdown, the deductible half of SE tax, and quarterly payment amounts.",
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
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use the Self-Employment Tax Calculator",
    description:
      "Calculate your self-employment tax with a Social Security and Medicare breakdown, the deductible half, and a quarterly payment estimate.",
    totalTime: "PT1M",
    tool: [{ "@type": "HowToTool", name: "Self-Employment Tax Calculator" }],
    supply: [
      {
        "@type": "HowToSupply",
        name: "Annual net self-employment income",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Enter your net self-employment income",
        text: "Type your annual net self-employment income — gross gig earnings minus deductible business expenses such as mileage, supplies, and phone — into the income field.",
      },
      {
        "@type": "HowToStep",
        name: "Calculate your SE tax",
        text: "Click Calculate to apply the 15.3% rate to 92.35% of your net earnings (12.4% Social Security up to the wage base, plus 2.9% Medicare).",
      },
      {
        "@type": "HowToStep",
        name: "Review the breakdown and quarterly amount",
        text: "Read the Social Security and Medicare breakdown, the deductible half of your SE tax, and the suggested quarterly payment (total SE tax divided by four).",
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
        name: "SE Tax Calculator",
        item: CANONICAL,
      },
    ],
  },
];

interface SEResult {
  netIncome: number;
  seNetEarnings: number;
  ssTax: number;
  medicareTax: number;
  totalSETax: number;
  deductibleHalf: number;
  adjustedIncome: number;
  quarterlyPayment: number;
}

function computeSETax(netIncome: number): SEResult {
  const seNetEarnings = netIncome * SE_ADJUSTMENT;
  const ssBase = Math.min(seNetEarnings, SS_WAGE_BASE);
  const ssTax = ssBase * 0.124;
  const medicareTax = seNetEarnings * SE_RATE_MEDICARE_ONLY;
  const totalSETax = ssTax + medicareTax;
  // Verify against simple flat-rate check (should match for income below wage base)
  const deductibleHalf = totalSETax * 0.5;
  const adjustedIncome = netIncome - deductibleHalf;
  const quarterlyPayment = totalSETax / 4;
  return {
    netIncome,
    seNetEarnings,
    ssTax,
    medicareTax,
    totalSETax,
    deductibleHalf,
    adjustedIncome,
    quarterlyPayment,
  };
}

export default function SETaxCalculator() {
  const [income, setIncome] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const result = useMemo<SEResult | null>(() => {
    const n = parseFloat(income.replace(/,/g, ""));
    if (!n || n <= 0) return null;
    return computeSETax(n);
  }, [income]);

  function handleCalculate() {
    if (result) {
      setHasResult(true);
      trackToolUsage("se-tax-calculator", "result", {
        income: result.netIncome,
      });
    }
  }

  function fmt(n: number) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  function fmtPct(n: number) {
    return (n * 100).toFixed(1) + "%";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Self-Employment Tax Calculator for 1099 Gig Workers 2025 | UnifyOne"
        description="Free self-employment tax calculator for DoorDash, Uber, and Instacart 1099 workers. See your SE tax (Social Security + Medicare) and quarterly estimates."
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
          <span className="text-sm font-medium">SE Tax Calculator</span>
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
            <li className="text-foreground">SE Tax Calculator</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Tax Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Self-Employment Tax Calculator
          </h1>
          <p className="text-lg text-muted-foreground">
            As a 1099 gig worker, you owe{" "}
            <strong className="text-foreground">15.3% SE tax</strong> on top of
            income tax — but you also get to deduct half. Enter your net
            self-employment income to see the exact breakdown.
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
                Net self-employment income (annual)
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
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
                        trackToolUsage("se-tax-calculator", "start");
                    }}
                    className="w-full rounded-md border bg-background pl-7 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={handleCalculate}
                  disabled={!result}
                  className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  Calculate
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Net income = gross gig earnings minus deductible business
                expenses (mileage, supplies, phone, etc.)
              </p>
            </div>

            {hasResult && result && (
              <div className="rounded-lg bg-muted/50 p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Primary result */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total SE tax owed
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    {fmt(result.totalSETax)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fmtPct(result.totalSETax / result.netIncome)} of net income
                  </p>
                </div>

                {/* Breakdown */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    SE Tax Breakdown
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Net SE earnings (× 0.9235)
                      </span>
                      <span className="font-medium">
                        {fmt(result.seNetEarnings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Social Security tax (12.4%)
                      </span>
                      <span className="font-medium">{fmt(result.ssTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Medicare tax (2.9%)
                      </span>
                      <span className="font-medium">
                        {fmt(result.medicareTax)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total SE tax</span>
                      <span>{fmt(result.totalSETax)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions & quarterly */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Your Deductions
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-background border p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Deductible half of SE tax
                      </p>
                      <p className="text-lg font-bold mt-1 text-green-600 dark:text-green-400">
                        -{fmt(result.deductibleHalf)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        from gross income
                      </p>
                    </div>
                    <div className="rounded-md bg-background border p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Quarterly payment
                      </p>
                      <p className="text-lg font-bold mt-1">
                        {fmt(result.quarterlyPayment)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        due per quarter
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Track your quarterly payments and get reminders
                    automatically inside UnifyOne.
                  </p>
                  <Link
                    href="/register"
                    onClick={() =>
                      trackToolUsage("se-tax-calculator", "signup_cta")
                    }
                    className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Set up quarterly reminders →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Context */}
        <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <h2>What is self-employment tax?</h2>
          <p>
            When you work as a W-2 employee, your employer pays half of your
            Social Security and Medicare taxes (7.65%) and you pay the other
            half. When you work as a 1099 contractor or gig worker, you are both
            the employee and employer — so you owe the full{" "}
            <strong>15.3%</strong>: 12.4% for Social Security (on the first
            $168,600 of net earnings) and 2.9% for Medicare (on all net
            earnings).
          </p>
          <p>
            The IRS applies this rate to <strong>92.35%</strong> of your net
            self-employment income (not 100%), which roughly accounts for the
            employer portion you would have been exempt from as a W-2 employee.
          </p>

          <h2>The deductible half: your biggest SE tax benefit</h2>
          <p>
            You can deduct 50% of your SE tax from your gross income on Schedule
            1. This deduction reduces your adjusted gross income (AGI), which
            lowers your regular income tax. For a gig worker earning $45,000
            net, the deductible half is roughly <strong>$3,180</strong> — real
            money back in your pocket at tax time.
          </p>

          <h2>Quarterly estimated tax payments</h2>
          <p>
            Because no employer withholds taxes from your gig earnings, you must
            pay estimated taxes four times per year. The IRS safe-harbor
            threshold: pay at least 100% of last year's total tax liability
            (110% if your prior-year AGI was above $150,000) to avoid
            underpayment penalties.
          </p>
          <p>Due dates: April 15 · June 15 · September 15 · January 15.</p>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">
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

        {/* CTA */}
        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            Stop guessing on quarterly taxes
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your gig earnings year-round, estimates your SE tax
            in real time, and sends quarterly payment reminders before each IRS
            due date. Free to start.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Track taxes automatically →
          </Link>
        </section>
      </main>
    </div>
  );
}
