import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, BarChart3, Zap, Globe, Shield, ArrowRight,
  CheckCircle, TrendingUp, Layers, Workflow, Menu, X,
  Star, Package, Users, CreditCard, Plug, ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AutomationFlowAnimation from "@/components/AutomationFlowAnimation";

const HERO_VISUAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/manus-ai-hero-TWvyRNoyoXmz8CnBLvHXFQ.webp";
const MANUS_AI_BANNER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/manus-ai-feature-banner-mZjQMb2t9uP6W2BitsSWMq.webp";
const MANUS_AI_OG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/manus-ai-og-card-gmKaF7wnfK9eUMpcMfEqQ4.png";

const FEATURES = [
  { icon: Layers, title: "Multi-Tenant Architecture", desc: "Each store gets its own isolated environment — dedicated data, settings, team access, and billing. Scale from 1 to 1,000 stores without re-architecting.", color: "#00D9FF" },
  { icon: ShoppingCart, title: "Commerce Engine", desc: "Full product catalog with variants, inventory tracking, order processing, fulfillment workflows, and customer management — all in one place.", color: "#0284C7" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time revenue metrics, customer lifetime value, sales performance charts, and cohort analysis. Know your numbers before your accountant does.", color: "#6A1B9A" },
  { icon: Zap, title: "Stripe & PayPal Payments", desc: "Checkout sessions, subscription billing, webhook handling, refund management, and PayPal Smart Buttons — all payment rails in a single integration.", color: "#635BFF" },
  { icon: Globe, title: "Shopify Sync", desc: "Bidirectional product and order sync with your Shopify store via webhooks. Sell on Shopify, manage everywhere.", color: "#96BF48" },
  { icon: Workflow, title: "n8n & Zapier Automation", desc: "Trigger n8n workflows and Zapier hooks for order fulfillment, notifications, Mailchimp campaigns, and custom data pipelines — no code required.", color: "#EA4B71" },
  { icon: Shield, title: "Role-Based Access", desc: "Admin and user roles with fine-grained procedure-level authorization. Invite team members, set permissions, and audit every action.", color: "#10B981" },
  { icon: TrendingUp, title: "Realtime Updates", desc: "Live order status and inventory changes powered by Supabase Realtime. Your dashboard updates the moment anything changes.", color: "#F59E0B" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Plug,
    title: "Connect Your Stack",
    desc: "Link your Shopify store, Stripe account, and existing tools in minutes. UnifyOne speaks the APIs you already use.",
    color: "#00D9FF",
  },
  {
    step: "02",
    icon: Package,
    title: "Unify Your Operations",
    desc: "Products, orders, customers, and payments flow into one dashboard. No more tab-switching between five different tools.",
    color: "#635BFF",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Scale Without Headcount",
    desc: "Automation handles fulfillment, notifications, and reporting. You focus on growth — the platform handles the rest.",
    color: "#10B981",
  },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "E-commerce Director",
    company: "Pacific Goods Co.",
    quote: "We went from managing 3 separate dashboards to one. Order processing time dropped 60% in the first month.",
    stars: 5,
  },
  {
    name: "Sarah K.",
    role: "Founder",
    company: "Cascade Apparel",
    quote: "The Shopify sync alone saved us 10 hours a week. The automation pipeline is genuinely impressive.",
    stars: 5,
  },
  {
    name: "Dev P.",
    role: "CTO",
    company: "Northwest Digital",
    quote: "Finally a commerce platform built by engineers who understand multi-tenant architecture. The tRPC API is clean.",
    stars: 5,
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    yearlyPrice: "$24",
    features: ["1 Store", "500 Products", "1,000 Orders/mo", "Basic Analytics", "Stripe Payments", "Email Support"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$79",
    yearlyPrice: "$66",
    features: ["5 Stores", "10,000 Products", "Unlimited Orders", "Advanced Analytics", "Shopify Sync", "n8n Automation", "Priority Support"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    yearlyPrice: "Custom",
    features: ["Unlimited Stores", "Unlimited Products", "SLA Guarantee", "Dedicated Support", "Custom Integrations", "White-label Option", "SSO & Audit Logs"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const STATS = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 200ms", label: "API Response" },
  { value: "SOC 2", label: "Compliant" },
  { value: "GDPR", label: "Ready" },
];

const INTEGRATIONS = [
  { name: "Stripe", desc: "Payments & Billing", color: "#635BFF", initial: "S" },
  { name: "Shopify", desc: "Product & Order Sync", color: "#96BF48", initial: "Sh" },
  { name: "PayPal", desc: "Smart Checkout", color: "#003087", initial: "P" },
  { name: "Supabase", desc: "Database & Realtime", color: "#3ECF8E", initial: "Su" },
  { name: "n8n", desc: "Workflow Automation", color: "#EA4B71", initial: "n" },
  { name: "Zapier", desc: "App Connections", color: "#FF4A00", initial: "Z" },
  { name: "Mailchimp", desc: "Email Marketing", color: "#FFD700", initial: "M" },
  { name: "Meta", desc: "Ads & CAPI", color: "#1877F2", initial: "fb" },
  { name: "Manus AI", desc: "Built-in AI Co-Pilot", color: "#6366f1", initial: "M" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const createCheckout = trpc.subscription.createCheckout.useMutation();

  useEffect(() => {
    document.title = "UnifyOne — Multi-Tenant Commerce Platform";
    const timer = setTimeout(() => setHeroVisible(true), 100);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", handleScroll); };
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) navigate("/dashboard");
    else window.location.href = getLoginUrl();
  };

  const handlePlanCheckout = async (planSlug: string, planName: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (planSlug === "enterprise") {
      window.open("mailto:skdev@1commercesolutions.com?subject=UnifyOne Enterprise Inquiry", "_blank");
      return;
    }
    setCheckoutLoading(planSlug);
    try {
      toast.info(`Redirecting to ${planName} checkout...`);
      const result = await createCheckout.mutateAsync({ planSlug, billingPeriod, origin: window.location.origin });
      if (result.url) window.open(result.url, "_blank");
      else toast.error("Could not create checkout session. Please try again.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#000000" }}>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-[#1A1A1A] shadow-lg" : "border-b border-transparent"}`} style={{ backgroundColor: scrolled ? "rgba(0,0,0,0.95)" : "transparent" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm border border-[#C9A84C]/40 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(201,168,76,0.1)" }}>
              <Layers className="w-3.5 h-3.5" style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight font-serif-display">UnifyOne</span>
              <span className="text-[#9A7A30] text-[9px] font-semibold tracking-[0.2em] uppercase ml-2 hidden sm:inline">by 1Commerce</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing", "Integrations"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-xs text-gray-400 hover:text-[#C9A84C] transition-colors tracking-wide uppercase font-medium">{item}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} className="font-semibold rounded-none px-5 h-9 text-sm" style={{ backgroundColor: "#C9A84C", color: "#000" }}>
                Dashboard <ArrowRight className="ml-1 w-3 h-3" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => window.location.href = getLoginUrl()} className="text-gray-400 hover:text-white text-xs tracking-wide uppercase">Sign In</Button>
                <Button onClick={handleGetStarted} className="font-semibold rounded-none px-5 h-9 text-sm" style={{ backgroundColor: "#C9A84C", color: "#000" }}>Get Started</Button>
              </>
            )}
          </div>
          <button
            className="md:hidden p-2.5 text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1A1A1A] px-4 py-4 space-y-1" style={{ backgroundColor: "rgba(0,0,0,0.97)" }}>
            {["Features", "How It Works", "Pricing", "Integrations"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="flex items-center justify-between text-gray-400 hover:text-[#C9A84C] transition-colors py-3 px-2 font-medium min-h-[44px] text-xs uppercase tracking-widest"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
                <ChevronRight className="w-4 h-4 opacity-40" />
              </a>
            ))}
            <div className="pt-3 border-t border-[#1A1A1A] flex flex-col gap-2">
              {isAuthenticated ? (
                <Button onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }} className="w-full font-semibold h-12 rounded-none" style={{ backgroundColor: "#C9A84C", color: "#000" }}>Dashboard</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => window.location.href = getLoginUrl()} className="w-full text-gray-400 hover:text-white border border-[#1A1A1A] h-12 rounded-none text-xs uppercase tracking-widest">Sign In</Button>
                  <Button onClick={handleGetStarted} className="w-full font-semibold h-12 rounded-none" style={{ backgroundColor: "#C9A84C", color: "#000" }}>Get Started →</Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center px-4 sm:px-6 overflow-hidden" style={{ background: "linear-gradient(to bottom, #000 0%, #050505 60%, #000 100%)" }}>
        {/* Subtle radial glow behind hero image */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[50%] h-[80%] pointer-events-none" style={{ background: "radial-gradient(ellipse at right center, rgba(201,168,76,0.04) 0%, transparent 70%)" }} />

        <div className={`max-w-6xl mx-auto w-full relative transition-all duration-700 pt-24 pb-16 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div className="text-left">
              {/* Eyebrow */}
              <p className="section-label mb-6">PNW Enterprises · Est. 2024</p>

              <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6">
                One Platform.{" "}
                <span className="gradient-text">Every Store.</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-400 mb-6 leading-relaxed max-w-lg">
                UnifyOne is the commerce infrastructure layer that connects your products, orders, payments, and automations — across every store, every channel, every integration.
              </p>

              {/* Manus AI callout — minimal, gold */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-px h-8 flex-shrink-0" style={{ backgroundColor: "#C9A84C" }} />
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#C9A84C" }}>Now Powered by Manus AI</p>
                  <p className="text-gray-500 text-xs mt-0.5">Intelligent gig co-pilot — earnings insights, route optimization, challenge strategy.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: "#C9A84C", color: "#000" }}
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-medium text-gray-300 border transition-all duration-200 hover:text-white hover:border-[#C9A84C]/40"
                  style={{ borderColor: "#2A2A2A" }}
                >
                  Explore the Platform
                </button>
              </div>
              <p className="text-xs mt-4" style={{ color: "#4A4A4A" }}>No credit card required · 14-day free trial · Cancel anytime</p>
            </div>

            {/* Right: hero visual */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute inset-0 blur-3xl" style={{ background: "radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)" }} />
                <img
                  src={HERO_VISUAL}
                  alt="UnifyOne — Powered by Manus AI"
                  className="relative w-full shadow-2xl"
                  style={{ border: "1px solid rgba(201,168,76,0.15)" }}
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-0 border-t" style={{ borderColor: "#1A1A1A" }}>
            {STATS.map((s, i) => (
              <div key={s.label} className={`py-6 px-4 sm:px-6 ${i < STATS.length - 1 ? "border-r" : ""}`} style={{ borderColor: "#1A1A1A" }}>
                <div className="text-2xl sm:text-3xl font-bold font-serif-display" style={{ color: "#C9A84C" }}>{s.value}</div>
                <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: "#4A4A4A" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <p className="section-label mb-4">Three Week Path</p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">From Chaos to Commerce</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t" style={{ borderColor: "#1A1A1A" }}>
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className={`pt-8 pb-6 pr-8 ${i < HOW_IT_WORKS.length - 1 ? "border-r" : ""}`} style={{ borderColor: "#1A1A1A" }}>
                  <div className="mb-4">
                    <span className="font-serif-display text-4xl font-bold" style={{ color: "rgba(201,168,76,0.25)" }}>{step.step}</span>
                    <div className="w-px h-4 mt-1 ml-1" style={{ backgroundColor: "#C9A84C", opacity: 0.4 }} />
                  </div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#9A7A30" }}>Week {i + 1}</p>
                  <h3 className="text-white font-semibold text-lg mb-3 font-serif-display">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: "#000" }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <p className="section-label mb-4">The Complete Package</p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">Everything You Need</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l" style={{ borderColor: "#1A1A1A" }}>
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="feature-card p-6 sm:p-7 group border-b border-r" style={{ borderColor: "#1A1A1A" }}>
                  <div className="w-9 h-9 flex items-center justify-center mb-5 flex-shrink-0" style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <Icon className="w-4 h-4" style={{ color: "#C9A84C" }} />
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section id="integrations" className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="section-label mb-4">Built for Speed</p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">Connect Your Entire Stack</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-0 border-t border-l" style={{ borderColor: "#1A1A1A" }}>
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="feature-card p-5 sm:p-6 text-center group border-b border-r" style={{ borderColor: "#1A1A1A" }}>
                <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center font-bold text-sm" style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#C9A84C" }}>
                  {int.initial}
                </div>
                <div className="text-white font-semibold text-xs">{int.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "#4A4A4A" }}>{int.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AUTOMATION DEMO (desktop only) ── */}
      <section id="automation" className="hidden lg:block py-24 px-6" style={{ backgroundColor: "#000" }}>
        <div className="max-w-7xl mx-auto">
          <AutomationFlowAnimation />
        </div>
      </section>

      {/* ── AUTOMATION DEMO — mobile static version ── */}
      <section className="lg:hidden py-14 px-4" style={{ backgroundColor: "#000" }}>
        <div className="max-w-sm mx-auto">
          <p className="section-label mb-4">Automation Pipeline</p>
          <h2 className="font-serif-display text-2xl font-bold text-white mb-3">Watch Your Commerce Run Itself</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">One order triggers a fully automated pipeline — payments, fulfillment, notifications, and analytics.</p>
          <div className="grid grid-cols-2 gap-0 border-t border-l" style={{ borderColor: "#1A1A1A" }}>
            {[
              { label: "Order Created", sub: "Shopify / UnifyOne" },
              { label: "n8n Triggered", sub: "Automation fires" },
              { label: "Stripe Charged", sub: "Payment captured" },
              { label: "Email Sent", sub: "Mailchimp receipt" },
              { label: "Owner Notified", sub: "Instant alert" },
              { label: "Analytics Updated", sub: "Real-time metrics" },
            ].map((step) => (
              <div key={step.label} className="p-4 border-b border-r" style={{ borderColor: "#1A1A1A" }}>
                <div className="w-1.5 h-1.5 mb-2" style={{ backgroundColor: "#C9A84C" }} />
                <p className="text-white text-xs font-semibold leading-tight">{step.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#4A4A4A" }}>{step.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANUS AI FEATURE SECTION ── */}
      <section id="manus-ai" className="py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-6xl mx-auto relative">
          {/* Section header */}
          <div className="mb-12 sm:mb-16">
            <p className="section-label mb-4">New — Manus AI Integration</p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Meet Your AI Gig Co-Pilot
            </h2>
            <p className="text-gray-500 text-base sm:text-lg max-w-2xl">
              Manus AI is now built directly into UnifyOne — an intelligent assistant that knows your shifts, your earnings, your routes, and your challenges. No setup. Always on.
            </p>
          </div>

          {/* Feature banner image */}
          <div className="overflow-hidden mb-10 sm:mb-14" style={{ border: "1px solid rgba(201,168,76,0.15)" }}>
            <img
              src={MANUS_AI_BANNER}
              alt="Manus AI — Your AI Gig Co-Pilot is Here. Chat, Route Intelligence, Money Manager panels."
              className="w-full"
              loading="lazy"
            />
          </div>

          {/* 4-feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l" style={{ borderColor: "#1A1A1A" }}>
            {[
              { emoji: "🤖", title: "AI Chat Assistant", desc: "Ask Manus anything about your earnings, tax deductions, or platform strategy. Full conversation history, context-aware responses." },
              { emoji: "📍", title: "Route Intelligence", desc: "AI-powered hot zone analysis, demand forecasting, and timing tips — updated in real time based on your GPS position." },
              { emoji: "💰", title: "Earnings Insights", desc: "Manus reads your shift data and surfaces actionable insights — which platform pays best, when to work, and how to maximize your $/hour." },
              { emoji: "🏆", title: "Challenge Strategy", desc: "Get AI-generated tips on which challenges to join, how to win active ones, and how to climb the leaderboard faster." },
            ].map((f) => (
              <div key={f.title} className="feature-card p-6 sm:p-7 group border-b border-r" style={{ borderColor: "#1A1A1A" }}>
                <div className="w-9 h-9 flex items-center justify-center mb-4 text-lg" style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  {f.emoji}
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA strip */}
          <div className="mt-10">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: "#C9A84C", color: "#000" }}
            >
              <Zap className="w-4 h-4" />
              Try Manus AI Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs mt-3" style={{ color: "#4A4A4A" }}>Available on all plans · No setup required</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: "#000" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="section-label mb-4">Success Stories</p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">What Our Clients Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l" style={{ borderColor: "#1A1A1A" }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="p-6 sm:p-8 flex flex-col gap-4 border-b border-r" style={{ borderColor: "#1A1A1A", backgroundColor: "#0A0A0A" }}>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5" style={{ fill: "#C9A84C", color: "#C9A84C" }} />
                  ))}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed flex-1">“{t.quote}”</p>
                <div className="pt-4 border-t" style={{ borderColor: "#1A1A1A" }}>
                  <div className="text-white text-sm font-semibold font-serif-display">{t.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#4A4A4A" }}>{t.role} · {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: "#060606" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="section-label mb-4">Pricing</p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            {/* Billing toggle */}
            <div className="flex items-center gap-1 p-1 w-fit" style={{ backgroundColor: "#0D0D0D", border: "1px solid #1A1A1A" }}>
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2 text-xs font-medium transition-all uppercase tracking-widest ${billingPeriod === "monthly" ? "text-black" : "text-gray-500 hover:text-white"}`}
                style={billingPeriod === "monthly" ? { backgroundColor: "#C9A84C" } : {}}
              >Monthly</button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-5 py-2 text-xs font-medium transition-all uppercase tracking-widest flex items-center gap-2 ${billingPeriod === "yearly" ? "text-black" : "text-gray-500 hover:text-white"}`}
                style={billingPeriod === "yearly" ? { backgroundColor: "#C9A84C" } : {}}
              >Yearly <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>-17%</span></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l" style={{ borderColor: "#1A1A1A" }}>
            {PLANS.map(plan => {
              const slug = plan.name.toLowerCase();
              const isLoading = checkoutLoading === slug;
              const displayPrice = billingPeriod === "yearly" && plan.price !== "Custom" ? plan.yearlyPrice : plan.price;
              return (
                <div key={plan.name} className={`pricing-card p-7 sm:p-8 relative border-b border-r flex flex-col`} style={{ borderColor: "#1A1A1A", backgroundColor: plan.highlight ? "#0D0D0D" : "#000" }}>
                  {plan.highlight && (
                    <div className="mb-4">
                      <span className="text-[9px] px-2.5 py-1 uppercase tracking-widest font-bold" style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>Most Popular</span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-lg mb-3 font-serif-display">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif-display text-4xl font-bold" style={{ color: "#C9A84C" }}>{displayPrice}</span>
                      <span className="text-gray-600 text-sm">{plan.price !== "Custom" ? "/mo" : ""}</span>
                    </div>
                    {billingPeriod === "yearly" && plan.price !== "Custom" && (
                      <p className="text-xs mt-1" style={{ color: "#9A7A30" }}>Billed annually · 2 months free</p>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-gray-400 text-sm">
                        <div className="w-1 h-1 flex-shrink-0" style={{ backgroundColor: "#C9A84C" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full font-semibold h-11 text-sm uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50`}
                    style={plan.highlight ? { backgroundColor: "#C9A84C", color: "#000" } : { border: "1px solid #2A2A2A", color: "#9A9A9A" }}
                    onClick={() => handlePlanCheckout(slug, plan.name)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Redirecting...
                      </span>
                    ) : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-6" style={{ color: "#3A3A3A" }}>All plans include a 14-day free trial. No credit card required to start.</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: "#000" }}>
        <div className="max-w-4xl mx-auto">
          <div className="p-10 sm:p-16 relative" style={{ border: "1px solid rgba(201,168,76,0.2)", backgroundColor: "#060606" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.03) 0%, transparent 70%)" }} />
            <div className="relative text-center">
              <p className="section-label mb-5">Ready to Launch?</p>
              <h2 className="font-serif-display text-3xl sm:text-5xl font-bold text-white mb-5">Start Your Journey</h2>
              <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-xl mx-auto">Join operators building scalable, automated commerce infrastructure on UnifyOne. Start free, scale when you're ready.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <button onClick={handleGetStarted} className="inline-flex items-center gap-2 px-10 py-4 text-sm font-semibold transition-all hover:opacity-90 w-full sm:w-auto justify-center" style={{ backgroundColor: "#C9A84C", color: "#000" }}>
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => window.open("mailto:skdev@1commercesolutions.com", "_blank")} className="inline-flex items-center gap-2 px-10 py-4 text-sm font-medium text-gray-400 transition-all hover:text-white w-full sm:w-auto justify-center" style={{ border: "1px solid #2A2A2A" }}>
                  Contact Sales
                </button>
              </div>
              <p className="text-xs mt-5" style={{ color: "#3A3A3A" }}>14-day free trial · No credit card · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 sm:py-12 px-4 sm:px-6" style={{ borderTop: "1px solid #1A1A1A", backgroundColor: "#000" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center" style={{ border: "1px solid rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.08)" }}>
                <Layers className="w-3 h-3" style={{ color: "#C9A84C" }} />
              </div>
              <span className="text-white font-bold font-serif-display">UnifyOne</span>
              <span className="text-xs ml-2 uppercase tracking-widest" style={{ color: "#4A4A4A" }}>by 1Commerce LLC</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {["Privacy", "Terms", "Security", "Docs", "Contact"].map((l, i) => (
                <a key={l} href={l === "Contact" ? "mailto:skdev@1commercesolutions.com" : l === "Privacy" ? "/privacy" : l === "Terms" ? "/terms" : "#"}
                  className="text-xs uppercase tracking-widest transition-colors hover:text-white" style={{ color: "#4A4A4A" }}>{l}</a>
              ))}
            </div>
          </div>
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderTop: "1px solid #1A1A1A" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "#2A2A2A" }}>© 2026 1Commerce LLC · All rights reserved</p>
            <p className="text-xs uppercase tracking-widest" style={{ color: "#2A2A2A" }}>SOC 2 Compliant · GDPR Ready · 1commerce.online</p>
          </div>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA BAR ── */}
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden" style={{ borderTop: "1px solid #1A1A1A", backgroundColor: "rgba(0,0,0,0.97)" }}>
          <div className="px-4 py-3 flex gap-2 items-center">
            <button
              onClick={handleGetStarted}
              className="flex-1 font-bold h-11 text-sm flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "#C9A84C", color: "#000" }}
            >
              Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.location.href = getLoginUrl()}
              className="h-11 px-4 text-xs uppercase tracking-widest text-gray-400 hover:text-white flex-shrink-0 transition-colors"
              style={{ border: "1px solid #1A1A1A" }}
            >
              Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
