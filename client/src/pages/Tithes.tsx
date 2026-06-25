import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";
import {
  GIG_PLAN_CATALOG,
  GIG_PLAN_BY_SLUG,
  getGigAnnualSubtext,
  getGigMonthlyLabel,
} from "@shared/gigPricing";

const CANONICAL = `${SITE_URL}/tithes`;

const DESCRIPTION =
  "UnifyOne for gig & 1099 workers: Gig Starter (free forever) and Gig Pro ($4.99/mo · $49/yr). Track shifts and IRS-rate mileage, calculate self-employment and quarterly taxes, and keep the whole year handled.";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "Tithes — Pricing | UnifyOne",
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Tithes", item: CANONICAL },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "UnifyOne Gig Plans",
    url: CANONICAL,
    itemListElement: GIG_PLAN_CATALOG.map((plan, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Offer",
        name: plan.name,
        description: plan.features.join(", "),
        price: String(plan.monthlyPriceCents / 100),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: CANONICAL,
      },
    })),
  },
];

const CATHEDRAL_CTA_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-cta-v2-SHGs9wAatFAKqbC6k4GcCb.webp";

const TIERS = GIG_PLAN_CATALOG.map(plan => ({
  id: plan.slug,
  name: plan.name,
  isFree: plan.monthlyPriceCents === 0,
  period: plan.monthlyPriceCents === 0 ? "forever" : "per month",
  description: plan.tagline,
  features: plan.features,
  cta: plan.cta,
  highlight: plan.highlight,
  badge: plan.badge,
}));

const STARTER = GIG_PLAN_BY_SLUG["gig-starter"];
const PRO = GIG_PLAN_BY_SLUG["gig-pro"];

const COMPARISON = [
  {
    feature: "Shift tracker (GigIQ)",
    starter: "✓",
    pro: "✓",
  },
  {
    feature: "Mileage log (IRS rate)",
    starter: "✓",
    pro: "✓",
  },
  {
    feature: "Tax Autopilot (SE, quarterly, mileage)",
    starter: "✓",
    pro: "✓",
  },
  {
    feature: "Money Manager",
    starter: "✓",
    pro: "✓",
  },
  {
    feature: "Kai AI requests / month",
    starter: STARTER.monthlyAIRequests.toLocaleString("en-US"),
    pro: PRO.monthlyAIRequests.toLocaleString("en-US"),
  },
  {
    feature: "Saved history",
    starter: "Recent",
    pro: "Unlimited",
  },
  {
    feature: "Year-round tax dashboard",
    starter: "—",
    pro: "✓",
  },
  {
    feature: "New AI tools when they ship",
    starter: "—",
    pro: "✓",
  },
  {
    feature: "Support",
    starter: "Community",
    pro: "Priority",
  },
];

const FAQ = [
  {
    q: "Is the Gig Starter plan really free forever?",
    a: "Yes. Shift tracking, IRS-rate mileage logging, the tax calculators (self-employment, quarterly estimates, mileage), and 25 Kai AI requests a month are free forever — no credit card required.",
  },
  {
    q: "What do I get when I upgrade to Gig Pro?",
    a: "Gig Pro is $4.99/month ($49/year — save ~18%). It includes everything in Free plus unlimited saved history, a year-round tax dashboard, priority support, and 250 Kai AI requests per month.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. Your shift, mileage, and tax data is never deleted when you downgrade — you simply lose access to features above your new tier.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Subscription billing for Gig Pro runs through Stripe Checkout. The Gig Starter plan never asks for a card.",
  },
  {
    q: "What are the Kai AI requests for?",
    a: "Kai requests power the Kai assistant and the AI tax and earnings tools as they ship. Free includes 25 a month, Pro includes 250. New AI tools are included on Pro when they launch — at no extra charge.",
  },
  {
    q: "Do you handle quarterly estimated taxes and mileage deductions?",
    a: "Yes. Tax Autopilot handles self-employment tax, quarterly estimated payments, and IRS-rate mileage deductions on every plan, including Free. Gig Pro adds a year-round dashboard so the numbers stay current all year.",
  },
  {
    q: "Which gig platforms does this work with?",
    a: "Any 1099 work — rideshare, delivery, courier, freelance, and more. You log shifts and miles in one place no matter how many apps you drive for, so your earnings and tax picture stay unified.",
  },
  {
    q: "How does the yearly discount work?",
    a: "Yearly billing on Gig Pro is $49/year instead of $4.99/month — about two months free, a savings of roughly 18%.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Cancel from the billing page in your dashboard settings. Your subscription remains active until the end of the current billing period, and your data is never deleted. No cancellation fees, no retention flows, no dark patterns.",
  },
];

export default function Tithes() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PublicLayout>
      <Helmet>
        <title>Tithes — Pricing | UnifyOne</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Tithes — Pricing | UnifyOne" />
        <meta
          property="og:description"
          content="Gig Starter is free forever; Gig Pro is $4.99/mo for unlimited history and a year-round tax dashboard. Built for gig & 1099 workers."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Tithes — Pricing | UnifyOne" />
        <meta
          name="twitter:description"
          content="Track shifts, mileage, and taxes free — upgrade to Gig Pro for $4.99/mo when you want the whole year handled."
        />
        {JSON_LD.map((schema, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="tithes-heading"
        className="relative pt-32 pb-24 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${CATHEDRAL_CTA_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.2,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,2,2,0.4) 0%, rgba(2,2,2,0.7) 60%, #020202 100%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-6">Tithes & Offerings</span>
          <h1
            id="tithes-heading"
            className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.05,
              letterSpacing: "0.01em",
            }}
          >
            Tithes
          </h1>
          <p
            className="font-crimson text-xl sm:text-2xl max-w-2xl mx-auto"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            Two plans for gig &amp; 1099 workers. Start free and keep what you
            earn — upgrade when you want the whole year handled.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span
              className="font-cinzel text-xs tracking-widest"
              style={{
                color: yearly ? "#3A3A3A" : "#D4A843",
                letterSpacing: "0.15em",
              }}
            >
              MONTHLY
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              aria-label="Bill yearly (2 months free)"
              onClick={() => setYearly(!yearly)}
              className="relative w-12 h-6 transition-colors duration-300"
              style={{
                backgroundColor: yearly
                  ? "rgba(212,168,67,0.3)"
                  : "rgba(212,168,67,0.1)",
                border: "1px solid rgba(212,168,67,0.3)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute top-0.5 w-5 h-5 transition-all duration-300"
                style={{
                  backgroundColor: "#D4A843",
                  left: yearly ? "calc(100% - 1.375rem)" : "2px",
                }}
              />
            </button>
            <span
              className="font-cinzel text-xs tracking-widest"
              style={{
                color: yearly ? "#D4A843" : "#3A3A3A",
                letterSpacing: "0.15em",
              }}
            >
              YEARLY{" "}
              <span style={{ color: "rgba(212,168,67,0.6)" }}>
                (2 MONTHS FREE)
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ── PRICING TIERS ───────────────────────────────────────────────── */}
      <section
        aria-label="Pricing plans"
        className="py-16"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {TIERS.map((tier, i) => {
              const plan = GIG_PLAN_BY_SLUG[tier.id];
              const showAnnual = yearly && !tier.isFree;
              const displayedPrice = getGigMonthlyLabel(
                plan,
                showAnnual ? "yearly" : "monthly"
              );
              const annualSubtext = showAnnual
                ? getGigAnnualSubtext(plan)
                : null;

              return (
                <div
                  key={tier.id}
                  className="p-10 relative"
                  style={{
                    borderTop: tier.highlight
                      ? "2px solid #D4A843"
                      : "1px solid rgba(212,168,67,0.08)",
                    borderLeft:
                      i > 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                    backgroundColor: tier.highlight
                      ? "rgba(212,168,67,0.04)"
                      : "transparent",
                  }}
                >
                  {tier.badge && (
                    <div
                      className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1"
                      style={{ backgroundColor: "#D4A843" }}
                    >
                      <span
                        className="font-cinzel text-xs font-700 tracking-widest"
                        style={{ color: "#020202", letterSpacing: "0.15em" }}
                      >
                        {tier.badge}
                      </span>
                    </div>
                  )}
                  <span className="inscription block mb-2">
                    {tier.description}
                  </span>
                  <h2
                    className="font-cinzel text-2xl font-black mb-4"
                    style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
                  >
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className="font-cinzel text-5xl font-black"
                      style={{ color: tier.highlight ? "#D4A843" : "#F0E8D0" }}
                    >
                      {displayedPrice}
                    </span>
                    {!tier.isFree && (
                      <span
                        className="font-crimson text-sm"
                        style={{ color: "#3A3A3A" }}
                      >
                        {tier.period}
                      </span>
                    )}
                  </div>
                  {annualSubtext && (
                    <p
                      className="font-crimson text-sm mb-6"
                      style={{ color: "#5A5A5A" }}
                    >
                      Billed annually · {annualSubtext}
                    </p>
                  )}
                  <div
                    className="h-px my-6"
                    style={{ backgroundColor: "rgba(212,168,67,0.08)" }}
                  />
                  <div className="space-y-3 mb-8">
                    {tier.features.map((feature, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div
                          className="w-1 h-1 mt-2 shrink-0"
                          style={{ backgroundColor: "#D4A843" }}
                        />
                        <span
                          className="font-crimson text-base"
                          style={{ color: "#9A9A9A" }}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={
                      tier.isFree
                        ? getSignupUrl(undefined, "/gig-command")
                        : getSignupUrl(undefined, "/gig-worker-plans")
                    }
                    className={
                      tier.highlight
                        ? "btn-illuminate block text-center"
                        : "btn-ghost-gold block text-center"
                    }
                    style={{ padding: "0.875rem 1.5rem" }}
                  >
                    {tier.cta}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ────────────────────────────────────────────── */}
      <section
        aria-labelledby="comparison-heading"
        className="py-24"
        style={{
          borderTop: "1px solid rgba(212,168,67,0.06)",
          backgroundColor: "rgba(212,168,67,0.015)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Feature Matrix</span>
            <h2
              id="comparison-heading"
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              Full Comparison
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <caption className="sr-only">
                Feature comparison across the Gig Starter and Gig Pro plans
              </caption>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,168,67,0.15)" }}>
                  <th
                    scope="col"
                    className="text-left py-4 pr-8 font-cinzel text-xs tracking-widest"
                    style={{
                      color: "#3A3A3A",
                      letterSpacing: "0.15em",
                      width: "50%",
                    }}
                  >
                    FEATURE
                  </th>
                  {["Gig Starter", "Gig Pro"].map(name => (
                    <th
                      key={name}
                      scope="col"
                      className="text-center py-4 px-4 font-cinzel text-xs tracking-widest"
                      style={{
                        color: name === "Gig Pro" ? "#D4A843" : "#5A5A5A",
                        letterSpacing: "0.15em",
                      }}
                    >
                      {name.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid rgba(212,168,67,0.04)" }}
                  >
                    <th
                      scope="row"
                      className="text-left py-4 pr-8 font-crimson text-sm font-normal"
                      style={{ color: "#7A7A7A" }}
                    >
                      {row.feature}
                    </th>
                    {[row.starter, row.pro].map((val, j) => (
                      <td
                        key={j}
                        className="text-center py-4 px-4 font-crimson text-sm"
                        style={{
                          color:
                            val === "—"
                              ? "#2A2A2A"
                              : val === "✓"
                                ? "#D4A843"
                                : "#9A9A9A",
                        }}
                      >
                        {val === "✓" ? (
                          <>
                            <span aria-hidden="true">✓</span>
                            <span className="sr-only">Included</span>
                          </>
                        ) : val === "—" ? (
                          <>
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">Not included</span>
                          </>
                        ) : (
                          val
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="tithes-faq-heading"
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Common Questions</span>
            <h2
              id="tithes-faq-heading"
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              The Codex
            </h2>
          </div>
          <div className="space-y-0">
            {FAQ.map((item, i) => (
              <div
                key={i}
                style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
              >
                <button
                  type="button"
                  aria-expanded={openFaq === i}
                  aria-controls={`tithes-faq-answer-${i}`}
                  id={`tithes-faq-question-${i}`}
                  className="w-full text-left py-6 flex items-start justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="font-cinzel text-sm font-600"
                    style={{
                      color: openFaq === i ? "#D4A843" : "#F0E8D0",
                      letterSpacing: "0.05em",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-cinzel text-lg shrink-0 mt-0.5"
                    style={{ color: "#D4A843" }}
                  >
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div
                    id={`tithes-faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`tithes-faq-question-${i}`}
                    className="pb-6"
                  >
                    <p
                      className="font-crimson text-base"
                      style={{ color: "#7A7A7A", lineHeight: 1.8 }}
                    >
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section
        aria-labelledby="tithes-cta-heading"
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Begin Your Ledger</span>
          <h2
            id="tithes-cta-heading"
            className="font-cinzel text-3xl sm:text-4xl font-bold mb-6"
            style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
          >
            Start Free.
            <br />
            Upgrade When Ready.
          </h2>
          <p
            className="font-crimson text-xl mb-10"
            style={{ color: "#9A9A9A", fontStyle: "italic" }}
          >
            Gig Starter is free forever. No credit card. Track every shift and
            mile and stay ahead of your taxes — upgrade to Gig Pro when you want
            the whole year handled.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getSignupUrl()} className="btn-illuminate">
              Start Free
            </a>
            <Link href="/tools">
              <span className="btn-ghost-gold cursor-pointer">
                Try the Free Tax &amp; Mileage Tools →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
