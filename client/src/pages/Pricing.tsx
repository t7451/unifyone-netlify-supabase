import { Link } from "wouter";
import { TIERS } from "@/content/pricing";
import { getLoginUrl } from "@/const";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/pricing`;
const PRICING_JSON_LD = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Pricing | UnifyOne",
    description:
      "Three plans for every stage — Acolyte (free forever), Architect ($49/mo), Cathedral ($149/mo). All plans include multi-tenant commerce infrastructure.",
    breadcrumbs: [{ name: "Pricing", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "UnifyOne Pricing Plans",
    url: CANONICAL,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "Offer",
          name: "Acolyte",
          description:
            "Free forever. 1 store, 50 products, 100 orders/month, 2 team members. Stripe + PayPal rails.",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: CANONICAL,
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "Offer",
          name: "Architect",
          description:
            "$49/month. 5 stores, 500 products, unlimited orders, 10 team members, Manus AI, social suite, referral engine.",
          price: "49",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: CANONICAL,
        },
      },
      {
        "@type": "ListItem",
        position: 3,
        item: {
          "@type": "Offer",
          name: "Cathedral",
          description:
            "$149/month. Unlimited stores and products, unlimited team members, white-label, SLA, dedicated support.",
          price: "149",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: CANONICAL,
        },
      },
    ],
  },
];

const FAQ = [
  {
    q: "Can I switch tiers later?",
    a: "Yes — upgrades and downgrades are prorated. Changes take effect immediately and your existing tenants, products, and orders are preserved.",
  },
  {
    q: "What payment methods do you support?",
    a: "Stripe and PayPal on every tier. Square and bank transfer are available on Architect and Cathedral. Webhooks are verified, idempotent, and fire into your automation layer.",
  },
  {
    q: "Is there a free trial on paid tiers?",
    a: "The Acolyte tier is free forever and uses the same infrastructure. When you're ready, upgrade in one click — no migration, no data loss.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — full refund within 14 days of any paid tier purchase, no questions asked.",
  },
];

export default function Pricing() {
  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <PageHead
        title="Pricing | UnifyOne"
        description="Three plans for every stage — Acolyte (free forever), Architect ($49/mo), Cathedral ($149/mo). All include multi-tenant commerce infrastructure and AI-powered earnings insights."
        canonical={CANONICAL}
        jsonLd={PRICING_JSON_LD}
      />
      <header className="border-b" style={{ borderColor: "#242424" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <span
              className="cursor-pointer font-cinzel text-sm font-700"
              style={{ color: "#D4A843", letterSpacing: "0.2em" }}
            >
              UNIFYONE
            </span>
          </Link>
          <Link href="/">
            <span
              className="cursor-pointer font-cinzel text-xs"
              style={{ color: "#5A5A5A", letterSpacing: "0.2em" }}
            >
              ← BACK TO HOME
            </span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 sm:px-8 pt-24 pb-16 text-center">
        <div
          className="font-cinzel text-xs mb-6"
          style={{ color: "#D4A843", letterSpacing: "0.3em" }}
        >
          PRICING
        </div>
        <h1
          className="font-cinzel text-4xl sm:text-6xl font-black mb-6"
          style={{ color: "#F0E8D0" }}
        >
          Built like the rest of the cathedral.
        </h1>
        <p
          className="font-crimson text-lg sm:text-xl max-w-2xl mx-auto"
          style={{ color: "#8A8A8A", fontStyle: "italic" }}
        >
          Clear, structural, no surprises. Start free. Upgrade when the walls
          are ready to bear weight.
        </p>
      </section>

      {/* Tiers */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {TIERS.map((tier, i) => (
            <div
              key={tier.id}
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
                className="font-cinzel text-xs font-600 mb-6"
                style={{
                  color: "rgba(212,168,67,0.4)",
                  letterSpacing: "0.3em",
                }}
              >
                {tier.name.toUpperCase()}
              </div>
              <div className="mb-2">
                <span
                  className="font-cinzel text-4xl font-black"
                  style={{ color: tier.highlight ? "#F0D080" : "#F0E8D0" }}
                >
                  {tier.price}
                </span>
                <span
                  className="font-crimson text-sm ml-2"
                  style={{ color: "#5A5A5A" }}
                >
                  / {tier.period}
                </span>
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
                href={`${getLoginUrl()}?next=${encodeURIComponent(`/checkout?plan=${tier.id}`)}`}
                className={
                  tier.highlight
                    ? "btn-illuminate block text-center"
                    : "btn-ghost-gold block text-center"
                }
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 sm:px-8 pb-24">
        <div
          className="font-cinzel text-xs mb-6 text-center"
          style={{ color: "#D4A843", letterSpacing: "0.3em" }}
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
          {FAQ.map(item => (
            <div
              key={item.q}
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
                style={{ color: "#8A8A8A" }}
              >
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t" style={{ borderColor: "#242424" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-16 text-center">
          <p
            className="font-crimson text-base mb-6"
            style={{ color: "#8A8A8A" }}
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
    </div>
  );
}
