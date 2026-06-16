import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";
import {
  PLAN_CATALOG,
  PLAN_CATALOG_BY_SLUG,
  formatUsdCents,
  getPlanAnnualTotalLabel,
  getPlanNumericLimitLabel,
  getPlanOverageLabel,
  getPlanTenantLimitLabel,
} from "@shared/pricing";

const CANONICAL = `${SITE_URL}/tithes`;

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "Tithes — Pricing | UnifyOne",
    description:
      "UnifyOne pricing: Starter (free forever), Pro ($19/mo), Scale ($99/mo). One canonical plan catalog now drives public pricing and checkout.",
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
    name: "UnifyOne Pricing Plans",
    url: CANONICAL,
    itemListElement: PLAN_CATALOG.map((plan, index) => ({
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

const TIERS = PLAN_CATALOG.map(plan => ({
  id: plan.slug,
  name: plan.name,
  price: {
    monthly: formatUsdCents(plan.monthlyPriceCents),
    yearly: formatUsdCents(plan.yearlyPriceCents),
  },
  period: plan.monthlyPriceCents === 0 ? "forever" : "per month",
  description: plan.description,
  features: plan.features,
  cta: plan.cta,
  highlight: plan.highlight,
  badge: plan.badge,
}));

const STARTER = PLAN_CATALOG_BY_SLUG.starter;
const PRO = PLAN_CATALOG_BY_SLUG.pro;
const SCALE = PLAN_CATALOG_BY_SLUG.scale;

const COMPARISON = [
  {
    feature: "Tenants",
    starter: getPlanTenantLimitLabel(STARTER),
    pro: getPlanTenantLimitLabel(PRO),
    scale: getPlanTenantLimitLabel(SCALE),
  },
  {
    feature: "Products",
    starter: getPlanNumericLimitLabel(STARTER.maxProducts),
    pro: getPlanNumericLimitLabel(PRO.maxProducts),
    scale: getPlanNumericLimitLabel(SCALE.maxProducts),
  },
  {
    feature: "Orders / month",
    starter: getPlanNumericLimitLabel(STARTER.maxOrders),
    pro: getPlanNumericLimitLabel(PRO.maxOrders),
    scale: getPlanNumericLimitLabel(SCALE.maxOrders),
  },
  {
    feature: "Team members",
    starter: getPlanNumericLimitLabel(STARTER.maxUsers),
    pro: getPlanNumericLimitLabel(PRO.maxUsers),
    scale: getPlanNumericLimitLabel(SCALE.maxUsers),
  },
  {
    feature: "Kai credits / month",
    starter: STARTER.kaiCreditsMonthly.toLocaleString("en-US"),
    pro: PRO.kaiCreditsMonthly.toLocaleString("en-US"),
    scale: SCALE.kaiCreditsMonthly.toLocaleString("en-US"),
  },
  {
    feature: "Unified model pricing",
    starter: getPlanOverageLabel(STARTER),
    pro: getPlanOverageLabel(PRO),
    scale: getPlanOverageLabel(SCALE),
  },
  {
    feature: "Automation Layer",
    starter: "—",
    pro: PRO.includesAutomationLayer ? "✓" : "—",
    scale: SCALE.includesAutomationLayer ? "✓" : "—",
  },
  {
    feature: "Affiliate Suite",
    starter: "—",
    pro: PRO.includesAffiliateSuite ? "✓" : "—",
    scale: SCALE.includesAffiliateSuite ? "✓" : "—",
  },
  {
    feature: "White-label",
    starter: "—",
    pro: PRO.includesWhiteLabel ? "✓" : "—",
    scale: SCALE.includesWhiteLabel ? "✓" : "—",
  },
  {
    feature: "Custom Domains",
    starter: "—",
    pro: PRO.includesCustomDomains ? "✓" : "—",
    scale: SCALE.includesCustomDomains ? "✓" : "—",
  },
  {
    feature: "SLA Guarantee",
    starter: "—",
    pro: PRO.includesSla ? "✓" : "—",
    scale: SCALE.includesSla ? "✓" : "—",
  },
  {
    feature: "API Access",
    starter: STARTER.includesApiAccess ? "✓" : "—",
    pro: PRO.includesApiAccess ? "✓" : "—",
    scale: SCALE.includesApiAccess ? "✓" : "—",
  },
  {
    feature: "Support",
    starter: STARTER.supportLabel,
    pro: PRO.supportLabel,
    scale: SCALE.supportLabel,
  },
];

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "The Starter tier is free forever — no credit card required. You can build your tenant, add products, and process up to 1,000 orders per month at no cost. Upgrade to Pro when your volume or automation requirements exceed the Starter limits.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. Your data is never deleted when you downgrade — you simply lose access to features above your new tier.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All subscription billing runs through Stripe Checkout. Your own storefronts can still use Stripe, PayPal, Square, and Shopify for customer payments.",
  },
  {
    q: "Is Kai AI included in the Pro tier?",
    a: "Yes. Pro includes 500 Kai unified API credits per month, and Scale includes 10,000. Credits work across supported models with one predictable overage rate for the tier.",
  },
  {
    q: "Can we call any model with one Kai cost?",
    a: "Yes. Kai sits on UnifyAI's unified API layer, so your team can route across supported models while staying on one consolidated credit bill instead of managing separate vendor invoices.",
  },
  {
    q: "What does 'white-label ready' mean on Scale?",
    a: "Scale tenants can remove UnifyOne branding, use custom domains, and present the platform as their own product to end customers. It is designed for agencies and resellers building on top of the UnifyOne infrastructure.",
  },
  {
    q: "What is the SLA guarantee?",
    a: "Scale subscribers receive a 99.9% uptime SLA with service credits for downtime exceeding the threshold. Starter and Pro target the same uptime but without contractual SLA obligations.",
  },
  {
    q: "How does the yearly discount work?",
    a: "Yearly billing gives you two months free — Pro drops from $19/month to $190/year, and Scale drops from $99/month to $990/year.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Cancel from the billing page in your dashboard settings. Your subscription remains active until the end of the current billing period. No cancellation fees, no retention flows, no dark patterns.",
  },
];

export default function Tithes() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PublicLayout>
      <Helmet>
        <title>Tithes — Pricing | UnifyOne</title>
        <meta
          name="description"
          content="UnifyOne pricing: Starter (free forever), Pro ($19/mo), Scale ($99/mo). One canonical catalog now drives public pricing and Stripe checkout."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Tithes — Pricing | UnifyOne" />
        <meta
          property="og:description"
          content="Starter, Pro, and Scale now share one canonical pricing model across the marketing site and checkout flow."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Tithes — Pricing | UnifyOne" />
        <meta
          name="twitter:description"
          content="Starter, Pro, and Scale on one shared pricing catalog for marketing, checkout, and Stripe billing."
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
            Three tiers. One plan catalog. No public copy drifting away from the
            billing system.
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
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {TIERS.map((tier, i) => (
              <div
                key={i}
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
                    {yearly ? tier.price.yearly : tier.price.monthly}
                  </span>
                  {tier.price.monthly !== "$0" && (
                    <span
                      className="font-crimson text-sm"
                      style={{ color: "#3A3A3A" }}
                    >
                      {tier.period}
                    </span>
                  )}
                </div>
                {tier.price.monthly !== "$0" && yearly && (
                  <p
                    className="font-crimson text-sm mb-6"
                    style={{ color: "#5A5A5A" }}
                  >
                    Billed annually ·{" "}
                    {getPlanAnnualTotalLabel(PLAN_CATALOG_BY_SLUG[tier.id])}
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
                  href={getSignupUrl(tier.id)}
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
            ))}
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
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
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
                Feature comparison across the Starter, Pro, and Scale plans
              </caption>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,168,67,0.15)" }}>
                  <th
                    scope="col"
                    className="text-left py-4 pr-8 font-cinzel text-xs tracking-widest"
                    style={{
                      color: "#3A3A3A",
                      letterSpacing: "0.15em",
                      width: "40%",
                    }}
                  >
                    FEATURE
                  </th>
                  {["Starter", "Pro", "Scale"].map(name => (
                    <th
                      key={name}
                      scope="col"
                      className="text-center py-4 px-4 font-cinzel text-xs tracking-widest"
                      style={{
                        color: name === "Pro" ? "#D4A843" : "#5A5A5A",
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
                    {[row.starter, row.pro, row.scale].map((val, j) => (
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
          <span className="inscription block mb-4">Begin Construction</span>
          <h2
            id="tithes-cta-heading"
            className="font-cinzel text-3xl sm:text-4xl font-bold mb-6"
            style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
          >
            Start Free.
            <br />
            Scale When Ready.
          </h2>
          <p
            className="font-crimson text-xl mb-10"
            style={{ color: "#9A9A9A", fontStyle: "italic" }}
          >
            The Starter tier is free forever. No credit card. No migration.
            Upgrade when your automation, volume, or white-label needs demand
            it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getSignupUrl()} className="btn-illuminate">
              Begin Construction — Free
            </a>
            <Link href="/architecture">
              <span className="btn-ghost-gold cursor-pointer">
                View Architecture →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
