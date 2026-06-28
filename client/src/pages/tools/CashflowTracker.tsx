import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import ToolLayout from "@/components/ToolLayout";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";
import { formatUsd0 } from "@/lib/format";

const CANONICAL = `${SITE_URL}/tools/cashflow-tracker`;

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "When does DoorDash pay drivers?",
    a: "DoorDash pays weekly, deposited every Monday for the prior week's earnings. Fast Pay lets you cash out instantly for a $1.99 fee (up to once per day). Earnings from Monday–Sunday arrive the following Monday via standard payout.",
  },
  {
    q: "How often does Uber Eats pay?",
    a: "Uber Eats pays weekly on Wednesdays for the prior week (Monday–Sunday). Instant Pay lets drivers cash out up to five times per day with a $0.85 fee, or free to a Uber debit card. Most drivers receive both weekly deposits and occasional instant payouts.",
  },
  {
    q: "What is the fastest way to get paid by gig apps?",
    a: "Most platforms offer same-day or instant payout for a small fee: DoorDash Fast Pay ($1.99), Uber Instant Pay ($0.85 or free with Uber debit card), Lyft Express Pay ($0.50 or free with Lyft Direct card), Instacart Instant Pay ($0.50). Regular weekly payouts are always free.",
  },
  {
    q: "How can I manage cash flow with multiple gig apps?",
    a: "The key is diversifying your payout days. If DoorDash pays Mondays and Uber Eats pays Wednesdays, you receive income at least twice a week. Adding Lyft (Thursdays) creates three weekly income events. Use this calculator to see your full weekly cash-flow rhythm before signing up for additional platforms.",
  },
  {
    q: "Why does cash flow matter for gig workers?",
    a: "Variable income means gig workers face real cash-flow gaps — especially early in the week before payouts arrive. Fuel, insurance, and supplies must be paid before earnings land. Knowing your payout schedule lets you time expenses, avoid overdraft fees, and make instant-pay decisions strategically instead of reactively.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Gig Worker Payout Timing & Cash-Flow Tracker",
    url: CANONICAL,
    description:
      "See when your gig platform payouts hit your bank each week. Model your weekly cash-flow rhythm across DoorDash, Uber Eats, Instacart, Lyft, and more.",
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
    name: "How to use the Gig Payout Timing & Cash-Flow Tracker",
    description:
      "Map which days each gig platform pays you and forecast your weekly and monthly cash-flow rhythm.",
    totalTime: "PT2M",
    tool: [{ "@type": "HowToTool", name: "Cash-Flow Tracker" }],
    supply: [
      {
        "@type": "HowToSupply",
        name: "Your active gig platforms and weekly earnings on each",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Turn on your active platforms",
        text: "Use the toggle next to each platform — DoorDash, Uber Eats, Instacart, Lyft, Amazon Flex, Shipt, or Grubhub — to switch on the ones you currently work.",
      },
      {
        "@type": "HowToStep",
        name: "Enter weekly earnings per platform",
        text: "For each active platform, type your typical weekly earnings in the 'Weekly' field so the tool can place income on the correct payout days.",
      },
      {
        "@type": "HowToStep",
        name: "Show your cash-flow schedule",
        text: "Click 'Show my cash-flow schedule' to see a Monday-to-Sunday grid of which days money arrives, your number of payout days, estimated weekly and monthly income, and your longest gap without income.",
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
        name: "Cash-Flow Tracker",
        item: CANONICAL,
      },
    ],
  },
];

// payDays: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
interface PlatformDef {
  id: string;
  name: string;
  payDays: number[];
  schedule: string;
  instantPay: string;
}

const PLATFORM_DEFS: PlatformDef[] = [
  {
    id: "doordash",
    name: "DoorDash",
    payDays: [1],
    schedule: "Weekly — Monday",
    instantPay: "Fast Pay: $1.99/day",
  },
  {
    id: "ubereats",
    name: "Uber Eats",
    payDays: [3],
    schedule: "Weekly — Wednesday",
    instantPay: "Instant Pay: $0.85 (free w/ Uber card)",
  },
  {
    id: "instacart",
    name: "Instacart",
    payDays: [3],
    schedule: "Weekly — Wednesday",
    instantPay: "Instant Pay: $0.50",
  },
  {
    id: "lyft",
    name: "Lyft",
    payDays: [4],
    schedule: "Weekly — Thursday",
    instantPay: "Express Pay: $0.50 (free w/ Lyft card)",
  },
  {
    id: "amazon-flex",
    name: "Amazon Flex",
    payDays: [2, 5],
    schedule: "Twice weekly — Tue & Fri",
    instantPay: "No instant payout option",
  },
  {
    id: "shipt",
    name: "Shipt",
    payDays: [3],
    schedule: "Weekly — Wednesday",
    instantPay: "Instant payout: $0.50",
  },
  {
    id: "grubhub",
    name: "Grubhub",
    payDays: [4],
    schedule: "Weekly — Thursday",
    instantPay: "Instant cash-out via Grubhub debit card",
  },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Display order: Mon–Sun
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface PlatformConfig {
  id: string;
  active: boolean;
  weeklyEarnings: string;
}

interface DayResult {
  dayOfWeek: number;
  label: string;
  platforms: string[];
  amount: number;
}

export default function CashflowTracker() {
  const [configs, setConfigs] = useState<PlatformConfig[]>(
    PLATFORM_DEFS.map(p => ({
      id: p.id,
      active: ["doordash", "ubereats", "instacart"].includes(p.id),
      weeklyEarnings: "",
    }))
  );
  const [hasResult, setHasResult] = useState(false);
  const [started, setStarted] = useState(false);

  function handleStart() {
    if (!started) {
      setStarted(true);
      trackToolUsage("cashflow-tracker", "start");
    }
  }

  function toggle(id: string) {
    handleStart();
    setConfigs(cs =>
      cs.map(c => (c.id === id ? { ...c, active: !c.active } : c))
    );
  }

  function setEarnings(id: string, value: string) {
    handleStart();
    setConfigs(cs =>
      cs.map(c => (c.id === id ? { ...c, weeklyEarnings: value } : c))
    );
  }

  const results = useMemo<DayResult[] | null>(() => {
    const activeConfigs = configs.filter(c => c.active);
    if (activeConfigs.length === 0) return null;

    // Build per-day-of-week income map
    const dayMap: Map<number, { platforms: string[]; amount: number }> =
      new Map();

    for (const cfg of activeConfigs) {
      const def = PLATFORM_DEFS.find(p => p.id === cfg.id);
      if (!def) continue;
      const weekly = parseFloat(cfg.weeklyEarnings) || 0;
      const perPayDay = weekly / def.payDays.length;

      for (const dow of def.payDays) {
        const existing = dayMap.get(dow) ?? { platforms: [], amount: 0 };
        dayMap.set(dow, {
          platforms: [...existing.platforms, def.name],
          amount: existing.amount + perPayDay,
        });
      }
    }

    return DISPLAY_ORDER.map(dow => ({
      dayOfWeek: dow,
      label: DAY_LABELS[dow],
      platforms: dayMap.get(dow)?.platforms ?? [],
      amount: dayMap.get(dow)?.amount ?? 0,
    }));
  }, [configs]);

  const summary = useMemo(() => {
    if (!results) return null;
    const payDays = results.filter(d => d.amount > 0);
    const weeklyTotal = results.reduce((s, d) => s + d.amount, 0);
    const monthlyTotal = weeklyTotal * 4.33;

    // Longest cash-flow gap (consecutive days with no income, wrapping around the week)
    const incomeFlags = DISPLAY_ORDER.map(
      dow => (results.find(d => d.dayOfWeek === dow)?.amount ?? 0) > 0
    );
    let maxGap = 0;
    let currentGap = 0;
    // Scan twice to handle wrap-around
    for (let i = 0; i < incomeFlags.length * 2; i++) {
      if (incomeFlags[i % incomeFlags.length]) {
        maxGap = Math.max(maxGap, currentGap);
        currentGap = 0;
      } else {
        currentGap++;
      }
    }
    // Cap at 7 (full week without income)
    maxGap = Math.min(maxGap, 7);

    return { payDays: payDays.length, weeklyTotal, monthlyTotal, maxGap };
  }, [results]);

  function handleCalculate() {
    if (summary) {
      setHasResult(true);
      trackToolUsage("cashflow-tracker", "result", {
        platforms: configs.filter(c => c.active).length,
        weeklyTotal: Math.round(summary.weeklyTotal * 100) / 100,
      });
    }
  }

  const fmt = formatUsd0;

  return (
    <>
      <PageHead
        title="Gig Payout Timing & Cash-Flow Tracker | DoorDash, Uber, Instacart | UnifyOne"
        description="Free gig cash-flow tool. Model when DoorDash, Uber Eats, Instacart, and Lyft payouts hit your bank and forecast your 30-day income rhythm."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <ToolLayout toolName="Cash-Flow Tracker" breadcrumb="Cash-Flow Tracker">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Cash Flow
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Payout Timing & Cash-Flow Tracker
          </h1>
          <p className="text-lg text-muted-foreground">
            Every gig app pays on a different schedule. See which days your
            money arrives, find your{" "}
            <strong className="text-foreground">longest cash-flow gap</strong>,
            and know exactly when to use instant pay — before you need it.
          </p>
        </header>

        {/* Platform selection */}
        <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10">
          <h2 className="text-base font-semibold mb-4">
            Select your active platforms
          </h2>
          <div className="space-y-3">
            {PLATFORM_DEFS.map(def => {
              const cfg = configs.find(c => c.id === def.id) ?? {
                id: def.id,
                active: false,
                weeklyEarnings: "",
              };
              return (
                <div
                  key={def.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    cfg.active
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={cfg.active}
                      onClick={() => toggle(def.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        cfg.active ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                          cfg.active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Name + schedule */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{def.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {def.schedule}
                      </span>
                    </div>

                    {/* Weekly earnings input */}
                    {cfg.active && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          Weekly:
                        </span>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
                            $
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            placeholder="0"
                            value={cfg.weeklyEarnings}
                            onChange={e => setEarnings(def.id, e.target.value)}
                            className="h-7 w-24 rounded-md border bg-background pl-5 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            aria-label={`${def.name} weekly earnings`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {cfg.active && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-12">
                      Instant: {def.instantPay}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={configs.every(c => !c.active)}
              className="w-full sm:w-auto rounded-md bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Show my cash-flow schedule
            </button>
          </div>
        </section>

        {/* Results */}
        {hasResult && results && summary && (
          <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10 animate-in fade-in duration-300">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 pb-6 border-b">
              <div className="text-center rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Payout days/week
                </p>
                <p className="text-2xl font-bold">{summary.payDays}</p>
              </div>
              {summary.weeklyTotal > 0 && (
                <div className="text-center rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Est. weekly
                  </p>
                  <p className="text-2xl font-bold">
                    {fmt(summary.weeklyTotal)}
                  </p>
                </div>
              )}
              <div
                className={`text-center rounded-lg p-3 ${
                  summary.maxGap >= 4
                    ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    : "bg-muted/40"
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  Longest gap
                </p>
                <p
                  className={`text-2xl font-bold ${
                    summary.maxGap >= 4
                      ? "text-amber-600 dark:text-amber-400"
                      : ""
                  }`}
                >
                  {summary.maxGap}d
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.maxGap >= 4 ? "cash-flow risk" : "without income"}
                </p>
              </div>
            </div>

            {/* Weekly schedule grid */}
            <h3 className="text-sm font-semibold mb-3">
              Weekly payout schedule
            </h3>
            <div className="grid grid-cols-7 gap-1 mb-6">
              {results.map(day => (
                <div key={day.dayOfWeek} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {day.label}
                  </p>
                  <div
                    className={`rounded-lg py-3 px-1 min-h-[56px] flex flex-col items-center justify-center gap-1 ${
                      day.amount > 0
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/30 border border-transparent"
                    }`}
                  >
                    {day.amount > 0 ? (
                      <>
                        <span className="text-xs font-semibold text-primary">
                          {fmt(day.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight text-center">
                          {day.platforms.join(", ")}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {summary.monthlyTotal > 0 && (
              <p className="text-sm text-muted-foreground text-center mb-6">
                Estimated monthly income:{" "}
                <strong className="text-foreground">
                  {fmt(summary.monthlyTotal)}
                </strong>{" "}
                (weekly × 4.33)
              </p>
            )}

            {/* Signup CTA */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="font-medium text-sm mb-1">
                Track actual payouts automatically →
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                UnifyOne connects to your gig platforms and shows real-time
                income, upcoming payouts, and running cash-flow — not estimates.
              </p>
              <Link
                href="/register"
                onClick={() => trackToolUsage("cashflow-tracker", "signup_cta")}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create free account
              </Link>
            </div>
          </section>
        )}

        {/* Payout reference table (always visible) */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Gig platform payout schedule reference
          </h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium">Platform</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Standard payout
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Instant pay option
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {PLATFORM_DEFS.map(def => (
                  <tr key={def.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{def.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {def.schedule}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {def.instantPay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Educational prose */}
        <section className="mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            Why payout timing matters for full-time gig workers
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Most gig workers treat payouts as a surprise — money arrives when it
            arrives. But a DoorDash driver with a 4-day gap between payouts
            faces a real cash-flow problem when fuel costs $60 every 2–3 days
            and rent is due Monday.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The strategic play: diversify platforms to spread payouts across the
            week. Adding a second platform that pays on a different day turns a
            once-weekly income event into 2–3 income events per week. For
            workers who rely on gig income for daily expenses, this alone can
            eliminate most cash-flow stress.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">
              When to use instant pay:
            </strong>{" "}
            Instant pay fees ($0.50–$1.99) are worth it when the alternative is
            an overdraft fee ($25–$35) or a late-payment penalty. They are not
            worth it as a habit — paying $1.99 per day to access $50 is a 4%
            daily cost, which annualizes to more than any credit card rate.
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
            See your real cash-flow automatically
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            UnifyOne aggregates earnings from all your gig platforms in real
            time — so you always know what's coming and when.
          </p>
          <Link
            href="/register"
            onClick={() => trackToolUsage("cashflow-tracker", "signup_cta")}
            className="inline-flex items-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create free account
          </Link>
        </section>
      </ToolLayout>
    </>
  );
}
