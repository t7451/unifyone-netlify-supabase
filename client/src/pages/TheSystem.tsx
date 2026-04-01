import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getLoginUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/the-system`;

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    "url": CANONICAL,
    "name": "The System — How UnifyOne Works | UnifyOne",
    "description": "How UnifyOne works: four sequential construction phases, ten integrations, and six platform features that replace three separate SaaS tools.",
    "isPartOf": { "@id": `${SITE_URL}/#website` },
    "inLanguage": "en-US"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "The System", "item": CANONICAL }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Build a Commerce Platform with UnifyOne",
    "description": "Four sequential phases to launch a fully operational multi-tenant commerce platform: foundation, walls, vaults, and spire.",
    "url": CANONICAL,
    "step": [
      { "@type": "HowToStep", "position": 1, "name": "Lay the Foundation", "text": "Create your tenant, configure your store identity, and connect your payment rails." },
      { "@type": "HowToStep", "position": 2, "name": "Raise the Walls", "text": "Import your product catalog, configure inventory thresholds, and define your order processing rules." },
      { "@type": "HowToStep", "position": 3, "name": "Install the Vaults", "text": "Wire your automation layer — n8n workflows, Zapier hooks, and email sequences fire on real commerce events." },
      { "@type": "HowToStep", "position": 4, "name": "Light the Spire", "text": "Activate Manus AI. Your co-pilot reads your actual operational data and surfaces insights and earnings projections." }
    ]
  }
];

const CATHEDRAL_FEATURES_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-features-v2-TQVRMkNdoVVuwphEqVNwpV.webp";

const CONSTRUCTION_PHASES = [
  {
    phase: "Phase I",
    title: "Lay the Foundation",
    body: "Create your tenant, configure your store identity, and connect your payment rails. The crypt is sealed before the nave rises. This takes under 10 minutes — the onboarding wizard walks through store name, plan selection, and payment rail connection in three steps.",
    details: ["Tenant creation with auto-slug generation", "Plan selection (Acolyte → Architect → Cathedral)", "Stripe + PayPal + Shopify rail connection", "Team member invitations with role assignment"],
  },
  {
    phase: "Phase II",
    title: "Raise the Walls",
    body: "Import your product catalog, configure inventory thresholds, and define your order processing rules. Structure before decoration. Every product is a load-bearing element — SKU, inventory count, pricing, and fulfillment rules are set at creation, not patched in later.",
    details: ["Product catalog with categories and inventory", "Order pipeline: pending → processing → shipped → delivered", "Customer records with order history", "Manual order entry for offline sales"],
  },
  {
    phase: "Phase III",
    title: "Install the Vaults",
    body: "Wire your automation layer — n8n workflows, Zapier hooks, and email sequences fire on real commerce events. An order placed triggers your fulfillment workflow within 200ms. A subscription renewed fires your customer success sequence before the receipt email arrives.",
    details: ["n8n workflow builder with event triggers", "Zapier hook manager for third-party integrations", "Mailchimp drip sequence configuration", "Webhook event log with retry on failure"],
  },
  {
    phase: "Phase IV",
    title: "Light the Spire",
    body: "Activate Manus AI. Your co-pilot reads your actual operational data and surfaces insights, route optimizations, and earnings projections. The AI is context-aware — it knows which page you are on, what your last 30 days of data looks like, and what question you are most likely to ask next.",
    details: ["Context-aware AI on every dashboard page", "Conversation history across sessions", "Route optimization for gig operators", "Tax deduction tracking and projections"],
  },
];

const INTEGRATIONS = [
  { name: "Stripe", category: "Payments", desc: "Checkout sessions, customer portal, subscription billing, webhook verification." },
  { name: "PayPal", category: "Payments", desc: "Smart Buttons, order creation and capture, OAuth token management." },
  { name: "Shopify", category: "Commerce", desc: "Product sync, order webhook ingestion, checkout URL redirect." },
  { name: "Manus AI", category: "Intelligence", desc: "Context-aware LLM, conversation history, streaming responses." },
  { name: "n8n", category: "Automation", desc: "Workflow triggers on order, subscription, and customer events." },
  { name: "Zapier", category: "Automation", desc: "Hook manager for 5,000+ third-party app integrations." },
  { name: "Supabase", category: "Realtime", desc: "Live order and inventory updates without page refresh." },
  { name: "Meta Ads", category: "Marketing", desc: "CAPI purchase event firing on checkout completion." },
  { name: "Resend", category: "Email", desc: "Transactional email and drip sequence delivery." },
  { name: "GitHub Actions", category: "CI/CD", desc: "Automated test runs, dependency audits, PR code review." },
];

const PLATFORM_FEATURES = [
  {
    title: "Real-Time Order Dashboard",
    body: "Orders update live via Supabase Realtime. Status changes propagate to every open session without polling. Your fulfillment team sees the same state as your customer portal.",
  },
  {
    title: "Multi-Rail Checkout",
    body: "Stripe, PayPal, and Shopify on a single checkout page. The customer chooses their rail. You receive a unified order record regardless of which payment processor fired.",
  },
  {
    title: "Subscription Billing",
    body: "Stripe subscription management with trial countdowns, usage meters, invoice history, and a one-click portal link. Subscription events sync to your tenant record within the webhook handler.",
  },
  {
    title: "Social Commerce Suite",
    body: "AI-composed social posts, platform selector, content calendar, and post scheduling. The AI reads your product catalog and generates platform-specific copy on demand.",
  },
  {
    title: "Referral Engine",
    body: "Shareable referral links, credit wallet, and leaderboard. Every referral click is tracked. Conversions award credits automatically via the webhook handler.",
  },
  {
    title: "Team Management",
    body: "Invite team members by email, assign roles (admin / user), revoke access, and manage pending invitations. Role-based access gates both frontend routes and tRPC procedures.",
  },
];

export default function TheSystem() {
  const phasesRef = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <PublicLayout>
      <Helmet>
        <title>The System — How UnifyOne Works | UnifyOne</title>
        <meta name="description" content="How UnifyOne works: four sequential construction phases, ten integrations, and six platform features that replace three separate SaaS tools. Commerce infrastructure built to endure." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="The System — How UnifyOne Works | UnifyOne" />
        <meta property="og:description" content="Four construction phases. Ten integrations. Six platform features. One unified commerce system." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content="The System — How UnifyOne Works | UnifyOne" />
        <meta name="twitter:description" content="Four construction phases. Ten integrations. Six platform features. One unified commerce system." />
        {JSON_LD.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${CATHEDRAL_FEATURES_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(2,2,2,0.3) 0%, rgba(2,2,2,0.7) 60%, #020202 100%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inscription block mb-6">Sequential Construction</span>
          <h1 className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6" style={{ color: "#F0E8D0", lineHeight: 1.05, letterSpacing: "0.01em" }}>
            The System
          </h1>
          <p className="font-crimson text-xl sm:text-2xl max-w-2xl" style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}>
            Four construction phases. Ten integrations. One platform that replaces three separate SaaS tools.
          </p>
          <div className="h-px mt-10 max-w-xs" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
        </div>
      </section>

      {/* ── CONSTRUCTION PHASES ─────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">The Build Sequence</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Four Phases of Construction</h2>
          </div>
          <div className="space-y-0" ref={phasesRef}>
            {CONSTRUCTION_PHASES.map((phase, i) => (
              <div
                key={i}
                data-reveal
                data-reveal-delay={String(i * 150)}
                className="grid grid-cols-1 lg:grid-cols-12 gap-0 py-12"
                style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
              >
                <div className="lg:col-span-2 mb-4 lg:mb-0">
                  <span className="font-cinzel text-xs font-600 tracking-widest" style={{ color: "#D4A843", letterSpacing: "0.2em" }}>{phase.phase}</span>
                </div>
                <div className="lg:col-span-5 lg:pr-16">
                  <h3 className="font-cinzel text-xl sm:text-2xl font-bold mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.03em" }}>{phase.title}</h3>
                  <p className="font-crimson text-lg" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>{phase.body}</p>
                </div>
                <div className="lg:col-span-5 mt-6 lg:mt-0">
                  <div className="space-y-3">
                    {phase.details.map((detail, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div className="w-1 h-1 mt-2.5 shrink-0" style={{ backgroundColor: "#D4A843" }} />
                        <span className="font-crimson text-base" style={{ color: "#7A7A7A", lineHeight: 1.6 }}>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)", backgroundColor: "rgba(212,168,67,0.015)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Connected Services</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Ten Integrations</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0">
            {INTEGRATIONS.map((integration, i) => (
              <div
                key={i}
                className="p-8"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft: i % 5 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <div className="mb-3">
                  <span className="inscription" style={{ color: "#3A3A3A" }}>{integration.category}</span>
                </div>
                <div className="font-cinzel text-sm font-700 mb-3" style={{ color: "#D4A843", letterSpacing: "0.1em" }}>{integration.name}</div>
                <p className="font-crimson text-sm" style={{ color: "#5A5A5A", lineHeight: 1.7 }}>{integration.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES ───────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">What You Get</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Platform Features</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {PLATFORM_FEATURES.map((feature, i) => (
              <div
                key={i}
                className="p-8"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft: i % 3 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <h3 className="font-cinzel text-sm font-700 mb-4" style={{ color: "#D4A843", letterSpacing: "0.1em" }}>{feature.title}</h3>
                <p className="font-crimson text-base" style={{ color: "#7A7A7A", lineHeight: 1.8 }}>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Begin Construction</span>
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
            The System Is Ready.<br />Your Tenant Awaits.
          </h2>
          <p className="font-crimson text-xl mb-10" style={{ color: "#9A9A9A", fontStyle: "italic" }}>
            Create your tenant, connect your payment rails, and have your first order processed in under 30 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getLoginUrl()} className="btn-illuminate">Begin Construction — Free</a>
            <Link href="/manus-ai">
              <span className="btn-ghost-gold cursor-pointer">Explore Manus AI →</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
