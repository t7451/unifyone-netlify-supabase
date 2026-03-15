import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

// ── Cathedral Framework Asset URLs ──────────────────────────────────────────
const CATHEDRAL_HERO_BG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-hero-v2-3N4uGvSKiz77L95UQXYYxJ.webp";
const CATHEDRAL_FEATURES_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-features-v2-TQVRMkNdoVVuwphEqVNwpV.webp";
const CATHEDRAL_CTA_BG     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-cta-v2-SHGs9wAatFAKqbC6k4GcCb.webp";
const CATHEDRAL_MANUS_BG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-manus-v2-LMRaCZwgmBR3hoFULMA6gG.webp";
const MANUS_AI_BANNER      = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663412766662/NtFplUgYjHyrzGzn.jpg";

// ── Navigation ───────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Architecture", href: "/architecture" },
  { label: "The System",   href: "/the-system" },
  { label: "Manus AI",     href: "/manus-ai" },
  { label: "Tithes",       href: "/tithes" },
];

// ── Feature Pillars ──────────────────────────────────────────────────────────
const PILLARS = [
  {
    glyph: "I",
    title: "Multi-Tenant Foundation",
    body: "Every store is an isolated vault. Tenant data, billing, and access controls are structurally separated at the schema level — not by convention.",
  },
  {
    glyph: "II",
    title: "Commerce Infrastructure",
    body: "Products, orders, inventory, and fulfillment built as load-bearing walls. No plugin dependencies. No single points of failure.",
  },
  {
    glyph: "III",
    title: "Payment Orchestration",
    body: "Stripe, PayPal, and Shopify Checkout unified under one roof. Webhooks are verified, idempotent, and fire into your automation layer.",
  },
  {
    glyph: "IV",
    title: "Automation Nave",
    body: "n8n workflows, Zapier hooks, and Mailchimp drip sequences triggered by real commerce events — not scheduled polling.",
  },
  {
    glyph: "V",
    title: "Analytics Clerestory",
    body: "Revenue, orders, and customer data illuminated in real time. Supabase Realtime keeps every panel current without a page refresh.",
  },
  {
    glyph: "VI",
    title: "Manus AI Spire",
    body: "An intelligent co-pilot built into every page. Context-aware insights drawn from your actual shift, earnings, and route data.",
  },
];

// ── How It Works ─────────────────────────────────────────────────────────────
const CONSTRUCTION_PHASES = [
  {
    phase: "Phase I",
    title: "Lay the Foundation",
    body: "Create your tenant, configure your store identity, and connect your payment rails. The crypt is sealed before the nave rises.",
  },
  {
    phase: "Phase II",
    title: "Raise the Walls",
    body: "Import your product catalog, configure inventory thresholds, and define your order processing rules. Structure before decoration.",
  },
  {
    phase: "Phase III",
    title: "Install the Vaults",
    body: "Wire your automation layer — n8n workflows, Zapier hooks, and Mailchimp sequences fire on real commerce events.",
  },
  {
    phase: "Phase IV",
    title: "Light the Spire",
    body: "Activate Manus AI. Your co-pilot reads your actual data and surfaces insights, route optimizations, and earnings projections.",
  },
];

// ── Pricing ──────────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: "Acolyte",
    price: "$0",
    period: "forever",
    description: "For builders proving the concept.",
    features: ["1 tenant", "100 products", "500 orders/mo", "Stripe checkout", "Basic analytics"],
    cta: "Begin Construction",
    highlight: false,
  },
  {
    name: "Architect",
    price: "$49",
    period: "per month",
    description: "For operators running real commerce.",
    features: ["5 tenants", "Unlimited products", "Unlimited orders", "All payment rails", "Manus AI included", "Automation layer", "Priority support"],
    cta: "Claim Your Nave",
    highlight: true,
  },
  {
    name: "Cathedral",
    price: "$149",
    period: "per month",
    description: "For enterprises building at scale.",
    features: ["Unlimited tenants", "White-label ready", "Custom domains", "SLA guarantee", "Dedicated infrastructure", "API access", "Concierge onboarding"],
    cta: "Commission the Build",
    highlight: false,
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "UnifyOne replaced three separate SaaS tools. The automation layer alone saves us four hours a week.",
    name: "Marcus T.",
    role: "DoorDash Fleet Operator",
    city: "Seattle, WA",
  },
  {
    quote: "The Manus AI insights are genuinely useful. It told me my Tuesday routes were underperforming before I noticed.",
    name: "Priya K.",
    role: "Multi-platform Gig Operator",
    city: "Portland, OR",
  },
  {
    quote: "I've used Shopify, WooCommerce, and three others. UnifyOne is the first platform that feels engineered, not assembled.",
    name: "Jordan M.",
    role: "E-commerce Director",
    city: "Boise, ID",
  },
];

// ── Integrations ─────────────────────────────────────────────────────────────
const INTEGRATIONS = [
  "Stripe", "PayPal", "Shopify", "Manus AI", "n8n",
  "Zapier", "Supabase", "Meta Ads", "Google Analytics", "Resend",
];

export default function Home() {
  const [, navigate] = useLocation();
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const emailCapture = trpc.email.capture.useMutation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <div style={{ backgroundColor: "#020202", color: "#F0E8D0", minHeight: "100vh" }}>

      {/* ── NAVIGATION ─────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? "rgba(2,2,2,0.97)" : "transparent",
          borderBottom: scrolled ? "1px solid rgba(212,168,67,0.12)" : "1px solid transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-3">
            {/* Cathedral cross glyph */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              <div className="absolute inset-0" style={{ border: "1px solid rgba(212,168,67,0.4)" }} />
              <div className="absolute inset-[3px]" style={{ border: "1px solid rgba(212,168,67,0.15)" }} />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="7" y1="1" x2="7" y2="13" stroke="#D4A843" strokeWidth="1.5"/>
                <line x1="1" y1="5" x2="13" y2="5" stroke="#D4A843" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <span className="font-cinzel text-sm font-700 tracking-widest" style={{ color: "#D4A843", letterSpacing: "0.2em" }}>
                UNIFYONE
              </span>
              <span className="hidden sm:inline text-xs ml-2" style={{ color: "#5A5A5A", letterSpacing: "0.1em", fontFamily: "Cinzel, serif" }}>
                BY 1COMMERCE
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <span
                  className="cursor-pointer transition-colors duration-200"
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: "#5A5A5A",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#D4A843")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#5A5A5A")}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden sm:block transition-all duration-200"
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#5A5A5A",
                background: "none",
                border: "none",
                padding: "0.5rem 0",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#D4A843")}
              onMouseLeave={e => (e.currentTarget.style.color = "#5A5A5A")}
            >
              Enter
            </button>
            <a
              href={getLoginUrl()}
              className="btn-illuminate"
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.65rem" }}
            >
              Begin
            </a>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: "#5A5A5A" }}
            >
              <div className="w-5 h-px mb-1.5 transition-all" style={{ backgroundColor: mobileMenuOpen ? "#D4A843" : "#5A5A5A" }} />
              <div className="w-5 h-px mb-1.5" style={{ backgroundColor: "#3A3A3A" }} />
              <div className="w-5 h-px transition-all" style={{ backgroundColor: mobileMenuOpen ? "#D4A843" : "#5A5A5A" }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden" style={{ borderTop: "1px solid rgba(212,168,67,0.1)", backgroundColor: "rgba(2,2,2,0.98)" }}>
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <span
                  onClick={handleNavClick}
                  className="block px-6 py-4 cursor-pointer"
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: "#5A5A5A",
                    borderBottom: "1px solid rgba(212,168,67,0.06)",
                  }}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <div className="px-6 py-4">
              <a href={getLoginUrl()} className="btn-illuminate block text-center" style={{ padding: "0.75rem 1.5rem", fontSize: "0.7rem" }}>
                Begin Construction
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        {/* Cathedral vault background */}
        <div className="absolute inset-0">
          <img
            src={CATHEDRAL_HERO_BG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.75 }}
          />
          {/* Dark overlay — heavier at bottom for text legibility, lighter on mobile for contrast */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(2,2,2,0.25) 0%, rgba(2,2,2,0.4) 35%, rgba(2,2,2,0.88) 70%, rgba(2,2,2,1) 100%)"
          }} />
          {/* Apex light beam — gold radial from top center */}
          <div className="absolute inset-0 animate-gold-beam" style={{
            background: "radial-gradient(ellipse 35% 55% at 50% 0%, rgba(212,168,67,0.18) 0%, transparent 65%)"
          }} />
          {/* Side vignette for ultra-wide screens */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to right, rgba(2,2,2,0.5) 0%, transparent 20%, transparent 80%, rgba(2,2,2,0.5) 100%)"
          }} />
        </div>

        {/* Hero content — positioned at bottom of viewport */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pb-20 sm:pb-28 pt-32">
          {/* Inscription label */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 max-w-12" style={{ backgroundColor: "rgba(212,168,67,0.4)" }} />
            <span className="inscription">PNW Enterprises · Est. 2025 · Cathedral Framework</span>
            <div className="h-px flex-1 max-w-12" style={{ backgroundColor: "rgba(212,168,67,0.4)" }} />
          </div>

          {/* Main headline — Cinzel, massive */}
          <h1 className="font-cinzel mb-6" style={{ lineHeight: 1.05 }}>
            <span className="block text-5xl sm:text-7xl lg:text-8xl font-black" style={{ color: "#F0E8D0", letterSpacing: "-0.01em" }}>
              Built to
            </span>
            <span className="block text-5xl sm:text-7xl lg:text-8xl font-black gradient-gold" style={{ letterSpacing: "-0.01em" }}>
              Endure.
            </span>
          </h1>

          {/* Subheadline — Crimson Pro, editorial */}
          <p className="font-crimson text-xl sm:text-2xl mb-10 max-w-2xl" style={{ color: "#9A9A9A", lineHeight: 1.6, fontStyle: "italic" }}>
            Commerce infrastructure engineered like a cathedral — sequential, structural, and built to outlast every platform trend.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <a href={getLoginUrl()} className="btn-illuminate inline-block text-center">
              Begin Construction
            </a>
            <Link href="/architecture">
              <span className="btn-ghost-gold inline-block text-center cursor-pointer">
                View the Architecture
              </span>
            </Link>
          </div>

          {/* Stat row — separated by pillar lines */}
          <div className="flex items-stretch gap-0" style={{ borderTop: "1px solid rgba(212,168,67,0.15)" }}>
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "< 200ms", label: "Response" },
              { value: "SOC 2", label: "Compliant" },
              { value: "GDPR", label: "Ready" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex-1 py-6 px-4 sm:px-6"
                style={{
                  borderRight: i < 3 ? "1px solid rgba(212,168,67,0.1)" : "none",
                }}
              >
                <div className="stat-value text-2xl sm:text-3xl">{stat.value}</div>
                <div className="inscription mt-1" style={{ color: "#3A3A3A" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Arch SVG divider at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
          <svg viewBox="0 0 1440 64" fill="none" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 64 L0 32 Q360 0 720 32 Q1080 64 1440 32 L1440 64 Z" fill="#020202"/>
          </svg>
        </div>
      </section>

      {/* ── FEATURES / PILLARS ──────────────────────────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
        {/* Cathedral lancet windows background */}
        <div className="absolute inset-0">
          <img src={CATHEDRAL_FEATURES_BG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.22 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #020202 0%, rgba(2,2,2,0.6) 15%, rgba(2,2,2,0.55) 85%, #020202 100%)" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8">
          {/* Section header */}
          <div className="mb-16 sm:mb-20">
            <span className="inscription block mb-4">The Six Pillars</span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-bold mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              The Architecture
            </h2>
            <div className="h-px max-w-xs" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
          </div>

          {/* 3-column pillar grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.glyph}
                className="stone-card p-8 sm:p-10 group"
                style={{
                  borderRight: "1px solid #242424",
                  borderBottom: "1px solid #242424",
                }}
              >
                {/* Roman numeral glyph */}
                <div className="font-cinzel text-xs font-600 mb-6" style={{ color: "rgba(212,168,67,0.35)", letterSpacing: "0.3em" }}>
                  {pillar.glyph}
                </div>
                {/* Arch-top accent line */}
                <div className="w-8 h-px mb-6 transition-all duration-300 group-hover:w-16" style={{ backgroundColor: "#D4A843" }} />
                <h3 className="font-cinzel text-base font-600 mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}>
                  {pillar.title}
                </h3>
                <p className="font-crimson text-base leading-relaxed" style={{ color: "#6A6A6A" }}>
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS / CONSTRUCTION PHASES ──────────────────────────── */}
      <section id="how-it-works" className="py-24 sm:py-32 cathedral-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="mb-16 sm:mb-20">
            <span className="inscription block mb-4">The Cathedral Principle</span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-bold mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              Sequential Construction
            </h2>
            <div className="h-px max-w-xs" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
          </div>

          {/* Vertical timeline — cathedral nave columns */}
          <div className="relative">
            {/* Central pillar line */}
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px hidden sm:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(212,168,67,0.3), transparent)" }} />

            <div className="space-y-0">
              {CONSTRUCTION_PHASES.map((phase, i) => (
                <div
                  key={phase.phase}
                  className={`relative flex flex-col sm:flex-row gap-8 sm:gap-16 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}
                  style={{ paddingBottom: i < CONSTRUCTION_PHASES.length - 1 ? "4rem" : 0 }}
                >
                  {/* Content */}
                  <div className="flex-1 sm:text-right" style={{ textAlign: i % 2 === 0 ? undefined : "left" }}>
                    <div className={`stone-card p-8 ${i % 2 === 0 ? "sm:mr-8" : "sm:ml-8"}`}>
                      <span className="inscription block mb-3" style={{ color: "rgba(212,168,67,0.5)" }}>{phase.phase}</span>
                      <h3 className="font-cinzel text-lg font-600 mb-3" style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}>
                        {phase.title}
                      </h3>
                      <p className="font-crimson text-base leading-relaxed" style={{ color: "#6A6A6A" }}>
                        {phase.body}
                      </p>
                    </div>
                  </div>

                  {/* Center node — keystone */}
                  <div className="hidden sm:flex items-start justify-center w-12 shrink-0 pt-8">
                    <div
                      className="w-8 h-8 flex items-center justify-center font-cinzel text-xs font-700"
                      style={{
                        backgroundColor: "#020202",
                        border: "1px solid rgba(212,168,67,0.5)",
                        color: "#D4A843",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MANUS AI SECTION ────────────────────────────────────────────── */}
      <section id="manus-ai" className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={CATHEDRAL_MANUS_BG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.18 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(2,2,2,0.88) 0%, rgba(2,2,2,0.72) 50%, rgba(2,2,2,0.88) 100%)" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8">
          {/* Header */}
          <div className="mb-12">
            <span className="inscription block mb-4">New — The Spire</span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-bold mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              Manus AI
            </h2>
            <p className="font-crimson text-xl sm:text-2xl max-w-2xl" style={{ color: "#6A6A6A", fontStyle: "italic" }}>
              An intelligence layer that reads your actual commerce data — not generic advice, but specific insight drawn from your shifts, routes, and earnings.
            </p>
            <div className="h-px max-w-xs mt-6" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
          </div>

          {/* Banner image */}
          <div className="mb-12 overflow-hidden" style={{ border: "1px solid rgba(212,168,67,0.12)" }}>
            <img
              src={MANUS_AI_BANNER}
              alt="Manus AI — Your AI Gig Co-Pilot"
              className="w-full object-cover"
              style={{ maxHeight: "320px", objectPosition: "center" }}
            />
          </div>

          {/* Feature grid — 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { glyph: "✦", title: "Contextual Chat", body: "Every page has a dedicated AI context. The assistant on Gig Command knows your routes. The one on Money Manager knows your tax position." },
              { glyph: "✦", title: "Route Intelligence", body: "Analyzes your historical mileage and earnings per platform to surface which routes and time windows yield the highest $/hr." },
              { glyph: "✦", title: "Earnings Illumination", body: "Reads your shift data and projects YTD earnings, tax deductions, and platform performance — updated on every session." },
              { glyph: "✦", title: "Challenge Strategy", body: "Monitors your active challenges and suggests optimal completion paths based on your current platform and location data." },
            ].map((feat, i) => (
              <div
                key={feat.title}
                className="stone-card p-8 group"
                style={{ borderRight: "1px solid #242424" }}
              >
                <div className="text-lg mb-4 animate-gold-beam" style={{ color: "#D4A843" }}>{feat.glyph}</div>
                <div className="w-6 h-px mb-5 transition-all duration-300 group-hover:w-12" style={{ backgroundColor: "#D4A843" }} />
                <h3 className="font-cinzel text-sm font-600 mb-3" style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}>
                  {feat.title}
                </h3>
                <p className="font-crimson text-sm leading-relaxed" style={{ color: "#5A5A5A" }}>
                  {feat.body}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10">
            <a href={getLoginUrl()} className="btn-illuminate inline-block">
              Activate the Spire
            </a>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20" style={{ borderTop: "1px solid rgba(212,168,67,0.08)", borderBottom: "1px solid rgba(212,168,67,0.08)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inscription block text-center mb-10" style={{ color: "#3A3A3A" }}>
            Integrated Infrastructure
          </span>
          <div className="flex flex-wrap justify-center gap-0">
            {INTEGRATIONS.map((name, i) => (
              <div
                key={name}
                className="px-6 py-4 transition-colors duration-200"
                style={{
                  borderRight: i < INTEGRATIONS.length - 1 ? "1px solid rgba(212,168,67,0.08)" : "none",
                  fontFamily: "Cinzel, serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#3A3A3A",
                  cursor: "default",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#D4A843")}
                onMouseLeave={e => (e.currentTarget.style.color = "#3A3A3A")}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 cathedral-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="mb-16">
            <span className="inscription block mb-4">From the Congregation</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              Testimonials
            </h2>
            <div className="h-px max-w-xs mt-4" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="p-8 sm:p-10"
                style={{
                  borderRight: i < 2 ? "1px solid rgba(212,168,67,0.1)" : "none",
                  borderTop: "1px solid rgba(212,168,67,0.1)",
                }}
              >
                {/* Quotation mark — manuscript style */}
                <div className="font-cinzel text-5xl leading-none mb-6" style={{ color: "rgba(212,168,67,0.2)" }}>"</div>
                <p className="font-crimson text-lg leading-relaxed mb-8" style={{ color: "#9A9A9A", fontStyle: "italic" }}>
                  {t.quote}
                </p>
                <div>
                  <div className="font-cinzel text-xs font-600" style={{ color: "#D4A843", letterSpacing: "0.15em" }}>{t.name}</div>
                  <div className="inscription mt-1" style={{ color: "#3A3A3A" }}>{t.role} · {t.city}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="mb-16">
            <span className="inscription block mb-4">Investment</span>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-bold mb-4" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>
              Tithes & Offerings
            </h2>
            <p className="font-crimson text-xl" style={{ color: "#5A5A5A", fontStyle: "italic" }}>
              No hidden fees. No platform tax. Cancel at the solstice.
            </p>
            <div className="h-px max-w-xs mt-6" style={{ background: "linear-gradient(to right, #D4A843, transparent)" }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {TIERS.map((tier, i) => (
              <div
                key={tier.name}
                className="relative p-8 sm:p-10 transition-all duration-300 group"
                style={{
                  backgroundColor: tier.highlight ? "#0A0A0A" : "#020202",
                  border: tier.highlight ? "1px solid rgba(212,168,67,0.4)" : "1px solid #242424",
                  borderRight: i < 2 ? (tier.highlight ? "1px solid rgba(212,168,67,0.4)" : "1px solid #242424") : undefined,
                  boxShadow: tier.highlight ? "0 0 60px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.2)" : "none",
                }}
              >
                {tier.highlight && (
                  <div className="absolute -top-px left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, #D4A843, transparent)" }} />
                )}
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inscription px-3 py-1" style={{ backgroundColor: "#D4A843", color: "#020202" }}>
                      Most Chosen
                    </span>
                  </div>
                )}

                <div className="font-cinzel text-xs font-600 mb-6" style={{ color: "rgba(212,168,67,0.4)", letterSpacing: "0.3em" }}>
                  {tier.name.toUpperCase()}
                </div>
                <div className="mb-2">
                  <span className="font-cinzel text-4xl font-black" style={{ color: tier.highlight ? "#F0D080" : "#F0E8D0" }}>
                    {tier.price}
                  </span>
                  <span className="font-crimson text-sm ml-2" style={{ color: "#5A5A5A" }}>/ {tier.period}</span>
                </div>
                <p className="font-crimson text-base mb-8" style={{ color: "#5A5A5A", fontStyle: "italic" }}>
                  {tier.description}
                </p>

                <div className="space-y-3 mb-10">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-3 h-px shrink-0" style={{ backgroundColor: "#D4A843" }} />
                      <span className="font-crimson text-sm" style={{ color: "#6A6A6A" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={getLoginUrl()}
                  className={tier.highlight ? "btn-illuminate block text-center" : "btn-ghost-gold block text-center"}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-40 overflow-hidden">
        {/* Rose window background */}
        <div className="absolute inset-0">
          <img src={CATHEDRAL_CTA_BG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.35 }} />
          {/* Dark radial overlay — lighter center to let rose window breathe */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(2,2,2,0.3) 0%, rgba(2,2,2,0.92) 75%)" }} />
          {/* Edge vignette */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(2,2,2,0.8) 0%, transparent 20%, transparent 80%, rgba(2,2,2,0.8) 100%)" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 text-center">
          {/* Decorative cross */}
          <div className="flex justify-center mb-10">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <line x1="16" y1="2" x2="16" y2="30" stroke="#D4A843" strokeWidth="1"/>
              <line x1="2" y1="12" x2="30" y2="12" stroke="#D4A843" strokeWidth="1"/>
              <rect x="1" y="1" width="30" height="30" stroke="rgba(212,168,67,0.2)" strokeWidth="1"/>
            </svg>
          </div>

          <span className="inscription block mb-6">The Foundation Awaits</span>
          <h2 className="font-cinzel text-4xl sm:text-6xl font-black mb-6" style={{ color: "#F0E8D0", letterSpacing: "0.02em", lineHeight: 1.1 }}>
            Begin Construction<br />
            <span className="gradient-gold">Today.</span>
          </h2>
          <p className="font-crimson text-xl sm:text-2xl mb-12 max-w-2xl mx-auto" style={{ color: "#5A5A5A", fontStyle: "italic" }}>
            Cathedrals are not built in a day. But every one begins with the same first stone. Yours is waiting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getLoginUrl()} className="btn-illuminate inline-block" style={{ padding: "1rem 2.5rem" }}>
              Lay the First Stone
            </a>
            <Link href="/architecture">
              <span className="btn-ghost-gold inline-block cursor-pointer" style={{ padding: "1rem 2.5rem" }}>
                Study the Plans
              </span>
            </Link>
          </div>

          <p className="font-crimson text-sm mt-8" style={{ color: "#3A3A3A" }}>
            14-day free trial · No credit card required · Cancel at any time
          </p>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ───────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#020202", borderTop: "1px solid rgba(212,168,67,0.1)" }} className="py-24">
        <div className="max-w-2xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <span className="inscription block mb-4">STAY CONNECTED</span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}>Join the Cathedral</h2>
            <p className="font-crimson text-lg mt-6" style={{ color: "#9A9A9A", lineHeight: 1.8 }}>Get exclusive insights, early access to features, and the Cathedral Principle delivered to your inbox.</p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailInput.trim()) return;
              
              setEmailStatus("loading");
              setEmailMessage("");
              
              try {
                const result = await emailCapture.mutateAsync({
                  email: emailInput,
                  source: "landing_page",
                });
                
                if (result.success) {
                  setEmailStatus("success");
                  setEmailMessage(result.message);
                  setEmailInput("");
                  setTimeout(() => setEmailStatus("idle"), 5000);
                } else {
                  setEmailStatus("error");
                  setEmailMessage(result.message || "An error occurred");
                }
              } catch (error) {
                setEmailStatus("error");
                setEmailMessage("Failed to subscribe. Please try again.");
              }
            }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <input
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={emailStatus === "loading" || emailStatus === "success"}
              style={{
                flex: 1,
                padding: "12px 16px",
                backgroundColor: "rgba(212,168,67,0.05)",
                border: "1px solid rgba(212,168,67,0.2)",
                color: "#F0E8D0",
                fontFamily: "'Crimson Pro', serif",
                fontSize: "16px",
              }}
              className="focus:outline-none"
            />
            <button
              type="submit"
              disabled={emailStatus === "loading" || emailStatus === "success"}
              className="btn-gold"
              style={{
                padding: "12px 32px",
                fontFamily: "'Cinzel', serif",
                fontSize: "14px",
                letterSpacing: "0.1em",
                fontWeight: 600,
                opacity: emailStatus === "success" ? 0.7 : 1,
              }}
            >
              {emailStatus === "loading" ? "Subscribing..." : emailStatus === "success" ? "✓ Subscribed" : "SUBSCRIBE"}
            </button>
          </form>

          {emailMessage && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: emailStatus === "success" ? "rgba(212,168,67,0.1)" : "rgba(200,100,100,0.1)",
                border: `1px solid ${emailStatus === "success" ? "rgba(212,168,67,0.3)" : "rgba(200,100,100,0.3)"}`,
                color: emailStatus === "success" ? "#D4A843" : "#FF6B6B",
                fontFamily: "'Crimson Pro', serif",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {emailMessage}
            </div>
          )}

          <p className="font-crimson text-sm text-center mt-6" style={{ color: "#5A5A5A" }}>
            We respect your inbox. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(212,168,67,0.1)", backgroundColor: "#020202" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 flex items-center justify-center" style={{ border: "1px solid rgba(212,168,67,0.3)" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <line x1="5" y1="1" x2="5" y2="9" stroke="#D4A843" strokeWidth="1"/>
                    <line x1="1" y1="4" x2="9" y2="4" stroke="#D4A843" strokeWidth="1"/>
                  </svg>
                </div>
                <span className="font-cinzel text-xs font-600" style={{ color: "#D4A843", letterSpacing: "0.2em" }}>UNIFYONE</span>
              </div>
              <p className="font-crimson text-sm" style={{ color: "#3A3A3A", maxWidth: "240px" }}>
                Commerce infrastructure built on the Cathedral Principle. By 1Commerce · PNW Enterprises.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-8">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "skdev@1commercesolutions.com", href: "mailto:skdev@1commercesolutions.com" },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="transition-colors duration-200"
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "0.6rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#3A3A3A",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#D4A843")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#3A3A3A")}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}>
            <span className="inscription" style={{ color: "#2A2A2A" }}>
              © 2025 1Commerce Solutions · PNW Enterprises · All rights reserved
            </span>
            <span className="inscription" style={{ color: "#2A2A2A" }}>
              Cathedral Framework v1.6
            </span>
          </div>
        </div>
      </footer>

      {/* ── MOBILE STICKY CTA ───────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden flex gap-0"
        style={{ borderTop: "1px solid rgba(212,168,67,0.2)", backgroundColor: "rgba(2,2,2,0.98)" }}
      >
        <a
          href={getLoginUrl()}
          className="flex-1 py-4 text-center btn-illuminate"
          style={{ fontSize: "0.65rem" }}
        >
          Begin Construction
        </a>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-4 btn-ghost-gold"
          style={{ fontSize: "0.65rem", borderLeft: "1px solid rgba(212,168,67,0.2)" }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
