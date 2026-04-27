import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Store,
  CheckCircle,
  Package,
  ShoppingCart,
  BarChart3,
  Loader2,
  Sparkles,
  CreditCard,
  Settings,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Store Details" },
  { id: 2, label: "Preferences" },
  { id: 3, label: "All Set!" },
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

function StepProgressBar({ step }: { step: number }) {
  return (
    <div
      className="flex items-center justify-center gap-0 mb-8 select-none"
      aria-label={`Step ${step} of ${STEPS.length}`}
    >
      {STEPS.map((s, i) => {
        const isCompleted = step > s.id;
        const isActive = step === s.id;
        const isUpcoming = step < s.id;
        return (
          <div key={s.id} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                  isActive && "bg-[#00D9FF] border-[#00D9FF] text-[#0A1128]",
                  isUpcoming && "bg-transparent border-white/20 text-gray-500"
                )}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap transition-colors",
                  isActive && "text-[#00D9FF]",
                  isCompleted && "text-emerald-400",
                  isUpcoming && "text-gray-600"
                )}
              >
                {s.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mb-5 mx-1 transition-colors duration-300",
                  step > s.id ? "bg-emerald-500/50" : "bg-white/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TenantSetup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [seedDemo, setSeedDemo] = useState(false);
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
    // `name` is intentionally omitted — we only auto-populate when user loads,
    // not when the user edits the name field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: () => {
      setStep(2);
    },
    onError: err => toast.error(err.message),
  });

  const seedDemoMutation = trpc.tenant.seedDemo.useMutation({
    onError: err => toast.error(`Demo seed failed: ${err.message}`),
  });

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    createTenant.mutate({ name: name.trim(), slug: slug.trim() });
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seedDemo) {
      try {
        await seedDemoMutation.mutateAsync(undefined);
        toast.success("Demo products seeded successfully!");
      } catch {
        // error already shown via onError
      }
    }
    setStep(3);
  };

  const handleFinish = () => {
    toast.success("Welcome to UnifyOne! Your store is ready.");
    navigate("/dashboard");
  };

  const isStep2Pending = seedDemoMutation.isPending;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00D9FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#6A1B9A]/8 rounded-full blur-3xl" />
      </div>

      <div
        className={cn(
          "w-full max-w-lg relative transition-all duration-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00D9FF]/20">
            <Layers className="w-7 h-7 text-[#0A1128]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to UnifyOne</h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === 3
              ? "Your store is ready!"
              : "Let's get your store set up."}
          </p>
        </div>

        {/* Step progress indicator */}
        <StepProgressBar step={step} />

        {/* Step 1: Store Details */}
        {step === 1 && (
          <div className="glass rounded-2xl p-8 border border-white/10">
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-gray-300 font-medium text-sm"
                >
                  Store Name
                </Label>
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
                <Label
                  htmlFor="slug"
                  className="text-gray-300 font-medium text-sm"
                >
                  Store URL Slug
                  <span className="text-gray-500 font-normal ml-2 text-xs">
                    (auto-generated)
                  </span>
                </Label>
                <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden focus-within:border-[#00D9FF]/50 transition-colors">
                  <span className="px-3 py-2.5 text-gray-500 text-sm bg-white/3 border-r border-white/10 whitespace-nowrap">
                    unifyone.app/
                  </span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={e => {
                      setSlug(e.target.value);
                      setSlugTouched(true);
                    }}
                    placeholder="my-store"
                    pattern="[a-z0-9-]+"
                    className="border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 h-11"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Lowercase letters, numbers, and hyphens only. Cannot be
                  changed later.
                </p>
              </div>

              <p className="text-xs text-gray-500 text-center">
                All stores start on the free{" "}
                <span className="text-[#00D9FF]">Acolyte</span> tier. You can
                upgrade anytime from{" "}
                <Link
                  href="/billing"
                  className="text-[#00D9FF] hover:underline"
                >
                  Billing
                </Link>
                .
              </p>

              <Button
                type="submit"
                disabled={
                  !name.trim() || !slug.trim() || createTenant.isPending
                }
                className="w-full bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11 mt-2"
              >
                {createTenant.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="glass rounded-2xl p-8 border border-white/10">
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Store Preferences
                </h2>
                <p className="text-gray-400 text-sm">
                  Customize how you want to get started.
                </p>
              </div>

              {/* Demo products option */}
              <div
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer",
                  seedDemo
                    ? "bg-[#00D9FF]/5 border-[#00D9FF]/30"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                )}
                onClick={() => setSeedDemo(v => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === " " || e.key === "Enter") setSeedDemo(v => !v);
                }}
              >
                <Checkbox
                  id="seedDemo"
                  checked={seedDemo}
                  onCheckedChange={checked => setSeedDemo(checked === true)}
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-[#00D9FF] data-[state=checked]:border-[#00D9FF]"
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="seedDemo"
                    className="text-white font-medium text-sm cursor-pointer"
                  >
                    Start with demo products
                  </Label>
                  <p className="text-gray-400 text-xs mt-1">
                    Populate your store with sample products, customers, and
                    orders so you can explore the platform right away. You can
                    remove them anytime.
                  </p>
                </div>
                <Package className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-white/10 text-gray-300 hover:bg-white/5 hover:text-white h-11"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={isStep2Pending}
                  className="flex-1 bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11"
                >
                  {isStep2Pending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Finish Setup <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success + Next Steps */}
        {step === 3 && (
          <div className="glass rounded-2xl p-8 border border-emerald-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Store Created!
            </h2>
            <p className="text-gray-400 mb-2">
              <span className="text-white font-medium">{name}</span> is ready to
              go.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              {seedDemo
                ? "Demo products, customers, and orders have been seeded."
                : "Your dashboard is live. You can seed demo data from Settings anytime."}
            </p>

            {/* Quick feature highlights */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                {
                  icon: Package,
                  label: "Products",
                  desc: "Add your catalog",
                  href: "/products",
                },
                {
                  icon: ShoppingCart,
                  label: "Orders",
                  desc: "Track sales",
                  href: "/orders",
                },
                {
                  icon: BarChart3,
                  label: "Analytics",
                  desc: "View insights",
                  href: "/analytics",
                },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block rounded-xl p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors"
                  aria-label={`Go to ${item.label}`}
                >
                  <item.icon className="w-5 h-5 text-[#00D9FF] mx-auto mb-1.5" />
                  <div className="text-white text-xs font-medium">
                    {item.label}
                  </div>
                  <div className="text-gray-500 text-[10px] mt-0.5">
                    {item.desc}
                  </div>
                </Link>
              ))}
            </div>

            {/* Next steps checklist */}
            <div className="text-left mb-6 p-4 rounded-xl bg-white/3 border border-white/10">
              <p className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wider">
                Next Steps
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: "Add your first product",
                    href: "/products",
                    icon: Package,
                  },
                  {
                    label: "Connect a payment method",
                    href: "/billing",
                    icon: CreditCard,
                  },
                  {
                    label: "Customize your store",
                    href: "/settings",
                    icon: Settings,
                  },
                ].map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#00D9FF]/20 hover:text-[#00D9FF] text-gray-300 transition-all group"
                    aria-label={item.label}
                  >
                    <item.icon className="w-4 h-4 text-gray-500 group-hover:text-[#00D9FF] shrink-0 transition-colors" />
                    <span className="flex-1 text-xs font-medium">
                      {item.label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-[#00D9FF] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Billing upgrade CTA */}
            <div className="mb-6 p-4 rounded-xl bg-[#00D9FF]/5 border border-[#00D9FF]/20 text-left">
              <p className="text-[#00D9FF] text-xs font-medium mb-1">
                You&apos;re on the free Acolyte tier
              </p>
              <p className="text-gray-400 text-xs mb-3">
                Unlock unlimited products, advanced analytics, and AI automation
                by upgrading your plan.
              </p>
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 text-xs text-[#00D9FF] font-semibold hover:underline"
              >
                View plans &amp; upgrade <ArrowRight className="w-3 h-3" />
              </Link>
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
