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
    <div className="min-h-screen" style={{ backgroundColor: "#0A1128" }}>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass border-b border-white/10 shadow-lg" : "border-b border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center shadow-lg flex-shrink-0">
              <Layers className="w-4 h-4 text-[#0A1128]" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">UnifyOne</span>
            <Badge variant="outline" className="text-[10px] border-[#00D9FF]/40 text-[#00D9FF] ml-1 hidden sm:flex">BETA</Badge>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing", "Integrations"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm text-gray-400 hover:text-[#00D9FF] transition-colors font-medium">{item}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
                Dashboard <ArrowRight className="ml-1 w-3 h-3" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => window.location.href = getLoginUrl()} className="text-gray-300 hover:text-white hover:bg-white/5">Sign In</Button>
                <Button onClick={handleGetStarted} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">Get Started Free</Button>
              </>
            )}
          </div>
          <button
            className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/10 px-4 py-4 space-y-1">
            {["Features", "How It Works", "Pricing", "Integrations"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="flex items-center justify-between text-gray-300 hover:text-[#00D9FF] transition-colors py-3 px-2 rounded-lg hover:bg-white/5 font-medium min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
                <ChevronRight className="w-4 h-4 opacity-40" />
              </a>
            ))}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }} className="w-full bg-[#00D9FF] text-[#0A1128] font-semibold h-12">Dashboard</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => window.location.href = getLoginUrl()} className="w-full text-gray-300 hover:text-white border border-white/10 h-12">Sign In</Button>
                  <Button onClick={handleGetStarted} className="w-full bg-[#00D9FF] text-[#0A1128] font-semibold h-12">Get Started Free →</Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[300px] sm:h-[400px] bg-[#00D9FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-[#6A1B9A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className={`max-w-6xl mx-auto relative transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00D9FF]/30 bg-[#00D9FF]/5 text-[#00D9FF] text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse flex-shrink-0" />
                  Multi-Tenant Commerce Platform
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/5 text-violet-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
                  Now with Manus AI
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5">
                One Platform.{" "}
                <span className="gradient-text">Every Store.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 mb-4 leading-relaxed">
                UnifyOne is the commerce infrastructure layer that connects your products, orders, payments, and automations — across every store, every channel, every integration.
              </p>
              <p className="text-base text-gray-500 mb-4 leading-relaxed">
                Built for operators who need enterprise-grade infrastructure without the enterprise price tag. Connect Shopify, wire Stripe, automate with n8n — and manage everything from one dashboard.
              </p>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/5 mb-8">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-violet-300 text-sm font-semibold leading-tight">Powered by Manus AI</p>
                  <p className="text-gray-500 text-xs">Your intelligent gig co-pilot — earnings insights, route optimization, and challenge strategy, built in.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold text-base px-8 h-12 shadow-lg shadow-[#00D9FF]/20 w-full sm:w-auto"
                >
                  Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="border border-white/10 text-white hover:bg-white/5 font-medium text-base px-6 h-12 w-full sm:w-auto"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                >
                  See How It Works
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-4">No credit card required · 14-day free trial · Cancel anytime</p>
            </div>

            {/* Right: hero visual */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00D9FF]/10 to-[#6A1B9A]/10 rounded-3xl blur-2xl" />
                <img
                  src={HERO_VISUAL}
                  alt="UnifyOne commerce platform dashboard visualization"
                  className="relative rounded-2xl w-full shadow-2xl border border-white/10"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-[#00D9FF]">{s.value}</div>
                <div className="text-xs sm:text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] mb-4">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">From Chaos to Commerce in 3 Steps</h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">Most commerce operators run 5+ tools that don't talk to each other. UnifyOne changes that.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%_-_12px)] w-6 z-10">
                      <ArrowRight className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl font-black opacity-20 text-white leading-none">{step.step}</span>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: step.color + "20", border: `1px solid ${step.color}40` }}>
                        <Icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] mb-4">Platform Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need to Scale</h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">Built for operators who need enterprise-grade infrastructure without enterprise-grade complexity.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="feature-card rounded-xl p-5 sm:p-6 group hover:border-[#00D9FF]/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: f.color + "20", border: `1px solid ${f.color}40` }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">{f.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section id="integrations" className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] mb-4">Integrations</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Connect Your Entire Stack</h2>
            <p className="text-gray-400 text-base sm:text-lg">Connect your existing tools without replacing them. UnifyOne speaks the APIs you already use.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="feature-card rounded-xl p-4 sm:p-6 text-center group hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg" style={{ backgroundColor: int.color + "25", border: `1px solid ${int.color}40`, color: int.color }}>
                  {int.initial}
                </div>
                <div className="text-white font-semibold text-sm">{int.name}</div>
                <div className="text-gray-400 text-xs mt-1">{int.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AUTOMATION DEMO (desktop only — avoids mobile layout shift) ── */}
      <section id="automation" className="hidden lg:block py-24 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <AutomationFlowAnimation />
        </div>
      </section>

      {/* ── AUTOMATION DEMO — mobile static version ── */}
      <section className="lg:hidden py-14 px-4 bg-white/[0.01]">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#EA4B71]/30 bg-[#EA4B71]/5 text-[#EA4B71] text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4B71]" />
              Automation Pipeline
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Watch Your Commerce Run Itself</h2>
            <p className="text-gray-400 text-sm leading-relaxed">One order triggers a fully automated pipeline — payments, fulfillment, notifications, and analytics.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Order Created", sub: "Shopify / UnifyOne", color: "#96BF48" },
              { label: "n8n Triggered", sub: "Automation fires", color: "#EA4B71" },
              { label: "Stripe Charged", sub: "Payment captured", color: "#635BFF" },
              { label: "Email Sent", sub: "Mailchimp receipt", color: "#FFD700" },
              { label: "Owner Notified", sub: "Instant alert", color: "#00D9FF" },
              { label: "Analytics Updated", sub: "Real-time metrics", color: "#10B981" },
            ].map((step) => (
              <div key={step.label} className="rounded-xl p-4 border border-white/10 bg-white/[0.03]">
                <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: step.color }} />
                <p className="text-white text-xs font-semibold leading-tight">{step.label}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">{step.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {["n8n", "Stripe", "Mailchimp", "Shopify", "Zapier", "Supabase"].map((name) => (
              <span key={name} className="text-[10px] px-2.5 py-1 rounded-md font-medium bg-white/5 text-gray-400 border border-white/10">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANUS AI FEATURE SECTION ── */}
      <section id="manus-ai" className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-indigo-900/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          {/* Section header */}
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/5 text-violet-400 text-sm font-medium mb-5">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              New — Manus AI Integration
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Meet Your AI Gig Co-Pilot
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Manus AI is now built directly into UnifyOne — an intelligent assistant that knows your shifts, your earnings, your routes, and your challenges. No setup. Always on.
            </p>
          </div>

          {/* Feature banner image */}
          <div className="rounded-2xl overflow-hidden border border-violet-500/20 shadow-2xl shadow-violet-900/20 mb-10 sm:mb-14">
            <img
              src={MANUS_AI_BANNER}
              alt="Manus AI — Your AI Gig Co-Pilot is Here. Chat, Route Intelligence, Money Manager panels."
              className="w-full"
              loading="lazy"
            />
          </div>

          {/* 4-feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                emoji: "🤖",
                title: "AI Chat Assistant",
                desc: "Ask Manus anything about your earnings, tax deductions, or platform strategy. Full conversation history, context-aware responses.",
                color: "#6366f1",
              },
              {
                emoji: "📍",
                title: "Route Intelligence",
                desc: "AI-powered hot zone analysis, demand forecasting, and timing tips — updated in real time based on your GPS position.",
                color: "#06b6d4",
              },
              {
                emoji: "💰",
                title: "Earnings Insights",
                desc: "Manus reads your shift data and surfaces actionable insights — which platform pays best, when to work, and how to maximize your $/hour.",
                color: "#10b981",
              },
              {
                emoji: "🏆",
                title: "Challenge Strategy",
                desc: "Get AI-generated tips on which challenges to join, how to win active ones, and how to climb the leaderboard faster.",
                color: "#f59e0b",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="feature-card rounded-xl p-5 sm:p-6 border border-white/10 hover:border-violet-500/30 transition-all duration-300 group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: f.color + "20", border: `1px solid ${f.color}40` }}
                >
                  {f.emoji}
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">{f.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA strip */}
          <div className="mt-10 text-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-violet-900/30"
            >
              <Zap className="w-4 h-4" />
              Try Manus AI Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-gray-600 text-xs mt-3">Available on all plans · No setup required</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] mb-4">Social Proof</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Operators Trust UnifyOne</h2>
            <p className="text-gray-400 text-base sm:text-lg">Real results from real commerce operators.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="glass rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00D9FF]/30 to-[#6A1B9A]/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-[#00D9FF]" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-base sm:text-lg">No hidden fees. No surprises. Cancel anytime.</p>
            <div className="flex items-center justify-center gap-1 mt-6 sm:mt-8 p-1 rounded-xl bg-white/5 border border-white/10 w-fit mx-auto">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${billingPeriod === "monthly" ? "bg-[#00D9FF] text-[#0A1128] shadow" : "text-gray-400 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 min-h-[40px] ${billingPeriod === "yearly" ? "bg-[#00D9FF] text-[#0A1128] shadow" : "text-gray-400 hover:text-white"}`}
              >
                Yearly
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold hidden sm:inline">Save 17%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {PLANS.map(plan => {
              const slug = plan.name.toLowerCase();
              const isLoading = checkoutLoading === slug;
              const displayPrice = billingPeriod === "yearly" && plan.price !== "Custom" ? plan.yearlyPrice : plan.price;
              return (
                <div key={plan.name} className={`pricing-card rounded-2xl p-6 sm:p-8 relative ${plan.highlight ? "border-2 border-[#00D9FF] bg-[#00D9FF]/5 cyan-glow-sm" : "feature-card"}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#00D9FF] text-[#0A1128] font-bold px-4">Most Popular</Badge>
                    </div>
                  )}
                  <div className="mb-5 sm:mb-6">
                    <h3 className="text-white font-bold text-xl mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">{displayPrice}</span>
                      <span className="text-gray-400">{plan.price !== "Custom" ? "/mo" : ""}</span>
                    </div>
                    {billingPeriod === "yearly" && plan.price !== "Custom" && (
                      <p className="text-xs text-green-400 mt-1">Billed annually · 2 months free</p>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-6 sm:mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                        <CheckCircle className="w-4 h-4 text-[#00D9FF] flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full font-semibold h-11 ${plan.highlight ? "bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90" : "border border-white/20 text-white hover:bg-white/5 bg-transparent"}`}
                    onClick={() => handlePlanCheckout(slug, plan.name)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Redirecting...
                      </span>
                    ) : plan.cta}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-center text-gray-600 text-sm mt-6">All plans include a 14-day free trial. No credit card required to start.</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 pb-24 sm:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-2xl p-8 sm:p-12 border border-[#00D9FF]/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D9FF]/5 to-[#6A1B9A]/5 pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Unify Your Commerce?</h2>
              <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl mx-auto">Join operators building scalable, automated commerce infrastructure on UnifyOne. Start free, scale when you're ready.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button size="lg" onClick={handleGetStarted} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold text-base px-8 h-12 shadow-lg shadow-[#00D9FF]/20 w-full sm:w-auto">
                  Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button size="lg" variant="ghost" className="text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 h-12 px-6 w-full sm:w-auto" onClick={() => window.open("mailto:skdev@1commercesolutions.com", "_blank")}>
                  Contact Sales
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-4">14-day free trial · No credit card · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-[#0A1128]" />
              </div>
              <span className="text-white font-bold text-lg">UnifyOne</span>
              <span className="text-gray-500 text-sm ml-2">by 1Commerce LLC</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <a href="/privacy" className="text-gray-500 hover:text-[#00D9FF] text-sm transition-colors">Privacy</a>
              <a href="/terms" className="text-gray-500 hover:text-[#00D9FF] text-sm transition-colors">Terms</a>
              <a href="#" className="text-gray-500 hover:text-[#00D9FF] text-sm transition-colors">Security</a>
              <a href="#" className="text-gray-500 hover:text-[#00D9FF] text-sm transition-colors">Docs</a>
              <a href="mailto:skdev@1commercesolutions.com" className="text-gray-500 hover:text-[#00D9FF] text-sm transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-gray-600 text-xs sm:text-sm">© 2026 1Commerce LLC · All rights reserved</p>
            <p className="text-gray-600 text-xs sm:text-sm">SOC 2 Compliant · GDPR Ready · 1commerce.online</p>
          </div>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA BAR ── */}
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
          <div className="glass border-t border-white/10 px-4 py-3 flex gap-2 items-center">
            <Button
              onClick={handleGetStarted}
              className="flex-1 bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11 text-sm"
            >
              Start Free Trial <ArrowRight className="ml-1 w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = getLoginUrl()}
              className="border border-white/10 text-gray-300 hover:text-white h-11 px-4 text-sm flex-shrink-0"
            >
              Sign In
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
