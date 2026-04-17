import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getLoginUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { TIERS } from "@/content/pricing";
import { SITE_URL } from "@/lib/siteConfig";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BuildProcessAnimation from "@/components/BuildProcessAnimation";

const CANONICAL = `${SITE_URL}/`;

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "UnifyOne | AI-Powered Multi-Tenant Commerce Platform",
    description:
      "UnifyOne is the multi-tenant commerce platform for gig operators and e-commerce teams. AI-powered earnings insights, order management, and Shopify integration.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "1Commerce / PNW Enterprises",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: ["https://twitter.com/1CommerceSol"],
  },
];

const STATS = [
  { value: "76M+", label: "US gig workers underserved by existing tools" },
  { value: "$3,200", label: "avg additional deductions tracked per user annually" },
  { value: "300+", label: "AI models accessible through one UnifyAI key" },
  { value: "$556B", label: "gig economy market with no unified intelligence layer" },
];

const PILLARS = [
  {
    glyph: "◈",
    name: "GigIQ",
    title: "Shift Intelligence",
    body: "See which hours, zones, and platforms actually pay the most. Real earnings data. Specific recommendations. Not generic advice.",
    color: "#F0D080",
  },
  {
    glyph: "◎",
    name: "Tax Autopilot",
    title: "IRS Deduction Tracker",
    body: "Auto-captures mileage from every logged shift at the current IRS rate. Real-time YTD deduction figure. Quarterly estimate alerts.",
    color: "#6EE7B7",
  },
  {
    glyph: "⬡",
    name: "UnifyAI",
    title: "Multi-Model API Router",
    body: "One set of credentials routes to Claude, GPT, Gemini and more. Credit-based billing. Full MCP config dashboard. Zero vendor lock-in.",
    color: "#93C5FD",
  },
  {
    glyph: "◇",
    name: "MoneyPulse",
    title: "Money Manager",
    body: "Budgeting, goal tracking, earnings forecasts, and spending analysis — all connected to your actual gig income streams.",
    color: "#C4B5FD",
  },
  {
    glyph: "▣",
    name: "1Commerce",
    title: "Commerce Engine",
    body: "Multi-tenant storefront management, Shopify sync, affiliate network tools, and order fulfillment under one dashboard.",
    color: "#FCA5A5",
  },
  {
    glyph: "◉",
    name: "Kai",
    title: "AI Sidekick",
    body: "Powered by UnifyAI. Reads your actual data. Works whether you deliver food, run a store, or just want smarter money.",
    color: "#FCD34D",
  },
];

function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    submitLead.mutate({ email, source: "landing_page_blueprint" });
  };

  return (
    <section
      className="cathedral-bg"
      style={{
        padding: "5rem 0",
        borderTop: "1px solid #242424",
        borderBottom: "1px solid #242424",
      }}
    >
      <div className="max-w-xl mx-auto px-6 sm:px-8 text-center">
        <span className="inscription" style={{ color: "#D4A843" }}>
          FREE RESOURCE
        </span>
        <h2
          className="font-cinzel text-2xl sm:text-3xl font-black mt-4 mb-3"
          style={{ color: "#F0E8D0" }}
        >
          Get the Cathedral Blueprint — free.
        </h2>
        <p
          className="font-crimson text-lg mb-8"
          style={{ color: "#6A6A6A", fontStyle: "italic" }}
        >
          The architecture guide behind UnifyOne: multi-tenant design, AI
          routing, and gig income intelligence — all in one downloadable PDF.
        </p>
        {submitted ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ border: "1px solid rgba(212,168,67,0.3)", backgroundColor: "rgba(212,168,67,0.05)" }}
          >
            <p className="font-cinzel text-sm" style={{ color: "#D4A843", letterSpacing: "0.1em" }}>
              ✦ BLUEPRINT SENT
            </p>
            <p className="font-crimson mt-2" style={{ color: "#6A6A6A" }}>
              Check your inbox — the PDF is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="your@email.com"
                aria-label="Email address"
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "#0A0A0A",
                  border: error ? "1px solid #EF4444" : "1px solid #242424",
                  color: "#F0E8D0",
                  outline: "none",
                }}
                required
              />
              {error && (
                <p className="text-left text-xs mt-1" style={{ color: "#EF4444" }}>{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitLead.isPending}
              className="btn-illuminate shrink-0 disabled:opacity-70"
              style={{ whiteSpace: "nowrap" }}
            >
              {submitLead.isPending ? "Sending…" : "Send My Blueprint"}
            </button>
          </form>
        )}
        <p className="font-crimson text-xs mt-4" style={{ color: "#3A3A3A" }}>
          No spam. Unsubscribe anytime. We respect your privacy.{" "}
          <Link href="/privacy">
            <span className="underline cursor-pointer" style={{ color: "#4A4A4A" }}>Privacy Policy</span>
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const heroRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const pillarsRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <PublicLayout>
      <Helmet>
        <title>UnifyOne | AI-Powered Multi-Tenant Commerce Platform</title>
        <meta
          name="description"
          content="UnifyOne is the multi-tenant commerce platform for gig operators and e-commerce teams. AI-powered earnings insights, order management, and Shopify integration."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="UnifyOne | AI-Powered Multi-Tenant Commerce Platform" />
        <meta
          property="og:description"
          content="Commerce infrastructure engineered like a cathedral — sequential, structural, and built to outlast every platform trend. AI-powered insights for gig operators. Start free."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="apex-light"
        style={{
          paddingTop: "8rem",
          paddingBottom: "6rem",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
          <div data-reveal data-reveal-delay="0">
            <span className="inscription" style={{ color: "#D4A843" }}>
              COMMERCE INFRASTRUCTURE
            </span>
          </div>

          <h1
            data-reveal
            data-reveal-delay="100"
            className="font-cinzel mt-6 mb-6"
            style={{
              fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1.06,
              color: "#F0E8D0",
            }}
          >
            Your AI knows what<br />you actually earn.
          </h1>

          <p
            data-reveal
            data-reveal-delay="200"
            className="font-crimson text-xl mx-auto mb-10"
            style={{
              color: "#6A6A6A",
              fontStyle: "italic",
              maxWidth: 560,
              lineHeight: 1.7,
            }}
          >
            UnifyOne reads your real shift data, tracks every deduction, and
            tells you exactly where you're leaving money on the table.{" "}
            <em style={{ color: "#9A9A9A" }}>
              Not generic advice — intelligence built on your numbers.
            </em>
          </p>

          <div
            data-reveal
            data-reveal-delay="300"
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href={getLoginUrl()} className="btn-illuminate">
              Start Free — No Card Required
            </a>
            <Link href="/the-system">
              <span className="btn-ghost-gold cursor-pointer">
                See How It Works →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid #242424", borderBottom: "1px solid #242424" }}>
        <div
          ref={statsRef}
          className="max-w-7xl mx-auto px-6 sm:px-8 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.value}
              data-reveal
              data-reveal-delay={String(i * 80)}
              className="text-center"
            >
              <div className="stat-value mb-2">{stat.value}</div>
              <p
                className="font-crimson text-sm"
                style={{ color: "#5A5A5A", lineHeight: 1.5 }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BUILD PROCESS ANIMATION ──────────────────────────────────────── */}
      <section
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <BuildProcessAnimation />
        </div>
      </section>

      {/* ── TRUST BADGES ─────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid #242424",
          padding: "2.5rem 0",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <p
            className="text-center font-crimson text-sm mb-6"
            style={{ color: "#3A3A3A", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Cinzel, serif", fontSize: "0.65rem" }}
          >
            Payments &amp; Integrations Powered By
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { name: "Stripe", color: "#6772E5" },
              { name: "PayPal", color: "#003087" },
              { name: "Square", color: "#3E4348" },
              { name: "Shopify", color: "#96BF48" },
              { name: "Anthropic", color: "#D4A843" },
              { name: "Supabase", color: "#3ECF8E" },
            ].map(brand => (
              <span
                key={brand.name}
                className="font-cinzel text-sm tracking-widest font-bold"
                style={{ color: brand.color, opacity: 0.55, letterSpacing: "0.15em" }}
              >
                {brand.name.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM PILLARS ─────────────────────────────────────────────── */}
      <section
        id="platform"
        className="cathedral-bg"
        style={{ padding: "6rem 0" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              THE PLATFORM
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Six load-bearing pillars.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{ color: "#6A6A6A", fontStyle: "italic", maxWidth: 480, margin: "0 auto" }}
            >
              Every module is structural. Nothing bolted on after the fact.
            </p>
          </div>

          <div
            ref={pillarsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
            style={{ border: "1px solid #242424" }}
          >
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.name}
                data-reveal
                data-reveal-delay={String(i * 80)}
                className="stone-card p-8"
                style={{ borderColor: "#242424" }}
              >
                <div
                  className="font-cinzel text-2xl mb-4"
                  style={{ color: pillar.color }}
                >
                  {pillar.glyph}
                </div>
                <div
                  className="inscription mb-2"
                  style={{ color: pillar.color, opacity: 0.7 }}
                >
                  {pillar.name}
                </div>
                <h3
                  className="font-cinzel text-lg font-700 mb-3"
                  style={{ color: "#F0E8D0" }}
                >
                  {pillar.title}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#6A6A6A", lineHeight: 1.7 }}
                >
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KAI / AI SIDEKICK ────────────────────────────────────────────── */}
      <section
        id="kai"
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inscription" style={{ color: "#D4A843" }}>
                KAI — AI SIDEKICK
              </span>
              <h2
                className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-6"
                style={{ color: "#F0E8D0" }}
              >
                Intelligence built on your actual numbers.
              </h2>
              <div
                className="font-crimson text-lg space-y-4"
                style={{ color: "#6A6A6A", lineHeight: 1.7 }}
              >
                <p>
                  Kai isn't a generic chatbot. It reads your shift earnings, mileage
                  logs, and platform comparisons — then tells you exactly which
                  hours and zones pay the most after expenses.
                </p>
                <p>
                  Ask it anything:{" "}
                  <em style={{ color: "#9A9A9A" }}>
                    "Which of my shifts this week were most profitable?" "What
                    should I charge Client X?" "Route this prompt to the
                    lowest-latency model."
                  </em>
                </p>
              </div>
              <div className="mt-8">
                <a href={getLoginUrl()} className="btn-illuminate">
                  Activate Kai Free
                </a>
              </div>
            </div>

            {/* Demo panel */}
            <div
              className="stone-card p-6"
              style={{ fontFamily: "'Crimson Pro', serif" }}
            >
              <div
                className="inscription mb-4"
                style={{ color: "#D4A843", display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#6EE7B7",
                  }}
                />
                KAI LIVE DEMO
              </div>
              <p
                style={{
                  color: "#F0E8D0",
                  marginBottom: "1rem",
                  fontStyle: "italic",
                  fontSize: "0.95rem",
                }}
              >
                "Which of my shifts this week were most profitable after expenses?"
              </p>
              <p style={{ color: "#6A6A6A", lineHeight: 1.7, fontSize: "0.9rem" }}>
                Your Thursday 5–9pm shifts averaged $31.20/hr after fuel — 42%
                higher than Monday mornings at $21.90/hr. Shifting those 3 Monday
                hours to Thursday evenings adds approximately{" "}
                <span style={{ color: "#F0D080" }}>$120/month</span> to your net.
              </p>
              <div
                className="rule-gold mt-4 pt-4"
                style={{ borderTop: "1px solid #242424" }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#3A3A3A",
                    fontFamily: "Cinzel, serif",
                    letterSpacing: "0.1em",
                  }}
                >
                  POWERED BY UNIFYAI · MULTI-MODEL · ZERO LOCK-IN
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UNIFYAI CALLOUT ──────────────────────────────────────────────── */}
      <section
        id="unifyai"
        className="cathedral-bg"
        style={{
          padding: "5rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription" style={{ color: "#93C5FD" }}>
            UNIFYAI — MULTI-MODEL ROUTER
          </span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            300+ AI models. One key.
          </h2>
          <p
            className="font-crimson text-lg mb-8"
            style={{ color: "#6A6A6A", fontStyle: "italic", maxWidth: 520, margin: "0 auto 2rem" }}
          >
            Route to Claude for analysis, GPT for code, Gemini for speed. Fully
            configurable MCP dashboard. Credit-based billing with no per-model
            vendor accounts required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/documents/integrations">
              <span className="btn-ghost-gold cursor-pointer" style={{ color: "#93C5FD", borderColor: "rgba(147,197,253,0.4)" }}>
                View Integration Guides
              </span>
            </Link>
            <Link href="/developer-hub">
              <span className="btn-ghost-gold cursor-pointer">
                Developer Hub →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────── */}
      <section style={{ padding: "6rem 0" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              PRICING
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Built like the rest of the cathedral.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{ color: "#6A6A6A", fontStyle: "italic" }}
            >
              Clear, structural, no surprises. Start free. Upgrade when ready.
            </p>
          </div>

          <div
            ref={pricingRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-0"
          >
            {TIERS.map((tier, i) => (
              <div
                key={tier.id}
                data-reveal
                data-reveal-delay={String(i * 100)}
                className="relative p-8 sm:p-10"
                style={{
                  backgroundColor: tier.highlight ? "#0A0A0A" : "#020202",
                  border: tier.highlight
                    ? "1px solid rgba(212,168,67,0.4)"
                    : "1px solid #242424",
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
                  className={tier.highlight ? "btn-illuminate block text-center" : "btn-ghost-gold block text-center"}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/pricing">
              <span
                className="font-crimson text-base cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                Compare all features →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ────────────────────────────────────────────────── */}
      <EmailCapture />

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        className="apex-light"
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
        }}
      >
        <div
          data-reveal
          data-reveal-delay="0"
          className="max-w-3xl mx-auto px-6 sm:px-8 text-center"
        >
          <span className="inscription" style={{ color: "#D4A843" }}>
            BEGIN CONSTRUCTION
          </span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-6 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            The foundation is ready.<br />Your tenants are not.
          </h2>
          <p
            className="font-crimson text-lg mb-10"
            style={{ color: "#6A6A6A", fontStyle: "italic" }}
          >
            Start free. No credit card. The Starter tier runs on the same
            infrastructure as every paid plan. When you're ready to scale, upgrade
            in one click — no data migration, no platform switch.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={getLoginUrl()} className="btn-illuminate">
              Begin Construction — Free
            </a>
            <Link href="/architecture">
              <span className="btn-ghost-gold cursor-pointer">
                Read the Architecture →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
