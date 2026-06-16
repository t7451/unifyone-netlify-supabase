import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import ToolLayout from "@/components/ToolLayout";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";

const CANONICAL = `${SITE_URL}/tools/earnings-consolidator`;

const PLATFORM_OPTIONS = [
  "DoorDash",
  "Uber Eats",
  "Instacart",
  "Lyft",
  "Uber",
  "Amazon Flex",
  "Shipt",
  "Grubhub",
  "Etsy",
  "eBay",
  "Amazon",
  "Upwork",
  "Fiverr",
  "Other",
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is a 'true hourly rate' for gig workers?",
    a: "True hourly rate is your net earnings after all platform-related expenses (fuel, tolls, supplies) divided by hours worked. Gross pay from apps is always higher than take-home because vehicle expenses consume 20–40% of gig income for driving-based workers.",
  },
  {
    q: "Why is gross pay from gig apps misleading?",
    a: "Apps report gross earnings before deducting fuel, mileage depreciation, and supplies. A DoorDash shift paying $25 gross may net $16 after fuel costs. Comparing gross across platforms leads workers to prioritize the wrong app.",
  },
  {
    q: "Which platforms can I include?",
    a: "Any gig or side-hustle income: DoorDash, Uber Eats, Instacart, Lyft, Amazon Flex, Etsy, eBay, Upwork, or any custom source. You can track up to six income streams simultaneously.",
  },
  {
    q: "How do I estimate expenses per platform?",
    a: "For driving gigs, multiply miles driven by your per-mile fuel cost (typically $0.10–$0.20) and add supplies. The easiest approach: use the IRS standard mileage rate ($0.70/mile for 2025) as an all-in vehicle cost estimate — it covers fuel, depreciation, oil, and tires.",
  },
  {
    q: "What gig expenses are tax-deductible?",
    a: "IRS-deductible gig expenses include mileage at the standard rate, hot bags and insulated carriers, phone data plans used for work, parking fees on delivery, and tolls. Keep receipts — all deductions require documentation.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Multi-Platform Gig Earnings Consolidator",
    url: CANONICAL,
    description:
      "Calculate your true hourly rate across DoorDash, Uber Eats, Instacart, and more after expenses. See which app pays best per hour of work.",
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
    name: "How to use the Multi-Platform Earnings Consolidator",
    description:
      "Compare your true hourly rate after expenses across multiple gig platforms to find which app actually pays best.",
    totalTime: "PT3M",
    tool: [{ "@type": "HowToTool", name: "Earnings Consolidator" }],
    supply: [
      {
        "@type": "HowToSupply",
        name: "Gross earnings, hours worked, and expenses per platform",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Select a platform",
        text: "For each row, choose a platform such as DoorDash, Uber Eats, or Instacart from the dropdown — or pick Other for a custom income source.",
      },
      {
        "@type": "HowToStep",
        name: "Enter gross earnings, hours, and expenses",
        text: "Fill in the gross earnings, hours worked, and expenses for that platform. A quick way to estimate expenses is the IRS rate of $0.70 per mile multiplied by miles driven.",
      },
      {
        "@type": "HowToStep",
        name: "Add more platforms",
        text: "Use '+ Add platform' to include up to six income streams so you can compare them side by side in one place.",
      },
      {
        "@type": "HowToStep",
        name: "Calculate your true hourly rate",
        text: "Click 'Calculate true hourly rate' to see net earnings divided by hours for each platform, ranked best to worst, plus your combined true hourly rate across all platforms.",
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
        name: "Earnings Consolidator",
        item: CANONICAL,
      },
    ],
  },
];

interface PlatformRow {
  id: string;
  name: string;
  gross: string;
  hours: string;
  expenses: string;
}

function mkRow(name = ""): PlatformRow {
  return {
    id: Math.random().toString(36).slice(2),
    name,
    gross: "",
    hours: "",
    expenses: "",
  };
}

interface RowResult {
  name: string;
  gross: number;
  hours: number;
  expenses: number;
  net: number;
  hourly: number;
}

export default function EarningsConsolidator() {
  const [platforms, setPlatforms] = useState<PlatformRow[]>([
    mkRow("DoorDash"),
    mkRow("Uber Eats"),
    mkRow(""),
  ]);
  const [hasResult, setHasResult] = useState(false);
  const [started, setStarted] = useState(false);

  function updateRow(
    id: string,
    field: keyof Omit<PlatformRow, "id">,
    value: string
  ) {
    setPlatforms(rows =>
      rows.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    if (platforms.length < 6) setPlatforms(rows => [...rows, mkRow()]);
  }

  function removeRow(id: string) {
    if (platforms.length > 1)
      setPlatforms(rows => rows.filter(r => r.id !== id));
  }

  function handleStart() {
    if (!started) {
      setStarted(true);
      trackToolUsage("earnings-consolidator", "start");
    }
  }

  const results = useMemo<RowResult[]>(() => {
    return platforms
      .map(p => {
        const gross = parseFloat(p.gross) || 0;
        const hours = parseFloat(p.hours) || 0;
        const expenses = parseFloat(p.expenses) || 0;
        if (gross <= 0 || hours <= 0) return null;
        const net = Math.max(0, gross - expenses);
        return {
          name: p.name || "Platform",
          gross,
          hours,
          expenses,
          net,
          hourly: net / hours,
        };
      })
      .filter((r): r is RowResult => r !== null);
  }, [platforms]);

  const totals = useMemo(() => {
    if (results.length === 0) return null;
    const totalGross = results.reduce((s, r) => s + r.gross, 0);
    const totalExpenses = results.reduce((s, r) => s + r.expenses, 0);
    const totalNet = results.reduce((s, r) => s + r.net, 0);
    const totalHours = results.reduce((s, r) => s + r.hours, 0);
    return {
      totalGross,
      totalExpenses,
      totalNet,
      totalHours,
      combinedHourly: totalNet / totalHours,
    };
  }, [results]);

  function handleCalculate() {
    if (totals) {
      setHasResult(true);
      trackToolUsage("earnings-consolidator", "result", {
        platforms: results.length,
        combinedHourly: Math.round(totals.combinedHourly * 100) / 100,
      });
    }
  }

  function fmt(n: number) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  const inputClass =
    "h-9 rounded-md border bg-background px-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/50";
  const dollarInputClass =
    "h-9 rounded-md border bg-background pl-6 pr-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <>
      <PageHead
        title="Multi-Platform Gig Earnings Consolidator | True Hourly Rate | UnifyOne"
        description="Free gig earnings calculator. See your true hourly rate after expenses across DoorDash, Uber Eats, Instacart, and more — no account required."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <ToolLayout
        toolName="Earnings Consolidator"
        breadcrumb="Earnings Consolidator"
      >
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Income Tracking
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Multi-Platform Earnings Consolidator
          </h1>
          <p className="text-lg text-muted-foreground">
            Gross pay is not what you take home. Enter earnings, hours, and
            expenses for each platform to see your{" "}
            <strong className="text-foreground">true hourly rate</strong> after
            all costs — and find out which app actually pays the best.
          </p>
        </header>

        {/* Input table */}
        <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10">
          <div className="space-y-3">
            {/* Column headers — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-[1fr_108px_84px_108px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Platform</span>
              <span>Gross earnings</span>
              <span>Hours</span>
              <span>Expenses</span>
              <span />
            </div>

            {platforms.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-2 sm:grid-cols-[1fr_108px_84px_108px_36px] gap-2 items-center"
              >
                {/* Platform name */}
                <select
                  aria-label={`Platform ${i + 1}`}
                  value={p.name}
                  onChange={e => {
                    handleStart();
                    updateRow(p.id, "name", e.target.value);
                  }}
                  className="col-span-2 sm:col-span-1 h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select platform…</option>
                  {PLATFORM_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {/* Gross */}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    aria-label="Gross earnings"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    value={p.gross}
                    onChange={e => {
                      handleStart();
                      updateRow(p.id, "gross", e.target.value);
                    }}
                    className={dollarInputClass}
                  />
                </div>

                {/* Hours */}
                <input
                  aria-label="Hours worked"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={p.hours}
                  onChange={e => {
                    handleStart();
                    updateRow(p.id, "hours", e.target.value);
                  }}
                  className={inputClass}
                />

                {/* Expenses */}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    aria-label="Expenses"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    value={p.expenses}
                    onChange={e => {
                      handleStart();
                      updateRow(p.id, "expenses", e.target.value);
                    }}
                    className={dollarInputClass}
                  />
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeRow(p.id)}
                  aria-label={`Remove row ${i + 1}`}
                  disabled={platforms.length === 1}
                  className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 text-xl leading-none flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 flex-wrap">
            {platforms.length < 6 && (
              <button
                type="button"
                onClick={addRow}
                className="text-sm text-primary hover:underline"
              >
                + Add platform
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Tip: use IRS rate ($0.70/mi) × miles as an all-in vehicle expense
              estimate
            </p>
          </div>

          <div className="mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={results.length === 0}
              className="w-full sm:w-auto rounded-md bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Calculate true hourly rate
            </button>
          </div>
        </section>

        {/* Results */}
        {hasResult && totals && results.length > 0 && (
          <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10 animate-in fade-in duration-300">
            {/* Combined headline */}
            <div className="text-center mb-8 pb-6 border-b">
              <p className="text-sm text-muted-foreground mb-1">
                Combined true hourly rate
              </p>
              <p
                className={`text-5xl font-bold tabular-nums ${
                  totals.combinedHourly >= 15
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {fmt(totals.combinedHourly)}
                <span className="text-2xl text-muted-foreground font-normal">
                  /hr
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {results.length} platform{results.length !== 1 ? "s" : ""} ·{" "}
                {totals.totalHours.toFixed(1)} hrs total ·{" "}
                {fmt(totals.totalNet)} net earnings
              </p>
            </div>

            {/* Per-platform breakdown */}
            {results.length > 1 && (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-2 font-medium">Platform</th>
                      <th className="pb-2 font-medium text-right">Gross</th>
                      <th className="pb-2 font-medium text-right">Expenses</th>
                      <th className="pb-2 font-medium text-right">Net</th>
                      <th className="pb-2 font-medium text-right">$/hr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results
                      .slice()
                      .sort((a, b) => b.hourly - a.hourly)
                      .map(r => (
                        <tr key={`${r.name}-${r.gross}-${r.hours}`}>
                          <td className="py-2.5 font-medium">{r.name}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {fmt(r.gross)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                            −{fmt(r.expenses)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {fmt(r.net)}
                          </td>
                          <td
                            className={`py-2.5 text-right tabular-nums font-semibold ${
                              r.hourly >= 15
                                ? "text-green-600 dark:text-green-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {fmt(r.hourly)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="pt-2.5">Total</td>
                      <td className="pt-2.5 text-right tabular-nums">
                        {fmt(totals.totalGross)}
                      </td>
                      <td className="pt-2.5 text-right tabular-nums text-muted-foreground">
                        −{fmt(totals.totalExpenses)}
                      </td>
                      <td className="pt-2.5 text-right tabular-nums">
                        {fmt(totals.totalNet)}
                      </td>
                      <td className="pt-2.5 text-right tabular-nums">
                        {fmt(totals.combinedHourly)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Signup CTA */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="font-medium text-sm mb-1">
                Track this automatically →
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Connect your gig platforms to UnifyOne and see real earnings,
                expenses, and true hourly rate updated automatically after every
                shift.
              </p>
              <Link
                href="/register"
                onClick={() =>
                  trackToolUsage("earnings-consolidator", "signup_cta")
                }
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create free account
              </Link>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Estimates only. Consult a tax professional for your specific
              situation.
            </p>
          </section>
        )}

        {/* Educational prose */}
        <section className="mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            Why gross pay from apps is misleading
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When DoorDash shows "$25.40 earned" for a 2-hour shift, that number
            looks straightforward. But gig drivers spend $0.15–$0.25 per mile in
            direct fuel costs — and a 2-hour delivery shift typically covers
            20–40 miles. That's $4–$10 in fuel before oil changes, tires, or
            depreciation. The IRS standard mileage rate ($0.70/mile in 2025)
            exists because vehicle costs are real and substantial.
          </p>
          <h2 className="text-xl font-semibold">
            Comparing platforms by true hourly rate
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Different platforms have different cost profiles. Rideshare (Uber,
            Lyft) tends to log more miles per hour than food delivery in dense
            areas. Marketplace selling (Etsy, eBay) has near-zero mileage
            expense but higher platform fee and supply costs. The only
            meaningful comparison is net earnings per hour — gross comparisons
            are noise.
          </p>
        </section>

        {/* FAQ */}
        <section className="border-t pt-10 mb-10">
          <h2 className="text-2xl font-semibold mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-medium mb-1">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            Never calculate this manually again
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            UnifyOne connects directly to your gig platforms and shows your real
            take-home across all income streams — automatically, after every
            shift.
          </p>
          <Link
            href="/register"
            onClick={() =>
              trackToolUsage("earnings-consolidator", "signup_cta")
            }
            className="inline-flex items-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create free account
          </Link>
        </section>
      </ToolLayout>
    </>
  );
}
