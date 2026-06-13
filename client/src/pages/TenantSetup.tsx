import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { trackActivation } from "@/lib/userTracking";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Store,
  CheckCircle,
  Package,
  Loader2,
  Sparkles,
  CreditCard,
  Rocket,
  Users,
} from "lucide-react";

const STEPS = [
  {
    id: 1,
    label: "Create Store",
    description: "Set your store name and URL.",
  },
  {
    id: 2,
    label: "Configure Store",
    description: "Choose whether to start with sample products.",
  },
  {
    id: 3,
    label: "Launch Store",
    description: "Review what to do next before heading to the dashboard.",
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

function StepProgressBar({ step }: { step: number }) {
  const currentStep = STEPS[step - 1] ?? STEPS[0];
  const progressValue = (step / STEPS.length) * 100;

  return (
    <Card
      className="mb-8 border-white/10 bg-white/5 text-white shadow-xl shadow-black/20"
      aria-label={`Step ${step} of ${STEPS.length}`}
    >
      <CardHeader className="gap-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#00D9FF]">
              Step {step} of {STEPS.length}: {currentStep.label}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {currentStep.description}
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            {Math.round(progressValue)}% complete
          </span>
        </div>
        <Progress
          value={progressValue}
          className="h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#00D9FF]"
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map(item => {
            const isCompleted = step > item.id;
            const isActive = step === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  isActive && "border-[#00D9FF]/40 bg-[#00D9FF]/10",
                  isCompleted && "border-emerald-500/30 bg-emerald-500/10",
                  !isActive && !isCompleted && "border-white/10 bg-white/5"
                )}
              >
                <div
                  className={cn(
                    "mb-3 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                    isActive && "border-[#00D9FF] bg-[#00D9FF] text-[#0A1128]",
                    isCompleted &&
                      "border-emerald-500 bg-emerald-500 text-white",
                    !isActive && !isCompleted && "border-white/15 text-gray-400"
                  )}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : item.id}
                </div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-gray-400">{item.description}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TenantSetup() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [seedDemo, setSeedDemo] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(
    user?.tenantId ?? null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user?.name && !name) {
      const autoName = `${user.name}'s Store`;
      setName(autoName);
      setSlug(slugify(autoName));
    }
    if (user?.tenantId && !createdTenantId) {
      setCreatedTenantId(user.tenantId);
    }
    const timeoutId = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timeoutId);
    // `name` is intentionally omitted — we only auto-populate when user loads,
    // not when the user edits the name field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdTenantId, user]);

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: tenant => {
      // Funnel: tenant creation is the mandatory first-value gate after signup.
      trackActivation("tenant_created");
      setCreatedTenantId(tenant.id);
      setDemoSeeded(false);
      setStep(2);
    },
    onError: err => toast.error(err.message),
  });

  const seedDemoMutation = trpc.tenant.seedDemoData.useMutation({
    onSuccess: data => {
      setDemoSeeded(true);
      void utils.products.list.invalidate();
      toast.success(
        `Added ${data.productsCreated} demo products to your store.`
      );
    },
    onError: err => toast.error(`Demo seed failed: ${err.message}`),
  });

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    createTenant.mutate({ name: name.trim(), slug: slug.trim() });
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (seedDemo && createdTenantId) {
      try {
        await seedDemoMutation.mutateAsync({ tenantId: createdTenantId });
      } catch {
        // Error already shown via onError.
      }
    } else if (seedDemo) {
      toast.error(
        "We couldn't find your new store yet, but setup can continue."
      );
    }

    setStep(3);
  };

  const handleFinish = () => {
    toast.success("Welcome to UnifyOne! Your store is ready.");
    navigate("/dashboard");
  };

  const isStep2Pending = seedDemoMutation.isPending;
  const nextSteps = [
    {
      href: "/products",
      title: "Add your first product",
      description:
        "Build your catalog and publish something customers can buy.",
      icon: Package,
    },
    {
      href: "/settings",
      title: "Connect a payment method",
      description: "Finish your setup so you can start accepting payments.",
      icon: CreditCard,
    },
    {
      href: "/team",
      title: "Invite your team",
      description: "Bring teammates into your workspace and assign roles.",
      icon: Users,
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-[#00D9FF]/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-[300px] w-[300px] rounded-full bg-[#6A1B9A]/8 blur-3xl" />
      </div>

      <div
        className={cn(
          "relative w-full max-w-3xl transition-all duration-500",
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#0284C7] shadow-lg shadow-[#00D9FF]/20">
            <Layers className="h-7 w-7 text-[#0A1128]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to UnifyOne</h1>
          <p className="mt-1 text-sm text-gray-400">
            {step === 3
              ? "Your workspace is ready to launch."
              : "Let's get your store set up."}
          </p>
        </div>

        <StepProgressBar step={step} />

        {step === 1 && (
          <Card className="border-white/10 bg-white/5 text-white shadow-xl shadow-black/20">
            <CardContent className="p-8">
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-300"
                  >
                    Store Name
                  </Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="name"
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
                      placeholder="e.g. Jimbo's Iron & Thread"
                      className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500 focus:border-[#00D9FF]/50"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="slug"
                    className="text-sm font-medium text-gray-300"
                  >
                    Store URL Slug
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (auto-generated)
                    </span>
                  </Label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-colors focus-within:border-[#00D9FF]/50">
                    <span className="whitespace-nowrap border-r border-white/10 bg-white/3 px-3 py-2.5 text-sm text-gray-500">
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
                      className="h-11 border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Lowercase letters, numbers, and hyphens only. Cannot be
                    changed later.
                  </p>
                </div>

                <p className="text-center text-xs text-gray-500">
                  All stores start on the free{" "}
                  <span className="text-[#00D9FF]">Starter</span> tier. You can
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
                  className="mt-2 h-11 w-full bg-[#00D9FF] font-bold text-[#0A1128] hover:bg-[#00D9FF]/90"
                >
                  {createTenant.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-white/10 bg-white/5 text-white shadow-xl shadow-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Store Preferences</CardTitle>
              <p className="text-sm text-gray-400">
                Choose how you want to explore the platform on day one.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2Submit} className="space-y-6">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors",
                    seedDemo
                      ? "border-[#00D9FF]/30 bg-[#00D9FF]/5"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                  onClick={() => setSeedDemo(value => !value)}
                >
                  <Checkbox
                    id="seedDemo"
                    checked={seedDemo}
                    onCheckedChange={checked => setSeedDemo(checked === true)}
                    className="mt-0.5 border-white/30 data-[state=checked]:border-[#00D9FF] data-[state=checked]:bg-[#00D9FF]"
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="seedDemo"
                      className="cursor-pointer text-sm font-medium text-white"
                    >
                      Seed my store with 5 demo products to explore the platform
                    </Label>
                    <p className="mt-1 text-xs text-gray-400">
                      Add sample T-shirts, mugs, stickers, and other merch so
                      you can see product workflows immediately.
                    </p>
                  </div>
                  <Package className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                </button>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 flex-1 border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isStep2Pending}
                    className="h-11 flex-1 bg-[#00D9FF] font-bold text-[#0A1128] hover:bg-[#00D9FF]/90"
                  >
                    {isStep2Pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Finish Setup <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-emerald-500/20 bg-white/5 text-white shadow-xl shadow-black/20">
            <CardContent className="space-y-8 p-8">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
                  <Sparkles className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Setup Complete! 🎉
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  <span className="font-medium text-white">{name}</span> is
                  ready.
                  {demoSeeded
                    ? " We also added demo products so you can explore right away."
                    : " Your dashboard is live and waiting for your first move."}
                </p>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#00D9FF]">
                  <Rocket className="h-4 w-4" />
                  What&apos;s Next
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {nextSteps.map(item => (
                    <Link key={item.title} href={item.href} className="block">
                      <Card className="h-full border-white/10 bg-white/5 text-white transition-colors hover:border-[#00D9FF]/30 hover:bg-white/10">
                        <CardContent className="flex h-full flex-col gap-3 p-5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00D9FF]/10 text-[#00D9FF]">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {item.title} →
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {item.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleFinish}
                className="h-11 w-full bg-[#00D9FF] font-bold text-[#0A1128] shadow-lg shadow-[#00D9FF]/20 hover:bg-[#00D9FF]/90"
              >
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
