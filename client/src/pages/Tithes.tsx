import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getLoginUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/tithes`;

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    "url": CANONICAL,
    "name": "Tithes — Pricing | UnifyOne",
    "description": "UnifyOne pricing: Acolyte (free forever), Architect ($49/mo), Cathedral ($149/mo). All plans include multi-tenant commerce infrastructure. Manus AI included in Architect and above.",
    "isPartOf": { "@id": `${SITE_URL}/#website` },
    "inLanguage": "en-US"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Tithes", "item": CANONICAL }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "UnifyOne Pricing Plans",
    "url": CANONICAL,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "Offer",
          "name": "Acolyte",
          "description": "Free forever. 1 store, 50 products, 100 orders/month, 2 team members. Stripe + PayPal rails.",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": CANONICAL
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@type": "Offer",
          "name": "Architect",
          "description": "$49/month. 5 stores, 500 products, unlimited orders, 10 team members, Manus AI, social suite, referral engine.",
          "price": "49",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": CANONICAL
        }
      },
      {
        "@type": "ListItem",
        "position": 3,
        "item": {
          "@type": "Offer",
          "name": "Cathedral",
          "description": "$149/month. Unlimited stores, unlimited products, unlimited orders, unlimited team members, white-label, SLA, dedicated support.",
          "price": "149",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": CANONICAL
        }
      }
    ]
  }
];

const CATHEDRAL_CTA_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-cta-v2-SHGs9wAatFAKqbC6k4GcCb.webp";

const TIERS = [
  {
    name: "Acolyte",
    price: { monthly: "$0", yearly: "$0" },
    period: "forever",
    description: "For builders proving the concept. No credit card required.",
    features: [
      "1 tenant",
      "100 products",
      "500 orders / month",
      "Stripe checkout",
      "Basic analytics",
      "Community support",
    ],
    cta: "Begin Construction",
    highlight: false,
    badge: null,
  },
  {
    name: "Architect",
    price: { monthly: "$49", yearly: "$39" },
    period: "per month",
    description: "For operators running real commerce at scale.",
    features: [
      "5 tenants",
      "Unlimited products",
      "Unlimited orders",
      "All payment rails (Stripe + PayPal + Shopify)",
      "Manus AI included",
      "Automation layer (n8n + Zapier + Mailchimp)",
      "Supabase Realtime",
      "Social commerce suite",
      "Referral engine",
      "Priority support",
    ],
    cta: "Claim Your Nave",
    highlight: true,
    badge: "Most Chosen",
  },
  {
    name: "Cathedral",
    price: { monthly: "$149", yearly: "$119" },
    period: "per month",
    description: "For enterprises building at scale with white-label requirements.",
    features: [
      "Unlimited tenants",
      "White-label ready",
      "Custom domains",
      "SLA guarantee (99.9% uptime)",
      "Dedicated infrastructure",
      "Full API access",
      "Concierge onboarding",
      "Everything in Architect",
    ],
    cta: "Commission the Build",
    highlight: false,
    badge: "Enterprise",
  },
];

const COMPARISON = [
  { feature: "Tenants", acolyte: "1", architect: "5", cathedral: "Unlimited" },
  { feature: "Products", acolyte: "100", architect: "Unlimited", cathedral: "Unlimited" },
  { feature: "Orders / month", acolyte: "500", architect: "Unlimited", cathedral: "Unlimited" },
  { feature: "Stripe Checkout", acolyte: "✓", architect: "✓", cathedral: "✓" },
  { feature: "PayPal + Shopify", acolyte: "—", architect: "✓", cathedral: "✓" },
  { feature: "Manus AI", acolyte: "—", architect: "✓", cathedral: "✓" },
  { feature: "Automation Layer", acolyte: "—", architect: "✓", cathedral: "✓" },
  { feature: "Supabase Realtime", acolyte: "—", architect: "✓", cathedral: "✓" },
  { feature: "Social Commerce", acolyte: "—", architect: "✓", cathedral: "✓" },
  { feature: "Referral Engine", acolyte: "—", architect: "✓", cathedral: "✓" },
  { feature: "White-label", acolyte: "—", architect: "—", cathedral: "✓" },
  { feature: "Custom Domains", acolyte: "—", architect: "—", cathedral: "✓" },
  { feature: "SLA Guarantee", acolyte: "—", architect: "—", cathedral: "✓" },
  { feature: "API Access", acolyte: "—", architect: "—", cathedral: "✓" },
  { feature: "Concierge Onboarding", acolyte: "—", architect: "—", cathedral: "✓" },
  { feature: "Support", acolyte: "Community", architect: "Priority", cathedral: "Dedicated" },
];

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "The Acolyte tier is free forever — no credit card required. You can build your tenant, add products, and process up to 500 orders per month at no cost. Upgrade to Architect when your volume or feature requirements exceed the Acolyte limits.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. Your data is never deleted when you downgrade — you simply lose access to features above your new tier.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards via Stripe. No PayPal for subscription billing — that rail is reserved for your customers' checkout experience.",
  },
  {
    q: "Is Manus AI included in the Architect tier?",
    a: "Yes. Manus AI is included in the Architect tier and above at no additional cost. This includes all four AI surfaces: the Gig Command panel, Money Manager panel, full AI Assistant (/ai-assistant), and the floating widget on every dashboard page.",
  },
  {
    q: "What does 'white-label ready' mean in the Cathedral tier?",
    a: "Cathedral tier tenants can remove UnifyOne branding, use custom domains, and present the platform as their own product to their end customers. This is designed for agencies and resellers building on top of the UnifyOne infrastructure.",
  },
  {
    q: "What is the SLA guarantee?",
    a: "Cathedral tier subscribers receive a 99.9% uptime SLA with service credits for downtime exceeding the threshold. Acolyte and Architect tiers target the same uptime but without contractual SLA obligations.",
  },
  {
    q: "How does the yearly discount work?",
    a: "Yearly billing gives you two months free — the Architect tier drops from $49/month to $39/month billed annually ($468/year vs $588/year). The Cathedral tier drops from $149/month to $119/month billed annually.",
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
        <meta name="description" content="UnifyOne pricing: Acolyte (free forever), Architect ($49/mo), Cathedral ($149/mo). All plans include multi-tenant commerce infrastructure. Manus AI included in Architect and above." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Tithes — Pricing | UnifyOne" />
        <meta property="og:description" content="Free forever to $149/mo. Multi-tenant commerce infrastructure, Manus AI, social suite, and referral engine. No plugin dependencies." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Tithes — Pricing | UnifyOne" />
        <meta name="twitter:description" content="Free forever to $149/mo. Multi-tenant commerce infrastructure, Manus AI, social suite, and referral engine." />
        {JSON_LD.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${CATHEDRAL_CTA_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.2,
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(2,2,2,0.4) 0%, rgba(2,2,2,0.7) 60%, #020202 100%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-6">Tithes & Offerings</span>
          <h1 className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6" style={{ color: "#F0E8D0", lineHeight: 1.05, letterSpacing: "0.01em" }}>
            Tithes
          </h1>
          <p className="font-crimson text-xl sm:text-2xl max-w-2xl mx-auto" style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}>
            Three tiers. No hidden fees. No feature paywalls within your tier. Cancel any time.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className="font-cinzel text-xs tracking-widest" style={{ color: yearly ? "#3A3A3A" : "#D4A843", letterSpacing: "0.15em" }}>MONTHLY</span>
            <button
              onClick={() => setYearly(!yearly)}
              className="relative w-12 h-6 transition-colors duration-300"
              style={{ backgroundColor: yearly ? "rgba(212,168,67,0.3)" : "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)" }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 transition-all duration-300"
                style={{ backgroundColor: "#D4A843", left: yearly ? "calc(100% - 1.375rem)" : "2px" }}
              />
            </button>
            <span className="font-cinzel text-xs tracking-widest" style={{ color: yearly ? "#D4A843" : "#3A3A3A", letterSpacing: "0.15em" }}>
              YEARLY <span style={{ color: "rgba(212,168,67,0.6)" }}>(2 MONTHS FREE)</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── PRICING TIERS ───────────────────────────────────────────────── */}
      <section className="py-16" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {TIERS.map((tier, i) => (
              <div
                key={i}
                className="p-10 relative"
                style={{
                  borderTop: tier.highlight ? "2px solid #D4A843" : "1px solid rgba(212,168,67,0.08)",
                  borderLeft: i > 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                  backgroundColor: tier.highlight ? "rgba(212,168,67,0.04)" : "transparent",
                }}
              >
                {tier.badge && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1" style={{ backgroundColor: "#D4A843" }}>
                    <span className="font-cinzel text-xs font-700 tracking-widest" style={{ color: "#020202", letterSpacing: "0.15em" }}>{tier.badge}</span>
                  </div>
                )}
                <span className="inscription block mb-2">{tier.description}</span>
                <h2 className="font-cinzel text-2xl font-black mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}>{tier.name}</h2>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-cinzel text-5xl font-black" style={{ color: tier.highlight ? "#D4A843" : "#F0E8D0" }}>
                    {yearly ? tier.price.yearly : tier.price.monthly}
                  </span>
                  {tier.price.monthly !== "$0" && (
                    <span className="font-crimson text-sm" style={{ color: "#3A3A3A" }}>{tier.period}</span>
                  )}
                </div>
                {tier.price.monthly !== "$0" && yearly && (
                  <p className="font-crimson text-sm mb-6" style={{ color: "#5A5A5A" }}>
                    Billed annually · {tier.name === "Architect" ? "$468" : "$1,428"}/year
                  </p>
                )}
                <div className="h-px my-6" style={{ backgroundColor: "rgba(212,168,67,0.08)" }} />
                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="w-1 h-1 mt-2 shrink-0" style={{ backgroundColor: "#D4A843" }} />
                      <span className="font-crimson text-base" style={{ color: "#9A9A9A" }}>{feature}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={getLoginUrl()}
                  className={tier.highlight ? "btn-illuminate block text-center" : "btn-ghost-gold block text-center"}
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
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)", backgroundColor: "rgba(212,168,67,0.015)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Feature Matrix</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Full Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,168,67,0.15)" }}>
                  <th className="text-left py-4 pr-8 font-cinzel text-xs tracking-widest" style={{ color: "#3A3A3A", letterSpacing: "0.15em", width: "40%" }}>FEATURE</th>
                  {["Acolyte", "Architect", "Cathedral"].map(name => (
                    <th key={name} className="text-center py-4 px-4 font-cinzel text-xs tracking-widest" style={{ color: name === "Architect" ? "#D4A843" : "#5A5A5A", letterSpacing: "0.15em" }}>{name.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(212,168,67,0.04)" }}>
                    <td className="py-4 pr-8 font-crimson text-sm" style={{ color: "#7A7A7A" }}>{row.feature}</td>
                    {[row.acolyte, row.architect, row.cathedral].map((val, j) => (
                      <td key={j} className="text-center py-4 px-4 font-crimson text-sm" style={{ color: val === "—" ? "#2A2A2A" : val === "✓" ? "#D4A843" : "#9A9A9A" }}>
                        {val}
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
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Common Questions</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>The Codex</h2>
          </div>
          <div className="space-y-0">
            {FAQ.map((item, i) => (
              <div key={i} style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}>
                <button
                  className="w-full text-left py-6 flex items-start justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  <span className="font-cinzel text-sm font-600" style={{ color: openFaq === i ? "#D4A843" : "#F0E8D0", letterSpacing: "0.05em", lineHeight: 1.5 }}>{item.q}</span>
                  <span className="font-cinzel text-lg shrink-0 mt-0.5" style={{ color: "#D4A843" }}>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="pb-6">
                    <p className="font-crimson text-base" style={{ color: "#7A7A7A", lineHeight: 1.8 }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Begin Construction</span>
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
            Start Free.<br />Scale When Ready.
          </h2>
          <p className="font-crimson text-xl mb-10" style={{ color: "#9A9A9A", fontStyle: "italic" }}>
            The Acolyte tier is free forever. No credit card. No time limit. Upgrade when your commerce volume demands it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getLoginUrl()} className="btn-illuminate">Begin Construction — Free</a>
            <Link href="/architecture">
              <span className="btn-ghost-gold cursor-pointer">View Architecture →</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
