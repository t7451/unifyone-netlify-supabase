import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Shield, Layers, Zap, Lock, TrendingUp, ChevronRight,
  CheckCircle, ArrowRight, Building2, Cpu, Globe, Users,
  Star, Quote
} from "lucide-react";

const CATHEDRAL_TIERS = [
  {
    tier: "Tier 0",
    name: "Family Trust",
    icon: Shield,
    color: "#FFD700",
    desc: "The vault. Asset protection layer that cannot be touched.",
  },
  {
    tier: "Tier 1",
    name: "Holding Company",
    icon: Building2,
    color: "#00D9FF",
    desc: "Owns everything, does nothing. Pure control and liability separation.",
  },
  {
    tier: "2A",
    name: "PNW Solutions",
    icon: Cpu,
    color: "#7C3AED",
    desc: "The tech arm. Builds UnifyOne, SaaS products, and AI integrations.",
  },
  {
    tier: "2B",
    name: "KSK Industrial",
    icon: Globe,
    color: "#10B981",
    desc: "Logistics and 3PL. Quantum-optimized fulfillment infrastructure.",
  },
  {
    tier: "2C",
    name: "PAKC Foundation",
    icon: Users,
    color: "#F59E0B",
    desc: "501(c)(3) non-profit. Grants, credibility, and tax advantages.",
  },
];

const SOVEREIGN_STACK = [
  { label: "Local-First Thin Client", desc: "Runs on-device. Works offline. You own the glass." },
  { label: "On-Device AI", desc: "Snapdragon X Elite. Trade secrets never leave the hardware." },
  { label: "Off-Grid LoRa Mesh", desc: "Meshtastic nodes. Logistics that work without the internet." },
  { label: "UnifyOne Commerce", desc: "Multi-tenant platform. One dashboard for every store." },
  { label: "Azure Quantum Logistics", desc: "Routing problems solved in seconds, not hours." },
  { label: "Automated Revenue Engine", desc: "n8n + Zapier + Meta CAPI. Runs 24/7 without you." },
];

const TESTIMONIALS = [
  {
    quote: "The Cathedral Principle changed how I think about business architecture entirely. This isn't a SaaS — it's sovereignty.",
    name: "Beta Tester",
    role: "E-commerce Founder",
    stars: 5,
  },
  {
    quote: "I was one platform ban away from zero. Now I have a structure that can't be shut down.",
    name: "Early Adopter",
    role: "Shopify Merchant",
    stars: 5,
  },
  {
    quote: "Agency-grade infrastructure without the agency price tag. This is what I needed 3 years ago.",
    name: "Waitlist Member",
    role: "Digital Consultant",
    stars: 5,
  },
];

export default function Sovereign() {
  const [step, setStep] = useState<"landing" | "form" | "success">("landing");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
    currentStack: "",
    monthlyRevenue: "" as "" | "pre_revenue" | "under_5k" | "5k_25k" | "25k_100k" | "over_100k",
    biggestChallenge: "",
  });
  const [animatedCount, setAnimatedCount] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: countData } = trpc.sovereign.getCount.useQuery();
  const joinWaitlist = trpc.sovereign.joinWaitlist.useMutation();

  useEffect(() => {
    document.title = "The Sovereign Stack — 1Commerce";
  }, []);

  useEffect(() => {
    if (countData?.count) {
      const target = countData.count;
      const duration = 1500;
      const step = Math.ceil(target / (duration / 16));
      let current = 0;
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        setAnimatedCount(current);
        if (current >= target) clearInterval(timer);
      }, 16);
      return () => clearInterval(timer);
    }
  }, [countData?.count]);

  // Parse UTM params
  const utmParams = (() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      referralSource: params.get("ref") || undefined,
    };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Email is required");
      return;
    }
    try {
      const result = await joinWaitlist.mutateAsync({
        ...formData,
        monthlyRevenue: formData.monthlyRevenue || undefined,
        ...utmParams,
      });
      if (result.success) {
        setStep("success");
        if (!result.alreadyJoined) {
          toast.success(result.message);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    }
  };

  const scrollToForm = () => {
    setStep("form");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#00D9FF]" />
          </div>
          <h1 className="text-3xl font-bold mb-4">You're on the list.</h1>
          <p className="text-gray-400 text-lg mb-2">
            We'll reach out personally when we're ready to build your Sovereign Stack.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            This isn't a newsletter. This is a conversation.
          </p>
          <div className="bg-[#0A1128] border border-[#1E3A5F] rounded-xl p-6 mb-8 text-left">
            <p className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wider">While you wait</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#00D9FF] mt-0.5 shrink-0" />
                <span className="text-sm text-gray-300">Share the waitlist with one other founder who's tired of being fragile</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#00D9FF] mt-0.5 shrink-0" />
                <span className="text-sm text-gray-300">
                  Explore UnifyOne — the commerce platform that powers the stack:{" "}
                  <Link href="/" className="text-[#00D9FF] hover:underline">1commerce.online</Link>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#00D9FF] mt-0.5 shrink-0" />
                <span className="text-sm text-gray-300">Follow Keith on LinkedIn for the Cathedral Principle breakdown</span>
              </li>
            </ul>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-[#1E3A5F] text-gray-300 hover:bg-[#0A1128]">
              ← Back to UnifyOne
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/90 backdrop-blur-sm border-b border-[#1E3A5F]/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <span className="text-[#00D9FF] font-bold text-lg tracking-tight">1Commerce</span>
          </Link>
          <Button
            onClick={scrollToForm}
            size="sm"
            className="bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-semibold text-xs px-4"
          >
            Join Waitlist
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00D9FF]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30 mb-6 text-xs px-3 py-1">
            Limited Waitlist — {animatedCount > 0 ? `${animatedCount} founders already in` : "Be among the first"}
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
            Stop being fragile.
            <br />
            <span className="text-[#00D9FF]">Own the structure.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            I spent 6 months building a $10M business architecture with zero employees and zero VC funding.
            It can't be shut down. Now I'm building it for a handful of serious entrepreneurs.
          </p>
          <p className="text-base text-gray-500 max-w-xl mx-auto mb-10">
            This isn't a course. This isn't another SaaS. This is the <strong className="text-white">Sovereign Stack</strong> — a complete corporate and technical architecture designed for resilience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-bold text-base px-8 h-14 w-full sm:w-auto"
            >
              Join the Waitlist <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-sm text-gray-500">No pitch. No sales call. Just a conversation.</p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 px-4 bg-[#0A0F1E]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Solopreneur's Trap</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              You escaped the 9-to-5 just to build a new prison. You're one bad client, one algorithm change, one platform ban away from zero.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "⚠️", title: "Platform Dependency", desc: "One algorithm change and your traffic disappears overnight." },
              { icon: "⚠️", title: "Legal Exposure", desc: "Everything you own is at risk from a single lawsuit or dispute." },
              { icon: "⚠️", title: "Operational Fragility", desc: "You are the business. If you stop, it stops." },
            ].map((item) => (
              <div key={item.title} className="bg-[#0D1526] border border-red-900/30 rounded-xl p-6">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-xl font-semibold text-white">
              "We're told to hustle harder. That's a losing game. <span className="text-[#00D9FF]">You're digging for gold with a plastic shovel while they own the mountain.</span>"
            </p>
            <p className="text-sm text-gray-500 mt-2">— Keith Skaggs, Founder of 1Commerce LLC</p>
          </div>
        </div>
      </section>

      {/* The Cathedral Principle */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-[#7C3AED]/10 text-[#A78BFA] border-[#7C3AED]/30 mb-4 text-xs px-3 py-1">
              The Solution
            </Badge>
            <h2 className="text-3xl font-bold mb-4">The Cathedral Principle</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Instead of being the business, you build the <em>structure</em> that runs the business. A multi-layered corporate architecture designed for resilience, tax efficiency, and sovereign control.
            </p>
          </div>
          <div className="space-y-4">
            {CATHEDRAL_TIERS.map((tier, i) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.tier}
                  className="flex items-start gap-4 bg-[#0A1128] border border-[#1E3A5F] rounded-xl p-5"
                  style={{ marginLeft: `${i * 16}px`, borderLeftColor: tier.color, borderLeftWidth: "3px" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${tier.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: tier.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono" style={{ color: tier.color }}>{tier.tier}</span>
                      <span className="font-semibold text-white">{tier.name}</span>
                    </div>
                    <p className="text-sm text-gray-400">{tier.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Sovereign Tech Stack */}
      <section className="py-16 px-4 bg-[#0A0F1E]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30 mb-4 text-xs px-3 py-1">
              The Technology
            </Badge>
            <h2 className="text-3xl font-bold mb-4">The Sovereign Tech Stack</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              This isn't cloud-based SaaS that can be shut off. This is infrastructure you own.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOVEREIGN_STACK.map((item) => (
              <div key={item.label} className="bg-[#0D1526] border border-[#1E3A5F] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-[#00D9FF]" />
                  <span className="font-semibold text-sm text-white">{item.label}</span>
                </div>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What We Build For You</h2>
            <p className="text-gray-400">The complete Sovereign Stack implementation. White-glove. Done for you.</p>
          </div>
          <div className="bg-[#0A1128] border border-[#1E3A5F] rounded-2xl p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                "Multi-entity corporate structure (Trust + Holding + Ops)",
                "501(c)(3) non-profit setup for grant access",
                "UnifyOne multi-tenant commerce platform",
                "Automated revenue engine (n8n + Meta CAPI + Stripe)",
                "Shopify integration with quantum logistics routing",
                "Local-first dashboard with offline capability",
                "On-device AI with air-gapped privacy",
                "Off-grid LoRa mesh communication network",
                "90-day implementation roadmap",
                "Ongoing architecture consultation",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#00D9FF] mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#1E3A5F] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-white">$5,000 – $10,000</p>
                <p className="text-sm text-gray-400">One-time implementation fee. No recurring SaaS.</p>
              </div>
              <Button
                onClick={scrollToForm}
                className="bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-bold px-8 h-12 w-full sm:w-auto"
              >
                Apply for a Spot <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-[#0A0F1E]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Early Feedback</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[#0D1526] border border-[#1E3A5F] rounded-xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#FFD700] text-[#FFD700]" />
                  ))}
                </div>
                <Quote className="w-5 h-5 text-[#00D9FF]/40 mb-3" />
                <p className="text-sm text-gray-300 mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Form */}
      <section ref={formRef} className="py-16 px-4" id="waitlist">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30 mb-4 text-xs px-3 py-1">
              Limited Spots
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Join the Waitlist</h2>
            <p className="text-gray-400">
              This isn't for everyone. We're looking for serious entrepreneurs who are ready to own the mountain.
            </p>
          </div>

          {step === "landing" ? (
            <div className="text-center">
              <Button
                onClick={() => setStep("form")}
                size="lg"
                className="bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-bold text-base px-10 h-14"
              >
                Apply Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#0A1128] border border-[#1E3A5F] rounded-2xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">Email *</label>
                  <Input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="bg-[#0D1526] border-[#1E3A5F] text-white placeholder:text-gray-600 focus:border-[#00D9FF]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">Your Name</label>
                  <Input
                    placeholder="Keith Skaggs"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="bg-[#0D1526] border-[#1E3A5F] text-white placeholder:text-gray-600 focus:border-[#00D9FF]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Company / Business Name</label>
                <Input
                  placeholder="1Commerce LLC"
                  value={formData.company}
                  onChange={(e) => setFormData(p => ({ ...p, company: e.target.value }))}
                  className="bg-[#0D1526] border-[#1E3A5F] text-white placeholder:text-gray-600 focus:border-[#00D9FF]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Current Monthly Revenue</label>
                <Select
                  value={formData.monthlyRevenue}
                  onValueChange={(v) => setFormData(p => ({ ...p, monthlyRevenue: v as typeof formData.monthlyRevenue }))}
                >
                  <SelectTrigger className="bg-[#0D1526] border-[#1E3A5F] text-white focus:border-[#00D9FF]">
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1526] border-[#1E3A5F]">
                    <SelectItem value="pre_revenue">Pre-revenue</SelectItem>
                    <SelectItem value="under_5k">Under $5K/mo</SelectItem>
                    <SelectItem value="5k_25k">$5K – $25K/mo</SelectItem>
                    <SelectItem value="25k_100k">$25K – $100K/mo</SelectItem>
                    <SelectItem value="over_100k">Over $100K/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">What's your current tech stack?</label>
                <Input
                  placeholder="Shopify, WooCommerce, custom build..."
                  value={formData.currentStack}
                  onChange={(e) => setFormData(p => ({ ...p, currentStack: e.target.value }))}
                  className="bg-[#0D1526] border-[#1E3A5F] text-white placeholder:text-gray-600 focus:border-[#00D9FF]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">What's your biggest challenge right now?</label>
                <Textarea
                  placeholder="Platform dependency, scaling, legal exposure, operational chaos..."
                  value={formData.biggestChallenge}
                  onChange={(e) => setFormData(p => ({ ...p, biggestChallenge: e.target.value }))}
                  className="bg-[#0D1526] border-[#1E3A5F] text-white placeholder:text-gray-600 focus:border-[#00D9FF] min-h-[80px] resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={joinWaitlist.isPending}
                className="w-full bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-bold h-12 text-base"
              >
                {joinWaitlist.isPending ? "Submitting..." : "Join the Sovereign Stack Waitlist"}
                {!joinWaitlist.isPending && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                No spam. No pitch decks. We'll reach out personally when we're ready to build your stack.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#1E3A5F]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-sm text-gray-400">1Commerce LLC — PNW Enterprises</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300">Terms</Link>
            <Link href="/" className="hover:text-gray-300 text-[#00D9FF]">UnifyOne Platform →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
