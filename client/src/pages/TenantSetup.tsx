import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Layers, ArrowRight, Store, CheckCircle, Zap, Shield, Crown,
  Package, ShoppingCart, BarChart3, Loader2, Sparkles
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Store Details" },
  { id: 2, label: "Choose Plan" },
  { id: 3, label: "Ready" },
];

const PLAN_CONFIG = [
  {
    slug: "starter",
    name: "Acolyte",
    price: "Free",
    icon: Zap,
    color: "#3B82F6",
    features: ["1 Store", "100 Products", "500 Orders/mo", "Basic Analytics", "Stripe Checkout"],
    recommended: false,
  },
  {
    slug: "pro",
    name: "Architect",
    price: "$49/mo",
    icon: Shield,
    color: "#00D9FF",
    features: ["5 Stores", "Unlimited Products", "Unlimited Orders", "Manus AI Included", "All Payment Rails", "Automation Layer"],
    recommended: true,
  },
  {
    slug: "enterprise",
    name: "Cathedral",
    price: "$149/mo",
    icon: Crown,
    color: "#F59E0B",
    features: ["Unlimited Stores", "White-Label Ready", "Custom Domains", "SLA Guarantee", "Dedicated Infrastructure"],
    recommended: false,
  },
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function TenantSetup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [visible, setVisible] = useState(false);

  // Auto-populate store name from user name on mount
  useEffect(() => {
    if (user?.name && !name) {
      const autoName = `${user.name}'s Store`;
      setName(autoName);
      setSlug(slugify(autoName));
    }
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [user]);

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: () => {
      setStep(3);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setStep(2);
  };

  const handleStep2Submit = () => {
    createTenant.mutate({ name: name.trim(), slug: slug.trim() });
  };

  const handleFinish = () => {
    toast.success("Welcome to UnifyOne! Your store is ready.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "#0A1128" }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00D9FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#6A1B9A]/8 rounded-full blur-3xl" />
      </div>

      <div className={`w-full max-w-lg relative transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00D9FF]/20">
            <Layers className="w-7 h-7 text-[#0A1128]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to UnifyOne</h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === 3 ? "Your store is ready!" : "Let's set up your store in 2 quick steps."}
          </p>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.slice(0, 2).map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  step === s.id
                    ? "bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30"
                    : step > s.id
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-white/5 text-gray-500 border border-white/10"
                }`}>
                  {step > s.id
                    ? <CheckCircle className="w-3 h-3" />
                    : <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] font-bold"
                        style={{ borderColor: step === s.id ? "#00D9FF" : "rgba(255,255,255,0.2)" }}>
                        {s.id}
                      </span>
                  }
                  {s.label}
                </div>
                {i === 0 && (
                  <div className={`w-8 h-px transition-colors ${step > s.id ? "bg-emerald-500/40" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Store Details */}
        {step === 1 && (
          <div className="glass rounded-2xl p-8 border border-white/10">
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300 font-medium text-sm">Store Name</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Jimbo's Iron & Thread"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#00D9FF]/50 h-11"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-gray-300 font-medium text-sm">
                  Store URL Slug
                  <span className="text-gray-500 font-normal ml-2 text-xs">(auto-generated)</span>
                </Label>
                <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden focus-within:border-[#00D9FF]/50 transition-colors">
                  <span className="px-3 py-2.5 text-gray-500 text-sm bg-white/3 border-r border-white/10 whitespace-nowrap">
                    unifyone.app/
                  </span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
                    placeholder="my-store"
                    pattern="[a-z0-9-]+"
                    className="border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 h-11"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Lowercase letters, numbers, and hyphens only. Cannot be changed later.</p>
              </div>

              <Button
                type="submit"
                disabled={!name.trim() || !slug.trim()}
                className="w-full bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11 mt-2"
              >
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {PLAN_CONFIG.map(plan => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.slug;
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    onClick={() => setSelectedPlan(plan.slug)}
                    className={`w-full text-left rounded-xl p-4 border transition-all duration-200 ${
                      isSelected
                        ? "border-[#00D9FF]/60 bg-[#00D9FF]/8 shadow-lg shadow-[#00D9FF]/10"
                        : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: plan.color + "20", border: `1px solid ${plan.color}30` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: plan.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">{plan.name}</span>
                          {plan.recommended && (
                            <Badge className="bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30 text-[10px] px-2">
                              Recommended
                            </Badge>
                          )}
                          <span className="ml-auto text-sm font-bold" style={{ color: plan.color }}>{plan.price}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {plan.features.map(f => (
                            <span key={f} className="text-gray-400 text-xs flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 transition-all flex items-center justify-center ${isSelected ? "border-[#00D9FF] bg-[#00D9FF]" : "border-white/20"}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#0A1128]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-gray-500 text-xs text-center">You can upgrade or change plans anytime from Settings.</p>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="flex-1 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
              >
                Back
              </Button>
              <Button
                onClick={handleStep2Submit}
                disabled={createTenant.isPending}
                className="flex-1 bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11"
              >
                {createTenant.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                  : <>Create Store <ArrowRight className="ml-2 w-4 h-4" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="glass rounded-2xl p-8 border border-emerald-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Store Created!</h2>
            <p className="text-gray-400 mb-2">
              <span className="text-white font-medium">{name}</span> is ready to go.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Your dashboard is live. Seed demo products, orders, and customers from Settings anytime.
            </p>

            {/* Quick feature highlights */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Package, label: "Products", desc: "Add your catalog" },
                { icon: ShoppingCart, label: "Orders", desc: "Track sales" },
                { icon: BarChart3, label: "Analytics", desc: "View insights" },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 bg-white/5 border border-white/5">
                  <item.icon className="w-5 h-5 text-[#00D9FF] mx-auto mb-1.5" />
                  <div className="text-white text-xs font-medium">{item.label}</div>
                  <div className="text-gray-500 text-[10px] mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleFinish}
              className="w-full bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11 shadow-lg shadow-[#00D9FF]/20"
            >
              Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
