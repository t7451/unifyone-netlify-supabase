import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { TIERS } from "@/content/pricing";
import { getSignupUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/siteConfig";
import { PLAN_CATALOG } from "@shared/pricing";

const CANONICAL = `${SITE_URL}/pricing`;

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "Pricing | UnifyOne",
    description:
      "Three plans for every stage — Starter (free forever), Pro ($19/mo), Scale ($99/mo). Every tier runs on the same tenant-safe billing and checkout infrastructure.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
    breadcrumb: {
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

const FAQ = [
  {
    q: "Can I switch tiers later?",
    a: "Yes — upgrades and downgrades are prorated. Changes take effect immediately and your existing tenants, products, and orders are preserved.",
  },
  {
    q: "What payment methods do you support?",
    a: "Stripe and PayPal on every tier. Square and bank transfer are available on Pro and Scale. Webhooks are verified, idempotent, and fire into your automation layer.",
  },
  {
    q: "Is there a free trial on paid tiers?",
    a: "The Starter tier is free forever and uses the same infrastructure. When you're ready, upgrade in one click — no migration, no data loss.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — full refund within 14 days of any paid tier purchase, no questions asked.",
  },
  {
    q: "What is multi-tenant management on the Scale tier?",
    a: "Scale lets you manage unlimited independent stores (tenants) from one dashboard — each with isolated data, branding, and billing. Ideal for agencies, franchises, and white-label resellers.",
  },
  {
    q: "How does Kai unified API pricing work?",
    a: "Each tier includes a monthly Kai credit allocation that works across all supported models. You pay one unified overage rate per credit on your tier, instead of separate model-vendor bills.",
  },
  {
    q: "Do different AI models have different prices?",
    a: "No. Kai uses unified credit pricing across models, so your bill stays predictable even when you route prompts between Claude, GPT, Gemini, and other providers.",
  },
];

export default function Pricing() {
  const tiersRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <PublicLayout>
      <Helmet>
        <title>Pricing | UnifyOne</title>
        <meta
          name="description"
          content="Three plans for every stage — Starter (free forever), Pro ($19/mo), Scale ($99/mo). All share the same tenant-safe billing and checkout infrastructure."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Pricing | UnifyOne" />
        <meta
          property="og:description"
          content="Three plans for every stage — Starter (free forever), Pro ($19/mo), Scale ($99/mo). Start free, then upgrade without migrating tenants or billing data."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

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
            Built like the rest of the cathedral.
          </h1>
          <p
            className="font-crimson text-lg sm:text-xl mx-auto"
            style={{ color: "#6A6A6A", fontStyle: "italic", maxWidth: 520 }}
          >
            Clear, structural, no surprises. One unified Kai cost across any
            model. Start free, scale when your usage grows.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ paddingBottom: "5rem" }}>
        <div ref={tiersRef} className="max-w-7xl mx-auto px-6 sm:px-8">
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
                  — Save 17%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {TIERS.map((tier, i) => {
              const showAnnual =
                billing === "annual" && Boolean(tier.annualPrice);
              const displayedPrice = showAnnual ? tier.annualPrice : tier.price;
              const displayedPeriod = showAnnual
                ? tier.annualPeriod
                : tier.period;

              return (
                <div
                  key={tier.id}
                  data-reveal
                  data-reveal-delay={String(i * 100)}
                  className="relative p-8 sm:p-10 transition-all duration-300"
                  style={{
                    backgroundColor: tier.highlight ? "#0A0A0A" : "#020202",
                    border: tier.highlight
                      ? "1px solid rgba(212,168,67,0.4)"
                      : "1px solid #242424",
                    borderRight:
                      i < 2
                        ? tier.highlight
                          ? "1px solid rgba(212,168,67,0.4)"
                          : "1px solid #242424"
                        : undefined,
                    boxShadow: tier.highlight
                      ? "0 0 60px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.2)"
                      : "none",
                  }}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="inscription px-3 py-1"
                        style={{ backgroundColor: "#D4A843", color: "#020202" }}
                      >
                        Most Chosen
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
                    {showAnnual && tier.annualSubtext && (
                      <div
                        className="font-crimson text-sm mt-2"
                        style={{ color: "#5A5A5A" }}
                      >
                        {tier.annualSubtext}
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
                    href={getSignupUrl(undefined, `/checkout?plan=${tier.id}`)}
                    className={
                      tier.highlight
                        ? "btn-illuminate block text-center"
                        : "btn-ghost-gold block text-center"
                    }
                  >
                    {tier.cta}
                  </a>
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
                  14-DAY MONEY-BACK GUARANTEE
                </p>
                <p
                  className="font-crimson text-xs"
                  style={{ color: "#5A5A5A" }}
                >
                  Full refund on any paid tier. No questions asked.
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
                  PAYMENTS VIA STRIPE &amp; PAYPAL
                </p>
                <p
                  className="font-crimson text-xs"
                  style={{ color: "#5A5A5A" }}
                >
                  Secure checkout. Verified webhooks. Instant access.
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
                  TENANT DATA ISOLATION
                </p>
                <p
                  className="font-crimson text-xs"
                  style={{ color: "#5A5A5A" }}
                >
                  Your data never crosses tenant boundaries.
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
            Questions before you commit
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
            Still deciding? Read about{" "}
            <Link href="/architecture">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                the architecture
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
