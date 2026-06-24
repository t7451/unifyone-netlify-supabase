import { useState } from "react";
import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/siteConfig";
import {
  GIG_PLAN_CATALOG,
  getGigAnnualSubtext,
  getGigMonthlyLabel,
} from "@shared/gigPricing";

const CANONICAL = `${SITE_URL}/pricing`;
const DESCRIPTION =
  "Pricing for gig and 1099 workers — Free forever (shift tracker, mileage log, tax calculators) or Pro at $4.99/mo for unlimited history and a year-round tax dashboard.";

// Per-tier Offers derived from the gig plan catalog (shared/gigPricing.ts),
// so structured-data prices stay in lockstep with the rendered pricing cards.
// Never hard-code prices here.
const PLAN_OFFERS = GIG_PLAN_CATALOG.map(plan => ({
  "@type": "Offer",
  name: plan.name,
  description: plan.features.join(", "),
  price: String(plan.monthlyPriceCents / 100),
  priceCurrency: "USD",
  availability: "https://schema.org/InStock",
  category: plan.monthlyPriceCents === 0 ? "free" : "subscription",
  url: CANONICAL,
}));

// Lowest / highest monthly price across the gig tiers (in dollars).
const LOW_PRICE = String(
  Math.min(...GIG_PLAN_CATALOG.map(plan => plan.monthlyPriceCents)) / 100
);
const HIGH_PRICE = String(
  Math.max(...GIG_PLAN_CATALOG.map(plan => plan.monthlyPriceCents)) / 100
);

const FAQ = [
  {
    q: "Is the Free plan really free forever?",
    a: "Yes. Shift tracking, mileage logging at the IRS rate, the tax calculators (self-employment, quarterly estimates, mileage), and 25 AI requests a month are free forever — no credit card required.",
  },
  {
    q: "What do I get when I upgrade to Pro?",
    a: "Pro is $4.99/mo ($49/year — save ~18%). It includes everything in Free plus unlimited saved history, a year-round tax dashboard, priority support, and 250 AI requests per month.",
  },
  {
    q: "What are the AI requests for?",
    a: "AI requests power the Kai assistant and the AI tax and earnings tools as they ship. Free includes 25 a month, Pro includes 250. New AI tools are included on Pro when they launch — at no extra charge.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancellation takes effect at the end of your current billing period, and your shift history, mileage, and tax data are never deleted. You can stay on Free for as long as you like.",
  },
  {
    q: "Do you support quarterly estimated taxes and mileage deductions?",
    a: "Yes. The tax calculators handle self-employment tax, quarterly estimated payments, and IRS-rate mileage deductions on every plan, including Free. Pro adds a year-round dashboard so the numbers stay current all year.",
  },
  {
    q: "Which gig platforms does this work with?",
    a: "Any 1099 work — rideshare, delivery, courier, freelance, and more. You log shifts and miles in one place no matter how many apps you drive for, so your earnings and tax picture stay unified.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "Pricing | UnifyOne",
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "UnifyOne",
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Gig Worker Earnings & Tax",
    operatingSystem: "Web",
    url: CANONICAL,
    description:
      "UnifyOne helps gig and 1099 workers track earnings, log IRS-rate mileage, and stay ahead of quarterly estimated taxes in one place.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: LOW_PRICE,
      highPrice: HIGH_PRICE,
      offerCount: PLAN_OFFERS.length,
      availability: "https://schema.org/InStock",
      url: CANONICAL,
      offers: PLAN_OFFERS,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      { "@type": "ListItem", position: 2, name: "Pricing", item: CANONICAL },
    ],
  },
];

export default function Pricing() {
  const tiersRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <PublicLayout>
      <PageHead
        title="Pricing | UnifyOne"
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />

      {/* Hero */}
      <section
        className="apex-light"
        style={{ paddingTop: "8rem", paddingBottom: "4rem" }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
          <div className="inscription mb-6" style={{ color: "#D4A843" }}>
            PRICING
          </div>
          <h1
            className="font-cinzel text-4xl sm:text-6xl font-black mb-6"
            style={{ color: "#F0E8D0" }}
          >
            Know what you earn. Owe nothing by surprise.
          </h1>
          <p
            className="font-crimson text-lg sm:text-xl mx-auto"
            style={{ color: "#6A6A6A", fontStyle: "italic", maxWidth: 560 }}
          >
            Built for gig and 1099 workers. Track every shift and mile, and stay
            ahead of self-employment and quarterly taxes. Start free — upgrade
            to Pro for $4.99/mo when you want the whole year handled.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ paddingBottom: "5rem" }}>
        <div ref={tiersRef} className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="flex justify-center mb-8">
            <div
              className="inline-flex items-center p-1"
              style={{
                border: "1px solid rgba(212,168,67,0.25)",
                borderRadius: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className="px-4 py-2 font-cinzel text-sm transition-colors"
                style={{
                  backgroundColor:
                    billing === "monthly" ? "#D4A843" : "transparent",
                  color: billing === "monthly" ? "#020202" : "#6A6A6A",
                  borderRadius: 4,
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className="px-4 py-2 font-cinzel text-sm transition-colors"
                style={{
                  backgroundColor:
                    billing === "annual" ? "#D4A843" : "transparent",
                  color: billing === "annual" ? "#020202" : "#6A6A6A",
                  borderRadius: 4,
                }}
              >
                <span>Annual</span>
                <span
                  className="ml-2 font-crimson text-sm"
                  style={{
                    color: billing === "annual" ? "#020202" : "#6EE7B7",
                  }}
                >
                  — Save ~18%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {GIG_PLAN_CATALOG.map((tier, i) => {
              const showAnnual =
                billing === "annual" && tier.yearlyPriceCents > 0;
              const displayedPrice = getGigMonthlyLabel(
                tier,
                showAnnual ? "yearly" : "monthly"
              );
              const isFree = tier.monthlyPriceCents === 0;
              const displayedPeriod = isFree
                ? "forever"
                : showAnnual
                  ? "per month, billed annually"
                  : "per month";
              const annualSubtext = showAnnual
                ? getGigAnnualSubtext(tier)
                : null;
              const isLast = i === GIG_PLAN_CATALOG.length - 1;

              return (
                <div
                  key={tier.slug}
                  data-reveal
                  data-reveal-delay={String(i * 100)}
                  className="relative p-8 sm:p-10 transition-all duration-300"
                  style={{
                    backgroundColor: tier.highlight ? "#0A0A0A" : "#020202",
                    border: tier.highlight
                      ? "1px solid rgba(212,168,67,0.4)"
                      : "1px solid #242424",
                    borderRight: !isLast
                      ? tier.highlight
                        ? "1px solid rgba(212,168,67,0.4)"
                        : "1px solid #242424"
                      : undefined,
                    boxShadow: tier.highlight
                      ? "0 0 60px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.2)"
                      : "none",
                  }}
                >
                  {tier.highlight && tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="inscription px-3 py-1"
                        style={{ backgroundColor: "#D4A843", color: "#020202" }}
                      >
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  <div
                    className="inscription mb-6"
                    style={{ color: "rgba(212,168,67,0.5)" }}
                  >
                    {tier.name.toUpperCase()}
                  </div>

                  <div className="mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-cinzel text-4xl font-black"
                        style={{
                          color: tier.highlight ? "#F0D080" : "#F0E8D0",
                        }}
                      >
                        {displayedPrice}
                      </span>
                      {showAnnual && (
                        <span
                          className="inscription px-2 py-1"
                          style={{
                            backgroundColor: "rgba(212,168,67,0.12)",
                            border: "1px solid rgba(212,168,67,0.35)",
                            borderRadius: 999,
                            color: "#D4A843",
                          }}
                        >
                          2 months free
                        </span>
                      )}
                    </div>
                    <span
                      className="font-crimson text-sm"
                      style={{ color: "#5A5A5A" }}
                    >
                      / {displayedPeriod}
                    </span>
                    {annualSubtext && (
                      <div
                        className="font-crimson text-sm mt-2"
                        style={{ color: "#5A5A5A" }}
                      >
                        {annualSubtext}
                      </div>
                    )}
                  </div>

                  <p
                    className="font-crimson text-base mb-8"
                    style={{ color: "#5A5A5A", fontStyle: "italic" }}
                  >
                    {tier.description}
                  </p>

                  <div className="space-y-3 mb-10">
                    {tier.features.map(f => (
                      <div key={f} className="flex items-center gap-3">
                        <div
                          className="w-3 h-px shrink-0"
                          style={{ backgroundColor: "#D4A843" }}
                        />
                        <span
                          className="font-crimson text-sm"
                          style={{ color: "#6A6A6A" }}
                        >
                          {f}
                        </span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={
                      isFree
                        ? getSignupUrl(undefined, "/gig-command")
                        : getSignupUrl(undefined, "/gig-worker-plans")
                    }
                    className={
                      tier.highlight
                        ? "btn-illuminate block text-center"
                        : "btn-ghost-gold block text-center"
                    }
                  >
                    {tier.cta}
                  </a>
                  {!isFree && (
                    <p
                      className="font-crimson text-xs text-center mt-3"
                      style={{ color: "#4A4A4A" }}
                    >
                      14-day full refund · cancel anytime
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section
        style={{
          borderTop: "1px solid #1A1A1A",
          borderBottom: "1px solid #242424",
          padding: "2rem 0",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{
                  border: "1px solid rgba(110,231,183,0.3)",
                  color: "#6EE7B7",
                }}
              >
                <span style={{ fontSize: "1rem" }}>✓</span>
              </div>
              <div>
                <p
                  className="font-cinzel text-xs font-bold"
                  style={{ color: "#F0E8D0", letterSpacing: "0.1em" }}
                >
                  FREE FOREVER
                </p>
                <p
                  className="font-crimson text-xs"
                  style={{ color: "#5A5A5A" }}
                >
                  Track shifts, miles, and taxes free. No card required.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{
                  border: "1px solid rgba(212,168,67,0.3)",
                  color: "#D4A843",
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>⚡</span>
              </div>
              <div>
                <p
                  className="font-cinzel text-xs font-bold"
                  style={{ color: "#F0E8D0", letterSpacing: "0.1em" }}
                >
                  IRS-RATE MILEAGE &amp; TAX TOOLS
                </p>
                <p
                  className="font-crimson text-xs"
                  style={{ color: "#5A5A5A" }}
                >
                  Self-employment, quarterly, and mileage — on every plan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{
                  border: "1px solid rgba(147,197,253,0.3)",
                  color: "#93C5FD",
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>🔒</span>
              </div>
              <div>
                <p
                  className="font-cinzel text-xs font-bold"
                  style={{ color: "#F0E8D0", letterSpacing: "0.1em" }}
                >
                  YOUR DATA STAYS YOURS
                </p>
                <p
                  className="font-crimson text-xs"
                  style={{ color: "#5A5A5A" }}
                >
                  Your earnings and tax history are never deleted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="cathedral-bg"
        style={{
          borderTop: "1px solid #242424",
          padding: "5rem 0",
        }}
      >
        <div ref={faqRef} className="max-w-3xl mx-auto px-6 sm:px-8">
          <div
            className="inscription mb-6 text-center"
            style={{ color: "#D4A843" }}
          >
            FREQUENTLY ASKED
          </div>
          <h2
            className="font-cinzel text-3xl font-black mb-12 text-center"
            style={{ color: "#F0E8D0" }}
          >
            Questions before you start
          </h2>
          <div className="space-y-6">
            {FAQ.map((item, i) => (
              <div
                key={item.q}
                data-reveal
                data-reveal-delay={String(i * 80)}
                className="p-6"
                style={{ border: "1px solid #242424" }}
              >
                <h3
                  className="font-cinzel text-base font-700 mb-3"
                  style={{ color: "#F0E8D0" }}
                >
                  {item.q}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#6A6A6A" }}
                >
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ borderTop: "1px solid #242424" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-16 text-center">
          <p
            className="font-crimson text-base mb-6"
            style={{ color: "#6A6A6A" }}
          >
            Still deciding? Try the{" "}
            <Link href="/tools">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                free tax &amp; mileage tools
              </span>
            </Link>{" "}
            or{" "}
            <Link href="/contact">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                talk to us
              </span>
            </Link>
            .
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
