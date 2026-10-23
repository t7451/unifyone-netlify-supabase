import { earningsAfterExpenses } from "@shared/publicTax2025";
import ReadingLayout from "@/components/ReadingLayout";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";
import { formatUsd0, formatUsd2 } from "@/lib/format";

const CANONICAL = `${SITE_URL}/tools/gig-hourly-rate`;

// IRS standard mileage rate 2025
const IRS_MILEAGE_RATE = 0.7;

const PLATFORM_DEFAULTS = [
  { name: "DoorDash", feeRate: 0 },
  { name: "Uber Eats", feeRate: 0 },
  { name: "Instacart", feeRate: 0 },
  { name: "Grubhub", feeRate: 0 },
  { name: "Other", feeRate: 0 },
];

const FAQS = [
  {
    q: "Why can a payout look different from an hourly rate?",
    a: "The time and expenses behind a payout matter. This calculator subtracts a 2025 mileage-allowance proxy from the earnings you enter, then divides by all the hours you record, including waiting time. It does not estimate your taxes.",
  },
  {
    q: "How is the hourly rate calculated?",
    a: "The estimate is (entered earnings minus miles multiplied by $0.70) divided by recorded hours. Enter figures for the same period. Platform fees are not entered separately, so use earnings figures on a consistent basis when comparing apps.",
  },
  {
    q: "Which miles should I enter?",
    a: "Enter the miles attributable to the work period you are comparing. Whether a trip qualifies for a tax deduction is a separate question; commuting and personal trips have different rules. Check IRS Publication 463 for your circumstances.",
  },
  {
    q: "Does the mileage allowance equal my actual costs?",
    a: "No. The 2025 IRS mileage allowance is used here as a simple comparison proxy. Your actual fuel, maintenance, insurance, and depreciation costs can be higher or lower. There is no separate fuel-cost input in this tool.",
  },
  {
    q: "Can a result be negative?",
    a: "Yes. If the mileage proxy exceeds the earnings entered, the calculator shows a loss. That is useful information when comparing the work, rather than treating the loss as zero.",
  },
  {
    q: "Can I compare different platforms?",
    a: "Yes. Use the same time period and consistent earnings definitions for each platform. Results describe the records you enter; they do not predict future pay or guarantee that one platform will be more profitable.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Gig Worker Real Hourly Rate Calculator",
    url: CANONICAL,
    description:
      "Calculate your true effective hourly rate from DoorDash, Uber Eats, Instacart, and other gig apps after vehicle costs, miles, and platform fees. Compare platforms side by side.",
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
    name: "How to use the Gig Worker Real Hourly Rate Calculator",
    description:
      "Work out your true effective hourly rate from each gig platform after vehicle costs, and compare platforms side by side.",
    totalTime: "PT3M",
    tool: [{ "@type": "HowToTool", name: "Gig Hourly Rate Calculator" }],
    supply: [
      {
        "@type": "HowToSupply",
        name: "Gross earnings, hours on-app, and miles driven per platform",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Name each platform",
        text: "Edit the platform name field for each row (for example DoorDash, Uber Eats, Instacart, or Grubhub) to label the income source you are measuring.",
      },
      {
        "@type": "HowToStep",
        name: "Enter earnings, hours, and miles",
        text: "For each platform enter your gross earnings, total hours on-app (including waiting time, not just active delivery time), and miles driven for the same period.",
      },
      {
        "@type": "HowToStep",
        name: "Add more platforms",
        text: "Use '+ Add another platform' to include up to five platforms so you can compare them on equal footing.",
      },
      {
        "@type": "HowToStep",
        name: "Calculate your real hourly rate",
        text: "Click Calculate to subtract vehicle costs at the 2025 IRS rate of $0.70 per mile from gross earnings and see each platform's net hourly rate, ranked, plus your combined true effective hourly rate.",
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
        name: "Gig Hourly Rate Calculator",
        item: CANONICAL,
      },
    ],
  },
];

interface PlatformRow {
  id: number;
  name: string;
  gross: string;
  hours: string;
  miles: string;
}

interface PlatformResult {
  id: number;
  name: string;
  gross: number;
  hours: number;
  miles: number;
  mileageCost: number;
  net: number;
  hourly: number;
}

export default function GigHourlyRate() {
  const [platforms, setPlatforms] = useState<PlatformRow[]>([
    { id: 1, name: PLATFORM_DEFAULTS[0].name, gross: "", hours: "", miles: "" },
    { id: 2, name: PLATFORM_DEFAULTS[1].name, gross: "", hours: "", miles: "" },
  ]);
  const [hasResult, setHasResult] = useState(false);

  function updatePlatform(id: number, field: keyof PlatformRow, value: string) {
    setPlatforms(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
    setHasResult(false);
  }

  function addPlatform() {
    if (platforms.length >= 5) return;
    const nextDefault =
      PLATFORM_DEFAULTS[platforms.length] ?? PLATFORM_DEFAULTS[4];
    setPlatforms(prev => [
      ...prev,
      {
        id: Date.now(),
        name: nextDefault.name,
        gross: "",
        hours: "",
        miles: "",
      },
    ]);
  }

  function removePlatform(id: number) {
    setPlatforms(prev => prev.filter(p => p.id !== id));
    setHasResult(false);
  }

  const results = useMemo<PlatformResult[]>(() => {
    return platforms
      .map(p => {
        const gross = parseFloat(p.gross.replace(/,/g, "")) || 0;
        const hours = parseFloat(p.hours.replace(/,/g, "")) || 0;
        const miles = parseFloat(p.miles.replace(/,/g, "")) || 0;
        if (
          ![gross, hours, miles].every(Number.isFinite) ||
          gross < 0 ||
          hours <= 0 ||
          miles < 0
        )
          return null;
        const mileageCost = miles * IRS_MILEAGE_RATE;
        const net = earningsAfterExpenses(gross, mileageCost);
        const hourly = net / hours;
        return {
          id: p.id,
          name: p.name || "Platform",
          gross,
          hours,
          miles,
          mileageCost,
          net,
          hourly,
        };
      })
      .filter((r): r is PlatformResult => r !== null);
  }, [platforms]);

  const totals = useMemo(() => {
    if (results.length === 0) return null;
    const gross = results.reduce((s, r) => s + r.gross, 0);
    const hours = results.reduce((s, r) => s + r.hours, 0);
    const mileageCost = results.reduce((s, r) => s + r.mileageCost, 0);
    const net = results.reduce((s, r) => s + r.net, 0);
    const hourly = hours > 0 ? net / hours : 0;
    return { gross, hours, mileageCost, net, hourly };
  }, [results]);

  function handleCalculate() {
    if (results.length > 0) {
      setHasResult(true);
      trackToolUsage("gig-hourly-rate", "result", {
        platforms: results.length,
      });
    }
  }

  const fmt = formatUsd2;

  const fmtInt = formatUsd0;

  const canCalculate = results.length > 0;

  return (
    <ReadingLayout kind="calculator">
      <PageHead
        title="Gig Worker Real Hourly Rate Calculator — DoorDash, Uber Eats, Instacart | UnifyOne"
        description="Find your true hourly rate from DoorDash, Uber Eats, Instacart, and Grubhub after vehicle costs and miles. Free gig earnings optimizer — compare platforms."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <div className="reading-content">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Earnings Optimization
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Gig Worker Real Hourly Rate Calculator
          </h1>
          <p className="text-lg text-muted-foreground">
            What DoorDash, Uber Eats, and Instacart pay you and what you{" "}
            <em>actually</em> earn are different numbers. Enter your earnings,
            hours, and miles per platform to find your true hourly rate after
            vehicle costs.
          </p>
        </header>

        {/* Calculator */}
        <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10">
          <div className="space-y-6">
            {/* Platform rows */}
            <div className="space-y-4">
              {platforms.map((p, idx) => (
                <div
                  key={p.id}
                  className="rounded-lg border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      placeholder="Platform name"
                      value={p.name}
                      onChange={e =>
                        updatePlatform(p.id, "name", e.target.value)
                      }
                      className="text-sm font-medium bg-transparent border-0 border-b border-dashed border-muted-foreground/40 focus:outline-none focus:border-primary pb-0.5 w-32"
                      aria-label={p.name + ": " + "Platform name"}
                    />
                    {idx >= 2 && (
                      <button
                        onClick={() => removePlatform(p.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove platform"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Gross earnings ($)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g. 320"
                        value={p.gross}
                        onChange={e => {
                          updatePlatform(p.id, "gross", e.target.value);
                          if (e.target.value)
                            trackToolUsage("gig-hourly-rate", "start");
                        }}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min={0}
                        step="any"
                        aria-label={p.name + ": " + "Gross earnings ($)"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Hours on-app
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g. 24"
                        value={p.hours}
                        onChange={e =>
                          updatePlatform(p.id, "hours", e.target.value)
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min={0}
                        step="any"
                        aria-label={p.name + ": " + "Hours on-app"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Miles driven
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g. 180"
                        value={p.miles}
                        onChange={e =>
                          updatePlatform(p.id, "miles", e.target.value)
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min={0}
                        step="any"
                        aria-label={p.name + ": " + "Miles driven"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {platforms.length < 5 && (
                <button
                  onClick={addPlatform}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  + Add another platform
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                Calculate
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Vehicle cost estimated at IRS standard mileage rate: $0.70/mile
              (2025). Covers fuel, depreciation, oil, tires, and insurance.
            </p>

            {hasResult && totals && (
              <div
                className="rounded-lg bg-muted/50 p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
                role="status"
                aria-live="polite"
              >
                {/* Per-platform results */}
                {results.length > 1 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      By Platform
                    </p>
                    <div className="space-y-2">
                      {results
                        .slice()
                        .sort((a, b) => b.hourly - a.hourly)
                        .map(r => (
                          <div
                            key={`${r.id}-${r.name}-${r.gross}`}
                            className="flex items-center justify-between rounded-md bg-background border px-4 py-3"
                          >
                            <div>
                              <span className="font-medium text-sm">
                                {r.name}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {r.hours}h · {r.miles} mi
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">
                                {fmt(r.hourly)}/hr
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fmtInt(r.net)} net
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Combined Total
                  </p>
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      True effective hourly rate
                    </p>
                    <p className="text-4xl font-bold text-primary">
                      {fmt(totals.hourly)}/hr
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-md bg-background border p-3">
                      <p className="text-xs text-muted-foreground">
                        Gross earnings
                      </p>
                      <p className="font-semibold mt-1">
                        {fmtInt(totals.gross)}
                      </p>
                    </div>
                    <div className="rounded-md bg-background border p-3">
                      <p className="text-xs text-muted-foreground">
                        Vehicle costs
                      </p>
                      <p className="font-semibold mt-1 text-destructive">
                        -{fmtInt(totals.mileageCost)}
                      </p>
                    </div>
                    <div className="rounded-md bg-background border p-3">
                      <p className="text-xs text-muted-foreground">
                        Net earnings
                      </p>
                      <p className="font-semibold mt-1">{fmtInt(totals.net)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Keep a record of earnings, expenses, and mileage across the
                    work you do.
                  </p>
                  <Link
                    href="/register"
                    onClick={() =>
                      trackToolUsage("gig-hourly-rate", "signup_cta")
                    }
                    className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Track all platforms for free →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Context */}
        <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <h2>Why your actual hourly rate is lower than you think</h2>
          <p className="text-muted-foreground">
            A payout is only part of the picture. Record the time and expenses
            behind it, then compare the work using consistent assumptions. The
            mileage allowance used here is a planning proxy, not a measurement
            of your vehicle costs.
          </p>
          <p>
            Include unpaid waiting time in your recorded hours. The result is a
            comparison estimate before taxes; actual vehicle costs may differ
            from the mileage allowance.
          </p>

          <h2>How to use this to earn more</h2>
          <p>
            The most effective way to raise your real hourly rate isn't working
            more hours — it's identifying which platform, time of day, and zone
            produces the highest net-per-hour in your specific market. Enter
            your weekly data for each platform and sort by effective hourly
            rate. Shift more of your hours toward the winners.
          </p>
          <p className="text-muted-foreground">
            Compare equivalent periods and include waiting time. A higher result
            in your past records can help you ask better questions about future
            work, but conditions and pay can change.
          </p>

          <h2>What this calculator doesn't include</h2>
          <p>
            This tool estimates vehicle cost using the IRS standard mileage rate
            and does not separately account for SE tax, income tax, or platform
            promotions. For a full picture, pair this with the{" "}
            <a href="/tools/se-tax-calculator">SE Tax Calculator</a> and the{" "}
            <a href="/tools/quarterly-tax-estimator">Quarterly Tax Estimator</a>
            .
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
            Build a clearer record over time
          </h2>
          <p className="text-muted-foreground">
            Create a free account to keep a record of your shifts, mileage, and
            earnings over time. Log the work you do across different platforms
            or clients in one place.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start for free →
          </Link>
        </section>
      </div>
    </ReadingLayout>
  );
}
