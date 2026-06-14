import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";

const CANONICAL = `${SITE_URL}/tools/tax-set-aside`;

// 2025 tax constants (mirrors the Quarterly Estimator for consistency)
const SE_RATE = 0.153;
const SE_INCOME_FACTOR = 0.9235;
const STANDARD_DEDUCTION_SINGLE = 15000;
const STANDARD_DEDUCTION_MFJ = 30000;

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

const FAQS = [
  {
    q: "How much should I set aside for taxes as a 1099 gig worker?",
    a: "A common rule of thumb is 25–30% of your net income, but the right number depends on your total earnings and filing status. This calculator gives you a personalized set-aside percentage by combining your 15.3% self-employment tax with your federal income tax bracket — so you're not guessing. Most gig workers earning $20k–$60k net land between 20% and 28%.",
  },
  {
    q: "Should I set aside taxes from gross or net income?",
    a: "Set aside based on your net income — gross earnings minus deductible business expenses like mileage, phone, and supplies. The mileage deduction alone ($0.70/mile in 2025) often removes a large chunk of taxable income, which lowers how much you need to save. Track expenses all year so your set-aside is based on real net, not inflated gross.",
  },
  {
    q: "What does the set-aside percentage actually cover?",
    a: "It covers two federal taxes: self-employment tax (15.3% on 92.35% of net earnings, for Social Security and Medicare) and federal income tax (based on your bracket after the standard deduction and the deductible half of SE tax). If your state has income tax, add your state's rate on top — this tool lets you enter it.",
  },
  {
    q: "Where should I keep the money I set aside?",
    a: "Keep it in a separate high-yield savings account so it's not mixed with spending money and earns interest until you pay. Transfer your set-aside percentage every time you get paid by a platform. When quarterly estimated taxes are due (April, June, September, January), pay from that account.",
  },
  {
    q: "Is setting aside money the same as paying quarterly taxes?",
    a: "No — setting aside is the savings habit; quarterly estimated payments are when you actually send the IRS money (four times a year). Set-aside ensures you have the cash ready so quarterly payments don't hurt. Use this tool to build the habit, then use a quarterly estimator to schedule the actual payments.",
  },
  {
    q: "Does this set-aside estimate include state taxes?",
    a: "Federal SE tax and federal income tax are calculated automatically. State income tax varies widely (0% in states like Texas and Florida, up to ~13% in California), so you enter your state's approximate rate and the tool folds it into your total set-aside percentage.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "1099 Tax Set-Aside Calculator for Gig Workers",
    url: CANONICAL,
    description:
      "Find out exactly what percentage of each gig payment to set aside for taxes. Combines self-employment tax and federal income tax (plus optional state tax) into one personalized set-aside rate for 1099 and gig workers.",
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
];

interface SetAsideResult {
  net: number;
  seTax: number;
  fedIncomeTax: number;
  stateTax: number;
  totalTax: number;
  setAsidePct: number;
  monthly: number;
}

export default function TaxSetAside() {
  const [income, setIncome] = useState("");
  const [filingStatus, setFilingStatus] = useState<"single" | "mfj">("single");
  const [stateRate, setStateRate] = useState("");
  const [payment, setPayment] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const result = useMemo<SetAsideResult | null>(() => {
    const net = parseFloat(income.replace(/,/g, ""));
    if (!net || net <= 0) return null;

    const seTaxBase = net * SE_INCOME_FACTOR;
    const seTax = seTaxBase * SE_RATE;
    const deductibleSE = seTax / 2;

    const standardDed =
      filingStatus === "single"
        ? STANDARD_DEDUCTION_SINGLE
        : STANDARD_DEDUCTION_MFJ;
    const brackets = filingStatus === "single" ? BRACKETS_SINGLE : BRACKETS_MFJ;
    const agi = Math.max(0, net - deductibleSE);
    const taxableIncome = Math.max(0, agi - standardDed);
    const fedIncomeTax = calcIncomeTax(taxableIncome, brackets);

    const statePct = Math.max(0, parseFloat(stateRate.replace(/,/g, "")) || 0);
    const stateTax = net * (statePct / 100);

    const totalTax = seTax + fedIncomeTax + stateTax;
    const setAsidePct = (totalTax / net) * 100;

    return {
      net,
      seTax,
      fedIncomeTax,
      stateTax,
      totalTax,
      setAsidePct,
      monthly: totalTax / 12,
    };
  }, [income, filingStatus, stateRate]);

  function handleCalculate() {
    if (result) {
      setHasResult(true);
      trackToolUsage("tax-set-aside", "result", {
        income: result.net,
        setAsidePct: Math.round(result.setAsidePct),
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

  function fmt2(n: number) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  const paymentNum = parseFloat(payment.replace(/,/g, "")) || 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="1099 Tax Set-Aside Calculator — How Much to Save for Gig Taxes | UnifyOne"
        description="Find the exact percentage of each gig payment to set aside for taxes. Free calculator for DoorDash, Uber, and Instacart 1099 workers — SE + federal tax."
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
          <span className="text-sm font-medium">Tax Set-Aside Calculator</span>
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
            <li className="text-foreground">Tax Set-Aside Calculator</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Tax Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            1099 Tax Set-Aside Calculator
          </h1>
          <p className="text-lg text-muted-foreground">
            Don&apos;t get surprised at tax time. Find the exact{" "}
            <strong className="text-foreground">
              percentage of every gig payment
            </strong>{" "}
            you should move to savings — covering self-employment tax, federal
            income tax, and your state.
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
                Expected net self-employment income (annual)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  id="income"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 42000"
                  value={income}
                  onChange={e => {
                    setIncome(e.target.value);
                    setHasResult(false);
                    if (e.target.value)
                      trackToolUsage("tax-set-aside", "start");
                  }}
                  className="w-full rounded-md border bg-background pl-7 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Gross gig earnings minus deductible expenses (mileage, phone,
                supplies). Not sure? Use your gross and treat the result as a
                ceiling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Filing status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilingStatus("single");
                      setHasResult(false);
                    }}
                    className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      filingStatus === "single"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilingStatus("mfj");
                      setHasResult(false);
                    }}
                    className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      filingStatus === "mfj"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    Married (joint)
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="stateRate"
                >
                  State income tax rate{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="stateRate"
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 5"
                    value={stateRate}
                    onChange={e => {
                      setStateRate(e.target.value);
                      setHasResult(false);
                    }}
                    className="w-full rounded-md border bg-background px-4 py-2.5 pr-8 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  0 for TX, FL, WA, etc.
                </p>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              disabled={!result}
              className="w-full rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Calculate my set-aside
            </button>

            {hasResult && result && (
              <div className="rounded-lg bg-muted/50 p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Headline */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Set aside this much of every payment
                  </p>
                  <p className="text-5xl font-bold text-primary">
                    {result.setAsidePct.toFixed(0)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    That&apos;s {fmt2(result.setAsidePct)} for every $100 you
                    earn
                  </p>
                </div>

                {/* Payment helper */}
                <div className="border-t pt-4">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
                    htmlFor="payment"
                  >
                    For a specific payment
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <input
                        id="payment"
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g. 250"
                        value={payment}
                        onChange={e => setPayment(e.target.value)}
                        className="w-full rounded-md border bg-background pl-7 pr-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <span className="text-muted-foreground">→ save</span>
                    <span className="text-lg font-bold min-w-[5rem] text-right">
                      {fmt2((paymentNum * result.setAsidePct) / 100)}
                    </span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    What you&apos;re saving for (annual)
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Self-employment tax
                      </span>
                      <span className="font-medium">{fmt(result.seTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Federal income tax
                      </span>
                      <span className="font-medium">
                        {fmt(result.fedIncomeTax)}
                      </span>
                    </div>
                    {result.stateTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          State income tax
                        </span>
                        <span className="font-medium">
                          {fmt(result.stateTax)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total to set aside / year</span>
                      <span>{fmt(result.totalTax)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>≈ per month</span>
                      <span>{fmt(result.monthly)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Estimate for planning only. Your actual tax depends on
                    credits, other income, and deductions. Consult a tax
                    professional for your situation.
                  </p>
                </div>

                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    UnifyOne tracks your gig earnings year-round and keeps your
                    set-aside number current as you earn.
                  </p>
                  <Link
                    href="/register"
                    onClick={() =>
                      trackToolUsage("tax-set-aside", "signup_cta")
                    }
                    className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Auto-track my set-aside →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Context */}
        <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <h2>Why a set-aside percentage beats a flat rule of thumb</h2>
          <p>
            &ldquo;Save 30% for taxes&rdquo; is the advice you&apos;ll hear most
            — but it&apos;s often wrong in both directions. A driver netting
            $25,000 single doesn&apos;t owe anywhere near 30%; someone netting
            $90,000 in a high-tax state may owe more. Saving too much starves
            your cash flow; saving too little means a painful April. Your real
            number comes from <strong>your</strong> income and filing status.
          </p>

          <h2>How the set-aside is calculated</h2>
          <ul>
            <li>
              <strong>Self-employment tax:</strong> 15.3% on 92.35% of your net
              income (Social Security + Medicare).
            </li>
            <li>
              <strong>Federal income tax:</strong> your bracket applied to net
              income after the standard deduction and the deductible half of SE
              tax.
            </li>
            <li>
              <strong>State income tax:</strong> your state&apos;s rate, if any,
              added on top.
            </li>
          </ul>
          <p>
            Add those up, divide by your income, and you get the percentage to
            move to savings from every payout.
          </p>

          <h2>Make it a habit</h2>
          <p>
            The workers who never panic at tax time do one thing: every time a
            platform pays them, they immediately transfer their set-aside
            percentage into a separate savings account. When quarterly taxes are
            due, the money is already there. Pair this with the{" "}
            <a href="/tools/quarterly-tax-estimator">Quarterly Tax Estimator</a>{" "}
            to schedule the actual payments, and the{" "}
            <a href="/tools/mileage-deduction-calculator">
              Mileage Deduction Calculator
            </a>{" "}
            to lower the net income this is based on.
          </p>
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
            Never be surprised by a tax bill again
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your earnings across every gig platform, keeps your
            set-aside number accurate in real time, and reminds you before each
            quarterly deadline. Free to start.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start tracking for free →
          </Link>
        </section>
      </main>
    </div>
  );
}
