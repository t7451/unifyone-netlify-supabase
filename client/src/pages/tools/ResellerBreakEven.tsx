import { useState, useMemo } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import ToolLayout from "@/components/ToolLayout";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";

const CANONICAL = `${SITE_URL}/tools/reseller-break-even`;

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is break-even price for resellers?",
    a: "Break-even price is the minimum sale price where you neither profit nor lose money, after accounting for the item cost, shipping, marketplace fees, and expected returns. Selling below this number loses money on every transaction.",
  },
  {
    q: "How are eBay seller fees calculated?",
    a: "eBay charges a final value fee (typically 13.25% for most categories) on the total sale amount including shipping. Some categories (motors, real estate) have different rates. There is also a $0.35 insertion fee per listing beyond your monthly free listings allotment.",
  },
  {
    q: "Should I factor in returns when pricing?",
    a: "Yes — returns are a real cost. Even a 5% return rate means 1 in 20 sales results in a refund. You still paid shipping and possibly restocking costs. For high-return categories like clothing and electronics, a 10–15% return rate is common and must be priced in.",
  },
  {
    q: "What is a good profit margin for online resellers?",
    a: "Most profitable resellers target 20–40% gross margin (profit as a percentage of cost). Below 15% margins leave little room for unexpected costs. Above 50% is excellent. The right target depends on volume — a 20% margin on 100 items per week beats a 50% margin on 5.",
  },
  {
    q: "How do Amazon FBA fees compare to eBay?",
    a: "Amazon charges a referral fee (8–15% depending on category) plus FBA fulfillment fees based on item size and weight — typically $3.00–$6.00 per unit for standard size. Combined, Amazon FBA fees often total 25–35% of the sale price, making break-even analysis critical.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Reseller Break-Even & Pricing Calculator",
    url: CANONICAL,
    description:
      "Calculate your break-even price and target sale price on eBay, Etsy, Amazon, and any marketplace. Enter item cost, fees, shipping, and return rate to find your minimum profitable price.",
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

interface Preset {
  label: string;
  fee: number;
  note: string;
}

const PRESETS: Preset[] = [
  {
    label: "eBay",
    fee: 13.25,
    note: "13.25% final value fee (most categories)",
  },
  { label: "Etsy", fee: 6.5, note: "6.5% transaction fee (+ $0.20 listing)" },
  {
    label: "Amazon",
    fee: 15,
    note: "15% referral (most categories, excl. FBA fees)",
  },
  { label: "Facebook", fee: 5, note: "5% selling fee (or $0.40 minimum)" },
];

interface PricePoint {
  price: number;
  profit: number;
  roi: number;
}

export default function ResellerBreakEven() {
  const [itemCost, setItemCost] = useState("");
  const [shipping, setShipping] = useState("");
  const [feeRate, setFeeRate] = useState<number>(13.25);
  const [customFee, setCustomFee] = useState("");
  const [useCustomFee, setUseCustomFee] = useState(false);
  const [returnRate, setReturnRate] = useState(5);
  const [targetMarginPct, setTargetMarginPct] = useState(25);
  const [hasResult, setHasResult] = useState(false);
  const [started, setStarted] = useState(false);

  function handleStart() {
    if (!started) {
      setStarted(true);
      trackToolUsage("reseller-break-even", "start");
    }
  }

  const effectiveFee = useCustomFee ? parseFloat(customFee) || 0 : feeRate;

  const calc = useMemo(() => {
    const C = parseFloat(itemCost) || 0;
    const S = parseFloat(shipping) || 0;
    const fee = effectiveFee / 100;
    const R = returnRate / 100;
    const margin = targetMarginPct / 100;

    if (C <= 0) return null;

    // Model:
    //   Net profit per sale = P*(1 - fee - R) - C - S*(1 + R)
    // Break-even: profit = 0
    //   P_be = (C + S*(1+R)) / (1 - fee - R)
    // Target (margin as % of cost):
    //   profit = margin * C
    //   P*(1-fee-R) = C*(1+margin) + S*(1+R)
    //   P_target = (C*(1+margin) + S*(1+R)) / (1 - fee - R)
    const denominator = 1 - fee - R;
    if (denominator <= 0) return null;

    const base = C + S * (1 + R);
    const breakEven = base / denominator;
    const targetPrice = (C * (1 + margin) + S * (1 + R)) / denominator;

    function profitAt(price: number) {
      return price * (1 - fee - R) - C - S * (1 + R);
    }

    const ladder: PricePoint[] = [
      breakEven,
      breakEven * 1.1,
      breakEven * 1.2,
      breakEven * 1.35,
      breakEven * 1.5,
      breakEven * 2,
    ].map(price => ({
      price,
      profit: profitAt(price),
      roi: C > 0 ? (profitAt(price) / C) * 100 : 0,
    }));

    return {
      breakEven,
      targetPrice,
      targetProfit: profitAt(targetPrice),
      ladder,
      fee: effectiveFee,
      R: returnRate,
    };
  }, [itemCost, shipping, effectiveFee, returnRate, targetMarginPct]);

  function handleCalculate() {
    if (calc) {
      setHasResult(true);
      trackToolUsage("reseller-break-even", "result", {
        breakEven: Math.round(calc.breakEven * 100) / 100,
        feeRate: effectiveFee,
      });
    }
  }

  function fmtDollar(n: number) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  function fmtPct(n: number) {
    return n.toFixed(1) + "%";
  }

  const inputClass =
    "h-9 rounded-md border bg-background px-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <>
      <PageHead
        title="Reseller Break-Even & Pricing Calculator — eBay, Etsy, Amazon | UnifyOne"
        description="Free reseller pricing calculator. Enter item cost, marketplace fees, shipping, and return rate to find your break-even price and target sale price on eBay, Etsy, Amazon, or any marketplace."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <ToolLayout
        toolName="Reseller Break-Even Calculator"
        breadcrumb="Reseller Break-Even"
      >
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Commerce
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Reseller Break-Even & Pricing Calculator
          </h1>
          <p className="text-lg text-muted-foreground">
            Find your{" "}
            <strong className="text-foreground">
              minimum profitable price
            </strong>{" "}
            on eBay, Etsy, Amazon, or any marketplace. Accounts for fees,
            shipping, and returns — the three costs most resellers undercount.
          </p>
        </header>

        {/* Inputs */}
        <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10">
          <div className="space-y-5">
            {/* Item cost + shipping */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  htmlFor="cost"
                >
                  Item cost (what you paid)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    id="cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0.00"
                    value={itemCost}
                    onChange={e => {
                      handleStart();
                      setItemCost(e.target.value);
                    }}
                    className="h-9 rounded-md border bg-background pl-6 pr-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  htmlFor="shipping"
                >
                  Shipping cost (to buyer)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    id="shipping"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0.00"
                    value={shipping}
                    onChange={e => {
                      handleStart();
                      setShipping(e.target.value);
                    }}
                    className="h-9 rounded-md border bg-background pl-6 pr-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Marketplace fee */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Marketplace fee
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      handleStart();
                      setUseCustomFee(false);
                      setFeeRate(p.fee);
                    }}
                    title={p.note}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      !useCustomFee && feeRate === p.fee
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {p.label} {p.fee}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    handleStart();
                    setUseCustomFee(true);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    useCustomFee
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  Custom
                </button>
              </div>
              {useCustomFee && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 10"
                    value={customFee}
                    onChange={e => setCustomFee(e.target.value)}
                    className="h-9 w-28 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">% fee</span>
                </div>
              )}
              {!useCustomFee && (
                <p className="text-xs text-muted-foreground">
                  {PRESETS.find(p => p.fee === feeRate)?.note}
                </p>
              )}
            </div>

            {/* Return rate + target margin */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Expected return rate:{" "}
                  <span className="text-primary">{returnRate}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={returnRate}
                  onChange={e => {
                    handleStart();
                    setReturnRate(Number(e.target.value));
                  }}
                  className={inputClass + " px-0 py-1"}
                  aria-label="Return rate"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>30%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Target ROI (% of cost):{" "}
                  <span className="text-primary">{targetMarginPct}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={targetMarginPct}
                  onChange={e => {
                    handleStart();
                    setTargetMarginPct(Number(e.target.value));
                  }}
                  className={inputClass + " px-0 py-1"}
                  aria-label="Target margin"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={!calc}
              className="w-full sm:w-auto rounded-md bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Calculate break-even price
            </button>
          </div>
        </section>

        {/* Results */}
        {hasResult && calc && (
          <section className="rounded-xl border bg-card p-6 sm:p-8 mb-10 animate-in fade-in duration-300">
            {/* Key numbers */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8 pb-6 border-b">
              <div className="text-center rounded-lg bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                  Break-even price
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {fmtDollar(calc.breakEven)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Zero profit at this price
                </p>
              </div>
              <div className="text-center rounded-lg bg-primary/5 border border-primary/20 p-4">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                  Target price ({targetMarginPct}% ROI)
                </p>
                <p className="text-3xl font-bold tabular-nums text-primary">
                  {fmtDollar(calc.targetPrice)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtDollar(calc.targetProfit)} profit per sale
                </p>
              </div>
            </div>

            {/* Price ladder */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Profit at different price points
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-2 font-medium">Sale price</th>
                      <th className="pb-2 font-medium text-right">
                        Net profit
                      </th>
                      <th className="pb-2 font-medium text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calc.ladder.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 tabular-nums">
                          {fmtDollar(row.price)}
                        </td>
                        <td
                          className={`py-2 text-right tabular-nums font-medium ${
                            row.profit < 0
                              ? "text-destructive"
                              : row.profit === 0
                                ? "text-muted-foreground"
                                : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {row.profit >= 0 ? "+" : ""}
                          {fmtDollar(row.profit)}
                        </td>
                        <td
                          className={`py-2 text-right tabular-nums ${
                            row.roi < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {fmtPct(row.roi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assumptions */}
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
              Assumes {fmtPct(calc.fee)} marketplace fee and {calc.R}% return
              rate. Returns modeled as full sale price refunded; shipping paid
              on both original and return. Estimates only.
            </p>

            {/* Signup CTA */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mt-4">
              <p className="font-medium text-sm mb-1">
                Manage your inventory automatically →
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                UnifyOne syncs products across eBay, Etsy, and your own
                storefront. Track revenue, fees, and margins in one dashboard.
              </p>
              <Link
                href="/register"
                onClick={() =>
                  trackToolUsage("reseller-break-even", "signup_cta")
                }
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create free account
              </Link>
            </div>
          </section>
        )}

        {/* Educational prose */}
        <section className="mb-10 space-y-4">
          <h2 className="text-xl font-semibold">
            The three costs resellers undercount
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Platform fees</strong> are
            visible but often misunderstood. eBay's 13.25% applies to the total
            transaction including shipping — so if you charge $5 shipping, eBay
            still takes 13.25% of that $5. Many resellers calculate fees only on
            the item price and lose margin.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Shipping costs</strong> have
            climbed steadily. Ground shipping for a 1-lb package now costs $5–$9
            depending on zone. Free shipping listings convert better but must
            absorb the full cost. Use a realistic shipping estimate, not your
            best-case rate.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Returns</strong> are the
            invisible cost. A 5% return rate on a $40 item means 1 in 20 sales
            generates no revenue but still cost you time, shipping, and
            restocking. Electronics and clothing regularly see 10–20% return
            rates. Price them in or get surprised.
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
            Sync inventory across every marketplace
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            UnifyOne connects your product catalog to eBay, Etsy, and your own
            storefront — with unified revenue reporting and margin tracking.
          </p>
          <Link
            href="/register"
            onClick={() => trackToolUsage("reseller-break-even", "signup_cta")}
            className="inline-flex items-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create free account
          </Link>
        </section>
      </ToolLayout>
    </>
  );
}
