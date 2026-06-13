import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";

const CANONICAL = `${SITE_URL}/tools/mileage-deduction-calculator`;

// IRS standard mileage rates 2025
const IRS_BUSINESS_RATE = 0.7;

const TAX_BRACKETS: Array<{ label: string; rate: number }> = [
  { label: "22%", rate: 0.22 },
  { label: "24%", rate: 0.24 },
  { label: "32%", rate: 0.32 },
  { label: "35%", rate: 0.35 },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "IRS Mileage Deduction Calculator for Gig Workers",
    url: CANONICAL,
    description:
      "Calculate your IRS standard mileage deduction for 1099 gig work. Enter miles driven to see your total deduction and estimated tax savings at multiple brackets.",
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
        name: "What is the IRS standard mileage rate for 2025?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The IRS standard mileage rate for business use in 2025 is 70 cents ($0.70) per mile. This applies to rideshare drivers, delivery workers, and all 1099 self-employed workers using their vehicle for business.",
        },
      },
      {
        "@type": "Question",
        name: "Can DoorDash, Uber, and Instacart drivers deduct mileage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Any miles driven for gig work — picking up orders, driving to customers, and deadhead miles between deliveries — qualify for the IRS standard mileage deduction. You must keep a log of dates, destinations, and miles driven.",
        },
      },
      {
        "@type": "Question",
        name: "Do I use actual expenses or standard mileage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most gig workers use the standard mileage rate because it's simpler and often yields a larger deduction. You cannot switch between methods mid-year for the same vehicle. The standard rate covers fuel, depreciation, oil, tires, and most vehicle costs.",
        },
      },
      {
        "@type": "Question",
        name: "What counts as a deductible mile for gig workers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Deductible miles include driving from your first delivery pickup to your last dropoff (including driving between deliveries while actively working), driving to a required orientation or meeting, and driving to pick up supplies. Commuting from home to your first pickup does not qualify.",
        },
      },
      {
        "@type": "Question",
        name: "How do I track mileage for taxes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The IRS requires a contemporaneous log — date, destination, business purpose, and miles. UnifyOne automatically captures mileage from your connected gig platform data and maintains a running YTD deduction total.",
        },
      },
    ],
  },
];

export default function MileageCalculator() {
  const [miles, setMiles] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const deduction = useMemo(() => {
    const m = parseFloat(miles.replace(/,/g, ""));
    if (!m || m <= 0) return null;
    const total = m * IRS_BUSINESS_RATE;
    return {
      miles: m,
      deduction: total,
      savings: TAX_BRACKETS.map(b => ({
        label: b.label,
        amount: total * b.rate,
      })),
    };
  }, [miles]);

  function handleCalculate() {
    if (deduction) {
      setHasResult(true);
      trackToolUsage("mileage-deduction-calculator", "result", {
        miles: deduction.miles,
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="IRS Mileage Deduction Calculator for Gig Workers 2025 | UnifyOne"
        description="Free IRS mileage deduction calculator for DoorDash, Uber, Instacart, and 1099 gig workers. Enter your miles to see your total deduction and tax savings at the 2025 rate of $0.70/mile."
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
          <span className="text-sm font-medium">
            Mileage Deduction Calculator
          </span>
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
            <li className="text-foreground">Mileage Calculator</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Tax Management
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            IRS Mileage Deduction Calculator
          </h1>
          <p className="text-lg text-muted-foreground">
            At the 2025 IRS standard mileage rate of{" "}
            <strong className="text-foreground">$0.70/mile</strong>, every mile
            you drive for DoorDash, Uber, Instacart, or any gig platform is a
            real tax deduction. Enter your miles to see exactly what you've
            earned.
          </p>
        </header>

        {/* Calculator */}
        <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="miles">
                Business miles driven this year
              </label>
              <div className="flex gap-3">
                <input
                  id="miles"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 12000"
                  value={miles}
                  onChange={e => {
                    setMiles(e.target.value);
                    setHasResult(false);
                    if (e.target.value)
                      trackToolUsage("mileage-deduction-calculator", "start");
                  }}
                  className="flex-1 rounded-md border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleCalculate}
                  disabled={!deduction}
                  className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  Calculate
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                IRS rate: $0.70/mile (2025 business use). Does not include
                medical or charity miles.
              </p>
            </div>

            {hasResult && deduction && (
              <div className="rounded-lg bg-muted/50 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total IRS mileage deduction
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    {fmt(deduction.deduction)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {deduction.miles.toLocaleString()} miles × $0.70
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Estimated tax savings by bracket
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {deduction.savings.map(s => (
                      <div
                        key={s.label}
                        className="rounded-md bg-background border p-3 text-center"
                      >
                        <p className="text-xs text-muted-foreground">
                          {s.label} bracket
                        </p>
                        <p className="text-lg font-bold mt-1">
                          {fmt(s.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Estimated savings = deduction × your marginal tax rate.
                    Actual savings depend on your total income and deductions.
                    Consult a tax professional for your specific situation.
                  </p>
                </div>

                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Save this result and track mileage automatically across all
                    your gig platforms.
                  </p>
                  <Link
                    href="/register"
                    onClick={() =>
                      trackToolUsage(
                        "mileage-deduction-calculator",
                        "signup_cta"
                      )
                    }
                    className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Track mileage automatically →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Context */}
        <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <h2>Why mileage deductions matter for gig workers</h2>
          <p>
            At $0.70/mile, a gig worker who drives 15,000 miles per year has a{" "}
            <strong>$10,500 deduction</strong> — before any other business
            expenses. At a 22% marginal rate, that's $2,310 back. At 24%, it's
            $2,520.
          </p>
          <p>
            The catch: you must keep a contemporaneous log. The IRS requires the
            date, destination, business purpose, and mileage for every trip.
            Most gig workers who get audited lose deductions not because they
            didn't drive — but because they can't prove it.
          </p>
          <p>
            UnifyOne connects to your gig platform accounts and automatically
            reconstructs your mileage log from your shift data. Every delivery,
            every pickup, every active mile — logged and totaled in real time.
          </p>

          <h2>Standard mileage vs. actual expenses</h2>
          <p>
            You can deduct vehicle costs one of two ways: the IRS standard
            mileage rate ($0.70/mile in 2025) or your actual vehicle expenses
            (fuel, oil, tires, insurance, depreciation). You choose your method
            when you file for a vehicle the first year. Most gig workers benefit
            from the standard rate because it's simpler and doesn't require
            tracking every fuel receipt.
          </p>

          <h2>What counts as a deductible mile</h2>
          <ul>
            <li>
              Miles from your first pickup to your last drop-off (including
              between deliveries while actively working)
            </li>
            <li>
              Miles driving to required orientations, meetings, or training
            </li>
            <li>Miles to pick up supplies for your gig business</li>
          </ul>
          <p>
            <strong>Does not count:</strong> commuting from home to your first
            pickup. Once you accept your first order, you're in business use.
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
                q: "What is the IRS standard mileage rate for 2025?",
                a: "The IRS standard mileage rate for business use in 2025 is $0.70 per mile. This applies to rideshare drivers, delivery workers, and all 1099 self-employed workers using their vehicle for business.",
              },
              {
                q: "Can DoorDash, Uber, and Instacart drivers deduct mileage?",
                a: "Yes. Any miles driven for gig work — picking up orders, driving to customers, and miles between deliveries while actively working — qualify for the IRS standard mileage deduction.",
              },
              {
                q: "Do I use actual expenses or standard mileage?",
                a: "Most gig workers use the standard mileage rate because it's simpler and often yields a larger deduction. The standard rate covers fuel, depreciation, oil, tires, and most vehicle costs.",
              },
              {
                q: "What happens if I don't track my mileage?",
                a: "Without a contemporaneous log, the IRS can disallow your mileage deduction entirely during an audit, even if you actually drove those miles. Keep a record of date, destination, and purpose for every business trip.",
              },
              {
                q: "How does UnifyOne track mileage automatically?",
                a: "UnifyOne connects to your DoorDash, Uber Eats, Instacart, and other gig platform accounts and reconstructs your mileage log from your shift data. Every delivery and active mile is captured and totaled automatically.",
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

        {/* CTA */}
        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            Never miss a deductible mile again
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect your gig platforms to UnifyOne and get automatic mileage
            tracking, quarterly tax estimates, and a unified earnings dashboard.
            Free to start.
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
