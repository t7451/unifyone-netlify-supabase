import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, BarChart3, Zap, Globe, Shield, ArrowRight,
  CheckCircle, Package, Users, TrendingUp, Layers, Workflow
} from "lucide-react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: Layers, title: "Multi-Tenant Architecture", desc: "Isolated environments for each store with dedicated data, settings, and team access." },
  { icon: ShoppingCart, title: "Commerce Engine", desc: "Full product catalog, inventory tracking, order processing, and customer management." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time revenue metrics, customer insights, and sales performance charts." },
  { icon: Zap, title: "Stripe Payments", desc: "Checkout sessions, subscription billing, webhook handling, and refund management." },
  { icon: Globe, title: "Shopify Sync", desc: "Bidirectional product and order sync with your Shopify store via webhooks." },
  { icon: Workflow, title: "n8n Automation", desc: "Trigger n8n workflows for order fulfillment, notifications, and data pipelines." },
  { icon: Shield, title: "Role-Based Access", desc: "Admin and user roles with fine-grained procedure-level authorization." },
  { icon: TrendingUp, title: "Realtime Updates", desc: "Live order status and inventory changes powered by Supabase Realtime." },
];

const PLANS = [
  { name: "Starter", price: "$29", period: "/mo", features: ["1 Store", "500 Products", "1,000 Orders/mo", "Basic Analytics", "Stripe Payments"], cta: "Start Free Trial", highlight: false },
  { name: "Growth", price: "$79", period: "/mo", features: ["5 Stores", "10,000 Products", "Unlimited Orders", "Advanced Analytics", "Shopify Sync", "n8n Automation"], cta: "Start Free Trial", highlight: true },
  { name: "Enterprise", price: "Custom", period: "", features: ["Unlimited Stores", "Unlimited Products", "SLA Guarantee", "Dedicated Support", "Custom Integrations", "White-label Option"], cta: "Contact Sales", highlight: false },
];

const STATS = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 200ms", label: "API Response" },
  { value: "SOC 2", label: "Compliant" },
  { value: "GDPR", label: "Ready" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) navigate("/dashboard");
    else window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1128" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#0A1128]" />
            </div>
            <span className="text-white font-bold text-lg">UnifyOne</span>
            <Badge variant="outline" className="text-[10px] border-[#00D9FF]/40 text-[#00D9FF] ml-1">BETA</Badge>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Pricing", "Integrations"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-400 hover:text-[#00D9FF] transition-colors">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => window.location.href = getLoginUrl()} className="text-gray-300 hover:text-white">
                  Sign In
                </Button>
                <Button onClick={handleGetStarted} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00D9FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#6A1B9A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <Badge className="mb-6 bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 px-4 py-1.5">
            Multi-Tenant Commerce Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
            One Platform.{" "}
            <span className="gradient-text">Every Store.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            UnifyOne unifies your entire commerce ecosystem — products, orders, payments, and analytics — across every tenant, every channel, every integration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold text-base px-8 h-12 cyan-glow-sm"
            >
              Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 font-medium text-base px-8 h-12"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              See Features
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="glass rounded-xl p-4">
                <div className="text-2xl font-bold text-[#00D9FF]">{s.value}</div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Scale</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Built for operators who need enterprise-grade infrastructure without enterprise-grade complexity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#00D9FF]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Powered by Best-in-Class Integrations</h2>
            <p className="text-gray-400 mb-10">Connect your existing tools without replacing them.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "Stripe", desc: "Payments & Billing", color: "#635BFF" },
                { name: "Shopify", desc: "Product & Order Sync", color: "#96BF48" },
                { name: "Supabase", desc: "Database & Realtime", color: "#3ECF8E" },
                { name: "n8n", desc: "Workflow Automation", color: "#EA4B71" },
              ].map(int => (
                <div key={int.name} className="feature-card rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: int.color + "33", border: `1px solid ${int.color}55` }}>
                    {int.name[0]}
                  </div>
                  <div className="text-white font-semibold">{int.name}</div>
                  <div className="text-gray-400 text-sm mt-1">{int.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">No hidden fees. No surprises. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map(plan => (
              <div key={plan.name} className={`pricing-card rounded-2xl p-8 relative ${plan.highlight ? "border-2 border-[#00D9FF] bg-[#00D9FF]/5 cyan-glow-sm" : "feature-card"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#00D9FF] text-[#0A1128] font-bold px-4">Most Popular</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-white font-bold text-xl mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#00D9FF] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-semibold ${plan.highlight ? "bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90" : "border border-white/20 text-white hover:bg-white/5 bg-transparent"}`}
                  onClick={handleGetStarted}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-2xl p-12 border border-[#00D9FF]/20">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Unify Your Commerce?</h2>
            <p className="text-gray-400 text-lg mb-8">Join operators building scalable, automated commerce infrastructure on UnifyOne.</p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold text-base px-10 h-12 cyan-glow-sm"
            >
              Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center">
              <Layers className="w-3 h-3 text-[#0A1128]" />
            </div>
            <span className="text-white font-semibold">UnifyOne</span>
          </div>
          <p className="text-gray-500 text-sm">Powered by 1Commerce LLC · SOC 2 Compliant · GDPR Ready</p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Security"].map(item => (
              <a key={item} href="#" className="text-gray-500 hover:text-[#00D9FF] text-sm transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
